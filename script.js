// script.js (ROOT) - Updated to show/hide spectral icons and call poems.js sets
console.log('script.js is loaded and running.');

/* ----------------------------------
   DOMContentLoaded Initialization
---------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();

    // Listen for side menu link clicks
    const menuItems = document.querySelectorAll('#side-menu a[data-section]');
    menuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            console.log(`Menu item clicked: ${section}`);

            if (section === 'contact') {
                loadContactSection();
            }
            else if (section === 'poetry') {
                loadPoetrySection();
            }
            else if (section === 'spectral') {
                loadSpectralSection();
            }
            else {
                // Otherwise load a normal content section
                loadSection(section);
            }

            // Close the menu
            document.body.classList.remove('menu-open');
            console.log(`Menu closed after navigating to: ${section}`);
        });
    });
});

/* ----------------------------------
   INITIALIZE PAGE
---------------------------------- */
function initializePage() {
    console.log('Initializing page...');
    initializeTheme();
    addEventListeners();
    loadSection('introduction'); // default load
    updateYear();
    updatePatreonIcon();
    duplicatePanes();
    adjustPaneImages();
}

/* ----------------------------------
   THEME FUNCTIONS (MAIN SITE)
---------------------------------- */
function initializeTheme() {
    // Force "dark" or detect OS; your choice
    const theme = 'dark';
    console.log(`Setting theme to ${theme}`);
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updatePatreonIcon();
    updateAllIcons(theme);
}

function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    console.log(`Detected OS theme preference: ${theme}`);
    applyTheme(theme);
}

function updateThemeIcon(theme) {
    // If you have a theme toggle icon in the footer, update it
}

function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (patreonIcon) {
        patreonIcon.src = (currentTheme === 'light')
            ? 'icons/patreon_alt.png'
            : 'icons/patreon.png';
    }
}

/* 
   Update all icons based on theme (avoid changing pane images).
   Placeholder logic if you have real alternate icons in light mode.
*/
function updateAllIcons(theme) {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        // Exclude images in .panes or theme toggles, etc.
        if (img.closest('#theme-toggle')) return;
        if (/pane\d+\.png$/.test(img.src)) return;

        // If you want to swap to _alt in light mode, do it here
        // For example:
        // if (theme === 'light' && img.src.endsWith('.png') && !img.src.includes('_alt')) {
        //     img.src = img.src.replace('.png', '_alt.png');
        // }
        // if (theme === 'dark' && img.src.includes('_alt.png')) {
        //     img.src = img.src.replace('_alt.png', '.png');
        // }
    });
}

/* ----------------------------------
   EVENT LISTENERS (MENU, FOOTER, ETC.)
---------------------------------- */
function addEventListeners() {
    // Hamburger Menu Toggle
    const hamburgerMenu = document.getElementById('menu-icon-container');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            document.body.classList.toggle('menu-open');
        });
        hamburgerMenu.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                document.body.classList.toggle('menu-open');
            }
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        const sideMenu = document.getElementById('side-menu');
        if (document.body.classList.contains('menu-open')) {
            if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                document.body.classList.remove('menu-open');
            }
        }
    });

    // Now add event listeners for the spectral icons (hidden by default):
    const spectralIconsContainer = document.getElementById('spectral-icons');
    if (spectralIconsContainer) {
        // Each icon triggers poems.js logic with the appropriate set
        const homeIcon = document.getElementById('spectral-home');
        const caliopeIcon = document.getElementById('spectral-caliope');
        const lupaIcon = document.getElementById('spectral-lupa');
        const experimentsIcon = document.getElementById('spectral-experiments');
        const strandsIcon = document.getElementById('spectral-strands');

        if (homeIcon) {
            homeIcon.addEventListener('click', () => {
                PoemsManager.switchPoemSet('main', 'poetry.json');
            });
        }
        if (caliopeIcon) {
            caliopeIcon.addEventListener('click', () => {
                PoemsManager.switchPoemSet('caliope', 'caliope.json');
            });
        }
        if (lupaIcon) {
            lupaIcon.addEventListener('click', () => {
                PoemsManager.switchPoemSet('lupa', 'lupa.json');
            });
        }
        if (experimentsIcon) {
            experimentsIcon.addEventListener('click', () => {
                PoemsManager.switchPoemSet('experiment', 'experiments.json');
            });
        }
        if (strandsIcon) {
            strandsIcon.addEventListener('click', () => {
                PoemsManager.switchPoemSet('strands', 'strands.json');
            });
        }
    }

    // You can also add a footer toggle if you have #footer-toggle / #footer-toggle-icon
    // etc.
    window.addEventListener('resize', adjustPaneImages);
}

/* ----------------------------------
   SECTION LOADING
---------------------------------- */
function loadSection(sectionId) {
    // If not "poetry" or "contact" or "spectral," load from sections.json
    if (sectionId === 'poetry') {
        loadPoetrySection();
    } else if (sectionId === 'contact') {
        loadContactSection();
    } else {
        // Normal content
        loadContentSection(sectionId);
    }
}

function loadContentSection(sectionId) {
    console.log(`Loading section: ${sectionId}`);
    // Always revert to normal title
    showTitleSection();
    hideSpectralIcons();

    fetch('sections.json')
        .then(response => response.json())
        .then(sections => {
            const section = sections.find(s => s.id === sectionId);
            const contentDiv = document.getElementById('main-content');
            if (section && contentDiv) {
                contentDiv.innerHTML = markdownToHTML(section.content);
            } else if (contentDiv) {
                contentDiv.innerHTML = '<p>Section not found.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

/* ----------------------------------
   POETRY SECTION (Patreon-based)
---------------------------------- */
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    showTitleSection();
    hideSpectralIcons();

    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';
    const poetryContainer = document.getElementById('poetry-container');

    // Your existing remote fetch logic, or local fallback:
    const cachedPoems = localStorage.getItem('cached_poems');
    if (cachedPoems) {
        try {
            const poemsByCategory = JSON.parse(cachedPoems);
            displayPoetry(poemsByCategory, poetryContainer);
        } catch (e) {
            console.error('Error parsing cached poems:', e);
            localStorage.removeItem('cached_poems');
        }
    }

    fetch(`https://tristannuvo.la/patreon-poetry?cacheBust=${Date.now()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const poemsByCategory = categorizePoems(data);
            displayPoetry(poemsByCategory, poetryContainer);
            localStorage.setItem('cached_poems', JSON.stringify(poemsByCategory));
        })
        .catch(error => {
            console.error('Error loading poetry from remote:', error);
        });
}

function categorizePoems(poems) {
    const categories = {};
    poems.forEach(poem => {
        const cat = poem.category || 'Throwetry';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(poem);
    });
    return categories;
}

function displayPoetry(poemsByCategory, container) {
    if (!poemsByCategory || !Object.keys(poemsByCategory).length) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }
    container.innerHTML = '';
    // Sort & display them (your existing expand/collapse logic)
    // ...
}

/* ----------------------------------
   NEW: SPECTRAL SECTION
   (Hide normal title, show spectral icons, load poetry.json)
---------------------------------- */
function loadSpectralSection() {
    console.log('Loading spectral section...');
    hideTitleSection();
    showSpectralIcons();

    // Clear main-content or set up a default
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = '<h1>Spectral Poems</h1><div id="poems-container"></div>';
    }

    // Default to main set => "poetry.json"
    // Actually load via poems.js
    PoemsManager.switchPoemSet('main','poetry.json');
}

/* ----------------------------------
   CONTACT SECTION
---------------------------------- */
function loadContactSection() {
    console.log('Loading contact section...');
    showTitleSection();
    hideSpectralIcons();

    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) {
        console.warn('#main-content not found.');
        return;
    }

    contentDiv.innerHTML = `
        <div id="contact-form-container">
            <h1 id="page-title">Leave feedback or request for takedown</h1>
            <form id="contact-form" method="POST" action="https://contact-form-worker.notaa.workers.dev">
                <label for="email" id="email-label">Your Email (optional):</label>
                <input type="email" id="email" name="email" placeholder="you@example.com">

                <label for="message" id="message-label">Your Message:</label>
                <textarea id="message" name="message" required></textarea>

                <!-- Cloudflare Turnstile Widget -->
                <div class="cf-turnstile" data-sitekey="0x4AAAAAAAyqLP0723YQLCis"></div>

                <button type="submit" id="submit-button">Send</button>
            </form>
        </div>
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0" style="width:100%; margin-top:10px;">
    `;
    // If you need language or cookie checks here, do so...
}

/* ----------------------------------
   SHOW / HIDE HELPERS
---------------------------------- */
function showTitleSection() {
    const titleSection = document.querySelector('.title-section');
    if (titleSection) {
        titleSection.style.display = 'block';
    }
}
function hideTitleSection() {
    const titleSection = document.querySelector('.title-section');
    if (titleSection) {
        titleSection.style.display = 'none';
    }
}
function showSpectralIcons() {
    const iconsDiv = document.getElementById('spectral-icons');
    if (iconsDiv) iconsDiv.style.display = 'block';
}
function hideSpectralIcons() {
    const iconsDiv = document.getElementById('spectral-icons');
    if (iconsDiv) iconsDiv.style.display = 'none';
}

/* -------------- READING OVERLAY (MOBILE) -------------- */
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function enterReadingMode(poem) {
    // ...
}

/* -------------- UTILITY -------------- */
function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

function displayError(message) {
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p class="error-message">${message}</p>`;
    }
    console.error(`[script.js] ${message}`);
}

function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.innerText = new Date().getFullYear();
    }
}

/* -------------- RIGHT PANES DUPLICATION & ADJUSTMENT -------------- */
function duplicatePanes() {
    const panels = document.querySelector('.panels');
    if (!panels) return;

    const masterPanes = Array.from(panels.querySelectorAll('.pane')).slice(0, 8);
    const allPanes = Array.from(panels.querySelectorAll('.pane'));
    allPanes.forEach((pane, index) => {
        if (index >= 8) {
            panels.removeChild(pane);
        }
    });
    const currentPaneCount = panels.querySelectorAll('.pane').length;
    const desiredPaneCount = 8;
    for (let i = currentPaneCount; i < desiredPaneCount; i++) {
        const masterPane = masterPanes[i % masterPanes.length];
        const clone = masterPane.cloneNode(true);
        panels.appendChild(clone);
    }
}

function adjustPaneImages() {
    const panesContainer = document.querySelector('.panels');
    if (!panesContainer) return;

    const masterPanes = Array.from(panesContainer.querySelectorAll('.pane')).slice(0, 8);
    const viewportHeight = window.innerHeight;
    const baseThreshold = (315 * 8) + 200; // ~2720
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
            panesContainer.appendChild(clone);
        }
    } else if (currentPanes > totalPanesNeeded) {
        for (let i = currentPanes; i > totalPanesNeeded; i--) {
            const paneToRemove = panesContainer.querySelectorAll('.pane')[i - 1];
            panesContainer.removeChild(paneToRemove);
        }
    }

    const paneImages = panesContainer.querySelectorAll('.pane img');
    const calculatedMaxHeight = (viewportHeight / 8) + 200;
    paneImages.forEach(img => {
        img.style.maxHeight = `${calculatedMaxHeight}px`;
        img.style.height = 'auto';
    });
    panesContainer.style.justifyContent = 'flex-start';
}
