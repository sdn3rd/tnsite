(() => {
  let currentLanguage = 'en';
  let currentPoemSet = 'main';
  let lastViewedPoemId = null;
  let savedVolume = 0.3;
  let sortOrders = {};
  let lastTapTime = 0;
  const doubleTapThreshold = 500;
  let tapTimeout = null;
  const stateKey = 'spectralTapestryState'; // Used for storing user prefs in localStorage/sessionStorage

  // Expose scriptState for debugging or minor reference
  window.scriptState = {
      currentLanguage,
      currentPoemSet,
      lastViewedPoemId,
      savedVolume,
      sortOrders
  };

  document.addEventListener('DOMContentLoaded', initializePage);

  function initializePage() {
      try {
          // Initialize theme first
          initializeTheme();
          // Initialize language
          initializeLanguage();

          // Load user preferences from local storage if available
          loadState();

          // Update PoemsManager with loaded states
          PoemsManager.setCurrentLanguage(currentLanguage);
          PoemsManager.setCurrentPoemSet(currentPoemSet);
          PoemsManager.setSavedVolume(savedVolume);
          PoemsManager.initDefaultSortOrders();
          PoemsManager.setSortOrders(sortOrders);

          // Ensure day-count element and set
          ensureDayCountElement();
          PoemsManager.updateDayCount();

          // Add event listeners
          addEventListeners();

          // Start the pulsing (for day count overlay effect)
          PoemsManager.startPulsing();
      } catch (error) {
          console.error('Error during initialization:', error);
      }
  }

  /**
   * Load saved user preferences from local/session storage
   */
  function loadState() {
      try {
          // Try localStorage first
          const savedStateString = localStorage.getItem(stateKey);
          if (savedStateString) {
              const savedState = JSON.parse(savedStateString);
              if (savedState.preferredLanguage) currentLanguage = savedState.preferredLanguage;
              if (savedState.sortOrders) sortOrders = savedState.sortOrders;
              if (savedState.lastViewedPoemId) lastViewedPoemId = savedState.lastViewedPoemId;
              if (savedState.currentPoemSet) currentPoemSet = savedState.currentPoemSet;
              if (savedState.savedVolume !== undefined) savedVolume = savedState.savedVolume;
          } else {
              // Otherwise initialize default sort orders
              const sets = ['main','lupa','caliope','experiment','strands'];
              sets.forEach((s) => {
                  if (!sortOrders[s]) {
                      sortOrders[s] = 'desc';
                  }
              });
          }
      } catch (error) {
          console.warn(`Error loading state from localStorage:`, error);
      }
  }

  /**
   * Save current user preferences to localStorage (fallback to session if that fails)
   */
  function saveState() {
      const state = {
          preferredLanguage: currentLanguage,
          sortOrders,
          lastViewedPoemId,
          currentPoemSet,
          savedVolume
      };
      try {
          localStorage.setItem(stateKey, JSON.stringify(state));
          // console.log(`[script.js] State saved successfully to localStorage.`);
      } catch (error) {
          console.warn(`[script.js] localStorage failed, trying sessionStorage...`, error);
          try {
              sessionStorage.setItem(stateKey, JSON.stringify(state));
          } catch (err) {
              console.error(`[script.js] All storage methods failed.`, err);
          }
      }
  }

  /**
   * Initialize theme based on saved preference or OS setting
   */
  function initializeTheme() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
          applyTheme(savedTheme);
      } else {
          detectOSTheme();
      }
  }

  /**
   * Apply the specified theme
   * @param {string} theme - 'dark' or 'light'
   */
  function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);

      PoemsManager.updateIconsForTheme(theme);

      // If a poem is currently expanded with a custom background
      if (PoemsManager.currentExpandedPoem && PoemsManager.currentExpandedPoem.wrapper) {
          PoemsManager.applyCustomBackground(
              PoemsManager.currentExpandedPoem.poem,
              PoemsManager.currentExpandedPoem.wrapper
          );
      }
      PoemsManager.updatePlayPauseIcons();
      PoemsManager.updateDayCountImage();
  }

  /**
   * Detect OS theme preference
   */
  function detectOSTheme() {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDark ? 'dark' : 'light';
      applyTheme(theme);
  }

  /**
   * Initialize language based on saved preference or browser setting
   */
  function initializeLanguage() {
      const storedLanguage = localStorage.getItem('language');
      if (storedLanguage) {
          currentLanguage = storedLanguage;
      } else {
          const lang = navigator.language || navigator.userLanguage;
          currentLanguage = lang.startsWith('it') ? 'it' : 'en';
          localStorage.setItem('language', currentLanguage);
      }
  }

  /**
   * Add various event listeners to the page elements
   */
  function addEventListeners() {
      const hamburgerMenu = document.getElementById('hamburger-menu');
      const sideMenu = document.getElementById('side-menu');
      if (hamburgerMenu && sideMenu) {
          hamburgerMenu.addEventListener('click', (evt) => {
              evt.stopPropagation();
              sideMenu.classList.add('visible');
              hamburgerMenu.classList.add('hidden');
              const patreonIcon = document.getElementById('patreon-icon-container');
              if (patreonIcon) patreonIcon.classList.add('hidden');
          });

          document.addEventListener('click', (evt) => {
              if (!sideMenu.contains(evt.target) && !hamburgerMenu.contains(evt.target)) {
                  PoemsManager.closeSideMenu();
              }
          });
      }

      // Menu links
      const homeLink = document.getElementById('home-link');
      const caliopeLink = document.getElementById('caliope-link');
      const lupaLink = document.getElementById('lupa-link');
      const experimentsLink = document.getElementById('experiments-link');
      const strandsLink = document.getElementById('strands-link');
      if (homeLink) {
          homeLink.addEventListener('click', () =>
              PoemsManager.switchPoemSet('main','poetry.json')
          );
      }
      if (caliopeLink) {
          caliopeLink.addEventListener('click', () =>
              PoemsManager.switchPoemSet('caliope','caliope.json')
          );
      }
      if (lupaLink) {
          lupaLink.addEventListener('click', () =>
              PoemsManager.switchPoemSet('lupa','lupa.json')
          );
      }
      if (experimentsLink) {
          experimentsLink.addEventListener('click', () =>
              PoemsManager.switchPoemSet('experiment','experiments.json')
          );
      }
      if (strandsLink) {
          strandsLink.addEventListener('click', () =>
              PoemsManager.switchPoemSet('strands','strands.json')
          );
      }

      // Language toggle
      const langToggleBtn = document.getElementById('lang-toggle');
      if (langToggleBtn) {
          langToggleBtn.addEventListener('click', () => {
              PoemsManager.toggleLanguage();
              PoemsManager.updateFooterText();
              saveState();
          });
      }

      // Dark mode toggle
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      if (darkModeToggle) {
          darkModeToggle.addEventListener('click', toggleTheme);
      }

      // Expand/Collapse All
      const expandAllBtn = document.getElementById('expand-all');
      const collapseAllBtn = document.getElementById('collapse-all');
      if (expandAllBtn && PoemsManager.expandAllPoems) {
          expandAllBtn.addEventListener('click', () => PoemsManager.expandAllPoems());
      }
      if (collapseAllBtn && PoemsManager.collapseAllPoems) {
          collapseAllBtn.addEventListener('click', () => PoemsManager.collapseAllPoems());
      }

      // Sort toggle
      const sortToggleBtn = document.getElementById('sort-toggle');
      if (sortToggleBtn) {
          sortToggleBtn.addEventListener('click', () => {
              PoemsManager.toggleSortOrder();
              saveState();
          });
      }

      // "day-count" double-tap logic
      const dayCountElement = document.getElementById('day-count');
      if (dayCountElement) {
          dayCountElement.addEventListener('click', handleDayCountTap);
          dayCountElement.addEventListener('touchstart', handleDayCountTap);
      }

      // Laughing Man overlay
      const overlay = document.getElementById('laughingman-overlay');
      if (overlay) {
          overlay.addEventListener('click', PoemsManager.hideLaughingManOverlay);
          overlay.addEventListener('touchstart', PoemsManager.hideLaughingManOverlay);
      }

      // Poem click logging: we rely on poems.js to handle that if needed
  }

  /**
   * Handle double tap on day count element
   */
  function handleDayCountTap() {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;
      lastTapTime = now;
      if (timeSinceLastTap < doubleTapThreshold && tapTimeout) {
          clearTimeout(tapTimeout);
          tapTimeout = null;
          PoemsManager.showLaughingManOverlay();
          PoemsManager.stopPulsing();
      } else {
          tapTimeout = setTimeout(() => {
              PoemsManager.showLaughingManIcon();
              PoemsManager.stopPulsing();
              tapTimeout = null;
          }, doubleTapThreshold);
      }
  }

  /**
   * Toggle between dark and light themes
   */
  function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
  }

  /**
   * Ensure 'day-count' element exists
   */
  function ensureDayCountElement() {
      const dayCountElement = document.getElementById('day-count');
      if (!dayCountElement) {
          const newDayCount = document.createElement('div');
          newDayCount.id = 'day-count';
          document.body.prepend(newDayCount);
      }
  }

  // Expose a minimal script interface
  window.script = {
      saveState
  };
})();
