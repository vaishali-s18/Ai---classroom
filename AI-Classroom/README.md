# AI Classroom

AI Classroom is the combined entry point for Tasks 1–10. Each task remains in its own isolated folder and is linked from the dashboard without merging its HTML, CSS, JavaScript, or backend.

## Run

From the `AI-Classroom` folder, serve the project with any static server:

```bash
python -m http.server 8123
```

Open `/AI-Classroom/` in the browser.

## Current project status

This project is a demo-first classroom prototype. Some tools simulate AI responses locally, some features require backend wiring to work with real APIs, and OCR plus Sheets workflows remain partial. The front-end dashboard is fully usable as a static learning prototype, but it is not yet a production-grade AI platform.

## Next improvements

- Replace simulated generation with real API-backed endpoints for the tool workflows that need live responses.
- Complete the OCR pipeline and file-processing flow for real image extraction.
- Finish Sheets Assistant logic and validation for real spreadsheet operations.
- Keep the project deployment-friendly by separating frontend, backend, and environment configuration cleanly.

## Integrated Tasks

- `tasks/resume-builder` — Task 1: AI Resume Builder
- `tasks/notes-generator` — Task 2: AI Notes Generator
- `tasks/presentation-generator` — Task 3: AI Presentation Generator
- `tasks/mindmap-generator` — Task 4: AI Mind Map Generator
- `tasks/sheets-assistant` — Task 5: AI Sheets Assistant
- `tasks/quiz-generator` — Task 6: AI Quiz Generator
- `tasks/doubt-solving-chatbot` — Task 7: AI Doubt-Solving Chatbot
- `tasks/flashcard-generator` — Task 8: AI Flashcard Generator
- `tasks/study-planner` — Task 9: AI Study Planner
- `tasks/ocr-notes-summarizer` — Task 10: AI OCR Notes Summarizer

## Integration model

The dashboard uses links to isolated task entry points. This preserves each task's Demo Mode, API Mode contract, external CDN dependencies, DOM IDs, and local state without introducing filename or global-function collisions.

Backend-capable tasks retain their original backend folders and package manifests. Existing `.env` files and `node_modules` directories were intentionally excluded from this combined copy. Configure backend environment variables separately when enabling API Mode:

- `GROQ_API_KEY`
- Task-specific `PORT`
- Optional `GROQ_MODEL`

Current backend defaults remain task-specific: Mind Map 5000, Sheets 5001, and Study Planner 3000.

## Safety

The original Task 1–10 projects remain outside this folder and were not modified. The combined project is a new copy with separate task folders.
