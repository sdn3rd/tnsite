// script.js is loaded and running.
console.log('script.js is loaded and running.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();
});

function initializePage() {
    console.log('Initializing page...');
    initializeTheme();
    addEventListeners();
    loadSection('introduction'); // Load the default section
    updateYear();
    updatePatreonIcon();
    duplicatePanes(); // Call the duplicatePanes function after initialization
    adjustPaneImages(); // Adjust pane images on load
}

/* ------------------ Theme functions ------------------ */
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

function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
    updatePatreonIcon();
    updateAllIcons(theme); // Update all icons based on the current theme
}

function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    console.log(`Detected OS theme preference: ${theme}`);
    applyTheme(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggleImages = document.querySelectorAll('footer #theme-toggle img');
    themeToggleImages.forEach(themeIcon => {
        themeIcon.src = theme === 'light' ? 'icons/darkmode.png' : 'icons/lightmode.png';
        console.log(`Theme toggle icon updated to: ${themeIcon.src}`);
    });
}

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

/* Update all icons based on the current theme */
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
        if (src && (src.includes('/pane') || src.match(/pane\\d+\\.png$/))) {
            console.log(`Excluding pane image: ${src}`);
            return;
        }

        if (src) {
            // Skip images that already have _alt in their filename when switching to light
            if (theme === 'light') {
                if (!src.includes('_alt') && src.endsWith('.png')) {
                    const altSrc = src.replace('.png', '_alt.png');
                    img.setAttribute('src', altSrc);
                    console.log(`Switched ${src} to ${altSrc}`);
                }
            } else { // theme === 'dark'
                if (src.includes('_alt') && src.endsWith('_alt.png')) {
                    const darkSrc = src.replace('_alt.png', '.png');
                    img.setAttribute('src', darkSrc);
                    console.log(`Switched ${src} to ${darkSrc}`);
                }
            }
        }
    });
}

/* ------------------ Event Listeners ------------------ */
function addEventListeners() {
    // Theme Toggle in Footer
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

    // Hamburger Menu Toggle
    const hamburgerMenu = document.getElementById('menu-icon-container');
    if (hamburgerMenu) {
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
        console.warn('Hamburger menu not found.');
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        const sideMenu = document.getElementById('side-menu');
        const hamburgerMenu = document.getElementById('menu-icon-container');

        if (document.body.classList.contains('menu-open')) {
            if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                document.body.classList.remove('menu-open');
                console.log('Clicked outside the menu. Menu closed.');
            }
        }
    });

    // Menu Item Clicks
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

    // Footer Toggle
    const footer = document.querySelector('footer');
    const footerToggle = document.getElementById('footer-toggle');
    const footerToggleIcon = document.getElementById('footer-toggle-icon');

    if (footer && footerToggle && footerToggleIcon) {
        // Make entire footer clickable to collapse
        footer.addEventListener('click', (event) => {
            // If the click is on the footer-toggle or theme toggle, do nothing
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

    // Adjust pane images on window resize
    window.addEventListener('resize', adjustPaneImages);
}

/* ------------------ Section Loading ------------------ */
function loadSection(section) {
    if (section === 'poetry') {
        loadPoetrySection();
    } else {
        loadContentSection(section);
    }
}

function loadContentSection(sectionId) {
    console.log(`Loading section: ${sectionId}`);
    fetch('sections.json')
        .then(response => response.json())
        .then(sections => {
            const section = sections.find(s => s.id === sectionId);
            const contentDiv = document.getElementById('main-content');
            if (section) {
                contentDiv.innerHTML = markdownToHTML(section.content);
                // Show the title section
                document.querySelector('.title-section').style.display = 'block';
            } else {
                contentDiv.innerHTML = '<p>Section not found.</p>';
                document.querySelector('.title-section').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

/* ------------------ Poetry Section ------------------ */
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';

    const poetryContainer = document.getElementById('poetry-container');

    // Attempt to load poems from cache first
    const cachedPoems = localStorage.getItem('cached_poems');
    if (cachedPoems) {
        try {
            const poemsByCategory = JSON.parse(cachedPoems);
            console.log('Loaded poems from cache:', poemsByCategory);
            displayPoetry(poemsByCategory, poetryContainer);
        } catch (parseError) {
            console.error('Error parsing cached poems:', parseError);
            // Remove corrupted cache
            localStorage.removeItem('cached_poems');
            console.warn('Corrupted cached poems removed.');
        }
    } else {
        console.log('No cached poems found.');
    }

    // Attempt to fetch fresh poems
    fetch('https://spectraltapestry.com/patreon-poetry')
        .then(response => {
            console.log('Received response from /patreon-poetry:', response);
            if (!response.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('Raw response text received.');
            let data;
            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error('Invalid JSON response from /patreon-poetry:', error);
                console.error('Response text:', text);
                throw new Error('Invalid JSON response from /patreon-poetry');
            }
            console.log('Poetry data received:', data);
            const poemsByCategory = categorizePoems(data);
            console.log('Poems categorized:', poemsByCategory);
            displayPoetry(poemsByCategory, poetryContainer);

            // Cache the fetched poems
            try {
                localStorage.setItem('cached_poems', JSON.stringify(poemsByCategory));
                console.log('Poems cached successfully.');
            } catch (e) {
                console.error('Failed to cache poems:', e);
            }
        })
        .catch(error => {
            console.error('Error loading poetry:', error);
            // If no poems were loaded from cache, display error
            if (!cachedPoems) {
                displayError('No cache, no connection.<br>We cannot display the poetry, try when you are connected.');
            }
            // Else, poems from cache are already displayed
        });
}

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
 * Display poetry with collapsible sections and poems.
 * Also adds a "reading popup" for mobile by tapping the poem text (if not matrix/puzzle).
 */
function displayPoetry(poemsByCategory, container) {
    console.log('Displaying poetry by category...');
    if (Object.keys(poemsByCategory).length === 0) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }

    container.innerHTML = ''; // Clear container

    // Sort the collections alphabetically, placing 'Throwetry' last if it exists
    const sortedCollections = Object.entries(poemsByCategory).sort((a, b) => {
        if (a[0] === 'Throwetry') return 1;
        if (b[0] === 'Throwetry') return -1;
        return a[0].localeCompare(b[0]);
    });

    for (const [collectionName, poems] of sortedCollections) {
        // Create collection wrapper
        const collectionWrapper = document.createElement('div');
        collectionWrapper.classList.add('poetry-collection');

        // Collection header
        const collectionHeader = document.createElement('div');
        collectionHeader.classList.add('collection-header');
        const formattedName = formatCollectionName(collectionName);
        collectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedName}`;
        collectionWrapper.appendChild(collectionHeader);

        // Collection content
        const collectionContent = document.createElement('div');
        collectionContent.classList.add('collection-content');
        collectionContent.style.display = 'none'; // collapsed initially

        // Sort poems alphabetically by title
        const sortedPoems = [...poems].sort((a, b) => a.title.localeCompare(b.title));

        sortedPoems.forEach(poem => {
            const poemWrapper = document.createElement('div');
            poemWrapper.classList.add('poem');

            // Poem header
            const poemHeader = document.createElement('div');
            poemHeader.classList.add('poem-header');
            const formattedTitle = formatCollectionName(poem.title);
            poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedTitle}`;

            // Poem content
            const poemContent = document.createElement('div');
            poemContent.classList.add('poem-content');
            poemContent.style.display = 'none';
            // Insert poem text, replacing linebreaks
            poemContent.innerHTML = poem.content.replace(/\n/g, '<br>');

            poemWrapper.appendChild(poemHeader);
            poemWrapper.appendChild(poemContent);

            // Click handling for poem header
            poemHeader.addEventListener('click', () => {
                const isVisible = poemContent.style.display === 'block';

                // Collapse all poems in this collection
                const allPoemContents = collectionContent.querySelectorAll('.poem-content');
                allPoemContents.forEach(pc => (pc.style.display = 'none'));
                const allPoemHeaders = collectionContent.querySelectorAll('.poem-header .toggle-icon');
                allPoemHeaders.forEach(icon => (icon.textContent = '+'));

                if (isVisible) {
                    poemContent.style.display = 'none';
                    poemHeader.querySelector('.toggle-icon').textContent = '+';
                } else {
                    poemContent.style.display = 'block';
                    poemHeader.querySelector('.toggle-icon').textContent = '−';
                    // Scroll poem to top in a way that leaves space for the footer
                    poemWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            // Keyboard accessibility for poem headers
            poemHeader.setAttribute('tabindex', '0');
            poemHeader.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    poemHeader.click(); // reuse the click handler
                }
            });

            // ADD READING POPUP FOR MOBILE
            if (isMobileDevice() && !poem.matrix_poem && !poem.puzzle_content) {
                // When tapping on the poem text itself, open reading mode
                poemContent.addEventListener('click', (evt) => {
                    evt.stopPropagation(); // Prevent collapsing
                    enterReadingMode(poem);
                });
            }

            collectionContent.appendChild(poemWrapper);
        });

        collectionWrapper.appendChild(collectionContent);
        container.appendChild(collectionWrapper);

        // Collection header collapse/expand
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

        // Keyboard accessibility for collection headers
        collectionHeader.setAttribute('tabindex', '0');
        collectionHeader.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                collectionHeader.click(); // reuse the click handler
            }
        });
    }
}

/* ------------------ Reading Popup for Mobile ------------------ */
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

// Creates an overlay to display poem text in reading mode
function enterReadingMode(poem) {
    // If an overlay already exists, remove it first
    const existingOverlay = document.getElementById('reading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'reading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; // dark overlay
    overlay.style.color = '#fff';
    overlay.style.zIndex = '9999';
    overlay.style.overflowY = 'auto';
    overlay.style.padding = '20px';

    const closeBtn = document.createElement('div');
    closeBtn.innerText = 'Close ✕';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '1.2em';
    closeBtn.style.marginBottom = '20px';
    closeBtn.style.textAlign = 'right';

    const poemTitle = document.createElement('h2');
    poemTitle.textContent = poem.title;
    poemTitle.style.marginTop = '0';

    const poemText = document.createElement('div');
    poemText.innerHTML = poem.content.replace(/\n/g, '<br>');

    // Append everything
    overlay.appendChild(closeBtn);
    overlay.appendChild(poemTitle);
    overlay.appendChild(poemText);
    document.body.appendChild(overlay);

    // Close button handler
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
}

/* ------------------ Utility Functions ------------------ */
function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

function displayError(message) {
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p class="error-message">${message}</p>`;
        console.error(`Displayed error message: ${message}`);
    } else {
        console.error('Main content container not found while displaying error.');
    }
}

function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.innerText = new Date().getFullYear();
        console.log(`Updated year to ${yearElement.innerText}`);
    } else {
        console.warn('Year element not found in footer.');
    }
}

/* Duplicate panes for the right side images */
function duplicatePanes() {
    const panels = document.querySelector('.panels');
    if (!panels) {
        console.warn('Panels container not found.');
        return;
    }

    const masterPanes = Array.from(panels.querySelectorAll('.pane')).slice(0, 8);
    const initialPaneCount = masterPanes.length;

    // Remove extra
    const allPanes = Array.from(panels.querySelectorAll('.pane'));
    allPanes.forEach((pane, index) => {
        if (index >= initialPaneCount) {
            panels.removeChild(pane);
            console.log(`Removed extra pane: index ${index}`);
        }
    });

    // Add up to desired
    const currentPaneCount = panels.querySelectorAll('.pane').length;
    const desiredPaneCount = 8;

    for (let i = currentPaneCount; i < desiredPaneCount; i++) {
        const masterPane = masterPanes[i % masterPanes.length];
        const clone = masterPane.cloneNode(true);
        clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
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

/* Adjust pane images based on viewport height */
function adjustPaneImages() {
    console.log('Adjusting pane images based on viewport height.');
    const panesContainer = document.querySelector('.panels');
    if (!panesContainer) {
        console.warn('Panels container not found.');
        return;
    }

    const masterPanes = Array.from(panesContainer.querySelectorAll('.pane')).slice(0, 8);
    const viewportHeight = window.innerHeight;
    const baseThreshold = (315 * 8) + 200; // 2520 + 200 = 2720
    const extraPaneThreshold = 335;

    let extraHeight = viewportHeight - baseThreshold;
    let additionalPanes = 0;

    if (extraHeight > 0) {
        additionalPanes = Math.floor(extraHeight / extraPaneThreshold);
    }

    const totalPanesNeeded = 8 + additionalPanes;
    const currentPanes = panesContainer.querySelectorAll('.pane').length;

    if (currentPanes < totalPanesNeeded) {
        for (let i = currentPanes; i < totalPanesNeeded; i++) {
            const masterPane = masterPanes[i % masterPanes.length];
            const clone = masterPane.cloneNode(true);
            clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
            const clonedImg = clone.querySelector('img');
            if (clonedImg) {
                clonedImg.classList.add('pane-image');
                console.log(`Cloned pane image: ${clonedImg.src}`);
            }
            panesContainer.appendChild(clone);
            console.log(`Added pane clone number ${i + 1}`);
        }
    } else if (currentPanes > totalPanesNeeded) {
        for (let i = currentPanes; i > totalPanesNeeded; i--) {
            const paneToRemove = panesContainer.querySelectorAll('.pane')[i - 1];
            panesContainer.removeChild(paneToRemove);
            console.log(`Removed pane clone number ${i}`);
        }
    }

    const paneImages = panesContainer.querySelectorAll('.pane img');
    const calculatedMaxHeight = (viewportHeight / 8) + 200;

    paneImages.forEach(img => {
        img.style.maxHeight = `${calculatedMaxHeight}px`;
        img.style.height = 'auto';
        console.log(`Set image max-height to ${calculatedMaxHeight}px for viewport height ${viewportHeight}px.`);
    });

    panesContainer.style.justifyContent = 'flex-start';
}

function formatCollectionName(name) {
    // Replace underscores with spaces and split into words
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/* ------------------ Service Worker Registration ------------------ */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New Service Worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                console.log('New Service Worker installed.');
                                // Optionally, prompt
                                if (confirm('New version available. Reload to update?')) {
                                    window.location.reload();
                                }
                            } else {
                                console.log('Content cached for offline use.');
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
