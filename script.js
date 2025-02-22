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

/* For the new wheel logic */
let poemsForWheel = [];      // poems for the current day
let isDraggingWheel = false;
let startPointerY = 0;
let rowHeight = 60;          // base row height (in px)
let snapEnabled = true;      // snap to nearest row on pointer up

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired.");

  await loadGuiData();
  initializePage();

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

  updateSideMenuLabels();
});

/* ------------------------------------------------------------------
   Load gui.json Data
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
   Helper: t(path)
------------------------------------------------------------------ */
function t(path) {
  if (!guiData) return path;
  const segs = path.split(".");
  let langObj = guiData[currentLanguage] || guiData["en"] || {};
  let val = langObj;
  for (let s of segs) {
    if (val[s] === undefined) {
      val = guiData["en"] || {};
      for (let s2 of segs) {
        if (val[s2] === undefined) {
          return path;
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
      toggleLanguage();
      if (activeSection === "poetry") {
        loadPoetrySection();
      } else if (activeSection === "about") {
        loadAboutSection();
      }
    });
  }

  activeSection = "about";
  loadAboutSection();

  const backToCalendarBtn = document.getElementById("back-to-calendar-btn");
  if (backToCalendarBtn) {
    backToCalendarBtn.addEventListener("click", () => {
      const wheel = document.getElementById("poems-wheel-container");
      const poemsContainer = document.getElementById("poems-container");
      if (wheel) wheel.style.display = "none";
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }

  const overlayClose = document.getElementById("poem-overlay-close");
  if (overlayClose) {
    overlayClose.addEventListener("click", () => {
      const overlay = document.getElementById("poem-overlay");
      if (overlay) overlay.style.display = "none";
    });
  }

  const wheelBody = document.getElementById("wheel-list-body");
  if (wheelBody) {
    wheelBody.addEventListener("pointerdown", onWheelPointerDown);
    wheelBody.addEventListener("pointermove", onWheelPointerMove);
    wheelBody.addEventListener("pointerup", onWheelPointerUp);
    wheelBody.addEventListener("pointercancel", onWheelPointerUp);
    wheelBody.addEventListener("pointerleave", onWheelPointerUp);
    wheelBody.style.userSelect = "none";
  }
}

/* ------------------------------------------------------------------
   LANGUAGE DETECTION & TOGGLE
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

function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.textContent = currentLanguage === "en" ? "ENG" : "ITA";
}

/* ------------------------------------------------------------------
   SIDE MENU FUNCTIONS
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
   ABOUT SECTION
------------------------------------------------------------------ */
function loadAboutSection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  mainContent.innerHTML = t("aboutSection");
}

/* ------------------------------------------------------------------
   POETRY SECTION => CALENDAR & POEM WHEEL
------------------------------------------------------------------ */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  const heading = t("poetryHeading");
  mainContent.innerHTML = `<h1>${heading}</h1><div id="poems-container"></div>`;
  if (!calendarYear || !calendarMonth) {
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
  }
  renderCalendarView(calendarYear, calendarMonth);
}

function renderCalendarView(year, month) {
  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;
  poemsContainer.innerHTML = "";

  const navDiv = document.createElement("div");
  navDiv.style.display = "flex";
  navDiv.style.justifyContent = "space-between";
  navDiv.style.alignItems = "center";
  navDiv.style.marginBottom = "1em";

  const monthName = getMonthName(month);
  const title = document.createElement("span");
  title.style.fontWeight = "bold";
  title.textContent = `${monthName} ${year}`;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = t("labels.prev");
  prevBtn.addEventListener("click", () => { goToPrevMonth(); });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = t("labels.next");
  nextBtn.addEventListener("click", () => { goToNextMonth(); });

  const prevMonthDate = new Date(year, month - 1, 1);
  if (prevMonthDate < earliestDate) { prevBtn.disabled = true; }
  const nextMonthDate = new Date(year, month + 1, 1);
  if (nextMonthDate > new Date(today.getFullYear(), today.getMonth(), 1)) { nextBtn.disabled = true; }

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(title);
  navDiv.appendChild(nextBtn);
  poemsContainer.appendChild(navDiv);

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

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekday = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  let row = document.createElement("tr");
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

function getMonthName(mIndex) {
  let months = t("calendar.months");
  if (!Array.isArray(months) || months.length < 12) {
    months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  }
  return months[mIndex] || "";
}
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
      // Hide calendar container
      const poemsContainer = document.getElementById("poems-container");
      if (poemsContainer) poemsContainer.style.display = "none";

      if (data.length === 1) {
        displaySinglePoem(data[0]);
      } else {
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

/** Display a single poem with a Back button. */
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

  const dateUsed = currentLanguage === "en" ? poemObj.date_en : (poemObj.date_it || poemObj.date_en || "");
  const titleUsed = currentLanguage === "en" ? poemObj.title_en : (poemObj.title_it || poemObj.title_en || "");
  const textUsed = currentLanguage === "en" ? (poemObj.poem_en || "") : (poemObj.poem_it || poemObj.poem_en || "");

  poemDiv.innerHTML = `
    <h2>${titleUsed || ""}</h2>
    <p style="font-style:italic;">${dateUsed || ""}</p>
    <div class="poem-content">
      ${(textUsed || "").replace(/\n/g, "<br>")}
    </div>
    <div style="margin-top:1em;">
      <button id="single-poem-back-btn">${t("labels.back") || "Back"}</button>
    </div>
  `;
  mainContent.appendChild(poemDiv);

  const backBtn = poemDiv.querySelector("#single-poem-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      poemDiv.remove();
      const poemsContainer = document.getElementById("poems-container");
      if (poemsContainer) poemsContainer.style.display = "";
    });
  }

  poemDiv.addEventListener("click", e => {
    if (e.target.id === "single-poem-back-btn") return;
    if (isMobileDevice) {
      showReadingOverlay(titleUsed || t("labels.untitledPoem"), textUsed);
    }
  });
}

/** Show the poem wheel when multiple poems exist */
function showPoemWheel() {
  const singlePoemDiv = document.getElementById("displayed-poem");
  if (singlePoemDiv) singlePoemDiv.remove();

  const wheelContainer = document.getElementById("poems-wheel-container");
  if (wheelContainer) wheelContainer.style.display = "block";

  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  wheelBody.innerHTML = "";

  // Sort the poems alphabetically by title
  poemsForWheel.sort((a, b) => {
    const aTitle = currentLanguage === "en" ? (a.title_en || "") : (a.title_it || a.title_en || "");
    const bTitle = currentLanguage === "en" ? (b.title_en || "") : (b.title_it || b.title_en || "");
    return aTitle.localeCompare(bTitle);
  });

  // Create a row for each poem
  poemsForWheel.forEach((poem, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.index = String(idx);
    const titleUsed = currentLanguage === "en" ? (poem.title_en || "Untitled") : (poem.title_it || poem.title_en || "Untitled");
    tr.innerHTML = `<td>${titleUsed}</td>`;
    tr.addEventListener("click", () => {
      const selectedIndex = findCenterIndex();
      if (parseInt(tr.dataset.index) === selectedIndex) {
        const textUsed = currentLanguage === "en" ? (poem.poem_en || "") : (poem.poem_it || poem.poem_en || "");
        showReadingOverlay(titleUsed, textUsed);
      }
    });
    wheelBody.appendChild(tr);
  });

  updateWheelLayout();
}

/** Hide the wheel container. */
function removeWheel() {
  const wheelContainer = document.getElementById("poems-wheel-container");
  if (wheelContainer) wheelContainer.style.display = "none";
}

/** Returns the index of the row closest to the center of the wheel container. */
function findCenterIndex() {
  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return 0;
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return 0;
  let minDist = Infinity, centerIndex = 0;
  const containerRect = wheelBody.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;
  rows.forEach((row, i) => {
    const rect = row.getBoundingClientRect();
    const rowCenter = rect.top + rect.height / 2 - containerRect.top;
    const dist = Math.abs(rowCenter - containerCenterY);
    if (dist < minDist) {
      minDist = dist;
      centerIndex = i;
    }
  });
  return centerIndex;
}

/** Update wheel layout: scale rows based on distance from center and mark the active row. */
function updateWheelLayout() {
  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;
  const containerRect = wheelBody.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;
  rows.forEach((row) => {
    const rect = row.getBoundingClientRect();
    const rowMid = rect.top + rect.height / 2 - containerRect.top;
    const dist = Math.abs(rowMid - containerCenterY);
    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist / containerCenterY) * 0.5;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;
    row.style.transform = `scale(${scale})`;
    row.style.opacity = `${0.5 + (scale - minScale)}`;
    row.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    row.classList.remove("active");
  });
  const centerIndex = findCenterIndex();
  if (rows[centerIndex]) {
    rows[centerIndex].classList.add("active");
  }
}

/* Pointer event handlers for the wheel */
function onWheelPointerDown(e) {
  isDraggingWheel = true;
  e.target.setPointerCapture(e.pointerId);
  startPointerY = e.clientY;
}
function onWheelPointerMove(e) {
  if (!isDraggingWheel) return;
  const deltaY = e.clientY - startPointerY;
  startPointerY = e.clientY;
  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  let newScrollTop = wheelBody.parentElement.scrollTop - deltaY;
  if (newScrollTop < 0) newScrollTop = 0;
  wheelBody.parentElement.scrollTop = newScrollTop;
  updateWheelLayout();
}
function onWheelPointerUp(e) {
  if (isDraggingWheel) {
    e.target.releasePointerCapture(e.pointerId);
    isDraggingWheel = false;
    if (snapEnabled) {
      snapToClosestRow();
    }
  }
}
function snapToClosestRow() {
  const wheelBody = document.getElementById("wheel-list-body");
  if (!wheelBody) return;
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;
  const container = wheelBody.parentElement;
  const containerRect = container.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;
  let minDist = Infinity, closestRow = rows[0];
  rows.forEach(row => {
    const rect = row.getBoundingClientRect();
    const rowCenter = rect.top + rect.height / 2 - containerRect.top;
    const dist = Math.abs(rowCenter - containerCenterY);
    if (dist < minDist) {
      minDist = dist;
      closestRow = row;
    }
  });
  if (closestRow) {
    const rowRect = closestRow.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2 - containerRect.top;
    const distToCenter = rowCenter - containerCenterY;
    container.scrollTop += distToCenter;
    updateWheelLayout();
  }
}

/** Show reading overlay (for the center item or single poem) */
function showReadingOverlay(title, text) {
  const overlay = document.getElementById("poem-overlay");
  if (!overlay) return;
  overlay.style.display = "block";
  const overlayTitle = document.getElementById("poem-overlay-title");
  if (overlayTitle) overlayTitle.textContent = title || "";
  const overlayContent = document.getElementById("poem-overlay-content");
  if (overlayContent) overlayContent.innerHTML = (text || "").replace(/\n/g, "<br>");
}
