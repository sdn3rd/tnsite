console.log("script.js loaded.");

/**
 * Global state
 */
let currentLanguage = "en";

// If you have localized strings in "gui.json", load them; else skip
let guiData = null;

/**
 * For the poem index
 * Keys: date in YYYYMMDD form (e.g. "20241211")
 * Each value: array of poem metadata objects (including "category")
 */
let poemIndex = {}; // Will hold data from poetry/index.json

/**
 * We'll dynamically figure out earliestDate and latestDate
 * from the date keys that appear in poemIndex,
 * then clamp them to the start of each month.
 */
let earliestDate = null;
let latestDate = null;

/** For the actual calendar navigation */
let calendarYear = 0;
let calendarMonth = 0; // 0-based
const today = new Date();

/**
 * For the overlay that lists poem titles
 */
let currentPoemsList = [];

/** On DOM Ready **/
document.addEventListener("DOMContentLoaded", async () => {
  await loadGuiData();
  await loadPoemIndex();
  determineDateRangeFromIndex();
  clampEarliestLatestToStartOfMonth();
  initializePage();
  setupSideMenu();
  setupLanguageToggle();
  setupPoetryIcons();
});

/* ------------------------------------------------------------------
   LOAD GUI JSON (OPTIONAL)
------------------------------------------------------------------ */
async function loadGuiData() {
  try {
    const resp = await fetch("gui.json");
    if (!resp.ok) throw new Error("No gui.json found");
    guiData = await resp.json();
    console.log("guiData loaded:", guiData);
  } catch (err) {
    console.warn("Skipping guiData load (not found or error).");
    guiData = null;
  }
}

/* ------------------------------------------------------------------
   LOAD POEM INDEX => "poetry/index.json"
   Fix invalid "category": , lines if present
------------------------------------------------------------------ */
async function loadPoemIndex() {
  try {
    const resp = await fetch("poetry/index.json");
    if (!resp.ok) {
      console.error("poetry/index.json response not OK:", resp);
      throw new Error("Could not load poetry/index.json");
    }
    let text = await resp.text();
    // Fix lines like `"category": ,`
    text = text.replace(/"category"\s*:\s*,/g, '"category":"Unspecified",');
    poemIndex = JSON.parse(text);
    console.log("poemIndex loaded successfully:", poemIndex);
  } catch (err) {
    console.error("Error loading poemIndex:", err);
    poemIndex = {};
  }
}

/**
 * After poemIndex is loaded, find earliest and latest date from its keys.
 */
function determineDateRangeFromIndex() {
  const dateKeys = Object.keys(poemIndex);
  if (!dateKeys.length) {
    earliestDate = new Date();
    latestDate = new Date();
    return;
  }
  const dateObjs = dateKeys.map(k => {
    const y = parseInt(k.slice(0, 4), 10);
    const m = parseInt(k.slice(4, 6), 10) - 1;
    const d = parseInt(k.slice(6, 8), 10);
    return new Date(y, m, d);
  });

  const minTime = Math.min(...dateObjs.map(d => d.getTime()));
  const maxTime = Math.max(...dateObjs.map(d => d.getTime()));

  earliestDate = new Date(minTime);
  latestDate = new Date(maxTime);
  console.log("Earliest date from index:", earliestDate);
  console.log("Latest date from index:", latestDate);
}

/**
 * Clamp earliestDate & latestDate to the *start* of their months.
 */
function clampEarliestLatestToStartOfMonth() {
  if (earliestDate) {
    earliestDate = new Date(
      earliestDate.getFullYear(),
      earliestDate.getMonth(),
      1
    );
  }
  if (latestDate) {
    latestDate = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      1
    );
  }
  console.log("Clamped earliestDate =>", earliestDate);
  console.log("Clamped latestDate =>", latestDate);
}

/* ------------------------------------------------------------------
   HELPER: t(path)
------------------------------------------------------------------ */
function t(path) {
  if (!guiData) return path;
  const segs = path.split(".");
  let langObj = guiData[currentLanguage] || guiData["en"] || {};
  let val = langObj;
  for (let s of segs) {
    if (val[s] === undefined) {
      // fallback to "en"
      val = guiData["en"] || {};
      for (let s2 of segs) {
        if (val[s2] === undefined) return path;
        val = val[s2];
      }
      return val;
    }
    val = val[s];
  }
  return val;
}

/* ------------------------------------------------------------------
   INITIAL PAGE SETUP
------------------------------------------------------------------ */
function initializePage() {
  detectOrLoadLanguage();
  updateLanguageToggle();
  updateMenuTexts(); // set "About" / "Poetry" text from gui
  loadAboutSection(); // default to About
}

function setupSideMenu() {
  const sideMenu = document.getElementById("side-menu");
  if (!sideMenu) return;

  const menuItems = sideMenu.querySelectorAll("a[data-section]");
  menuItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      if (section === "about") {
        loadAboutSection();
      } else if (section === "poetry") {
        loadPoetrySection();
      }
      closeMenu();
    });
  });

  const hamburger = document.getElementById("menu-icon-container");
  if (hamburger) {
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
    document.addEventListener("click", e => {
      if (
        document.body.classList.contains("menu-open") &&
        !hamburger.contains(e.target) &&
        !sideMenu.contains(e.target)
      ) {
        closeMenu();
      }
    });
  }
}
function closeMenu() {
  document.body.classList.remove("menu-open");
}

/* ------------------------------------------------------------------
   Update Side Menu Text from gui.json
------------------------------------------------------------------ */
function updateMenuTexts() {
  const aboutTextEl = document.getElementById("menu-about-text");
  const poetryTextEl = document.getElementById("menu-poetry-text");
  if (aboutTextEl) aboutTextEl.textContent = t("menu.about");
  if (poetryTextEl) poetryTextEl.textContent = t("menu.poetry");
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION & TOGGLE
------------------------------------------------------------------ */
function detectOrLoadLanguage() {
  const saved = localStorage.getItem("preferredLang");
  if (saved) {
    currentLanguage = saved;
  } else {
    const lang = (navigator.language || "en").toLowerCase();
    currentLanguage = lang.startsWith("it") ? "it" : "en";
    localStorage.setItem("preferredLang", currentLanguage);
  }
}

function setupLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.addEventListener("click", toggleLanguage);
  langToggle.addEventListener("keypress", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleLanguage();
    }
  });
}

function toggleLanguage() {
  currentLanguage = (currentLanguage === "en") ? "it" : "en";
  localStorage.setItem("preferredLang", currentLanguage);
  updateLanguageToggle();
  updateMenuTexts(); // Re-update side menu text to new language

  // If main-content has a .calendar-container, reload Poetry
  const main = document.getElementById("main-content");
  if (!main) return;
  const foundCalendar = main.querySelector(".calendar-container");
  if (foundCalendar) {
    loadPoetrySection();
  } else {
    loadAboutSection();
  }
}

function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.textContent = (currentLanguage === "en") ? "ITA" : "ENG";
}

/* ------------------------------------------------------------------
   ABOUT SECTION
   - Replaces #main-content with text from "aboutSection" 
   - Hides poetry icons
------------------------------------------------------------------ */
function loadAboutSection() {
  // Hide poetry icons
  const poetryIcons = document.getElementById("poetry-icons");
  if (poetryIcons) poetryIcons.style.display = "none";

  const main = document.getElementById("main-content");
  if (!main) return;

  // Use the updated 'aboutSection' from gui.json
  main.innerHTML = t("aboutSection");
}

/* ------------------------------------------------------------------
   POETRY SECTION => CALENDAR + Category Icons
------------------------------------------------------------------ */
function loadPoetrySection() {
  // Show poetry icons
  const poetryIcons = document.getElementById("poetry-icons");
  if (poetryIcons) poetryIcons.style.display = "flex";

  const main = document.getElementById("main-content");
  if (!main) return;
  main.innerHTML = "";

  if (!calendarYear) {
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
  }

  const container = document.createElement("div");
  container.classList.add("calendar-container");
  main.appendChild(container);

  renderCalendarView(calendarYear, calendarMonth, container);
}

function renderCalendarView(year, month, container) {
  container.innerHTML = "";

  // Nav
  const navDiv = document.createElement("div");
  navDiv.style.display = "flex";
  navDiv.style.justifyContent = "space-between";
  navDiv.style.alignItems = "center";
  navDiv.style.marginBottom = "1em";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = t("labels.prev") || "Prev";
  prevBtn.addEventListener("click", goPrev);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = t("labels.next") || "Next";
  nextBtn.addEventListener("click", goNext);

  const monthLabel = document.createElement("span");
  monthLabel.style.fontWeight = "bold";
  monthLabel.textContent = `${getMonthName(month)} ${year}`;

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(monthLabel);
  navDiv.appendChild(nextBtn);
  container.appendChild(navDiv);

  const thisMonthStart = new Date(year, month, 1);
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);

  // Disable Prev if before earliest month
  if (earliestDate && prevMonthDate < earliestDate) {
    prevBtn.disabled = true;
  }
  // Disable Next if after latest month
  if (latestDate && nextMonthDate > latestDate) {
    nextBtn.disabled = true;
  }

  // Build table
  const table = document.createElement("table");
  table.classList.add("calendar-table");

  const dayRow = document.createElement("tr");
  const dayNames = getDayNames();
  dayNames.forEach(dn => {
    const th = document.createElement("th");
    th.textContent = dn;
    dayRow.appendChild(th);
  });
  table.appendChild(dayRow);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  let row = document.createElement("tr");
  for (let i = 0; i < startWeekday; i++) {
    row.appendChild(document.createElement("td"));
  }

  for (let d = 1; d <= totalDays; d++) {
    if (row.children.length >= 7) {
      table.appendChild(row);
      row = document.createElement("tr");
    }
    const td = document.createElement("td");
    td.textContent = String(d);

    const currentDate = new Date(year, month, d);
    const yyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dd = String(currentDate.getDate()).padStart(2, "0");
    const dateKey = `${yyy}${mm}${dd}`;

    if (!poemIndex[dateKey]) {
      td.style.opacity = "0.3";
    } else {
      td.style.cursor = "pointer";
      td.onclick = () => loadPoemsByDate(`${yyy}-${mm}-${dd}`);
    }

    // highlight today's cell
    if (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getDate() === today.getDate()
    ) {
      td.style.backgroundColor = "#555";
      td.style.color = "#fff";
      td.style.borderRadius = "50%";
    }

    row.appendChild(td);
  }

  if (row.children.length > 0) {
    while (row.children.length < 7) {
      row.appendChild(document.createElement("td"));
    }
    table.appendChild(row);
  }

  container.appendChild(table);

  function goPrev() {
    if (month === 0) {
      calendarYear = year - 1;
      calendarMonth = 11;
    } else {
      calendarYear = year;
      calendarMonth = month - 1;
    }
    renderCalendarView(calendarYear, calendarMonth, container);
  }
  function goNext() {
    if (month === 11) {
      calendarYear = year + 1;
      calendarMonth = 0;
    } else {
      calendarYear = year;
      calendarMonth = month + 1;
    }
    renderCalendarView(calendarYear, calendarMonth, container);
  }
}

function getMonthName(m) {
  let months = t("calendar.months");
  if (!Array.isArray(months) || months.length < 12) {
    months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
  }
  return months[m] || "";
}

function getDayNames() {
  let days = t("calendar.daysOfWeek");
  if (!Array.isArray(days) || days.length < 7) {
    days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  }
  return days;
}

/* ------------------------------------------------------------------
   LOAD POEMS BY DATE => Show list overlay if multiple
------------------------------------------------------------------ */
function loadPoemsByDate(dateStr) {
  const folderName = dateStr.replace(/-/g, "");
  console.log("loadPoemsByDate:", dateStr, "=> folderName:", folderName);

  let poemMetadataArr = poemIndex[folderName] || [];
  if (!Array.isArray(poemMetadataArr)) {
    console.error("Not an array for folder:", folderName, poemMetadataArr);
    poemMetadataArr = [];
  }

  if (poemMetadataArr.length === 0) {
    alert(`${t("errors.noPoemFound") || "No poems for date"}: ${dateStr}`);
    return;
  }

  // Tag each with the folderName
  poemMetadataArr.forEach(m => {
    m._folderName = folderName;
  });

  // If only one poem, fetch directly; otherwise, show the listing overlay
  if (poemMetadataArr.length === 1) {
    fetchAndDisplayPoem(folderName, poemMetadataArr[0]);
  } else {
    currentPoemsList = poemMetadataArr.slice();
    // Build displayTitle for each
    currentPoemsList.forEach(p => {
      p._displayTitle = (currentLanguage === "en")
        ? (p.title_en || "Untitled")
        : (p.title_it || p.title_en || "Untitled");
    });
    showPoemListOverlay();
  }
}

/* ------------------------------------------------------------------
   LOAD POEMS BY CATEGORY => Show list overlay
------------------------------------------------------------------ */
function loadPoemsByCategory(categoryName) {
  console.log("loadPoemsByCategory:", categoryName);

  const allDateKeys = Object.keys(poemIndex);
  let result = [];
  allDateKeys.forEach(dateKey => {
    const arr = poemIndex[dateKey];
    if (Array.isArray(arr)) {
      arr.forEach(poemMeta => {
        if (
          poemMeta.category &&
          poemMeta.category.toLowerCase() === categoryName.toLowerCase()
        ) {
          poemMeta._folderName = dateKey;
          result.push(poemMeta);
        }
      });
    }
  });

  if (result.length === 0) {
    alert(`No poems found for category: ${categoryName}`);
    return;
  }

  currentPoemsList = result;
  // Build displayTitle for each
  currentPoemsList.forEach(p => {
    p._displayTitle = (currentLanguage === "en")
      ? (p.title_en || "Untitled")
      : (p.title_it || p.title_en || "Untitled");
  });
  showPoemListOverlay();
}

/* ------------------------------------------------------------------
   FETCH & DISPLAY SINGLE POEM
------------------------------------------------------------------ */
async function fetchAndDisplayPoem(folderName, poemMeta) {
  const poemUrl = `poetry/${folderName}/${poemMeta.filename}`;
  console.log("Fetching poem:", poemUrl);

  try {
    const resp = await fetch(poemUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch poem: ${poemUrl}`);
    }
    const poemData = await resp.json();
    console.log("Poem data:", poemData);

    // choose appropriate language
    const tUsed = (currentLanguage === "en")
      ? (poemData.title_en || "Untitled")
      : (poemData.title_it || poemData.title_en || "Untitled");

    const pUsed = (currentLanguage === "en")
      ? (poemData.poem_en || "")
      : (poemData.poem_it || poemData.poem_en || "");

    showReadingOverlay(tUsed, pUsed);
  } catch (err) {
    console.warn("Poem fetch error:", poemUrl, err);
    alert(`Could not load poem: ${poemMeta.filename}`);
  }
}

/* ------------------------------------------------------------------
   OVERLAY THAT LISTS POEM TITLES (instead of infinite wheel)
------------------------------------------------------------------ */
function showPoemListOverlay() {
  let overlay = document.getElementById("poem-list-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "poem-list-overlay";
    overlay.innerHTML = `
      <button id="poem-list-close-btn">×</button>
      <div id="poem-list-container"></div>
    `;
    document.body.appendChild(overlay);
  }

  // Show the overlay
  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);

  // Populate the container with poem titles
  const container = overlay.querySelector("#poem-list-container");
  container.innerHTML = "";

  currentPoemsList.forEach(poemMeta => {
    const item = document.createElement("div");
    item.classList.add("poem-list-item");
    item.textContent = poemMeta._displayTitle;
    item.addEventListener("click", () => {
      fetchAndDisplayPoem(poemMeta._folderName, poemMeta);
    });
    container.appendChild(item);
  });

  // Close button logic
  const closeBtn = overlay.querySelector("#poem-list-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 400);
  };
}

/* ------------------------------------------------------------------
   READING OVERLAY
------------------------------------------------------------------ */
function showReadingOverlay(title, text) {
  let overlay = document.getElementById("poem-reading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "poem-reading-overlay";
    overlay.innerHTML = `
      <button id="poem-overlay-close">X</button>
      <h2 id="poem-overlay-title"></h2>
      <div id="poem-overlay-content"></div>
    `;
    document.body.appendChild(overlay);
  }

  const closeBtn = overlay.querySelector("#poem-overlay-close");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 400);
  };

  const titleEl = overlay.querySelector("#poem-overlay-title");
  const contentEl = overlay.querySelector("#poem-overlay-content");
  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.textContent = text;

  overlay.style.display = "flex";
  setTimeout(() => overlay.classList.add("show"), 50);
}

/* ------------------------------------------------------------------
   POETRY ICONS -> Calendar / Category icons
------------------------------------------------------------------ */
function setupPoetryIcons() {
  const poetryIcons = document.getElementById("poetry-icons");
  if (!poetryIcons) return;

  const calendarIcon = document.getElementById("calendar-icon");
  if (calendarIcon) {
    calendarIcon.addEventListener("click", () => {
      loadPoetrySection();
    });
  }

  const categoryIcons = poetryIcons.querySelectorAll(".category-icon");
  categoryIcons.forEach(icon => {
    icon.addEventListener("click", () => {
      const cat = icon.getAttribute("data-category");
      loadPoemsByCategory(cat);
    });
  });
}
