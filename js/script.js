/* ------------------------------------------------------------------
   script.js - Single file with:
   - Hamburger menu (top-left)
   - Language toggle (top-right, auto-detect OS lang)
   - Date-based poetry from Oct 24, 2024 to today
   - Mobile reading mode
------------------------------------------------------------------ */

console.log("script.js loaded.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded.");
  initializePage();

  // Side menu link clicks
  const menuItems = document.querySelectorAll("#side-menu a[data-section]");
  menuItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      console.log(`Menu item clicked: ${section}`);

      if (section === "poetry") {
        loadPoetrySection();
      }
      else if (section === "contact") {
        loadContactSection();
      }
      else if (section === "spectral") {
        loadSpectralSection();  
      }
      else {
        loadSection(section);
      }

      closeMenu();
    });
  });
});

/* ------------------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------------------ */
let currentTheme = "dark";    // or detect OS theme if you like
let currentLanguage = "en";   // will detect from OS, or load from localStorage
let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

/**
 * Initialization
 */
function initializePage() {
  console.log("initializePage() called.");

  // 1) Setup hamburger & side menu
  setupHamburger();
  setupSideMenu();

  // 2) Theme
  applyTheme(currentTheme);

  // 3) Language
  loadOrDetectLanguage();
  updateLanguageToggle();

  // 4) Load default "introduction" section
  loadSection("introduction");
}

/* ------------------------------------------------------------------
   THEME
------------------------------------------------------------------ */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  currentTheme = theme;
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION & TOGGLE
------------------------------------------------------------------ */
/**
 * On first load, check localStorage. If no language saved,
 * detect from navigator.language => "it" or "en". Then store.
 */
function loadOrDetectLanguage() {
  const savedLang = localStorage.getItem("preferredLang");
  if (savedLang) {
    currentLanguage = savedLang;
  } else {
    const userLang = (navigator.language || "en").toLowerCase();
    if (userLang.startsWith("it")) {
      currentLanguage = "it";
    } else {
      currentLanguage = "en";
    }
    localStorage.setItem("preferredLang", currentLanguage);
  }
}

/**
 * Toggle between "en" and "it" then store in localStorage
 * Optionally re-load any displayed content if needed
 */
function toggleLanguage() {
  currentLanguage = (currentLanguage === "en") ? "it" : "en";
  localStorage.setItem("preferredLang", currentLanguage);
  console.log("Language toggled =>", currentLanguage);

  updateLanguageToggle();

  // If you want to refresh an existing displayed section 
  // (like "Poetry" if it's open) you can re-run the function here
  // For example, if user is in Poetry, re-run loadPoetrySection();
  // or if user is in introduction, re-run loadSection("introduction");
  // Skipped for brevity
}

/**
 * Update the top-right button text: "ENG" or "ITA"
 */
function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  if (currentLanguage === "en") {
    langToggle.textContent = "ENG";
  } else {
    langToggle.textContent = "ITA";
  }
}

/* ------------------------------------------------------------------
   HAMBURGER MENU + SIDE MENU
------------------------------------------------------------------ */
function setupHamburger() {
  const hamburger = document.getElementById("menu-icon-container");
  if (!hamburger) return;

  hamburger.addEventListener("click", e => {
    e.stopPropagation();
    document.body.classList.toggle("menu-open");
  });

  hamburger.addEventListener("keypress", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.body.classList.toggle("menu-open");
    }
  });

  // Close menu if user clicks outside
  document.addEventListener("click", e => {
    const sideMenu = document.getElementById("side-menu");
    if (document.body.classList.contains("menu-open")) {
      if (!sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    }
  });
}

function setupSideMenu() {
  const sideMenu = document.getElementById("side-menu");
  if (!sideMenu) return;
  // Additional side-menu logic if needed
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  console.log("Side menu closed.");
}

/* ------------------------------------------------------------------
   SECTIONS / NAVIGATION
------------------------------------------------------------------ */
function loadSection(sectionId) {
  console.log(`Loading section: ${sectionId}`);
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  if (sectionId === "introduction") {
    if (currentLanguage === "en") {
      mainContent.innerHTML = "<h1>Introduction</h1><p>Welcome to the site!</p>";
    } else {
      mainContent.innerHTML = "<h1>Introduzione</h1><p>Benvenuto/a nel sito!</p>";
    }
  }
  else {
    mainContent.innerHTML = `<h1>${sectionId}</h1><p>Placeholder content for "${sectionId}".</p>`;
  }
}

function loadPoetrySection() {
  console.log("Loading Poetry section => date list from 2024-10-24 to today.");
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // Title depends on language
  const heading = (currentLanguage === "en") ? "Poetry" : "Poesia";
  mainContent.innerHTML = `<h1>${heading}</h1><div id='poems-container'></div>`;

  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  const dateList = generateDateList(new Date("2024-10-24"), new Date());
  // Render a simple UL (descending order)
  let html = "<ul>";
  dateList.forEach(d => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const label = `${yyyy}-${mm}-${dd}`;
    html += `<li><a href="#" data-date="${label}">${label}</a></li>`;
  });
  html += "</ul>";
  poemsContainer.innerHTML = html;

  // Listen for date clicks
  const dateLinks = poemsContainer.querySelectorAll("a[data-date]");
  dateLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const dateStr = link.getAttribute("data-date");
      loadPoemByDate(dateStr);
    });
  });
}

/**
 * Generate array of Dates from startDate to endDate (inclusive) in descending order
 */
function generateDateList(startDate, endDate) {
  const list = [];
  let d = new Date(endDate.getTime());
  d.setHours(0,0,0,0);
  const s = new Date(startDate.getTime());
  s.setHours(0,0,0,0);

  while (d >= s) {
    list.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return list; // descending
}

/**
 * For a given date (YYYY-MM-DD), fetch "json/YYYY-MM-DD.json" 
 */
function loadPoemByDate(dateStr) {
  console.log(`Loading poem for date ${dateStr} => "json/${dateStr}.json"`);
  const url = `json/${dateStr}.json`;
  fetch(url)
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`No poem for date: ${dateStr}`);
      }
      return resp.json();
    })
    .then(data => {
      displaySinglePoem(data);
    })
    .catch(err => {
      console.warn(err);
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        const fallbackMsg = (currentLanguage === "en")
          ? `No poem found for ${dateStr}`
          : `Nessuna poesia trovata per ${dateStr}`;
        mainContent.insertAdjacentHTML("beforeend", `<p style="color:red;">${fallbackMsg}</p>`);
      }
    });
}

/**
 * data is either a single object or an array with one object
 */
function displaySinglePoem(poemOrArray) {
  console.log("displaySinglePoem", poemOrArray);
  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  // Clear
  poemsContainer.innerHTML = "";

  // If array, take first item
  let poem;
  if (Array.isArray(poemOrArray)) {
    poem = poemOrArray[0];
  } else {
    poem = poemOrArray;
  }
  if (!poem) {
    poemsContainer.innerHTML = "<p>No data in JSON.</p>";
    return;
  }

  const poemDiv = document.createElement("div");
  poemDiv.classList.add("poem-wrapper");

  // Decide which fields to show based on language
  const dateEn = poem.date_en || "";
  const dateIt = poem.date_it || "";
  const titleEn = poem.title_en || "";
  const titleIt = poem.title_it || "";
  const textEn = poem.poem_en || "";
  const textIt = poem.poem_it || "";

  const usedDate = (currentLanguage === "en") ? dateEn : dateIt;
  const usedTitle = (currentLanguage === "en") ? titleEn : titleIt;
  const usedText = (currentLanguage === "en") ? textEn : textIt;

  poemDiv.innerHTML = `
    <div class="poem-header">
      <span class="poem-date">${usedDate}</span>
      <span class="poem-title">${usedTitle}</span>
    </div>
    <div class="poem-content" style="display:block;">
      <div class="poem-text">${usedText.replace(/\n/g, "<br>")}</div>
    </div>
  `;
  poemsContainer.appendChild(poemDiv);

  // Reading mode on mobile
  const poemText = poemDiv.querySelector(".poem-text");
  if (poemText) {
    poemText.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (isMobileDevice) {
        enterReadingMode(usedTitle, usedText);
      }
    });
  }
}

/**
 * Show overlay reading mode
 */
function enterReadingMode(title, poemText) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
  overlay.style.color = "#fff";
  overlay.style.zIndex = "9999";
  overlay.style.overflowY = "auto";
  overlay.style.padding = "20px";

  const closeBtn = document.createElement("div");
  closeBtn.textContent = (currentLanguage === "en") ? "Close ✕" : "Chiudi ✕";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.textAlign = "right";
  closeBtn.style.fontSize = "1.2em";
  closeBtn.style.marginBottom = "20px";

  const h2 = document.createElement("h2");
  h2.textContent = title || ((currentLanguage === "en") ? "Untitled Poem" : "Senza titolo");

  const textDiv = document.createElement("div");
  textDiv.innerHTML = poemText.replace(/\n/g, "<br>");

  overlay.appendChild(closeBtn);
  overlay.appendChild(h2);
  overlay.appendChild(textDiv);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", () => {
    overlay.remove();
  });
}

/* 
   CONTACT + SPECTRAL SECTIONS (Placeholder logic)
*/
function loadContactSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  if (currentLanguage === "en") {
    mainContent.innerHTML = "<h1>Contact</h1><p>Contact form placeholder.</p>";
  } else {
    mainContent.innerHTML = "<h1>Contatto</h1><p>Modulo di contatto segnaposto.</p>";
  }
}
function loadSpectralSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  if (currentLanguage === "en") {
    mainContent.innerHTML = "<h1>Spectral</h1><p>Spectral placeholder content.</p>";
  } else {
    mainContent.innerHTML = "<h1>Spettrale</h1><p>Contenuto segnaposto spettrale.</p>";
  }
}
