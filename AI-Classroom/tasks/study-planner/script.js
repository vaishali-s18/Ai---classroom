/* ═══════════════════════════════════════════════════════════════
   AI Study Planner — script.js
   Demo Mode: fully dynamic plan generation (no API key needed)
   API Mode:  POST /api/generate-study-plan  (Groq / Express)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── State ──────────────────────────────────────────────────────── */
let currentMode   = 'demo';   // 'demo' | 'api'
let currentView   = 'list';   // 'list' | 'calendar'
let studyPlan     = [];       // array of day objects
let completedTasks = new Set(); // Set of taskIds  "dayIndex-taskIndex"
let planInput     = null;     // last form input snapshot

/* ── Topic banks per subject (demo mode AI simulation) ─────────── */
const TOPIC_BANK = {
  default: [
    'Introduction & Overview', 'Core Concepts', 'Fundamentals',
    'Advanced Topics', 'Problem Solving', 'Practice Questions',
    'Mock Test', 'Revision'
  ],
  dbms: [
    'ER Diagrams', 'Relational Model', 'Normalization (1NF–3NF)',
    'BCNF & 4NF', 'SQL Basics', 'Joins & Subqueries',
    'Transactions & ACID', 'Concurrency Control', 'Indexing & Hashing',
    'Query Optimization', 'PL/SQL', 'NoSQL Basics', 'Revision'
  ],
  java: [
    'OOP Principles', 'Classes & Objects', 'Inheritance & Polymorphism',
    'Interfaces & Abstract Classes', 'Exception Handling',
    'Collections Framework', 'Generics', 'Multithreading',
    'File I/O & Streams', 'Lambda & Streams API',
    'Design Patterns', 'JVM Internals', 'Revision'
  ],
  dsa: [
    'Arrays & Strings', 'Linked Lists', 'Stacks & Queues',
    'Trees (BST, AVL)', 'Heaps & Priority Queues', 'Hashing',
    'Graphs (BFS/DFS)', 'Shortest Path Algorithms',
    'Sorting Algorithms', 'Recursion & Backtracking',
    'Dynamic Programming', 'Greedy Algorithms', 'Revision'
  ],
  'operating systems': [
    'Process Management', 'CPU Scheduling', 'Synchronization',
    'Deadlock Detection & Prevention', 'Memory Management',
    'Virtual Memory & Paging', 'File Systems',
    'I/O Management', 'Disk Scheduling', 'Revision'
  ],
  'os': [
    'Process Management', 'CPU Scheduling', 'Synchronization',
    'Deadlock', 'Memory Management', 'Virtual Memory',
    'File Systems', 'I/O Management', 'Revision'
  ],
  'computer networks': [
    'OSI Model', 'TCP/IP Model', 'Physical & Data Link Layers',
    'IP Addressing & Subnetting', 'Routing Protocols',
    'TCP & UDP', 'Application Layer (HTTP, DNS, SMTP)',
    'Network Security', 'Socket Programming', 'Revision'
  ],
  'cn': [
    'OSI & TCP/IP Models', 'IP Addressing', 'Routing',
    'Transport Layer', 'Application Layer', 'Network Security', 'Revision'
  ],
  maths: [
    'Calculus', 'Linear Algebra', 'Probability & Statistics',
    'Discrete Mathematics', 'Number Theory', 'Revision'
  ],
  physics: [
    'Mechanics', 'Thermodynamics', 'Electrostatics',
    'Current Electricity', 'Optics', 'Modern Physics', 'Revision'
  ],
  chemistry: [
    'Organic Chemistry Basics', 'Reactions & Mechanisms',
    'Inorganic Chemistry', 'Physical Chemistry', 'Revision'
  ],
  python: [
    'Syntax & Data Types', 'Functions & Modules', 'OOP in Python',
    'File Handling', 'Libraries (NumPy, Pandas)', 'Revision'
  ],
  'machine learning': [
    'Supervised Learning', 'Unsupervised Learning', 'Regression',
    'Classification', 'Decision Trees', 'Neural Networks Basics',
    'Model Evaluation', 'Feature Engineering', 'Revision'
  ],
  ml: [
    'Supervised & Unsupervised Learning', 'Regression & Classification',
    'Neural Networks', 'Model Evaluation', 'Revision'
  ]
};

/* ── Priority weights ────────────────────────────────────────────── */
const LEVEL_MULTIPLIER = { beginner: 1.4, intermediate: 1.0, advanced: 0.75 };

/* ── Helpers ─────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

function formatDate(dateObj) {
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateShort(dateObj) {
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short'
  });
}

function toDateKey(dateObj) {
  return dateObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function todayKey() {
  return toDateKey(new Date());
}

function minutesToHours(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getTopicsForSubject(subject) {
  const key = subject.toLowerCase().trim();
  for (const [bankKey, topics] of Object.entries(TOPIC_BANK)) {
    if (key === bankKey || key.includes(bankKey) || bankKey.includes(key)) {
      return [...topics];
    }
  }
  return TOPIC_BANK.default.map(t => `${subject} — ${t}`);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Mode toggle ─────────────────────────────────────────────────── */
function setMode(mode) {
  currentMode = mode;
  $('demoBtn').classList.toggle('active', mode === 'demo');
  $('apiBtn').classList.toggle('active',  mode === 'api');
  $('apiKeyRow').classList.toggle('hidden', mode !== 'api');
}

/* ── View toggle ─────────────────────────────────────────────────── */
function switchView(view) {
  currentView = view;
  $('listViewBtn').classList.toggle('active',     view === 'list');
  $('calendarViewBtn').classList.toggle('active', view === 'calendar');
  $('listView').classList.toggle('hidden',     view !== 'list');
  $('calendarView').classList.toggle('hidden', view !== 'calendar');
}

/* ── Form submission ─────────────────────────────────────────────── */
document.getElementById('plannerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleGenerate();
});

async function handleGenerate() {
  // ── Read inputs ────────────────────────────────────────────────
  const subjectsRaw = $('subjectsInput').value.trim();
  const examDateVal = $('examDate').value;
  const hoursPerDay = parseFloat($('hoursPerDay').value);
  const preferredTime = document.querySelector('input[name="preferredTime"]:checked')?.value || 'flexible';
  const level        = document.querySelector('input[name="level"]:checked')?.value        || 'intermediate';
  const priority     = document.querySelector('input[name="priority"]:checked')?.value     || 'equal';

  // ── Validate ───────────────────────────────────────────────────
  if (!subjectsRaw) { showToast('⚠️ Please enter at least one subject.', 'error'); return; }
  if (!examDateVal)  { showToast('⚠️ Please select an exam date.',        'error'); return; }

  const subjects = subjectsRaw.split('\n').map(s => s.trim()).filter(Boolean);
  if (subjects.length === 0) { showToast('⚠️ Please enter at least one subject.', 'error'); return; }

  const examDate = new Date(examDateVal);
  examDate.setHours(0, 0, 0, 0);
  const today    = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilExam = Math.ceil((examDate - today) / 86400000);
  if (daysUntilExam <= 0) { showToast('⚠️ Exam date must be in the future.', 'error'); return; }

  // Store snapshot
  planInput = { subjects, examDate, hoursPerDay, preferredTime, level, priority, daysUntilExam };

  // Reset completed tasks
  completedTasks.clear();

  // Show loading
  showLoading(true);

  try {
    if (currentMode === 'demo') {
      // Simulate async "AI thinking" delay
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
      studyPlan = generateDemoPlan(planInput);
    } else {
      studyPlan = await fetchApiPlan(planInput);
    }
    renderDashboard();
    showToast('✅ Study plan generated!', 'success');
  } catch (err) {
    console.error(err);
    showToast(`❌ ${err.message || 'Something went wrong.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   DEMO MODE — Dynamic Plan Generator
   ═══════════════════════════════════════════════════════════════ */
function generateDemoPlan({ subjects, examDate, hoursPerDay, level, priority, daysUntilExam }) {
  const plan = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── How many study days? (leave last 2 days for full revision) ─
  const revisionDays   = Math.min(2, Math.max(1, Math.floor(daysUntilExam * 0.15)));
  const studyDays      = daysUntilExam - revisionDays;
  const totalStudyDays = daysUntilExam; // include revision days in plan

  // ── Allocate topics per subject ────────────────────────────────
  const subjectTopics = subjects.map(sub => ({
    name   : sub,
    topics : getTopicsForSubject(sub)
  }));

  // ── Priority ordering ──────────────────────────────────────────
  let orderedSubjects = [...subjectTopics];
  if (priority === 'weak-first') {
    // Beginners: put subjects with more topics first (harder)
    // Actually simulate "weak first" by giving first subjects more time
    orderedSubjects = subjectTopics; // order as entered = weak first per task desc
  }

  // ── Build a flat queue of tasks ────────────────────────────────
  const taskQueue = buildTaskQueue(orderedSubjects, studyDays, hoursPerDay, level, priority);

  // ── Assign tasks to days ───────────────────────────────────────
  let taskIdx = 0;
  const hoursPerDayMins = Math.round(hoursPerDay * 60);

  for (let d = 0; d < totalStudyDays; d++) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + d);

    const isRevisionDay = d >= studyDays;
    const dayTasks = [];
    let minutesLeft = hoursPerDayMins;

    if (isRevisionDay) {
      // Full revision day
      const revPerSubject = Math.floor(hoursPerDayMins / subjects.length);
      subjects.forEach((sub, si) => {
        const mins = Math.max(30, revPerSubject);
        dayTasks.push({
          id       : `${d}-${si}`,
          subject  : sub,
          topic    : 'Comprehensive Revision',
          duration : mins,
          priority : 'revision'
        });
      });
    } else {
      // Pull from task queue
      while (minutesLeft >= 30 && taskIdx < taskQueue.length) {
        const task = taskQueue[taskIdx];
        if (task.duration <= minutesLeft) {
          dayTasks.push({ ...task, id: `${d}-${dayTasks.length}` });
          minutesLeft -= task.duration;
          taskIdx++;
        } else if (minutesLeft >= 30) {
          // Partial: split the task
          dayTasks.push({
            ...task,
            id      : `${d}-${dayTasks.length}`,
            topic   : task.topic + ' (cont.)',
            duration: minutesLeft
          });
          taskQueue[taskIdx] = {
            ...task,
            topic   : task.topic + ' (cont.)',
            duration: task.duration - minutesLeft
          };
          minutesLeft = 0;
        } else {
          break;
        }
      }
      // If we still have leftover time and ran out of tasks, add a revision slot
      if (minutesLeft >= 30 && dayTasks.length > 0) {
        const revSubject = subjects[d % subjects.length];
        dayTasks.push({
          id       : `${d}-rev`,
          subject  : revSubject,
          topic    : 'Quick Revision',
          duration : minutesLeft,
          priority : 'revision'
        });
        minutesLeft = 0;
      }
    }

    if (dayTasks.length === 0) continue;

    const totalMins = dayTasks.reduce((s, t) => s + t.duration, 0);

    plan.push({
      dayNumber : d + 1,
      date      : toDateKey(dayDate),
      dateObj   : dayDate,
      tasks     : dayTasks,
      totalMins,
      isRevision: isRevisionDay
    });
  }

  return plan;
}

/* ── Build flat task queue ───────────────────────────────────────── */
function buildTaskQueue(orderedSubjects, studyDays, hoursPerDay, level, priority) {
  const queue       = [];
  const multiplier  = LEVEL_MULTIPLIER[level] || 1.0;
  const totalMins   = studyDays * hoursPerDay * 60;
  const perSubject  = Math.floor(totalMins / orderedSubjects.length);

  orderedSubjects.forEach((subObj, si) => {
    const { name, topics } = subObj;

    // "weak-first" means first subject gets ~30% more time
    let subjectMins = perSubject;
    if (priority === 'weak-first') {
      const boost = si === 0 ? 1.3 : si === 1 ? 1.1 : 0.9;
      subjectMins = Math.round(perSubject * boost);
    }

    // How long per topic (scaled by level)
    const baseTopicMins  = Math.round((subjectMins / topics.length) * multiplier);
    const clampedTopicMins = Math.max(30, Math.min(120, baseTopicMins));

    // Determine priority label
    const getPriority = (idx) => {
      if (priority === 'weak-first' && si === 0) return 'high';
      if (idx < Math.floor(topics.length / 3)) return 'high';
      if (idx < Math.floor(topics.length * 2 / 3)) return 'medium';
      return 'low';
    };

    topics.forEach((topic, ti) => {
      queue.push({
        subject  : name,
        topic,
        duration : clampedTopicMins,
        priority : getPriority(ti)
      });
    });
  });

  // For "weak-first", keep order as-is (first subject topics come first)
  // For "equal", interleave subjects so variety each day
  if (priority === 'equal') {
    return interleaveBySubject(queue, orderedSubjects.length);
  }
  return queue;
}

/* ── Interleave tasks so each day has variety ────────────────────── */
function interleaveBySubject(queue, numSubjects) {
  const buckets = Array.from({ length: numSubjects }, () => []);
  queue.forEach(task => {
    // find which bucket this subject belongs to
    const idx = buckets.findIndex(b => b.length === 0 || b[0].subject === task.subject);
    if (idx !== -1) buckets[idx].push(task);
    else buckets[queue.indexOf(task) % numSubjects].push(task);
  });

  // Reassign by actual subject
  const subjectBuckets = {};
  queue.forEach(task => {
    if (!subjectBuckets[task.subject]) subjectBuckets[task.subject] = [];
    subjectBuckets[task.subject].push(task);
  });

  const keys = Object.keys(subjectBuckets);
  const result = [];
  let remaining = true;
  let round = 0;
  while (remaining) {
    remaining = false;
    keys.forEach(k => {
      if (subjectBuckets[k][round]) {
        result.push(subjectBuckets[k][round]);
        remaining = true;
      }
    });
    round++;
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   API MODE — fetch from Express/Groq backend
   ═══════════════════════════════════════════════════════════════ */
async function fetchApiPlan({ subjects, examDate, hoursPerDay, preferredTime, level, priority }) {
  const apiKey = $('apiKey')?.value?.trim();

  const body = {
    subjects,
    examDate  : toDateKey(examDate),
    hoursPerDay,
    preferredTime,
    level,
    priority
  };

  const res = await fetch('http://localhost:3000/api/generate-study-plan', {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !Array.isArray(data.plan)) {
    throw new Error('Invalid response from server.');
  }

  // Normalise API response into internal format
  return data.plan.map((day, i) => {
    const dateObj = new Date(day.date + 'T00:00:00');
    return {
      dayNumber : i + 1,
      date      : day.date,
      dateObj,
      tasks     : (day.tasks || []).map((t, ti) => ({
        id       : `${i}-${ti}`,
        subject  : t.subject,
        topic    : t.topic,
        duration : t.duration,
        priority : t.priority || 'medium'
      })),
      totalMins  : (day.tasks || []).reduce((s, t) => s + (t.duration || 0), 0),
      isRevision : false
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   RENDER DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function renderDashboard() {
  $('emptyState').classList.add('hidden');
  $('dashboard').classList.remove('hidden');

  updateStats();
  renderTodaySection();
  renderListView();
  renderCalendarView();
  updatePlanMeta();
}

/* ── Stats ───────────────────────────────────────────────────────── */
function updateStats() {
  const allTasks   = studyPlan.flatMap(d => d.tasks);
  const totalMins  = allTasks.reduce((s, t) => s + t.duration, 0);
  const doneMins   = allTasks.filter(t => completedTasks.has(t.id)).reduce((s, t) => s + t.duration, 0);
  const remainMins = totalMins - doneMins;
  const pct        = totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0;

  // Days left
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const examDate = planInput?.examDate;
  const daysLeft = examDate ? Math.max(0, Math.ceil((examDate - today) / 86400000)) : 0;

  $('statTotal').querySelector('.stat-value').textContent  = minutesToHours(totalMins);
  $('statDone').querySelector('.stat-value').textContent   = minutesToHours(doneMins);
  $('statRemain').querySelector('.stat-value').textContent = minutesToHours(remainMins);
  $('statPct').querySelector('.stat-value').textContent    = `${pct}%`;
  $('statDays').querySelector('.stat-value').textContent   = daysLeft;

  // Progress bar
  $('progressFill').style.width = `${pct}%`;
  $('progressPct').textContent  = `${pct}%`;
  $('progressTrack').setAttribute('aria-valuenow', pct);
}

/* ── Today Section ───────────────────────────────────────────────── */
function renderTodaySection() {
  const tk      = todayKey();
  const todayDay = studyPlan.find(d => d.date === tk);
  const container = $('todayTasks');
  $('todayDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  if (!todayDay || todayDay.tasks.length === 0) {
    container.innerHTML = '<p class="no-today">No study tasks scheduled for today.</p>';
    return;
  }

  container.innerHTML = todayDay.tasks.map(task => buildTaskCard(task, 'today')).join('');
}

function buildTaskCard(task, context) {
  const done      = completedTasks.has(task.id);
  const doneClass = done ? 'completed' : '';
  const cardClass = context === 'today' ? 'today-task-card' : 'task-row';
  return `
    <div class="${cardClass} ${doneClass}" id="card-${task.id}" data-task-id="${task.id}">
      <input
        type="checkbox"
        class="task-check"
        id="chk-${task.id}"
        aria-label="Mark ${task.topic} complete"
        ${done ? 'checked' : ''}
        onchange="toggleTask('${task.id}')"
      />
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.topic)}</div>
        <div class="task-sub">${escapeHtml(task.subject)}</div>
      </div>
      <span class="task-duration">${minutesToHours(task.duration)}</span>
      <span class="task-priority priority-${task.priority}">${task.priority}</span>
    </div>`;
}

/* ── List View ───────────────────────────────────────────────────── */
function renderListView() {
  const tk      = todayKey();
  const container = $('planDays');
  container.innerHTML = studyPlan.map((day) => {
    const isToday    = day.date === tk;
    const allDone    = day.tasks.length > 0 && day.tasks.every(t => completedTasks.has(t.id));
    const todayClass = isToday ? 'today-highlight' : '';
    const doneClass  = allDone  ? 'all-done'        : '';

    const tasksHtml = day.tasks.map(task => buildTaskCard(task, 'list')).join('');

    return `
      <div class="day-card ${todayClass} ${doneClass}" id="day-${day.dayNumber}" data-day="${day.dayNumber}">
        <div class="day-header" onclick="toggleDayCollapse(${day.dayNumber})" aria-expanded="true">
          <div class="day-label">
            <div class="day-number">${day.dayNumber}</div>
            <div>
              <div class="day-title">
                Day ${day.dayNumber}
                ${isToday ? '<span style="font-size:.72rem;background:rgba(108,99,255,.2);color:var(--brand-primary);padding:.1rem .45rem;border-radius:99px;margin-left:.4rem;font-weight:700;">TODAY</span>' : ''}
                ${day.isRevision ? '<span style="font-size:.72rem;background:rgba(72,207,173,.12);color:var(--brand-secondary);padding:.1rem .45rem;border-radius:99px;margin-left:.4rem;font-weight:700;">REVISION</span>' : ''}
              </div>
              <div class="day-date">${formatDate(day.dateObj)}</div>
            </div>
          </div>
          <div class="day-right">
            <span class="day-hours">${minutesToHours(day.totalMins)}</span>
            <span class="day-done-badge">✓ Done</span>
            <span class="day-collapse-icon">▾</span>
          </div>
        </div>
        <div class="day-tasks">${tasksHtml}</div>
      </div>`;
  }).join('');
}

/* ── Toggle Day Collapse ─────────────────────────────────────────── */
function toggleDayCollapse(dayNumber) {
  const card = document.getElementById(`day-${dayNumber}`);
  if (card) card.classList.toggle('collapsed');
}

/* ── Calendar View ───────────────────────────────────────────────── */
function renderCalendarView() {
  const container = $('calendarGrid');
  if (studyPlan.length === 0) { container.innerHTML = ''; return; }

  // Group days by month
  const months = {};
  studyPlan.forEach(day => {
    const key = `${day.dateObj.getFullYear()}-${day.dateObj.getMonth()}`;
    if (!months[key]) months[key] = { year: day.dateObj.getFullYear(), month: day.dateObj.getMonth(), days: [] };
    months[key].days.push(day);
  });

  const tk = todayKey();
  let html = '';

  Object.values(months).forEach(({ year, month, days }) => {
    const monthName = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    html += `<div class="cal-month-heading">${monthName}</div>`;

    // Day-of-week headers
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    html += `<div class="cal-week-row">${dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('')}</div>`;

    // Build full month grid
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build map: dateKey → day object
    const dayMap = {};
    days.forEach(d => { dayMap[d.date] = d; });

    let cells = '';
    let cellCount = 0;

    // Leading empty cells
    for (let e = 0; e < firstDay; e++) {
      cells += `<div class="cal-cell empty"></div>`;
      cellCount++;
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate  = new Date(year, month, d);
      const cellKey   = toDateKey(cellDate);
      const dayObj    = dayMap[cellKey];
      const isToday   = cellKey === tk;
      const hasStudy  = !!dayObj;
      const allDone   = hasStudy && dayObj.tasks.every(t => completedTasks.has(t.id));

      let cls = 'cal-cell';
      if (hasStudy)  cls += ' has-study';
      if (isToday)   cls += ' today-cell';
      if (allDone)   cls += ' all-done-cell';

      let innerHtml = `<div class="cal-date-num">${d}</div>`;

      if (hasStudy) {
        // Show up to 3 subject pills
        const shown = dayObj.tasks.slice(0, 3);
        shown.forEach(t => {
          const done = completedTasks.has(t.id);
          innerHtml += `<span class="cal-subject-pill ${done ? 'done-pill' : ''}">${escapeHtml(t.subject)}</span>`;
        });
        if (dayObj.tasks.length > 3) {
          innerHtml += `<span class="cal-subject-pill">+${dayObj.tasks.length - 3} more</span>`;
        }
        innerHtml += `<span class="cal-hours-badge">${minutesToHours(dayObj.totalMins)}</span>`;
      }

      cells += `<div class="${cls}" data-date="${cellKey}" onclick="handleCalCellClick('${cellKey}')">${innerHtml}</div>`;
      cellCount++;

      // Wrap into rows
      if (cellCount % 7 === 0 && d < daysInMonth) {
        html += `<div class="cal-week-row">${cells}</div>`;
        cells = '';
      }
    }

    // Trailing empty cells
    const remainder = cellCount % 7;
    if (remainder !== 0) {
      for (let e = remainder; e < 7; e++) {
        cells += `<div class="cal-cell empty"></div>`;
      }
    }
    if (cells) html += `<div class="cal-week-row">${cells}</div>`;
  });

  container.innerHTML = html;
}

function handleCalCellClick(dateKey) {
  const day = studyPlan.find(d => d.date === dateKey);
  if (!day) return;
  // Switch to list view and scroll to that day
  switchView('list');
  const card = document.getElementById(`day-${day.dayNumber}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Briefly highlight
    card.style.transition = 'box-shadow .3s';
    card.style.boxShadow  = '0 0 0 3px var(--brand-primary)';
    setTimeout(() => { card.style.boxShadow = ''; }, 1500);
  }
}

/* ── Task completion toggle ──────────────────────────────────────── */
function toggleTask(taskId) {
  if (completedTasks.has(taskId)) {
    completedTasks.delete(taskId);
  } else {
    completedTasks.add(taskId);
    showToast('✅ Task marked complete!', 'success');
  }

  // Update all cards with this taskId (today section + list view may both have it)
  document.querySelectorAll(`[data-task-id="${taskId}"]`).forEach(card => {
    const done = completedTasks.has(taskId);
    card.classList.toggle('completed', done);
    const chk = card.querySelector('.task-check');
    if (chk) chk.checked = done;
    const nameEl = card.querySelector('.task-name');
    if (nameEl) {
      nameEl.style.textDecoration = done ? 'line-through' : '';
    }
  });

  // Check if the whole day is done → update badge
  studyPlan.forEach(day => {
    const dayCard = document.getElementById(`day-${day.dayNumber}`);
    if (!dayCard) return;
    const allDone = day.tasks.every(t => completedTasks.has(t.id));
    dayCard.classList.toggle('all-done', allDone);
  });

  // Re-render calendar cells to reflect done state
  renderCalendarView();
  updateStats();
}

/* ── Plan Meta ───────────────────────────────────────────────────── */
function updatePlanMeta() {
  if (!studyPlan.length) return;
  const total = studyPlan.reduce((s, d) => s + d.tasks.length, 0);
  $('planMeta').textContent = `${studyPlan.length} study days · ${total} tasks`;
}

/* ── Loading state ───────────────────────────────────────────────── */
function showLoading(on) {
  $('emptyState').classList.toggle('hidden',   on || studyPlan.length > 0);
  $('loadingState').classList.toggle('hidden', !on);
  $('dashboard').classList.toggle('hidden',    on || studyPlan.length === 0);
  $('generateBtn').disabled = on;
  $('generateBtn').innerHTML = on
    ? '<span class="btn-icon">⏳</span> Generating…'
    : '<span class="btn-icon">✨</span> Generate Study Plan';
}

/* ── Toast ───────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg;
  el.className   = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

/* ── Escape HTML ─────────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Set default exam date to 25 days from today ─────────────────── */
(function setDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 25);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  $('examDate').value = `${yyyy}-${mm}-${dd}`;
  // Min = tomorrow
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  $('examDate').min = toDateKey(tom);
})();
