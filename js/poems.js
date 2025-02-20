(() => {
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

  // minimal fallback for poem history
  let fallbackPoemHistory = [];

  function isLocalStorageAvailable() {
    const testKey = '__storage_test__';
    try {
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function storePoemHistoryEntry(poemId, title, timestamp) {
    if (isLocalStorageAvailable()) {
      let existing = localStorage.getItem('poemHistory');
      let history = existing ? JSON.parse(existing) : [];
      history.push({ poemId, title, timestamp });
      localStorage.setItem('poemHistory', JSON.stringify(history));
    } else {
      fallbackPoemHistory.push({ poemId, title, timestamp });
    }
  }

  function getPoemHistory() {
    if (isLocalStorageAvailable()) {
      let existing = localStorage.getItem('poemHistory');
      return existing ? JSON.parse(existing) : [];
    } else {
      return fallbackPoemHistory;
    }
  }

  function clearPoemHistory() {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem('poemHistory');
    }
    fallbackPoemHistory = [];
  }

  function generatePoemId(poem) {
    if (poem.date_en) {
      return (
        'poem-' +
        poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
      );
    } else if (poem.title_en) {
      return (
        'poem-' +
        poem.title_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
      );
    } else if (poem.poem_en) {
      const poemContent = Array.isArray(poem.poem_en)
        ? poem.poem_en.join(' ')
        : poem.poem_en;
      const snippet = poemContent
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

  async function loadPoemsFromSet(jsonFile) {
    try {
      const response = await fetch(`json/${jsonFile}`);
      if (!response.ok) {
        console.error(`Failed to fetch ${jsonFile}: ${response.status}`);
        return;
      }
      const data = await response.json();
      currentPoems = data;
      if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
        insertPuzzlePoem();
      }
      await displayPoems(currentPoems, jsonFile);
    } catch (error) {
      console.error('Error loading poems:', error);
    }
  }

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
    return data.filter((poem) => {
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

  async function displayPoems(poems, jsonFile) {
    const container = document.getElementById('poems-container');
    if (!container) {
      console.error('No element with ID "poems-container" found.');
      return;
    }
    container.innerHTML = '';
  
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    poems = poems.filter((p) => p.poem_en || p.poem_it);
    poems = filterPoemsByDate(poems);
  
    // Sorting logic
    if (jsonFile === 'poetry.json') {
      poems.sort((a, b) => {
        if (a.date_en && b.date_en) {
          const dateA = parseDateString(a.date_en);
          const dateB = parseDateString(b.date_en);
          return currentSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
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
  
    // Determine max columns for potential matrix poems
    let maxColumns = 0;
    poems.forEach(poem => {
      const lines = Array.isArray(poem.poem_en) ? poem.poem_en : [poem.poem_en];
      lines.forEach(line => {
        if (line.length > maxColumns) {
          maxColumns = line.length;
        }
      });
    });
  
    for (let rowIndex = 0; rowIndex < poems.length; rowIndex++) {
      const poem = poems[rowIndex];
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
  
        // ---- DATE ON THE LEFT (hide if in spectral sets) ----
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('poem-date');
  
        const spectralSets = ['main','caliope','lupa','experiment','strands'];
        if (spectralSets.includes(currentPoemSet)) {
          // Hide the date for these sets
          dateSpan.textContent = '';
        } else {
          // Show the date as normal
          dateSpan.textContent = poem.date_en || '';
        }
  
        // TITLE ON THE RIGHT
        const titleSpan = document.createElement('span');
        titleSpan.classList.add('poem-title');
        titleSpan.textContent = (currentLanguage === 'en') 
          ? (poem.title_en || '') 
          : (poem.title_it || '');
  
        header.appendChild(dateSpan);
        header.appendChild(titleSpan);
  
        poemWrapper.appendChild(header);
        content.style.display = 'none';
  
        header.addEventListener('click', async (event) => {
          // If user clicked audio controls, ignore
          if (
            event.target.closest('.play-pause-button') ||
            event.target.closest('.volume-slider')
          ) {
            return;
          }
          collapseAllPoemsExcept(poemId);
  
          if (content.style.display === 'none' || content.style.display === '') {
            // Log poem click, apply background, etc.
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
  
            // If puzzle poem (only in experiments.json)
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
        // If no title/date, show content by default
        content.style.display = 'block';
      }
  
      const poemText = document.createElement('div');
      poemText.classList.add('poem-text');
      poemText.style.cursor = 'auto';
  
      if (poem.matrix_poem) {
        // Matrix poem => table layout
        const table = document.createElement('table');
        const lines = Array.isArray(poem.poem_en) ? poem.poem_en : [poem.poem_en];
        lines.forEach((line, row) => {
          const tr = document.createElement('tr');
          for (let col = 0; col < maxColumns; col++) {
            const char = line[col] || ' ';
            const td = document.createElement('td');
            td.textContent = (char === ' ') ? '\u00A0' : char;
  
            // Ribbon classes
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
  
        // If first matrix poem, add bow
        if (rowIndex === 0) {
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
        // Normal poem => text content
        const poemContent = (currentLanguage === 'en') ? poem.poem_en : poem.poem_it;
        poemText.innerHTML = poemContent.replace(/\n/g, '<br>');
      }
  
      content.appendChild(poemText);
      poemWrapper.appendChild(content);
      container.appendChild(poemWrapper);
  
      // On mobile, tapping text => reading mode
      if (isMobileDevice && !poem.matrix_poem && !poem.puzzle_content) {
        poemText.addEventListener('click', (evt) => {
          evt.stopPropagation();
          enterReadingMode(poem);
        });
      }
    }
  
    // Center final container if needed
    centerContent();
  }
  

  // audio logic
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
      window.script.saveState?.();
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
    if (currentPoemSet === 'main' && poem.date_en) {
      const fileName = poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${dir}${fileName}.m4a`;
    }
    if (poem.title_en) {
      const titleFileName = poem.title_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${dir}${titleFileName}.m4a`;
    }
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
    btn.innerHTML = `<img src="${getIcon(iconType)}" alt="${isPlaying?'Pause':'Play'}">`;
  }

  function getIcon(type) {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
      return `icons/${type}_alt.png`;
    } else {
      return `icons/${type}.png`;
    }
  }

  function collapseAllPoems() {
    const contents = document.querySelectorAll('.poem-content');
    contents.forEach((content) => {
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
    contents.forEach((content) => {
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
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const bgUrl =
        customBackgrounds[poem.date_en][currentTheme] ||
        customBackgrounds[poem.date_en].dark;
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

  function enterReadingMode(poem) {
    if (!isMobileDevice) return;
    const overlay = document.createElement('div');
    overlay.classList.add('reading-mode-overlay');
    const readingWrapper = document.createElement('div');
    readingWrapper.classList.add('reading-mode-content-wrapper');
    const readingText = document.createElement('div');
    readingText.classList.add('reading-mode-content');

    const poemContent = (currentLanguage === 'en') ? poem.poem_en : poem.poem_it;
    readingText.innerHTML = poemContent.replace(/\n/g, '<br>');

    readingWrapper.appendChild(readingText);
    overlay.appendChild(readingWrapper);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => exitReadingMode());
    document.body.classList.add('reading-mode-active');
  }

  function exitReadingMode() {
    const overlay = document.querySelector('.reading-mode-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('reading-mode-active');
  }

  function toggleSortOrder() {
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    const newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    sortOrders[currentPoemSet] = newSortOrder;
    updateSortToggleLabel();
    loadPoemsFromSet(getJsonFileForCurrentSet());
    window.script.saveState?.();
  }

  function updateSortToggleLabel() {
    const sortToggleBtn = document.getElementById('sort-toggle');
    if (!sortToggleBtn) return;
    const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
    sortToggleBtn.innerText = currentSortOrder === 'asc' ? '↑' : '↓';
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
    window.script.saveState?.();
    await loadPoemsFromSet(getJsonFileForCurrentSet());
    window.PuzzleManager.setLanguage(currentLanguage);
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
    const homeLinkText = document.querySelector('#home-link .menu-item-text');
    const caliopeLinkText = document.querySelector('#caliope-link .menu-item-text');
    const lupaLinkText = document.querySelector('#lupa-link .menu-item-text');
    const experimentsLinkText = document.querySelector('#experiments-link .menu-item-text');
    const strandsLinkText = document.querySelector('#strands-link .menu-item-text');
    if (homeLinkText) {
      homeLinkText.textContent = (currentLanguage === 'en') ? 'Home' : 'Inizio';
    }
    if (caliopeLinkText) caliopeLinkText.textContent = 'Calliope';
    if (lupaLinkText) lupaLinkText.textContent = 'La Lupa';
    if (experimentsLinkText) {
      experimentsLinkText.textContent = (currentLanguage === 'en') ? 'Experiments' : 'Esperimenti';
    }
    if (strandsLinkText) {
      strandsLinkText.textContent = (currentLanguage === 'en') ? 'Strands' : 'Fili';
    }
  }

  function updateFooterText() {
    const footerTextElement = document.getElementById('footer-text');
    if (footerTextElement) {
      footerTextElement.innerText = (currentLanguage === 'en')
        ? '© 2024 All Rights Reserved Spectral Tapestry'
        : '© 2024 Tutti i Diritti Riservati Spectral Tapestry';
    }
  }

  const startDate = new Date('2024-10-24');
  function updateDayCount() {
    // ...
  }

  let overlayHideTimer = null;
  function showLaughingManOverlay() { /* ... */ }
  function hideLaughingManOverlay() { /* ... */ }
  function showLaughingManIcon() { /* ... */ }
  function revertDayCountToDate() { /* ... */ }
  function addPulsing() { /* ... */ }
  function removePulsing() { /* ... */ }
  function startPulsing() { /* ... */ }
  function stopPulsing() { /* ... */ }
  function updateDayCountImage() { /* ... */ }
  function updateCloudIconState() { /* ... */ }

  function switchPoemSet(setName, jsonFile) {
    currentPoemSet = setName;
    loadPoemsFromSet(jsonFile);
    closeSideMenu();
    updateSortToggleLabel();
    window.script.saveState?.();
    if (currentAudio) {
      currentAudio.pause();
      updatePlayPauseButton(currentPlayingPoem, false);
      currentAudio = null;
      currentPlayingPoem = null;
    }
  }

  function updateIconsForTheme(theme) { /* ... */ }
  function updateSideMenuIcons(theme) { /* ... */ }
  function updatePlayPauseIcons() { /* ... */ }

  function setCurrentLanguage(lang) { currentLanguage = lang; }
  function setCurrentPoemSet(set) { currentPoemSet = set; }
  function setSortOrders(obj) { sortOrders = obj; }
  function setSavedVolume(vol) { savedVolume = vol; }
  function setLastViewedPoemId(id) { lastViewedPoemId = id; }
  function initDefaultSortOrders() {
    const sets = ['main','lupa','caliope','experiment','strands'];
    sets.forEach((s) => {
      if (!sortOrders[s]) {
        sortOrders[s] = 'desc';
      }
    });
  }

  window.PoemsManager = {
    setCurrentLanguage,
    setCurrentPoemSet,
    setSortOrders,
    setSavedVolume,
    setLastViewedPoemId,
    initDefaultSortOrders,
    insertPuzzlePoem,
    isPuzzlePoemInserted,
    loadPoemsFromSet,
    getPoemById,
    generatePoemId,
    collapseAllPoems,
    collapseAllPoemsExcept,
    removeMediaControls,
    removeCustomBackground,
    highlightPoem,
    unhighlightPoem,
    scrollToHeader,
    centerContent,
    applyCustomBackground,
    expandAllPoems: function() {
      const poemWrappers = document.querySelectorAll('.poem-wrapper');
      poemWrappers.forEach((wrapper) => {
        const content = wrapper.querySelector('.poem-content');
        if (content && content.style.display === 'none') {
          content.style.display = 'block';
          applyCustomBackground(getPoemByWrapper(wrapper), wrapper);
        }
      });
    },
    toggleSortOrder,
    updateSortToggleLabel,
    getJsonFileForCurrentSet,
    createAudioControls,
    updatePlayPauseButton,
    updateDayCount,
    startPulsing,
    stopPulsing,
    showLaughingManOverlay,
    hideLaughingManOverlay,
    showLaughingManIcon,
    revertDayCountToDate,
    addPulsing,
    removePulsing,
    isShowingImage,
    updateDayCountImage,
    updateCloudIconState,
    toggleLanguage,
    setLanguage,
    updateContentLanguage,
    updateSideMenuTexts,
    updateFooterText,
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
    },
    switchPoemSet,
    updateIconsForTheme,
    updateSideMenuIcons,
    updatePlayPauseIcons,
    getPoemHistory,
    clearPoemHistory,
    isNewDay() { return false; },
    get currentExpandedPoem() { return currentExpandedPoem; }
  };
})();
