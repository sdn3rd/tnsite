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
 * For the infinite vertical spinner with fling
 */
let poemsForWheel = [];
const WHEEL_REPEAT_COUNT = 7;
const WHEEL_ITEM_HEIGHT = 60;
let wheelTrackOffsetY = 0;
let wheelSnapTimeout = null;

// Pointer/touch detection
let isPointerDown = false;
let hasDragged = false;
let pointerDownX = 0;
let pointerDownY = 0;
let startPointerY = 0;
let pointerDownItem = null;
const TAP_THRESHOLD = 6;
const snapEnabled = true;

// Fling velocity
let lastPointerY = 0;
let lastMoveTime = 0;
let flingVelocity = 0;
const decelerationFactor = 0.95;
let animationFrameID = null;

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
  langToggle.textContent = (currentLanguage === "en") ? "ENG" : "ITA";
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
   LOAD POEMS BY DATE => Show infinite wheel
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

  poemMetadataArr.forEach(m => {
    m._folderName = folderName;
  });

  if (poemMetadataArr.length === 1) {
    fetchAndDisplayPoem(folderName, poemMetadataArr[0]);
    return;
  }

  poemsForWheel = poemMetadataArr.slice();
  showInfiniteWheelOverlay();
}

/* ------------------------------------------------------------------
   LOAD POEMS BY CATEGORY
------------------------------------------------------------------ */
function loadPoemsByCategory(categoryName) {
  console.log("loadPoemsByCategory:", categoryName);

  const allDateKeys = Object.keys(poemIndex);
  let result = [];
  allDateKeys.forEach(dateKey => {
    const arr = poemIndex[dateKey];
    if (Array.isArray(arr)) {
      arr.forEach(poemMeta => {
        if (poemMeta.category && poemMeta.category.toLowerCase() === categoryName.toLowerCase()) {
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

  poemsForWheel = result;
  showInfiniteWheelOverlay();
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
   INFINITE WHEEL
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

  overlay.addEventListener("click", e => e.stopPropagation());

  const closeBtn = overlay.querySelector("#wheel-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    clearTimeout(wheelSnapTimeout);
    stopFlingAnimation();
    setTimeout(() => {
      overlay.style.display = "none";
      wheelTrackOffsetY = 0;
      flingVelocity = 0;
    }, 400);
  };

  const extendedPoems = buildInfiniteList(poemsForWheel, WHEEL_REPEAT_COUNT);
  const wheelTrack = overlay.querySelector("#wheel-track");
  wheelTrack.innerHTML = "";
  wheelTrack.style.transform = "translateY(0px)";
  wheelTrackOffsetY = 0;
  flingVelocity = 0;

  extendedPoems.forEach((info, idx) => {
    const item = document.createElement("div");
    item.classList.add("wheel-item");
    item.dataset.index = String(idx);
    item.dataset.folderName = info.folderName;
    item.dataset.filename = info.filename;
    item.textContent = info.displayTitle;
    wheelTrack.appendChild(item);
  });

  const newWheelTrack = wheelTrack.cloneNode(true);
  wheelTrack.parentNode.replaceChild(newWheelTrack, wheelTrack);

  newWheelTrack.addEventListener("pointerdown", onWheelPointerDown);
  newWheelTrack.addEventListener("pointermove", onWheelPointerMove);
  newWheelTrack.addEventListener("pointerup", onWheelPointerUp);
  newWheelTrack.addEventListener("pointercancel", onWheelPointerUp);
  newWheelTrack.addEventListener("pointerleave", onWheelPointerUp);
  newWheelTrack.style.userSelect = "none";

  const wheelInner = overlay.querySelector("#wheel-inner");
  wheelInner.addEventListener("wheel", onMouseWheelScroll, { passive: false });

  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
    centerScrollAtMiddle(newWheelTrack, extendedPoems.length);
    updateWheelLayout(newWheelTrack, extendedPoems.length);
  }, 50);
}

function buildInfiniteList(poemsMetadata, repeatCount) {
  poemsMetadata.forEach(p => {
    p._displayTitle = (currentLanguage === "en")
      ? (p.title_en || "Untitled")
      : (p.title_it || p.title_en || "Untitled");
  });
  const out = [];
  for (let r = 0; r < repeatCount; r++) {
    poemsMetadata.forEach(p => {
      out.push({
        folderName: p._folderName,
        filename: p.filename,
        displayTitle: p._displayTitle
      });
    });
  }
  return out;
}

function centerScrollAtMiddle(wheelTrack, totalCount) {
  const middleIndex = Math.floor(totalCount / 2);
  wheelTrackOffsetY = -middleIndex * WHEEL_ITEM_HEIGHT;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
}

function checkLoopEdges(wheelTrack, totalCount) {
  const fullHeight = totalCount * WHEEL_ITEM_HEIGHT;
  const halfHeight = fullHeight / 2;

  if (wheelTrackOffsetY > halfHeight) {
    wheelTrackOffsetY -= fullHeight;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  } else if (wheelTrackOffsetY < -halfHeight) {
    wheelTrackOffsetY += fullHeight;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  }
}

function findCenterIndex(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;
  let minDist = Infinity;
  let centerI = -1;
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

function updateWheelLayout(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;
  const items = wheelTrack.children;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemYPos = wheelTrackOffsetY + i * WHEEL_ITEM_HEIGHT;
    const itemCenterY = itemYPos + WHEEL_ITEM_HEIGHT / 2;
    const dist = Math.abs(itemCenterY - cy);

    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist / cy) * 0.5;
    scale = Math.max(minScale, Math.min(scale, maxScale));

    item.style.transform = `scale(${scale})`;
    item.style.opacity = String(0.5 + (scale - minScale));
    item.classList.remove("active");
  }

  const cIndex = findCenterIndex(wheelTrack, totalCount);
  if (cIndex >= 0 && items[cIndex]) {
    items[cIndex].classList.add("active");
  }
}

/* pointer/drag */
function onWheelPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  isPointerDown = true;
  hasDragged = false;

  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
  startPointerY = e.clientY;

  lastPointerY = e.clientY;
  lastMoveTime = performance.now();
  flingVelocity = 0;
  stopFlingAnimation();

  pointerDownItem = e.target.closest(".wheel-item") || null;

  clearTimeout(wheelSnapTimeout);
  e.target.setPointerCapture(e.pointerId);
}

function onWheelPointerMove(e) {
  if (!isPointerDown) return;

  const now = performance.now();
  const deltaTime = now - lastMoveTime;
  lastMoveTime = now;

  const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
  if (!hasDragged && moveDist > TAP_THRESHOLD) {
    hasDragged = true;
  }

  if (hasDragged) {
    const deltaY = e.clientY - startPointerY;
    startPointerY = e.clientY;

    const wheelTrack = e.currentTarget;
    wheelTrackOffsetY += deltaY;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;

    updateWheelLayout(wheelTrack, wheelTrack.children.length);
    checkLoopEdges(wheelTrack, wheelTrack.children.length);

    const speedY = (e.clientY - lastPointerY) / (deltaTime || 1);
    flingVelocity = speedY;
    lastPointerY = e.clientY;
  }
}

function onWheelPointerUp(e) {
  if (!isPointerDown) return;
  isPointerDown = false;
  e.target.releasePointerCapture(e.pointerId);

  const wheelTrack = e.currentTarget;
  if (!hasDragged) {
    // Tapped
    const totalCount = wheelTrack.children.length;
    const centerIdx = findCenterIndex(wheelTrack, totalCount);
    const centerItem = wheelTrack.children[centerIdx];
    if (centerItem && pointerDownItem && centerItem === pointerDownItem) {
      openPoemFromCenterItem(centerItem);
    }
  } else {
    // Possibly fling
    if (snapEnabled) {
      if (Math.abs(flingVelocity) > 0.1) {
        startFlingAnimation();
      } else {
        wheelSnapTimeout = setTimeout(() => {
          snapToClosestRow(wheelTrack);
        }, 80);
      }
    }
  }
  flingVelocity = 0;
}

function openPoemFromCenterItem(itemEl) {
  const folderName = itemEl.dataset.folderName;
  const filename = itemEl.dataset.filename;
  if (!folderName || !filename) {
    console.error("No folderName or filename found", itemEl);
    return;
  }
  const meta = poemsForWheel.find(m => m.filename === filename && m._folderName === folderName);
  if (!meta) {
    console.error("No matching metadata found for filename:", filename);
    return;
  }
  fetchAndDisplayPoem(folderName, meta);
}

function snapToClosestRow(wheelTrack) {
  const totalCount = wheelTrack.children.length;
  const centerIndex = findCenterIndex(wheelTrack, totalCount);
  if (centerIndex < 0) return;

  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;
  const targetOffsetY = cy - (WHEEL_ITEM_HEIGHT / 2) - (centerIndex * WHEEL_ITEM_HEIGHT);
  const distToCenter = targetOffsetY - wheelTrackOffsetY;

  wheelTrackOffsetY += distToCenter;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  updateWheelLayout(wheelTrack, totalCount);
}

/* mouse wheel */
function onMouseWheelScroll(e) {
  e.preventDefault();
  const wheelTrack = this.querySelector("#wheel-track");
  if (!wheelTrack) return;

  const delta = Math.max(-1, Math.min(1, e.deltaY));
  wheelTrackOffsetY += delta * -WHEEL_ITEM_HEIGHT;

  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  updateWheelLayout(wheelTrack, wheelTrack.children.length);
  checkLoopEdges(wheelTrack, wheelTrack.children.length);

  if (!isPointerDown && snapEnabled) {
    clearTimeout(wheelSnapTimeout);
    stopFlingAnimation();
    wheelSnapTimeout = setTimeout(() => {
      snapToClosestRow(wheelTrack);
    }, 80);
  }
}

/* fling animation */
function startFlingAnimation() {
  stopFlingAnimation();
  animationFrameID = requestAnimationFrame(function animate() {
    wheelTrackOffsetY += flingVelocity;
    flingVelocity *= decelerationFactor;

    const wheelTrack = document.querySelector("#wheel-track");
    if (wheelTrack) {
      wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
      updateWheelLayout(wheelTrack, wheelTrack.children.length);
      checkLoopEdges(wheelTrack, wheelTrack.children.length);
    }

    if (Math.abs(flingVelocity) > 0.1) {
      animationFrameID = requestAnimationFrame(animate);
    } else {
      stopFlingAnimation();
      if (wheelTrack && snapEnabled) {
        snapToClosestRow(wheelTrack);
      }
    }
  });
}

function stopFlingAnimation() {
  if (animationFrameID) {
    cancelAnimationFrame(animationFrameID);
    animationFrameID = null;
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
