(() => {
  // Global state for poems
  let currentLanguage = 'en';
  let currentPoemSet = 'main';
  let currentPoems = [];
  let sortOrders = {};
  let savedVolume = 0.3;
  let lastViewedPoemId = null;
  let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
  let isShowingImage = false; 
  let currentAudio = null;
  let currentPlayingPoem = null;
  let currentExpandedPoem = null;

  // Minimal fallback for poem history
  let fallbackPoemHistory = [];

  /* ------------------------------------------------------------
     LOCAL STORAGE CHECK & POEM HISTORY
  ------------------------------------------------------------ */
  function isLocalStorageAvailable() {
    const testKey = '__storage_test__';
    try {
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function storePoemHistoryEntry(poemId, title, timestamp) {
    if (isLocalStorageAvailable()) {
      const existing = localStorage.getItem('poemHistory');
      const history = existing ? JSON.parse(existing) : [];
      history.push({ poemId, title, timestamp });
      localStorage.setItem('poemHistory', JSON.stringify(history));
    } else {
      fallbackPoemHistory.push({ poemId, title, timestamp });
    }
  }

  function getPoemHistory() {
    if (isLocalStorageAvailable()) {
      const existing = localStorage.getItem('poemHistory');
      return existing ? JSON.parse(existing) : [];
    }
    return fallbackPoemHistory;
  }

  function clearPoemHistory() {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem('poemHistory');
    }
    fallbackPoemHistory = [];
  }

  /* ------------------------------------------------------------
     POEM IDENTIFICATION
  ------------------------------------------------------------ */
  function generatePoemId(poem) {
    if (poem.date_en) {
      return 'poem-' + poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    } else if (poem.title_en) {
      return 'poem-' + poem.title_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    } else if (poem.poem_en) {
      const snippet = (Array.isArray(poem.poem_en)
        ? poem.poem_en.join(' ')
        : poem.poem_en
      )
        .slice(0, 10)
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      return 'poem-' + snippet;
    }
    return 'poem-unknown';
  }

  function getPoemById(poemId) {
    return currentPoems.find((poem) => generatePoemId(poem) === poemId);
  }
  function getPoemByWrapper(wrapper) {
    const poemId = wrapper.getAttribute('id');
    return getPoemById(poemId);
  }

  /* ------------------------------------------------------------
     LOADING POEMS
  ------------------------------------------------------------ */
  async function loadPoemsFromSet(jsonFile) {
    try {
      const response = await fetch(`json/${jsonFile}`);
      if (!response.ok) {
        console.error(`Failed to fetch ${jsonFile}: ${response.status}`);
        return;
      }
      const data = await response.json();
      currentPoems = data;

      // Insert puzzle poem if needed
      if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
        insertPuzzlePoem();
      }
      await displayPoems(currentPoems, jsonFile);

    } catch (error) {
      console.error('Error loading poems:', error);
    }
  }

  /* ------------------------------------------------------------
     PUZZLE INSERTION
  ------------------------------------------------------------ */
  function insertPuzzlePoem() {
    const puzzlePoem = {
      title_en: '15 Puzzle',
      title_it: 'Gioco del 15',
      date_en: '14 December 2024',
      date_it: '14 Dicembre 2024',
      poem_en: 'IF I AM NEAR   ',
      poem_it: 'MI VIENE A ME  ',
      puzzle_content: true
    };
    currentPoems.unshift(puzzlePoem);
  }
  function isPuzzlePoemInserted() {
    return currentPoems.some(
      (poem) => poem.date_en === '14 December 2024' && poem.puzzle_content
    );
  }

  /* ------------------------------------------------------------
     DATE PARSING & FILTERING
  ------------------------------------------------------------ */
  function parseDateString(dateStr) {
    if (!dateStr) return null;
    const [dayStr, monthStr, yearStr] = dateStr.split(' ');
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);

    const monthsEn = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const monthsIt = [
      'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
    ];
    let monthIndex = monthsEn.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = monthsIt.indexOf(monthStr);
    }
    if (monthIndex === -1) {
      return null;
    }
    return new Date(year, monthIndex, day);
  }

  function filterPoemsByDate(data) {
    const today = new Date();
    today.setHours(0,0,0,0);
    return data.filter(poem => {
      if (poem.date_en) {
        const poemDate = parseDateString(poem.date_en);
        return poemDate ? poemDate <= today : true;
      }
      return true;
    });
  }

  function onPoemClicked(poem) {
    const poemId = generatePoemId(poem);
    const title = poem.title_en || poem.title_it || poem.date_en || 'No Title';
    const timestamp = new Date().toISOString();
    storePoemHistoryEntry(poemId, title, timestamp);
  }

  /* ------------------------------------------------------------
     DISPLAY POEMS
  ------------------------------------------------------------ */
  async function displayPoems(poems, jsonFile) {
    const container = document.getElementById('poems-container');
    if (!container) {
      console.error('No element with ID "poems-container" found.');
      return;
    }
    container.innerHTML = '';

    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    poems = poems.filter(p => p.poem_en || p.poem_it);
    poems = filterPoemsByDate(poems);

    if (jsonFile === 'poetry.json') {
      poems.sort((a, b) => {
        if (a.date_en && b.date_en) {
          const dateA = parseDateString(a.date_en);
          const dateB = parseDateString(b.date_en);
          return (currentSortOrder === 'asc')
            ? dateA - dateB
            : dateB - dateA;
        }
        return 0;
      });
    } else {
      if (currentSortOrder === 'desc') {
        poems = poems.slice().reverse();
      }
    }

    if (poems.length === 0) {
      console.warn('No poems available to display.');
      return;
    }

    // For matrix-poem, find max columns
    let maxColumns = 0;
    poems.forEach(poem => {
      const lines = Array.isArray(poem.poem_en) ? poem.poem_en : [poem.poem_en];
      lines.forEach(line => {
        if (line.length > maxColumns) {
          maxColumns = line.length;
        }
      });
    });

    for (let i = 0; i < poems.length; i++) {
      const poem = poems[i];
      const poemId = generatePoemId(poem);

      const poemWrapper = document.createElement('div');
      poemWrapper.classList.add('poem-wrapper');
      poemWrapper.setAttribute('id', poemId);
      poemWrapper.style.cursor = 'default';

      const content = document.createElement('div');
      content.classList.add('poem-content');

      if (poem.matrix_poem) {
        poemWrapper.classList.add('matrix-poem-wrapper');
      }

      let header = null;
      if (poem.title_en || poem.title_it || poem.date_en) {
        header = document.createElement('div');
        header.classList.add('poem-header');

        // Hide date if spectral
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('poem-date');
        const spectralSets = ['main','caliope','lupa','experiment','strands'];
        if (spectralSets.includes(currentPoemSet)) {
          dateSpan.textContent = '';
        } else {
          dateSpan.textContent = poem.date_en || '';
        }

        const titleSpan = document.createElement('span');
        titleSpan.classList.add('poem-title');
        titleSpan.textContent = (currentLanguage === 'en')
          ? (poem.title_en || '')
          : (poem.title_it || '');

        header.appendChild(dateSpan);
        header.appendChild(titleSpan);
        poemWrapper.appendChild(header);
        content.style.display = 'none';

        header.addEventListener('click', (evt) => {
          if (
            evt.target.closest('.play-pause-button') ||
            evt.target.closest('.volume-slider')
          ) {
            return;
          }
          collapseAllPoemsExcept(poemId);
          if (content.style.display === 'none' || content.style.display === '') {
            onPoemClicked(poem);
            content.style.display = 'block';
            applyCustomBackground(poem, poemWrapper);
            removeMediaControls(poemWrapper);

            if (audioDirectories.hasOwnProperty(currentPoemSet)) {
              const result = createAudioControls(poemWrapper, poem, header);
              if (!result) {
                removeMediaControls(poemWrapper);
              }
            } else {
              removeMediaControls(poemWrapper);
            }
            scrollToHeader(header);

            if (jsonFile === 'experiments.json' && poem.puzzle_content) {
              window.PuzzleManager.initializePuzzleGame(poem, poemWrapper, currentLanguage);
            }
          } else {
            content.style.display = 'none';
            removeCustomBackground(poemWrapper);
            removeMediaControls(poemWrapper);
            unhighlightPoem(poemWrapper);
          }
        });
      } else {
        content.style.display = 'block';
      }

      const poemText = document.createElement('div');
      poemText.classList.add('poem-text');
      poemText.style.cursor = 'auto';

      if (poem.matrix_poem) {
        const table = document.createElement('table');
        const lines = Array.isArray(poem.poem_en) ? poem.poem_en : [poem.poem_en];
        lines.forEach((line, row) => {
          const tr = document.createElement('tr');
          for (let col = 0; col < maxColumns; col++) {
            const char = line[col] || ' ';
            const td = document.createElement('td');
            td.textContent = (char === ' ') ? '\u00A0' : char;
            if (col === Math.floor(maxColumns / 2)) {
              td.classList.add('vertical-ribbon');
            }
            if (row === 0) {
              td.classList.add('horizontal-ribbon');
            }
            if (td.classList.contains('vertical-ribbon') || td.classList.contains('horizontal-ribbon')) {
              td.classList.add('yellow-letter');
            } else {
              td.classList.add('red-letter');
            }
            tr.appendChild(td);
          }
          table.appendChild(tr);
        });
        poemText.appendChild(table);

        if (i === 0) {
          const bowContainer = document.createElement('div');
          bowContainer.classList.add('bow-container');
          const bowLeft = document.createElement('div');
          bowLeft.classList.add('bow-left');
          const bowRight = document.createElement('div');
          bowRight.classList.add('bow-right');
          const bowKnot = document.createElement('div');
          bowKnot.classList.add('bow-knot');
          bowContainer.appendChild(bowLeft);
          bowContainer.appendChild(bowRight);
          bowContainer.appendChild(bowKnot);
          poemWrapper.appendChild(bowContainer);
        }
      } else if (!poem.puzzle_content) {
        const poemContent = (currentLanguage === 'en') ? poem.poem_en : poem.poem_it;
        poemText.innerHTML = poemContent.replace(/\n/g, '<br>');
      }

      content.appendChild(poemText);
      poemWrapper.appendChild(content);
      container.appendChild(poemWrapper);

      // Reading mode on mobile
      poemText.addEventListener('click', (evt) => {
        evt.stopPropagation();
        if (isMobileDevice && !poem.matrix_poem && !poem.puzzle_content) {
          enterReadingMode(poem); // local spectral reading mode
        }
      });
    }

    centerContent();
  }

  /* AUDIO LOGIC, ETC... (unchanged)...

     All the code you have above remains the same,
     including customBackgrounds, highlight/unhighlight, etc. */

  // ... rest of your code ...

  /* -----------------------------------------------------------
     GLOBAL READING MODE FOR PATREON (window.enterReadingModeGlobal)
  ----------------------------------------------------------- */
  function enterReadingModeGlobal(poemTitle, poemText) {
    // Only on mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
    overlay.style.color = '#fff';
    overlay.style.zIndex = '9999';
    overlay.style.overflowY = 'auto';
    overlay.style.padding = '20px';

    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.innerText = 'Close ✕';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '1.2em';
    closeBtn.style.marginBottom = '20px';
    closeBtn.style.textAlign = 'right';

    const h2 = document.createElement('h2');
    h2.textContent = poemTitle || 'Untitled Poem';

    const textDiv = document.createElement('div');
    textDiv.innerHTML = poemText.replace(/\n/g, '<br>');

    overlay.appendChild(closeBtn);
    overlay.appendChild(h2);
    overlay.appendChild(textDiv);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }

  // Expose global reading mode function
  window.enterReadingModeGlobal = enterReadingModeGlobal;


  /* 
    Finally, expose your entire PoemsManager
    (unchanged from your snippet). 
  */
  window.PoemsManager = {
    // Basic state
    setCurrentLanguage(lang) { currentLanguage = lang; },
    setCurrentPoemSet(set) { currentPoemSet = set; },
    setSortOrders(obj) { sortOrders = obj; },
    setSavedVolume(vol) { savedVolume = vol; },
    setLastViewedPoemId(id) { lastViewedPoemId = id; },
    initDefaultSortOrders() {
      const sets = ['main','lupa','caliope','experiment','strands'];
      sets.forEach(s => {
        if (!sortOrders[s]) {
          sortOrders[s] = 'desc';
        }
      });
    },

    // Puzzle
    insertPuzzlePoem,
    isPuzzlePoemInserted,

    // Loading & display
    loadPoemsFromSet,
    getPoemById,
    generatePoemId,

    // Expand/collapse
    collapseAllPoems,
    collapseAllPoemsExcept,
    expandAllPoems() {
      const wrappers = document.querySelectorAll('.poem-wrapper');
      wrappers.forEach(wrapper => {
        const content = wrapper.querySelector('.poem-content');
        if (content && content.style.display === 'none') {
          content.style.display = 'block';
          applyCustomBackground(getPoemByWrapper(wrapper), wrapper);
        }
      });
    },

    // Audio
    removeMediaControls,
    removeCustomBackground,
    highlightPoem,
    unhighlightPoem,
    scrollToHeader,
    centerContent,
    applyCustomBackground,
    createAudioControls,
    updatePlayPauseButton,

    // Sort & language
    toggleSortOrder,
    updateSortToggleLabel,
    getJsonFileForCurrentSet,
    toggleLanguage,
    setLanguage,
    updateContentLanguage,
    updateSideMenuTexts() {},
    updateFooterText() {},

    // Poem set switch
    switchPoemSet,

    // Icons (no-op placeholders if you want them)
    updateIconsForTheme() {},
    updateSideMenuIcons() {},
    updatePlayPauseIcons() {},

    // Poem history
    getPoemHistory,
    clearPoemHistory,

    // Provide current expanded poem
    get currentExpandedPoem() {
      return currentExpandedPoem;
    },

    // closeSideMenu
    closeSideMenu() {
      const sideMenu = document.getElementById('side-menu');
      const hamburgerMenu = document.getElementById('menu-icon-container');
      if (sideMenu) sideMenu.classList.remove('visible');
      if (hamburgerMenu) hamburgerMenu.classList.remove('hidden');
      const patreonIcon = document.getElementById('patreon-icon-container');
      if (patreonIcon) patreonIcon.classList.remove('hidden');

      if (currentAudio) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }
  };
})();
