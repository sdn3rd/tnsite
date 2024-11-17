// script.js

// Function to initialize the page
function initializePage() {
    // Initialize theme
    initializeTheme();

    // Add event listeners
    addEventListeners();

    // Load sections
    loadSections();

    // Update the year in the footer
    updateYear();

    // Update Patreon icon based on theme
    updatePatreonIcon();
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
    updatePatreonIcon();
}

// Detect OS theme preference
function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    applyTheme(theme);
}

// Toggle theme
function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Add event listeners
function addEventListeners() {
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

        // Get the language preference
        const lang = navigator.language.startsWith('it') ? 'it' : 'en';

        sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${section.title[lang]}`;

        // Section Content
        const sectionContent = document.createElement('div');
        sectionContent.classList.add('section-content');
        sectionContent.style.display = 'none'; // Hidden by default

        // Section Text
        const sectionText = document.createElement('div');

        // Special handling for the Poetry section
        if (section.title.en === "Poetry") {
            loadPoetrySections(sectionContent);
        } else {
            const processedContent = markdownToHTML(section.content[lang]);
            sectionText.innerHTML = processedContent;
            sectionContent.appendChild(sectionText);
        }

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

// Load Poetry sections from the worker endpoint
function loadPoetrySections(parentElement) {
    // Fetch poetry data from the worker endpoint
    fetch('/patreon-poetry')
        .then(response => response.json())
        .then(data => {
            displayPoetrySections(data, parentElement);
        })
        .catch(error => {
            console.error('Error loading poetry sections:', error);
            parentElement.innerHTML = '<p>Failed to load poetry collections.</p>';
        });
}

// Display the Poetry sections
function displayPoetrySections(posts, parentElement) {
    // Get the language preference
    const lang = navigator.language.startsWith('it') ? 'it' : 'en';

    // Create a container for the poems
    const poemsContainer = document.createElement('div');
    poemsContainer.classList.add('poems-container');

    posts.forEach(post => {
        // Poem Wrapper
        const poemWrapper = document.createElement('div');
        poemWrapper.classList.add('poem');

        // Poem Header
        const poemHeader = document.createElement('div');
        poemHeader.classList.add('poem-header');
        poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${post.title}`;

        // Poem Content
        const poemContent = document.createElement('div');
        poemContent.classList.add('poem-content');
        poemContent.style.display = 'none'; // Hidden by default

        // Process and sanitize the content
        const sanitizedContent = sanitizeHTML(post.content);

        poemContent.innerHTML = sanitizedContent;
        poemWrapper.appendChild(poemHeader);
        poemWrapper.appendChild(poemContent);
        poemsContainer.appendChild(poemWrapper);

        // Event listener for collapsing/expanding
        poemHeader.addEventListener('click', () => {
            const isVisible = poemContent.style.display === 'block';
            poemContent.style.display = isVisible ? 'none' : 'block';
            const toggleIcon = poemHeader.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '+' : '−';
        });
    });

    parentElement.appendChild(poemsContainer);
}

// Function to sanitize HTML content to prevent XSS attacks
function sanitizeHTML(html) {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove script tags and their content
    const scripts = tempDiv.getElementsByTagName('script');
    const scriptsLength = scripts.length;
    for (let i = scriptsLength - 1; i >= 0; i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
    }

    // Return the sanitized HTML
    return tempDiv.innerHTML;
}

// Simple markdown parser for links
function markdownToHTML(text) {
    // Convert markdown links to HTML links
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

// Display error message
function displayError(message) {
    const container = document.getElementById('sections-container');
    container.innerHTML = `<p>${message}</p>`;
}

// Update the year in the footer
function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.innerText = currentYear;
    }
}

// Update the Patreon icon based on the current theme
function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

    if (patreonIcon) {
        if (currentTheme === 'light') {
            patreonIcon.src = 'icons/patreon_alt.png';
        } else {
            patreonIcon.src = 'icons/patreon.png';
        }
    }
}

// Initialize page on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializePage);
