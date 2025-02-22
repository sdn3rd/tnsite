/* ------------------------------------------------------------------
   script.js 
   - Hamburger menu (left)
   - About & Poetry in side menu
   - Language toggle (EN/IT) auto-detect
   - Poetry => descending date list from 2024-10-24 to today
     => fetch "poetry/YYYY-MM-DD.json"
     => display poem in English or Italian
------------------------------------------------------------------ */

console.log("script.js loaded.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired.");
  initializePage();

  // Listen for side menu link clicks (only about/poetry)
  const menuItems = document.querySelectorAll("#side-menu a[data-section]");
  menuItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      console.log(`Menu item clicked: ${section}`);

      if (section === "about") {
        loadAboutSection();
      }
      else if (section === "poetry") {
        loadPoetrySection();
      }
      closeMenu(); // hide the side menu
    });
  });
});

/* ------------------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------------------ */
let currentLanguage = "en"; 
let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

/* ------------------------------------------------------------------
   MAIN INIT
------------------------------------------------------------------ */
function initializePage() {
  // Setup hamburger & side menu
  setupHamburgerMenu();

  // Detect or load language from localStorage
  detectOrLoadLanguage();
  updateLanguageToggle();

  // Assign toggle event to #language-toggle
  const langToggle = document.getElementById("language-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", toggleLanguage);
  }

  // By default, load About
  loadAboutSection();
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION
------------------------------------------------------------------ */
function detectOrLoadLanguage() {
  // Check localStorage
  const savedLang = localStorage.getItem("preferredLang");
  if (savedLang) {
    currentLanguage = savedLang;
  } else {
    // auto-detect from browser
    const lang = (navigator.language || "en").toLowerCase();
    currentLanguage = lang.startsWith("it") ? "it" : "en";
    localStorage.setItem("preferredLang", currentLanguage);
  }
}

function toggleLanguage() {
  currentLanguage = (currentLanguage === "en") ? "it" : "en";
  localStorage.setItem("preferredLang", currentLanguage);
  updateLanguageToggle();

  // If user is in "poetry", we can reload the poem list or current display if needed
  // Example: if currently on poetry list, just re-load:
  // loadPoetrySection();
}

function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.textContent = (currentLanguage === "en") ? "ENG" : "ITA";
}

/* ------------------------------------------------------------------
   HAMBURGER MENU 
------------------------------------------------------------------ */
function setupHamburgerMenu() {
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

  // Close when clicking outside
  document.addEventListener("click", e => {
    const sideMenu = document.getElementById("side-menu");
    if (document.body.classList.contains("menu-open")) {
      if (!sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    }
  });
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  console.log("Side menu closed.");
}

/* ------------------------------------------------------------------
   SECTIONS: ABOUT & POETRY
------------------------------------------------------------------ */
function loadAboutSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  if (currentLanguage === "en") {
    mainContent.innerHTML = `<h1>About</h1><p>Welcome to Tristan Nuvola's minimal site. Enjoy the poetry!</p>`;
  } else {
    mainContent.innerHTML = `<h1>Informazioni</h1><p>Benvenuto/a nel sito minimal di Tristan Nuvola. Buona poesia!</p>`;
  }
}

/**
 * Poetry section: 
 * 1) Generate descending date list from 2024-10-24 to today
 * 2) On date click => fetch "poetry/YYYY-MM-DD.json"
 * 3) Display poem in EN or IT
 */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  const heading = (currentLanguage === "en") ? "Poetry" : "Poesia";
  mainContent.innerHTML = `<h1>${heading}</h1><div id="poems-container"></div>`;

  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  // Generate date list descending
  const startDate = new Date("2024-10-24");
  const endDate = new Date();
  const dateList = generateDateListDesc(startDate, endDate);

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
 * Generate descending date list from start -> end 
 */
function generateDateListDesc(startDate, endDate) {
  const list = [];
  // Zero out hours for both
  const dEnd = new Date(endDate.getTime());
  dEnd.setHours(0,0,0,0);
  const dStart = new Date(startDate.getTime());
  dStart.setHours(0,0,0,0);

  let cur = dEnd;
  while (cur >= dStart) {
    list.push(new Date(cur));
    cur.setDate(cur.getDate() - 1);
  }
  return list; // descending
}

/**
 * Fetch "poetry/YYYY-MM-DD.json"
 * If found => display
 * If not => show error
 */
function loadPoemByDate(dateStr) {
  console.log(`Loading poem for date: ${dateStr}`);
  const url = `poetry/${dateStr}.json`;
  
  fetch(url)
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`No poem found for date: ${dateStr}`);
      }
      return resp.json();
    })
    .then(data => {
      displayPoemData(data);
    })
    .catch(err => {
      console.warn(err);
      const mainContent = document.getElementById("main-content");
      if (!mainContent) return;
      const msg = (currentLanguage === "en")
        ? `<p style="color:red;">No poem found for ${dateStr}</p>`
        : `<p style="color:red;">Nessuna poesia trovata per ${dateStr}</p>`;
      mainContent.insertAdjacentHTML("beforeend", msg);
    });
}

/**
 * Poem JSON is an array with a single object
 */
function displayPoemData(poemArray) {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // If array, take first
  const poem = (Array.isArray(poemArray) && poemArray.length > 0) ? poemArray[0] : null;
  if (!poem) {
    mainContent.insertAdjacentHTML("beforeend", `<p style="color:red;">Empty data.</p>`);
    return;
  }

  // Build the poem HTML
  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;
  poemsContainer.innerHTML = ""; // clear old

  const wrapper = document.createElement("div");
  wrapper.classList.add("poem-wrapper");

  // Language specific fields
  const dateUsed = (currentLanguage === "en") ? poem.date_en : poem.date_it;
  const titleUsed = (currentLanguage === "en") ? poem.title_en : poem.title_it;
  const textUsed = (currentLanguage === "en") ? poem.poem_en : poem.poem_it;

  wrapper.innerHTML = `
    <div class="poem-header">
      <span class="poem-date">${dateUsed || ""}</span>
      <span class="poem-title">${titleUsed || ""}</span>
    </div>
    <div class="poem-content" style="display:block;">
      <div class="poem-text">${(textUsed || "").replace(/\n/g, "<br>")}</div>
    </div>
  `;
  poemsContainer.appendChild(wrapper);

  // Reading mode on mobile
  const textDiv = wrapper.querySelector(".poem-text");
  if (textDiv) {
    textDiv.addEventListener("click", evt => {
      evt.stopPropagation();
      if (isMobileDevice) {
        enterReadingMode(titleUsed, textUsed);
      }
    });
  }
}

/**
 * Minimal reading mode overlay
 */
function enterReadingMode(title, text) {
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
  closeBtn.style.cursor = "pointer";
  closeBtn.style.textAlign = "right";
  closeBtn.style.fontSize = "1.2em";
  closeBtn.style.marginBottom = "20px";
  closeBtn.textContent = (currentLanguage === "en") ? "Close ✕" : "Chiudi ✕";

  const h2 = document.createElement("h2");
  h2.textContent = title || ((currentLanguage === "en") ? "Untitled Poem" : "Senza titolo");

  const textDiv = document.createElement("div");
  textDiv.innerHTML = (text || "").replace(/\n/g, "<br>");

  overlay.appendChild(closeBtn);
  overlay.appendChild(h2);
  overlay.appendChild(textDiv);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", () => {
    overlay.remove();
  });
}

/* 
   CONTACT? Not used. We'll keep it minimal.
   If you want a Contact form, do it similarly or remove completely.
*/
function loadContactSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  if (currentLanguage === "en") {
    mainContent.innerHTML = "<h1>Contact</h1><p>(Placeholder contact section)</p>";
  } else {
    mainContent.innerHTML = "<h1>Contatto</h1><p>(Sezione contatto segnaposto)</p>";
  }
}
