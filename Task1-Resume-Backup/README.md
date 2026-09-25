# AI Resume Builder

A polished web application that uses an AI-ready workflow to generate professional resumes from user-provided information.

## Features

- Drag-and-drop reference resume upload for PDF, DOC, DOCX, JPG, and PNG files
- Reference analysis that captures structure, section order, hierarchy, tone, and content density without copying personal content
- Structured resume form for personal details, education, skills, experience, and objective
- Optional projects, certifications, and achievements sections
- AI prompt construction that separates reference style from the user's actual information
- Separate mock mode so the complete UI works without an API key
- Professional resume preview with empty sections hidden
- Three realistic sample profiles
- Required-field validation and friendly error handling
- Direct `AI-Generated-Resume.pdf` download using html2canvas and jsPDF
- Multi-page A4 PDF support for longer resumes
- Print / Save as PDF fallback support
- Responsive desktop, tablet, and mobile layout
- Accessible labels, semantic sections, status messages, and keyboard-friendly controls

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- html2canvas 1.4.1
- jsPDF 2.5.1
- Browser Print-to-PDF fallback
- Backend-ready AI API integration structure

## How to Run

No build tools are required. Open `index.html` directly in a browser, or serve the folder with a local static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Reference Resume Workflow

Upload a resume sample before generating. The browser stores only its metadata and a safe structural analysis in demo mode; the sample person's facts are never rendered into the generated resume. The backend-ready request includes this analysis alongside the user's form data, so a real AI service can inspect the reference document server-side when needed.

## AI API Configuration

The frontend keeps the integration boundary in `script.js`:

```js
const API_URL = '/api/generate-resume';
const USE_MOCK_MODE = true;
```

Mock mode is enabled by default. It simulates a short AI response delay and renders the submitted information, which makes the full demonstration available without a backend.

To connect a real model:

1. Create a secure backend route at `/api/generate-resume`.
2. Set `USE_MOCK_MODE` to `false` in `script.js`.
3. Keep the provider API key in the backend environment, never in frontend JavaScript.
4. Have the backend accept `{ data, prompt, reference }` and return the structured resume data expected by the renderer, or adapt `renderResume()` to the response shape.

API keys must not be exposed in browser code because every visitor can inspect downloaded JavaScript and network requests.

## PDF

Use **Download Resume as PDF** after generating a resume for an automatic download named `AI-Generated-Resume.pdf`. The export captures only the resume preview, creates A4 pages, and adds pages as needed for longer resumes. The CDN libraries load in `index.html` before `script.js`.

Use **Print / Save as PDF** when you prefer the browser print dialog. The `@media print` rules hide the builder interface and format only the resume for printing.
