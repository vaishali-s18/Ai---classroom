/* ═══════════════════════════════════════════════════════════════
   AI Study Planner — backend/server.js
   Stack : Node.js · Express · CORS · dotenv · Groq SDK
   Endpoint: POST /api/generate-study-plan
   ═══════════════════════════════════════════════════════════════ */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const cors     = require('cors');
const Groq     = require('groq-sdk');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ─────────────────────────────────────────────────── */
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'null'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json());

/* ── Health check ───────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AI Study Planner API', version: '1.0.0' });
});

/* ── POST /api/generate-study-plan ──────────────────────────────── */
app.post('/api/generate-study-plan', async (req, res) => {
  try {
    /* ── 1. Read API key (from header or .env) ─────────────────── */
    const apiKey = req.headers['x-api-key'] || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Groq API key is required.' });
    }

    /* ── 2. Validate request body ──────────────────────────────── */
    const { subjects, examDate, hoursPerDay, preferredTime, level, priority } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, error: 'subjects must be a non-empty array.' });
    }
    if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return res.status(400).json({ success: false, error: 'examDate must be in YYYY-MM-DD format.' });
    }
    if (!hoursPerDay || hoursPerDay < 1 || hoursPerDay > 24) {
      return res.status(400).json({ success: false, error: 'hoursPerDay must be between 1 and 24.' });
    }

    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    const exam       = new Date(examDate + 'T00:00:00');
    const daysLeft   = Math.ceil((exam - today) / 86400000);
    if (daysLeft <= 0) {
      return res.status(400).json({ success: false, error: 'examDate must be in the future.' });
    }

    /* ── 3. Build Groq prompt ──────────────────────────────────── */
    const prompt = buildPrompt({ subjects, examDate, hoursPerDay, preferredTime, level, priority, daysLeft });

    /* ── 4. Call Groq API ──────────────────────────────────────── */
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model    : 'llama3-70b-8192',
      messages : [
        {
          role   : 'system',
          content: `You are an expert academic planner. You create structured, realistic, day-by-day study plans.
You MUST respond with valid JSON only — no markdown, no explanation, no code fences.
The JSON must follow this exact schema:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "tasks": [
        {
          "subject": "string",
          "topic": "string",
          "duration": <minutes as integer>,
          "priority": "high" | "medium" | "low" | "revision"
        }
      ]
    }
  ]
}`
        },
        {
          role   : 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens : 4096
    });

    /* ── 5. Parse response ─────────────────────────────────────── */
    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from Groq.');

    let parsed;
    try {
      // Strip accidental markdown fences if the model adds them
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Groq raw response:', raw);
      throw new Error('Groq returned invalid JSON. Try again.');
    }

    if (!Array.isArray(parsed.plan)) {
      throw new Error('Unexpected JSON structure from Groq.');
    }

    /* ── 6. Return plan ────────────────────────────────────────── */
    return res.json({ success: true, plan: parsed.plan });

  } catch (err) {
    console.error('[/api/generate-study-plan]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
  }
});

/* ── Prompt builder ─────────────────────────────────────────────── */
function buildPrompt({ subjects, examDate, hoursPerDay, preferredTime, level, priority, daysLeft }) {
  const subjectList = subjects.map((s, i) => `  ${i + 1}. ${s}`).join('\n');
  const revDays     = Math.min(2, Math.max(1, Math.floor(daysLeft * 0.15)));
  const studyDays   = daysLeft - revDays;

  return `Create a complete day-by-day study plan with the following details:

SUBJECTS / TOPICS:
${subjectList}

EXAM DATE       : ${examDate}
DAYS AVAILABLE  : ${daysLeft} days total (${studyDays} study days + ${revDays} revision days)
HOURS PER DAY   : ${hoursPerDay} hours (${hoursPerDay * 60} minutes)
PREFERRED TIME  : ${preferredTime}
LEVEL           : ${level}
PRIORITY        : ${priority === 'weak-first' ? 'Weak/harder subjects first' : 'Equal distribution'}

RULES:
1. Generate a plan starting from today (${new Date().toISOString().split('T')[0]}) through ${examDate}.
2. Each day's total task durations must NOT exceed ${hoursPerDay * 60} minutes.
3. Include specific, relevant topics for each subject — not just generic names.
4. For ${level} level: ${level === 'beginner' ? 'spend more time per topic, go in-depth' : level === 'advanced' ? 'move faster, focus on complex topics' : 'balanced coverage with moderate depth'}.
5. Priority: ${priority === 'weak-first' ? 'Schedule harder/first-listed subjects earlier in the plan with higher priority.' : 'Distribute subjects evenly across all days.'}
6. Last ${revDays} day(s) must be dedicated to comprehensive revision across all subjects.
7. Avoid overloading — max 4 different subjects per day.
8. Include "priority": "high" for critical topics, "medium" for standard topics, "low" for supplementary, "revision" for revision tasks.
9. Return ONLY the JSON — no explanation, no markdown.`;
}

/* ── Start server ───────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 AI Study Planner API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Endpoint    : POST http://localhost:${PORT}/api/generate-study-plan\n`);
});
