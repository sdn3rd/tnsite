// contact.js

/**
 * loadContactSection:
 * Injects the Contact form HTML (including Turnstile widget) 
 * into #main-content, then initializes all page logic 
 * (theme, language, volume, cookies).
 */
function loadContactSection() {
    console.log("Loading Contact Section...");

    // 1) Insert the entire Contact Page markup into #main-content
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('#main-content not found. Cannot load contact section.');
        return;
    }

    // Optionally hide the site's title section if desired
    const titleSection = document.querySelector('.title-section');
    if (titleSection) {
        titleSection.style.display = 'none';
    }

    // Inject the form + Turnstile widget + volume slider if desired
    mainContent.innerHTML = `
        <!-- Contact Form -->
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

        <!-- Optional Volume Slider & Audio -->
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0" style="width:100%; margin-top:10px;">
        <audio id="background-audio" loop muted></audio>
    `;

    // 2) Run the initialization (just like DOMContentLoaded, but now dynamic)
    initializeContactPage();

    // 3) Check cookie to hide the form if user already submitted
    checkSubmissionCookie();
}

/* 
   --------------------------
   CONTACT PAGE INITIALIZERS
   --------------------------
*/

function initializeContactPage() {
    console.log('Initializing Contact Page (theme, language, volume, events)...');
    initializeTheme();
    initializeLanguage();
    initializeVolume();
    addContactEventListeners();
}

/* 
   --------------------------
   THEME LOGIC
   --------------------------
*/
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        detectOSTheme();
    }

    // If you have a <input type="checkbox" id="theme-toggle">
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

    // Sync checkbox if exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
        themeToggle.checked = (newTheme === 'dark');
    }
}

/* 
   --------------------------
   LANGUAGE LOGIC
   --------------------------
*/
let currentLanguage = 'en'; // Default

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

    // If there's a #lang-toggle button
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

// Adjust text elements in the contact form (and beyond) for the chosen language
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

/* 
   --------------------------
   EVENT LISTENERS
   --------------------------
*/
function addContactEventListeners() {
    // Language toggle
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

/* 
   --------------------------
   COOKIE / SUBMISSION LOGIC
   --------------------------
*/

/**
 * If user already submitted form in last 24 hours, hide the form.
 * Also checks query param ?submitted=true.
 */
function checkSubmissionCookie() {
    console.log('Checking submission cookie...');
    // Check query param "submitted"
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

    // Check cookie
    if (getCookie('formSubmitted') === 'true') {
        disableContactFormAndButton();
    }
}

// Hide or disable contact form if user already submitted
function disableContactFormAndButton() {
    console.log('Disabling contact form due to prior submission...');
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.style.display = 'none';
        const msg = document.createElement('p');
        msg.textContent = "You have already contacted us. Please try again in 24 hours.";
        msg.style.color = 'gray';
        msg.style.marginTop = '20px';
        contactForm.parentNode.appendChild(msg);
    }

    // Optionally hide a 'contact-link' if it exists in the header
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

// -------------- Cookie helpers --------------
function setCookie(name, value, hours) {
    const d = new Date();
    d.setTime(d.getTime() + (hours*60*60*1000));
    const expires = "expires="+ d.toUTCString();
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
 * Extracts query parameters as an object.
 * @return {Object} - key-value pairs from URL
 */
function getQueryParams() {
    const params = {};
    const query = window.location.search.slice(1); 
    if (!query) return params;
    query.split('&').forEach(part => {
        const [k, v] = part.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
}
