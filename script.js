console.log("script.js loaded.");

/** 
 * Global state
 */
let currentLanguage = "en";
let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

// For the calendar
const earliestDate = new Date(2024, 9, 24); // 2024-10-24
const today = new Date();
let calendarYear = 0;
let calendarMonth = 0; // 0-based

// If you have localized strings in "gui.json", we load them. Otherwise can skip.
let guiData = null;

/** 
 * For the "Price Is Right" infinite wheel 
 */
let poemsForWheel = [];  // The original set of poems for a given day
let isDraggingWheel = false;
let startPointerY = 0;
let snapEnabled = true; 
const WHEEL_REPEAT_COUNT = 5; 
// We'll replicate poemsForWheel WHEEL_REPEAT_COUNT times, 
// so user can scroll/drag seamlessly in a large list.

/** On DOM Ready **/
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired.");

  await loadGuiData();
  initializePage();
  setupSideMenu();
  setupLanguageToggle();
});

/* ------------------------------------------------------------------
   LOAD GUI JSON (IF APPLICABLE)
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
   HELPER: t(path)
------------------------------------------------------------------ */
function t(path) {
  if (!guiData) return path;
  const segs = path.split(".");
  const fallback = guiData["en"] || {};
  let langObj = guiData[currentLanguage] || fallback;
  let val = langObj;
  for (let s of segs) {
    if (val[s] === undefined) {
      // fallback
      val = fallback;
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
   PAGE INIT
------------------------------------------------------------------ */
function initializePage() {
  detectOrLoadLanguage();
  updateLanguageToggle();
  // Default load = About
  loadAboutSection();
}

function setupSideMenu() {
  const menu = document.getElementById("side-menu");
  if (!menu) return;
  const menuItems = menu.querySelectorAll("a[data-section]");
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

  // Hamburger toggles the menu
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
        !menu.contains(e.target)
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

  // If #main-content has a .calendar-container => reload Poetry
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  const foundCalendar = mainContent.querySelector(".calendar-container");
  if (foundCalendar) {
    loadPoetrySection();
  } else {
    loadAboutSection();
  }
}

function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.textContent = (currentLanguage === "en") ? "ENG" : "ITA";
}

/* ------------------------------------------------------------------
   ABOUT SECTION
------------------------------------------------------------------ */
function loadAboutSection() {
  const main = document.getElementById("main-content");
  if (!main) return;
  main.innerHTML = `<div>${t("aboutSection") || "<p>About content here.</p>"}</div>`;
}

/* ------------------------------------------------------------------
   POETRY SECTION => CALENDAR
------------------------------------------------------------------ */
function loadPoetrySection() {
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

/**
 * Render the calendar for a given year/month into container
 */
function renderCalendarView(year, month, container) {
  container.innerHTML = ""; 

  // Nav bar
  const navDiv = document.createElement("div");
  navDiv.style.display = "flex";
  navDiv.style.justifyContent = "space-between";
  navDiv.style.alignItems = "center";
  navDiv.style.marginBottom = "1em";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = t("labels.prev") || "Prev";
  prevBtn.addEventListener("click", goToPrev);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = t("labels.next") || "Next";
  nextBtn.addEventListener("click", goToNext);

  const monthSpan = document.createElement("span");
  monthSpan.style.fontWeight = "bold";
  monthSpan.textContent = `${getMonthName(month)} ${year}`;

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(monthSpan);
  navDiv.appendChild(nextBtn);
  container.appendChild(navDiv);

  // Check range for prev/next
  const prevMonthDate = new Date(year, month-1, 1);
  if (prevMonthDate < earliestDate) {
    prevBtn.disabled = true;
  }
  const nextMonthDate = new Date(year, month+1, 1);
  const nextCutoff = new Date(today.getFullYear(), today.getMonth(), 1);
  if (nextMonthDate > nextCutoff) {
    nextBtn.disabled = true;
  }

  // Table
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

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
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
    const currentDate = new Date(year, month, d);
    td.textContent = String(d);

    // If out of range
    if (currentDate < earliestDate || currentDate > today) {
      td.style.opacity = "0.3";
    } else {
      td.style.cursor = "pointer";
      td.onclick = () => {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
        const dd = String(currentDate.getDate()).padStart(2, "0");
        loadPoemsByDate(`${yyyy}-${mm}-${dd}`);
      };
    }

    // highlight "today"
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

  function goToPrev() {
    if (month === 0) {
      calendarYear = year - 1;
      calendarMonth = 11;
    } else {
      calendarYear = year;
      calendarMonth = month - 1;
    }
    renderCalendarView(calendarYear, calendarMonth, container);
  }
  function goToNext() {
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
  if (!Array.isArray(months) || months.length<12) {
    months = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];
  }
  return months[m] || "";
}
function getDayNames() {
  let days = t("calendar.daysOfWeek");
  if (!Array.isArray(days) || days.length<7) {
    days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  }
  return days;
}

/* ------------------------------------------------------------------
   LOAD POEMS => SHOW WHEEL (INFINITE)
------------------------------------------------------------------ */
function loadPoemsByDate(dateStr) {
  // e.g. fetch from "poetry/2025-03-01.json"
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
      if (data.length === 1) {
        displaySinglePoem(data[0]);
      } else {
        poemsForWheel = data.slice();
        showPoemsWheelOverlay();
      }
    })
    .catch(err => {
      console.warn("No poem found for", dateStr, err);
      alert(t("errors.noPoemFound") + ": " + dateStr);
    });
}

/* ------------------------------------------------------------------
   SINGLE POEM => DIRECT READING OVERLAY
------------------------------------------------------------------ */
function displaySinglePoem(poem) {
  const titleUsed = (currentLanguage === "en")
    ? (poem.title_en || "Untitled")
    : (poem.title_it || poem.title_en || "Untitled");
  const textUsed = (currentLanguage === "en")
    ? (poem.poem_en || "")
    : (poem.poem_it || poem.poem_en || "");
  showReadingOverlay(titleUsed, textUsed);
}

/* ------------------------------------------------------------------
   INFINITE "PRICE IS RIGHT" WHEEL
------------------------------------------------------------------ */
function showPoemsWheelOverlay() {
  // If overlay doesn't exist, create it
  let overlay = document.getElementById("poem-wheel-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "poem-wheel-overlay";
    overlay.innerHTML = `
      <button id="wheel-close-btn">×</button>
      <div id="wheel-inner">
        <table><tbody id="wheel-list-body"></tbody></table>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Close button
  const closeBtn = overlay.querySelector("#wheel-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => { overlay.style.display = "none"; }, 400);
  };

  // Build the infinite list
  const extendedPoems = buildInfiniteList(poemsForWheel, WHEEL_REPEAT_COUNT);
  const wheelBody = overlay.querySelector("#wheel-list-body");
  if (!wheelBody) return;
  wheelBody.innerHTML = "";
  wheelBody.scrollTop = 0;

  extendedPoems.forEach((poemObj, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.index = String(idx);

    tr.innerHTML = `<td>${poemObj.title}</td>`;

    // On click => if center row, show reading
    tr.addEventListener("click", () => {
      const centerIdx = findCenterIndex(wheelBody);
      if (parseInt(tr.dataset.index) === centerIdx) {
        // original poem index => poemObj.originalIndex
        const poemRef = poemsForWheel[poemObj.originalIndex];
        const tUsed = (currentLanguage === "en")
          ? (poemRef.title_en || "Untitled")
          : (poemRef.title_it || poemRef.title_en || "Untitled");
        const pUsed = (currentLanguage === "en")
          ? (poemRef.poem_en || "")
          : (poemRef.poem_it || poemRef.poem_en || "");
        showReadingOverlay(tUsed, pUsed);
      }
    });
    wheelBody.appendChild(tr);
  });

  // Attach drag/scroll events
  wheelBody.addEventListener("pointerdown", onWheelPointerDown);
  wheelBody.addEventListener("pointermove", onWheelPointerMove);
  wheelBody.addEventListener("pointerup", onWheelPointerUp);
  wheelBody.addEventListener("pointercancel", onWheelPointerUp);
  wheelBody.addEventListener("pointerleave", onWheelPointerUp);
  wheelBody.addEventListener("scroll", () => {
    updateWheelLayout(wheelBody);
    checkLoopEdge(wheelBody, extendedPoems.length);
  });

  wheelBody.style.userSelect = "none";

  // Show overlay
  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
    // Put scroll near the middle
    centerScrollAtMiddle(wheelBody, extendedPoems.length);
    updateWheelLayout(wheelBody);
  }, 50);
}

/**
 * Build an "infinite" list by replicating poemsForWheel N times.
 * Return array of objects:
 *   {
 *     title: string,
 *     originalIndex: number
 *   }
 */
function buildInfiniteList(poems, repeatCount) {
  const out = [];
  // For each repetition, push the poems
  for (let r = 0; r < repeatCount; r++) {
    poems.forEach((poem, i) => {
      const titleUsed = (currentLanguage === "en")
        ? (poem.title_en || "Untitled")
        : (poem.title_it || poem.title_en || "Untitled");
      out.push({
        title: titleUsed,
        originalIndex: i
      });
    });
  }
  return out;
}

/**
 * Scroll the wheel to the middle block so it starts near center
 */
function centerScrollAtMiddle(wheelBody, totalRows) {
  const rowHeight = 60; // each TR is 60px tall
  // Let's jump to around the middle chunk
  const middleBlockIndex = Math.floor(totalRows / 2);
  wheelBody.scrollTop = middleBlockIndex * rowHeight;
}

/**
 * If near top or bottom, jump back to the middle so user sees an endless loop
 */
function checkLoopEdge(wheelBody, totalRows) {
  const rowHeight = 60; 
  const fullHeight = totalRows * rowHeight;
  const buffer = 3 * rowHeight; 

  if (wheelBody.scrollTop < buffer) {
    // jump near middle
    wheelBody.scrollTop += fullHeight/2;
  } else if (wheelBody.scrollTop + wheelBody.clientHeight > (fullHeight - buffer)) {
    wheelBody.scrollTop -= fullHeight/2;
  }
}

/**
 * Find center row index in the extended list
 */
function findCenterIndex(wheelBody) {
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return 0;
  const rect = wheelBody.getBoundingClientRect();
  const cy = rect.height / 2;

  let minDist = Infinity;
  let closest = 0;
  rows.forEach((row, i) => {
    const rRect = row.getBoundingClientRect();
    // row center relative to container top
    const rowCenterY = (rRect.top + rRect.bottom)/2 - rect.top;
    const dist = Math.abs(rowCenterY - cy);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  });
  return closest;
}

/**
 * Scale/opacity each row based on distance to center
 */
function updateWheelLayout(wheelBody) {
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;
  const rect = wheelBody.getBoundingClientRect();
  const cy = rect.height / 2;

  rows.forEach(row => {
    const rRect = row.getBoundingClientRect();
    const rowCenterY = (rRect.top + rRect.bottom)/2 - rect.top;
    const dist = Math.abs(rowCenterY - cy);

    // scale in [0.8..1.3], fade in [0.5..1.0]
    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist/cy)*0.5;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;

    row.style.transform = `scale(${scale})`;
    row.style.opacity = String(0.5 + (scale - minScale));
    row.classList.remove("active");
  });

  const ci = findCenterIndex(wheelBody);
  if (rows[ci]) rows[ci].classList.add("active");
}

/**
 * DRAG SCROLL
 */
function onWheelPointerDown(e) {
  isDraggingWheel = true;
  e.target.setPointerCapture(e.pointerId);
  startPointerY = e.clientY;
}

function onWheelPointerMove(e) {
  if (!isDraggingWheel) return;
  const deltaY = e.clientY - startPointerY;
  startPointerY = e.clientY;
  const wheelBody = e.currentTarget;
  let st = wheelBody.scrollTop - deltaY;
  if (st < 0) st = 0;
  wheelBody.scrollTop = st;
  updateWheelLayout(wheelBody);
}

function onWheelPointerUp(e) {
  if (isDraggingWheel) {
    e.target.releasePointerCapture(e.pointerId);
    isDraggingWheel = false;
    if (snapEnabled) {
      snapToClosestRow(e.currentTarget);
    }
  }
}

function snapToClosestRow(wheelBody) {
  const ci = findCenterIndex(wheelBody);
  const row = wheelBody.querySelectorAll("tr")[ci];
  if (!row) return;
  const rect = wheelBody.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const rowMidY = (rowRect.top + rowRect.bottom)/2 - rect.top;
  const dist = rowMidY - rect.height/2;
  wheelBody.scrollTop += dist;
  updateWheelLayout(wheelBody);
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
    setTimeout(() => { overlay.style.display = "none"; }, 400);
  };

  const titleEl = overlay.querySelector("#poem-overlay-title");
  const contentEl = overlay.querySelector("#poem-overlay-content");
  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.textContent = text;

  overlay.style.display = "block";
  setTimeout(() => overlay.classList.add("show"), 50);
}
