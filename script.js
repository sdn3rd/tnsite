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

// Holds the parsed "gui.json" data
let guiData = null;

/** 
 * For the "Price Is Right" wheel 
 */
let poemsForWheel = [];
let isDraggingWheel = false;
let startPointerY = 0;
let snapEnabled = true; // snap to center row on pointer up

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired.");

  // 1) Load GUI data (if you have a gui.json; otherwise skip)
  await loadGuiData();

  // 2) Initialize the page
  initializePage();

  // 3) Setup side menu link clicks
  const menu = document.getElementById("side-menu");
  if (menu) {
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
  }

  // 4) Language toggle
  const langToggle = document.getElementById("language-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", toggleLanguage);
    langToggle.addEventListener("keypress", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLanguage();
      }
    });
  }
});

/* ------------------------------------------------------------------
   Load the gui.json (if applicable)
------------------------------------------------------------------ */
async function loadGuiData() {
  // If you have a "gui.json" for translations, fetch it:
  try {
    const resp = await fetch("gui.json");
    if (!resp.ok) throw new Error(`Failed to load gui.json: ${resp.status}`);
    guiData = await resp.json();
    console.log("guiData loaded:", guiData);
  } catch (err) {
    console.warn("No gui.json found or error loading it:", err);
    guiData = null;
  }
}

/* ------------------------------------------------------------------
   HELPER: t(path)
   Returns a translated string from guiData, or the path if not found.
------------------------------------------------------------------ */
function t(path) {
  if (!guiData) return path;
  const segs = path.split(".");
  const fallback = guiData["en"] || {};
  let langObj = guiData[currentLanguage] || fallback;
  let val = langObj;
  for (let s of segs) {
    if (val[s] === undefined) {
      // fallback to "en"
      val = fallback;
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
   INITIAL PAGE SETUP
------------------------------------------------------------------ */
function initializePage() {
  // 1) Hamburger menu
  setupHamburgerMenu();

  // 2) Detect or load language
  detectOrLoadLanguage();
  updateLanguageToggle();

  // 3) Load "About" section by default
  loadAboutSection();
}

/* ------------------------------------------------------------------
   SIDE MENU LOGIC
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

  // Click anywhere outside to close
  document.addEventListener("click", e => {
    if (
      document.body.classList.contains("menu-open") &&
      !hamburger.contains(e.target)
    ) {
      const sideMenu = document.getElementById("side-menu");
      if (sideMenu && !sideMenu.contains(e.target)) {
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

  // Re-render if in Poetry or About
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // Heuristics: if the main-content has a .calendar-container => re-load poetry
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
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  mainContent.innerHTML = `
    <div>
      ${t("aboutSection") || "<p>About section goes here.</p>"}
    </div>
  `;
}

/* ------------------------------------------------------------------
   POETRY SECTION => MONTHLY CALENDAR
------------------------------------------------------------------ */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  mainContent.innerHTML = ""; // clear

  // If year/month not set, default to "today"
  if (!calendarYear) {
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
  }

  // Create container
  const div = document.createElement("div");
  div.classList.add("calendar-container");
  mainContent.appendChild(div);

  renderCalendarView(calendarYear, calendarMonth, div);
}

function renderCalendarView(year, month, container) {
  container.innerHTML = ""; // clear old

  // Nav bar
  const navDiv = document.createElement("div");
  navDiv.style.display = "flex";
  navDiv.style.justifyContent = "space-between";
  navDiv.style.alignItems = "center";
  navDiv.style.marginBottom = "1em";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = t("labels.prev") || "Prev";
  prevBtn.addEventListener("click", goToPrevMonth);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = t("labels.next") || "Next";
  nextBtn.addEventListener("click", goToNextMonth);

  const monthName = getMonthName(month);
  const titleSpan = document.createElement("span");
  titleSpan.style.fontWeight = "bold";
  titleSpan.textContent = `${monthName} ${year}`;

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(titleSpan);
  navDiv.appendChild(nextBtn);
  container.appendChild(navDiv);

  // Check if prev is allowed
  const prevMonthDate = new Date(year, month - 1, 1);
  if (prevMonthDate < earliestDate) {
    prevBtn.disabled = true;
  }
  // Check if next is allowed
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonthCutoff = new Date(today.getFullYear(), today.getMonth(), 1);
  if (nextMonthDate > nextMonthCutoff) {
    nextBtn.disabled = true;
  }

  // Build table
  const table = document.createElement("table");
  table.classList.add("calendar-table");

  // Days-of-week row
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
  // empty cells before the 1st
  for (let i = 0; i < startWeekday; i++) {
    const td = document.createElement("td");
    row.appendChild(td);
  }

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    if (row.children.length >= 7) {
      table.appendChild(row);
      row = document.createElement("tr");
    }
    const td = document.createElement("td");
    const current = new Date(year, month, dayNum);
    td.textContent = dayNum;

    // If out of range
    if (current < earliestDate || current > today) {
      td.style.opacity = "0.3";
    } else {
      td.style.cursor = "pointer";
      td.addEventListener("click", () => {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth()+1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        loadPoemsByDate(dateStr);
      });
    }

    // highlight "today"
    if (
      current.getFullYear() === today.getFullYear() &&
      current.getMonth() === today.getMonth() &&
      current.getDate() === today.getDate()
    ) {
      td.style.backgroundColor = "#555";
      td.style.color = "#fff";
      td.style.borderRadius = "50%";
    }

    row.appendChild(td);
  }

  if (row.children.length > 0) {
    while (row.children.length < 7) {
      const emptyTd = document.createElement("td");
      row.appendChild(emptyTd);
    }
    table.appendChild(row);
  }

  container.appendChild(table);

  function goToPrevMonth() {
    if (month === 0) {
      calendarYear = year - 1;
      calendarMonth = 11;
    } else {
      calendarYear = year;
      calendarMonth = month - 1;
    }
    renderCalendarView(calendarYear, calendarMonth, container);
  }
  function goToNextMonth() {
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
   LOAD POEMS BY DATE => show overlay (wheel) if multiple
------------------------------------------------------------------ */
function loadPoemsByDate(dateStr) {
  console.log("Loading poems for date:", dateStr);
  // Example of fetching from a server folder: poetry/2025-03-01.json
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
      console.warn("No poem found or error:", err);
      alert(t("errors.noPoemFound") + " " + dateStr);
    });
}

/* ------------------------------------------------------------------
   SINGLE POEM => Direct reading overlay
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
   PRICE-IS-RIGHT WHEEL OVERLAY - CREATE & SHOW
------------------------------------------------------------------ */
function showPoemsWheelOverlay() {
  // If overlay doesn't exist in DOM, create it
  let overlay = document.getElementById("poem-wheel-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "poem-wheel-overlay";
    overlay.innerHTML = `
      <button id="wheel-close-btn">×</button>
      <div id="wheel-inner">
        <table>
          <tbody id="wheel-list-body"></tbody>
        </table>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Add event on close button
  const closeBtn = overlay.querySelector("#wheel-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 400);
  };

  // Render poem list
  const wheelBody = overlay.querySelector("#wheel-list-body");
  if (!wheelBody) return;
  wheelBody.innerHTML = "";
  wheelBody.scrollTop = 0;

  // Sort poems by title
  poemsForWheel.sort((a, b) => {
    const aTitle = (currentLanguage === "en")
      ? (a.title_en || "")
      : (a.title_it || a.title_en || "");
    const bTitle = (currentLanguage === "en")
      ? (b.title_en || "")
      : (b.title_it || b.title_en || "");
    return aTitle.localeCompare(bTitle);
  });

  // Build rows
  poemsForWheel.forEach((poem, i) => {
    const tr = document.createElement("tr");
    tr.dataset.index = String(i);

    const titleUsed = (currentLanguage === "en")
      ? (poem.title_en || "Untitled")
      : (poem.title_it || poem.title_en || "Untitled");

    tr.innerHTML = `<td>${titleUsed}</td>`;

    // On click => if this row is center, show reading overlay
    tr.addEventListener("click", () => {
      const centerIndex = findCenterIndex(wheelBody);
      const idx = parseInt(tr.dataset.index, 10);
      if (idx === centerIndex) {
        const textUsed = (currentLanguage === "en")
          ? (poem.poem_en || "")
          : (poem.poem_it || poem.poem_en || "");
        showReadingOverlay(titleUsed, textUsed);
      }
    });

    wheelBody.appendChild(tr);
  });

  // Pointer events for drag
  wheelBody.addEventListener("pointerdown", onWheelPointerDown);
  wheelBody.addEventListener("pointermove", onWheelPointerMove);
  wheelBody.addEventListener("pointerup", onWheelPointerUp);
  wheelBody.addEventListener("pointercancel", onWheelPointerUp);
  wheelBody.addEventListener("pointerleave", onWheelPointerUp);
  wheelBody.addEventListener("scroll", () => updateWheelLayout(wheelBody));

  wheelBody.style.userSelect = "none";

  // Show overlay with fade in
  overlay.classList.add("show");
  overlay.style.display = "block";
  // Wait a tick for reflow, then update
  setTimeout(() => {
    updateWheelLayout(wheelBody);
  }, 50);
}

/** 
 * Finds the center row index in the wheel 
 */
function findCenterIndex(wheelBody) {
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return 0;
  const containerRect = wheelBody.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;
  let minDist = Infinity;
  let centerIdx = 0;
  rows.forEach((row, i) => {
    const rect = row.getBoundingClientRect();
    const rowCenterY = (rect.top + rect.bottom)/2 - containerRect.top;
    const dist = Math.abs(rowCenterY - containerCenterY);
    if (dist < minDist) {
      minDist = dist;
      centerIdx = i;
    }
  });
  return centerIdx;
}

/** 
 * Update the layout => scale/opacity each row 
 */
function updateWheelLayout(wheelBody) {
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;
  const containerRect = wheelBody.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;

  rows.forEach(row => {
    const rect = row.getBoundingClientRect();
    const rowCenterY = (rect.top + rect.bottom)/2 - containerRect.top;
    const dist = Math.abs(rowCenterY - containerCenterY);

    // scale from [0.8..1.3], fade from [0.5..1.0]
    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist / containerCenterY)*0.5;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;

    row.style.transform = `scale(${scale})`;
    row.style.opacity = `${0.5 + (scale - minScale)}`;
    row.classList.remove("active");
  });

  // Mark the new center row as "active" (pulsing)
  const ci = findCenterIndex(wheelBody);
  const activeRow = rows[ci];
  if (activeRow) activeRow.classList.add("active");
}

/* 
 * DRAG SCROLL: pointer events 
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
  let newScrollTop = wheelBody.scrollTop - deltaY;
  if (newScrollTop < 0) newScrollTop = 0;
  wheelBody.scrollTop = newScrollTop;
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
  const rows = wheelBody.querySelectorAll("tr");
  if (!rows.length) return;
  const containerRect = wheelBody.getBoundingClientRect();
  const containerCenterY = containerRect.height / 2;
  let minDist = Infinity;
  let closestRow = rows[0];
  rows.forEach(row => {
    const rect = row.getBoundingClientRect();
    const rowCenter = (rect.top + rect.bottom)/2 - containerRect.top;
    const dist = Math.abs(rowCenter - containerCenterY);
    if (dist < minDist) {
      minDist = dist;
      closestRow = row;
    }
  });
  if (closestRow) {
    const rowRect = closestRow.getBoundingClientRect();
    const rowMidY = (rowRect.top + rowRect.bottom)/2 - containerRect.top;
    const distToCenter = rowMidY - containerCenterY;
    wheelBody.scrollTop += distToCenter;
    updateWheelLayout(wheelBody);
  }
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

  // Fill content
  const titleEl = overlay.querySelector("#poem-overlay-title");
  const contentEl = overlay.querySelector("#poem-overlay-content");
  if (titleEl) titleEl.textContent = title || "";
  if (contentEl) contentEl.textContent = text || "";

  // Close button
  const closeBtn = overlay.querySelector("#poem-overlay-close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.classList.remove("show");
      setTimeout(() => {
        overlay.style.display = "none";
      }, 400);
    };
  }

  // Show
  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);
}
