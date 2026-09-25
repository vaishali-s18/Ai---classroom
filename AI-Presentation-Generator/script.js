const API_URL = '/api/generate-presentation';
const USE_MOCK_MODE = true;

const form = document.querySelector('#presentation-form');
const topicInput = document.querySelector('#topic');
const instructionsInput = document.querySelector('#instructions');
const generateButton = document.querySelector('#generate-button');
const clearButton = document.querySelector('#clear-button');
const regenerateButton = document.querySelector('#regenerate-button');
const exportButton = document.querySelector('#export-button');
const slideStage = document.querySelector('#slide-stage');
const viewerControls = document.querySelector('#viewer-controls');
const previousButton = document.querySelector('#previous-button');
const nextButton = document.querySelector('#next-button');
const slideNumber = document.querySelector('#slide-number');
const slideDots = document.querySelector('#slide-dots');
const deckMeta = document.querySelector('#deck-meta');
const deckTitle = document.querySelector('#deck-title');
const deckCount = document.querySelector('#deck-count');
const statusMessage = document.querySelector('#status-message');

let presentation = null;
let currentSlide = 0;
let generationNumber = 0;

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
  statusMessage.textContent = '';
}

function selectedSlideCount() {
  return Number(new FormData(form).get('slideCount') || 6);
}

function buildPresentationPrompt(topic, instructions, slideCount) {
  return `You are an expert teacher, subject-matter expert, and professional presentation content creator.

The user wants to learn about the following topic:

TOPIC:
${topic}

Additional context provided by the user:
${instructions || 'None provided.'}

Create an educational presentation that actually teaches this topic. First understand its meaning and domain, then determine the important knowledge a student should learn. Create exactly ${slideCount} slides with a dynamically chosen structure; do not force a fixed structure.

Every bullet must contain actual, useful information about the topic: a definition, concept, component, mechanism, process, example, application, benefit, limitation, comparison, or other relevant knowledge. Each bullet should normally be one or two complete, concise sentences.

Do not describe the presentation, slides, or the fact that the user entered a topic. Do not repeat the topic name as filler. Do not use generic or placeholder statements. Never write meta statements such as "This presentation focuses on", "This deck introduces", "The topic is best understood through", "Important information about the topic includes", "Examples involving the topic show", "This presentation provides an overview", "The goal is to understand", or "These concepts provide a basis".

If additional context is provided, treat it as the primary source for project-specific facts. Do not invent features or contradict that context.

Return ONLY valid JSON:

{
  "title": "Meaningful Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Meaningful Topic-Specific Title",
      "bullets": [
        "Actual information that teaches something about the topic.",
        "Actual information that teaches something about the topic.",
        "Actual information that teaches something about the topic.",
        "Actual information that teaches something about the topic."
      ]
    }
  ]
}

Do not return Markdown, a code fence, or explanations outside the JSON object.`;
}

function createMockPresentation(topic, instructions, slideCount) {
  const subject = topic.trim();
  const userContext = instructions.split(/\n\s*The previous response contained generic or meta content instead of actual information about the topic\./i)[0];
  const contextFacts = userContext.split(/\n+|(?<=[.!?])\s+/).map((fact) => fact.trim()).filter((fact) => fact.length > 24);
  if (contextFacts.length < 3) throw new Error('quality');
  const facts = contextFacts;
  const sectionNames = ['Core concepts', 'How it works', 'Components and process', 'Applications and examples', 'Benefits and limitations', 'Further considerations', 'Key facts', 'Practical context'];
  const outlines = Array.from({ length: slideCount }, (_, slideIndex) => {
    const start = (slideIndex * 3) % facts.length;
    const bullets = [0, 1, 2].map((offset) => facts[(start + offset) % facts.length]);
    return [`${subject}: ${sectionNames[slideIndex % sectionNames.length]}`, bullets];
  });
  return { title: subject, topic: subject, slides: outlines.slice(0, slideCount).map(([title, bullets], index) => ({ slideNumber: index + 1, title, bullets })) };
}

async function requestPresentation(topic, instructions, slideCount) {
  const prompt = buildPresentationPrompt(topic, instructions, slideCount);
  if (USE_MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    generationNumber += 1;
    let mock;
    try {
      mock = createMockPresentation(topic, instructions, slideCount);
    } catch (error) {
      throw new Error('quality');
    }
    if (generationNumber % 2 === 0) {
      mock.slides.reverse();
      mock.slides.forEach((slide, index) => { slide.slideNumber = index + 1; });
    }
    return JSON.stringify(mock);
  }
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, instructions, slideCount, prompt }) });
  if (!response.ok) throw new Error(response.status >= 500 ? 'network' : 'ai');
  const result = await response.json();
  return typeof result === 'string' ? result : JSON.stringify(result);
}

function parseAndValidatePresentation(response, expectedCount, expectedTopic) {
  let parsed;
  try {
    parsed = typeof response === 'string' ? JSON.parse(response.replace(/^```json\s*|\s*```$/g, '')) : response;
  } catch (error) {
    throw new Error('invalid-json');
  }
  if (!parsed || typeof parsed.title !== 'string' || !Array.isArray(parsed.slides) || parsed.slides.length !== expectedCount) throw new Error('invalid-format');
  const validSlides = parsed.slides.every((slide, index) => slide && slide.slideNumber === index + 1 && typeof slide.title === 'string' && Array.isArray(slide.bullets) && slide.bullets.length >= 3 && slide.bullets.length <= 4 && slide.bullets.every((bullet) => typeof bullet === 'string' && bullet.trim()));
  if (!validSlides) throw new Error('invalid-format');
  const bullets = parsed.slides.flatMap((slide) => slide.bullets);
  const genericBulletPattern = /^(?:this presentation focuses on the topic|this presentation provides an overview of the topic|this deck introduces the main ideas|the presentation discusses the topic and its applications|the topic contains several important concepts|the topic is the subject of this presentation|the topic is best understood through its definition, components, process, and applications|important information about the topic includes its components, behavior, uses, and the conditions that affect its results|examples involving the topic show how its principles or features operate in a practical situation|these concepts provide a basis for asking more precise questions about the topic|the previous response contained generic or meta content instead of actual information about the topic|regenerate with only direct, factual information that teaches the topic)[.!]?$/i;
  if (bullets.some((bullet) => genericBulletPattern.test(bullet.trim()))) throw new Error('invalid-content');
  if (!expectedTopic.trim()) throw new Error('invalid-content');
  return { title: parsed.title.trim(), topic: expectedTopic.trim(), slides: parsed.slides.map((slide) => ({ slideNumber: slide.slideNumber, title: slide.title.trim(), bullets: slide.bullets.map((bullet) => bullet.trim()) })) };
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function renderPresentation() {
  deckTitle.textContent = presentation.title;
  deckCount.textContent = `${presentation.slides.length} slides`;
  deckMeta.hidden = false;
  viewerControls.hidden = false;
  regenerateButton.disabled = false;
  exportButton.disabled = false;
  slideDots.innerHTML = presentation.slides.map((_, index) => `<button class="slide-dot" type="button" aria-label="Go to slide ${index + 1}" data-slide="${index}"></button>`).join('');
  slideDots.querySelectorAll('.slide-dot').forEach((dot) => dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide))));
  showSlide(0);
}

function showSlide(index) {
  if (!presentation) return;
  currentSlide = Math.max(0, Math.min(index, presentation.slides.length - 1));
  const slide = presentation.slides[currentSlide];
  slideStage.classList.remove('slide-enter');
  void slideStage.offsetWidth;
  slideStage.classList.add('slide-enter');
  slideStage.innerHTML = `<article class="presentation-slide"><div class="slide-label">${String(currentSlide + 1).padStart(2, '0')} / ${String(presentation.slides.length).padStart(2, '0')}</div><div class="slide-content"><p class="slide-overline">${escapeHtml(presentation.title)}</p><h3>${escapeHtml(slide.title)}</h3><ul>${slide.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></div><div class="slide-footer"><span>AI CLASSROOM</span><span>${escapeHtml(presentation.title)}</span></div></article>`;
  slideNumber.textContent = `${currentSlide + 1} / ${presentation.slides.length}`;
  previousButton.disabled = currentSlide === 0;
  nextButton.disabled = currentSlide === presentation.slides.length - 1;
  slideDots.querySelectorAll('.slide-dot').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === currentSlide));
}

async function generatePresentation() {
  const topic = topicInput.value.trim();
  const instructions = instructionsInput.value.trim();
  const slideCount = selectedSlideCount();
  hideStatus();
  if (!topic) { showStatus('Please enter a topic to generate your presentation.', 'error'); topicInput.focus(); return; }
  generateButton.disabled = true;
  regenerateButton.disabled = true;
  generateButton.innerHTML = '<span aria-hidden="true">✦</span> Creating your presentation<span class="loading-dots"></span>';
  try {
    let lastQualityError = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const retryContext = attempt === 0 ? instructions : `${instructions}\n\nThe previous response contained generic or meta content instead of actual information about the topic. Regenerate with only direct, factual information that teaches the topic. Do not repeat the topic name as filler and do not discuss the presentation itself. Return only valid JSON.`.trim();
      try {
        const response = await requestPresentation(topic, retryContext, slideCount);
        presentation = parseAndValidatePresentation(response, slideCount, topic);
        lastQualityError = false;
        break;
      } catch (error) {
        if (error.message !== 'invalid-content' && error.message !== 'quality') throw error;
        lastQualityError = true;
      }
    }
    if (lastQualityError || !presentation) {
      throw new Error('quality');
    }
    renderPresentation();
    showStatus('Your presentation is ready.', 'success');
  } catch (error) {
    const message = error.message === 'quality' ? 'Unable to generate high-quality topic-specific content. Please try generating again or provide additional context.' : error.message === 'invalid-json' || error.message === 'invalid-format' || error.message === 'invalid-content' ? 'The AI returned an invalid presentation format. Please regenerate.' : error.message === 'network' ? 'Unable to connect to the AI service. Please check your connection.' : 'Unable to generate the presentation. Please try again.';
    showStatus(message, 'error');
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<span aria-hidden="true">✦</span> Generate Presentation';
    regenerateButton.disabled = !presentation;
  }
}

async function regeneratePresentation() {
  if (!topicInput.value.trim()) return;
  await generatePresentation();
}

function clearPresentation() {
  form.reset();
  presentation = null;
  currentSlide = 0;
  deckMeta.hidden = true;
  viewerControls.hidden = true;
  regenerateButton.disabled = true;
  exportButton.disabled = true;
  slideStage.innerHTML = '<div class="empty-state"><div class="empty-icon" aria-hidden="true">▧</div><h3>Your presentation will appear here.</h3><p>Enter a topic and let AI create your slide deck.</p></div>';
  hideStatus();
  document.querySelector('.slide-option.selected')?.classList.remove('selected');
  document.querySelector('input[name="slideCount"][value="6"]').checked = true;
  document.querySelector('input[name="slideCount"][value="6"]').closest('.slide-option').classList.add('selected');
}

async function exportPptx() {
  if (!presentation || typeof window.PptxGenJS !== 'function') { showStatus('PPTX export is unavailable right now. Please try again.', 'error'); return; }
  exportButton.disabled = true;
  exportButton.innerHTML = '<span aria-hidden="true">⏳</span> Preparing PPTX...';
  try {
    const pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'AI Presentation Generator';
    pptx.subject = presentation.title;
    pptx.title = presentation.title;
    pptx.company = 'AI Classroom';
    presentation.slides.forEach((slide, index) => {
      const pptSlide = pptx.addSlide();
      pptSlide.background = { color: index === 0 ? 'E9F1FF' : 'F8FAFD' };
      pptSlide.addText(presentation.title, { x: 0.7, y: 0.45, w: 11.9, h: 0.3, fontFace: 'Aptos', fontSize: 10, color: '3972C5', bold: true, charSpacing: 1.4, margin: 0 });
      pptSlide.addText(slide.title, { x: 0.7, y: 1.18, w: 11.7, h: 0.75, fontFace: 'Aptos Display', fontSize: 29, color: '14233B', bold: true, margin: 0, breakLine: false });
      pptSlide.addText(slide.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 19 }, hanging: 4 } })), { x: 0.9, y: 2.35, w: 10.7, h: 2.8, fontFace: 'Aptos', fontSize: 19, color: '33435A', breakLine: true, paraSpaceAfterPt: 16, valign: 'mid', margin: 0.04, fit: 'shrink' });
      pptSlide.addText(`${index + 1} / ${presentation.slides.length}`, { x: 10.8, y: 6.85, w: 1.8, h: 0.25, fontFace: 'Aptos', fontSize: 10, color: '74839A', align: 'right', margin: 0 });
    });
    await pptx.writeFile({ fileName: 'AI-Presentation.pptx' });
    showStatus('Your PowerPoint deck is ready to download.', 'success');
  } catch (error) {
    showStatus('Unable to create the PowerPoint file. Please try again.', 'error');
    console.error('PPTX export failed:', error);
  } finally {
    exportButton.disabled = false;
    exportButton.innerHTML = '<span aria-hidden="true">↓</span> Download PPTX';
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); generatePresentation(); });
regenerateButton.addEventListener('click', regeneratePresentation);
clearButton.addEventListener('click', clearPresentation);
previousButton.addEventListener('click', () => showSlide(currentSlide - 1));
nextButton.addEventListener('click', () => showSlide(currentSlide + 1));
exportButton.addEventListener('click', exportPptx);
document.querySelectorAll('input[name="slideCount"]').forEach((input) => input.addEventListener('change', () => { document.querySelectorAll('.slide-option').forEach((option) => option.classList.toggle('selected', option.contains(input) && input.checked)); }));
document.addEventListener('keydown', (event) => { if (!presentation || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return; if (event.key === 'ArrowLeft') showSlide(currentSlide - 1); if (event.key === 'ArrowRight') showSlide(currentSlide + 1); });
