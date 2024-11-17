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

        sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${section.title}`;

        // Section Content
        const sectionContent = document.createElement('div');
        sectionContent.classList.add('section-content');
        sectionContent.style.display = 'none'; // Hidden by default

        // Section Text
        const sectionText = document.createElement('div');

        // Special handling for the Poetry section
        if (section.title === "Poetry") {
            // Load poetry sections with the new logic
            loadPoetrySections(sectionContent);
        } else {
            const processedContent = markdownToHTML(section.content);
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

// Function to load Poetry sections using the provided logic
function loadPoetrySections(parentElement) {
    // Fetch the JSON data from your endpoint or local file
    fetch('/patreon-poetry') // Replace with your actual data source if different
        .then(response => response.json())
        .then(jsonData => {
            const poems = getPoetryPosts(jsonData);
            const poemsContainer = document.createElement('div');
            poemsContainer.classList.add('poems-container');

            poems.forEach(poem => {
                const poemWrapper = document.createElement('div');
                poemWrapper.classList.add('poem');

                // Poem Header
                const poemHeader = document.createElement('div');
                poemHeader.classList.add('poem-header');
                poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${poem.title}`;

                // Poem Content
                const poemContent = document.createElement('div');
                poemContent.classList.add('poem-content');
                poemContent.style.display = 'none'; // Hidden by default

                // Process and sanitize the content
                const sanitizedContent = sanitizeHTML(poem.content);

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
        })
        .catch(error => {
            console.error('Error loading poetry:', error);
            parentElement.innerHTML = '<p>Failed to load poetry collections.</p>';
        });
}

// Helper function to check if content is likely poetry
function isPoetryContent(content) {
    // Check for line breaks followed by short lines (common in poetry)
    const lines = content.split(/<br\s*\/?>/);
    const shortLines = lines.filter(line => line.trim().length > 0 && line.trim().length < 60);
    const hasPoetryStructure = shortLines.length > 3 && (shortLines.length / lines.length) > 0.5;

    // Check for common poetry indicators
    const poetryIndicators = [
        /verse/i,
        /stanza/i,
        /written to/i,
        /poem/i,
        /poetry/i,
        /^[A-Za-z\s,]+$/ // Lines containing only letters, spaces, and commas
    ];

    return hasPoetryStructure || poetryIndicators.some(indicator => indicator.test(content));
}

// Main function to get poetry posts
function getPoetryPosts(jsonData) {
    // First, parse the raw JSON if it's a string
    const posts = Array.isArray(jsonData) ? jsonData : JSON.parse(jsonData);

    // Filter and transform posts
    return posts
        .filter(post => {
            // Skip posts that are clearly updates or website related
            if (post.title && (
                post.title.toLowerCase().includes('update') ||
                post.title.toLowerCase().includes('website') ||
                post.title.toLowerCase().includes('bug fix')
            )) {
                return false;
            }

            // Extract content without HTML tags for checking
            const contentText = post.content.replace(/<[^>]+>/g, '\n');
            
            return isPoetryContent(contentText);
        })
        .map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            published_at: post.published_at,
            // Parse the HTML content to extract just the poem text
            poemText: post.content
                .replace(/<br\s*\/?>/g, '\n') // Replace <br> with newlines
                .replace(/<p>/g, '\n') // Replace <p> with newlines
                .replace(/<[^>]+>/g, '') // Remove other HTML tags
                .trim(),
            is_public: post.is_public
        }))
        .filter(post => post.poemText.length > 0); // Ensure there's actual content
}

// Function to sanitize and format poem display
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

    // Remove any inline event handlers
    const allElements = tempDiv.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const attrs = allElements[i].attributes;
        for (let j = attrs.length - 1; j >= 0; j--) {
            if (attrs[j].name.startsWith('on')) {
                allElements[i].removeAttribute(attrs[j].name);
            }
        }
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
