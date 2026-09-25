/* ===================================================
   AI Sheets Assistant — Task 5
   script.js  –  Vanilla JS Engine + Demo & API Modes
=================================================== */

'use strict';

/* ============================================================
   CONFIGURATION & CONSTANTS
============================================================ */

const DEFAULT_API_URL = '/api/analyze-sheet';
const BACKEND_PORT    = '5001';

/* Sample Datasets */
const SAMPLES = {
  studentScores: `StudentID,Name,Subject,Score,MaxMarks,Grade,Status
S101,Aarav Sharma,Mathematics,88,100,A,Passed
S102,Diya Patel,Physics,94,100,A+,Passed
S103,Rohan Verma,Chemistry,42,100,D,Passed
S104,Ananya Iyer,Mathematics,34,100,F,Failed
S105,Kabir Singh,Physics,76,100,B,Passed
S106,Meera Nair,Chemistry,91,100,A+,Passed
S107,Vikram Rao,Mathematics,65,100,C,Passed
S108,Pooja Joshi,Physics,38,100,F,Failed
S109,Arjun Reddy,Chemistry,82,100,A,Passed
S110,Neha Gupta,Mathematics,95,100,A+,Passed`,

  classAttendance: `RollNo,StudentName,Department,TotalClasses,Attended,AttendancePct,Eligibility
101,Aditi Roy,Computer Science,60,56,93.3,Eligible
102,Bhavin Shah,Computer Science,60,42,70.0,Condonation
103,Chitra Menon,Electronics,60,58,96.7,Eligible
104,Dev Kulkarni,Mechanical,60,33,55.0,Detained
105,Farhan Ali,Computer Science,60,50,83.3,Eligible
106,Gauri Pillai,Electronics,60,38,63.3,Condonation
107,Harsh Vardhan,Mechanical,60,47,78.3,Eligible
108,Isha Kapoor,Computer Science,60,59,98.3,Eligible
109,Jayant Patil,Electronics,60,31,51.7,Detained`,

  courseGrades: `CourseCode,CourseTitle,Credits,Semester,Instructor,AvgScore,Enrollment
CS101,Data Structures,4,Fall 2026,Dr. Sen,78.5,85
CS102,Operating Systems,4,Fall 2026,Prof. Rao,71.2,74
MA201,Discrete Mathematics,3,Fall 2026,Dr. Gupta,64.8,92
CS203,Database Systems,3,Fall 2026,Prof. Mehta,82.0,80
CS305,Artificial Intelligence,4,Fall 2026,Dr. Nair,88.4,68
EC104,Digital Electronics,3,Fall 2026,Prof. Joshi,69.0,78`
};

/* ============================================================
   STATE
============================================================ */

let currentMode   = 'demo'; // 'demo' | 'api'
let parsedSheet   = null;   // { headers: string[], rows: (string|number)[][] }
let rawCsvContent = '';     // Raw CSV string
let sortColIndex  = -1;
let sortAscending = true;

/* ============================================================
   DOM ELEMENTS
============================================================ */

const csvInput         = document.getElementById('csvInput');
const charCount        = document.getElementById('charCount');
const lineCount        = document.getElementById('lineCount');
const dropzone         = document.getElementById('dropzone');
const inputError       = document.getElementById('inputError');

const tableEmpty       = document.getElementById('tableEmpty');
const tableContainer   = document.getElementById('tableContainer');
const sheetTable       = document.getElementById('sheetTable');
const sheetTableHead   = document.getElementById('sheetTableHead');
const sheetTableBody   = document.getElementById('sheetTableBody');
const tableMetaBadge   = document.getElementById('tableMetaBadge');
const tableTools       = document.getElementById('tableTools');
const tableSearchInput = document.getElementById('tableSearchInput');

const queryInput       = document.getElementById('queryInput');
const analyzeBtn       = document.getElementById('analyzeBtn');
const analysisLoader   = document.getElementById('analysisLoader');
const analysisLoaderText= document.getElementById('analysisLoaderText');
const analysisError    = document.getElementById('analysisError');
const resultCard       = document.getElementById('resultCard');
const resultModeBadge  = document.getElementById('resultModeBadge');
const resultQuestionDisplay = document.getElementById('resultQuestionDisplay');
const resultBody       = document.getElementById('resultBody');

const apiUrlInput      = document.getElementById('apiUrlInput');
const apiConfig        = document.getElementById('apiConfig');

/* ============================================================
   INITIALIZATION & EVENT LISTENERS
============================================================ */

// Live character and line counter
csvInput.addEventListener('input', updateInputMetrics);

function updateInputMetrics() {
  const text  = csvInput.value;
  const chars = text.length;
  const lines = text.trim() ? text.trim().split('\n').length : 0;
  charCount.textContent = `${chars.toLocaleString()} characters`;
  lineCount.textContent = `${lines.toLocaleString()} rows`;
}

// Drag & drop file handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    readFile(files[0]);
  }
});

/* ============================================================
   MODE SWITCHER
============================================================ */

function setMode(mode) {
  currentMode = mode;

  document.getElementById('demoModeBtn').classList.toggle('active', mode === 'demo');
  document.getElementById('apiModeBtn').classList.toggle('active', mode === 'api');

  document.getElementById('modeDescDemo').style.display = mode === 'demo' ? 'flex' : 'none';
  document.getElementById('modeDescApi').style.display  = mode === 'api'  ? 'flex' : 'none';

  apiConfig.style.display = mode === 'api' ? 'flex' : 'none';

  // Update button labels & hints
  analyzeBtn.innerHTML = mode === 'api'
    ? '<span class="btn-icon">🤖</span> Ask Groq AI'
    : '<span class="btn-icon">✨</span> Ask AI';
}

/* ============================================================
   DATA LOADING & PARSING
============================================================ */

function loadSample(key) {
  if (!SAMPLES[key]) return;
  csvInput.value = SAMPLES[key];
  updateInputMetrics();
  hideError(inputError);
  loadDataFromInput();
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    readFile(file);
  }
}

function readFile(file) {
  hideError(inputError);
  const reader = new FileReader();
  reader.onload = (e) => {
    csvInput.value = e.target.result;
    updateInputMetrics();
    loadDataFromInput();
  };
  reader.onerror = () => {
    showError(inputError, '⚠️ Failed to read the selected file. Please try again.');
  };
  reader.readAsText(file);
}

function loadDataFromInput() {
  hideError(inputError);
  const raw = csvInput.value.trim();

  if (!raw) {
    showError(inputError, '⚠️ Please paste or upload CSV data first.');
    return;
  }

  try {
    const parsed = parseCsv(raw);
    if (!parsed || parsed.headers.length === 0 || parsed.rows.length === 0) {
      throw new Error('No valid tabular rows detected. Check your headers and data rows.');
    }

    parsedSheet   = parsed;
    rawCsvContent = raw;

    renderTable(parsedSheet);
    hideError(inputError);

  } catch (err) {
    showError(inputError, `⚠️ Invalid data format: ${err.message}`);
  }
}

function clearAllData() {
  csvInput.value   = '';
  parsedSheet      = null;
  rawCsvContent    = '';
  updateInputMetrics();
  hideError(inputError);
  hideError(analysisError);

  // Reset table
  tableEmpty.style.display     = 'block';
  tableContainer.style.display = 'none';
  tableMetaBadge.style.display = 'none';
  tableTools.style.display     = 'none';
  sheetTableHead.innerHTML     = '';
  sheetTableBody.innerHTML     = '';

  // Reset result
  resultCard.style.display     = 'none';
  resultBody.innerHTML         = '';
}

/**
 * Robust CSV / TSV / Delimited Parser
 * Supports commas, tabs, semicolons, and quoted values.
 */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  // Detect delimiter: comma, tab, or semicolon
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount   = (firstLine.match(/\t/g) || []).length;
  const semiCount  = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';

  // Parse lines with quoted values support
  const parsedRows = lines.map(line => parseDelimitedLine(line, delimiter));

  const headers = parsedRows[0].map(h => cleanCell(h));
  const rows    = parsedRows.slice(1).map(row => {
    // Pad or trim row to match header length
    while (row.length < headers.length) row.push('');
    return row.slice(0, headers.length).map(cell => coerceValue(cleanCell(cell)));
  });

  return { headers, rows };
}

function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanCell(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/^["']|["']$/g, '').trim();
}

function coerceValue(val) {
  if (typeof val !== 'string') return val;
  const clean = val.replace(/[$%]/g, '').trim();
  if (clean !== '' && !isNaN(clean)) {
    return Number(clean);
  }
  return val;
}

/* ============================================================
   TABLE RENDERING & SORTING
============================================================ */

function renderTable(data) {
  sheetTableHead.innerHTML = '';
  sheetTableBody.innerHTML = '';

  const { headers, rows } = data;

  // Header row
  const trHead = document.createElement('tr');
  const thIdx = document.createElement('th');
  thIdx.className = 'row-idx-th';
  thIdx.textContent = '#';
  trHead.appendChild(thIdx);

  headers.forEach((header, colIndex) => {
    const th = document.createElement('th');
    const sortIndicator = colIndex === sortColIndex ? (sortAscending ? ' ▲' : ' ▼') : '';
    th.innerHTML = `${escapeHtml(header)}<span style="font-size:0.75rem; color:var(--text-muted);">${sortIndicator}</span>`;
    th.title = 'Click to sort column';
    th.onclick = () => sortTable(colIndex);
    trHead.appendChild(th);
  });
  sheetTableHead.appendChild(trHead);

  // Body rows
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.id = `sheet-row-${rowIndex}`;

    const tdIdx = document.createElement('td');
    tdIdx.className = 'row-idx-td';
    tdIdx.textContent = rowIndex + 1;
    tr.appendChild(tdIdx);

    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell !== null && cell !== undefined ? cell : '';
      if (typeof cell === 'number') {
        td.style.fontFamily = 'var(--font-mono)';
      }
      tr.appendChild(td);
    });

    sheetTableBody.appendChild(tr);
  });

  // Update UI meta
  tableMetaBadge.textContent = `${rows.length} rows × ${headers.length} cols`;
  tableMetaBadge.style.display = 'inline-block';
  tableTools.style.display     = 'block';
  tableEmpty.style.display     = 'none';
  tableContainer.style.display = 'block';
}

function sortTable(colIndex) {
  if (!parsedSheet) return;

  if (sortColIndex === colIndex) {
    sortAscending = !sortAscending;
  } else {
    sortColIndex = colIndex;
    sortAscending = true;
  }

  parsedSheet.rows.sort((a, b) => {
    const valA = a[colIndex];
    const valB = b[colIndex];

    if (valA === valB) return 0;
    if (valA === '' || valA === null) return 1;
    if (valB === '' || valB === null) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAscending ? valA - valB : valB - valA;
    }
    return sortAscending
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  renderTable(parsedSheet);
}

function filterTableRows(query) {
  const q = (query || '').toLowerCase().trim();
  const trs = sheetTableBody.querySelectorAll('tr');

  trs.forEach(tr => {
    if (!q) {
      tr.classList.remove('hidden-row');
    } else {
      const match = tr.innerText.toLowerCase().includes(q);
      tr.classList.toggle('hidden-row', !match);
    }
  });
}

/* ============================================================
   AI ANALYSIS CONTROLLER (DEMO & API MODES)
============================================================ */

function setQuery(text) {
  queryInput.value = text;
  queryInput.focus();
}

function executeQuickOp(operation) {
  const opPrompts = {
    summarize:  'Give a comprehensive summary of this dataset.',
    highest:    'Which record has the highest value and what are the details?',
    lowest:     'Which record has the lowest value and what are the details?',
    average:    'What is the average of the numerical columns in this dataset?',
    duplicates: 'Are there any duplicate records or duplicate keys in this dataset?',
    filter:     'Filter and highlight the most notable records (e.g. failing grades, critical values, or outliers).'
  };

  const question = opPrompts[operation] || 'Analyze this dataset';
  queryInput.value = question;
  runAnalysis();
}

async function runAnalysis() {
  hideError(analysisError);

  // Verify data is loaded
  if (!parsedSheet || parsedSheet.rows.length === 0) {
    showError(analysisError, '⚠️ Please load some spreadsheet data first before asking questions.');
    return;
  }

  const question = queryInput.value.trim();
  if (!question) {
    showError(analysisError, '⚠️ Please enter a question or click a Quick Operation.');
    queryInput.focus();
    return;
  }

  setAnalyzeState(true);

  try {
    let resultHtml = '';

    if (currentMode === 'api') {
      resultHtml = await callGroqApi(rawCsvContent, question);
    } else {
      resultHtml = await analyzeSheetLocally(parsedSheet, question);
    }

    displayResult(question, resultHtml, currentMode);

  } catch (err) {
    console.error('Analysis error:', err);
    showError(analysisError, `⚠️ ${err.message || 'Unable to complete analysis. Please try again.'}`);
  } finally {
    setAnalyzeState(false);
  }
}

function displayResult(question, htmlContent, mode) {
  resultQuestionDisplay.innerHTML = `<span>Question:</span> "${escapeHtml(question)}"`;
  resultModeBadge.textContent     = mode === 'api' ? '🤖 Groq AI' : '🔧 Demo Mode (Local)';
  resultModeBadge.style.background = mode === 'api' ? 'rgba(45,140,255,0.2)' : 'rgba(0,201,167,0.2)';
  resultModeBadge.style.color      = mode === 'api' ? 'var(--accent-primary)' : 'var(--accent-sheets)';

  resultBody.innerHTML = htmlContent;
  resultCard.style.display = 'block';

  // Smooth scroll into view
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ============================================================
   API MODE — Groq AI Backend Call
============================================================ */

function resolveEndpoint(path) {
  let custom = apiUrlInput ? apiUrlInput.value.trim() : '';
  if (!custom) custom = path;

  if (custom.startsWith('http://') || custom.startsWith('https://')) {
    return custom;
  }

  const targetPath = custom.startsWith('/') ? custom : '/' + custom;
  if (window.location.protocol === 'http:' && window.location.port === BACKEND_PORT) {
    return targetPath;
  }
  return `http://localhost:${BACKEND_PORT}${targetPath}`;
}

async function callGroqApi(csvData, question) {
  const endpoint = resolveEndpoint(DEFAULT_API_URL);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: csvData, question })
    });
  } catch (err) {
    const e = new Error('Could not connect to the backend server. Make sure "npm start" is running in AI-Sheets-Assistant.');
    e.isNetworkError = true;
    throw e;
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
    throw new Error('Invalid response received from server.');
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || `Server returned error status ${response.status}`);
  }

  return json.answer;
}

/* ============================================================
   DEMO MODE — Local JavaScript Computational Engine
   Performs real mathematical and structural queries on actual user data!
============================================================ */

async function analyzeSheetLocally(data, question) {
  // Small delay so loading animation is visible
  await delay(450 + Math.random() * 300);

  const { headers, rows } = data;
  const q = question.toLowerCase();

  // Inspect column types
  const colStats = analyzeColumns(headers, rows);

  // Route query to specialized computational handlers
  if (q.includes('average') || q.includes('mean') || q.includes('avg')) {
    return computeAverageAnswer(headers, rows, colStats, q);
  }
  if (q.includes('highest') || q.includes('max') || q.includes('top') || q.includes('best') || q.includes('maximum')) {
    return computeExtremumAnswer(headers, rows, colStats, 'highest', q);
  }
  if (q.includes('lowest') || q.includes('min') || q.includes('bottom') || q.includes('worst') || q.includes('minimum')) {
    return computeExtremumAnswer(headers, rows, colStats, 'lowest', q);
  }
  if (q.includes('duplicate') || q.includes('repeat') || q.includes('redundant')) {
    return computeDuplicatesAnswer(headers, rows);
  }
  if (q.includes('below') || q.includes('less than') || q.includes('under') || q.includes('failed') || q.includes('filter')) {
    return computeFilterAnswer(headers, rows, colStats, q);
  }
  if (q.includes('subject') || q.includes('department') || q.includes('category') || q.includes('group by')) {
    return computeGroupBreakdown(headers, rows, colStats, q);
  }

  // Default: Comprehensive Dataset Summary
  return computeDatasetSummary(headers, rows, colStats);
}

/* ---- Computational Helpers for Demo Mode ---- */

function analyzeColumns(headers, rows) {
  return headers.map((header, colIndex) => {
    const values = rows.map(r => r[colIndex]).filter(v => v !== '' && v !== null);
    const numericValues = values.filter(v => typeof v === 'number');
    const isNumeric = numericValues.length > 0 && numericValues.length >= values.length * 0.7;

    if (isNumeric) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      return { header, colIndex, isNumeric: true, count: numericValues.length, sum, avg, min, max };
    } else {
      const uniqueSet = new Set(values);
      return { header, colIndex, isNumeric: false, count: values.length, uniqueCount: uniqueSet.size };
    }
  });
}

function computeAverageAnswer(headers, rows, colStats, q) {
  const numericCols = colStats.filter(c => c.isNumeric);

  if (numericCols.length === 0) {
    return `<p>⚠️ No numerical columns found in this dataset to calculate an average.</p>`;
  }

  // Check if a specific column is requested in the question
  let targetCol = numericCols.find(c => q.includes(c.header.toLowerCase()));
  if (!targetCol) targetCol = numericCols[0]; // default to first numeric column

  let html = `<h4>➗ Average Calculation for "${escapeHtml(targetCol.header)}"</h4>`;
  html += `<p>Based on your <strong>${targetCol.count}</strong> valid data entries:</p>`;
  html += `<ul>
    <li><strong>Average (${escapeHtml(targetCol.header)}):</strong> <span class="metric-pill">${targetCol.avg.toFixed(2)}</span></li>
    <li><strong>Total Sum:</strong> ${targetCol.sum.toLocaleString()}</li>
    <li><strong>Minimum Value:</strong> ${targetCol.min}</li>
    <li><strong>Maximum Value:</strong> ${targetCol.max}</li>
  </ul>`;

  // Formula breakdown
  html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">
    📐 Formula: <code>Sum (${targetCol.sum}) ÷ Count (${targetCol.count}) = ${targetCol.avg.toFixed(2)}</code>
  </p>`;

  // Other numeric columns if present
  if (numericCols.length > 1) {
    html += `<h4>Other Numeric Averages:</h4><ul>`;
    numericCols.filter(c => c !== targetCol).forEach(c => {
      html += `<li><strong>${escapeHtml(c.header)}:</strong> ${c.avg.toFixed(2)} (Min: ${c.min}, Max: ${c.max})</li>`;
    });
    html += `</ul>`;
  }

  return html;
}

function computeExtremumAnswer(headers, rows, colStats, type, q) {
  const numericCols = colStats.filter(c => c.isNumeric);

  if (numericCols.length === 0) {
    return `<p>⚠️ No numerical columns available to determine the ${type} record.</p>`;
  }

  let targetCol = numericCols.find(c => q.includes(c.header.toLowerCase()));
  if (!targetCol) targetCol = numericCols[0];

  const targetIdx = targetCol.colIndex;
  const isHighest = type === 'highest';

  let bestRow = null;
  let bestVal = isHighest ? -Infinity : Infinity;

  rows.forEach(row => {
    const val = row[targetIdx];
    if (typeof val === 'number') {
      if ((isHighest && val > bestVal) || (!isHighest && val < bestVal)) {
        bestVal = val;
        bestRow = row;
      }
    }
  });

  if (!bestRow) {
    return `<p>Could not determine the ${type} record.</p>`;
  }

  // Identify identifier column (e.g. Name, Student, Title, ID)
  const nameCol = headers.find(h => /name|student|title|item|code/i.test(h)) || headers[0];
  const nameIdx = headers.indexOf(nameCol);
  const identifier = bestRow[nameIdx] || 'Record';

  const icon = isHighest ? '🏆' : '📉';
  let html = `<h4>${icon} ${isHighest ? 'Highest' : 'Lowest'} Record by ${escapeHtml(targetCol.header)}</h4>`;
  html += `<p><strong>${escapeHtml(String(identifier))}</strong> holds the ${type} value with <span class="metric-pill">${bestVal}</span>.</p>`;

  html += `<h4>Full Record Details:</h4>`;
  html += `<table><thead><tr>`;
  headers.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
  html += `</tr></thead><tbody><tr>`;
  bestRow.forEach((cell, i) => {
    const isTarget = i === targetIdx;
    html += `<td style="${isTarget ? 'color:var(--accent-sheets); font-weight:700;' : ''}">${escapeHtml(String(cell))}</td>`;
  });
  html += `</tr></tbody></table>`;

  return html;
}

function computeDuplicatesAnswer(headers, rows) {
  const seen = new Map();
  const duplicates = [];

  rows.forEach((row, idx) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates.push({ row, firstSeen: seen.get(key) + 1, duplicateAt: idx + 1 });
    } else {
      seen.set(key, idx);
    }
  });

  if (duplicates.length === 0) {
    return `
      <h4>🔍 Duplicate Check Results</h4>
      <p style="color:var(--accent-sheets); font-weight:600;">✅ No duplicate rows found!</p>
      <p>All <strong>${rows.length}</strong> records in this dataset are completely unique across all columns.</p>
    `;
  }

  let html = `<h4>⚠️ ${duplicates.length} Duplicate Record${duplicates.length > 1 ? 's' : ''} Found</h4>`;
  html += `<p>The following row(s) appear more than once in your dataset:</p><ul>`;
  duplicates.forEach(d => {
    html += `<li>Row #${d.duplicateAt} is identical to Row #${d.firstSeen}: <code>${escapeHtml(d.row.join(' | '))}</code></li>`;
  });
  html += `</ul>`;
  return html;
}

function computeFilterAnswer(headers, rows, colStats, q) {
  // Extract number from query if present (e.g. "below 40")
  const numMatch = q.match(/(\d+(?:\.\d+)?)/);
  const threshold = numMatch ? parseFloat(numMatch[1]) : 40;

  const numericCols = colStats.filter(c => c.isNumeric);
  let targetCol = numericCols.find(c => q.includes(c.header.toLowerCase())) || numericCols[0];

  if (!targetCol) {
    return `<p>⚠️ Could not find a numeric column to filter by.</p>`;
  }

  const isBelow = q.includes('below') || q.includes('under') || q.includes('less') || q.includes('failed');
  const matched = rows.filter(r => {
    const val = r[targetCol.colIndex];
    if (typeof val !== 'number') return false;
    return isBelow ? val < threshold : val >= threshold;
  });

  const conditionText = isBelow ? `< ${threshold}` : `>= ${threshold}`;
  let html = `<h4>🎯 Filter: ${escapeHtml(targetCol.header)} ${conditionText}</h4>`;
  html += `<p>Found <strong>${matched.length}</strong> of ${rows.length} records matching this condition:</p>`;

  if (matched.length === 0) {
    html += `<p style="color:var(--text-muted);">No records met this filter condition.</p>`;
    return html;
  }

  html += `<table><thead><tr>`;
  headers.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
  html += `</tr></thead><tbody>`;
  matched.forEach(r => {
    html += `<tr>`;
    r.forEach((cell, i) => {
      const isTarget = i === targetCol.colIndex;
      html += `<td style="${isTarget ? 'color:var(--accent-danger); font-weight:700;' : ''}">${escapeHtml(String(cell))}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;

  return html;
}

function computeGroupBreakdown(headers, rows, colStats, q) {
  // Find group column (Subject, Department, Semester, Grade, Status)
  const groupCol = headers.find(h => /subject|dept|department|category|group|grade|status|semester/i.test(h));
  const numericCol = colStats.find(c => c.isNumeric);

  if (!groupCol || !numericCol) {
    return computeDatasetSummary(headers, rows, colStats);
  }

  const groupIdx = headers.indexOf(groupCol);
  const numIdx   = numericCol.colIndex;

  const groups = {};
  rows.forEach(r => {
    const key = r[groupIdx] || 'Unknown';
    const val = r[numIdx];
    if (!groups[key]) groups[key] = [];
    if (typeof val === 'number') groups[key].push(val);
  });

  let html = `<h4>📊 Average ${escapeHtml(numericCol.header)} by ${escapeHtml(groupCol)}</h4>`;
  html += `<table><thead><tr>
    <th>${escapeHtml(groupCol)}</th>
    <th>Count</th>
    <th>Average ${escapeHtml(numericCol.header)}</th>
    <th>Min</th>
    <th>Max</th>
  </tr></thead><tbody>`;

  Object.entries(groups).forEach(([name, arr]) => {
    const count = arr.length;
    const avg = count > 0 ? (arr.reduce((a, b) => a + b, 0) / count).toFixed(2) : 'N/A';
    const min = count > 0 ? Math.min(...arr) : 'N/A';
    const max = count > 0 ? Math.max(...arr) : 'N/A';
    html += `<tr>
      <td><strong>${escapeHtml(name)}</strong></td>
      <td>${count}</td>
      <td style="color:var(--accent-sheets); font-weight:700;">${avg}</td>
      <td>${min}</td>
      <td>${max}</td>
    </tr>`;
  });
  html += `</tbody></table>`;

  return html;
}

function computeDatasetSummary(headers, rows, colStats) {
  let html = `<h4>📊 Dataset Summary &amp; Overview</h4>`;
  html += `<p>Your spreadsheet has <strong>${rows.length} records</strong> and <strong>${headers.length} columns</strong>.</p>`;

  html += `<h4>Column Breakdown:</h4><ul>`;
  colStats.forEach(c => {
    if (c.isNumeric) {
      html += `<li><strong>${escapeHtml(c.header)}</strong> (Numeric): Mean = <code>${c.avg.toFixed(2)}</code>, Range = [${c.min} – ${c.max}]</li>`;
    } else {
      html += `<li><strong>${escapeHtml(c.header)}</strong> (Text/Categorical): <code>${c.uniqueCount}</code> unique values</li>`;
    }
  });
  html += `</ul>`;

  html += `<p style="margin-top:12px; font-size:0.85rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:8px;">
    💡 <em>Use the Quick Operation buttons above or type specific questions to filter, calculate, and inspect your dataset.</em>
  </p>`;

  return html;
}

/* ============================================================
   UI HELPERS & UTILITIES
============================================================ */

function setAnalyzeState(loading) {
  analyzeBtn.disabled = loading;
  analysisLoader.style.display = loading ? 'flex' : 'none';

  if (loading) {
    analysisLoaderText.textContent = currentMode === 'api'
      ? '📊 AI is analyzing your data with Groq...'
      : '⚡ Analyzing data locally...';
  }
}

function showError(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}

function hideError(el) {
  el.textContent   = '';
  el.style.display = 'none';
}

function copyResultText() {
  const text = resultBody.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.btn-copy');
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  }).catch(() => {
    alert('Copied to clipboard');
  });
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   INIT
============================================================ */

// Load the default studentScores sample on initial launch
loadSample('studentScores');
