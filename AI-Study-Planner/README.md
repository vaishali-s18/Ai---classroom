# 📚 AI Study Planner

A professional, responsive web application that generates a personalised day-by-day study plan based on your subjects, exam date, available hours, and preparation level.

---

## ✨ Features

| Feature | Details |
|---|---|
| Dynamic plan generation | Uses subjects, exam date, hours/day, level & priority |
| Day-by-day schedule | Each day shows date, topics, durations, and priority |
| Progress tracking | Total / completed / remaining hours + progress bar |
| Task completion | Check off tasks; strikethrough + stats update live |
| Today's tasks | Highlighted section showing only today's schedule |
| List view | Collapsible day cards with full task details |
| Calendar view | Month grid with subject pills; click a day to jump to it |
| Demo Mode | Works fully offline — no API key needed |
| API Mode | Connects to Express + Groq (llama3-70b-8192) backend |
| Responsive | Mobile-first, works on all screen sizes |

---

## 🗂 Project Structure

```
AI-Study-Planner/
├── index.html          ← Main application page
├── style.css           ← Dark-theme dashboard styles
├── script.js           ← Frontend logic + Demo Mode engine
├── backend/
│   └── server.js       ← Express API server (Groq integration)
├── package.json
├── .env.example        ← Copy to .env and add your API key
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Demo Mode (no setup needed)

1. Open `index.html` directly in a browser, or use Live Server in VS Code.
2. The **Demo** button is selected by default.
3. Fill in the form and click **Generate Study Plan**.

### API Mode (real AI via Groq)

**Step 1 — Install dependencies**
```bash
cd AI-Study-Planner
npm install
```

**Step 2 — Add your API key**
```bash
copy .env.example .env
```
Edit `.env` and replace `your_groq_api_key_here` with your key from [console.groq.com](https://console.groq.com).

**Step 3 — Start the server**
```bash
npm start
# or for auto-reload during development:
npm run dev
```

**Step 4 — Use the app**
1. Open `index.html` in your browser (use Live Server on port 5500).
2. Click the **API** button in the header.
3. Enter your Groq API key in the field that appears.
4. Generate your plan.

---

## 🔌 API Reference

### `POST /api/generate-study-plan`

**Request body**
```json
{
  "subjects"     : ["DBMS", "Java", "DSA"],
  "examDate"     : "2026-10-20",
  "hoursPerDay"  : 4,
  "preferredTime": "evening",
  "level"        : "intermediate",
  "priority"     : "weak-first"
}
```

**Success response**
```json
{
  "success": true,
  "plan": [
    {
      "date": "2026-09-26",
      "tasks": [
        {
          "subject" : "DBMS",
          "topic"   : "Normalization",
          "duration": 90,
          "priority": "high"
        }
      ]
    }
  ]
}
```

**Error response**
```json
{
  "success": false,
  "error": "Groq API key is required."
}
```

### `GET /health`
Returns `{ "status": "ok" }` — useful to verify the server is running.

---

## 🧠 Demo Mode — How It Works

The Demo Mode engine (`script.js`) generates a fully dynamic plan without any network calls:

- Parses subjects from the textarea (one per line)
- Selects relevant topics from a built-in `TOPIC_BANK` (DBMS, Java, DSA, OS, CN, Python, ML, etc.)
- Calculates study vs. revision days based on the exam date
- Distributes topics using **Equal** (interleaved) or **Weak Subjects First** priority
- Scales session duration by preparation level (Beginner → longer, Advanced → shorter)
- Reserves the final days for comprehensive revision
- Changing any input and regenerating produces a different plan

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 · CSS3 · Vanilla JS (ES2022) |
| Fonts | Inter (Google Fonts) |
| Backend | Node.js · Express 4 |
| AI Model | Groq — llama3-70b-8192 |
| Env config | dotenv |
| CORS | cors |

---

## 📋 Form Options

| Field | Options |
|---|---|
| Preferred Study Time | Morning · Afternoon · Evening · Flexible |
| Preparation Level | Beginner · Intermediate · Advanced |
| Priority | Equal · Weak Subjects First |
| Hours/Day | 1 – 12 hours (slider) |
