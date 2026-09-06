import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '5mb' }));

// Lazy GoogleGenAI initialization
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

function isRecoverableModelError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err).toLowerCase();
  return (
    str.includes('503') ||
    str.includes('429') ||
    str.includes('404') ||
    str.includes('500') ||
    str.includes('unavailable') ||
    str.includes('resource_exhausted') ||
    str.includes('overloaded') ||
    str.includes('not found') ||
    str.includes('internal error')
  );
}

// Resilient text generation with fallback
async function generateContentWithFallback(
  options: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  }
) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType,
          responseSchema: options.responseSchema,
          temperature: options.temperature ?? 0.7,
        },
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${model} failed:`, err?.message || err);
      if (!isRecoverableModelError(err)) {
        // If not recoverable status code, still attempt next model as precaution
      }
    }
  }

  throw lastError || new Error('All models in fallback ladder failed.');
}

// Resilient stream generation with fallback
async function generateContentStreamWithFallback(
  options: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });
      return { stream, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Stream Fallback] Model ${model} failed:`, err?.message || err);
    }
  }

  throw lastError || new Error('All streaming models in fallback ladder failed.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

const JOURNAL_SYSTEM_PROMPT = `You are "Dear Diary", a devoted, deeply caring, and intimate personal confidant.
The diarist is opening up their raw, unfiltered thoughts and feelings to you.

CRITICAL LENGTH & ENGAGEMENT RULES:
- **Strict Length Cap (Maximum 6 Lines)**: Keep standard replies strictly within 1 to 6 short lines (about 2 to 4 gentle, poignant sentences). Never write lengthy paragraphs, repetitive summaries, or unnecessary fluff. Unnecessarily long replies lead to boring, exhausting conversations.
- **Calming Exception**: ONLY when the diarist is visibly experiencing high anxiety, acute distress, panic, heartbreak, or crying out for grounding, you may expand beyond 6 lines to provide a calm, soothing presence or gentle breath anchor to help them steady themselves.
- **Simple & Heartfelt**: Speak simply, intimately, and warmly. Never use clinical psychology jargon, analytical bullet points, or stiff academic phrases.
- **Tender, Emotional Resonance**: Acknowledge their feeling sincerely in a sentence or two, followed by genuine comfort and at most one simple, loving question.`;

// 1. Streaming chat endpoint with Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req, res) => {
  // Defensive Payload Ingestion
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const history = Array.isArray(payload.history) ? payload.history : [];
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const currentTitle = typeof payload.currentTitle === 'string' ? payload.currentTitle : '';

  if (!message) {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Format contents for Gemini
  const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const h of history) {
    if (!h || typeof h.content !== 'string' || !h.content.trim()) continue;
    formattedContents.push({
      role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content.trim() }],
    });
  }

  // Append new user message
  formattedContents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  let fullAssistantText = '';

  try {
    const { stream, modelUsed } = await generateContentStreamWithFallback({
      contents: formattedContents,
      systemInstruction: JOURNAL_SYSTEM_PROMPT,
      temperature: 0.7,
    });

    res.write(`data: ${JSON.stringify({ type: 'start', model: modelUsed })}\n\n`);

    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        fullAssistantText += text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      }
    }

    // Now extract structured metadata (mood, tags, 1-sentence TL;DR, and concise title)
    try {
      const extractionPrompt = `Analyze this reflective journaling interaction and provide structured metadata.
Conversation Context:
User's latest reflection: """${message}"""
Assistant's response: """${fullAssistantText.slice(0, 1000)}"""
Current Session Title: "${currentTitle || 'Untitled Session'}"

Return a valid JSON object with the following fields:
- "mood": string (A single, nuanced emotional state e.g., "Pensive", "Grateful", "Overwhelmed", "Hopeful", "Vulnerable", "Determined", "Serene", "Restless")
- "tags": array of 2-4 concise lowercase strings representing core topics or themes (e.g., ["work-boundaries", "burnout", "self-trust"])
- "summary": string (An insightful, 1-sentence TL;DR of what the user is exploring or experiencing)
- "title": string (A succinct 3 to 6-word title summarizing the core reflection session. If Current Session Title is already specific and fitting, you may keep it, otherwise refine it)`;

      const metaResult = await generateContentWithFallback({
        contents: extractionPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const rawJson = metaResult.response.text || '{}';
      let parsedMeta = { mood: 'Reflective', tags: ['journaling'], summary: '', title: currentTitle || 'Dear Diary Entry' };
      try {
        parsedMeta = { ...parsedMeta, ...JSON.parse(rawJson) };
      } catch (parseErr) {
        console.warn('Failed to parse metadata JSON:', rawJson);
      }

      res.write(`data: ${JSON.stringify({ type: 'metadata', data: parsedMeta })}\n\n`);
    } catch (metaErr: any) {
      console.warn('Metadata extraction failed:', metaErr?.message || metaErr);
      res.write(
        `data: ${JSON.stringify({
          type: 'metadata',
          data: {
            mood: 'Reflective',
            tags: ['journaling'],
            summary: message.slice(0, 120),
            title: currentTitle || 'Reflection Session',
          },
        })}\n\n`
      );
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullAssistantText })}\n\n`);
    res.end();
  } catch (streamErr: any) {
    console.error('Error during streaming chat:', streamErr);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: streamErr?.message || 'Failed to generate reflection response.',
      })}\n\n`
    );
    res.end();
  }
});

// 2. Weekly synthesis endpoint
app.post('/api/synthesize', async (req, res) => {
  // Defensive Payload Ingestion
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  if (entries.length === 0) {
    res.status(400).json({
      error: 'At least one journal entry from the past 7 days is needed to generate a weekly synthesis.',
    });
    return;
  }

  try {
    const summaryEntries = entries.map((e, index) => {
      const title = e.title || `Entry ${index + 1}`;
      const date = e.updatedAt || e.createdAt || 'Recent';
      const mood = e.mood || 'Unspecified';
      const tags = Array.isArray(e.tags) ? e.tags.join(', ') : '';
      const summary = e.summary || e.snippet || '';
      const messages = Array.isArray(e.messages)
        ? e.messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Guide'}: ${m.content}`).join('\n')
        : '';
      return `### Entry: "${title}" (${date})
- Mood: ${mood}
- Themes/Tags: ${tags}
- Summary: ${summary}
${messages ? `- Excerpts:\n${messages.slice(0, 800)}` : ''}`;
    }).join('\n\n');

    const prompt = `You are an expert reflective psychologist and life synthesist.
Below are the user's reflective journal entries and dialogues from the past 7 days.
Synthesize these reflections into a deeply meaningful, inspiring, and actionable Weekly Digest.

Journal Entries:
${summaryEntries}

Analyze the entries and return a valid JSON object matching this schema:
{
  "period": "Past 7 Days",
  "headline": "A poetic or evocative 1-sentence headline capturing this week's arc",
  "primaryMoodLandscape": "A concise summary of their emotional trajectory across the week",
  "recurringThemes": ["Array of 3-5 dominant patterns or topics explored"],
  "breakthroughsAndGrowth": "Paragraph highlighting positive insights, courage, or shifts observed",
  "tensionsAndFriction": "Paragraph identifying unresolved challenges or sources of stress",
  "gentleInquiriesForNextWeek": [
    "3 thoughtful, actionable reflective questions for the coming week"
  ],
  "digestMarkdown": "A complete, beautifully formatted Markdown report synthesizing all of the above with headers, quotes, and encouraging closing words."
}`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      responseMimeType: 'application/json',
      temperature: 0.4,
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json({ success: true, digest: parsed });
  } catch (err: any) {
    console.error('Error generating weekly synthesis:', err);
    res.status(500).json({
      error: err?.message || 'Failed to generate weekly synthesis.',
    });
  }
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reflective Journal server running on http://localhost:${PORT}`);
  });
}

startServer();
