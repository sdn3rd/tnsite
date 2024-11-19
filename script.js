console.log('script.js is loaded and running.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();
});

function initializePage() {
    console.log('Initializing page...');
    initializeTheme();
    addEventListeners();
    loadSection('introduction');
    updateYear();
    updatePatreonIcon();
}

// Theme functions
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        console.log(`Applying saved theme: ${savedTheme}`);
        applyTheme(savedTheme);
    } else {
        console.log('No saved theme found, detecting OS theme preference.');
        detectOSTheme();
    }
}

function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
    updatePatreonIcon();
}

function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    console.log(`Detected OS theme preference: ${theme}`);
    applyTheme(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('#theme-toggle img');
    themeIcon.src = theme === 'light' ? 'icons/lightmode.png' : 'icons/darkmode.png';
}

function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (patreonIcon) {
        patreonIcon.src = currentTheme === 'light' ? 'icons/patreon_alt.png' : 'icons/patreon.png';
        console.log(`Updated Patreon icon based on theme: ${currentTheme}`);
    } else {
        console.warn('Patreon icon not found.');
    }
}

// Event Listeners
function addEventListeners() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('Added event listener for theme toggle.');
    } else {
        console.warn('Theme toggle switch not found.');
    }

    // Hamburger Menu Toggle
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            sideMenu.classList.toggle('visible');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            sideMenu.classList.remove('visible');
        }
    });

    // Menu Item Clicks
    const menuItems = document.querySelectorAll('#side-menu a');
    menuItems.forEach((item) => {
        item.addEventListener('click', function (event) {
            event.preventDefault();
            const section = this.getAttribute('data-section');
            loadSection(section);
            sideMenu.classList.remove('visible');
        });
    });
}

// Load Sections
function loadSection(section) {
    if (section === 'poetry') {
        loadPoetrySection();
    } else {
        loadContentSection(section);
    }
}

function loadContentSection(sectionId) {
    console.log(`Loading section: ${sectionId}`);
    fetch('sections.json')
        .then(response => response.json())
        .then(sections => {
            const section = sections.find(s => s.id === sectionId);
            const contentDiv = document.getElementById('main-content');
            if (section) {
                contentDiv.innerHTML = markdownToHTML(section.content);
            } else {
                contentDiv.innerHTML = '<p>Section not found.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

// Load Poetry Section with dynamic content from /patreon-poetry
function loadPoetrySection() {
    console.log('Loading poetry from /patreon-poetry...');
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h1>Poetry</h1><div id="poetry-container"></div>';

    fetch('https://spectraltapestry.com/patreon-poetry')
        .then(response => {
            console.log('Received response from /patreon-poetry:', response);
            if (!response.ok) {
                throw new Error(`Failed to fetch /patreon-poetry: ${response.status} ${response.statusText}`);
            }
            // Check for CORS issues
            if (response.type === 'opaque') {
                console.warn('Response type is opaque. Possible CORS issue.');
            }
            return response.text();
        })
        .then(text => {
            console.log('Raw response text received.');
            let data;
            try {
                // Parse the JSON while handling Unicode characters
                data = JSON.parse(text);
            } catch (error) {
                console.error('Invalid JSON response from /patreon-poetry:', error);
                console.error('Response text:', text);
                throw new Error('Invalid JSON response from /patreon-poetry');
            }
            console.log('Poetry data received:', data);
            const poemsByCategory = categorizePoems(data);
            console.log('Poems categorized:', poemsByCategory);
            displayPoetry(poemsByCategory, document.getElementById('poetry-container'));
        })
        .catch(error => {
            console.error('Error loading poetry:', error);
            displayError('Failed to load poetry.');
        });
}

// Function to categorize poems by category
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

// Function to display poetry
function displayPoetry(poemsByCategory, container) {
    console.log('Displaying poetry by category...');
    if (Object.keys(poemsByCategory).length === 0) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }

    // Generate HTML
    let html = '';
    for (const [collectionName, poems] of Object.entries(poemsByCategory)) {
        html += `<h2>${collectionName}</h2>`;
        poems.forEach(poem => {
            html += `<div class="poem">
                        <h3>${poem.title}</h3>
                        <p>${poem.content.replace(/\n/g, '<br>')}</p>
                     </div>`;
        });
        html += '<hr>';
    }

    container.innerHTML = html;
}

// Utility functions
function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

function displayError(message) {
    const contentDiv = document.getElementById('main-content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p class="error-message">${message}</p>`;
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
