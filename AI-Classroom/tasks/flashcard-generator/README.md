# AI Flashcard Generator

Task 8 is a standalone flashcard app for generating and studying active-recall cards from a topic or study material.

## Features

- Topic / study material input
- 5, 10, 15, or 20 flashcards
- Easy, Medium, and Hard controls
- Working Demo Mode without an API key
- Flip animation with click, keyboard, and Flip Card control
- Previous / Next navigation and progress bar
- Important, Known, and Review Again states
- All-cards deck list with status markers
- Study Mode with completion summary
- Prepared API Mode contract for `/api/generate-flashcards`
- Responsive layout

## How to Run

No build tools are required. Open `index.html` directly or serve the parent folder:

```bash
python -m http.server 8000
```

Then visit `/AI-Flashcard-Generator/`.

## Demo Mode

Demo Mode creates cards dynamically from the factual sentences in the supplied topic or material. It is not tied to one fixed deck and supports different card counts and difficulty selections.

## API Mode

The frontend is prepared for:

```text
POST /api/generate-flashcards
```

Request:

```json
{
  "topic": "Java OOP concepts",
  "numberOfCards": 5,
  "difficulty": "medium"
}
```

Expected response:

```json
{
  "success": true,
  "cards": [
    {
      "question": "What is encapsulation in Java?",
      "answer": "Encapsulation is the bundling of data and methods..."
    }
  ]
}
```

API Mode does not fake a backend. Add the secure Node.js / Express / CORS / dotenv / Groq endpoint later, keeping `GROQ_API_KEY` on the server only.
