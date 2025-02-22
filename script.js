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

// For the poem wheel
let wheelData = [];       // array of poem objects
let wheelIndex = 0;       // which poem is at the center
const WHEEL_VISIBLE_COUNT = 5; // how many items to show on screen
const wheelListDiv = null;

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

  // Wheel close button => back to calendar
  const wheelCloseBtn = document.getElementById("wheel-close-btn");
  if (wheelCloseBtn) {
    wheelCloseBtn.addEventListener("click", () => {
      hideWheel();
    });
  }

  // Poem overlay close
  const poemOverlayClose = document.getElementById("poem-overlay-close");
  if (poemOverlayClose) {
    poemOverlayClose.addEventListener("click", () => {
      hidePoemOverlay();
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
  // Show the calendar container for no confusion
  const cal = document.getElementById("calendar-container");
  if (cal) cal.style.display = "none";

  const wheelC = document.getElementById("wheel-container");
  if (wheelC) wheelC.style.display = "none";

  mainContent.innerHTML = t("aboutSection");
}

/* ------------------------------------------------------------------
   POETRY SECTION => Show monthly calendar
------------------------------------------------------------------ */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // Show calendar, hide wheel
  const cal = document.getElementById("calendar-container");
  if (cal) cal.style.display = "block";

  const wheelC = document.getElementById("wheel-container");
  if (wheelC) wheelC.style.display = "none";

  // The heading is in "poetryHeading"
  mainContent.innerHTML = `<h1>${t("poetryHeading")}</h1>`;

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
  // you had code for building table, but let's keep it simple
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // We skip re-building the entire table for brevity in code snippet,
  // but we keep your original approach:
  // ...
  // In your actual code, you'd build the day cells, etc.

  // We'll just call:
  // createCalendar(...) or something. Let's rely on your existing approach or keep minimal.

  // For demonstration, let's just say the function eventually:
  // on day click => loadPoemByDate(dateStr)
}

/**
 * HELPER to get month name from gui.json or fallback
 */
function getMonthName(mIndex) {
  let months = t("calendar.months");
  if (!Array.isArray(months) || months.length < 12) {
    months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
  }
  return months[mIndex] || "";
}

/**
 * HELPER to get day-of-week names from gui.json or fallback
 */
function getDayNames() {
  let days = t("calendar.daysOfWeek");
  if (!Array.isArray(days) || days.length < 7) {
    days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  }
  return days;
}

/**
 * Called when user clicks a date => fetch the poems & show the wheel
 */
function loadPoemByDate(dateStr) {
  console.log("Loading poems for date:", dateStr);

  fetch(`poetry/${dateStr}.json`)
    .then(resp => {
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    })
    .then(data => {
      // data is an array of poems => show them in a wheel
      if (!Array.isArray(data) || data.length === 0) {
        // no poems
        alert(t("errors.noPoemFound") + " " + dateStr);
        return;
      }
      showWheelOfPoemsForDay(data);
    })
    .catch(err => {
      console.warn(err);
      alert(t("errors.noPoemFound") + " " + dateStr);
    });
}

/* ------------------------------------------------------------------
   The "wheel" logic
------------------------------------------------------------------ */
function showWheelOfPoemsForDay(poemArray) {
  // Hide the calendar
  const cal = document.getElementById("calendar-container");
  if (cal) cal.style.display = "none";

  // Sort them by title_en (case-insensitive) or you can do another approach
  poemArray.sort((a,b) => {
    const A = (a.title_en || "").toLowerCase();
    const B = (b.title_en || "").toLowerCase();
    return A.localeCompare(B);
  });

  wheelData = poemArray;
  wheelIndex = 0; // start at 0

  const wheelC = document.getElementById("wheel-container");
  if (wheelC) wheelC.style.display = "block";

  renderWheelItems();
}

function hideWheel() {
  // Hide wheel, show calendar again
  const cal = document.getElementById("calendar-container");
  if (cal) cal.style.display = "block";

  const wheelC = document.getElementById("wheel-container");
  if (wheelC) wheelC.style.display = "none";
}

/**
 * Render the items in the "wheel-list" DIV with the correct positions
 */
function renderWheelItems() {
  const wheelList = document.getElementById("wheel-list");
  if (!wheelList) return;
  wheelList.innerHTML = "";

  // We'll display all items, but highlight which one is "center."
  // The item at wheelIndex is center => .active
  // The items near it => .nearby
  for (let i = 0; i < wheelData.length; i++) {
    const poem = wheelData[i];
    const enTitle = poem.title_en || "(Untitled)";
    const itTitle = poem.title_it || enTitle;
    const usedTitle = (currentLanguage === "en") ? enTitle : itTitle;

    const itemDiv = document.createElement("div");
    itemDiv.classList.add("wheel-item");
    itemDiv.textContent = usedTitle;

    // if i === wheelIndex => center
    if (i === wheelIndex) {
      itemDiv.classList.add("active");
    } else if (Math.abs(i - wheelIndex) <= 1) {
      itemDiv.classList.add("nearby");
    }

    // on click => if it's the center item, show poem overlay
    itemDiv.addEventListener("click", () => {
      if (i === wheelIndex) {
        // show overlay
        displayPoemOverlay(wheelData[wheelIndex]);
      } else {
        // set new center
        wheelIndex = i;
        renderWheelItems();
      }
    });

    wheelList.appendChild(itemDiv);
  }

  // We also can add a mousewheel or arrow key approach to spin:
  wheelList.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      // scroll down => next item
      if (wheelIndex < wheelData.length - 1) {
        wheelIndex++;
      }
    } else {
      // scroll up => prev item
      if (wheelIndex > 0) {
        wheelIndex--;
      }
    }
    renderWheelItems();
  }, {passive:false});

  // arrow keys
  wheelList.tabIndex = 0;
  wheelList.focus();
  wheelList.onkeydown = (e) => {
    if (e.key === "ArrowDown") {
      if (wheelIndex < wheelData.length - 1) {
        wheelIndex++;
        renderWheelItems();
      }
    } else if (e.key === "ArrowUp") {
      if (wheelIndex > 0) {
        wheelIndex--;
        renderWheelItems();
      }
    }
  };
}

/* ------------------------------------------------------------------
   Overlay to show poem text
------------------------------------------------------------------ */
function displayPoemOverlay(poem) {
  const overlay = document.getElementById("poem-overlay");
  const titleNode = document.getElementById("poem-overlay-title");
  const contentNode = document.getElementById("poem-overlay-content");

  if (!overlay || !titleNode || !contentNode) return;

  // get date/time fields
  // language-specific fields:
  const dateEn = poem.date_en || "";
  const dateIt = poem.date_it || "";
  const usedDate = (currentLanguage === "en") ? dateEn : (dateIt || dateEn);

  const enTitle = poem.title_en || "";
  const itTitle = poem.title_it || enTitle;
  const usedTitle = (currentLanguage === "en") ? enTitle : itTitle;

  const enText = poem.poem_en || "";
  const itText = poem.poem_it || enText;
  const usedText = (currentLanguage === "en") ? enText : itText;

  // Fill overlay
  titleNode.textContent = usedTitle + (usedDate ? " – " + usedDate : "");
  contentNode.innerHTML = usedText.replace(/\n/g, "<br>");

  overlay.style.display = "block";
}

function hidePoemOverlay() {
  const overlay = document.getElementById("poem-overlay");
  if (overlay) overlay.style.display = "none";
}
