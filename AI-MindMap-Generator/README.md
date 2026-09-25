# AI Mind Map Generator

> **Task 4 — AI Classroom Project**

---

## 1. Project Name

**AI Mind Map Generator for Syllabus**

---

## 2. Objective

A web application that allows students to paste any syllabus, chapter outline, subject content, or study material and instantly generate an **interactive, hierarchical mind map** powered by AI.

The application intelligently organises the user's content into:

```
Main Topic
    ├── Subtopic
    │     ├── Key Concept
    │     └── Key Concept
    └── Subtopic
          ├── Key Concept
          └── Key Concept
```

---

## 3. Features

| Feature | Description |
|---|---|
| **Open Input** | Accept any syllabus, chapter, outline, or study material |
| **AI Processing** | Intelligently parse and organise the content into a hierarchy |
| **Interactive Mind Map** | D3.js-powered SVG mind map with smooth animations |
| **Zoom & Pan** | Mouse wheel zoom, drag to pan, control buttons |
| **Expand/Collapse** | Click nodes to focus; structured depth display |
| **Node Click** | Select any node to view its context and path |
| **AI Explanation** | Click "Explain This Topic" for AI-generated explanation |
| **Depth Control** | Choose Basic / Detailed / Very Detailed hierarchy depth |
| **Audience Level** | School / College / Technical affects explanation style |
| **Demo Mode** | Works offline with an intelligent text parser |
| **API Mode** | Connect to a real AI backend via configurable endpoint |
| **Regenerate** | Re-run the same input without re-typing |
| **Clear** | Reset the entire application to its initial state |
| **Character Counter** | Live counter on the textarea |
| **Loading States** | Animated spinners during generation and explanation |
| **Error Handling** | Graceful messages for empty input, invalid JSON, network errors |
| **Keyboard Shortcut** | `Ctrl+Enter` to generate |
| **Fullscreen Mode** | Expand the mind map to fill the screen |
| **Responsive Design** | Works on desktop, laptop, tablet, and mobile |
| **Tooltips** | Hover over nodes to see depth label and child count |

---

## 4. Technologies

- **HTML5** — Semantic, accessible markup
- **CSS3** — Dark theme, CSS variables, responsive grid, animations
- **Vanilla JavaScript (ES2020)** — No framework or build tools needed
- **D3.js v7** — SVG mind map rendering, zoom, pan, tree layout
- **AI API** — Configurable endpoint (demo mode included)

---

## 5. How the AI Converts Syllabus into Hierarchy

### Demo Mode (built-in parser)

The built-in text parser analyses indentation, numbering, and formatting to build the tree:

1. Each line is scanned for **indent depth** (spaces, tabs)
2. Numbered items (`1.`, `1)`) are recognised
3. Markdown formatting (`**bold**`, `# headings`) is stripped
4. Lines are assembled into a tree using a **stack-based algorithm**
5. Depth is pruned based on the selected Depth setting:
   - Basic → max 3 levels
   - Detailed → max 4 levels
   - Very Detailed → max 5 levels

### API Mode (real AI)

The AI receives a prompt like this:

```
You are an expert teacher and curriculum organiser.
Analyse the following syllabus and convert it into a hierarchical mind-map structure.

USER CONTENT: [user input]
Depth: [Basic / Detailed / Very Detailed]
Audience: [School / College / Technical]

Requirements:
- Identify the main subject/topic.
- Organise major units as first-level branches.
- Break each topic into meaningful subtopics.
- Preserve the user's syllabus topics.
- Return ONLY valid JSON.

{
  "title": "Main Subject",
  "children": [
    {
      "title": "Unit 1",
      "children": [
        { "title": "Topic", "children": [{ "title": "Key Concept" }] }
      ]
    }
  ]
}
```

---

## 6. How D3.js is Used for Visualisation

The mind map uses **D3.js v7** with a tree layout:

| Condition | Layout Used |
|---|---|
| > 20 nodes | **Radial layout** (circular, centered) |
| ≤ 20 nodes | **Left-to-right horizontal tree** |

### Node Colour Coding by Depth

| Level | Depth | Colour |
|---|---|---|
| Root | 0 | Purple `#6c63ff` |
| Branch | 1 | Blue `#2d8cff` |
| Sub-branch | 2 | Teal `#00c9a7` |
| Concept | 3 | Coral `#ff6b6b` |
| Detail | 4 | Amber `#ffc107` |

### Features
- **Zoom**: `d3.zoom()` with scale range `0.15x – 4x`
- **Pan**: Drag the SVG canvas
- **Animations**: Nodes fade in with staggered delays; links draw in using `stroke-dashoffset`
- **Fit to View**: Automatically calculates `getBBox()` and scales to fit
- **Tooltips**: Custom DOM tooltip positioned on hover

---

## 7. How Node Explanations Work

1. User clicks any node on the mind map
2. The **Selected Topic** panel appears below
3. Breadcrumb path is shown (e.g., `Cloud Computing › Deployment Models`)
4. User clicks **✨ Explain This Topic**
5. A request is sent to the explanation endpoint with the node title and its path context
6. The AI returns a structured explanation including:
   - Definition
   - Key Concepts
   - Important Points
   - Example
   - Practical Relevance

---

## 8. How to Run the Project

### Option A — Full AI Experience with Groq Backend (Recommended)

1. Open a terminal in `AI-MindMap-Generator/`:
   ```bash
   npm install
   npm start
   ```
2. The server starts at `http://localhost:5000`.
3. Open `http://localhost:5000` in your browser.
4. You can use both **Demo Mode** (local parser) and **API Mode** (Groq AI) seamlessly!

### Option B — Demo Mode Only (No Server)

1. Open `index.html` directly in any web browser.
2. Select **Demo Mode**.
3. Paste your syllabus and click **Generate Mind Map**.

---

## 9. Groq AI Backend Configuration

The backend is built with **Node.js + Express** and uses the official `@groq/groq-sdk`.

### Configuration in `.env`:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen/qwen3.8-27b
PORT=5000
```

### Endpoints Provided:
- `POST /api/generate-mindmap`: Parses syllabus using Groq AI into structured JSON.
- `POST /api/explain-topic`: Generates detailed topic explanation with Groq AI based on audience level.
- `GET /api/status`: Health check confirming Groq connection and model status.

---

## 10. Security & API Key Protection

> ⚠️ **NEVER put your Groq API key in frontend JavaScript.**

The Groq API key is stored exclusively in `.env` on the server and is never sent to or visible from the browser. The frontend communicates solely with our local Express backend.

```
Browser (index.html / script.js)
        ↓  POST /api/generate-mindmap
Express Backend (backend/server.js)
        ↓  Groq SDK (GROQ_API_KEY from .env)
Groq Cloud AI (qwen/qwen3.8-27b)
```

---

## Project Structure

```
AI-MindMap-Generator/
│
├── index.html          ← Frontend application interface
├── style.css           ← Dark theme, responsive styling, D3 visualizer
├── script.js           ← Mind map controller, D3 tree, Demo parser, API client
│
├── backend/
│   └── server.js       ← Express server with Groq AI integration
│
├── .env                ← Groq API key & server configuration (ignored by git)
├── .env.example        ← Template for environment variables
├── .gitignore          ← Excludes node_modules and .env
├── package.json        ← Backend dependencies (express, cors, dotenv, groq-sdk)
└── README.md           ← Complete documentation
```

---

*AI Classroom Project — Task 4 of 4*
