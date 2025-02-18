// script.js is loaded and running.
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
            // If "contact", call loadContactSection()
            if (section === 'contact') {
                loadContactSection();
            } else {
                // Otherwise load a normal section
                loadSection(section);
            }
            // Close the menu
            document.body.classList.remove('menu-open');
            console.log(`Menu item clicked: ${section}. Menu closed.`);
        });
    });
});

/* ----------------------------------
   INITIALIZE PAGE
---------------------------------- */
function initializePage() {
    console.log('Initializing page...');
    initializeTheme();         // from main site logic
    addEventListeners();       // hamburger menu, footer toggles, etc.
    loadSection('introduction'); // default section load
    updateYear();
    updatePatreonIcon();
    duplicatePanes();         // sets up right panes
    adjustPaneImages();       // adjusts right pane images on load
}

/* ----------------------------------
   THEME FUNCTIONS (MAIN SITE)
---------------------------------- */
function initializeTheme() {
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
   Update all icons based on theme (avoid changing pane images).
   - If theme=light => .png -> _alt.png  (placeholder logic)
   - If theme=dark  => _alt.png -> .png
*/
function updateAllIcons(theme) {
    console.log(`Updating all icons to ${theme} mode.`);
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        // Exclude images inside the theme toggle button
        if (img.closest('#theme-toggle')) {
            return;
        }

        const src = img.getAttribute('src');
        if (!src) return;

        // Exclude pane images
        if (src.includes('/pane') || src.match(/pane\d+\.png$/)) {
            console.log(`Excluding pane image: ${src}`);
            return;
        }

        // Switch to alt if light theme
        if (theme === 'light') {
            if (!src.includes('_alt') && src.endsWith('.png')) {
                // Example placeholder if you have real "_alt" assets
                // const altSrc = src.replace('.png', '_alt.png');
                // img.setAttribute('src', altSrc);
            }
        } else {
            // Switch back to dark if ends with _alt
            if (src.includes('_alt') && src.endsWith('_alt.png')) {
                const darkSrc = src.replace('_alt.png', '.png');
                img.setAttribute('src', darkSrc);
                console.log(`Switched ${src} to ${darkSrc}`);
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

    // Footer Toggle
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
    } else {
        console.warn('Footer toggle elements not found.');
    }

    // Adjust pane images on window resize
    window.addEventListener('resize', adjustPaneImages);
}

/* ----------------------------------
   SECTION LOADING
---------------------------------- */
function loadSection(section) {
    if (section === 'poetry') {
        loadPoetrySection();
    } else if (section === 'contact') {
        loadContactSection();
    } else {
        loadContentSection(section);
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
            if (section) {
                contentDiv.innerHTML = markdownToHTML(section.content);
                document.querySelector('.title-section').style.display = 'block'; // show the title section
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

/* ----------------------------------
   POETRY SECTION
   (Fetch from remote first; on error, fallback to local)
---------------------------------- */
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';
    const poetryContainer = document.getElementById('poetry-container');

    // Load from cache first for fast display
    const cachedPoems = localStorage.getItem('cached_poems');
    if (cachedPoems) {
        try {
            const poemsByCategory = JSON.parse(cachedPoems);
            console.log('Loaded poems from cache:', poemsByCategory);
            displayPoetry(poemsByCategory, poetryContainer);
        } catch (parseError) {
            console.error('Error parsing cached poems:', parseError);
            localStorage.removeItem('cached_poems');
            console.warn('Corrupted cached poems removed.');
        }
    } else {
        console.log('No cached poems found.');
    }

    // Always fetch the latest version from remote
    fetch(`https://tristannuvo.la/patreon-poetry?cacheBust=${Date.now()}`)
        .then(response => {
            console.log('Received response from /patreon-poetry:', response);
            if (!response.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Poetry data received:', data);
            const poemsByCategory = categorizePoems(data);
            console.log('Poems categorized:', poemsByCategory);

            // Display fresh content
            displayPoetry(poemsByCategory, poetryContainer);

            // Update the cache with the latest data
            try {
                localStorage.setItem('cached_poems', JSON.stringify(poemsByCategory));
                console.log('Poems cached successfully.');
            } catch (e) {
                console.error('Failed to cache poems:', e);
            }
        })
        .catch(error => {
            console.error('Error loading poetry from remote:', error);
            if (!cachedPoems) {
                displayError('No cache, no connection.<br>We cannot display the poetry, try when you are connected.');
            }
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
 * Sort by date DESC if date is present, fallback to title.
 * Then display poems grouped by category.
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

        // Format the category name
        const formattedCategory = formatCollectionName(collectionName);
        collectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedCategory}`;
        collectionWrapper.appendChild(collectionHeader);

        // Collection content
        const collectionContent = document.createElement('div');
        collectionContent.classList.add('collection-content');
        collectionContent.style.display = 'none';

        // Sort poems by date (desc), fallback to title
        const sortedPoems = [...poems].sort((a, b) => {
            const aDate = a.date ? new Date(a.date).getTime() : null;
            const bDate = b.date ? new Date(b.date).getTime() : null;

            if (aDate && bDate) {
                // Descending by date
                return bDate - aDate;
            } else if (aDate && !bDate) {
                return -1;
            } else if (!aDate && bDate) {
                return 1;
            } else {
                return a.title.localeCompare(b.title);
            }
        });

        // Build poem elements
        sortedPoems.forEach(poem => {
            const poemWrapper = document.createElement('div');
            poemWrapper.classList.add('poem');

            // Poem header
            const poemHeader = document.createElement('div');
            poemHeader.classList.add('poem-header');

            const formattedTitle = formatPoemTitle(poem.title);
            poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${formattedTitle}`;

            // Poem content
            const poemContent = document.createElement('div');
            poemContent.classList.add('poem-content');
            poemContent.style.display = 'none';
            poemContent.innerHTML = poem.content.replace(/\n/g, '<br>');

            poemWrapper.appendChild(poemHeader);
            poemWrapper.appendChild(poemContent);
            collectionContent.appendChild(poemWrapper);

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
                    poemWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            // Keyboard accessibility
            poemHeader.setAttribute('tabindex', '0');
            poemHeader.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    poemHeader.click();
                }
            });

            // MOBILE-ONLY READING OVERLAY
            // If the poem is not matrix/puzzle, show reading overlay on content click
            if (isMobileDevice() && !poem.matrix_poem && !poem.puzzle_content) {
                poemContent.addEventListener('click', evt => {
                    evt.stopPropagation();
                    enterReadingMode(poem);
                });
            }
        });

        collectionWrapper.appendChild(collectionContent);
        container.appendChild(collectionWrapper);

        // Expand/collapse entire collection
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

        // Keyboard accessibility for collection header
        collectionHeader.setAttribute('tabindex', '0');
        collectionHeader.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                collectionHeader.click();
            }
        });
    }
}

function formatCollectionName(name) {
    if (name.startsWith('#')) {
        name = name.slice(1);
    }
    name = name.replace(/_/g, ' ');

    const words = name.split(/\s+/).filter(Boolean);
    return words
        .map((word, index) => {
            if (index === 0) {
                return capitalizeWord(word);
            } else {
                if (['of', 'the'].includes(word.toLowerCase())) {
                    return word.toLowerCase();
                } else {
                    return capitalizeWord(word);
                }
            }
        })
        .join(' ');
}

function formatPoemTitle(title) {
    if (title.startsWith('#')) {
        title = title.slice(1);
    }
    const words = title.split(/\s+/).filter(Boolean);

    return words
        .map((word, index) => {
            if (index === 0) {
                return capitalizeWord(word);
            } else {
                if (['of', 'the'].includes(word.toLowerCase())) {
                    return word.toLowerCase();
                } else {
                    return capitalizeWord(word);
                }
            }
        })
        .join(' ');
}

function capitalizeWord(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
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

    // Optionally hide the title
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

        <!-- Optional volume slider; remove if you truly don't want it -->
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0" style="width:100%; margin-top:10px;">
    `;

    initializeContactPage();
    checkSubmissionCookie(); // Cookie check to block repeated submissions
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

/* Submission Cookie Check */
function checkSubmissionCookie() {
    console.log('Checking submission cookie...');
    const params = getQueryParams();
    if (params.submitted === 'true') {
        setCookie('formSubmitted', 'true', 24);

        // Remove param from URL
        if (window.history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('submitted');
            window.history.replaceState({}, document.title, url.pathname);
        }
        disableContactFormAndButton();
    }

    if (getCookie('formSubmitted') === 'true') {
        disableContactFormAndButton();
    }
}

function disableContactFormAndButton() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.style.display = 'none';
        const msg = document.createElement('p');
        msg.textContent = "You have already contacted us. Please try again in 24 hours.";
        msg.style.color = 'gray';
        msg.style.marginTop = '20px';
        contactForm.parentNode.appendChild(msg);
    }

    const contactLink = document.getElementById('contact-link');
    if (contactLink) {
        contactLink.style.display = 'none';
        const msg2 = document.createElement('p');
        msg2.textContent = "You have already contacted us. Please try again in 24 hours.";
        msg2.style.color = 'gray';
        msg2.style.marginTop = '10px';
        contactLink.parentNode.appendChild(msg2);
    }
}

/* -------------- READING OVERLAY (MOBILE) -------------- */
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function enterReadingMode(poem) {
    const existingOverlay = document.getElementById('reading-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
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

    const poemTitle = document.createElement('h2');
    poemTitle.textContent = poem.title || 'Untitled Poem';
    poemTitle.style.marginTop = '0';

    const poemText = document.createElement('div');
    poemText.innerHTML = poem.content.replace(/\n/g, '<br>');

    overlay.appendChild(closeBtn);
    overlay.appendChild(poemTitle);
    overlay.appendChild(poemText);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
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

/* -------------- RIGHT PANES DUPLICATION & ADJUSTMENT -------------- */
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

    // Ensure we have 8 total
    const currentPaneCount = panels.querySelectorAll('.pane').length;
    const desiredPaneCount = 8;
    for (let i = currentPaneCount; i < desiredPaneCount; i++) {
        const masterPane = masterPanes[i % masterPanes.length];
        const clone = masterPane.cloneNode(true);
        clone.classList.remove(`pane${(i % masterPanes.length) + 1}`);
        const clonedImg = clone.querySelector('img');
        if (clonedImg) {
            clonedImg.classList.add('pane-image');
        }
        panels.appendChild(clone);
    }
}

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
            }
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
