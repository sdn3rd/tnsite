// script.js

// Global Variables
let currentLanguage = 'en'; // Default language
let currentPoemSet = 'main'; // 'main', 'lupa', 'caliope', 'experiment'
let isMobileDevice = false; // Flag to track if the user is on a mobile device
let currentPlayingPoem = null; // Tracks the currently playing poem

// Function to initialize the page
function initializePage() {
    // Initialize theme
    initializeTheme();

    // Initialize language settings
    initializeLanguage();

    // Initialize volume control
    initializeVolume();

    // Initialize audio controls
    initializeAudioControls();

    // Detect if the user is on a mobile device
    detectMobileDevice();

    // Add event listeners
    addEventListeners();

    // Update day count if on index.html
    if (document.getElementById('day-count')) {
        updateDayCount();
    }

    // Load main poems initially
    if (document.getElementById('poems-container')) {
        loadPoemsFromSet('poetry.json'); // Ensure 'poetry.json' exists in the root folder
    }

    // Update the year in the footer
    updateYear();
}

// Function to detect if the user is on a mobile device
function detectMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // Simple mobile detection
    isMobileDevice = /android|iphone|ipad|iPod|blackberry|windows phone/i.test(userAgent);
}

// Function to initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        detectOSTheme();
    }

    // Update the theme toggle position
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    }
}

// Apply the selected theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Detect OS theme preference
function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    applyTheme(theme);
}

// Toggle theme
function toggleTheme() {
    console.log('Theme toggle activated'); // Debugging
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        console.error('Theme toggle element not found');
        return;
    }
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
    console.log(`Theme applied: ${newTheme}`); // Debugging
}

// Initialize language settings
function initializeLanguage() {
    let storedLanguage = localStorage.getItem('language');

    if (!storedLanguage) {
        const lang = navigator.language || navigator.userLanguage;
        if (lang.startsWith('it')) {
            currentLanguage = 'it';
        } else {
            currentLanguage = 'en';
        }
        localStorage.setItem('language', currentLanguage);
    } else {
        currentLanguage = storedLanguage;
    }

    setLanguage();
}

// Set the current language
function setLanguage() {
    document.documentElement.setAttribute('lang', currentLanguage);

    // Update toggle button text to show the language it will switch to
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = currentLanguage === 'en' ? 'Ati' : 'Eng';
    }

    // Load sections with the selected language
    loadSections();
}

// Toggle language
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'it' : 'en';
    localStorage.setItem('language', currentLanguage);
    setLanguage();
}

// Add event listeners
function addEventListeners() {
    // Language toggle
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// Load sections from JSON data
function loadSections() {
    fetch('sections.json')
        .then(response => response.json())
        .then(data => {
            displaySections(data);
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

// Display sections with collapsible functionality
function displaySections(sections) {
    const container = document.getElementById('sections-container');
    container.innerHTML = ''; // Clear existing content

    sections.forEach(section => {
        // Section Wrapper
        const sectionWrapper = document.createElement('div');
        sectionWrapper.classList.add('section');

        // Section Header
        const sectionHeader = document.createElement('div');
        sectionHeader.classList.add('section-header');

        // Process section title
        let processedTitle = section.title[currentLanguage];
        if (currentLanguage === 'it') {
            processedTitle = reverseDisplayedText(processedTitle);
        }

        sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${processedTitle}`;

        // Section Content
        const sectionContent = document.createElement('div');
        sectionContent.classList.add('section-content');
        sectionContent.style.display = 'none'; // Hidden by default

        // Section Text
        const sectionText = document.createElement('div');
        const processedContent = markdownToHTML(section.content[currentLanguage]);

        if (currentLanguage === 'it') {
            sectionText.innerHTML = reverseDisplayedText(processedContent);
        } else {
            sectionText.innerHTML = processedContent;
        }

        sectionContent.appendChild(sectionText);
        sectionWrapper.appendChild(sectionHeader);
        sectionWrapper.appendChild(sectionContent);
        container.appendChild(sectionWrapper);

        // Event listener for collapsing/expanding
        sectionHeader.addEventListener('click', () => {
            const isVisible = sectionContent.style.display === 'block';
            sectionContent.style.display = isVisible ? 'none' : 'block';
            const toggleIcon = sectionHeader.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '+' : '−';
        });
    });
}

// Display error message
function displayError(message) {
    const container = document.getElementById('sections-container');
    container.innerHTML = `<p>${message}</p>`;
}

// Simple markdown parser for links
function markdownToHTML(text) {
    // Convert markdown links to HTML links
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

// Function to reverse the displayed text while preserving HTML tags
function reverseDisplayedText(html) {
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Function to recursively traverse and reverse text nodes
        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = node.textContent.split('').reverse().join('');
            } else {
                node.childNodes.forEach(child => traverse(child));
            }
        }

        traverse(tempDiv);
        return tempDiv.innerHTML;
    } catch (error) {
        console.error('Error reversing displayed text:', error);
        return html; // Return original HTML in case of error
    }
}

// Update the year in the footer
function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.innerText = currentYear;
    }
}

// Initialize page on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializePage);
