const API_URL = '/api/generate-quiz';
let mode = 'demo';
let quiz = null;
let currentQuestion = 0;
let answers = [];

const form = document.querySelector('#quiz-form');
const topicInput = document.querySelector('#topic-input');
const inputCount = document.querySelector('#input-count');
const generateButton = document.querySelector('#generate-button');
const exampleButton = document.querySelector('#example-button');
const clearButton = document.querySelector('#clear-button');
const statusMessage = document.querySelector('#status-message');
const setupView = document.querySelector('#setup-view');
const quizView = document.querySelector('#quiz-view');
const resultsView = document.querySelector('#results-view');
const questionText = document.querySelector('#question-text');
const questionKind = document.querySelector('#question-kind');
const difficultyLabel = document.querySelector('#difficulty-label');
const answerOptions = document.querySelector('#answer-options');
const answerHint = document.querySelector('#answer-hint');
const progressLabel = document.querySelector('#progress-label');
const progressPercent = document.querySelector('#progress-percent');
const progressBar = document.querySelector('#progress-bar');
const previousButton = document.querySelector('#previous-button');
const nextButton = document.querySelector('#next-button');
const submitButton = document.querySelector('#submit-button');
const quitButton = document.querySelector('#quit-button');
const newQuizButton = document.querySelector('#new-quiz-button');
const modeBadge = document.querySelector('#mode-badge');

const exampleMaterial = 'Java OOP concepts include classes, objects, inheritance, polymorphism, abstraction and encapsulation. A class defines the data and behavior of objects. Inheritance allows a child class to reuse or extend a parent class. Encapsulation protects object state through controlled access. Polymorphism allows one interface to represent different implementations. Abstraction exposes essential behavior while hiding implementation details.';

function showStatus(message, type) { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`; statusMessage.hidden = false; }
function hideStatus() { statusMessage.hidden = true; statusMessage.textContent = ''; }
function updateCount() { inputCount.textContent = `${topicInput.value.length.toLocaleString()} characters`; }
function selectedValue(id) { return document.querySelector(`#${id}`).value; }

function buildQuizPrompt(topic, numberOfQuestions, difficulty, questionType) {
  return `You are an expert educational assessment designer. Generate a quiz from the user's actual topic or study material below.\n\nTopic or study material:\n${topic}\n\nRequirements:\n- Generate exactly ${numberOfQuestions} questions.\n- Difficulty: ${difficulty}.\n- Question type: ${questionType}.\n- Every question and answer must be directly based on the supplied material or clearly relevant knowledge about the topic.\n- Return valid JSON only.\n\nExpected shape:\n{"title":"Quiz title","questions":[{"question":"Question text","type":"mcq or true-false","options":["A","B","C","D"],"correctAnswer":0,"explanation":"Short explanation"}]}`;
}

function splitFacts(topic) {
  return topic
    .split(/\n+|(?<=[.!?])\s+|;\s+|,\s+(?=[A-Za-z])|\s+and\s+/i)
    .map((fact) => fact.trim().replace(/^[-*]\s*/, ''))
    .filter((fact) => fact.length > 12)
    .slice(0, 12);
}

function makeDistractors(fact, index) {
  const claim = `${fact.charAt(0).toLowerCase()}${fact.slice(1).replace(/[.!?]$/, '')}`;
  return [
    `The source does not state that ${claim}.`,
    `The material gives a different account and does not support the claim that ${claim}.`,
    `No evidence for this statement appears in the supplied material: ${fact}`
  ];
}

function createDemoQuiz(topic, numberOfQuestions, difficulty, questionType) {
  const facts = splitFacts(topic);
  if (!facts.length) throw new Error('demo-context');

  const questions = Array.from({ length: numberOfQuestions }, (_, index) => {
    const fact = facts[index % facts.length];
    const useTrueFalse = questionType === 'true-false' || (questionType === 'mixed' && index % 2 === 1);

    if (useTrueFalse) {
      const statement = index % 2 === 0
        ? `The source material supports the idea that: ${fact}`
        : `The source material does not support the claim that: ${fact}`;

      return {
        question: `True or False: ${statement}`,
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: index % 2 === 0 ? 0 : 1,
        explanation: `The material supports ${index % 2 === 0 ? 'this idea' : 'a different idea'} because it is grounded in the source content.`
      };
    }

    const correctAnswerText = fact;
    const incorrectOptions = makeDistractors(fact, index);
    const options = [correctAnswerText, ...incorrectOptions].slice(0, 4);
    const correctIndex = 0;

    return {
      question: `Which statement is best supported by the study material?`,
      type: 'mcq',
      options,
      correctAnswer: correctIndex,
      explanation: `The correct answer matches the source material most closely: ${fact}`,
      sourceFact: fact,
      difficulty
    };
  });

  return { title: `${topic.trim().slice(0, 48) || 'Study'} Quiz`, questions };
}

async function requestQuiz(topic, numberOfQuestions, difficulty, questionType) {
  const prompt = buildQuizPrompt(topic, numberOfQuestions, difficulty, questionType);
  if (mode === 'demo') {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return createDemoQuiz(topic, numberOfQuestions, difficulty, questionType);
  }
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, numberOfQuestions, difficulty, questionType, prompt }) });
  if (!response.ok) throw new Error('api');
  return response.json();
}

function validateQuiz(data, expectedCount, questionType) {
  if (!data || typeof data.title !== 'string' || !Array.isArray(data.questions) || data.questions.length !== expectedCount) throw new Error('invalid');
  const valid = data.questions.every((item) => {
    const type = item.type || (item.options?.length === 2 ? 'true-false' : 'mcq');
    const correctType = questionType === 'mixed' || type === questionType;
    return typeof item.question === 'string' && item.question.trim() && correctType && Array.isArray(item.options) && (type === 'true-false' ? item.options.length === 2 : item.options.length === 4) && Number.isInteger(item.correctAnswer) && item.correctAnswer >= 0 && item.correctAnswer < item.options.length && item.options.every((option) => typeof option === 'string' && option.trim()) && typeof item.explanation === 'string' && item.explanation.trim();
  });
  if (!valid) throw new Error('invalid');
  return { title: data.title.trim(), questions: data.questions.map((item) => ({ ...item, type: item.type || (item.options.length === 2 ? 'true-false' : 'mcq') })) };
}

function renderQuestion() {
  const item = quiz.questions[currentQuestion];
  const total = quiz.questions.length;
  const selected = answers[currentQuestion];
  const percent = Math.round(((currentQuestion + 1) / total) * 100);
  progressLabel.textContent = `Question ${currentQuestion + 1} of ${total}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  questionKind.textContent = item.type === 'true-false' ? 'TRUE / FALSE' : 'MULTIPLE CHOICE';
  difficultyLabel.textContent = selectedValue('difficulty').toUpperCase();
  questionText.textContent = item.question;
  answerOptions.innerHTML = item.options.map((option, index) => `<label class="answer-option${selected === index ? ' selected' : ''}"><input type="radio" name="answer" value="${index}" ${selected === index ? 'checked' : ''}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></label>`).join('');
  answerOptions.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => { answers[currentQuestion] = Number(input.value); renderQuestion(); }));
  answerHint.textContent = selected === undefined ? 'Choose one answer to continue.' : 'Answer saved. You can change it before submitting.';
  previousButton.disabled = currentQuestion === 0;
  nextButton.hidden = currentQuestion === total - 1;
  submitButton.hidden = currentQuestion !== total - 1;
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }
function showQuiz() { setupView.hidden = true; resultsView.hidden = true; quizView.hidden = false; renderQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function answerLabel(item, value) { return value === undefined ? 'Not answered' : item.options[value] || 'Unknown answer'; }
function showResults() {
  const correct = quiz.questions.reduce((total, item, index) => total + (answers[index] === item.correctAnswer ? 1 : 0), 0);
  const percentage = Math.round((correct / quiz.questions.length) * 100);
  document.querySelector('#score-value').textContent = `${correct}/${quiz.questions.length}`;
  document.querySelector('#correct-value').textContent = correct;
  document.querySelector('#incorrect-value').textContent = quiz.questions.length - correct;
  document.querySelector('#percentage-value').textContent = `${percentage}%`;
  document.querySelector('#performance-message').textContent = percentage >= 80 ? 'Strong recall. Keep going.' : percentage >= 60 ? 'Good foundation. Revisit the misses.' : 'Use the review to build your next pass.';
  document.querySelector('#review-count').textContent = `${quiz.questions.length} questions`;
  document.querySelector('#review-list').innerHTML = quiz.questions.map((item, index) => { const isCorrect = answers[index] === item.correctAnswer; return `<article class="review-card${isCorrect ? '' : ' incorrect'}"><div class="review-card-header"><h4>${index + 1}. ${escapeHtml(item.question)}</h4><span class="review-result">${isCorrect ? '✓ Correct' : '× Incorrect'}</span></div><p class="review-answer"><strong>Your answer:</strong> ${escapeHtml(answerLabel(item, answers[index]))}<br><strong>Correct answer:</strong> ${escapeHtml(answerLabel(item, item.correctAnswer))}</p><p class="review-explanation"><strong>Why:</strong> ${escapeHtml(item.explanation)}</p></article>`; }).join('');
  quizView.hidden = true; resultsView.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function generateQuiz(event) {
  event?.preventDefault();
  const topic = topicInput.value.trim();
  const numberOfQuestions = Number(selectedValue('question-count'));
  const difficulty = selectedValue('difficulty');
  const questionType = selectedValue('question-type');
  hideStatus();
  if (!topic) { showStatus('Please enter study material or a topic first.', 'error'); topicInput.focus(); return; }
  generateButton.disabled = true;
  generateButton.innerHTML = '<span aria-hidden="true">✦</span> Creating quiz<span class="loading-dots"></span>';
  try { quiz = validateQuiz(await requestQuiz(topic, numberOfQuestions, difficulty, questionType), numberOfQuestions, questionType); answers = []; currentQuestion = 0; showQuiz(); showStatus('Your quiz is ready.', 'success'); } catch (error) { showStatus(error.message === 'demo-context' ? 'Add a few factual sentences so Demo Mode can build questions from your material.' : mode === 'api' ? 'Unable to generate the quiz from the API. Please try again.' : 'Unable to generate the quiz. Please try again.', 'error'); } finally { generateButton.disabled = false; generateButton.innerHTML = '<span aria-hidden="true">✦</span> Generate Quiz'; }
}
function resetApp() { form.reset(); updateCount(); quiz = null; answers = []; currentQuestion = 0; quizView.hidden = true; resultsView.hidden = true; setupView.hidden = false; hideStatus(); }
function setMode(nextMode) { mode = nextMode; document.querySelectorAll('.mode-button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode)); modeBadge.textContent = `${mode.toUpperCase()} MODE`; if (mode === 'api') showStatus('API Mode is prepared for /api/generate-quiz. A backend is required before requests can run.', 'success'); else hideStatus(); }

topicInput.addEventListener('input', updateCount); form.addEventListener('submit', generateQuiz); exampleButton.addEventListener('click', () => { topicInput.value = exampleMaterial; updateCount(); topicInput.focus(); hideStatus(); }); clearButton.addEventListener('click', resetApp); previousButton.addEventListener('click', () => { currentQuestion -= 1; renderQuestion(); }); nextButton.addEventListener('click', () => { if (answers[currentQuestion] === undefined) { answerHint.textContent = 'Choose an answer before moving on.'; return; } currentQuestion += 1; renderQuestion(); }); submitButton.addEventListener('click', () => { if (answers[currentQuestion] === undefined) { answerHint.textContent = 'Choose an answer before submitting.'; return; } showResults(); }); quitButton.addEventListener('click', resetApp); newQuizButton.addEventListener('click', resetApp); document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode))); updateCount();
