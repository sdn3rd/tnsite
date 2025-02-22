console.log("script.js loaded.");

/** Global state **/
// Track which section is currently active: "about", "poetry", or null
let activeSection = null;

let currentLanguage = "en";
let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

// For the calendar
let calendarYear = 0;
let calendarMonth = 0; // 0-based
const earliestDate = new Date(2024, 9, 24); // 2024-10-24
const today = new Date();

// Holds the parsed "gui.json" data
let guiData = null;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired.");

  // 1) Load all language data from gui.json
  await loadGuiData();

  // 2) Initialize the rest
  initializePage();

  // 3) Setup side menu link clicks
  const menuItems = document.querySelectorAll("#side-menu a[data-section]");
  menuItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      if (section === "about") {
        activeSection = "about";
        loadAboutSection();
      } else if (section === "poetry") {
        activeSection = "poetry";
        loadPoetrySection();
      }
      closeMenu();
    });
  });

  // 4) Update side menu text immediately
  updateSideMenuLabels();
});

/* ------------------------------------------------------------------
   1) Load the gui.json data
------------------------------------------------------------------ */
async function loadGuiData() {
  try {
    const resp = await fetch("gui.json");
    if (!resp.ok) throw new Error(`Failed to load gui.json: ${resp.status}`);
    guiData = await resp.json();
    console.log("guiData loaded:", guiData);
  } catch (err) {
    console.error("Error loading gui.json:", err);
    guiData = null;
  }
}

/* ------------------------------------------------------------------
   HELPER: t(path) => fetch string/array from guiData with fallback
   E.g. t("menu.about") => "About" or "Informazioni"
------------------------------------------------------------------ */
function t(path) {
  if (!guiData) return path; // if not loaded, show path as fallback
  const segs = path.split(".");
  // We try currentLanguage => fallback to "en"
  let langObj = guiData[currentLanguage] || guiData["en"] || {};
  let val = langObj;
  for (let s of segs) {
    if (val[s] === undefined) {
      // fallback to en
      val = guiData["en"] || {};
      for (let s2 of segs) {
        if (val[s2] === undefined) {
          return path; // final fallback
        }
        val = val[s2];
      }
      return val;
    }
    val = val[s];
  }
  return val;
}

/* ------------------------------------------------------------------
   MAIN INIT
------------------------------------------------------------------ */
function initializePage() {
  setupHamburgerMenu();
  
  detectOrLoadLanguage();
  updateLanguageToggle();
  
  const langToggle = document.getElementById("language-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", () => {
      // Toggle and re-render current section immediately
      toggleLanguage();
      if (activeSection === "poetry") {
        loadPoetrySection();
      } else if (activeSection === "about") {
        loadAboutSection();
      }
    });
  }

  // By default => load About
  activeSection = "about";
  loadAboutSection();

  // Setup wheel event listeners
  const wheelUpBtn = document.getElementById("wheel-up");
  const wheelDownBtn = document.getElementById("wheel-down");
  const backToCalendarBtn = document.getElementById("back-to-calendar-btn");
  if (wheelUpBtn && wheelDownBtn) {
    wheelUpBtn.addEventListener("click", () => spinWheel(-1));
    wheelDownBtn.addEventListener("click", () => spinWheel(1));
  }
  if (backToCalendarBtn) {
    backToCalendarBtn.addEventListener("click", () => {
      // Hide the wheel, show the poems-container (calendar)
      const wheelContainer = document.getElementById("poems-wheel-container");
      const poemsContainer = document.getElementById("poems-container");
      if (wheelContainer) wheelContainer.style.display = "none";
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION
------------------------------------------------------------------ */
function detectOrLoadLanguage() {
  const savedLang = localStorage.getItem("preferredLang");
  if (savedLang) {
    currentLanguage = savedLang;
  } else {
    const lang = (navigator.language || "en").toLowerCase();
    currentLanguage = lang.startsWith("it") ? "it" : "en";
    localStorage.setItem("preferredLang", currentLanguage);
  }
}

function toggleLanguage() {
  currentLanguage = (currentLanguage === "en") ? "it" : "en";
  localStorage.setItem("preferredLang", currentLanguage);
  updateLanguageToggle();
  updateSideMenuLabels();
  console.log("Language toggled =>", currentLanguage);
}

/* Update the top-right toggle text from gui.json or fallback "ENG"/"ITA" */
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
   SIDE MENU
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

  // close menu if click outside
  document.addEventListener("click", e => {
    const sideMenu = document.getElementById("side-menu");
    if (document.body.classList.contains("menu-open")) {
      if (!sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    }
  });
}

function updateSideMenuLabels() {
  // We have 2 items: about, poetry
  const aboutLink = document.querySelector('#side-menu a[data-section="about"]');
  const poetryLink = document.querySelector('#side-menu a[data-section="poetry"]');
  if (aboutLink) aboutLink.textContent = t("menu.about");
  if (poetryLink) poetryLink.textContent = t("menu.poetry");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  console.log("Side menu closed.");
}

/* ------------------------------------------------------------------
   ABOUT SECTION (from gui.json => aboutSection)
------------------------------------------------------------------ */
function loadAboutSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  mainContent.innerHTML = t("aboutSection");
}

/* ------------------------------------------------------------------
   POETRY SECTION => Monthly Calendar
------------------------------------------------------------------ */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // The heading is in "poetryHeading"
  const heading = t("poetryHeading");
  mainContent.innerHTML = `<h1>${heading}</h1><div id="poems-container"></div>`;

  // Set calendar to current month/year if not set
  if (!calendarYear || !calendarMonth) {
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
  }

  // Render the calendar UI
  renderCalendarView(calendarYear, calendarMonth);
}

/**
 * Render the calendar UI for a given year/month
 */
function renderCalendarView(year, month) {
  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  // Clear old
  poemsContainer.innerHTML = "";

  // Create nav bar for Prev/Next
  const navDiv = document.createElement("div");
  navDiv.style.display = "flex";
  navDiv.style.justifyContent = "space-between";
  navDiv.style.alignItems = "center";
  navDiv.style.marginBottom = "1em";

  const monthName = getMonthName(month);
  const title = document.createElement("span");
  title.style.fontWeight = "bold";
  title.textContent = `${monthName} ${year}`;

  // Prev button => t("labels.prev") or t("labels.next")
  const prevBtn = document.createElement("button");
  prevBtn.textContent = t("labels.prev");
  prevBtn.addEventListener("click", () => {
    goToPrevMonth();
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = t("labels.next");
  nextBtn.addEventListener("click", () => {
    goToNextMonth();
  });

  // Check if prev is allowed
  const prevMonthDate = new Date(year, month - 1, 1);
  if (prevMonthDate < earliestDate) {
    prevBtn.disabled = true;
  }

  // Check if next is allowed
  const nextMonthDate = new Date(year, month + 1, 1);
  if (nextMonthDate > new Date(today.getFullYear(), today.getMonth(), 1)) {
    nextBtn.disabled = true;
  }

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(title);
  navDiv.appendChild(nextBtn);
  poemsContainer.appendChild(navDiv);

  // Create a table for days
  const table = document.createElement("table");
  table.classList.add("calendar-table");

  // Day-of-week row
  const dayRow = document.createElement("tr");
  const dayNames = getDayNames();
  dayNames.forEach(dn => {
    const th = document.createElement("th");
    th.textContent = dn;
    dayRow.appendChild(th);
  });
  table.appendChild(dayRow);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0); // day=0 => last day prev month
  const startWeekday = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
  const totalDays = lastDayOfMonth.getDate();

  let row = document.createElement("tr");
  // Empty cells for days before 1st
  for (let i = 0; i < startWeekday; i++) {
    const emptyCell = document.createElement("td");
    row.appendChild(emptyCell);
  }

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    if (row.children.length >= 7) {
      table.appendChild(row);
      row = document.createElement("tr");
    }
    const current = new Date(year, month, dayNum);
    const cell = document.createElement("td");
    cell.textContent = String(dayNum);
    cell.style.textAlign = "center";
    cell.style.cursor = "pointer";

    if (current < earliestDate || current > today) {
      cell.style.opacity = "0.3";
      cell.style.cursor = "default";
    } else {
      cell.addEventListener("click", () => {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        loadPoemByDate(dateStr);
      });
    }

    // highlight if it's "today"
    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      dayNum === today.getDate()
    ) {
      cell.style.backgroundColor = "#555";
      cell.style.color = "#fff";
      cell.style.borderRadius = "50%";
    }

    row.appendChild(cell);
  }

  if (row.children.length > 0) {
    // fill remainder
    while (row.children.length < 7) {
      const emptyCell = document.createElement("td");
      row.appendChild(emptyCell);
    }
    table.appendChild(row);
  }

  poemsContainer.appendChild(table);

  function goToPrevMonth() {
    if (month === 0) {
      calendarYear = year - 1;
      calendarMonth = 11;
    } else {
      calendarYear = year;
      calendarMonth = month - 1;
    }
    renderCalendarView(calendarYear, calendarMonth);
  }
  function goToNextMonth() {
    if (month === 11) {
      calendarYear = year + 1;
      calendarMonth = 0;
    } else {
      calendarYear = year;
      calendarMonth = month + 1;
    }
    renderCalendarView(calendarYear, calendarMonth);
  }
}

/**
 * Get the localized month name from gui.json
 */
function getMonthName(mIndex) {
  // This should return an array of 12 months from guiData
  let months = t("calendar.months");
  if (!Array.isArray(months) || months.length < 12) {
    // fallback
    months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
  }
  return months[mIndex] || "";
}

/**
 * Get the localized day-of-week names from gui.json
 */
function getDayNames() {
  let days = t("calendar.daysOfWeek");
  if (!Array.isArray(days) || days.length < 7) {
    days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  }
  return days;
}

/* ------------------------------------------------------------------
   FETCH & DISPLAY POEM(S)
------------------------------------------------------------------ */
function loadPoemByDate(dateStr) {
  console.log("Loading poem for date:", dateStr);
  const url = `poetry/${dateStr}.json`;
  fetch(url)
    .then(resp => {
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    })
    .then(data => {
      // data might be an array of multiple poems
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No poems in array");
      }
      // Hide the calendar table
      const poemsContainer = document.getElementById("poems-container");
      if (poemsContainer) poemsContainer.style.display = "none";

      // If only 1 poem => display normally
      if (data.length === 1) {
        displaySinglePoem(data[0]);
      } else {
        // multiple poems => show the wheel
        displayPoemsWheel(data);
      }
    })
    .catch(err => {
      console.warn(err);
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.insertAdjacentHTML(
          "beforeend",
          `<p style="color:red;">${t("errors.noPoemFound")} ${dateStr}</p>`
        );
      }
    });
}

/** Show a single poem immediately */
function displaySinglePoem(poemObj) {
  // Clear old poem if any
  const existing = document.getElementById("displayed-poem");
  if (existing) existing.remove();

  // Also hide the wheel if it was open
  const wheelContainer = document.getElementById("poems-wheel-container");
  if (wheelContainer) wheelContainer.style.display = "none";

  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  // create container
  const poemDiv = document.createElement("div");
  poemDiv.id = "displayed-poem";
  poemDiv.style.marginTop = "1em";
  poemDiv.style.padding = "1em";
  poemDiv.style.border = "1px solid #666";

  const dateUsed = currentLanguage === "en" ? (poemObj.date_en||"") : (poemObj.date_it||poemObj.date_en||"");
  const titleUsed = currentLanguage === "en" ? (poemObj.title_en||"") : (poemObj.title_it||poemObj.title_en||"");
  const textUsed = currentLanguage === "en" ? (poemObj.poem_en||"") : (poemObj.poem_it||poemObj.poem_en||"");

  poemDiv.innerHTML = `
    <h2>${titleUsed}</h2>
    <p style="font-style:italic;">${dateUsed}</p>
    <div class="poem-content">
      ${textUsed.replace(/\n/g, "<br>")}
    </div>
    <div style="margin-top:1em;">
      <button id="single-poem-back-btn">Back</button>
    </div>
  `;

  poemsContainer.parentNode.insertBefore(poemDiv, poemsContainer.nextSibling);

  // "Back" => show calendar again, remove poem
  const backBtn = poemDiv.querySelector("#single-poem-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      poemDiv.remove();
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }

  // If mobile => reading mode on click (except the back button)
  poemDiv.addEventListener("click", e => {
    if (e.target.id === "single-poem-back-btn") return; // skip
    if (isMobileDevice) {
      const closeLabel = t("labels.close");
      const poemTitle = titleUsed || t("labels.untitledPoem");
      enterReadingMode(poemTitle, textUsed, closeLabel);
    }
  });
}

/** Show multiple poems in the “wheel” format */
function displayPoemsWheel(poemsArray) {
  // Hide single-poem if any
  const existing = document.getElementById("displayed-poem");
  if (existing) existing.remove();

  // Show wheel container
  const wheelContainer = document.getElementById("poems-wheel-container");
  if (!wheelContainer) return;
  wheelContainer.style.display = "";

  // The list container
  const wheelList = document.getElementById("wheel-list");
  if (!wheelList) return;

  // Clear old
  wheelList.innerHTML = "";

  // Sort poems by title (based on current language)
  const sorted = poemsArray.slice().sort((a,b)=>{
    const aTitle = currentLanguage==="en" ? a.title_en : (a.title_it||a.title_en);
    const bTitle = currentLanguage==="en" ? b.title_en : (b.title_it||b.title_en);
    return (aTitle||"").localeCompare(bTitle||"");
  });

  // Build items
  sorted.forEach((poem, idx) => {
    const li = document.createElement("div");
    li.classList.add("wheel-item");
    li.dataset.index = String(idx);
    const dateUsed = currentLanguage === "en" ? (poem.date_en||"") : (poem.date_it||poem.date_en||"");
    const titleUsed = currentLanguage === "en" ? (poem.title_en||"") : (poem.title_it||poem.title_en||"");
    li.textContent = titleUsed || "Untitled";

    li.addEventListener("click", () => {
      // If this item is the center => open the poem
      const centerIdx = getCenterIndex();
      const myIdx = parseInt(li.dataset.index,10);
      if (myIdx === centerIdx) {
        // open reading overlay
        const textUsed = currentLanguage==="en" ? (poem.poem_en||"") : (poem.poem_it||poem.poem_en||"");
        const poemTitle = titleUsed || t("labels.untitledPoem");
        enterReadingMode(poemTitle, textUsed, t("labels.close"));
      }
    });

    wheelList.appendChild(li);
  });

  // Initialize at center index 0
  currentWheelIndex = 0;
  renderWheelItems();
}

/* The “center” item index in the wheel data */
let currentWheelIndex = 0;

function spinWheel(direction) {
  // direction +1 => move down => center item index++
  // direction -1 => move up => center item index--
  currentWheelIndex += direction;
  renderWheelItems();
}

function getCenterIndex(){
  // in the sorted array, center is currentWheelIndex
  return currentWheelIndex;
}

/** Re-render the wheel items so the center is bigger, etc. */
function renderWheelItems() {
  const wheelList = document.getElementById("wheel-list");
  if (!wheelList) return;
  const items = wheelList.querySelectorAll(".wheel-item");
  if (!items.length) return;

  const total = items.length;
  // Because we want it to wrap, handle currentWheelIndex
  // For wrap-around, we can do a mod
  currentWheelIndex = ((currentWheelIndex % total) + total) % total;

  items.forEach((it) => {
    it.classList.remove("center");
  });
  // The center item
  const centerItem = items[currentWheelIndex];
  if (centerItem) {
    centerItem.classList.add("center");
  }

  // We want a transform so that center item is in middle
  // We'll approximate an offset so that center item is in center of container
  // e.g. each item ~ 50px height total. Or we read offsetHeight, though that's more advanced.

  // Let's store them in an array
  const itemArray = Array.from(items);
  const itemHeight = 40; // approximate space per item
  // We want center item to be visually in the middle
  const offset = (itemArray.indexOf(centerItem))*itemHeight;

  // Shift the list by negative offset from the center
  wheelList.style.transform = `translateY(${120 - offset}px)`;
}

/* Minimal reading mode overlay, reused from single-poem or wheel center click */
function enterReadingMode(title, text, closeLabel) {
  const overlay = document.createElement("div");
  overlay.classList.add("reading-overlay");

  const closeBtn = document.createElement("div");
  closeBtn.style.cursor = "pointer";
  closeBtn.style.textAlign = "right";
  closeBtn.style.fontSize = "1.2em";
  closeBtn.style.marginBottom = "20px";
  closeBtn.textContent = closeLabel || "Close ✕";

  const h2 = document.createElement("h2");
  h2.textContent = title || "";

  const textDiv = document.createElement("div");
  textDiv.innerHTML = (text || "").replace(/\n/g,"<br>");

  overlay.appendChild(closeBtn);
  overlay.appendChild(h2);
  overlay.appendChild(textDiv);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", () => {
    overlay.remove();
  });
}
