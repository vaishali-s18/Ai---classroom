# AI Sheets Assistant

> **Task 5 — AI Classroom Project**  
> A professional, responsive web application where students can upload, paste, inspect, and analyze spreadsheet data using local computations or Groq AI.

---

## 1. Project Overview

**AI Sheets Assistant** provides an interactive spreadsheet workspace and AI copilot for tabular datasets:
- **Data Input**: Paste raw CSV/TSV data, drag-and-drop `.csv` files, or pick from preloaded student datasets.
- **Interactive Spreadsheet View**: Column headers with sort arrows, sticky headers, row numbers, and real-time row search.
- **Dual Mode Operation**:
  - **Demo Mode**: 100% local in-browser computational engine. Computes averages, extrema, duplicates, conditional filters, and breakdowns without calling any external API.
  - **API Mode**: Connects to a secure Node.js Express backend powered by **Groq Cloud AI** (`qwen/qwen3.8-27b`) for deep semantic data analysis.
- **Quick Operations**: One-click actions to *Summarize Data*, *Find Highest*, *Find Lowest*, *Calculate Average*, *Find Duplicates*, and *Filter Data*.
- **Natural Language Querying**: Ask questions in plain English (e.g. *"What is the average marks?"*, *"Show students who scored below 40"*).

---

## 2. Technologies

- **HTML5 & CSS3**: Modern educational dashboard design with dark theme, responsive grid, sticky headers, and metric badges.
- **Vanilla JavaScript (ES2020)**: Zero frontend build tools required.
- **Node.js & Express**: Backend server with CORS, JSON body parser, and static file serving.
- **Groq SDK (`groq-sdk`)**: High-speed AI inference using `qwen/qwen3.8-27b`.
- **dotenv**: Secure environment variable management.

---

## 3. Project Structure

```
AI-Sheets-Assistant/
│
├── index.html          ← Frontend dashboard UI
├── style.css           ← Dark theme, spreadsheet styling, animations
├── script.js           ← CSV parser, sorting, Demo analyzer, API client
│
├── backend/
│   └── server.js       ← Express server with Groq AI integration
│
├── package.json        ← Backend dependencies
├── .env                ← Groq API key & server configuration (ignored by git)
├── .env.example        ← Template for environment configuration
├── .gitignore          ← Protects .env and node_modules from git
└── README.md           ← Complete documentation
```

---

## 4. How to Run the Project

### Option A — Full AI Experience with Groq Backend (Recommended)

1. Open a terminal in `AI-Sheets-Assistant/`:
   ```bash
   npm install
   npm start
   ```
2. The server starts at **`http://localhost:5001`**.
3. Open **`http://localhost:5001`** in any web browser.
4. You can use both **Demo Mode** and **API Mode** seamlessly!

### Option B — Demo Mode Only (No Server)

1. Open `index.html` directly in your web browser.
2. Select **Demo Mode**.
3. Paste or load any spreadsheet data and ask questions or run quick operations!

---

## 5. Security & API Key Protection

> ⚠️ **API keys are NEVER exposed in frontend JavaScript or HTML.**

The Groq API key is stored strictly on the server in `.env` and is excluded from source control via `.gitignore`. The browser only ever talks to `/api/analyze-sheet`.

```
Browser (index.html / script.js)
        ↓  POST /api/analyze-sheet
Express Server (backend/server.js)
        ↓  Groq SDK (GROQ_API_KEY from .env)
Groq Cloud AI (qwen/qwen3.8-27b)
```

### `.env` Setup:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen/qwen3.8-27b
PORT=5001
```

---

## 6. AI Rules & Analysis Integrity

Both Demo Mode and API Mode enforce strict analytical rules:
1. **Analyze Only Supplied Data**: The assistant never invents rows, columns, or hypothetical students.
2. **Deterministic Calculations**: Sums, averages, extrema, and counts are calculated mathematically from actual cell values.
3. **Transparent Fallbacks**: If requested information cannot be deduced from the dataset, the assistant explicitly states so.
4. **Token Efficiency**: API calls use a calibrated token budget (`max_tokens: 600`) to remain well within free-tier rate limits.

---

*AI Classroom Project — Task 5 of 5*
