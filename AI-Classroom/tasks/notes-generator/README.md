# AI-Powered Notes Generator

A vanilla HTML, CSS, and JavaScript web application that converts raw study material into concise revision notes in Markdown, then renders the result as readable HTML with `marked.js`.

## Features

- Study material textarea with live character counter
- Try Example and Clear actions
- AI-ready academic summarization prompt
- Mock mode for a complete local demonstration
- Genuine Markdown rendering through `marked.parse()`
- Headings, lists, emphasis, code, blockquotes, and links styling
- Copy notes to the clipboard
- Download notes as `AI-Notes.txt`
- Print / Save as PDF with print-only notes layout
- Loading state, validation, API error handling, and responsive design

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- marked.js via CDN
- Browser Clipboard API
- Browser Print-to-PDF

## How to Run

No build tools are required. Open `index.html` directly in a browser, or serve the folder locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## AI Configuration

The API boundary is in `script.js`:

```js
const API_URL = '/api/generate-notes';
const USE_MOCK_MODE = true;
```

Mock mode is enabled by default. It simulates a short response delay and creates Markdown from the supplied material so the complete workflow can be demonstrated without a backend.

To connect a real model:

1. Create a secure backend route at `/api/generate-notes`.
2. Set `USE_MOCK_MODE` to `false`.
3. Have the endpoint accept `{ material, prompt }` and return `{ "markdown": "..." }`.
4. Keep provider API keys in the backend environment, never in frontend JavaScript.

API keys must not be exposed in browser code because every visitor can inspect downloaded source files and network requests.

## PDF

Use **Download PDF** and choose **Save as PDF** in the browser print dialog. The `@media print` rules hide the input form, navigation, controls, and page background so only the generated notes are printed.
