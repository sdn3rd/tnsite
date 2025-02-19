// puzzle.js
(() => {
  let currentLanguage = 'en';
  let puzzleComplete = false; // Track if puzzle is solved
  let puzzleClickHandler = null; // We'll define & remove as needed

  // ==========================
  // 1) Helper: Prepare Poem
  // ==========================
  /**
   * Normalizes the raw text by:
   * - Replacing newlines with spaces
   * - Collapsing multiple spaces into one
   * - Trimming leading/trailing spaces
   * - Padding with spaces or trimming to ensure exactly 15 characters
   * @param {string} rawText - The raw poem text
   * @returns {string} - The normalized 15-character string
   */
  function preparePuzzleText(rawText) {
    if (!rawText) return ' '.repeat(15); // Fallback to all spaces if empty

    // 1. Replace any newlines with a space.
    let merged = rawText.replace(/\r?\n/g, ' ');

    // 2. Collapse multiple spaces into one.
    merged = merged.replace(/\s+/g, ' ');

    // 3. Trim leading/trailing spaces.
    merged = merged.trim();

    // 4. Ensure exactly 15 characters:
    if (merged.length < 15) {
      merged = merged.padEnd(15, ' ');
    } else if (merged.length > 15) {
      merged = merged.slice(0, 15);
    }

    console.debug('[Puzzle] Prepared text:', JSON.stringify(merged));
    return merged;
  }

  // ================================
  // 2) puzzle.js Core Logic
  // ================================
  /**
   * Sets the current language for the puzzle.
   * @param {string} lang - The language code ('en' or 'it')
   */
  function setLanguage(lang) {
    currentLanguage = lang;
  }

  /**
   * Generates a unique key for localStorage based on the current language.
   * @returns {string} - The localStorage key
   */
  function getPuzzleStateKey() {
    return `puzzleState_${currentLanguage}`;
  }

  /**
   * Saves the current state of the puzzle to localStorage.
   * @param {HTMLElement} container - The puzzle container element
   */
  function savePuzzleState(container) {
    const tiles = Array.from(container.children).map((tile) => tile.textContent);
    const puzzleState = { tiles, puzzleComplete };
    localStorage.setItem(getPuzzleStateKey(), JSON.stringify(puzzleState));
    console.debug('[Puzzle] Saved puzzle state:', puzzleState);
  }

  /**
   * Loads the puzzle state from localStorage.
   * @param {HTMLElement} container - The puzzle container element
   * @returns {boolean} - True if a valid state was loaded, else False
   */
  function loadPuzzleState(container) {
    const savedState = localStorage.getItem(getPuzzleStateKey());
    if (!savedState) {
      console.debug('[Puzzle] No saved state found.');
      return false;
    }
    try {
      const puzzleState = JSON.parse(savedState);
      if (!puzzleState.tiles || puzzleState.tiles.length !== 16) {
        console.warn('[Puzzle] Invalid saved state structure.');
        return false;
      }

      puzzleComplete = !!puzzleState.puzzleComplete;

      // Re-apply tiles
      Array.from(container.children).forEach((tile, index) => {
        tile.textContent = puzzleState.tiles[index] || '';
        if (tile.textContent === '') {
          tile.classList.add('empty');
          tile.style.backgroundColor = 'var(--highlight-color)';
        } else {
          tile.classList.remove('empty');
          tile.style.backgroundColor = 'var(--background-color)';
        }
      });

      // Fix multiple empties if needed
      const emptyTiles = container.querySelectorAll('.puzzle-tile.empty');
      if (emptyTiles.length > 1) {
        emptyTiles.forEach((tile, idx) => {
          if (idx > 0) {
            tile.classList.remove('empty');
            tile.style.backgroundColor = 'var(--background-color)';
          }
        });
        console.warn('[Puzzle] Multiple empty tiles found. Fixed.');
      }

      // If puzzle was complete, show the overlay
      if (puzzleComplete) {
        showWinOverlay(container);
      }

      console.debug('[Puzzle] Loaded puzzle state:', puzzleState);
      return true;
    } catch (error) {
      console.error('[Puzzle] Error loading puzzle state:', error);
      return false;
    }
  }

  /**
   * Shuffles the puzzle tiles except for the last empty tile.
   * Ensures there is only one empty tile after shuffling.
   * @param {Array<HTMLElement>} tiles - The array of tile elements
   */
  function shufflePuzzleBoard(tiles) {
    for (let i = tiles.length - 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i].textContent, tiles[j].textContent] = [
        tiles[j].textContent,
        tiles[i].textContent,
      ];
    }
    const emptyTile = tiles[15];
    emptyTile.textContent = '';
    emptyTile.classList.add('empty');

    // Ensure no other empties
    for (let i = 0; i < 15; i++) {
      if (tiles[i].textContent === '') {
        [tiles[i].textContent, emptyTile.textContent] = [
          emptyTile.textContent,
          tiles[i].textContent,
        ];
        tiles[i].classList.remove('empty');
        emptyTile.classList.add('empty');
      }
    }

    console.debug('[Puzzle] Shuffled puzzle board.');
  }

  /**
   * Checks if the puzzle is solved by comparing the sequence of letters.
   * Ignores spaces and ensures letters are in the correct order.
   * @param {HTMLElement} container - The puzzle container element
   * @param {string} expectedText - The normalized expected 15-character string
   * @returns {boolean} - True if the puzzle is solved, else False
   */
  function isPuzzleSolved(container, expectedText) {
    // Extract letters from expectedText, ignoring spaces
    const expectedLetters = expectedText.replace(/\s+/g, '');
    // Extract letters from current puzzle, ignoring spaces
    const currentLetters = Array.from(container.children)
      .slice(0, 15)
      .map((tile) => tile.textContent)
      .join('')
      .replace(/\s+/g, '');

    console.debug('[Puzzle] Checking puzzle...');
    console.debug('Tiles Letters =>', JSON.stringify(currentLetters));
    console.debug('Expect Letters =>', JSON.stringify(expectedLetters));

    // Compare the sequences
    const solved = currentLetters === expectedLetters;
    console.debug(`[Puzzle] Puzzle solved: ${solved}`);
    return solved;
  }

  /**
   * Displays the win overlay with the Laughing Man image and "You Won!" text.
   * Locks the puzzle to prevent further moves.
   * @param {HTMLElement} container - The puzzle container element
   */
  function showWinOverlay(container) {
    puzzleComplete = true;
    container.removeEventListener('click', puzzleClickHandler);

    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';

    const content = document.createElement('div');
    content.className = 'win-overlay-content';

    const laughingManImg = document.createElement('img');
    laughingManImg.src = 'icons/laughingman.png';
    laughingManImg.alt = 'Laughing Man';
    laughingManImg.style.width = '150px';
    laughingManImg.style.height = '150px';

    const winText = document.createElement('h1');
    winText.textContent = currentLanguage === 'en' ? 'You Won!' : 'Hai Vinto!';
    winText.style.color = '#fff';

    content.appendChild(laughingManImg);
    content.appendChild(winText);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    // Keep for 1s, then fade out
    setTimeout(() => {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
      }, 500); // Match the CSS transition duration
    }, 1000);
  }

  /**
   * Handles the movement of a tile. Swaps it with the empty tile if adjacent.
   * After swapping, checks if the puzzle is solved.
   * @param {HTMLElement} clickedTile - The tile that was clicked
   * @param {HTMLElement} emptyTile - The currently empty tile
   * @param {HTMLElement} container - The puzzle container element
   * @param {string} expectedText - The normalized expected 15-character string
   */
  function handlePuzzleMove(clickedTile, emptyTile, container, expectedText) {
    if (puzzleComplete) return;

    const clickedIndex = Array.from(container.children).indexOf(clickedTile);
    const emptyIndex = Array.from(container.children).indexOf(emptyTile);

    const row1 = Math.floor(clickedIndex / 4);
    const col1 = clickedIndex % 4;
    const row2 = Math.floor(emptyIndex / 4);
    const col2 = emptyIndex % 4;

    // Check if the clicked tile is adjacent to the empty tile
    if (Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1) {
      // Swap the clicked tile with the empty tile
      const temp = clickedTile.textContent;
      clickedTile.textContent = '';
      emptyTile.textContent = temp;

      clickedTile.classList.add('empty');
      emptyTile.classList.remove('empty');
      clickedTile.style.backgroundColor = 'var(--highlight-color)';
      emptyTile.style.backgroundColor = 'var(--background-color)';

      // Fix multiple empties if any
      const allEmpty = container.querySelectorAll('.puzzle-tile.empty');
      if (allEmpty.length > 1) {
        allEmpty.forEach((tile, idx) => {
          if (idx > 0) {
            tile.classList.remove('empty');
            tile.style.backgroundColor = 'var(--background-color)';
          }
        });
        console.warn('[Puzzle] Multiple empty tiles detected and fixed.');
      }

      // Check if the puzzle is solved after the move
      if (isPuzzleSolved(container, expectedText)) {
        showWinOverlay(container);
      }

      // Save the updated puzzle state
      savePuzzleState(container);
    }
  }

  /**
   * Creates the puzzle board container.
   * @returns {HTMLElement} - The puzzle board container
   */
  function createPuzzleBoard() {
    const gameContainer = document.createElement('div');
    gameContainer.classList.add('puzzle-game');
    return gameContainer;
  }

  /**
   * Creates and appends the puzzle tiles to the container.
   * @param {HTMLElement} container - The puzzle container element
   * @param {string} text - The normalized 15-character string
   * @returns {Array<HTMLElement>} - The array of tile elements
   */
  function createPuzzleTiles(container, text) {
    const tiles = [];
    for (let i = 0; i < 15; i++) {
      const tile = document.createElement('div');
      tile.classList.add('puzzle-tile');
      tile.dataset.index = i;
      tile.textContent = text[i] || '';
      container.appendChild(tile);
      tiles.push(tile);
    }

    // 16th tile is empty
    const emptyTile = document.createElement('div');
    emptyTile.classList.add('puzzle-tile', 'empty');
    emptyTile.dataset.index = 15;
    emptyTile.textContent = '';
    container.appendChild(emptyTile);
    tiles.push(emptyTile);

    console.debug('[Puzzle] Created puzzle tiles:', tiles.map(t => t.textContent));
    return tiles;
  }

  /**
   * Initializes the puzzle game by setting up the board, loading state, and attaching event listeners.
   * @param {Object} poem - The poem object containing `poem_en` or `poem_it`
   * @param {HTMLElement} wrapper - The wrapper element for the poem content
   * @param {string} currentLang - The current language ('en' or 'it')
   */
  function initializePuzzleGame(poem, wrapper, currentLang) {
    console.log('[initializePuzzleGame] Initializing puzzle with language:', currentLang);
    
    puzzleComplete = false;
  
    const content = wrapper.querySelector('.poem-content');
    if (!content) {
      console.error('[Puzzle] No .poem-content found within wrapper.');
      return;
    }
  
    const existingPuzzle = content.querySelector('.puzzle-game');
    if (existingPuzzle) {
      existingPuzzle.remove();
      console.debug('[Puzzle] Removed existing puzzle instance.');
    }
  
    if (puzzleClickHandler) {
      content.removeEventListener('click', puzzleClickHandler);
      puzzleClickHandler = null;
      console.debug('[Puzzle] Removed existing puzzle click handler.');
    }
  
    if (!poem || !poem.puzzle_content) {
      console.warn('[Puzzle] Poem does not contain puzzle_content flag.');
      return;
    }
  
    let rawText = currentLang === 'en' ? poem.poem_en : poem.poem_it;
    console.log('[initializePuzzleGame] Raw text:', JSON.stringify(rawText));
    if (!rawText) {
      console.error('[Puzzle] Poem text is empty.');
      return;
    }
  
    // Normalize text
    const text = preparePuzzleText(rawText);
    console.log('[initializePuzzleGame] Prepared text:', JSON.stringify(text));
  
    // Create puzzle board and tiles
    const gameContainer = createPuzzleBoard();
    const tiles = createPuzzleTiles(gameContainer, text);
    console.log('[initializePuzzleGame] Puzzle board and tiles created.');
  
    // Insert the puzzle at the top of the content
    content.insertBefore(gameContainer, content.firstChild);
    console.log('[initializePuzzleGame] Puzzle inserted into the DOM.');
  
    // Load or shuffle puzzle state
    if (!loadPuzzleState(gameContainer)) {
      shufflePuzzleBoard(tiles);
      savePuzzleState(gameContainer);
      console.log('[initializePuzzleGame] Puzzle shuffled and state saved.');
    } else {
      if (isPuzzleSolved(gameContainer, text)) {
        showWinOverlay(gameContainer);
        console.log('[initializePuzzleGame] Puzzle is already solved.');
      }
    }
  
    // Define and attach the click handler
    puzzleClickHandler = (e) => {
      if (puzzleComplete) return;
      const clickedTile = e.target.closest('.puzzle-tile');
      if (!clickedTile) return;
  
      const emptyTile = gameContainer.querySelector('.puzzle-tile.empty');
      if (clickedTile !== emptyTile) {
        const expectedText = preparePuzzleText(rawText);
        handlePuzzleMove(clickedTile, emptyTile, gameContainer, expectedText);
      }
    };
  
    gameContainer.addEventListener('click', puzzleClickHandler);
    console.debug('[initializePuzzleGame] Puzzle click handler attached.');
  }  

  // Expose puzzle manager to the global scope
  window.PuzzleManager = {
    setLanguage,
    initializePuzzleGame,
  };
})();
