# Dear Diary — Reflective Journaling Web Application

A full-stack, user-authenticated reflective journaling platform built with React, Tailwind CSS, Express, Firebase Authentication, Cloud Firestore, and the Google Gemini API (via `@google/genai`).

---

## Architecture & Security Highlights

1. **User Authentication & Isolation**: Google Sign-In via Firebase Auth. Every journal entry, conversational turn, and weekly synthesis is stored in Cloud Firestore under owner-bound paths (`users/{userId}/...`).
2. **Server-Side AI Proxy**: The browser never directly contacts the Gemini API or touches the `GEMINI_API_KEY`. The Express backend handles streaming SSE reflections, structured metadata extraction, and weekly synthesis.
3. **Resilient Model Fallback Ladder**: The backend features an automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error recovery for status codes 503, 429, 404, and 500.
4. **Strict Undefined-Stripping Hygiene**: All payloads undergo strict undefined stripping prior to being persisted to Cloud Firestore.

---

## Firestore Schema

```text
users/{userId}/
  ├── profile/info (document)
  ├── digests/{digestId} (weekly syntheses)
  └── entries/{entryId}/
        ├── metadata: { title, createdAt, updatedAt, mood, tags, summary }
        └── messages/{messageId}/
              └── { role: "user" | "model", content: string, timestamp: timestamp }
```

---

## 1. Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure zero unauthorized cross-user reads or writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

To deploy via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 2. Google Cloud Secret Manager Setup

Create and bind the `GEMINI_API_KEY` secret in Google Cloud Secret Manager:

```bash
# Enable required APIs
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com

# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant your Cloud Run compute service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev
```

---

## 4. Google Cloud Run Deployment

Deploy the container directly to Cloud Run:

```bash
gcloud run deploy reflective-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### Required Campaign Verification Label

Apply the mandatory verification resource label to register the service for automated challenge verification:

```bash
gcloud run services update reflective-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```
