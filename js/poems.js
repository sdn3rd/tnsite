(() => {
  // Global state for poems
  let currentLanguage = 'en';
  let currentPoemSet = 'main';
  let currentPoems = [];
  let sortOrders = {};
  let savedVolume = 0.3;
  let lastViewedPoemId = null;
  let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
  let isShowingImage = false; // used if you show daycount images
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
    // Prefer date_en, else title_en, else snippet of poem_en
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
    // Filter out future dates beyond today
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
    // Log poem click
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

    // Sort logic
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    poems = poems.filter(p => p.poem_en || p.poem_it);
    poems = filterPoemsByDate(poems);

    // If "poetry.json", sort by date
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
      // For other sets, reverse if "desc"
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

      // If it's a "matrix" poem
      if (poem.matrix_poem) {
        poemWrapper.classList.add('matrix-poem-wrapper');
      }

      // Build the header
      let header = null;
      if (poem.title_en || poem.title_it || poem.date_en) {
        header = document.createElement('div');
        header.classList.add('poem-header');

        // Date on the left, but hidden for spectral sets
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('poem-date');

        const spectralSets = ['main','caliope','lupa','experiment','strands'];
        if (spectralSets.includes(currentPoemSet)) {
          // hide date in spectral sets
          dateSpan.textContent = '';
        } else {
          dateSpan.textContent = poem.date_en || '';
        }

        // Title on the right
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
          // If user clicked audio controls, do nothing
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

            // If puzzle poem
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
        // If no title => always visible
        content.style.display = 'block';
      }

      // Poem text area
      const poemText = document.createElement('div');
      poemText.classList.add('poem-text');
      poemText.style.cursor = 'auto';

      if (poem.matrix_poem) {
        // Build matrix table
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

        // Bow, if first matrix poem
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
        // Normal poem
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
          enterReadingMode(poem);
        }
      });
    }

    // Center container
    centerContent();
  }

  /* ------------------------------------------------------------
     AUDIO LOGIC
  ------------------------------------------------------------ */
  const audioDirectories = {
    main: '/audio/',
    strands: '/audio/strands/'
  };

  function createAudioControls(poemWrapper, poem, header) {
    removeMediaControls(poemWrapper);
    const audioFile = getAudioFileName(poem);
    if (!audioFile) return null;

    const audioElement = document.createElement('audio');
    audioElement.classList.add('audio-element');
    audioElement.volume = savedVolume;
    audioElement.src = audioFile;
    audioElement.preload = 'metadata';
    audioElement.loop = true;

    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('media-controls');

    const playPauseButton = document.createElement('button');
    playPauseButton.classList.add('play-pause-button');
    playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = savedVolume;
    volumeSlider.classList.add('volume-slider');

    controlsContainer.appendChild(playPauseButton);
    controlsContainer.appendChild(volumeSlider);

    playPauseButton.addEventListener('click', (evt) => {
      evt.stopPropagation();
      if (audioElement.paused) {
        // Pause any other current audio
        if (currentAudio && currentAudio !== audioElement) {
          currentAudio.pause();
          updatePlayPauseButton(currentPlayingPoem, false);
        }
        audioElement.play().catch(err => console.error('Error playing audio:', err));
        playPauseButton.innerHTML = `<img src="${getIcon('pause')}" alt="Pause">`;
        highlightPoem(poemWrapper);
        currentPlayingPoem = poem;
        currentAudio = audioElement;
      } else {
        audioElement.pause();
        playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;
        unhighlightPoem(poemWrapper);
        currentPlayingPoem = null;
        currentAudio = null;
      }
    });

    volumeSlider.addEventListener('input', (evt) => {
      evt.stopPropagation();
      audioElement.volume = volumeSlider.value;
      savedVolume = parseFloat(volumeSlider.value);
      // If your root script has a saveState, call it
      window.script?.saveState?.();
    });

    audioElement.addEventListener('ended', () => {
      playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;
      unhighlightPoem(poemWrapper);
      currentPlayingPoem = null;
      currentAudio = null;
    });

    audioElement.addEventListener('play', () => {
      if (currentAudio && currentAudio !== audioElement) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
      }
      currentAudio = audioElement;
      currentPlayingPoem = poem;
    });

    // Insert controls after the header
    if (header) {
      header.parentNode.insertBefore(controlsContainer, header.nextSibling);
    } else {
      poemWrapper.appendChild(controlsContainer);
    }

    return { audioElement, controlsContainer };
  }

  function removeMediaControls(poemWrapper) {
    if (!poemWrapper) return;
    const audioElement = poemWrapper.querySelector('.audio-element');
    const controlsContainer = poemWrapper.querySelector('.media-controls');
    if (audioElement) {
      audioElement.pause();
      audioElement.remove();
    }
    if (controlsContainer) {
      controlsContainer.remove();
    }
    if (currentAudio === audioElement) {
      currentAudio = null;
      currentPlayingPoem = null;
    }
  }

  function getAudioFileName(poem) {
    if (!audioDirectories[currentPoemSet]) return null;
    const dir = audioDirectories[currentPoemSet];

    // If "main" set & poem has date => use date
    if (currentPoemSet === 'main' && poem.date_en) {
      const fileName = poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${dir}${fileName}.m4a`;
    }
    // Otherwise, try title
    if (poem.title_en) {
      const titleFileName = poem.title_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${dir}${titleFileName}.m4a`;
    }
    // If that fails, fallback to date
    if (poem.date_en) {
      const fallback = poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${dir}${fallback}.m4a`;
    }
    return null;
  }

  function updatePlayPauseButton(poem, isPlaying) {
    if (!poem) return;
    const poemId = generatePoemId(poem);
    const poemWrapper = document.getElementById(poemId);
    if (!poemWrapper) return;
    const btn = poemWrapper.querySelector('.play-pause-button');
    if (!btn) return;
    const iconType = isPlaying ? 'pause' : 'play';
    btn.innerHTML = `<img src="${getIcon(iconType)}" alt="${iconType}">`;
  }

  function getIcon(type) {
    // Use light/dark theme alt if you want
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
      return `/icons/${type}_alt.png`;
    }
    return `/icons/${type}.png`;
  }

  /* ------------------------------------------------------------
     COLLAPSE ALL / EXCEPT
  ------------------------------------------------------------ */
  function collapseAllPoems() {
    const contents = document.querySelectorAll('.poem-content');
    contents.forEach(content => {
      const wrapper = content.parentElement;
      if (wrapper && wrapper.querySelector('.poem-header')) {
        content.style.display = 'none';
        removeCustomBackground(wrapper);
        removeMediaControls(wrapper);
        unhighlightPoem(wrapper);
      }
    });
    if (currentAudio) {
      currentAudio.pause();
      updatePlayPauseButton(currentPlayingPoem, false);
      currentAudio = null;
      currentPlayingPoem = null;
    }
  }

  function collapseAllPoemsExcept(exceptPoemId) {
    const contents = document.querySelectorAll('.poem-content');
    contents.forEach(content => {
      const wrapper = content.parentElement;
      if (!wrapper) return;
      if (wrapper.id !== exceptPoemId && wrapper.querySelector('.poem-header')) {
        content.style.display = 'none';
        removeCustomBackground(wrapper);
        removeMediaControls(wrapper);
        unhighlightPoem(wrapper);
      }
    });
    if (currentAudio && currentPlayingPoem) {
      if (generatePoemId(currentPlayingPoem) !== exceptPoemId) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }
  }

  /* ------------------------------------------------------------
     CUSTOM BACKGROUNDS
  ------------------------------------------------------------ */
  const customBackgrounds = {
    '15 November 2024': {
      light: 'images/skipping_alt.jpg',
      dark: 'images/skipping.jpg'
    },
    '1 December 2024': {
      light: 'images/wallet_alt.jpg',
      dark: 'images/wallet.jpg'
    },
    '3 December 2024': {
      light: 'images/sewing_alt.jpg',
      dark: 'images/sewing.jpg'
    },
    '5 December 2024': {
      light: 'images/amnesia_alt.jpg',
      dark: 'images/amnesia.jpg'
    }
  };

  function applyCustomBackground(poem, poemWrapper) {
    if (poem.date_en && customBackgrounds[poem.date_en]) {
      const theme = document.documentElement.getAttribute('data-theme');
      const bgUrl = customBackgrounds[poem.date_en][theme] || customBackgrounds[poem.date_en].dark;
      poemWrapper.classList.add('custom-background');
      poemWrapper.style.backgroundImage = `url('${bgUrl}')`;
      currentExpandedPoem = { poem, wrapper: poemWrapper };
    } else {
      removeCustomBackground(poemWrapper);
    }
  }

  function removeCustomBackground(poemWrapper) {
    if (!poemWrapper) return;
    poemWrapper.classList.remove('custom-background');
    poemWrapper.style.backgroundImage = '';
    currentExpandedPoem = null;
  }

  /* ------------------------------------------------------------
     HIGHLIGHT / SCROLL
  ------------------------------------------------------------ */
  function highlightPoem(poemWrapper) {
    poemWrapper.classList.add('highlight');
  }
  function unhighlightPoem(poemWrapper) {
    poemWrapper.classList.remove('highlight');
  }

  function scrollToHeader(headerElement) {
    const fixedHeader = document.getElementById('header');
    const fixedHeaderHeight = fixedHeader ? fixedHeader.offsetHeight : 0;
    const rect = headerElement.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;
    const scrollTop = absoluteTop - fixedHeaderHeight;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }

  function centerContent() {
    const container = document.getElementById('poems-container');
    if (container) {
      container.style.maxWidth = '1024px';
      container.style.margin = '0 auto';
    }
  }

  /* ------------------------------------------------------------
     READING MODE ON MOBILE
  ------------------------------------------------------------ */
  function enterReadingMode(poem) {
    if (!isMobileDevice) return;
    const overlay = document.createElement('div');
    overlay.classList.add('reading-mode-overlay');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: '#fff',
      zIndex: '9999',
      overflowY: 'auto',
      padding: '20px'
    });

    // close button
    const closeBtn = document.createElement('div');
    closeBtn.innerText = 'Close ✕';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '1.2em';
    closeBtn.style.marginBottom = '20px';
    closeBtn.style.textAlign = 'right';

    const poemTitle = document.createElement('h2');
    poemTitle.textContent = poem.title_en || poem.title_it || 'Untitled Poem';

    const poemText = document.createElement('div');
    const poemContent = (currentLanguage === 'en') ? poem.poem_en : poem.poem_it;
    poemText.innerHTML = poemContent.replace(/\n/g, '<br>');

    overlay.appendChild(closeBtn);
    overlay.appendChild(poemTitle);
    overlay.appendChild(poemText);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }

  /* ------------------------------------------------------------
     SORT ORDER / LANG
  ------------------------------------------------------------ */
  function toggleSortOrder() {
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    const newSortOrder = (currentSortOrder === 'asc') ? 'desc' : 'asc';
    sortOrders[currentPoemSet] = newSortOrder;
    updateSortToggleLabel();
    loadPoemsFromSet(getJsonFileForCurrentSet());
    // If your root script has a saveState, call it
    window.script?.saveState?.();
  }
  function updateSortToggleLabel() {
    const sortToggleBtn = document.getElementById('sort-toggle');
    if (!sortToggleBtn) return;
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    sortToggleBtn.innerText = (currentSortOrder === 'asc') ? '↑' : '↓';
  }

  function getJsonFileForCurrentSet() {
    switch (currentPoemSet) {
      case 'lupa': return 'lupa.json';
      case 'caliope': return 'caliope.json';
      case 'experiment': return 'experiments.json';
      case 'strands': return 'strands.json';
      default: return 'poetry.json';
    }
  }

  async function toggleLanguage() {
    currentLanguage = (currentLanguage === 'en') ? 'it' : 'en';
    localStorage.setItem('language', currentLanguage);
    setLanguage();
    window.script?.saveState?.();
    await loadPoemsFromSet(getJsonFileForCurrentSet());
    // Update puzzle manager
    window.PuzzleManager?.setLanguage(currentLanguage);
  }

  function setLanguage() {
    document.documentElement.setAttribute('lang', currentLanguage);
    updateContentLanguage();
  }

  function updateContentLanguage() {
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
      langToggleBtn.innerText = (currentLanguage === 'en') ? 'Ita' : 'Eng';
    }
    updateSideMenuTexts();
    updateFooterText();
  }

  function updateSideMenuTexts() {
    // adapt to your actual side menu
  }

  function updateFooterText() {
    // if you have #footer-text
  }

  /* ------------------------------------------------------------
     SWITCH POEM SET
  ------------------------------------------------------------ */
  function switchPoemSet(setName, jsonFile) {
    currentPoemSet = setName;
    loadPoemsFromSet(jsonFile);
    // close side menu
    PoemsManager.closeSideMenu();
    updateSortToggleLabel();
    if (currentAudio) {
      currentAudio.pause();
      updatePlayPauseButton(currentPlayingPoem, false);
      currentAudio = null;
      currentPlayingPoem = null;
    }
  }

  /* ------------------------------------------------------------
     EXPOSE THE MANAGER
  ------------------------------------------------------------ */
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
    updateSideMenuTexts,
    updateFooterText,

    // Poem set switch
    switchPoemSet,

    // Icons (if you want to override them for theme, etc.)
    updateIconsForTheme() {},
    updateSideMenuIcons() {},
    updatePlayPauseIcons() {},

    // Poem history
    getPoemHistory,
    clearPoemHistory,

    // dayCount or laughingman logic if you want
    // isNewDay() { return false; },

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
