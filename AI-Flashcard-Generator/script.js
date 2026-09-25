const API_URL = '/api/generate-flashcards';
let mode = 'demo';
let cards = [];
let currentCard = 0;
let studyMode = false;

const form = document.querySelector('#flashcard-form');
const topicInput = document.querySelector('#topic-input');
const inputCount = document.querySelector('#input-count');
const generateButton = document.querySelector('#generate-button');
const exampleButton = document.querySelector('#example-button');
const clearButton = document.querySelector('#clear-button');
const setupView = document.querySelector('#setup-view');
const studyView = document.querySelector('#study-view');
const completeView = document.querySelector('#complete-view');
const statusMessage = document.querySelector('#status-message');
const flashcard = document.querySelector('#flashcard');
const flashcardScene = document.querySelector('#flashcard-scene');
const cardQuestion = document.querySelector('#card-question');
const cardAnswer = document.querySelector('#card-answer');
const deckList = document.querySelector('#deck-list');
const deckCount = document.querySelector('#deck-count');
const progressLabel = document.querySelector('#progress-label');
const progressPercent = document.querySelector('#progress-percent');
const progressBar = document.querySelector('#progress-bar');
const previousButton = document.querySelector('#previous-button');
const nextButton = document.querySelector('#next-button');
const flipButton = document.querySelector('#flip-button');
const importantButton = document.querySelector('#important-button');
const knownButton = document.querySelector('#known-button');
const reviewButton = document.querySelector('#review-button');
const studyModeButton = document.querySelector('#study-mode-button');
const newDeckButton = document.querySelector('#new-deck-button');
const returnStudyButton = document.querySelector('#return-study-button');

const exampleMaterial = 'Java OOP concepts include classes, objects, inheritance, polymorphism, abstraction and encapsulation. A class defines data and behavior. An object is an instance of a class. Inheritance lets a child class reuse a parent class. Encapsulation protects object state. Polymorphism allows one interface to represent different implementations. Abstraction hides implementation details.';

function showStatus(message, type) { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`; statusMessage.hidden = false; }
function hideStatus() { statusMessage.hidden = true; statusMessage.textContent = ''; }
function updateCount() { inputCount.textContent = `${topicInput.value.length.toLocaleString()} characters`; }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }
function splitFacts(text) { return text.split(/\n+|(?<=[.!?])\s+|;\s+|,\s+(?=[A-Za-z])/).map((fact) => fact.trim().replace(/^[-*]\s*/, '')).filter((fact) => fact.length > 18); }
function topicLabel(text) { return text.trim().split(/\s+/).slice(0, 7).join(' '); }
function createDemoCards(topic, numberOfCards, difficulty) {
  const facts = splitFacts(topic);
  if (!facts.length) throw new Error('empty-material');
  const label = topicLabel(topic);
  return Array.from({ length: numberOfCards }, (_, index) => {
    const fact = facts[index % facts.length];
    const questionStyles = ['What is the key idea in this statement?', 'Why is this concept important?', 'How would you explain this idea to a classmate?', 'What should you remember about this concept?'];
    return { question: `${questionStyles[index % questionStyles.length]} (${label})`, answer: fact, difficulty, important: false, status: 'unseen', reviewed: false };
  });
}
async function requestCards(topic, numberOfCards, difficulty) {
  if (mode === 'demo') { await new Promise((resolve) => setTimeout(resolve, 700)); return { success: true, cards: createDemoCards(topic, numberOfCards, difficulty) }; }
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, numberOfCards, difficulty }) });
  if (!response.ok) throw new Error('api');
  return response.json();
}
function validateCards(data, expectedCount) { if (!data || data.success !== true || !Array.isArray(data.cards) || data.cards.length !== expectedCount) throw new Error('invalid'); const valid = data.cards.every((card) => card && typeof card.question === 'string' && card.question.trim() && typeof card.answer === 'string' && card.answer.trim()); if (!valid) throw new Error('invalid'); return data.cards.map((card) => ({ question: card.question.trim(), answer: card.answer.trim(), important: false, status: 'unseen', reviewed: false })); }
function isFlipped() { return flashcard.classList.contains('flipped'); }
function flipCard() { flashcard.classList.toggle('flipped'); }
function renderDeckList() { deckCount.textContent = cards.length; deckList.innerHTML = cards.map((card, index) => `<button class="deck-item${index === currentCard ? ' active' : ''}" data-card-index="${index}" type="button"><span class="deck-item-number">${String(index + 1).padStart(2, '0')}</span><span class="deck-item-question">${escapeHtml(card.question)}</span><span class="deck-status ${card.status}">${card.important ? '★ Important' : card.status === 'known' ? '✓ Known' : card.status === 'review' ? '↻ Review' : 'New'}</span></button>`).join(''); deckList.querySelectorAll('.deck-item').forEach((item) => item.addEventListener('click', () => { currentCard = Number(item.dataset.cardIndex); renderCard(); })); }
function renderCard() { const card = cards[currentCard]; const percent = Math.round(((currentCard + 1) / cards.length) * 100); flashcard.classList.remove('flipped'); cardQuestion.textContent = card.question; cardAnswer.textContent = card.answer; progressLabel.textContent = `Card ${currentCard + 1} of ${cards.length}`; progressPercent.textContent = `${percent}%`; progressBar.style.width = `${percent}%`; previousButton.disabled = currentCard === 0; nextButton.disabled = currentCard === cards.length - 1; importantButton.classList.toggle('active', card.important); importantButton.textContent = card.important ? '★ Important' : '☆ Mark as Important'; knownButton.classList.toggle('active', card.status === 'known'); reviewButton.classList.toggle('active', card.status === 'review'); renderDeckList(); }
function showStudy() { setupView.hidden = true; completeView.hidden = true; studyView.hidden = false; renderCard(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function setCardStatus(status) { cards[currentCard].status = status; cards[currentCard].reviewed = true; renderCard(); if (studyMode && currentCard < cards.length - 1) { window.setTimeout(() => { currentCard += 1; renderCard(); }, 180); } else if (studyMode) { window.setTimeout(completeStudy, 180); } }
function completeStudy() { const reviewed = cards.filter((card) => card.reviewed).length; const known = cards.filter((card) => card.status === 'known').length; const again = cards.filter((card) => card.status === 'review').length; document.querySelector('#reviewed-count').textContent = reviewed; document.querySelector('#known-count').textContent = known; document.querySelector('#again-count').textContent = again; studyView.hidden = true; completeView.hidden = false; }
async function generateFlashcards(event) { event?.preventDefault(); const topic = topicInput.value.trim(); const numberOfCards = Number(document.querySelector('#card-count').value); const difficulty = document.querySelector('#difficulty').value; hideStatus(); if (!topic) { showStatus('Please enter a topic or study material first.', 'error'); topicInput.focus(); return; } if (![5, 10, 15, 20].includes(numberOfCards)) { showStatus('Please choose a valid number of flashcards.', 'error'); return; } generateButton.disabled = true; generateButton.textContent = '🧠 Creating your flashcards...'; try { const data = await requestCards(topic, numberOfCards, difficulty); cards = validateCards(data, numberOfCards); currentCard = 0; studyMode = false; showStudy(); showStatus('Your flashcards are ready.', 'success'); } catch (error) { showStatus(error.message === 'api' ? 'Unable to generate flashcards from the API. Please try again.' : error.message === 'invalid' ? 'The AI returned an invalid flashcard format. Please try again.' : 'Please provide a little more study material so Demo Mode can create useful cards.', 'error'); } finally { generateButton.disabled = false; generateButton.textContent = '✦ Generate Flashcards'; } }
function resetApp() { cards = []; currentCard = 0; studyMode = false; form.reset(); updateCount(); setupView.hidden = false; studyView.hidden = true; completeView.hidden = true; hideStatus(); }
function setMode(nextMode) { mode = nextMode; document.querySelectorAll('.mode-button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode)); document.querySelector('#mode-badge').textContent = `${mode.toUpperCase()} MODE`; if (mode === 'api') showStatus('API Mode is prepared for /api/generate-flashcards. A secure backend is required before live responses can run.', 'success'); else hideStatus(); }
form.addEventListener('submit', generateFlashcards); topicInput.addEventListener('input', updateCount); exampleButton.addEventListener('click', () => { topicInput.value = exampleMaterial; updateCount(); topicInput.focus(); hideStatus(); }); clearButton.addEventListener('click', resetApp); newDeckButton.addEventListener('click', resetApp); returnStudyButton.addEventListener('click', () => { completeView.hidden = true; studyView.hidden = false; renderCard(); }); flashcard.addEventListener('click', flipCard); flashcardScene.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flipCard(); } }); flipButton.addEventListener('click', flipCard); previousButton.addEventListener('click', () => { currentCard -= 1; renderCard(); }); nextButton.addEventListener('click', () => { currentCard += 1; renderCard(); }); importantButton.addEventListener('click', () => { cards[currentCard].important = !cards[currentCard].important; renderCard(); }); knownButton.addEventListener('click', () => setCardStatus('known')); reviewButton.addEventListener('click', () => setCardStatus('review')); studyModeButton.addEventListener('click', () => { studyMode = !studyMode; studyModeButton.textContent = studyMode ? 'Exit Study Mode' : 'Study Mode'; cards.forEach((card) => { if (studyMode) card.status = 'unseen'; }); renderCard(); if (studyMode) showStatus('Study Mode: flip each card, then mark Known or Review Again.', 'success'); else hideStatus(); }); document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode))); updateCount();
