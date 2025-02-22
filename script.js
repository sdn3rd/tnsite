/* ------------------------------------------------------------------
   script.js - Final, Overwrite Your Existing

   - Fetches localized HTML from "gui.json"
   - Maintains a "currentSection" (e.g. "about", "poetry", "introduction")
   - On language toggle, re-renders whichever section is active
   - Includes an example "Poetry" section with date-based listing
   - Includes reading mode on mobile
------------------------------------------------------------------ */

let currentLanguage = 'en';
let currentSection  = 'introduction';  // default
let currentPoemDate = null;           // track which poem date is open
let guiData         = {};             // loaded from gui.json
const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

/**
 * On DOMContentLoaded:
 *   1) Load the GUI JSON with all localized strings
 *   2) Initialize the page (menu, language, default section)
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('script.js: DOM fully loaded');

  await loadGuiData();       // fetch "gui.json"
  initializePage();          // set up menu, language, etc.
});

/* ------------------------------------------------------------------
   STEP 1: LOAD GUI DATA FROM gui.json
------------------------------------------------------------------ */
async function loadGuiData() {
  try {
    const resp = await fetch('gui.json');
    if (!resp.ok) {
      throw new Error(`gui.json fetch error: ${resp.status}`);
    }
    guiData = await resp.json();
    console.log('GUI data loaded:', guiData);
  } catch (err) {
    console.error('Failed to load gui.json:', err);
    guiData = {}; // fallback empty
  }
}

/* ------------------------------------------------------------------
   STEP 2: INITIALIZE PAGE
------------------------------------------------------------------ */
function initializePage() {
  console.log('initializePage() called');

  setupHamburger();
  loadOrDetectLanguage();
  updateLanguageToggle();
  setupSideMenuLinks();

  // Default section
  loadSection('introduction');

  // If you have a "language-toggle" div
  const langToggle = document.getElementById('language-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
  }
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION AND TOGGLE
------------------------------------------------------------------ */
function loadOrDetectLanguage() {
  const stored = localStorage.getItem('preferredLang');
  if (stored) {
    currentLanguage = stored;
  } else {
    const navLang = (navigator.language || 'en').toLowerCase();
    currentLanguage = navLang.startsWith('it') ? 'it' : 'en';
    localStorage.setItem('preferredLang', currentLanguage);
  }
  console.log('Current language:', currentLanguage);
}

function toggleLanguage() {
  currentLanguage = (currentLanguage === 'en') ? 'it' : 'en';
  localStorage.setItem('preferredLang', currentLanguage);
  console.log('Language toggled =>', currentLanguage);

  updateLanguageToggle();

  // Re-render the same section immediately
  loadSection(currentSection);

  // If we want to keep the same poem date open, re-fetch:
  if (currentSection === 'poetry' && currentPoemDate) {
    loadPoemByDate(currentPoemDate);
  }
}

function updateLanguageToggle() {
  const langToggle = document.getElementById('language-toggle');
  if (langToggle) {
    langToggle.textContent = (currentLanguage === 'en') ? 'ENG' : 'ITA';
  }
}

/* ------------------------------------------------------------------
   SIDE MENU / HAMBURGER
------------------------------------------------------------------ */
function setupHamburger() {
  const hamburger = document.getElementById('menu-icon-container');
  if (!hamburger) return;

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    document.body.classList.toggle('menu-open');
  });

  hamburger.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.body.classList.toggle('menu-open');
    }
  });

  document.addEventListener('click', e => {
    const sideMenu = document.getElementById('side-menu');
    if (document.body.classList.contains('menu-open')) {
      if (!sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    }
  });
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  console.log('Side menu closed');
}

function setupSideMenuLinks() {
  const menuItems = document.querySelectorAll('#side-menu a[data-section]');
  menuItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      loadSection(section);
      closeMenu();
    });
  });
}

/* ------------------------------------------------------------------
   LOAD SECTION => RENDER FROM gui.json 
   + special logic for 'poetry'
------------------------------------------------------------------ */
function loadSection(sectionId) {
  currentSection = sectionId;
  currentPoemDate = null;  // reset any poem detail

  console.log(`Loading section: ${sectionId}`);
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // 1) Look up the localized HTML from "guiData"
  //    We'll assume the structure:
  //    { "sections": { "introduction": { "en": "<h1>Welcome</h1>...", "it": "..." }, ... } }
  const localizedHTML = getGuiString(`sections.${sectionId}`, currentLanguage);
  if (!localizedHTML) {
    // fallback
    mainContent.innerHTML = `<h1>${sectionId}</h1><p>[No translation found in gui.json]</p>`;
  } else {
    mainContent.innerHTML = localizedHTML;
  }

  // 2) If "poetry", render date-based listing
  if (sectionId === 'poetry') {
    loadPoetrySection();
  }
  // If you want any other special logic for "about", "contact", "spectral", do it below:
  // else if (sectionId === "contact") ...
}

/* ------------------------------------------------------------------
   GET GUI STRING UTILITY
------------------------------------------------------------------ */
function getGuiString(path, lang) {
  // E.g. path = "sections.poetry"
  // We'll do a quick dotted lookup in guiData
  const segments = path.split('.');
  let obj = guiData;
  for (const seg of segments) {
    if (!obj || typeof obj !== 'object') return '';
    obj = obj[seg];
  }
  if (!obj) return '';
  // Now "obj" might be { en: "...", it: "..." }
  return obj[lang] || ''; // fallback
}

/* ------------------------------------------------------------------
   POETRY SECTION => date-based from 2024-10-24 to Today
------------------------------------------------------------------ */
function loadPoetrySection() {
  console.log('Loading Poetry listing');
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // Insert a container for the date list
  mainContent.insertAdjacentHTML('beforeend', '<div id="poems-container"></div>');
  const poemsContainer = document.getElementById('poems-container');
  if (!poemsContainer) return;

  const dateList = generateDateList(new Date('2024-10-24'), new Date());
  // Build an unordered list, descending order
  let html = '<ul>';
  dateList.forEach(d => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const label = `${yyyy}-${mm}-${dd}`;
    html += `<li><a href="#" data-date="${label}">${label}</a></li>`;
  });
  html += '</ul>';
  poemsContainer.innerHTML = html;

  // Listen for date link clicks => load poem
  const dateLinks = poemsContainer.querySelectorAll('a[data-date]');
  dateLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const dateStr = link.getAttribute('data-date');
      loadPoemByDate(dateStr);
    });
  });
}

/**
 * Generate array of Dates from startDate to endDate inclusive, descending
 */
function generateDateList(startDate, endDate) {
  const list = [];
  const d = new Date(endDate);
  d.setHours(0,0,0,0);
  const s = new Date(startDate);
  s.setHours(0,0,0,0);

  while (d >= s) {
    list.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return list; // descending
}

/* ------------------------------------------------------------------
   LOAD A POEM JSON: e.g. "json/2025-03-01.json"
------------------------------------------------------------------ */
function loadPoemByDate(dateStr) {
  console.log(`loadPoemByDate => ${dateStr}`);
  currentPoemDate = dateStr;

  fetch(`json/${dateStr}.json`)
    .then(resp => {
      if (!resp.ok) throw new Error(`No poem for ${dateStr}`);
      return resp.json();
    })
    .then(data => {
      displaySinglePoem(data, dateStr);
    })
    .catch(err => {
      console.warn(err);
      const poemsContainer = document.getElementById('poems-container');
      if (poemsContainer) {
        const failMsg = (currentLanguage === 'en')
          ? `No poem found for ${dateStr}`
          : `Nessuna poesia trovata per ${dateStr}`;
        poemsContainer.insertAdjacentHTML('beforeend', `<p style="color:red;">${failMsg}</p>`);
      }
    });
}

/**
 * data => single poem object or array
 */
function displaySinglePoem(poemOrArray, dateStr) {
  const poemsContainer = document.getElementById('poems-container');
  if (!poemsContainer) return;

  // Clear out old
  // (Or you might want to keep the list of links above; your choice.)
  poemsContainer.innerHTML = '';

  // If array, take first item
  let poem = Array.isArray(poemOrArray) ? poemOrArray[0] : poemOrArray;
  if (!poem) {
    poemsContainer.innerHTML = '<p>[Empty poem data]</p>';
    return;
  }

  const dateEn = poem.date_en || '';
  const dateIt = poem.date_it || '';
  const titleEn = poem.title_en || '';
  const titleIt = poem.title_it || '';
  const textEn  = poem.poem_en  || '';
  const textIt  = poem.poem_it  || '';

  const usedDate  = (currentLanguage === 'en') ? dateEn : dateIt;
  const usedTitle = (currentLanguage === 'en') ? titleEn : titleIt;
  const usedText  = (currentLanguage === 'en') ? textEn  : textIt;

  const poemHtml = `
    <div class="poem-wrapper">
      <div class="poem-header">
        <span class="poem-date">${usedDate}</span>
        <span class="poem-title">${usedTitle}</span>
      </div>
      <div class="poem-content" style="display: block;">
        <div class="poem-text">${usedText.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  `;
  poemsContainer.innerHTML = poemHtml;

  // Reading mode on mobile
  const poemTextDiv = poemsContainer.querySelector('.poem-text');
  if (poemTextDiv) {
    poemTextDiv.addEventListener('click', e => {
      e.stopPropagation();
      if (isMobileDevice) {
        enterReadingMode(usedTitle || dateStr, usedText);
      }
    });
  }
}

/* ------------------------------------------------------------------
   READING MODE ON MOBILE
------------------------------------------------------------------ */
function enterReadingMode(title, text) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    color: '#fff',
    zIndex: '9999',
    overflowY: 'auto',
    padding: '20px'
  });

  const closeBtn = document.createElement('div');
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.textAlign = 'right';
  closeBtn.style.fontSize = '1.2em';
  closeBtn.style.marginBottom = '20px';
  closeBtn.textContent = (currentLanguage === 'en') ? 'Close ✕' : 'Chiudi ✕';

  const h2 = document.createElement('h2');
  h2.textContent = title || ((currentLanguage === 'en') ? 'Untitled Poem' : 'Senza titolo');

  const textDiv = document.createElement('div');
  textDiv.innerHTML = text.replace(/\n/g, '<br>');

  overlay.appendChild(closeBtn);
  overlay.appendChild(h2);
  overlay.appendChild(textDiv);
  document.body.appendChild(overlay);

  closeBtn.addEventListener('click', () => overlay.remove());
}
