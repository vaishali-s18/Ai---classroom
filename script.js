const API_URL = '/api/generate-notes';
const USE_MOCK_MODE = true;

const materialInput = document.querySelector('#study-material');
const characterCount = document.querySelector('#character-count');
const generateButton = document.querySelector('#generate-button');
const exampleButton = document.querySelector('#example-button');
const clearButton = document.querySelector('#clear-button');
const notesOutput = document.querySelector('#notes-output');
const notesActions = document.querySelector('#notes-actions');
const notesState = document.querySelector('#notes-state');
const copyButton = document.querySelector('#copy-button');
const downloadTextButton = document.querySelector('#download-text-button');
const printButton = document.querySelector('#print-button');
const statusMessage = document.querySelector('#status-message');

const exampleMaterial = `Topic: Operating System

An operating system (OS) is system software that manages computer hardware and software resources and provides common services for computer programs. It acts as an intermediary between users and the computer hardware.

The main functions of an operating system include process management, memory management, file management, device management, and security. Process management handles the creation, scheduling, and termination of processes. The CPU scheduling algorithms include First-Come, First-Served (FCFS), Shortest Job First (SJF), Priority Scheduling, and Round Robin.

Memory management keeps track of each byte in a computer's memory and allocates memory to processes when needed. Virtual memory allows a system to use secondary storage as an extension of RAM. File management organizes, stores, and protects files and directories.

Operating systems can be classified as batch, time-sharing, distributed, network, real-time, and mobile operating systems. Examples include Windows, macOS, Linux, Android, and iOS.`;

function showStatus(message, type) { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`; statusMessage.hidden = false; }
function hideStatus() { statusMessage.hidden = true; statusMessage.textContent = ''; }
function updateCharacterCount() { characterCount.textContent = `${materialInput.value.length.toLocaleString()} characters`; }

function buildNotesPrompt(material) {
  return `You are an expert academic tutor.\n\nConvert the following study material into short, clear, and well-structured study notes.\n\nRequirements:\n- Create a suitable main heading.\n- Organize the content using meaningful headings and subheadings.\n- Use concise bullet points.\n- Highlight important definitions and concepts using bold text.\n- Include important formulas, examples, or keywords when present in the source.\n- Do not add unrelated information.\n- Do not invent facts that are not supported by the source material.\n- Preserve important technical terminology.\n- Make the notes easy for a student to revise.\n- Keep the notes concise but complete.\n- Return ONLY valid Markdown.\n- Do not wrap the response in a code block.\n\nStudy Material:\n\n${material}`;
}

function createMockMarkdown(material) {
  const topic = material.match(/^Topic:\s*(.+)$/im)?.[1] || 'Study Material';
  const sentences = material.replace(/^Topic:.+$/im, '').split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter((item) => item.length > 35);
  const definition = sentences[0] || 'Review the provided material and identify its central idea.';
  const functions = [...new Set((material.match(/\b(?:process management|memory management|file management|device management|security|CPU scheduling)\b/gi) || []).map((item) => item.toLowerCase()))];
  const concepts = functions.length ? functions.map((item) => `- **${item.replace(/\b\w/g, (letter) => letter.toUpperCase())}**: A core area described in the source material.`).join('\n') : '- Review the major terms and relationships described in the source.';
  return `# ${topic}: Revision Notes\n\n## Definition\n\n**${topic}**: ${definition}\n\n## Key Concepts\n\n${concepts}\n\n## Important Points\n\n${sentences.slice(1, 5).map((sentence) => `- ${sentence}`).join('\n') || '- The source contains the main concepts needed for revision.'}\n\n## Quick Review\n\n> Focus on the definitions, functions, and examples that appear in the original material.\n\n**Keywords:** ${functions.join(', ') || topic}`;
}

async function requestNotes(material) {
  const prompt = buildNotesPrompt(material);
  if (USE_MOCK_MODE) { await new Promise((resolve) => setTimeout(resolve, 850)); return createMockMarkdown(material); }
  // Connect a secure backend here. Never put a provider API key in this file.
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material, prompt }) });
  if (!response.ok) throw new Error('Notes API request failed');
  const result = await response.json();
  if (typeof result.markdown !== 'string' || !result.markdown.trim()) throw new Error('Invalid Markdown response');
  return result.markdown;
}

async function generateNotes() {
  const material = materialInput.value.trim(); hideStatus();
  if (!material) { showStatus('Please enter some study material first.', 'error'); materialInput.focus(); return; }
  if (material.length > 20000) { showStatus('This material is very long. Please shorten it to 20,000 characters or fewer.', 'error'); return; }
  if (typeof marked === 'undefined' || typeof marked.parse !== 'function') { showStatus('Unable to render the notes right now. Please try again.', 'error'); return; }
  generateButton.disabled = true; generateButton.innerHTML = '<span aria-hidden="true">✦</span> Generating notes<span class="loading-dots"></span>'; notesState.textContent = 'CREATING';
  try {
    const markdown = await requestNotes(material);
    notesOutput.innerHTML = `<article class="notes-markdown">${marked.parse(markdown)}</article>`;
    notesActions.hidden = false; notesState.textContent = 'READY'; notesState.classList.add('ready'); notesOutput.dataset.markdown = markdown; showStatus('Your revision notes are ready.', 'success');
  } catch (error) { showStatus('Something went wrong while generating your notes. Please try again.', 'error'); console.error('Notes generation failed:', error); }
  finally { generateButton.disabled = false; generateButton.innerHTML = '<span aria-hidden="true">✦</span> Generate Notes'; }
}

function clearNotes() { materialInput.value = ''; updateCharacterCount(); notesOutput.innerHTML = '<div class="empty-state"><div class="empty-icon" aria-hidden="true">✎</div><h3>Your notes will appear here</h3><p>Paste your study material and let AI turn it into revision-friendly notes.</p></div>'; notesOutput.dataset.markdown = ''; notesActions.hidden = true; notesState.textContent = 'WAITING'; notesState.classList.remove('ready'); hideStatus(); }

async function copyNotes() {
  const markdown = notesOutput.dataset.markdown; if (!markdown) return;
  try { await navigator.clipboard.writeText(markdown); const original = copyButton.textContent; copyButton.textContent = '✓ Copied!'; window.setTimeout(() => { copyButton.textContent = original; }, 1500); }
  catch (error) { showStatus('Unable to copy the notes. Please try again.', 'error'); console.error('Copy failed:', error); }
}

function downloadText() { const markdown = notesOutput.dataset.markdown; if (!markdown) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' })); link.download = 'AI-Notes.txt'; link.click(); URL.revokeObjectURL(link.href); }

materialInput.addEventListener('input', updateCharacterCount); generateButton.addEventListener('click', generateNotes); exampleButton.addEventListener('click', () => { materialInput.value = exampleMaterial; updateCharacterCount(); materialInput.focus(); hideStatus(); }); clearButton.addEventListener('click', clearNotes); copyButton.addEventListener('click', copyNotes); downloadTextButton.addEventListener('click', downloadText); printButton.addEventListener('click', () => window.print()); updateCharacterCount();
