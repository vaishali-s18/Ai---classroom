# AI OCR Notes Summarizer

Task 10 is a standalone student tool that extracts text from handwritten or printed study-note images and turns the extracted text into structured revision notes.

## Features

- JPG, JPEG, and PNG drag-and-drop upload
- Image preview
- Client-side OCR using Tesseract.js in Demo Mode
- OCR progress percentage
- Editable extracted text
- Demo summarization based on the actual OCR text
- Main topic, short summary, key points, definitions, formulas, and exam tips
- Copy, TXT download, and Print Notes export
- Prepared API Mode endpoint at `/api/summarize-ocr-notes`
- Responsive dashboard layout

## How to Run

No build tools are required. Open `index.html` directly or serve the parent folder:

```bash
python -m http.server 8000
```

Then visit `/AI-OCR-Notes-Summarizer/`.

## Demo Mode

Demo Mode uses Tesseract.js in the browser to recognize text from the uploaded image. The summarizer then analyzes the actual editable extracted text; it does not use a fixed sample summary.

## API Mode

The frontend is prepared for:

```text
POST /api/summarize-ocr-notes
```

Request:

```json
{
  "text": "extracted OCR text"
}
```

Expected response:

```json
{
  "success": true,
  "summary": {
    "mainTopic": "...",
    "shortSummary": "...",
    "keyPoints": [],
    "definitions": [],
    "formulas": [],
    "examTips": []
  }
}
```

API Mode does not fake a backend. Add the secure Node.js / Express / CORS / dotenv / Groq endpoint later, keeping `GROQ_API_KEY` on the server only.
