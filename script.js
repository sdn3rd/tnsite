// script.js

/* 
 * Ensure Dexie.js is loaded before this script.
 * This check prevents runtime errors if Dexie.js is not loaded.
 */
if (typeof Dexie === 'undefined') {
    console.error('Dexie.js is not loaded. Please include Dexie.js before script.js.');
}

/* 
 * Initialize Dexie database for caching dynamic content.
 * - 'poems': Stores poetry data.
 * - 'sections': Stores various content sections like 'introduction', etc.
 * - 'settings': Can be used for storing versioning or other settings if needed.
 */
const db = new Dexie("SiteContentDB");
db.version(1).stores({
    poems: '++id, category, title, content',
    sections: '++id, sectionId, content',
    settings: 'key, value' // For storing versioning info
    // Add more stores as needed for different content types
});

// Log to confirm that script.js is loaded
console.log('script.js is loaded and running.');

// Wait for the DOM to be fully loaded before initializing the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();
});

/**
 * Initializes the page by setting up themes, event listeners, loading default content, etc.
 */
function initializePage() {
    console.log('Initializing page...');
    initializeTheme();
    addEventListeners();
    loadSection('introduction'); // Load the default section on page load
    updateYear();
    updatePatreonIcon();
    duplicatePanes(); // Initialize pane duplication
    adjustPaneImages(); // Adjust pane images based on viewport size

    // Generate and store a unique device ID if not already present
    if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', crypto.randomUUID());
        console.log('Generated and stored new device_id.');
    }
    const deviceId = localStorage.getItem('device_id');

    // Fetch device signature for tracking or analytics purposes
    fetch('https://spectraltapestry.com/sig', {
        method: 'GET',
        headers: {
            'X-Device-ID': deviceId
        }
    }).then(response => {
        if (!response.ok) {
            console.warn('Failed to fetch device signature:', response.statusText);
        } else {
            console.log('Device signature fetched successfully.');
        }
    }).catch(error => {
        console.error('Error fetching device signature:', error);
    });
}

/* ------------------ Theme Handling Functions ------------------ */

/**
 * Initializes the theme based on saved preference or system settings.
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        console.log(`Applying saved theme: ${savedTheme}`);
        applyTheme(savedTheme);
    } else {
        console.log('No saved theme found, detecting OS theme preference.');
        detectOSTheme();
    }
}

/**
 * Applies the specified theme to the document.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
    updatePatreonIcon();
    updateAllIcons(theme); // Update all icons based on the current theme
}

/**
 * Detects the user's OS theme preference and applies it.
 */
function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    console.log(`Detected OS theme preference: ${theme}`);
    applyTheme(theme);
}

/**
 * Toggles between 'light' and 'dark' themes.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * Updates the theme toggle icon based on the current theme.
 * @param {string} theme - The current theme ('light' or 'dark').
 */
function updateThemeIcon(theme) {
    const themeToggleImages = document.querySelectorAll('footer #theme-toggle img');
    themeToggleImages.forEach(themeIcon => {
        themeIcon.src = theme === 'light' ? 'icons/darkmode.png' : 'icons/lightmode.png';
        console.log(`Theme toggle icon updated to: ${themeIcon.src}`);
    });
}

/**
 * Updates the Patreon icon based on the current theme.
 */
function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (patreonIcon) {
        patreonIcon.src = currentTheme === 'light' ? 'icons/patreon_alt.png' : 'icons/patreon.png';
        console.log(`Updated Patreon icon based on theme: ${currentTheme}`);
    } else {
        console.warn('Patreon icon not found.');
    }
}

/**
 * Updates all icons (excluding specific ones) based on the current theme.
 * @param {string} theme - The current theme ('light' or 'dark').
 */
function updateAllIcons(theme) {
    console.log(`Updating all icons to ${theme} mode.`);
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        // Exclude images inside the theme toggle button
        if (img.closest('#theme-toggle')) {
            return;
        }

        // Exclude pane images by checking if the filename starts with 'pane' or has the 'pane-image' class
        const src = img.getAttribute('src');
        if (src && (src.includes('/pane') || img.classList.contains('pane-image'))) {
            console.log(`Excluding pane image: ${src}`);
            return;
        }

        if (src) {
            // Switch to alternate icon for light theme
            if (theme === 'light') {
                if (!src.includes('_alt') && src.endsWith('.png')) {
                    const altSrc = src.replace('.png', '_alt.png');
                    img.setAttribute('src', altSrc);
                    console.log(`Switched ${src} to ${altSrc}`);
                }
            } else { // Switch back to dark theme
                if (src.includes('_alt') && src.endsWith('_alt.png')) {
                    const darkSrc = src.replace('_alt.png', '.png');
                    img.setAttribute('src', darkSrc);
                    console.log(`Switched ${src} to ${darkSrc}`);
                }
            }
        }
    });
}

/* ------------------ Event Listener Setup ------------------ */

/**
 * Adds necessary event listeners for theme toggling, menu interactions, footer interactions, etc.
 */
function addEventListeners() {
    /* Theme Toggle in Footer */
    const themeToggleFooter = document.querySelector('footer #theme-toggle');
    if (themeToggleFooter) {
        themeToggleFooter.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering footer collapse
            toggleTheme();
            console.log('Theme toggle in footer clicked.');
        });
        console.log('Added event listener for theme toggle in footer.');
    } else {
        console.warn('Theme toggle in footer not found.');
    }

    /* Hamburger Menu Toggle */
    const hamburgerMenu = document.getElementById('menu-icon-container');
    const sideMenu = document.getElementById('side-menu');

    if (hamburgerMenu && sideMenu) {
        hamburgerMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            document.body.classList.toggle('menu-open');
            console.log('Menu toggled: menu-open class added/removed.');
        });

        // Enable keyboard accessibility for hamburger menu
        hamburgerMenu.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                document.body.classList.toggle('menu-open');
                console.log('Menu toggled via keyboard: menu-open class added/removed.');
            }
        });
    } else {
        console.warn('Hamburger menu or side menu not found.');
    }

    /* Close Menu When Clicking Outside */
    document.addEventListener('click', (event) => {
        if (document.body.classList.contains('menu-open')) {
            const sideMenu = document.getElementById('side-menu');
            const hamburgerMenu = document.getElementById('menu-icon-container');

            if (sideMenu && hamburgerMenu) {
                if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                    document.body.classList.remove('menu-open');
                    console.log('Clicked outside the menu. Menu closed.');
                }
            }
        }
    });

    /* Menu Item Clicks */
    const menuItems = document.querySelectorAll('#side-menu a[data-section]');
    menuItems.forEach((item) => {
        item.addEventListener('click', function (event) {
            event.preventDefault();
            const section = this.getAttribute('data-section');
            loadSection(section);
            document.body.classList.remove('menu-open'); // Close the menu
            console.log(`Menu item clicked: ${section}. Menu closed.`);
        });

        // Enable keyboard accessibility for menu items
        item.addEventListener('keypress', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const section = this.getAttribute('data-section');
                loadSection(section);
                document.body.classList.remove('menu-open'); // Close the menu
                console.log(`Menu item clicked via keyboard: ${section}. Menu closed.`);
            }
        });
    });

    /* Footer Toggle */
    const footer = document.querySelector('footer');
    const footerToggle = document.getElementById('footer-toggle');
    const footerToggleIcon = document.getElementById('footer-toggle-icon');

    if (footer && footerToggle && footerToggleIcon) {
        // Make entire footer clickable to collapse, excluding specific elements
        footer.addEventListener('click', (event) => {
            if (footerToggle.contains(event.target) || document.getElementById('theme-toggle').contains(event.target)) {
                return;
            }
            footer.classList.toggle('footer-collapsed');
            // Toggle arrow direction
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on footer.');
        });

        // Ensure the toggle icon itself does not trigger the footer collapse when clicked
        footerToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            footer.classList.toggle('footer-collapsed');
            // Toggle arrow direction
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on toggle icon.');
        });

        // Enable keyboard accessibility for footer toggle
        footerToggle.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                footer.classList.toggle('footer-collapsed');
                // Toggle arrow direction
                if (footer.classList.contains('footer-collapsed')) {
                    footerToggleIcon.textContent = '^';
                } else {
                    footerToggleIcon.textContent = 'v';
                }
                console.log('Footer toggled via keyboard.');
            }
        });
    } else {
        console.warn('Footer toggle elements not found.');
    }

    /* Adjust pane images on window resize with debouncing to optimize performance */
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(adjustPaneImages, 200);
    });
}

/* ------------------ Section Loading Functions ------------------ */

/**
 * Loads the specified section. If the section is 'poetry', it loads poetry-specific content.
 * @param {string} section - The ID of the section to load.
 */
function loadSection(section) {
    if (section === 'poetry') {
        loadPoetrySection();
    } else {
        loadContentSection(section);
    }
}

/**
 * Loads a content section with caching via IndexedDB.
 * @param {string} sectionId - The ID of the section to load.
 */
function loadContentSection(sectionId) {
    console.log(`Loading section: ${sectionId} from cache or fetching from network.`);
    const contentDiv = document.getElementById('main-content');

    // Attempt to get the section from IndexedDB
    db.sections.where('sectionId').equals(sectionId).first()
        .then(section => {
            if (section) {
                console.log(`Loaded section "${sectionId}" from IndexedDB.`);
                contentDiv.innerHTML = markdownToHTML(section.content);
                document.querySelector('.title-section').style.display = 'block';
            } else {
                console.log(`Section "${sectionId}" not found in IndexedDB. Fetching from network...`);
                fetchSectionFromNetwork(sectionId);
            }
        })
        .catch(error => {
            console.error('Error accessing IndexedDB:', error);
            // Fail-open by fetching from network
            fetchSectionFromNetwork(sectionId);
        });

    // Fetch in the background to update cache if needed
    fetchSectionFromNetwork(sectionId, true);
}

/**
 * Fetches a section from the network and caches it in IndexedDB.
 * @param {string} sectionId - The ID of the section to fetch.
 * @param {boolean} isBackground - Indicates if the fetch is a background update.
 */
function fetchSectionFromNetwork(sectionId, isBackground = false) {
    fetch('/sections.json') // Ensure this path is correct relative to your server
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch sections: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(sections => {
            const section = sections.find(s => s.id === sectionId);
            if (section) {
                // Cache the section in IndexedDB
                db.sections.put(section)
                    .then(() => console.log(`Cached section "${sectionId}" in IndexedDB.`))
                    .catch(error => console.error('Error caching section in IndexedDB:', error));

                if (!isBackground) {
                    contentDiv.innerHTML = markdownToHTML(section.content);
                    document.querySelector('.title-section').style.display = 'block';
                }
            } else {
                if (!isBackground) {
                    displayError('Section not found.');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching sections from network:', error);
            if (!isBackground) {
                displayError('Failed to load section. Please check your internet connection.');
            }
        });
}

/* ------------------ Poetry Loading Functions ------------------ */

/**
 * Loads the poetry section with caching via IndexedDB.
 */
function loadPoetrySection() {
    console.log('Loading poetry from cache or fetching from network.');
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';

    const poetryContainer = document.getElementById('poetry-container');

    // First, attempt to load poems from IndexedDB
    db.poems.toArray()
        .then(poems => {
            if (poems.length > 0) {
                console.log('Loaded poems from IndexedDB:', poems);
                const poemsByCategory = categorizePoems(poems);
                displayPoetry(poemsByCategory, poetryContainer);
            } else {
                console.log('No poems found in IndexedDB. Fetching from network...');
                fetchPoemsFromNetwork(poetryContainer);
            }
        })
        .catch(error => {
            console.error('Error accessing IndexedDB:', error);
            // As a fail-open, attempt to fetch from network
            fetchPoemsFromNetwork(poetryContainer);
        });

    // Fetch in the background to update cache if needed
    fetchPoemsFromNetwork(poetryContainer, true);
}

/**
 * Fetches poetry data from the network and caches it in IndexedDB.
 * @param {HTMLElement} container - The container element to display poetry.
 * @param {boolean} isBackground - Indicates if the fetch is a background update.
 */
function fetchPoemsFromNetwork(container, isBackground = false) {
    fetch('/patreon-poetry') // Ensure this path is correct relative to your server
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${response.status} ${response.statusText}`);
            }
            return response.json(); // Assuming the response is JSON
        })
        .then(poems => {
            console.log('Fetched poems from network:', poems);
            // Categorize poems before caching
            const poemsByCategory = categorizePoems(poems);
            // Cache the fetched poems in IndexedDB
            db.poems.clear()
                .then(() => db.poems.bulkAdd(poems))
                .then(() => console.log('Poems cached successfully in IndexedDB.'))
                .catch(e => console.error('Failed to cache poems in IndexedDB:', e));

            if (!isBackground) {
                displayPoetry(poemsByCategory, container);
            }
        })
        .catch(error => {
            console.error('Error loading poetry from network:', error);
            // If no poems were loaded from cache, display error
            db.poems.count()
                .then(count => {
                    if (count === 0 && !isBackground) {
                        displayError('No cache, no connection.<br>We cannot display the poetry, try when you are connected.');
                    }
                    // Else, poems from cache are already displayed
                });
        });
}

/**
 * Categorizes poems by their respective categories.
 * @param {Array} poems - An array of poem objects.
 * @returns {Object} An object where keys are categories and values are arrays of poems.
 */
function categorizePoems(poems) {
    console.log('Categorizing poems...');
    const categories = {};

    poems.forEach(poem => {
        const category = poem.category || 'Throwetry';

        if (!categories[category]) {
            categories[category] = [];
        }

        categories[category].push(poem);
    });

    console.log('Categorized poems:', categories);
    return categories;
}

/**
 * Displays poetry categorized by their respective categories with collapsible sections.
 * @param {Object} poemsByCategory - An object with categories as keys and arrays of poems as values.
 * @param {HTMLElement} container - The container element to display poetry.
 */
function displayPoetry(poemsByCategory, container) {
    console.log('Displaying poetry by category.');
    if (Object.keys(poemsByCategory).length === 0) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }

    container.innerHTML = ''; // Clear container

    // Sort the collections alphabetically, moving 'Throwetry' to the end if it exists
    const sortedCollections = Object.entries(poemsByCategory).sort((a, b) => {
        if (a[0] === 'Throwetry') return 1;
        if (b[0] === 'Throwetry') return -1;
        return a[0].localeCompare(b[0]);
    });

    // For each category, create a collapsible section
    sortedCollections.forEach(([collectionName, poems]) => {
        // Create collection wrapper
        const collectionWrapper = document.createElement('div');
        collectionWrapper.classList.add('poetry-collection');

        // Collection header with formatted name
        const collectionHeader = document.createElement('div');
        collectionHeader.classList.add('collection-header');
        const formattedName = formatCollectionName(collectionName);
        collectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedName}`;
        collectionWrapper.appendChild(collectionHeader);

        // Collection content
        const collectionContent = document.createElement('div');
        collectionContent.classList.add('collection-content');
        collectionContent.style.display = 'none'; // Initially collapsed

        // Sort poems within each collection alphabetically by title
        const sortedPoems = poems.slice().sort((a, b) => a.title.localeCompare(b.title));

        // For each poem in the collection
        sortedPoems.forEach(poem => {
            // Poem wrapper
            const poemWrapper = document.createElement('div');
            poemWrapper.classList.add('poem');

            // Poem header with formatted title
            const poemHeader = document.createElement('div');
            poemHeader.classList.add('poem-header');
            const formattedTitle = formatCollectionName(poem.title); // Also format poem titles
            poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedTitle}`;
            poemWrapper.appendChild(poemHeader);

            // Poem content
            const poemContent = document.createElement('div');
            poemContent.classList.add('poem-content');
            poemContent.style.display = 'none'; // Initially collapsed
            poemContent.innerHTML = poem.content.replace(/\n/g, '<br>');
            poemWrapper.appendChild(poemContent);

            // Add event listener to poem header
            poemHeader.addEventListener('click', () => {
                const isVisible = poemContent.style.display === 'block';
                // Collapse all other poems in the same category
                const allPoemContents = collectionContent.querySelectorAll('.poem-content');
                allPoemContents.forEach(pc => pc.style.display = 'none');
                const allPoemHeaders = collectionContent.querySelectorAll('.poem-header .toggle-icon');
                allPoemHeaders.forEach(icon => icon.textContent = '+');

                if (isVisible) {
                    poemContent.style.display = 'none';
                    poemHeader.querySelector('.toggle-icon').textContent = '+';
                } else {
                    poemContent.style.display = 'block';
                    poemHeader.querySelector('.toggle-icon').textContent = '−';
                    // Scroll poem into view for better user experience
                    poemWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            // Enable keyboard accessibility for poem headers
            poemHeader.setAttribute('tabindex', '0'); // Make focusable
            poemHeader.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const isVisible = poemContent.style.display === 'block';
                    // Collapse all other poems in the same category
                    const allPoemContents = collectionContent.querySelectorAll('.poem-content');
                    allPoemContents.forEach(pc => pc.style.display = 'none');
                    const allPoemHeaders = collectionContent.querySelectorAll('.poem-header .toggle-icon');
                    allPoemHeaders.forEach(icon => icon.textContent = '+');

                    if (isVisible) {
                        poemContent.style.display = 'none';
                        poemHeader.querySelector('.toggle-icon').textContent = '+';
                    } else {
                        poemContent.style.display = 'block';
                        poemHeader.querySelector('.toggle-icon').textContent = '−';
                        // Scroll poem into view for better user experience
                        poemWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });

            collectionContent.appendChild(poemWrapper);
        });

        collectionWrapper.appendChild(collectionContent);
        container.appendChild(collectionWrapper);

        // Add event listener to collection header
        collectionHeader.addEventListener('click', () => {
            const isVisible = collectionContent.style.display === 'block';
            if (isVisible) {
                collectionContent.style.display = 'none';
                collectionHeader.querySelector('.toggle-icon').textContent = '+';
            } else {
                collectionContent.style.display = 'block';
                collectionHeader.querySelector('.toggle-icon').textContent = '−';
            }
        });

        // Enable keyboard accessibility for collection headers
        collectionHeader.setAttribute('tabindex', '0'); // Make focusable
        collectionHeader.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const isVisible = collectionContent.style.display === 'block';
                if (isVisible) {
                    collectionContent.style.display = 'none';
                    collectionHeader.querySelector('.toggle-icon').textContent = '+';
                } else {
                    collectionContent.style.display = 'block';
                    collectionHeader.querySelector('.toggle-icon').textContent = '−';
                }
            }
        });
    }

/* ------------------ Utility Functions ------------------ */

/**
 * Converts Markdown-like syntax to HTML.
 * @param {string} text - The text containing Markdown syntax.
 * @returns {string} The converted HTML string.
 */
function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

/**
 * Displays an error message in the main content area.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p class="error-message">${message}</p>`;
        console.error(`Displayed error message: ${message}`);
    } else {
        console.error('Main content container not found while displaying error.');
    }
}

/**
 * Updates the footer year dynamically.
 */
function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.innerText = new Date().getFullYear();
        console.log(`Updated year to ${yearElement.innerText}`);
    } else {
        console.warn('Year element not found in footer.');
    }
}

/* ------------------ Pane Management Functions ------------------ */

/**
 * Duplicates pane elements to ensure there are always 8 panes in the panels container.
 * This function resets the panes to the master list and clones them as needed.
 */
function duplicatePanes() {
    const panels = document.querySelector('.panels');
    if (!panels) {
        console.warn('Panels container not found.');
        return;
    }

    // Master list of first 8 panes to clone from
    const masterPanes = Array.from(panels.querySelectorAll('.pane')).slice(0, 8);
    const initialPaneCount = masterPanes.length;

    // Remove any additional panes beyond the master list
    const allPanes = Array.from(panels.querySelectorAll('.pane'));
    allPanes.forEach((pane, index) => {
        if (index >= initialPaneCount) {
            panels.removeChild(pane);
            console.log(`Removed extra pane: index ${index}`);
        }
    });

    // Clone panes as needed to maintain 8 panes
    const currentPaneCount = panels.querySelectorAll('.pane').length;
    const desiredPaneCount = 8; // Initial desired count

    for (let i = currentPaneCount; i < desiredPaneCount; i++) {
        const masterPane = masterPanes[i % masterPanes.length];
        const clone = masterPane.cloneNode(true);
        clone.classList.remove(`pane${(i % masterPanes.length) + 1}`); // Remove unique classes if any

        // Ensure the cloned image retains the 'pane-image' class
        const clonedImg = clone.querySelector('img');
        if (clonedImg) {
            clonedImg.classList.add('pane-image');
            console.log(`Cloned pane image: ${clonedImg.src}`);
        }
        panels.appendChild(clone);
        console.log(`Added cloned pane number ${i + 1}`);
    }

    console.log('Duplicate panes have been reset to the master list.');
}

/**
 * Adjusts pane images based on viewport height and adds/removes panes dynamically.
 * This ensures responsive design and optimal display across different devices.
 */
function adjustPaneImages() {
    console.log('Adjusting pane images based on viewport height.');
    const panesContainer = document.querySelector('.panels');
    if (!panesContainer) {
        console.warn('Panels container not found.');
        return;
    }

    const masterPanes = Array.from(panesContainer.querySelectorAll('.pane')).slice(0, 8); // Master list of first 8 panes
    const viewportHeight = window.innerHeight;
    const baseThreshold = (315 * 8) + 200; // 2520 + 200 = 2720px
    const extraPaneThreshold = 335; // For every 335px beyond the baseThreshold, add one pane

    // Calculate the number of additional panes needed based on viewport height
    let extraHeight = viewportHeight - baseThreshold;
    let additionalPanes = 0;

    if (extraHeight > 0) {
        additionalPanes = Math.floor(extraHeight / extraPaneThreshold);
    }

    // Total panes needed
    const totalPanesNeeded = 8 + additionalPanes;

    // Current number of panes
    const currentPanes = panesContainer.querySelectorAll('.pane').length;

    // Adjust the number of panes
    if (currentPanes < totalPanesNeeded) {
        // Add more panes by cloning from the master list
        for (let i = currentPanes; i < totalPanesNeeded; i++) {
            const masterPane = masterPanes[i % masterPanes.length];
            const clone = masterPane.cloneNode(true);
            // Remove unique classes if any
            clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
            // Ensure the cloned image retains the 'pane-image' class
            const clonedImg = clone.querySelector('img');
            if (clonedImg) {
                clonedImg.classList.add('pane-image');
                console.log(`Cloned pane image: ${clonedImg.src}`);
            }
            panesContainer.appendChild(clone);
            console.log(`Added pane clone number ${i + 1}`);
        }
    } else if (currentPanes > totalPanesNeeded) {
        // Remove excess panes
        for (let i = currentPanes; i > totalPanesNeeded; i--) {
            const paneToRemove = panesContainer.querySelectorAll('.pane')[i - 1];
            panesContainer.removeChild(paneToRemove);
            console.log(`Removed pane clone number ${i}`);
        }
    }

    // Adjust the max-height of all pane images to maintain aspect ratio
    const paneImages = panesContainer.querySelectorAll('.pane img');
    const calculatedMaxHeight = (viewportHeight / 8) + 200; // As per user requirement

    paneImages.forEach(img => {
        img.style.maxHeight = `${calculatedMaxHeight}px`;
        img.style.height = 'auto'; // Ensure aspect ratio is maintained
        console.log(`Set image max-height to ${calculatedMaxHeight}px for viewport height ${viewportHeight}px.`);
    });

    // Ensure pane images are aligned to the top
    panesContainer.style.justifyContent = 'flex-start';
}

/* ------------------ Service Worker Registration ------------------ */

/**
 * Registers the Service Worker for caching static assets and enabling offline functionality.
 * Ensure that 'sw.js' is placed in the root directory of your website.
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
