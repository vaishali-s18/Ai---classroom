const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk');

// Load environment variables from Task 5 root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5001;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

// Initialize Groq client
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.warn('⚠️ WARNING: GROQ_API_KEY is not set in .env. API calls will fail until a valid key is provided.');
}

const groq = new Groq({
  apiKey: apiKey || 'dummy-key-placeholder'
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '4mb' }));

// Serve frontend static files from Task 5 root
app.use(express.static(path.join(__dirname, '..')));

/**
 * Helper to clean Markdown code fences from model response
 */
function cleanResponseText(raw) {
  if (!raw) return '';
  let str = raw.trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:html|markdown)?\s*/i, '');
  }
  if (str.endsWith('```')) {
    str = str.replace(/\s*```$/i, '');
  }
  return str.trim();
}

/**
 * GET /api/status
 * Health check endpoint
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'AI-Sheets-Assistant',
    provider: 'Groq',
    model: GROQ_MODEL,
    hasApiKey: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
  });
});

/**
 * POST /api/analyze-sheet
 * Analyzes spreadsheet data using Groq AI
 */
app.post('/api/analyze-sheet', async (req, res) => {
  try {
    const { data, question } = req.body;

    // Validation
    if (!data || typeof data !== 'string' || data.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid spreadsheet or CSV data to analyze.'
      });
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a question or instruction for the AI.'
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Groq API key is not configured on the server. Please check .env.'
      });
    }

    const systemPrompt = `You are a spreadsheet data analysis assistant.
Answer the user's specific question using ONLY the supplied dataset.
Inspect the actual rows and columns before answering.
Do not give a generic dataset summary when the user asks a specific question.
For filtering questions, identify and return every matching row.
For questions involving a particular column, inspect that exact column.
Do not invent data.
If no rows match, clearly say that no matching records were found.
Keep the answer concise and directly answer the question.
Format your response using clean HTML snippets (<h4>, <p>, <ul>, <li>, <strong>, <code>, <table>) without enclosing in \`\`\`html code blocks.`;

    const userMessage = `DATASET:
${data.trim()}

USER QUESTION:
${question.trim()}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 600
    });

    const rawResponse = completion.choices[0]?.message?.content || '';
    const answer = cleanResponseText(rawResponse);

    return res.json({
      success: true,
      answer: answer || '<p>No answer could be generated for this dataset.</p>'
    });

  } catch (err) {
    console.error('Groq API analyze-sheet error:', err);

    const isRateLimit = err?.status === 429 ||
      err?.error?.code === 'rate_limit_exceeded' ||
      String(err?.message || '').includes('429') ||
      String(err?.message || '').includes('OTPM') ||
      String(err?.message || '').toLowerCase().includes('rate limit');

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        error: 'AI analysis is temporarily limited. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Unable to analyze spreadsheet data.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`📊 AI Google Sheets Assistant Backend Running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: Groq (${GROQ_MODEL})`);
  console.log(`🔑 API Key: ${apiKey ? 'Configured (starts with ' + apiKey.slice(0, 7) + '...)' : 'Missing'}`);
  console.log(`===============================================`);
});
