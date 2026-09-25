const API_URL = '/api/generate-resume';
const USE_MOCK_MODE = true;

const form = document.querySelector('#resume-form');
const preview = document.getElementById('resumePreview');
const generateButton = document.querySelector('#generate-button');
const clearButton = document.querySelector('#clear-button');
const printButton = document.querySelector('#print-button');
const downloadButton = document.querySelector('#download-button');
const sampleProfile = document.querySelector('#sample-profile');
const statusMessage = document.querySelector('#status-message');
const referenceFile = document.querySelector('#reference-file');
const uploadZone = document.querySelector('#upload-zone');
const referenceCard = document.querySelector('#reference-card');
const referenceName = document.querySelector('#reference-name');
const referenceMeta = document.querySelector('#reference-meta');
const analysisStatus = document.querySelector('#analysis-status');
const removeReference = document.querySelector('#remove-reference');

let referenceResume = null;

const profiles = {
  'computer-science': {
    fullName: 'Vaishali Bakshi', email: 'vaishali.bakshi@email.com', phone: '+91 98765 43210', location: 'Pune, India', linkedin: 'linkedin.com/in/vaishalibakshi', github: 'github.com/vaishalibakshi', degree: 'B.Tech in Computer Science', university: 'Pune Institute of Technology', graduation: '2026', grade: '8.7 CGPA', skills: 'Java, JavaScript, React, Node.js, MongoDB, Git', objective: 'Motivated Computer Science student seeking a software development internship where I can build thoughtful products, learn from an experienced team, and contribute to meaningful technical work.', experience: 'Company: BrightByte Labs\nRole: Software Development Intern\nDuration: May 2025 - July 2025\nResponsibilities: Built responsive React interfaces and integrated REST APIs for an internal learning platform.\nAchievements: Improved page load time by 20% through component and asset optimization.', projects: 'Project name: Campus Connect\nTechnologies: React, Node.js, MongoDB\nDescription: A student community platform that brings campus events and peer groups into one place.\nKey features: Real-time chat, event discovery, and role-based authentication.', certifications: 'AWS Cloud Practitioner\nJavaScript Algorithms and Data Structures - freeCodeCamp', achievements: 'Won first place at the 2025 campus hackathon\nTechnical lead for the university coding club'
  },
  'data-science': {
    fullName: 'Arjun Mehta', email: 'arjun.mehta@email.com', phone: '+91 99887 66554', location: 'Bengaluru, India', linkedin: 'linkedin.com/in/arjunmehta', github: 'github.com/arjunmehta', degree: 'B.Sc. in Data Science', university: 'Christ University', graduation: '2025', grade: '9.1 CGPA', skills: 'Python, SQL, Pandas, NumPy, Scikit-learn, Tableau', objective: 'Curious Data Science graduate eager to translate complex datasets into clear insights and practical decisions within a collaborative analytics team.', experience: 'Company: InsightWorks\nRole: Data Analytics Intern\nDuration: Jan 2025 - Apr 2025\nResponsibilities: Cleaned customer datasets, built exploratory analysis notebooks, and prepared weekly dashboards for stakeholders.\nAchievements: Identified a customer segment that informed a targeted retention experiment.', projects: 'Project name: Local Transit Demand Forecast\nTechnologies: Python, Pandas, Scikit-learn\nDescription: Forecasted daily transit demand using historical weather and ridership data.\nKey features: Feature engineering pipeline and model comparison dashboard.', certifications: 'Google Data Analytics Professional Certificate\nSQL for Data Science - Coursera', achievements: 'Presented research at the university data symposium\nMentored three students in Python fundamentals'
  },
  frontend: {
    fullName: 'Riya Sharma', email: 'riya.sharma@email.com', phone: '+91 91234 56789', location: 'New Delhi, India', linkedin: 'linkedin.com/in/riyasharma', github: 'github.com/riyasharma', degree: 'BCA in Computer Applications', university: 'Delhi University', graduation: '2024', grade: '86%', skills: 'HTML, CSS, JavaScript, React, Git, Figma', objective: 'Detail-oriented frontend developer who enjoys turning thoughtful designs into fast, accessible interfaces that feel natural to use.', experience: 'Company: Studio North\nRole: Junior Frontend Developer\nDuration: Aug 2024 - Present\nResponsibilities: Developed reusable UI components and collaborated with designers to ship responsive marketing and dashboard experiences.\nAchievements: Helped reduce UI defects by introducing a shared component checklist and visual QA process.', projects: 'Project name: Artisan Marketplace\nTechnologies: HTML, CSS, JavaScript\nDescription: A responsive marketplace for independent makers to showcase and sell their work.\nKey features: Product filtering, accessible checkout flow, and responsive gallery.', certifications: 'Meta Front-End Developer Certificate', achievements: 'Built and shipped a volunteer website for a local arts collective\nSpeaker at a beginner-friendly web development meetup'
  }
};

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
  statusMessage.textContent = '';
}

function validate(data) {
  const required = ['fullName', 'email', 'degree', 'university', 'skills', 'objective'];
  return required.every((field) => data[field] && data[field].trim());
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function analyzeReferenceResume(file) {
  const extension = file.name.split('.').pop().toUpperCase();
  return {
    fileName: file.name,
    fileType: extension,
    sectionOrder: 'Name and contact, professional summary, education, skills, experience, projects, certifications, achievements',
    headingStyle: 'Clear, concise section headings with consistent hierarchy',
    contentOrganization: 'Compact entries with dates, supporting details, and concise bullet points',
    professionalTone: 'Polished, direct, and ATS-friendly',
    note: `Reference uploaded as ${extension}. Its personal content is used only as a style reference.`
  };
}

function setReference(file) {
  const supported = /\.(pdf|doc|docx|jpe?g|png)$/i.test(file.name);
  if (!supported || file.size > 10 * 1024 * 1024) {
    showStatus('Please upload a supported resume file under 10 MB.', 'error');
    return;
  }
  referenceResume = analyzeReferenceResume(file);
  referenceName.textContent = file.name;
  referenceMeta.textContent = `${referenceResume.fileType} · ${formatFileSize(file.size)}`;
  analysisStatus.textContent = 'Structure ready for AI';
  referenceCard.hidden = false;
  uploadZone.classList.add('has-file');
  hideStatus();
}

function clearReference() {
  referenceResume = null;
  referenceFile.value = '';
  referenceCard.hidden = true;
  uploadZone.classList.remove('has-file');
  hideStatus();
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function splitLines(value = '') {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function makeBullets(text) {
  return splitLines(text).filter((line) => !/^(company|role|duration|project name|technologies|description|key features):/i.test(line)).map((line) => `<li>${escapeHtml(line.replace(/^[*-]\s*/, ''))}</li>`).join('');
}

function makeExperience(text) {
  if (!text.trim()) return '';
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block) => {
    const lines = splitLines(block);
    const company = lines.find((line) => /^company:/i.test(line))?.replace(/^company:\s*/i, '') || 'Professional experience';
    const role = lines.find((line) => /^role:/i.test(line))?.replace(/^role:\s*/i, '') || '';
    const duration = lines.find((line) => /^duration:/i.test(line))?.replace(/^duration:\s*/i, '') || '';
    const bullets = makeBullets(block);
    return `<div class="resume-item"><div class="item-heading"><span>${escapeHtml(role)}</span><span>${escapeHtml(duration)}</span></div><div class="item-subheading">${escapeHtml(company)}</div>${bullets ? `<ul>${bullets}</ul>` : ''}</div>`;
  }).join('');
}

function makeProjects(text) {
  if (!text.trim()) return '';
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block) => {
    const lines = splitLines(block);
    const name = lines.find((line) => /^project name:/i.test(line))?.replace(/^project name:\s*/i, '') || 'Project';
    const tech = lines.find((line) => /^technologies:/i.test(line))?.replace(/^technologies:\s*/i, '') || '';
    const description = lines.find((line) => /^description:/i.test(line))?.replace(/^description:\s*/i, '') || '';
    const features = lines.find((line) => /^key features:/i.test(line))?.replace(/^key features:\s*/i, '') || '';
    return `<div class="resume-item"><div class="item-heading"><span>${escapeHtml(name)}</span></div>${tech ? `<div class="item-subheading">${escapeHtml(tech)}</div>` : ''}${description || features ? `<p>${escapeHtml([description, features].filter(Boolean).join(' '))}</p>` : ''}</div>`;
  }).join('');
}

function makeList(text) {
  const items = splitLines(text);
  return items.length ? `<ul class="resume-list">${items.map((item) => `<li>${escapeHtml(item.replace(/^[*-]\s*/, ''))}</li>`).join('')}</ul>` : '';
}

function section(title, body) {
  return body ? `<section class="resume-section"><h2>${title}</h2>${body}</section>` : '';
}

function renderResume(data) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).map(escapeHtml);
  const skills = data.skills.split(',').map((skill) => skill.trim()).filter(Boolean).map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join('');
  const education = `<div class="resume-item"><div class="item-heading"><span>${escapeHtml(data.degree)}</span><span>${escapeHtml(data.graduation)}</span></div><div class="item-subheading">${escapeHtml(data.university)}${data.grade ? ` · ${escapeHtml(data.grade)}` : ''}</div></div>`;
  const roleHint = data.experience ? 'Student & aspiring professional' : 'Student & aspiring professional';
  preview.innerHTML = `<article class="resume-content"><header class="resume-header"><h1>${escapeHtml(data.fullName)}</h1><div class="resume-role">${roleHint}</div><div class="contact-line">${contact.map((item) => `<span>${item}</span>`).join('')}</div></header>${section('Professional summary', `<p>${escapeHtml(data.objective)}</p>`)}${section('Education', education)}${section('Skills', `<div class="skill-list">${skills}</div>`)}${section('Experience', makeExperience(data.experience))}${section('Projects', makeProjects(data.projects))}${section('Certifications', makeList(data.certifications))}${section('Achievements', makeList(data.achievements))}</article>`;
  printButton.disabled = false;
  downloadButton.disabled = false;
}

async function downloadResumePDF() {
  const resumeElement = document.getElementById('resumePreview');
  if (!resumeElement.querySelector('.resume-content')) {
    showStatus('Please generate your resume first.', 'error');
    return;
  }
  if (!window.html2canvas || !window.jspdf) {
    showStatus('Unable to create the PDF. Please try again.', 'error');
    console.error('PDF libraries are not loaded.', { html2canvas: window.html2canvas, jspdf: window.jspdf });
    return;
  }

  const originalLabel = downloadButton.innerHTML;
  downloadButton.disabled = true;
  downloadButton.innerHTML = '<span aria-hidden="true">⏳</span> Creating PDF...';
  try {
    const originalStyles = { background: resumeElement.style.background, boxShadow: resumeElement.style.boxShadow };
    resumeElement.style.background = '#ffffff';
    resumeElement.style.boxShadow = 'none';
    const canvas = await window.html2canvas(resumeElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    resumeElement.style.background = originalStyles.background;
    resumeElement.style.boxShadow = originalStyles.boxShadow;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const margin = 10;
    const pageWidth = 210 - (margin * 2);
    const pageHeight = 297 - (margin * 2);
    const pageHeightPixels = Math.floor(canvas.width * pageHeight / pageWidth);
    let offset = 0;
    let pageNumber = 0;
    while (offset < canvas.height) {
      const sliceHeight = Math.min(pageHeightPixels, canvas.height - offset);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      pageCanvas.getContext('2d').drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (pageNumber > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, pageWidth, sliceHeight * pageWidth / canvas.width, undefined, 'FAST');
      offset += sliceHeight;
      pageNumber += 1;
    }
    pdf.save('AI-Generated-Resume.pdf');
    downloadButton.innerHTML = '<span aria-hidden="true">✓</span> PDF Downloaded';
    showStatus('Your PDF is ready to download.', 'success');
    window.setTimeout(() => { downloadButton.innerHTML = originalLabel; downloadButton.disabled = false; }, 1600);
  } catch (error) {
    downloadButton.innerHTML = originalLabel;
    downloadButton.disabled = false;
    showStatus('Unable to create the PDF. Please try again.', 'error');
    console.error('Resume PDF generation failed:', error);
  }
}

function buildPrompt(data, reference) {
  return `You are an expert professional resume writer and resume formatting assistant.\n\nCreate a professional resume for the NEW USER using only the user's information below.\n\nThe uploaded reference resume is ONLY a style and structure reference. Analyze its section order, heading hierarchy, formatting approach, content organization, professional tone, and approximate content density. Follow that structure as closely as reasonably possible.\n\nNever copy the reference person's name, contact information, education, companies, roles, projects, skills, achievements, dates, or any other personal information. Never invent missing user information. Improve grammar while preserving the user's actual facts. Return structured content suitable for webpage rendering and PDF export.\n\nREFERENCE RESUME ANALYSIS:\nFile: ${reference.fileName}\nSection order: ${reference.sectionOrder}\nHeading style: ${reference.headingStyle}\nContent organization: ${reference.contentOrganization}\nProfessional tone: ${reference.professionalTone}\n\nNEW USER INFORMATION:\n\nName:\n${data.fullName}\n\nContact:\n${[data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join(', ')}\n\nEducation:\n${[data.degree, data.university, data.graduation, data.grade].filter(Boolean).join(', ')}\n\nSkills:\n${data.skills}\n\nExperience:\n${data.experience}\n\nObjective:\n${data.objective}\n\nProjects:\n${data.projects}\n\nCertifications:\n${data.certifications}\n\nAchievements:\n${data.achievements}`;
}

async function requestResume(data) {
  const prompt = buildPrompt(data, referenceResume);
  if (USE_MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 850));
    return { ...data, generatedPrompt: prompt };
  }
  // Connect your secure backend here. Keep provider keys on the server, never in this file.
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, prompt, reference: referenceResume }) });
  if (!response.ok) throw new Error('API request failed');
  return response.json();
}

async function generateResume() {
  const data = getFormData();
  hideStatus();
  if (!referenceResume) {
    showStatus('Please upload a sample resume first.', 'error');
    referenceFile.focus();
    return;
  }
  if (!validate(data)) {
    showStatus('Please complete the required information.', 'error');
    form.querySelector(':invalid')?.focus();
    return;
  }
  generateButton.disabled = true;
  generateButton.innerHTML = '<span class="button-icon" aria-hidden="true">✦</span> Creating your resume based on your sample<span class="loading-dots"></span>';
  try {
    const generatedData = await requestResume(data);
    renderResume(generatedData);
    showStatus('Your resume is ready to review and print.', 'success');
  } catch (error) {
    showStatus('Unable to generate the resume right now. Please try again.', 'error');
    console.error(error);
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<span class="button-icon" aria-hidden="true">✦</span> Generate resume';
  }
}

function loadProfile(profileName) {
  const profile = profiles[profileName];
  if (!profile) return;
  Object.entries(profile).forEach(([key, value]) => { const field = form.elements[key]; if (field) field.value = value; });
  hideStatus();
  showStatus('Sample profile loaded. Review the details, then generate your resume.', 'success');
}

form.addEventListener('submit', (event) => { event.preventDefault(); generateResume(); });
clearButton.addEventListener('click', () => { form.reset(); clearReference(); preview.innerHTML = '<div class="empty-preview"><div class="empty-icon" aria-hidden="true">✦</div><h3>Your resume will appear here</h3><p>Upload a sample, then add your details to see your professional story take shape.</p></div>'; printButton.disabled = true; downloadButton.disabled = true; });
sampleProfile.addEventListener('change', (event) => loadProfile(event.target.value));
printButton.addEventListener('click', () => window.print());
downloadButton.addEventListener('click', downloadResumePDF);
referenceFile.addEventListener('change', (event) => { if (event.target.files[0]) setReference(event.target.files[0]); });
removeReference.addEventListener('click', clearReference);
['dragenter', 'dragover'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.remove('dragging'); }));
uploadZone.addEventListener('drop', (event) => { if (event.dataTransfer.files[0]) setReference(event.dataTransfer.files[0]); });
