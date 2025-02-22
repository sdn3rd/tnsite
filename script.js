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
let poemsForWheel = [];       // array of poem objects from JSON
const WHEEL_REPEAT_COUNT = 7; // Replicate poems for smooth looping
const WHEEL_ITEM_HEIGHT = 60; // px, match CSS
let wheelTrackOffsetY = 0;
let wheelSnapTimeout = null;

// Drag/tap detection
let isPointerDown = false;
let hasDragged = false;
let pointerDownX = 0;
let pointerDownY = 0;
let startPointerY = 0;
let pointerDownItem = null;
const TAP_THRESHOLD = 6; // px threshold for deciding a tap vs. drag
const snapEnabled = true;

// Fling Velocity Tracking
let lastPointerY = 0;
let lastMoveTime = 0;
let flingVelocity = 0;
let decelerationFactor = 0.95; // Adjust for faster/slower deceleration
let animationFrameID = null;

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
   HELPER: t(path) => returns localized text or fallback
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
------------------------------------------------------------------ */
function loadPoemsByDate(dateStr) {
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
    clearTimeout(wheelSnapTimeout);
    stopFlingAnimation(); // Stop any fling animation
    setTimeout(() => {
      overlay.style.display = "none";
      wheelTrackOffsetY = 0;
      flingVelocity = 0; // Reset velocity
    }, 400);
  };

  // Build extended list of poems
  const extendedPoems = buildInfiniteList(poemsForWheel, WHEEL_REPEAT_COUNT);
  const wheelTrack = overlay.querySelector("#wheel-track");
  wheelTrack.innerHTML = "";
  wheelTrack.style.transform = `translateY(0px)`;
  wheelTrackOffsetY = 0;

  extendedPoems.forEach((info, idx) => {
    const item = document.createElement("div");
    item.classList.add("wheel-item");
    item.dataset.index = String(idx);
    item.textContent = info.title;
    wheelTrack.appendChild(item);
  });

  // Replace old event listeners
  const newWheelTrack = wheelTrack.cloneNode(true);
  wheelTrack.parentNode.replaceChild(newWheelTrack, wheelTrack);

  // Pointer events
  newWheelTrack.addEventListener("pointerdown", onWheelPointerDown);
  newWheelTrack.addEventListener("pointermove", onWheelPointerMove);
  newWheelTrack.addEventListener("pointerup", onWheelPointerUp);
  newWheelTrack.addEventListener("pointercancel", onWheelPointerUp);
  newWheelTrack.addEventListener("pointerleave", onWheelPointerUp);

  console.log("Pointer listeners attached to wheelTrack:", newWheelTrack); // *** ADDED LOG ***
  console.log("  - pointerdown:", onWheelPointerDown);                    // *** ADDED LOG ***
  console.log("  - pointermove:", onWheelPointerMove);                    // *** ADDED LOG ***
  console.log("  - pointerup:", onWheelPointerUp);                      // *** ADDED LOG ***


  newWheelTrack.style.userSelect = "none";

  // *** MOUSE WHEEL EVENT ***
  const wheelInner = overlay.querySelector("#wheel-inner");
  wheelInner.addEventListener('wheel', onMouseWheelScroll, { passive: false });

  overlay.style.display = "block";
  wheelTrackOffsetY = 0; // Reset offset BEFORE centering and layout

  setTimeout(() => {
    overlay.classList.add("show");
    // place scroll at the middle block
    centerScrollAtMiddle(newWheelTrack, extendedPoems.length);
    updateWheelLayout(newWheelTrack, extendedPoems.length);

    // *** DEBUG LOGS for initial state ***
    console.log("showInfiniteWheelOverlay - initial wheelTrackOffsetY:", wheelTrackOffsetY);
    const centerIdx = findCenterIndex(newWheelTrack, extendedPoems.length);
    console.log("showInfiniteWheelOverlay - initial centerIndex:", centerIdx);
  }, 50);
}

/**
 * Build infinite list by repeating poems N times
 */
function buildInfiniteList(poems, repeatCount) {
  const out = [];
  poems.forEach((poem) => {
    // pick language
    poem._displayTitle = (currentLanguage === "en")
      ? (poem.title_en || "Untitled")
      : (poem.title_it || poem.title_en || "Untitled");
  });
  for (let r = 0; r < repeatCount; r++) {
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
 * Center the scroll on the middle item
 */
function centerScrollAtMiddle(wheelTrack, totalCount) {
  const middleIndex = Math.floor(totalCount / 2);
  wheelTrackOffsetY = -middleIndex * WHEEL_ITEM_HEIGHT;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
}

/**
 * If user scrolls well beyond top/bottom => jump by the entire track height
 * so we remain "centered" in the repeated list
 */
function checkLoopEdges(wheelTrack, totalCount) {
  const fullHeight = totalCount * WHEEL_ITEM_HEIGHT;
  // We'll wrap if we pass half the track
  const halfHeight = fullHeight / 2;
  const wrapThresholdUp = halfHeight;
  const wrapThresholdDown = -halfHeight;

  if (wheelTrackOffsetY > wrapThresholdUp) {
      // Scrolling down too far, wrap upwards
      wheelTrackOffsetY -= fullHeight;
      wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  } else if (wheelTrackOffsetY < wrapThresholdDown) {
      // Scrolling up too far, wrap downwards
      wheelTrackOffsetY += fullHeight;
      wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  }
}


/**
 * Find center row index based on track offset
 */
function findCenterIndex(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;

  let minDist = Infinity;
  let centerI = -1; // Initialize to -1 to indicate no center item yet
  let closestItemIndex = -1;

  for (let i = 0; i < totalCount; i++) {
    const item = wheelTrack.children[i];
    if (!item) continue; // Defensive check

    const itemYPos = wheelTrackOffsetY + i * WHEEL_ITEM_HEIGHT;
    const itemCenterY = itemYPos + i * WHEEL_ITEM_HEIGHT / 2;
    const dist = Math.abs(itemCenterY - cy);

    if (dist < minDist) {
      minDist = dist;
      centerI = i;
      closestItemIndex = i;
    }
  }

  console.log("findCenterIndex - totalCount:", totalCount, "wheelTrackOffsetY:", wheelTrackOffsetY, "closestItemIndex:", closestItemIndex, "centerI:", centerI);
  return centerI; // Returns index of closest item, or -1 if none found
}


/**
 * Scale & fade items based on distance from center
 */
function updateWheelLayout(wheelTrack, totalCount) {
  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;
  const items = wheelTrack.children;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue; // Defensive check

    const itemYPos = wheelTrackOffsetY + i * WHEEL_ITEM_HEIGHT;
    const itemCenterY = itemYPos + i * WHEEL_ITEM_HEIGHT / 2;
    const dist = Math.abs(itemCenterY - cy);

    // scale in [0.8..1.3], fade in [0.5..1.0]
    const maxScale = 1.3;
    const minScale = 0.8;
    let scale = maxScale - (dist / cy) * 0.5;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;

    item.style.transform = `scale(${scale})`;
    item.style.opacity = String(0.5 + (scale - minScale));
    item.classList.remove("active"); // Remove active class from all items
  }

  const cIndex = findCenterIndex(wheelTrack, totalCount);
  if (cIndex >= 0 && wheelTrack.children[cIndex]) { // Check if a valid center index is found
    wheelTrack.children[cIndex].classList.add("active"); // Add active class to the *correct* center item
  }
}


/* ------------------------------------------------------------------
   DRAG SCROLL: pointer events (with tap vs. drag & FLING)
------------------------------------------------------------------ */
function onWheelPointerDown(e) {
  // Only left click or touch
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  alert("Wheel Track Pointer Down Detected!"); // *** ADDED ALERT FOR TESTING ***

  isPointerDown = true;
  hasDragged = false;

  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
  startPointerY = e.clientY;

  lastPointerY = e.clientY; // For velocity calculation
  lastMoveTime = performance.now(); // For velocity calculation
  flingVelocity = 0; // Reset velocity on new pointer down
  stopFlingAnimation(); // Stop any existing fling animation

  // Capture the .wheel-item row (if any)
  pointerDownItem = e.target.closest(".wheel-item") || null;

  clearTimeout(wheelSnapTimeout);
  e.target.setPointerCapture(e.pointerId);
}

function onWheelPointerMove(e) {
  if (!isPointerDown) return;

  // Check if we've moved enough to consider it a drag
  const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
  if (!hasDragged && moveDist > TAP_THRESHOLD) {
    hasDragged = true;
  }

  // Only move the track if we've started a real drag
  if (hasDragged) {
    const deltaY = e.clientY - startPointerY;
    startPointerY = e.clientY;

    const wheelTrack = e.currentTarget;
    wheelTrackOffsetY += deltaY;
    wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;

    updateWheelLayout(wheelTrack, wheelTrack.children.length);
    checkLoopEdges(wheelTrack, wheelTrack.children.length);

    // Velocity calculation
    const currentTime = performance.now();
    const timeDiff = currentTime - lastMoveTime;
    if (timeDiff > 0) {
        flingVelocity = (e.clientY - lastPointerY) / timeDiff; // pixels per millisecond
    }
    lastPointerY = e.clientY;
    lastMoveTime = currentTime;
  }
}

function onWheelPointerUp(e) {
  if (!isPointerDown) return;
  isPointerDown = false;
  e.target.releasePointerCapture(e.pointerId);

  const wheelTrack = e.currentTarget;
  // If we didn't drag => treat as a tap
  if (!hasDragged) {
    // The user tapped. Check if they tapped on the center item
    const totalCount = wheelTrack.children.length;
    const centerIdx = findCenterIndex(wheelTrack, totalCount);
    const centerItem = wheelTrack.children[centerIdx];
    if (centerItem && pointerDownItem && centerItem === pointerDownItem) {
      // We tapped on the center item => open poem
      openPoemFromCenterItem(centerItem);
    }
  } else {
    // We dragged => SNAP + FLING
    if (snapEnabled) {
      if (Math.abs(flingVelocity) > 0.1) { // Threshold for fling
          startFlingAnimation();
      } else {
          wheelSnapTimeout = setTimeout(() => {
              snapToClosestRow(wheelTrack);
              console.log("onWheelPointerUp - calling snapToClosestRow (no fling)"); // *** DEBUG ***
          }, 100);
      }
    }
  }
  flingVelocity = 0; // Reset velocity after pointer up
}

/**
 * Open the poem from the center item
 */
function openPoemFromCenterItem(itemEl) {
  const originalIndex = parseInt(itemEl.dataset.index) % poemsForWheel.length;
  const actualPoem = poemsForWheel[originalIndex];
  if (actualPoem) {
    const tUsed = (currentLanguage === "en")
      ? (actualPoem.title_en || "Untitled")
      : (actualPoem.title_it || actualPoem.title_en || "Untitled");
    const pUsed = (currentLanguage === "en")
      ? (actualPoem.poem_en || "")
      : (actualPoem.poem_it || actualPoem.poem_en || "");
    showReadingOverlay(tUsed, pUsed);
  }
}

/**
 * Snap track offset so center item lines up
 */
function snapToClosestRow(wheelTrack) {
  const totalCount = wheelTrack.children.length;
  const centerIndex = findCenterIndex(wheelTrack, totalCount);
  console.log("snapToClosestRow - START - centerIndex:", centerIndex, "wheelTrackOffsetY:", wheelTrackOffsetY);

  if (centerIndex === -1) { // Defensive check: no center item found
    console.warn("snapToClosestRow: No center item found, skipping snap.");
    return;
  }

  const wheelInnerRect = wheelTrack.parentElement.getBoundingClientRect();
  const cy = wheelInnerRect.height / 2;
  const targetOffsetY = cy - WHEEL_ITEM_HEIGHT / 2 - centerIndex * WHEEL_ITEM_HEIGHT;
  const distToCenter = targetOffsetY - wheelTrackOffsetY;

  console.log("snapToClosestRow - targetOffsetY:", targetOffsetY, "distToCenter:", distToCenter);

  wheelTrackOffsetY += distToCenter;
  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  updateWheelLayout(wheelTrack, totalCount);
  console.log("snapToClosestRow - END - wheelTrackOffsetY AFTER:", wheelTrackOffsetY);
}

/* ------------------------------------------------------------------
   MOUSE WHEEL SCROLL
------------------------------------------------------------------ */
function onMouseWheelScroll(e) {
  e.preventDefault(); // Prevent default page scroll

  const wheelTrack = this.querySelector("#wheel-track");
  if (!wheelTrack) return;

  // Basic: move one item up/down
  const delta = Math.max(-1, Math.min(1, e.deltaY)); // -1, 0, or 1
  wheelTrackOffsetY += delta * WHEEL_ITEM_HEIGHT * -1; // Invert delta for natural scroll

  wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
  updateWheelLayout(wheelTrack, wheelTrack.children.length);
  checkLoopEdges(wheelTrack, wheelTrack.children.length);

  // Snap after scroll
  if (!isPointerDown && snapEnabled) {
    clearTimeout(wheelSnapTimeout);
    stopFlingAnimation(); // Stop any fling animation
    wheelSnapTimeout = setTimeout(() => {
      snapToClosestRow(wheelTrack);
    }, 100);
  }
}

/* ------------------------------------------------------------------
   FLING ANIMATION
------------------------------------------------------------------ */
function startFlingAnimation() {
    stopFlingAnimation(); // Stop any existing animation

    animationFrameID = requestAnimationFrame(function animateFling() {
        wheelTrackOffsetY += flingVelocity;
        const wheelTrack = document.querySelector('#wheel-track'); // Or however you access it
        if (wheelTrack) {
            wheelTrack.style.transform = `translateY(${wheelTrackOffsetY}px)`;
            updateWheelLayout(wheelTrack, wheelTrack.children.length);
            checkLoopEdges(wheelTrack, wheelTrack.children.length);
        }

        flingVelocity *= decelerationFactor; // Decrease velocity
        if (Math.abs(flingVelocity) > 0.01) { // Still moving, continue animation
            animationFrameID = requestAnimationFrame(animateFling);
        } else {
            stopFlingAnimation(); // Stop animation
            const wheelTrack = document.querySelector('#wheel-track');
            if (wheelTrack) {
                snapToClosestRow(wheelTrack); // Snap to row when fling ends
                console.log("Fling animation ended - calling snapToClosestRow"); // *** DEBUG ***
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
    setTimeout(() => { overlay.style.display = "none"; }, 400);
  };

  const titleEl = overlay.querySelector("#poem-overlay-title");
  const contentEl = overlay.querySelector("#poem-overlay-content");
  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.textContent = text;

  overlay.style.display = "block";
  setTimeout(() => overlay.classList.add("show"), 50);
}