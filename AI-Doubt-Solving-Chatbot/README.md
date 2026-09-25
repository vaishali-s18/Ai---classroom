# AI Doubt-Solving Chatbot

Task 7 is a standalone student-focused chatbot for asking academic doubts and receiving clear, step-by-step explanations.

## Features

- AI Study Assistant chat interface
- Subject selection for Java, DSA, DBMS, Web Development, Operating Systems, Computer Networks, Cloud Computing, and General
- Multiple questions in one conversation
- Message timestamps and scrollable history
- Definition, explanation, example, and important-points response style
- Coding-oriented responses with code and complexity where relevant
- Quick question buttons
- Working Demo Mode with common academic question patterns and helpful unknown-question fallback
- Prepared API Mode contract for `/api/ask-doubt`
- Responsive mobile layout

## How to Run

No build tools are required. Open `index.html` directly or serve the parent folder:

```bash
python -m http.server 8000
```

Then visit `/AI-Doubt-Solving-Chatbot/`.

## Demo Mode

Demo Mode works locally without an API key. It recognizes several common question patterns across the selected subjects and keeps the current conversation in memory. Unknown questions receive a focused request for more detail rather than a fabricated answer.

## API Mode

The frontend is prepared for a future secure backend:

```text
POST /api/ask-doubt
```

Request body:

```json
{
  "question": "What is polymorphism?",
  "subject": "Java",
  "conversation": []
}
```

Expected response:

```json
{
  "success": true,
  "answer": "..."
}
```

API Mode is intentionally not backed by a fake endpoint yet. Implement the later Node.js / Express / CORS / dotenv / Groq server with `GROQ_API_KEY` stored only in the server environment. Never place the key in frontend JavaScript.
