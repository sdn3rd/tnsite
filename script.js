// script.js (ROOT) - with Worker-based Q/A popup for "Spectral"
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
                // Instead of loadingSpectralSection directly,
                // we do Q/A popup logic:
                handleSpectralAccess();
            }
            else {
                // Otherwise load normal content
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
    loadSection('introduction'); // default
    updateYear();
    updatePatreonIcon();
    duplicatePanes();
    adjustPaneImages();
}

/* ----------------------------------
   WORKER Q/A POPUP FOR SPECTRAL
---------------------------------- */
async function handleSpectralAccess() {
    try {
        // 1) Fetch a random question from Worker
        const workerUrl = 'https://validate-pat.tristannuvo.la'; // adjust to your Worker endpoint
        const questionResp = await fetch(`${workerUrl}/question`);
        if (!questionResp.ok) throw new Error('No question from Worker');

        const questionData = await questionResp.json();
        const { id, question } = questionData;

        // 2) Show popup with question => user enters answer
        showQAPopup(question, async (userAnswer) => {
            // when user clicks "Submit" in popup:
            const checkResp = await fetch(`${workerUrl}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, userAnswer })
            });
            if (!checkResp.ok) throw new Error('Check request failed');

            const checkData = await checkResp.json();
            if (checkData.correct) {
                console.log('User answered Q/A correctly.');
                hideQAPopup();
                // Now load the spectral section
                loadSpectralSection();
            } else {
                console.warn('Incorrect answer. Reverting to main site.');
                hideQAPopup();
                loadSection('introduction');
            }
        });

    } catch (err) {
        console.error('Q/A logic error:', err);
        // fallback: just show main site
        loadSection('introduction');
    }
}

/**
 * Show a basic Q/A overlay with question, text input, and submit
 */
function showQAPopup(questionText, onSubmit) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'qa-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.color = '#fff';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Container
    const container = document.createElement('div');
    container.style.backgroundColor = '#111';
    container.style.padding = '20px';
    container.style.border = '2px solid #fff';
    container.style.borderRadius = '5px';
    container.style.width = '80%';
    container.style.maxWidth = '400px';
    container.style.textAlign = 'center';

    // Question
    const qEl = document.createElement('p');
    qEl.innerText = questionText;
    qEl.style.marginBottom = '1em';

    // Input
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.style.width = '100%';
    answerInput.style.padding = '0.5em';
    answerInput.style.marginBottom = '1em';

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.innerText = 'Submit';
    submitBtn.style.padding = '0.5em 1em';
    submitBtn.style.cursor = 'pointer';

    submitBtn.addEventListener('click', () => {
        const userAnswer = answerInput.value;
        onSubmit(userAnswer);
    });

    // Append
    container.appendChild(qEl);
    container.appendChild(answerInput);
    container.appendChild(submitBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
}

/**
 * Hide the Q/A overlay if it exists
 */
function hideQAPopup() {
    const overlay = document.getElementById('qa-overlay');
    if (overlay) overlay.remove();
}

/* ----------------------------------
   THEME FUNCTIONS
---------------------------------- */
function initializeTheme() {
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    console.log(`Detected OS theme: ${theme}`);
    applyTheme(theme);
}

function updateThemeIcon(theme) {
    // ...
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

function updateAllIcons(theme) {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.closest('#theme-toggle')) return;
        if (/pane\d+\.png$/.test(img.src)) return;
        // If you want to swap .png => _alt.png in light mode
        // do so here
    });
}

/* ----------------------------------
   EVENT LISTENERS
---------------------------------- */
function addEventListeners() {
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

    // Spectral Icons at top (hidden by default) – once user has passed Q/A,
    // we call loadSpectralSection() which reveals them.
    const spectralIconsContainer = document.getElementById('spectral-icons');
    if (spectralIconsContainer) {
        const homeIcon = document.getElementById('spectral-home');
        const caliopeIcon = document.getElementById('spectral-caliope');
        const lupaIcon = document.getElementById('spectral-lupa');
        const experimentsIcon = document.getElementById('spectral-experiments');
        const strandsIcon = document.getElementById('spectral-strands');

        homeIcon?.addEventListener('click', () => {
            setSpectralHeading("Spectral Home");
            PoemsManager.switchPoemSet('main', 'poetry.json');
        });
        caliopeIcon?.addEventListener('click', () => {
            setSpectralHeading("Calliope");
            PoemsManager.switchPoemSet('caliope', 'caliope.json');
        });
        lupaIcon?.addEventListener('click', () => {
            setSpectralHeading("La Lupa");
            PoemsManager.switchPoemSet('lupa', 'lupa.json');
        });
        experimentsIcon?.addEventListener('click', () => {
            setSpectralHeading("Experiments");
            PoemsManager.switchPoemSet('experiment', 'experiments.json');
        });
        strandsIcon?.addEventListener('click', () => {
            setSpectralHeading("Strands");
            PoemsManager.switchPoemSet('strands', 'strands.json');
        });
    }

    window.addEventListener('resize', adjustPaneImages);
}

/**
 * Once Q/A is correct, we show the spectral icons and set default heading
 */
function loadSpectralSection() {
    console.log('Loading spectral section (after Q/A).');
    hideTitleSection();
    showSpectralIcons();

    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = '<h1>Spectral Home</h1><div id="poems-container"></div>';
    }
    PoemsManager.switchPoemSet('main','poetry.json');
}

function setSpectralHeading(headingText) {
    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) return;
    contentDiv.innerHTML = `<h1>${headingText}</h1><div id="poems-container"></div>`;
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

function loadContentSection(sectionId) {
    showTitleSection();
    hideSpectralIcons();

    fetch('sections.json')
        .then(r => r.json())
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

/* POETRY SECTION (Patreon-based) */
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    showTitleSection();
    hideSpectralIcons();

    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';
    const poetryContainer = document.getElementById('poetry-container');

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
        .then(resp => {
            if (!resp.ok) throw new Error(`Failed to fetch /patreon-poetry: ${resp.status}`);
            return resp.json();
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
        if (!categories[cat]) categories[cat] = [];
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
    // Your expand/collapse logic
    // ...
}

/* CONTACT SECTION */
function loadContactSection() {
    console.log('Loading contact section...');
    showTitleSection();
    hideSpectralIcons();

    const contentDiv = document.getElementById('main-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div id="contact-form-container">
            <h1 id="page-title">Leave feedback or request for takedown</h1>
            <form id="contact-form" method="POST" action="https://contact-form-worker.notaa.workers.dev">
                <label for="email" id="email-label">Your Email (optional):</label>
                <input type="email" id="email" name="email" placeholder="you@example.com">

                <label for="message" id="message-label">Your Message:</label>
                <textarea id="message" name="message" required></textarea>

                <!-- Turnstile -->
                <div class="cf-turnstile" data-sitekey="0x4AAAAAAAyqLP0723YQLCis"></div>

                <button type="submit" id="submit-button">Send</button>
            </form>
        </div>
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0" style="width:100%; margin-top:10px;">
    `;
}

/* ----------------------------------
   SHOW / HIDE HELPERS
---------------------------------- */
function showTitleSection() {
    const titleSection = document.querySelector('.title-section');
    if (titleSection) titleSection.style.display = 'block';
}
function hideTitleSection() {
    const titleSection = document.querySelector('.title-section');
    if (titleSection) titleSection.style.display = 'none';
}
function showSpectralIcons() {
    const iconsDiv = document.getElementById('spectral-icons');
    if (iconsDiv) iconsDiv.style.display = 'block';
}
function hideSpectralIcons() {
    const iconsDiv = document.getElementById('spectral-icons');
    if (iconsDiv) iconsDiv.style.display = 'none';
}

/* -------------- UTILITY -------------- */
function displayError(message) {
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p class="error-message">${message}</p>`;
    }
    console.error(`[script.js] ${message}`);
}

function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
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
    allPanes.forEach((pane, i) => {
        if (i >= 8) {
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
    // We want them smaller to display more => we do +100px in styles
    // so here we just recalc
    const calcMaxHeight = (viewportHeight / 8) + 100;
    paneImages.forEach(img => {
        img.style.maxHeight = `${calcMaxHeight}px`;
        img.style.height = 'auto';
    });
    panesContainer.style.justifyContent = 'flex-start';
}
