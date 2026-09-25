# AI Quiz Generator

Task 6 is a standalone quiz-generation project. It turns a topic or study material into a practice quiz with a one-question-at-a-time workflow, scoring, and answer review.

## Features

- Topic / study material input
- 5, 10, or 15 questions
- Easy, Medium, and Hard controls
- MCQ, True / False, and Mixed question types
- Working local Demo Mode
- API Mode contract for `/api/generate-quiz`
- Progress bar and question counter
- Previous, Next, and Submit Quiz controls
- Score, percentage, performance message, and complete answer review
- Responsive student-focused interface

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Backend-ready JSON API contract

## How to Run

No build tools are required. Open `index.html` directly or serve the folder locally:

```bash
python -m http.server 8000
```

Then visit `/AI-Quiz-Generator/` when serving the parent project folder.

## Demo Mode

Demo Mode is enabled by default. It builds questions dynamically from the factual sentences in the entered material. It supports different material, question counts, difficulty controls, and MCQ / True-False / Mixed formats without an API key.

For best results, enter several factual sentences rather than only a short topic label.

## API Mode

The frontend is prepared for:

```text
POST /api/generate-quiz
```

Request body:

```json
{
  "topic": "Java OOP concepts",
  "numberOfQuestions": 5,
  "difficulty": "medium",
  "questionType": "mcq",
  "prompt": "..."
}
```

Expected response:

```json
{
  "title": "Java OOP Quiz",
  "questions": [
    {
      "question": "What is encapsulation?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "explanation": "Short explanation"
    }
  ]
}
```

API Mode does not fake a backend. Add the secure Node.js / Express endpoint later, keep provider credentials server-side, and return the validated JSON shape above.
