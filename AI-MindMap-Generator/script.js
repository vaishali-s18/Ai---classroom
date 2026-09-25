/* ===================================================
   AI Mind Map Generator — Task 4
   script.js  –  Vanilla JS + D3.js
=================================================== */

'use strict';

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL         = '/api/generate-mindmap';
const EXPLAIN_API_URL = '/api/explain-topic';

let currentMode = 'demo'; // 'demo' | 'api'

/* ============================================================
   STATE
============================================================ */

let currentMindMapData = null;   // Parsed JSON tree
let lastInputText      = '';     // Last user input (for regenerate)
let selectedNode       = null;   // Currently selected node object
let selectedNodePath   = '';     // Breadcrumb path string
let svgZoom            = null;   // D3 zoom behaviour reference
let svgRoot            = null;   // D3 root g element

/* ============================================================
   DOM REFERENCES
============================================================ */

const syllabusInput    = document.getElementById('syllabusInput');
const charCount        = document.getElementById('charCount');
const generateBtn      = document.getElementById('generateBtn');
const regenerateBtn    = document.getElementById('regenerateBtn');
const depthSelect      = document.getElementById('depthSelect');
const audienceSelect   = document.getElementById('audienceSelect');
const apiConfig        = document.getElementById('apiConfig');
const apiUrlInput      = document.getElementById('apiUrlInput');
const inputError       = document.getElementById('inputError');

const mapLoader        = document.getElementById('mapLoader');
const mapError         = document.getElementById('mapError');
const mapEmpty         = document.getElementById('mapEmpty');
const mindmapCanvas    = document.getElementById('mindmapCanvas');
const mindmapSvg       = document.getElementById('mindmapSvg');
const mapControls      = document.getElementById('mapControls');

const explainSection   = document.getElementById('explainSection');
const selectedNodeTitle= document.getElementById('selectedNodeTitle');
const selectedNodePathEl= document.getElementById('selectedNodePath');
const explainBtn       = document.getElementById('explainBtn');
const explainLoader    = document.getElementById('explainLoader');
const explanationBody  = document.getElementById('explanationBody');

/* ============================================================
   CHARACTER COUNTER
============================================================ */

syllabusInput.addEventListener('input', () => {
  const len = syllabusInput.value.length;
  charCount.textContent = len.toLocaleString();
  // colour hint
  charCount.style.color = len > 8000 ? '#ffc107' : len > 12000 ? '#ff4d6d' : '';
});

/* ============================================================
   MODE SWITCHER
============================================================ */

function setMode(mode) {
  currentMode = mode;

  // Toggle button active state
  document.getElementById('demoModeBtn').classList.toggle('active', mode === 'demo');
  document.getElementById('apiModeBtn').classList.toggle('active', mode === 'api');

  // Show/hide mode description banners
  document.getElementById('modeDescDemo').style.display = mode === 'demo' ? 'flex' : 'none';
  document.getElementById('modeDescApi').style.display  = mode === 'api'  ? 'flex' : 'none';

  // Show/hide API config
  apiConfig.style.display = mode === 'api' ? 'flex' : 'none';

  // Update explain button label
  const explainBtnLabel = document.getElementById('explainBtnLabel');
  if (explainBtnLabel) {
    explainBtnLabel.textContent = mode === 'api'
      ? 'Get AI Explanation'
      : 'Explain This Topic';
  }

  // Update explain loader text
  const explainLoaderText = document.getElementById('explainLoaderText');
  if (explainLoaderText) {
    explainLoaderText.textContent = mode === 'api'
      ? 'Fetching AI explanation...'
      : 'Building explanation...';
  }

  // Reset explanation panel when switching mode (avoid stale content)
  if (explanationBody) {
    explanationBody.style.display = 'none';
    explanationBody.innerHTML = '';
  }
}

/* ============================================================
   GENERATE MIND MAP
============================================================ */

async function generateMindMap() {
  const text     = syllabusInput.value.trim();
  const depth    = depthSelect.value;
  const audience = audienceSelect.value;

  hideError(inputError);
  hideError(mapError);

  if (!text) {
    showError(inputError, '⚠️ Please enter your syllabus or topic content first.');
    syllabusInput.focus();
    return;
  }

  lastInputText = text;
  setGenerateState(true);
  showState('loading', currentMode);

  try {
    let data;
    if (currentMode === 'api') {
      data = await callApi(text, depth, audience);
    } else {
      data = await parseSyllabusForDemo(text, depth);
    }

    assignIds(data);
    currentMindMapData = data;
    showState('map');
    renderMindMap(data);
    regenerateBtn.style.display = 'inline-flex';

    // Clear explanation panel on new generation
    resetExplainPanel();

  } catch (err) {
    console.error('Mind map generation error:', err);
    let msg;
    if (currentMode === 'api') {
      msg = err.isNetworkError
        ? '🌐 Unable to connect to the AI service. Check your API endpoint and network connection.'
        : err.isJsonError
        ? '❌ The AI returned an invalid structure. Please try regenerating.'
        : `⚠️ API error: ${err.message || 'Please try again.'}`;
    } else {
      msg = `⚠️ Unable to parse the syllabus. ${err.message || 'Please check your input and try again.'}`;
    }
    showState('error');
    showError(mapError, msg);
  } finally {
    setGenerateState(false);
  }
}

/* ============================================================
   REGENERATE
============================================================ */

function regenerateMindMap() {
  if (!lastInputText) return;
  syllabusInput.value = lastInputText;
  charCount.textContent = lastInputText.length.toLocaleString();
  generateMindMap();
}

/* ============================================================
   CLEAR
============================================================ */

function clearAll() {
  syllabusInput.value = '';
  charCount.textContent = '0';
  lastInputText = '';
  currentMindMapData = null;
  selectedNode = null;
  regenerateBtn.style.display = 'none';
  hideError(inputError);
  hideError(mapError);
  showState('empty');
  resetExplainPanel();

  // Clear SVG
  d3.select('#mindmapSvg').selectAll('*').remove();
  svgZoom = null;
  svgRoot = null;
}

/* ============================================================
   API CALL (real backend)
============================================================ */

function resolveApiUrl(path) {
  let endpoint = apiUrlInput ? apiUrlInput.value.trim() : '';
  if (!endpoint) endpoint = path;

  // If user entered a custom full URL (http/https), use it
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    if (path === EXPLAIN_API_URL && endpoint.includes('/api/generate-mindmap')) {
      return endpoint.replace('/api/generate-mindmap', '/api/explain-topic');
    }
    return endpoint;
  }

  // If relative path
  const targetPath = (path === EXPLAIN_API_URL) ? '/api/explain-topic' : (endpoint.startsWith('/') ? endpoint : '/' + endpoint);

  // If page is hosted on port 5000, keep relative; otherwise connect to http://localhost:5000
  if (window.location.protocol === 'http:' && window.location.port === '5000') {
    return targetPath;
  }
  return 'http://localhost:5000' + targetPath;
}

async function callApi(text, depth, audience) {
  const endpoint = resolveApiUrl(API_URL);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, depth, audience }),
    });
  } catch (err) {
    const e = new Error('Network request failed');
    e.isNetworkError = true;
    throw e;
  }

  if (!response.ok) {
    let errJson = null;
    try { errJson = await response.json(); } catch (_) {}
    const errMsg = errJson && errJson.error ? errJson.error : `Server responded with status ${response.status}`;
    throw new Error(errMsg);
  }

  let raw;
  try {
    raw = await response.json();
  } catch {
    const e = new Error('Invalid JSON from server');
    e.isJsonError = true;
    throw e;
  }

  return raw;
}

/* ============================================================
   DEMO MODE — Local Syllabus Parser
   Converts the user's actual input into a hierarchy.
   No AI API is called. No fixed/predefined syllabus is used.
============================================================ */

/**
 * Entry point for Demo mode.
 * Always operates on the user's actual input text.
 */
async function parseSyllabusForDemo(text, depth) {
  // Small realistic delay so the loading spinner is visible
  await delay(600 + Math.random() * 400);
  return buildDemoHierarchy(text, depth);
}

/**
 * buildDemoHierarchy(text, depth)
 *
 * Parses arbitrary syllabus text into a JSON tree.
 * Strategy (applied in order of priority):
 *
 * 1. Section headers  → Unit N / Chapter N / Module N / Topic N / Part N
 *                       followed by a colon, optionally with a title
 * 2. Numbered items   → "1.", "2.", "1)", "a.", "a)" at level 0 indent
 * 3. Bullet items     → "-", "*", "•", "→", "►" with indentation
 * 4. Indent-based     → general indentation fallback
 *
 * The root title is derived from the first non-empty line.
 * Depth setting controls maximum tree depth:
 *   Basic        → max 3 levels
 *   Detailed     → max 4 levels  (default)
 *   Very Detailed → max 5 levels
 */
function buildDemoHierarchy(text, depth) {
  const maxDepth = { 'Basic': 3, 'Detailed': 4, 'Very Detailed': 5 }[depth] || 4;

  // ── Step 1: Split into non-empty lines ──
  const rawLines = text.split('\n').map(l => l.trimEnd());
  const lines    = rawLines.filter(l => l.trim().length > 0);

  if (lines.length === 0) throw new Error('No content to parse.');

  // ── Step 2: Classify each line ──
  const classified = lines.map(line => classifyLine(line));

  // ── Step 3: Build tree ──
  const rootLabel = classified[0].label || 'Syllabus';
  const root      = makeNode(rootLabel);

  if (classified.length === 1) {
    // Single line — just a root
    return root;
  }

  // Stack stores: { node, level }
  // level -1 is the root sentinel
  const stack = [{ node: root, level: -1 }];

  for (let i = 1; i < classified.length; i++) {
    const item = classified[i];
    if (!item.label) continue;

    const node = makeNode(item.label);

    // Pop until parent is strictly shallower
    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, level: item.level });
  }

  // ── Step 4: Prune to max depth ──
  pruneDepth(root, maxDepth);

  // ── Step 5: Strip empty children arrays ──
  cleanEmptyChildren(root);

  return root;
}

/* ----------------------------------------------------------------
   classifyLine(rawLine)

   Returns { label: string, level: number }

   Level semantics:
     0  = top-level section header  (Unit 1:, Chapter 2:, etc.)
     1  = numbered item at column 0 (1. Introduction)
     2+ = indent-based sub-items

   We normalise all levels to a consistent 0-based integer so
   the stack builder can compare them reliably.
---------------------------------------------------------------- */
const SECTION_RE  = /^(unit|chapter|module|topic|part|section|lecture|week|lesson)\s*[\d\w\-\.]*\s*[:\-–]?\s*/i;
const NUMBERED_RE = /^(\d+|[a-z])[.\)]\s+/i;
const BULLET_RE   = /^[\-\*\•\→\►]\s+/;

function classifyLine(line) {
  const trimmed = line.trim();
  const indent  = measureIndent(line);

  let label = '';
  let level = indent; // base: indent-level

  if (!trimmed) return { label: '', level };

  // ── Pattern 1: Section header  (Unit 1: Cloud Computing) ──
  if (SECTION_RE.test(trimmed)) {
    // Extract optional title after the colon
    const withoutPrefix = trimmed.replace(SECTION_RE, '').replace(/^:\s*/, '').trim();
    const sectionTag    = trimmed.match(SECTION_RE)[0].trim().replace(/:$/, '').trim();
    label = withoutPrefix ? `${sectionTag}: ${withoutPrefix}` : sectionTag;
    // Section headers are always level 0 (top-level branches regardless of indent)
    level = 0;

  // ── Pattern 2: Numbered item at column 0  (1. Introduction) ──
  } else if (NUMBERED_RE.test(trimmed) && indent === 0) {
    label = trimmed.replace(NUMBERED_RE, '').trim();
    level = 1; // treat as one step below root

  // ── Pattern 3: Numbered item with indent ──
  } else if (NUMBERED_RE.test(trimmed)) {
    label = trimmed.replace(NUMBERED_RE, '').trim();
    level = indent + 1;

  // ── Pattern 4: Bullet item ──
  } else if (BULLET_RE.test(trimmed)) {
    label = trimmed.replace(BULLET_RE, '').trim();
    // Bullets always become children of whatever is above them
    level = indent + 2;

  // ── Pattern 5: Heading  (# / ## / ###) ──
  } else if (/^#{1,6}\s/.test(trimmed)) {
    const hashes = (trimmed.match(/^(#+)/) || [''])[0].length;
    label = trimmed.replace(/^#+\s*/, '').trim();
    level = hashes - 1; // # = 0, ## = 1, ### = 2 ...

  // ── Pattern 6: General indented text ──
  } else {
    label = trimmed;
    level = indent;
  }

  // Final cleanup
  label = cleanLabel(label);

  return { label, level };
}

function measureIndent(line) {
  let count = 0;
  for (const ch of line) {
    if (ch === '\t') count += 4;
    else if (ch === ' ') count += 1;
    else break;
  }
  return count;
}

function cleanLabel(str) {
  return (str || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.*?)\*/g, '$1')        // *italic*
    .replace(/`(.*?)`/g, '$1')          // `code`
    .replace(/^[:\-–—]\s*/, '')         // leading punctuation
    .replace(/\s{2,}/g, ' ')            // collapse spaces
    .trim();
}

function makeNode(title) {
  return { title: title || 'Topic', children: [], _id: uid() };
}

function pruneDepth(node, maxDepth, current = 0) {
  if (current >= maxDepth) {
    node.children = [];
    return;
  }
  (node.children || []).forEach(c => pruneDepth(c, maxDepth, current + 1));
}

function cleanEmptyChildren(node) {
  if (!node.children || node.children.length === 0) {
    delete node.children;
    return;
  }
  node.children.forEach(cleanEmptyChildren);
}

function assignIds(node) {
  if (!node._id) node._id = uid();
  (node.children || []).forEach(assignIds);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ============================================================
   EXPLAIN NODE  (node click → AI explanation)
============================================================ */

async function explainNode() {
  if (!selectedNode) return;

  explainBtn.disabled = true;
  explanationBody.style.display = 'none';
  explainLoader.style.display   = 'flex';

  try {
    let html;
    if (currentMode === 'api') {
      html = await callExplainApi(selectedNode.title, selectedNodePath);
    } else {
      html = await mockExplain(selectedNode.title, selectedNodePath);
    }

    explanationBody.innerHTML = html;
    explanationBody.style.display = 'block';
  } catch (err) {
    console.error('Explain error:', err);
    explanationBody.innerHTML = `<p style="color:#ff6b8a;">⚠️ ${escapeHtml(err.message || 'Unable to generate explanation. Please try again.')}</p>`;
    explanationBody.style.display = 'block';
  } finally {
    explainLoader.style.display = 'none';
    explainBtn.disabled = false;
  }
}

async function callExplainApi(topic, path) {
  const endpoint = resolveApiUrl(EXPLAIN_API_URL);
  const audience = audienceSelect ? audienceSelect.value : 'College';

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, path, audience }),
    });
  } catch (err) {
    const e = new Error('Network request failed');
    e.isNetworkError = true;
    throw e;
  }

  if (!response.ok) {
    let errJson = null;
    try { errJson = await response.json(); } catch (_) {}
    const errMsg = errJson && errJson.error ? errJson.error : `Status ${response.status}`;
    throw new Error(errMsg);
  }

  const { explanation } = await response.json();
  return explanation;
}

/* ---- Demo Explanation (local — no AI API) ---- */
async function mockExplain(topic, path) {
  await delay(400 + Math.random() * 300);

  // Extract context from the current mind map data
  const siblings   = getSiblingTopics(topic, currentMindMapData);
  const parentName = path
    ? path.split(' › ').slice(-2, -1)[0] || ''
    : '';
  const hasSiblings = siblings.length > 0;

  return `
    <div class="demo-explain-badge">🔧 Demo Mode — Local explanation based on your syllabus structure</div>

    <h4>📍 Position in your syllabus</h4>
    <p>
      <strong>${escapeHtml(topic)}</strong> appears in your syllabus
      ${parentName ? `under <strong>${escapeHtml(parentName)}</strong>` : 'as a top-level topic'}.
      ${path ? `<br><small style="color:var(--text-muted);">Full path: ${escapeHtml(path)}</small>` : ''}
    </p>

    ${hasSiblings ? `
    <h4>🔗 Related topics in your syllabus</h4>
    <ul>
      ${siblings.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
    </ul>
    ` : ''}

    <h4>📖 About this topic</h4>
    <p>
      <strong>${escapeHtml(topic)}</strong> is a topic from your provided syllabus.
      Study this topic in the context of
      ${parentName ? `<strong>${escapeHtml(parentName)}</strong>` : 'the subject'}.
    </p>

    <h4>📝 Study tips</h4>
    <ul>
      <li>Review your course materials and textbook chapters covering <strong>${escapeHtml(topic)}</strong>.</li>
      <li>Connect this topic with ${hasSiblings ? 'the related topics listed above' : 'other topics in your syllabus'}.</li>
      <li>Look for definitions, examples, and practice questions in your course resources.</li>
      <li>Check if this topic appears in past exam papers or assignment briefs.</li>
    </ul>

    <p style="margin-top:14px; font-size:0.8rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:10px;">
      💡 <em>This is a local demo explanation based on your syllabus structure.
      Switch to <strong>API Mode</strong> and connect an AI backend to get full AI-generated explanations.</em>
    </p>
  `;
}

/**
 * getSiblingTopics — finds sibling nodes of a given title in the tree.
 * Returns up to 5 sibling titles (excluding the node itself).
 */
function getSiblingTopics(title, tree) {
  if (!tree) return [];
  const results = [];

  function search(node, parent) {
    if (!node) return;
    const children = node.children || [];
    const found    = children.some(c => c.title === title);
    if (found) {
      children.forEach(c => {
        if (c.title !== title) results.push(c.title);
      });
    }
    children.forEach(c => search(c, node));
  }

  search(tree, null);
  return results.slice(0, 5);
}


/* ============================================================
   D3 MIND MAP RENDERER
============================================================ */

function renderMindMap(data) {
  const svg = d3.select('#mindmapSvg');
  svg.selectAll('*').remove();

  const container = document.getElementById('mindmapCanvas');
  const W = container.clientWidth  || 900;
  const H = container.clientHeight || 560;

  // ---- Flatten tree for D3 hierarchy ----
  const root = d3.hierarchy(data, d => (d.children && d.children.length ? d.children : null));

  // ---- Tree layout ----
  // Choose orientation: radial for large trees, LR for small
  const nodeCount = root.descendants().length;
  const isRadial   = nodeCount > 20;

  let treeLayout;
  let linkGen;
  let initialTranslate;

  if (isRadial) {
    // Radial layout
    const radius = Math.min(W, H) * 0.42;
    treeLayout = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 2.2) / a.depth);

    treeLayout(root);

    // Convert polar to Cartesian
    root.descendants().forEach(d => {
      const r = d.y;
      const a = d.x - Math.PI / 2;
      d.px = r * Math.cos(a);
      d.py = r * Math.sin(a);
    });

    linkGen = d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y);

    initialTranslate = [W / 2, H / 2];

  } else {
    // Left-to-right layout
    const nodeH = 56;
    const treeH  = Math.max(H - 60, root.leaves().length * nodeH);
    treeLayout = d3.tree().size([treeH, W * 0.72]);
    treeLayout(root);

    root.descendants().forEach(d => {
      d.px = d.y;
      d.py = d.x;
    });

    linkGen = (d) => {
      const sx = d.source.px, sy = d.source.py;
      const tx = d.target.px, ty = d.target.py;
      const mx = (sx + tx) / 2;
      return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
    };

    // Centre the tree vertically
    const minY = d3.min(root.descendants(), d => d.py);
    const maxY = d3.max(root.descendants(), d => d.py);
    const treeCenter = (minY + maxY) / 2;
    initialTranslate = [60, H / 2 - treeCenter];
  }

  // ---- Zoom setup ----
  svgZoom = d3.zoom()
    .scaleExtent([0.15, 4])
    .on('zoom', (event) => {
      svgRoot.attr('transform', event.transform);
    });

  svg.call(svgZoom);

  // ---- Root <g> ----
  svgRoot = svg.append('g')
    .attr('transform', `translate(${initialTranslate[0]}, ${initialTranslate[1]})`);

  // ---- Defs (gradient, glow filter) ----
  const defs = svg.append('defs');

  const glow = defs.append('filter').attr('id', 'glow');
  glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  const feMerge = glow.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // ---- Links ----
  const linkGroup = svgRoot.append('g').attr('class', 'links');

  if (isRadial) {
    linkGroup.selectAll('path.link-path')
      .data(root.links())
      .join('path')
      .attr('class', 'link-path')
      .attr('d', linkGen)
      .attr('stroke', (d) => nodeColor(d.target.depth, 0.55))
      .attr('stroke-dasharray', function() {
        const len = this.getTotalLength ? this.getTotalLength() : 100;
        return len;
      })
      .attr('stroke-dashoffset', function() {
        const len = this.getTotalLength ? this.getTotalLength() : 100;
        return len;
      })
      .transition().duration(700).delay((_, i) => i * 12)
      .attr('stroke-dashoffset', 0);
  } else {
    linkGroup.selectAll('path.link-path')
      .data(root.links())
      .join('path')
      .attr('class', 'link-path')
      .attr('d', d => linkGen(d))
      .attr('stroke', d => nodeColor(d.target.depth, 0.55))
      .attr('opacity', 0)
      .transition().duration(600).delay((_, i) => i * 15)
      .attr('opacity', 1);
  }

  // ---- Nodes ----
  const nodeGroup = svgRoot.append('g').attr('class', 'nodes');

  const nodeGs = nodeGroup.selectAll('g.node-group')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node-group')
    .attr('transform', d => `translate(${d.px}, ${d.py})`)
    .attr('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', (event, d) => onNodeClick(event, d))
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Animate nodes in
  nodeGs.transition().duration(500).delay((_, i) => i * 25).attr('opacity', 1);

  // Node circle radius based on depth
  const radii = [44, 34, 26, 20, 16];

  nodeGs.append('circle')
    .attr('class', 'node-circle')
    .attr('r', d => radii[Math.min(d.depth, radii.length - 1)])
    .attr('fill', d => nodeColor(d.depth))
    .attr('stroke', d => nodeColorLight(d.depth))
    .attr('stroke-width', 2.5);

  // Node label — multi-line for longer text
  nodeGs.each(function(d) {
    const g   = d3.select(this);
    const r   = radii[Math.min(d.depth, radii.length - 1)];
    const words = wrapWords(d.data.title, r * 1.8);
    const lineH = 13;
    const startY = -((words.length - 1) * lineH) / 2;

    words.forEach((word, wi) => {
      g.append('text')
        .attr('class', 'node-text')
        .attr('y', startY + wi * lineH)
        .attr('fill', '#ffffff')
        .attr('font-size', nodeFontSize(d.depth) + 'px')
        .attr('font-weight', d.depth <= 1 ? '700' : '500')
        .attr('font-family', "'Segoe UI', system-ui, sans-serif")
        .text(word);
    });
  });

  // Apply initial zoom to fit
  fitToView(W, H);
}

/* ---- Node colour palette ---- */
const NODE_COLORS = [
  '#6c63ff', // depth 0 — root (purple)
  '#2d8cff', // depth 1 — branches (blue)
  '#00c9a7', // depth 2 — sub-branches (teal)
  '#ff6b6b', // depth 3 — leaves level 1 (coral)
  '#ffc107', // depth 4 — leaves level 2 (amber)
];

function nodeColor(depth, alpha) {
  const c = NODE_COLORS[Math.min(depth, NODE_COLORS.length - 1)];
  if (alpha === undefined) return c;
  return hexToRgba(c, alpha);
}

function nodeColorLight(depth) {
  const c = NODE_COLORS[Math.min(depth, NODE_COLORS.length - 1)];
  return lighten(c, 0.4);
}

function nodeFontSize(depth) {
  return [13, 11, 10, 9, 8][Math.min(depth, 4)];
}

/* ---- Colour helpers ---- */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighten(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

/* ---- Word wrap helper ---- */
function wrapWords(text, maxWidth) {
  const words = (text || '').split(/\s+/);
  const lines  = [];
  let current  = '';
  const approxCharW = 6.5;
  const maxChars    = Math.floor(maxWidth / approxCharW);

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;
    }
  }

  if (current) lines.push(current);

  // Limit to 3 lines max
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].slice(0, maxChars - 1) + '…';
  }

  return lines;
}

/* ============================================================
   NODE CLICK HANDLER
============================================================ */

function onNodeClick(event, d) {
  event.stopPropagation();

  // Deselect previous
  d3.selectAll('.node-group.selected').classed('selected', false);
  d3.select(event.currentTarget).classed('selected', true);

  selectedNode = d.data;

  // Build breadcrumb path
  const ancestors = d.ancestors().reverse().map(a => a.data.title);
  selectedNodePath = ancestors.join(' › ');

  // Show panel
  selectedNodeTitle.textContent = d.data.title;
  selectedNodePathEl.textContent = selectedNodePath;
  explanationBody.style.display = 'none';
  explanationBody.innerHTML     = '';
  explainLoader.style.display   = 'none';
  explainSection.style.display  = 'block';

  // Smooth scroll to explain section on mobile
  if (window.innerWidth < 900) {
    setTimeout(() => {
      explainSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
}

/* ============================================================
   TOOLTIP
============================================================ */

let tooltip = null;

function showTooltip(event, d) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'node-tooltip';
    document.getElementById('mindmapCanvas').appendChild(tooltip);
  }

  const childCount = (d.data.children || []).length;
  const depthLabel = ['Root', 'Branch', 'Sub-branch', 'Concept', 'Detail'][Math.min(d.depth, 4)];
  tooltip.innerHTML = `
    <strong>${escapeHtml(d.data.title)}</strong><br>
    <small>${depthLabel} · ${childCount} child${childCount !== 1 ? 'ren' : ''}</small>
  `;
  tooltip.style.opacity = '1';

  positionTooltip(event);
}

function hideTooltip() {
  if (tooltip) tooltip.style.opacity = '0';
}

function positionTooltip(event) {
  if (!tooltip) return;
  const rect   = document.getElementById('mindmapCanvas').getBoundingClientRect();
  let   left   = event.clientX - rect.left + 12;
  let   top    = event.clientY - rect.top  - 10;
  if (left + 210 > rect.width) left = event.clientX - rect.left - 220;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}

document.getElementById('mindmapCanvas').addEventListener('mousemove', (e) => {
  if (tooltip && tooltip.style.opacity === '1') positionTooltip(e);
});

/* ============================================================
   ZOOM CONTROLS
============================================================ */

function zoomIn() {
  if (!svgZoom) return;
  d3.select('#mindmapSvg').transition().duration(300).call(svgZoom.scaleBy, 1.35);
}

function zoomOut() {
  if (!svgZoom) return;
  d3.select('#mindmapSvg').transition().duration(300).call(svgZoom.scaleBy, 0.74);
}

function resetView() {
  if (!svgZoom) return;
  const container = document.getElementById('mindmapCanvas');
  fitToView(container.clientWidth, container.clientHeight);
}

function fitToView(W, H) {
  if (!svgRoot || !svgZoom) return;

  const svgEl = document.getElementById('mindmapSvg');
  const gNode = svgRoot.node();
  if (!gNode) return;

  try {
    const bounds = gNode.getBBox();
    if (!bounds.width || !bounds.height) return;

    const scale  = 0.88 * Math.min(W / bounds.width, H / bounds.height);
    const tx     = (W - scale * (bounds.x * 2 + bounds.width))  / 2;
    const ty     = (H - scale * (bounds.y * 2 + bounds.height)) / 2;

    d3.select(svgEl)
      .transition().duration(600)
      .call(svgZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  } catch {
    // getBBox can fail in some environments — ignore
  }
}

/* ============================================================
   FULLSCREEN
============================================================ */

function toggleFullscreen() {
  const section = document.querySelector('.mindmap-section');
  const btn     = document.getElementById('fsBtn');
  const isFs    = section.classList.toggle('fullscreen');
  btn.textContent = isFs ? '✕' : '⛶';

  setTimeout(() => {
    const c = document.getElementById('mindmapCanvas');
    resetView();
  }, 50);
}

/* ============================================================
   UI STATE HELPERS
============================================================ */

function showState(state, mode = currentMode) {
  mapLoader.style.display    = 'none';
  mapEmpty.style.display     = 'none';
  mindmapCanvas.style.display= 'none';
  mapControls.style.display  = 'none';

  switch (state) {
    case 'loading':
      mapLoader.style.display = 'flex';
      const loaderMsg = mapLoader.querySelector('p');
      if (loaderMsg) {
        loaderMsg.textContent = mode === 'api'
          ? '🤖 Generating AI mind map with Groq...'
          : '🧠 Creating your mind map locally...';
      }
      break;
    case 'map':
      mindmapCanvas.style.display = 'block';
      mapControls.style.display   = 'flex';
      break;
    case 'empty':
      mapEmpty.style.display      = 'flex';
      break;
    case 'error':
      // mapError is shown separately via showError(mapError, msg)
      break;
  }
}

function setGenerateState(loading) {
  generateBtn.disabled = loading;
  generateBtn.innerHTML = loading
    ? '<span class="btn-icon">⏳</span> Generating...'
    : '<span class="btn-icon">✨</span> Generate Mind Map';
}

function showError(el, msg) {
  el.textContent    = msg;
  el.style.display  = 'block';
}

function hideError(el) {
  el.textContent    = '';
  el.style.display  = 'none';
}

function resetExplainPanel() {
  explainSection.style.display  = 'none';
  selectedNodeTitle.textContent  = '';
  selectedNodePathEl.textContent = '';
  explanationBody.style.display  = 'none';
  explanationBody.innerHTML      = '';
  explainLoader.style.display    = 'none';
  selectedNode = null;
  selectedNodePath = '';
  d3.selectAll('.node-group.selected').classed('selected', false);
}

/* ============================================================
   UTILITY
============================================================ */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   KEYBOARD SHORTCUTS
============================================================ */

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter → Generate
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateMindMap();
  }
  // Escape → clear fullscreen
  if (e.key === 'Escape') {
    const section = document.querySelector('.mindmap-section');
    if (section.classList.contains('fullscreen')) {
      toggleFullscreen();
    }
  }
});

/* ============================================================
   INIT
============================================================ */

// Set initial state
showState('empty');
