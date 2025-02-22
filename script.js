console.log("script.js loaded.");

/**
 * Global state
 */
let currentLanguage = "en";

// For the calendar
const earliestDate = new Date(2024, 9, 24); // 2024-10-24
const today = new Date();
let calendarYear = 0;
let calendarMonth = 0; // 0-based

// If you have localized strings in a "gui.json", load them; else skip
let guiData = null;

/**
 * For the infinite vertical spinner
 */
let poemsForWheel = [];     // array of poem objects from JSON
const WHEEL_REPEAT_COUNT = 7; // Replicated more for smoother infinite scrolling
const WHEEL_ITEM_HEIGHT = 60; // px, should match CSS variable
const WHEEL_MIN_VISIBLE_ITEMS = 3; // Minimum items visible in wheel
const WHEEL_MAX_VISIBLE_ITEMS = 7; // Max items visible (base count, can grow to fill screen)
let isDraggingWheel = false;
let startPointerY = 0;
let snapEnabled = true;
let wheelTrackOffsetY = 0; // Tracks vertical offset of the wheel track


/** On DOM Ready **/
document.addEventListener("DOMContentLoaded", async () => {
  await loadGuiData();
  initializePage();
  setupSideMenu();
  setupLanguageToggle();
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
  // Default content = About
  loadAboutSection();
}

function setupSideMenu() {
  const sideMenu = document.getElementById("side-menu");
  if (!sideMenu) return;

  // Menu links
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

  // Hamburger
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
    // Click outside => close
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

  // Bounds
  const prevMonthDate = new Date(year, month-1, 1);
  if (prevMonthDate < earliestDate) prevBtn.disabled = true;
  const nextMonthDate = new Date(year, month+1, 1);
  const nextLimit = new Date(today.getFullYear(), today.getMonth(), 1);
  if (nextMonthDate > nextLimit) nextBtn.disabled = true;

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
    td.textContent = String(d);

    const currentDate = new Date(year, month, d);
    if (currentDate < earliestDate || currentDate > today) {
      td.style.opacity = "0.3";
    } else {
      td.style.cursor = "pointer";
      td.onclick = () => {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth()+1).padStart(2,"0");
        const dd = String(currentDate.getDate()).padStart(2,"0");
        loadPoemsByDate(`${yyyy}-${mm}-${dd}`);
      };
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
   LOAD POEMS => SHOW INFINITE WHEEL
------------------------------------------------------------------ */
function loadPoemsByDate(dateStr) {
  const url = `poetry/${dateStr}.json`;
  fetch(url)
    .then(resp => {
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length===0) {
        throw new Error("Empty array");
      }
      if (data.length === 1) {
        displaySinglePoem(data[0]);
      } else {
        poemsForWheel = data.slice();
        showInfiniteWheelOverlay();
      }
    })
    .catch(err => {
      console.warn("No poem found for", dateStr, err);
      alert(t("errors.noPoemFound") + ": " + dateStr);
    });
}

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
   INFINITE VERTICAL WHEEL (MARQUEE STYLE)
------------------------------------------------------------------ */
function showInfiniteWheelOverlay() {
  let overlay = document.getElementById("poem-wheel-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "poem-wheel-overlay";
    overlay.innerHTML = `
      <button id="wheel-close-btn">×</button>
      <div id="wheel-inner">
        <div id="wheel-track"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const closeBtn = overlay.querySelector("#wheel-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => { overlay.style.display = "none"; wheelTrackOffsetY = 0; }, 400); // Reset offset
  };

  // Build extended list of poems
  const extendedPoems = buildInfiniteList(poemsForWheel, WHEEL_REPEAT_COUNT);
  const wheelTrack = overlay.querySelector("#wheel-track");
  wheelTrack.innerHTML = "";
  wheelTrack.style.transform = `translateY(0px)`; // Reset track position
  wheelTrackOffsetY = 0; // Reset offset tracker

  extendedPoems.forEach((info, idx) => {
    const item = document.createElement("div");
    item.classList.add("wheel-item");
    item.dataset.index = String(idx);
    item.textContent = info.title;

    // On click => if center row, open reading
    item.addEventListener("click", () => {
      const centerIdx = findCenterIndex(wheelTrack, extendedPoems.length);
      if (parseInt(item.dataset.index) === centerIdx) {
        // Grab the actual poem from poemsForWheel
        const actualPoem = poemsForWheel[info.originalIndex];
        const tUsed = (currentLanguage === "en")
          ? (actualPoem.title_en || "Untitled")
          : (actualPoem.title_it || actualPoem.title_en || "Untitled");
        const pUsed = (currentLanguage === "en")
          ? (actualPoem.poem_en || "")
          : (actualPoem.poem_it || actualPoem.poem_en || "");
        showReadingOverlay(tUsed, pUsed);
      }
    });
    wheelTrack.appendChild(item);
  });

  // pointer events
  wheelTrack.addEventListener("pointerdown", onWheelPointerDown);
  wheelTrack.addEventListener("pointermove", onWheelPointerMove);
  wheelTrack.addEventListener("pointerup", onWheelPointerUp);
  wheelTrack.addEventListener("pointercancel", onWheelPointerUp);
  wheelTrack.addEventListener("pointerleave", onWheelPointerUp);

  wheelTrack.style.userSelect = "none";

  // *** DYNAMIC MARQUEE HEIGHT CALCULATION ***
  const wheelInner = overlay.querySelector("#wheel-inner");
  const poemCount = poemsForWheel.length;
  let marqueeHeight = WHEEL_MIN_VISIBLE_ITEMS * WHEEL_ITEM_HEIGHT; // Default min height

  if (poemCount >= WHEEL_MIN_VISIBLE_ITEMS) {
      marqueeHeight = Math.min(poemCount * WHEEL_ITEM_HEIGHT,  WHEEL_MAX_VISIBLE_ITEMS * WHEEL_ITEM_HEIGHT, window.innerHeight * 0.7); // Up to max items or 70% of screen height, whichever is smaller
  }
  wheelInner.style.height = `${marqueeHeight}px`;


  // Show overlay
  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
    // place scroll at the middle block
    centerScrollAtMiddle(wheelTrack, extendedPoems.length);
    updateWheelLayout(wheelTrack, extendedPoems.length);
  }, 50);
}

/**
 * Build infinite list by repeating poems N times
 * Return: [ {title: string, originalIndex: number}, ... ]
 */
function buildInfiniteList(poems, repeatCount) {
  const out = [];
  poems.forEach((poem, i) => {
    // pick language
    const tUsed = (currentLanguage === "en")
      ? (poem.title_en || "Untitled")
      : (poem.title_it || poem.title_en || "Untitled");
    poem._displayTitle = tUsed;
  });
  for (let r=0; r<repeatCount; r++) {
    poems.forEach((poem, i) => {
      out.push({
        title: poem._displayTitle,
        originalIndex: i
      });
    });
  }
  return out;
}

/**
 * Place scroll at the middle, now by adjusting track offset
 */
function centerScrollAtMiddle(wheelTrack, totalCount) {
  const middleIndex = Math.floor(totalCount / 2);
  wheelTrackOffsetY = -middleIndex * WHEEL_ITEM_HEIGHT;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
}

/**
 * If near top/bottom, jump to middle => infinite effect, using track offset
 */
function checkLoopEdges(wheelTrack, totalCount) {
  const fullHeight = totalCount * WHEEL_ITEM_HEIGHT;
  const bufferHeight = 3 * WHEEL_ITEM_HEIGHT;

  if (wheelTrackOffsetY > bufferHeight) {
    wheelTrackOffsetY -= fullHeight/2;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  } else if (wheelTrackOffsetY < -(fullHeight - bufferHeight)) {
    wheelTrackOffsetY += fullHeight/2;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  }
}

/**
 * Find center row index based on track offset
 */
function findCenterIndex(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect(); // wheel-inner is the clipping container
  const wheelRect = wheelTrack.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2; // Center Y of the visible marquee
  let minDist = Infinity;
  let centerI = 0;

  for (let i = 0; i < totalCount; i++) {
    const itemYPos = wheelTrackOffsetY + i * WHEEL_ITEM_HEIGHT;
    const itemCenterY = itemYPos + WHEEL_ITEM_HEIGHT / 2;
    const dist = Math.abs(itemCenterY - cy);

    if (dist < minDist) {
      minDist = dist;
      centerI = i;
    }
  }
  return centerI;
}

/**
 * Scale/opacity each row based on distance from center, now based on track offset and item index
 */
function updateWheelLayout(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;


  Array.from(wheelTrack.children).forEach((item, index) => {
    const itemYPos = wheelTrackOffsetY + index * WHEEL_ITEM_HEIGHT;
    const itemCenterY = itemYPos + WHEEL_ITEM_HEIGHT / 2;
    const dist = Math.abs(itemCenterY - cy);

    // scale in [0.8..1.3], fade in [0.5..1.0]
    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist/cy)*0.5;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;

    item.style.transform = `scale(${scale})`;
    item.style.opacity = String(0.5 + (scale - minScale));
    item.classList.remove("active");
  });

  const cIndex = findCenterIndex(wheelTrack, totalCount);
  if (wheelTrack.children[cIndex]) {
      wheelTrack.children[cIndex].classList.add("active");
  }
}


/**
 * DRAG SCROLL, now adjusts track offset
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
  const wheelTrack = e.currentTarget;

  wheelTrackOffsetY += deltaY;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;

  updateWheelLayout(wheelTrack,  wheelTrack.children.length);
  checkLoopEdges(wheelTrack, wheelTrack.children.length);
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

function snapToClosestRow(wheelTrack) {
  const centerIndex = findCenterIndex(wheelTrack, wheelTrack.children.length);
  const distToCenter = -centerIndex * WHEEL_ITEM_HEIGHT - wheelTrackOffsetY; // Calculate offset needed to center
  wheelTrackOffsetY += distToCenter;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  updateWheelLayout(wheelTrack,  wheelTrack.children.length);
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