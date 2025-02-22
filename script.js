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

/* For wheel logic */
let poemsForWheel = [];         // array of poems for the current day
let currentWheelIndex = 0;      // which poem is "center"
let startPointerY = 0;          // pointerdown initial Y
let accumulatedOffset = 0;      // how much drag offset in px
let rowHeight = 40;             // approximate row height (match CSS)
let isDraggingWheel = false;

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

  // Set up "Back" button for wheel
  const backToCalendarBtn = document.getElementById("back-to-calendar-btn");
  if (backToCalendarBtn) {
    backToCalendarBtn.addEventListener("click", () => {
      // hide wheel, show calendar
      const wheel = document.getElementById("poems-wheel-container");
      const poemsContainer = document.getElementById("poems-container");
      if (wheel) wheel.style.display = "none";
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }

  // Setup pointer events for the wheel body
  const wheelBody = document.getElementById("wheel-list-body");
  if (wheelBody) {
    wheelBody.addEventListener("pointerdown", onWheelPointerDown);
    wheelBody.addEventListener("pointermove", onWheelPointerMove);
    wheelBody.addEventListener("pointerup", onWheelPointerUp);
    wheelBody.addEventListener("pointercancel", onWheelPointerUp);
    wheelBody.addEventListener("pointerleave", onWheelPointerUp);
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
   FETCH & DISPLAY POEMS
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
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty array");
      }
      // Hide the calendar
      const poemsContainer = document.getElementById("poems-container");
      if (poemsContainer) poemsContainer.style.display = "none";

      if (data.length === 1) {
        displaySinglePoem(data[0]);
      } else {
        // Multiple poems => wheel mode
        poemsForWheel = data.slice();
        showPoemWheel();
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

/** Single poem display with a "Back" button */
function displaySinglePoem(poemObj) {
  removeWheel();
  
  const existingPoemDiv = document.getElementById("displayed-poem");
  if (existingPoemDiv) existingPoemDiv.remove();

  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  const poemDiv = document.createElement("div");
  poemDiv.id = "displayed-poem";
  poemDiv.style.marginTop = "1em";
  poemDiv.style.padding = "1em";
  poemDiv.style.border = "1px solid #666";

  const dateUsed = currentLanguage==="en" ? poemObj.date_en : (poemObj.date_it||poemObj.date_en||"");
  const titleUsed = currentLanguage==="en" ? poemObj.title_en : (poemObj.title_it||poemObj.title_en||"");
  const textUsed = currentLanguage==="en" ? poemObj.poem_en : (poemObj.poem_it||poemObj.poem_en||"");

  poemDiv.innerHTML = `
    <h2>${titleUsed||""}</h2>
    <p style="font-style:italic;">${dateUsed||""}</p>
    <div class="poem-content">
      ${(textUsed||"").replace(/\n/g,"<br>")}
    </div>
    <div style="margin-top:1em;">
      <button id="single-poem-back-btn">${t("labels.back")||"Back"}</button>
    </div>
  `;

  mainContent.appendChild(poemDiv);

  // back => show calendar again
  const backBtn = poemDiv.querySelector("#single-poem-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      poemDiv.remove();
      const poemsContainer = document.getElementById("poems-container");
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }

  // If mobile => reading mode on click
  poemDiv.addEventListener("click", e => {
    if (e.target.id === "single-poem-back-btn") return; // skip
    if (isMobileDevice) {
      const poemTitle = titleUsed || t("labels.untitledPoem");
      enterReadingMode(poemTitle, textUsed||"", t("labels.close")||"Close");
    }
  });
}

/** Show multiple poems in a single column "wheel" table */
function showPoemWheel() {
  // remove single poem if any
  const singlePoemDiv = document.getElementById("displayed-poem");
  if (singlePoemDiv) singlePoemDiv.remove();

  // Show the wheel container
  const wheelContainer = document.getElementById("poems-wheel-container");
  if (wheelContainer) wheelContainer.style.display = "";

  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  
  // Clear old
  wheelBody.innerHTML = "";

  // Sort poems alphabetically by title
  poemsForWheel.sort((a,b)=>{
    const aTitle = (currentLanguage==="en" ? a.title_en : (a.title_it||a.title_en))||"";
    const bTitle = (currentLanguage==="en" ? b.title_en : (b.title_it||b.title_en))||"";
    return aTitle.localeCompare(bTitle);
  });

  // Insert rows
  poemsForWheel.forEach((poem, idx)=>{
    const tr = document.createElement("tr");
    tr.dataset.index = String(idx);
    tr.style.cursor = "pointer";

    const titleUsed = (currentLanguage==="en"? poem.title_en : (poem.title_it||poem.title_en)) || "Untitled";
    tr.innerHTML = `<td>${titleUsed}</td>`;

    tr.addEventListener("click", ()=>{
      // If user taps the center row => show reading mode
      const centerIdx = currentWheelIndex;
      if (idx === centerIdx) {
        const textUsed = currentLanguage==="en"? (poem.poem_en||"") : (poem.poem_it||poem.poem_en||"");
        enterReadingMode(titleUsed, textUsed, t("labels.close")||"Close");
      }
    });

    wheelBody.appendChild(tr);
  });

  currentWheelIndex = 0; // reset
  accumulatedOffset = 0; 
  renderWheel();
}

/** Removes or hides the wheel container */
function removeWheel() {
  const wheelContainer = document.getElementById("poems-wheel-container");
  if (wheelContainer) wheelContainer.style.display = "none";
}

/** Renders which row is "center" and applies .center class */
function renderWheel() {
  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;

  // Because we want to wrap
  const total = rows.length;
  currentWheelIndex = ((currentWheelIndex % total) + total) % total;

  rows.forEach(r => r.classList.remove("center"));
  const centerRow = rows[currentWheelIndex];
  if (centerRow) centerRow.classList.add("center");
}

/** Pointer events for drag scrolling */
function onWheelPointerDown(e) {
  isDraggingWheel = true;
  e.target.setPointerCapture(e.pointerId);
  startPointerY = e.clientY;
}
function onWheelPointerMove(e) {
  if (!isDraggingWheel) return;
  const deltaY = e.clientY - startPointerY;

  // If user drags more than rowHeight => move up/down one item
  const threshold = rowHeight * 0.5; 
  if (Math.abs(deltaY) > threshold) {
    if (deltaY < 0) {
      // user dragged up => next item
      currentWheelIndex++;
    } else {
      // user dragged down => prev item
      currentWheelIndex--;
    }
    // reset
    startPointerY = e.clientY;
    renderWheel();
  }
}
function onWheelPointerUp(e) {
  isDraggingWheel = false;
  e.target.releasePointerCapture(e.pointerId);
}

/* Minimal reading mode overlay, reused from single-poem or wheel center click */
function enterReadingMode(title, text, closeLabel) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0", left: "0",
    width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.9)",
    color: "#fff",
    zIndex: "9999",
    overflowY: "auto",
    padding: "20px"
  });

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
