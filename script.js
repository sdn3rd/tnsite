// script.js (ROOT) - Final with Q/A gating + Patreon poetry expand/collapse + reading mode triggers
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
                // Q/A popup logic for gating
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
    loadSection('introduction'); // default section
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
        // 1) Fetch a random question from your Worker
        const workerUrl = 'https://validate-pat.tristannuvo.la'; // your Worker domain
        const questionResp = await fetch(`${workerUrl}/question`);
        if (!questionResp.ok) throw new Error('No question from Worker');

        const questionData = await questionResp.json();
        const { id, question } = questionData;

        // 2) Show popup
        showQAPopup(question, async (userAnswer) => {
            // On "Submit"
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
                loadSpectralSection();
            } else {
                console.warn('Incorrect answer. Reverting to main site.');
                hideQAPopup();
                loadSection('introduction');
            }
        });

    } catch (err) {
        console.error('Q/A logic error:', err);
        // fallback to main site
        loadSection('introduction');
    }
}

function showQAPopup(questionText, onSubmit) {
    const overlay = document.createElement('div');
    overlay.id = 'qa-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: '#fff',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    });

    const container = document.createElement('div');
    Object.assign(container.style, {
        backgroundColor: '#111',
        padding: '20px',
        border: '2px solid #fff',
        borderRadius: '5px',
        width: '80%',
        maxWidth: '400px',
        textAlign: 'center'
    });

    const qEl = document.createElement('p');
    qEl.innerText = questionText;
    qEl.style.marginBottom = '1em';

    const answerInput = document.createElement('input');
    Object.assign(answerInput.style, {
        width: '100%',
        padding: '0.5em',
        marginBottom: '1em'
    });
    answerInput.type = 'text';

    const submitBtn = document.createElement('button');
    submitBtn.innerText = 'Submit';
    Object.assign(submitBtn.style, {
        padding: '0.5em 1em',
        cursor: 'pointer'
    });
    submitBtn.addEventListener('click', () => {
        const userAnswer = answerInput.value;
        onSubmit(userAnswer);
    });

    container.appendChild(qEl);
    container.appendChild(answerInput);
    container.appendChild(submitBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
}

function hideQAPopup() {
    const overlay = document.getElementById('qa-overlay');
    if (overlay) overlay.remove();
}

/* ----------------------------------
   THEME / SETUP
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
    applyTheme(theme);
}

function updateThemeIcon(theme) {
    // If you have a theme toggle icon, do logic here
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
        // skip certain images
        if (img.closest('#theme-toggle')) return;
        if (/pane\d+\.png$/.test(img.src)) return;
        // If you want .png => _alt.png in light mode, do it here
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

    // Close side menu on outside click
    document.addEventListener('click', (event) => {
        const sideMenu = document.getElementById('side-menu');
        if (document.body.classList.contains('menu-open')) {
            if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                document.body.classList.remove('menu-open');
            }
        }
    });

    // Spectral icons
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
 * Called after correct Q/A answer. 
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

    // Load from localStorage if cached
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

    // Always fetch the latest from remote
    fetch(`https://tristannuvo.la/patreon-poetry?cacheBust=${Date.now()}`)
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${resp.status}`);
            }
            return resp.json();
        })
        .then(data => {
            const poemsByCategory = categorizePoems(data);
            displayPoetry(poemsByCategory, poetryContainer);

            // Update cache
            localStorage.setItem('cached_poems', JSON.stringify(poemsByCategory));
        })
        .catch(error => {
            console.error('Error loading poetry from remote:', error);
        });
}

function categorizePoems(poems) {
    const categories = {};
    poems.forEach(poem => {
        const cat = poem.category || 'Misc';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(poem);
    });
    return categories;
}

/**
 * A simple expand/collapse display for poemsByCategory:
 */
function displayPoetry(poemsByCategory, container) {
    if (!poemsByCategory || !Object.keys(poemsByCategory).length) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }
    container.innerHTML = ''; // Clear

    // Sort categories alphabetically
    const categoryNames = Object.keys(poemsByCategory).sort();

    categoryNames.forEach(cat => {
        const catWrapper = document.createElement('div');
        catWrapper.classList.add('poetry-collection');

        const header = document.createElement('div');
        header.classList.add('collection-header');
        header.innerHTML = `<span class="toggle-icon">+</span> ${cat}`;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('collection-content');

        // Build each poem in this category
        poemsByCategory[cat].forEach(poem => {
            const poemDiv = document.createElement('div');
            poemDiv.classList.add('poem-wrapper');

            // Title
            const poemHeader = document.createElement('div');
            poemHeader.classList.add('poem-header');
            // We'll put the poem's date (if any) and title
            poemHeader.innerHTML = `
                <span class="poem-date">${poem.date || ''}</span>
                <span class="poem-title">${poem.title}</span>
            `;

            // Poem content
            const poemContent = document.createElement('div');
            poemContent.classList.add('poem-content');
            poemContent.innerHTML = poem.content ? poem.content.replace(/\n/g, '<br>') : '';

            // Expand/collapse the poem
            poemHeader.addEventListener('click', () => {
                if (poemContent.style.display === 'block') {
                    poemContent.style.display = 'none';
                } else {
                    poemContent.style.display = 'block';
                }
            });

            // On mobile, tapping the poem content => reading mode
            poemContent.addEventListener('click', evt => {
                evt.stopPropagation();
                if (/Mobi|Android/i.test(navigator.userAgent)) {
                    enterReadingMode(poem);
                }
            });

            poemDiv.appendChild(poemHeader);
            poemDiv.appendChild(poemContent);
            contentDiv.appendChild(poemDiv);
        });

        catWrapper.appendChild(header);
        catWrapper.appendChild(contentDiv);

        // Category header click => expand/collapse
        header.addEventListener('click', () => {
            const icon = header.querySelector('.toggle-icon');
            if (contentDiv.classList.contains('active')) {
                contentDiv.classList.remove('active');
                icon.textContent = '+';
            } else {
                contentDiv.classList.add('active');
                icon.textContent = '−';
            }
        });

        container.appendChild(catWrapper);
    });
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
    // We do +100px in the CSS. We'll re-calc here if needed:
    const calcMaxHeight = (viewportHeight / 8) + 100;
    paneImages.forEach(img => {
        img.style.maxHeight = `${calcMaxHeight}px`;
        img.style.height = 'auto';
    });
    panesContainer.style.justifyContent = 'flex-start';
}
