/* contact.js
   --------------------
   Single-file approach:
   - loadContactSection() injects the contact form + Turnstile into #main-content.
   - Then it initializes theme, language, cookie logic, etc.
*/

/**
 * loadContactSection():
 * Injects the contact form HTML (including Turnstile) into #main-content,
 * then runs all logic (theme, language, cookie submission check).
 *
 * Call loadContactSection() when the user clicks "Contact" in your hamburger menu.
 */
function loadContactSection() {
    console.log("Loading Contact Section...");

    // 1) Locate your main content container
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('No #main-content element found. Cannot load contact section.');
        return;
    }

    // Optionally hide the site's title section
    const titleSection = document.querySelector('.title-section');
    if (titleSection) {
        titleSection.style.display = 'none';
    }

    // 2) Inject the form + Turnstile widget (with normal size, auto theme)
    mainContent.innerHTML = `
        <div id="contact-form-container">
            <h1 id="page-title">Leave feedback or request for takedown</h1>

            <form id="contact-form" method="POST" action="https://contact-form-worker.notaa.workers.dev/contact">
                <label for="email" id="email-label">Your Email (optional):</label>
                <input type="email" id="email" name="email" placeholder="you@example.com">

                <label for="message" id="message-label">Your Message:</label>
                <textarea id="message" name="message" required></textarea>

                <!-- Cloudflare Turnstile Widget: normal size, auto theme -->
                <div 
                    class="cf-turnstile"
                    data-sitekey="0x4AAAAAAAyqLP0723YQLCis"
                    data-size="normal"
                    data-theme="auto"
                ></div>

                <button type="submit" id="submit-button">Send</button>
            </form>
        </div>
    `;

    // 3) Initialize theme/language logic, event listeners, etc.
    initializeContactPage();

    // 4) Check cookie to hide the form if user already submitted
    checkSubmissionCookie();

    // 5) (Optional) If Turnstile fails to auto-render, manually re-render:
    if (window.turnstile && typeof window.turnstile.render === 'function') {
        // Rerender all .cf-turnstile elements
        document.querySelectorAll('.cf-turnstile').forEach((el) => {
            window.turnstile.render(el, {
                sitekey: '0x4AAAAAAAyqLP0723YQLCis',
                size: 'normal',
                theme: 'auto'
            });
        });
    }
}

/* ------------------------------------------
   CONTACT PAGE INITIALIZATION
------------------------------------------ */
function initializeContactPage() {
    console.log('Initializing Contact Page...');
    initializeTheme();       // Dark/Light theme
    initializeLanguage();    // EN/IT language text
    addContactEventListeners();
}

/* ------------------------------------------
   THEME LOGIC (Dark/Light)
------------------------------------------ */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        detectOSTheme();
    }

    // If you have a checkbox #theme-toggle in your HTML:
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
        themeToggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function detectOSTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    applyTheme(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    applyTheme(newTheme);

    // If #theme-toggle is a checkbox, sync it
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
        themeToggle.checked = (newTheme === 'dark');
    }
}

/* ------------------------------------------
   LANGUAGE LOGIC (English/Italian)
------------------------------------------ */
let currentLanguage = 'en'; // default

function initializeLanguage() {
    const storedLanguage = localStorage.getItem('language');
    if (!storedLanguage) {
        const lang = navigator.language || navigator.userLanguage;
        currentLanguage = (lang.startsWith('it')) ? 'it' : 'en';
        localStorage.setItem('language', currentLanguage);
    } else {
        currentLanguage = storedLanguage;
    }
    setLanguage();
}

function setLanguage() {
    document.documentElement.setAttribute('lang', currentLanguage);

    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = (currentLanguage === 'en') ? 'Ita' : 'Eng';
    }

    updateContentLanguage(currentLanguage);
}

function toggleLanguage() {
    currentLanguage = (currentLanguage === 'en') ? 'it' : 'en';
    localStorage.setItem('language', currentLanguage);
    setLanguage();
}

// Update text on the page (or just the contact section) for EN/IT
function updateContentLanguage(lang) {
    const elementsToUpdate = [
        { id: 'page-title',     en: 'Leave feedback or request for takedown',  it: 'Lascia un feedback o richiedi la rimozione' },
        { id: 'email-label',    en: 'Your Email (optional):',                  it: 'La tua email (opzionale):' },
        { id: 'message-label',  en: 'Your Message:',                           it: 'Il tuo messaggio:' },
        { id: 'submit-button',  en: 'Send',                                    it: 'Invia' },
        { id: 'back-link',      en: '← Back',                                  it: '← Indietro' },
        { id: 'contact-link',   en: 'Contact',                                 it: 'Contatto' },
        { id: 'patreon-link',   en: 'Patreon',                                 it: 'Patreon' }
    ];

    elementsToUpdate.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.textContent = (lang === 'en') ? item.en : item.it;
        }
    });
}

/* ------------------------------------------
   EVENT LISTENERS (Language/Theme, etc.)
------------------------------------------ */
function addContactEventListeners() {
    // Language toggle
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Theme toggle (if #theme-toggle is a checkbox)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

/* ------------------------------------------
   COOKIE / FORM-SUBMISSION LOGIC
------------------------------------------ */

/** 
 * checkSubmissionCookie:
 *  - Checks ?submitted=true in the URL
 *  - Sets a 'formSubmitted' cookie to block re-submission for 24 hrs
 *  - If 'formSubmitted' cookie is found, hide the contact form
 */
function checkSubmissionCookie() {
    console.log('Checking submission cookie...');

    const params = getQueryParams();
    if (params.submitted === 'true') {
        setCookie('formSubmitted', 'true', 24);

        // Remove 'submitted' param from URL
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

/** 
 * Disables or hides the contact form if user already submitted 
 */
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

    // Optionally hide #contact-link if it exists
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

/* -------------- Cookie Helpers -------------- */
function setCookie(name, value, hours) {
    const d = new Date();
    d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(cname) === 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}

/**
 * Extracts query parameters from the current URL
 * and returns them as an object { key: value, ... }
 */
function getQueryParams() {
    const params = {};
    const queryStr = window.location.search.substring(1);
    if (!queryStr) return params;

    queryStr.split('&').forEach(part => {
        const [rawKey, rawVal] = part.split('=');
        if (rawKey) {
            const key = decodeURIComponent(rawKey);
            const val = decodeURIComponent(rawVal || '');
            params[key] = val;
        }
    });
    return params;
}
