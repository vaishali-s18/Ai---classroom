# AI Presentation Generator

## Objective
Generate a structured, ready-to-present slide deck from a topic using an AI-ready JSON workflow.

## Features

- Topic and additional-instruction input
- Configurable 5-8 slide deck, with 5 and 6 recommended
- Dedicated academic presentation prompt
- Secure backend API boundary at `/api/generate-presentation`
- Clearly separated local demo/mock mode
- JSON parsing and strict slide validation
- Dynamic presentation-style slide viewer
- Previous/Next controls and arrow-key navigation
- Slide indicators, counter, loading state, and subtle transitions
- Regenerate and Clear actions
- Optional real `.pptx` export through PptxGenJS
- Responsive and accessible interface
- Empty, validation, AI, network, and invalid-format error states

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- AI API integration structure
- PptxGenJS via CDN

## How to Run

No build tools are required. Open `index.html` directly in a browser, or serve this folder with a local static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/AI-Presentation-Generator/`.

## AI API Configuration

The frontend integration boundary is in `script.js`:

```js
const API_URL = '/api/generate-presentation';
const USE_MOCK_MODE = true;
```

Demo mode is enabled by default and returns realistic JSON using the same validation and rendering path as a real response. To connect an AI service, set `USE_MOCK_MODE` to `false` and implement the secure backend route. It should accept `{ topic, instructions, slideCount, prompt }` and return either the JSON object or a JSON string with this shape:

```json
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide Title",
      "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]
    }
  ]
}
```

Never place a provider API key in browser JavaScript. Keep credentials in the backend environment.

## PPTX Export

After a deck is generated, `exportPptx()` creates a new `PptxGenJS` presentation, adds one themed PowerPoint slide per validated JSON slide, writes the title and bullets, and downloads the file as `AI-Presentation.pptx`. Website controls and navigation are not included in the export.
