// script.js

// Global Variables
let currentLanguage = 'en'; // Default language
let isDarkMode = false;     // Dark mode flag

// Function to initialize the page
function initializePage() {
    // Initialize theme
    initializeTheme();

    // Initialize language settings
    initializeLanguage();

    // Add event listeners
    addEventListeners();

    // Load sections
    loadSections();

    // Update the year in the footer
    updateYear();
}

// Initialize theme settings
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to dark mode if not detected
        applyTheme('dark');
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

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);

    // Update the theme toggle position
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (newTheme === 'dark');
    }
}

// Initialize language settings
function initializeLanguage() {
    const storedLanguage = localStorage.getItem('language');

    if (storedLanguage) {
        currentLanguage = storedLanguage;
    } else {
        const lang = navigator.language || navigator.userLanguage;
        currentLanguage = lang.startsWith('it') ? 'it' : 'en';
        localStorage.setItem('language', currentLanguage);
    }

    setLanguage();
}

// Set the current language
function setLanguage() {
    document.documentElement.setAttribute('lang', currentLanguage);

    // Update toggle button text to show the language it will switch to
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = currentLanguage === 'en' ? 'Ita' : 'Eng';
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
        sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${section.title[currentLanguage]}`;

        // Section Content
        const sectionContent = document.createElement('div');
        sectionContent.classList.add('section-content');
        sectionContent.style.display = 'none'; // Hidden by default

        // Section Text
        const sectionText = document.createElement('div');
        sectionText.innerHTML = markdownToHTML(section.content[currentLanguage]);

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

// Simple markdown parser for links
function markdownToHTML(text) {
    // Convert markdown links to HTML links
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>').replace(/\n/g, '<br>');
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
