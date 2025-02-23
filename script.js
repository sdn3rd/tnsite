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

// If you have localized strings in "gui.json", load them; else skip
let guiData = null;

/**
 * For the poem index
 * This JSON file maps each date folder (e.g. "20250104")
 * to an array of metadata objects:
 * [
 *   {
 *     "filename": "in_the_pursuit_of.json",
 *     "title_en": "In The Pursuit Of",
 *     "title_it": "Nella Ricerca Di",
 *     "category": "Personal",
 *     "tags": [...]
 *   }
 * ]
 */
let poemIndex = {}; // Will hold data from poetry/index.json

/**
 * For the infinite vertical spinner with fling
 */
let poemsForWheel = [];          // Array of poem metadata objects for a given date
const WHEEL_REPEAT_COUNT = 7;    // Replicate items for smooth looping
const WHEEL_ITEM_HEIGHT = 60;    // px, must match CSS
let wheelTrackOffsetY = 0;       // Track's vertical offset
let wheelSnapTimeout = null;     // For snapping after scroll/drag

// Pointer/touch detection
let isPointerDown = false;
let hasDragged = false;
let pointerDownX = 0;
let pointerDownY = 0;
let startPointerY = 0;
let pointerDownItem = null;
const TAP_THRESHOLD = 6;         // px threshold for deciding a tap vs. drag
const snapEnabled = true;

// Fling velocity
let lastPointerY = 0;
let lastMoveTime = 0;
let flingVelocity = 0;
let decelerationFactor = 0.95;   // Fling deceleration factor
let animationFrameID = null;     // For requestAnimationFrame

/** On DOM Ready **/
document.addEventListener("DOMContentLoaded", async () => {
  await loadGuiData();
  await loadPoemIndex(); // Load the main "poetry/index.json" mapping date folders -> poem metadata
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

/**
 * Load poemIndex from "poetry/index.json"
 * This file should map each date-folder (e.g. "20250104") to an array of metadata objects.
 */
async function loadPoemIndex() {
  try {
    const resp = await fetch("poetry/index.json");
    if (!resp.ok) {
      console.error("poetry/index.json response not OK:", resp);
      throw new Error("Could not load poetry/index.json");
    }
    poemIndex = await resp.json();
    console.log("poemIndex loaded successfully:", poemIndex);
  } catch (err) {
    console.error("Error loading poemIndex:", err);
    poemIndex = {};
  }
}

/* ------------------------------------------------------------------
   HELPER: t(path)
   Returns localized text or fallback to the path
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
  const prevMonthDate = new Date(year, month - 1, 1);
  if (prevMonthDate < earliestDate) prevBtn.disabled = true;
  const nextMonthDate = new Date(year, month + 1, 1);
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
    if (currentDate < earliestDate || currentDate > today) {
      td.style.opacity = "0.3";
    } else {
      td.style.cursor = "pointer";
      td.onclick = () => {
        const yyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
        const dd = String(currentDate.getDate()).padStart(2, "0");
        loadPoemsByDate(`${yyy}-${mm}-${dd}`);
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
  if (!Array.isArray(months) || months.length < 12) {
    months = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];
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
   LOAD POEMS => SHOW INFINITE WHEEL
   Using poemIndex to find which *metadata* exist for that date
------------------------------------------------------------------ */
async function loadPoemsByDate(dateStr) {
  // dateStr = "YYYY-MM-DD"
  const folderName = dateStr.replace(/-/g, ""); // e.g. "20241229"
  console.log("loadPoemsByDate:", dateStr, "=> folderName:", folderName);

  // Get the array of poem metadata from poemIndex
  let poemMetadataArr = poemIndex[folderName] || [];
  if (!Array.isArray(poemMetadataArr)) {
    console.error("Error: poemIndex entry is NOT an array for folder:", folderName, poemMetadataArr);
    poemMetadataArr = [];
  }

  console.log("metadata from poemIndex:", poemMetadataArr);

  if (poemMetadataArr.length === 0) {
    console.warn("No poems for date:", dateStr);
    alert(`${t("errors.noPoemFound")}: ${dateStr}`);
    return;
  }

  // Store the metadata for the wheel
  poemsForWheel = poemMetadataArr.slice(); // clone or keep reference
  // If exactly 1 => we can still do the single display or the wheel
  if (poemsForWheel.length === 1) {
    // Only one poem => fetch & display immediately
    const singleMetadata = poemsForWheel[0];
    fetchAndDisplayPoem(folderName, singleMetadata);
  } else {
    // Multiple poems => show the infinite wheel
    showInfiniteWheelOverlay();
  }
}

/**
 * Fetch the poem's full JSON *on demand* and show reading overlay
 */
async function fetchAndDisplayPoem(folderName, poemMeta) {
  // poemMeta has { filename, title_en, title_it, category, tags... }
  const poemUrl = `poetry/${folderName}/${poemMeta.filename}`;
  console.log("Fetching poem:", poemUrl);

  try {
    const resp = await fetch(poemUrl);
    if (!resp.ok) {
      console.error("Poem fetch not OK:", poemUrl, resp);
      throw new Error(`Failed to fetch poem: ${poemUrl}`);
    }
    const poemData = await resp.json();
    console.log("Poem data loaded:", poemUrl, poemData);

    // Choose appropriate title & text based on language
    const tUsed = (currentLanguage === "en")
      ? (poemData.title_en || "Untitled")
      : (poemData.title_it || poemData.title_en || "Untitled");

    const pUsed = (currentLanguage === "en")
      ? (poemData.poem_en || "")
      : (poemData.poem_it || poemData.poem_en || "");

    showReadingOverlay(tUsed, pUsed);
  } catch (err) {
    console.warn("Skipping poem fetch error:", poemUrl, err);
    alert(`Could not load poem content: ${poemMeta.filename}`);
  }
}

/* ------------------------------------------------------------------
   INFINITE WHEEL (MARQUEE) + FLING
   Now we do NOT fetch the poems in advance; only show their titles
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

  // When overlay is open, block underlying page interactions
  overlay.addEventListener("click", e => e.stopPropagation());

  const closeBtn = overlay.querySelector("#wheel-close-btn");
  closeBtn.onclick = () => {
    overlay.classList.remove("show");
    clearTimeout(wheelSnapTimeout);
    stopFlingAnimation(); // Stop any fling
    setTimeout(() => {
      overlay.style.display = "none";
      wheelTrackOffsetY = 0;
      flingVelocity = 0;
    }, 400);
  };

  // Build extended list
  const extendedPoems = buildInfiniteList(poemsForWheel, WHEEL_REPEAT_COUNT);
  const wheelTrack = overlay.querySelector("#wheel-track");
  wheelTrack.innerHTML = "";
  wheelTrack.style.transform = `translateY(0px)`;
  wheelTrackOffsetY = 0;
  flingVelocity = 0;

  // Populate wheelTrack
  extendedPoems.forEach((info, idx) => {
    const item = document.createElement("div");
    item.classList.add("wheel-item");
    item.dataset.index = String(idx);
    // We'll store the folderName and actual poem metadata so we can fetch on tap
    item.dataset.folderName = info.folderName;
    item.dataset.filename = info.filename;

    item.textContent = info.displayTitle; // Show the chosen language title
    wheelTrack.appendChild(item);
  });

  // Re-bind pointer events
  const newWheelTrack = wheelTrack.cloneNode(true);
  wheelTrack.parentNode.replaceChild(newWheelTrack, wheelTrack);

  newWheelTrack.addEventListener("pointerdown", onWheelPointerDown);
  newWheelTrack.addEventListener("pointermove", onWheelPointerMove);
  newWheelTrack.addEventListener("pointerup", onWheelPointerUp);
  newWheelTrack.addEventListener("pointercancel", onWheelPointerUp);
  newWheelTrack.addEventListener("pointerleave", onWheelPointerUp);
  newWheelTrack.style.userSelect = "none";

  // Also handle mouse wheel
  const wheelInner = overlay.querySelector("#wheel-inner");
  wheelInner.addEventListener("wheel", onMouseWheelScroll, { passive: false });

  // Show overlay
  overlay.style.display = "block";
  setTimeout(() => {
    overlay.classList.add("show");
    centerScrollAtMiddle(newWheelTrack, extendedPoems.length);
    updateWheelLayout(newWheelTrack, extendedPoems.length);
  }, 50);
}

/**
 * Build an extended repeated list for smooth looping.
 * We pick the language-specific title as "displayTitle"
 */
function buildInfiniteList(poemsMetadata, repeatCount) {
  // "poemsMetadata" is the array from poemIndex for a certain date
  // We assume they all share the same date folder
  if (!poemsMetadata.length) return [];

  // Determine the folderName from the first item or your own logic
  // If you prefer to pass it in, that's also fine:
  // (Because in the real usage, each date => one folder.)
  const folderName = findFolderNameForMetadata(poemsMetadata);

  // Pre-process each metadata for display
  poemsMetadata.forEach(p => {
    // We’ll store a new property for the chosen language title
    p._displayTitle = (currentLanguage === "en")
      ? (p.title_en || "Untitled")
      : (p.title_it || p.title_en || "Untitled");
  });

  // Build repeated list
  const out = [];
  for (let r = 0; r < repeatCount; r++) {
    poemsMetadata.forEach((p, i) => {
      out.push({
        folderName,
        filename: p.filename,
        displayTitle: p._displayTitle
      });
    });
  }
  return out;
}

// Attempt to find a folder name from the array's first item if needed
function findFolderNameForMetadata(arr) {
  // If you stored "folderName" inside each object, you can just return that.
  // Otherwise, you can store it externally in loadPoemsByDate and pass it in.
  // For this snippet, let's just guess "???????" if not provided.
  // You can adjust as needed.
  return (arr && arr.length && arr[0]._folderName) ? arr[0]._folderName : "???????";
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

    // scale in [0.8..1.3], fade in [0.5..1.0]
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

/* ------------------------------------------------------------------
   DRAG SCROLL + FLING
------------------------------------------------------------------ */
function onWheelPointerDown(e) {
  // Only left-click or touch
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  // Begin pointer
  isPointerDown = true;
  hasDragged = false;

  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
  startPointerY = e.clientY;

  lastPointerY = e.clientY;       // For velocity calc
  lastMoveTime = performance.now();
  flingVelocity = 0;              // Reset velocity
  stopFlingAnimation();           // Stop any active fling

  // Identify which item was tapped
  pointerDownItem = e.target.closest(".wheel-item") || null;

  clearTimeout(wheelSnapTimeout);
  e.target.setPointerCapture(e.pointerId);
}

function onWheelPointerMove(e) {
  if (!isPointerDown) return;

  // For fling velocity
  const now = performance.now();
  const deltaTime = now - lastMoveTime;
  lastMoveTime = now;

  // Check if we've moved enough to consider it a drag
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

    // Velocity in px/ms
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
    // Tapped (no drag)
    const totalCount = wheelTrack.children.length;
    const centerIdx = findCenterIndex(wheelTrack, totalCount);
    const centerItem = wheelTrack.children[centerIdx];
    if (centerItem && pointerDownItem && centerItem === pointerDownItem) {
      // Tapped center item => open poem
      openPoemFromCenterItem(centerItem);
    }
  } else {
    // We dragged => possibly fling
    if (snapEnabled) {
      if (Math.abs(flingVelocity) > 0.1) {
        startFlingAnimation();
      } else {
        // Low velocity => just snap
        wheelSnapTimeout = setTimeout(() => {
          snapToClosestRow(wheelTrack);
        }, 80);
      }
    }
  }
  flingVelocity = 0; // We'll recalc on fling or next pointerDown
}

/**
 * Called when user taps the center item. We fetch the poem JSON on demand.
 */
function openPoemFromCenterItem(itemEl) {
  // We rely on dataset from buildInfiniteList
  const folderName = itemEl.dataset.folderName || "???????";
  const filename = itemEl.dataset.filename;

  if (!filename) {
    console.error("No filename found on center item. Cannot open poem.");
    return;
  }

  // We must find the exact metadata entry in poemsForWheel that matches `filename`
  // (You could also store everything in itemEl's dataset, but let's be consistent.)
  const meta = poemsForWheel.find(m => m.filename === filename);
  if (!meta) {
    console.error("No matching metadata found for filename:", filename);
    return;
  }

  // Actually fetch the poem JSON
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

/* ------------------------------------------------------------------
   MOUSE WHEEL SCROLL
------------------------------------------------------------------ */
function onMouseWheelScroll(e) {
  e.preventDefault(); // Prevent page scroll

  const wheelTrack = this.querySelector("#wheel-track");
  if (!wheelTrack) return;

  // For "natural" scrolling: negative the delta
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

/* ------------------------------------------------------------------
   FLING ANIMATION
------------------------------------------------------------------ */
function startFlingAnimation() {
  stopFlingAnimation(); // Stop existing fling if any

  animationFrameID = requestAnimationFrame(function animate() {
    wheelTrackOffsetY += flingVelocity;
    flingVelocity *= decelerationFactor; // Decrease fling velocity

    const wheelTrack = document.querySelector("#wheel-track");
    if (wheelTrack) {
      wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
      updateWheelLayout(wheelTrack, wheelTrack.children.length);
      checkLoopEdges(wheelTrack, wheelTrack.children.length);
    }

    if (Math.abs(flingVelocity) > 0.1) {
      // Keep flinging
      animationFrameID = requestAnimationFrame(animate);
    } else {
      // End fling => snap
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
