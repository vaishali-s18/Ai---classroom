const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk');

// Load environment variables from Task 4 root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
app.use(express.json({ limit: '2mb' }));

// Serve frontend static files from project root
app.use(express.static(path.join(__dirname, '..')));

/**
 * Helper to clean Markdown fences (e.g. ```json ... ```) from model text
 */
function cleanJsonText(raw) {
  if (!raw) return '';
  let str = raw.trim();
  // Strip leading code fence
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\s*/i, '');
  }
  // Strip trailing code fence
  if (str.endsWith('```')) {
    str = str.replace(/\s*```$/i, '');
  }
  return str.trim();
}

/**
 * Helper to clean HTML text
 */
function cleanHtmlText(raw) {
  if (!raw) return '';
  let str = raw.trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:html)?\s*/i, '');
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
    provider: 'Groq',
    model: GROQ_MODEL,
    hasApiKey: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
  });
});

/**
 * POST /api/generate-mindmap
 * Generates hierarchical mind map from syllabus using Groq AI
 */
app.post('/api/generate-mindmap', async (req, res) => {
  try {
    const { content, depth = 'Detailed', audience = 'College' } = req.body;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Please provide valid syllabus or topic content.'
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: 'Groq API key is not configured on the server. Please check .env file.'
      });
    }

    const systemPrompt = `You are an expert teacher and curriculum organizer.

Analyze the educational content provided by the user.

Convert the user's content into a logical hierarchical mind-map structure.

IMPORTANT:
- Preserve the important topics and units provided by the user.
- Do not replace the user's syllabus with a generic syllabus.
- Do not invent unrelated topics.
- Organize the actual content into:
  Main Topic
  → Major Topics / Units
  → Subtopics
  → Key Concepts

Depth: ${depth}
Audience: ${audience}

Return ONLY valid JSON.

Required structure:
{
  "title": "Main Topic",
  "children": [
    {
      "title": "Major Topic",
      "children": [
        {
          "title": "Subtopic",
          "children": [
            {
              "title": "Key Concept"
            }
          ]
        }
      ]
    }
  ]
}

Do not return Markdown.
Do not return code fences.
Do not return explanations outside JSON.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `USER CONTENT:\n\n${content.trim()}` }
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const cleaned = cleanJsonText(responseText);

    let parsedTree;
    try {
      parsedTree = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Groq response as JSON:', responseText);
      return res.status(502).json({
        success: false,
        error: 'The AI returned an invalid structure. Please regenerate.'
      });
    }

    // Unwrap if wrapped in an outer key
    if (!parsedTree.title) {
      if (parsedTree.mindmap) parsedTree = parsedTree.mindmap;
      else if (parsedTree.syllabus) parsedTree = parsedTree.syllabus;
      else if (parsedTree.data) parsedTree = parsedTree.data;
      else {
        // Find first key that has title or children
        const possibleKey = Object.keys(parsedTree).find(k => parsedTree[k] && typeof parsedTree[k] === 'object' && (parsedTree[k].title || parsedTree[k].children));
        if (possibleKey) parsedTree = parsedTree[possibleKey];
      }
    }

    if (!parsedTree.title) {
      parsedTree.title = 'Main Subject';
    }

    if (!Array.isArray(parsedTree.children)) {
      parsedTree.children = [];
    }

    return res.json(parsedTree);

  } catch (err) {
    console.error('Groq API generate-mindmap error:', err);
    const isRateLimit = err?.status === 429 ||
      err?.error?.code === 'rate_limit_exceeded' ||
      String(err?.message || '').includes('429') ||
      String(err?.message || '').includes('OTPM') ||
      String(err?.message || '').toLowerCase().includes('rate limit');

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        error: 'AI generation is temporarily limited. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Unable to connect to the AI service.'
    });
  }
});

/**
 * POST /api/explain-topic
 * Generates detailed topic explanation using Groq AI with a short, focused token budget
 */
app.post('/api/explain-topic', async (req, res) => {
  try {
    const { topic, path = '', audience = 'College' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Topic is required.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Groq API key is not configured on the server.'
      });
    }

    const systemPrompt = `You are a concise teaching assistant. Explain the selected topic clearly for a college student. Give a short definition, 2-4 important points, and one simple example. Keep the response under 350 words. Do not provide unnecessary details. Format your response using clean HTML snippets (<h4>, <p>, <ul>, <li>, <strong>) without enclosing in \`\`\`html code blocks.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: "${topic.trim()}"\nContext: ${path || topic}` }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    const explanationRaw = completion.choices[0]?.message?.content || '';
    const explanation = cleanHtmlText(explanationRaw);

    return res.json({ success: true, explanation });

  } catch (err) {
    console.error('Groq API explain-topic error:', err);
    const isRateLimit = err?.status === 429 ||
      err?.error?.code === 'rate_limit_exceeded' ||
      String(err?.message || '').includes('429') ||
      String(err?.message || '').includes('OTPM') ||
      String(err?.message || '').toLowerCase().includes('rate limit');

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        error: 'AI explanation is temporarily limited. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Unable to generate AI explanation.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🧠 AI Mind Map Generator Backend Running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: Groq (${GROQ_MODEL})`);
  console.log(`🔑 API Key configured: ${apiKey ? 'Yes (starts with ' + apiKey.slice(0, 7) + '...)' : 'No'}`);
  console.log(`===============================================`);
});
