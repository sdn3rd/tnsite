// script.js (ROOT) - Updated to include "Spectral" section loading

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
                // NEW: Load "spectral" poems from poetry.json
                loadSpectralSection();
            }
            else {
                // Otherwise load a normal "content" section from sections.json
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
    // You could detect OS theme or just force "dark" by default
    const theme = 'dark';
    console.log(`Setting theme to ${theme}`);
    applyTheme(theme);
}

function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
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
    const themeToggleImages = document.querySelectorAll('footer #theme-toggle img');
    themeToggleImages.forEach(themeIcon => {
        themeIcon.src = (theme === 'light')
            ? 'icons/darkmode.png'
            : 'icons/lightmode.png';
        console.log(`Theme toggle icon updated to: ${themeIcon.src}`);
    });
}

function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (patreonIcon) {
        patreonIcon.src = (currentTheme === 'light')
            ? 'icons/patreon_alt.png'
            : 'icons/patreon.png';
        console.log(`Updated Patreon icon based on theme: ${currentTheme}`);
    } else {
        console.warn('Patreon icon not found.');
    }
}

/* 
   Update all icons based on theme (but avoid changing your pane images).
   (Placeholder logic if you want to swap *some* icons to "_alt" in light mode.)
*/
function updateAllIcons(theme) {
    console.log(`Updating all icons to ${theme} mode.`);
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        // Exclude images inside the theme toggle or your pane images
        if (img.closest('#theme-toggle')) return;
        if (img.src.match(/pane\d+\.png$/)) return;

        const src = img.getAttribute('src');
        if (!src) return;

        // Switch icon logic if you have separate "_alt" icons in light mode
        if (theme === 'light') {
            // Example: if you had "icon.png" -> "icon_alt.png"
            // if (src.endsWith('.png') && !src.includes('_alt')) {
            //     const altSrc = src.replace('.png', '_alt.png');
            //     img.setAttribute('src', altSrc);
            // }
        } else {
            // Switch back
            if (src.includes('_alt.png')) {
                const darkSrc = src.replace('_alt.png', '.png');
                img.setAttribute('src', darkSrc);
            }
        }
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
            console.log('Menu toggled: menu-open class added/removed.');
        });
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

    // Footer Toggle (if you have a #footer-toggle)
    const footer = document.querySelector('footer');
    const footerToggle = document.getElementById('footer-toggle');
    const footerToggleIcon = document.getElementById('footer-toggle-icon');
    if (footer && footerToggle && footerToggleIcon) {
        footer.addEventListener('click', (event) => {
            if (
                footerToggle.contains(event.target) ||
                document.getElementById('theme-toggle').contains(event.target)
            ) {
                return;
            }
            footer.classList.toggle('footer-collapsed');
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on footer.');
        });

        footerToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            footer.classList.toggle('footer-collapsed');
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on toggle icon.');
        });

        footerToggle.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                footer.classList.toggle('footer-collapsed');
                if (footer.classList.contains('footer-collapsed')) {
                    footerToggleIcon.textContent = '^';
                } else {
                    footerToggleIcon.textContent = 'v';
                }
                console.log('Footer toggled via keyboard.');
            }
        });
    }

    // Adjust pane images on window resize
    window.addEventListener('resize', adjustPaneImages);
}

/* ----------------------------------
   SECTION LOADING
---------------------------------- */
function loadSection(sectionId) {
    if (sectionId === 'poetry') {
        loadPoetrySection();
    } else if (sectionId === 'contact') {
        loadContactSection();
    } else {
        loadContentSection(sectionId);
    }
}

/* ----------------------------------
   LOAD REGULAR CONTENT SECTION FROM sections.json
---------------------------------- */
function loadContentSection(sectionId) {
    console.log(`Loading section: ${sectionId}`);
    fetch('sections.json')
        .then(response => response.json())
        .then(sections => {
            const section = sections.find(s => s.id === sectionId);
            const contentDiv = document.getElementById('main-content');
            if (section && contentDiv) {
                contentDiv.innerHTML = markdownToHTML(section.content);
                document.querySelector('.title-section').style.display = 'block';
            } else if (contentDiv) {
                contentDiv.innerHTML = '<p>Section not found.</p>';
                document.querySelector('.title-section').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

/* ----------------------------------
   POETRY SECTION
   (This was your custom logic
   reading from /patreon-poetry, etc.)
---------------------------------- */
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';
    const poetryContainer = document.getElementById('poetry-container');

    // (Your remote fetch logic, or local fallback)
    // For brevity, we show a placeholder or your actual code:
    const cachedPoems = localStorage.getItem('cached_poems');
    if (cachedPoems) {
        try {
            const poemsByCategory = JSON.parse(cachedPoems);
            displayPoetry(poemsByCategory, poetryContainer);
        } catch (e) {
            console.error('Error parsing cached poems:', e);
            localStorage.removeItem('cached_poems');
        }
    } else {
        console.log('No cached poems found.');
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
            try {
                localStorage.setItem('cached_poems', JSON.stringify(poemsByCategory));
            } catch (err) {
                console.error('Failed to cache poems:', err);
            }
        })
        .catch(error => {
            console.error('Error loading poetry from remote:', error);
            if (!cachedPoems) {
                displayError('No cache and no connection. Cannot display poetry now.');
            }
        });
}

function categorizePoems(poems) {
    const categories = {};
    poems.forEach(poem => {
        const cat = poem.category || 'Throwetry';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(poem);
    });
    return categories;
}

function displayPoetry(poemsByCategory, container) {
    if (!poemsByCategory || Object.keys(poemsByCategory).length === 0) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }
    container.innerHTML = '';
    const sortedCollections = Object.entries(poemsByCategory).sort((a, b) => {
        if (a[0] === 'Throwetry') return 1;
        if (b[0] === 'Throwetry') return -1;
        return a[0].localeCompare(b[0]);
    });
    // ... etc. (whatever existing logic you had)
    // This is your existing code for grouping/expanding...
}

/* ----------------------------------
   NEW: SPECTRAL SECTION
   (Loads "poetry.json" via poems.js
   and displays in #main-content)
---------------------------------- */
function loadSpectralSection() {
    console.log('Loading spectral poems (poetry.json) via poems.js...');
    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) {
        console.warn('#main-content not found.');
        return;
    }
    // Show or hide the title section as you prefer
    document.querySelector('.title-section').style.display = 'block';

    // Clear the content area and add a container for poems
    contentDiv.innerHTML = '<h1>Spectral</h1><div id="poems-container"></div>';

    // Now instruct PoemsManager to load "poetry.json"
    PoemsManager.switchPoemSet('main', 'poetry.json');
}

/* ----------------------------------
   CONTACT SECTION
---------------------------------- */
function loadContactSection() {
    console.log('Loading contact section...');
    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) {
        console.warn('#main-content not found.');
        return;
    }

    const titleSection = document.querySelector('.title-section');
    if (titleSection) {
        titleSection.style.display = 'none';
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

    initializeContactPage();
    checkSubmissionCookie();
}

function initializeContactPage() {
    console.log('Initializing Contact Page...');
    initializeTheme();
    initializeLanguage();
    addContactEventListeners();
}

function addContactEventListeners() {
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }
}

/* Submission Cookie Check etc. */
function checkSubmissionCookie() {
    // ...
}

/* -------------- READING OVERLAY (MOBILE) -------------- */
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function enterReadingMode(poem) {
    // ...
}

/* -------------- UTILITY FUNCTIONS -------------- */
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
    console.error(`[script.js] Displayed error: ${message}`);
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
        clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
        const clonedImg = clone.querySelector('img');
        if (clonedImg) clonedImg.classList.add('pane-image');
        panels.appendChild(clone);
    }
}

function adjustPaneImages() {
    console.log('Adjusting pane images based on viewport height.');
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
            clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
            const clonedImg = clone.querySelector('img');
            if (clonedImg) clonedImg.classList.add('pane-image');
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

/* -------------- LANGUAGE (OPTIONAL) -------------- */
function initializeLanguage() {
    // If you want any specific language detection, place it here
}

function toggleLanguage() {
    // Implementation if needed for contact form text, etc.
    console.log('Language toggled in root script. (Optional Implementation)');
    // ...
}
