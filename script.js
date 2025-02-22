/* ------------------------------------------------------------------
   script.js
   Minimal example with:
   - Hamburger (left) for side menu
   - Language toggle (EN/IT) auto-detect
   - Only "About" and "Poetry" sections
   - Poetry => Calendar with Prev/Next, highlight current day,
               no future days clickable, no days before 2024-10-24
   - Fetch "poetry/YYYY-MM-DD.json" on day click
------------------------------------------------------------------ */

console.log("script.js loaded.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired.");
  initializePage();

  // Side menu links
  const menuItems = document.querySelectorAll("#side-menu a[data-section]");
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
});

/* ------------------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------------------ */
let currentLanguage = "en";
let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

// For the calendar
let calendarYear = 0;
let calendarMonth = 0; // 0-based
const earliestDate = new Date(2024, 9, 24);  // 2024-10-24
const today = new Date();

/* ------------------------------------------------------------------
   MAIN INIT
------------------------------------------------------------------ */
function initializePage() {
  setupHamburgerMenu();
  
  detectOrLoadLanguage();
  updateLanguageToggle();
  const langToggle = document.getElementById("language-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", toggleLanguage);
  }

  // By default => load About
  loadAboutSection();
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
  
  // If user is currently in Poetry, we could re-render the calendar
  // e.g. if (document.querySelector("h1")?.textContent.includes("Poetry" or "Poesia")) { loadPoetrySection(); }
}

function updateLanguageToggle() {
  const langToggle = document.getElementById("language-toggle");
  if (!langToggle) return;
  langToggle.textContent = (currentLanguage === "en") ? "ENG" : "ITA";
}

/* ------------------------------------------------------------------
   HAMBURGER MENU
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
  if (currentLanguage === "en") {
    mainContent.innerHTML = `
      <h1>About</h1>
      <p>Welcome to Tristan Nuvola's minimal site. Enjoy the poetry in calendar form!</p>
    `;
  } else {
    mainContent.innerHTML = `
      <h1>Informazioni</h1>
      <p>Benvenuto/a nel sito minimal di Tristan Nuvola. Goditi la poesia in formato calendario!</p>
    `;
  }
}

/* ------------------------------------------------------------------
   POETRY SECTION => Monthly Calendar
------------------------------------------------------------------ */
function loadPoetrySection() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  const heading = (currentLanguage === "en") ? "Poetry" : "Poesia";
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
  if (currentLanguage === "en") {
    title.textContent = `${monthName} ${year}`;
  } else {
    // For Italian, you can have an array of months in Italian if you want
    // or just keep the same
    title.textContent = `${monthName} ${year}`;
  }

  // Prev button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = (currentLanguage === "en") ? "Prev" : "Prec";
  prevBtn.addEventListener("click", () => {
    goToPrevMonth();
  });

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = (currentLanguage === "en") ? "Next" : "Succ";
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
  // next is disabled if nextMonthDate > last day of currentMonth or > today (Month/Year)
  // We'll allow next until we reach the current month/year
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

  // Optional: show day names if you want (e.g. S, M, T, W, T, F, S)
  const dayRow = document.createElement("tr");
  const dayNamesEn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  // If you want italian day names: ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"]
  // or skip entirely
  dayNamesEn.forEach(dn => {
    const th = document.createElement("th");
    th.textContent = dn;
    dayRow.appendChild(th);
  });
  table.appendChild(dayRow);

  // figure out the first day of month & last day
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month+1, 0); // 0 => last day of prev month

  const startWeekday = firstDayOfMonth.getDay(); // 0=Sun,1=Mon,...
  const totalDays = lastDayOfMonth.getDate();

  // We'll build rows. The first row might start with blank cells
  let row = document.createElement("tr");
  // Add empty cells for days before startWeekday
  for (let i = 0; i < startWeekday; i++) {
    const emptyCell = document.createElement("td");
    emptyCell.textContent = "";
    row.appendChild(emptyCell);
  }

  // Fill day cells
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const current = new Date(year, month, dayNum);
    
    // if 7 columns, start new row
    if (row.children.length >= 7) {
      table.appendChild(row);
      row = document.createElement("tr");
    }
    
    const cell = document.createElement("td");
    cell.textContent = String(dayNum);
    cell.style.textAlign = "center";
    cell.style.cursor = "pointer";

    // If date < earliest or date > today => disable
    if (current < earliestDate || current > today) {
      cell.style.opacity = "0.3";
      cell.style.cursor = "default";
    } else {
      // clickable
      cell.addEventListener("click", () => {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2,"0");
        const dd = String(current.getDate()).padStart(2,"0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        loadPoemByDate(dateStr);
      });
    }

    // highlight if it's "today"
    if (year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate()) {
      cell.style.backgroundColor = "#555"; // or any highlight
      cell.style.color = "#fff";
      cell.style.borderRadius = "50%";
    }

    row.appendChild(cell);
  }

  // finish last row if not empty
  if (row.children.length > 0) {
    // fill remainder with empty cells if needed
    while (row.children.length < 7) {
      const emptyCell = document.createElement("td");
      row.appendChild(emptyCell);
    }
    table.appendChild(row);
  }

  poemsContainer.appendChild(table);

  // functions for nav
  function goToPrevMonth() {
    // subtract 1 from month
    // if month < 0 => month=11, year--
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
    // add 1 to month
    // if month > 11 => month=0, year++
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
  // English months
  const en = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];
  return en[mIndex] || "";
}

/* ------------------------------------------------------------------
   FETCH & DISPLAY POEM
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
      displayPoemData(data);
    })
    .catch(err => {
      console.warn(err);
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        const msg = (currentLanguage === "en")
          ? `<p style="color:red;">No poem found for ${dateStr}</p>`
          : `<p style="color:red;">Nessuna poesia trovata per ${dateStr}</p>`;
        mainContent.insertAdjacentHTML("beforeend", msg);
      }
    });
}

/**
 * Poem JSON is an array with one object
 */
function displayPoemData(poemArray) {
  const poemObj = (Array.isArray(poemArray) && poemArray.length > 0) 
    ? poemArray[0]
    : null;
  if (!poemObj) {
    console.log("Empty poem data");
    return;
  }

  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // We'll re-use #poems-container
  const poemsContainer = document.getElementById("poems-container");
  if (!poemsContainer) return;

  // Clear any old display
  // (But we keep the calendar above it, so maybe we append below or 
  //  partially clear the container)
  // For clarity, let's show the poem below the calendar
  const existingPoemDiv = document.getElementById("displayed-poem");
  if (existingPoemDiv) existingPoemDiv.remove();

  const poemDiv = document.createElement("div");
  poemDiv.id = "displayed-poem";
  poemDiv.style.marginTop = "1em";
  poemDiv.style.padding = "1em";
  poemDiv.style.border = "1px solid #666";

  // Language-specific fields
  const dateUsed = (currentLanguage === "en") ? poemObj.date_en : poemObj.date_it;
  const titleUsed = (currentLanguage === "en") ? poemObj.title_en : poemObj.title_it;
  const textUsed = (currentLanguage === "en") ? poemObj.poem_en : poemObj.poem_it;

  poemDiv.innerHTML = `
    <h2>${titleUsed || ""}</h2>
    <p style="font-style:italic;">${dateUsed || ""}</p>
    <div class="poem-content">
      ${(textUsed || "").replace(/\n/g,"<br>")}
    </div>
  `;

  poemsContainer.appendChild(poemDiv);

  // If mobile => reading mode on click
  poemDiv.addEventListener("click", e => {
    if (isMobileDevice) {
      enterReadingMode(titleUsed, textUsed);
    }
  });
}

/* Minimal reading mode overlay */
function enterReadingMode(title, text) {
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
  closeBtn.textContent = (currentLanguage === "en") ? "Close ✕" : "Chiudi ✕";

  const h2 = document.createElement("h2");
  h2.textContent = title || ((currentLanguage === "en") ? "Untitled Poem" : "Senza titolo");

  const textDiv = document.createElement("div");
  textDiv.innerHTML = (text||"").replace(/\n/g,"<br>");

  overlay.appendChild(closeBtn);
  overlay.appendChild(h2);
  overlay.appendChild(textDiv);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", () => {
    overlay.remove();
  });
}
