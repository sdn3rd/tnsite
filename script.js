// Function to initialize the page
function initializePage() {
    initializeTheme();
    addEventListeners();
    loadSections();
    updateYear();
    updatePatreonIcon();
}

// Theme functions remain the same
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        detectOSTheme();
    }
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updatePatreonIcon();
}

function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    applyTheme(theme);
}

function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
}

function addEventListeners() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// Updated loadSections function
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

// Enhanced poetry detection
function isPoetryPost(post) {
    if (!post.content) return false;

    // Skip updates and website-related posts
    if (post.title && (
        /update|website|bug fix|spectral tapestry -/i.test(post.title) ||
        post.title.includes('Chapter')
    )) {
        return false;
    }

    const content = post.content.toLowerCase();
    
    // Look for poetry indicators
    const poetryIndicators = [
        /<br.*?>\s*<br.*?>/g, // Multiple line breaks
        /written to:/i,
        /verse/i,
        /stanza/i,
        /^[A-Za-z\s,]+$/m // Lines with only letters, spaces, and commas
    ];

    // Count line breaks to identify potential verse structure
    const brMatches = content.match(/<br\s*\/?>/g);
    const hasVerseStructure = brMatches && brMatches.length > 3;

    return hasVerseStructure || poetryIndicators.some(pattern => pattern.test(content));
}

// Main poetry processing function
function processPoetryPosts(jsonData) {
    try {
        const posts = jsonData;
        return posts
            .filter(isPoetryPost)
            .map(post => ({
                id: post.id,
                title: post.title,
                content: post.content
                    .replace(/<p>/g, '')
                    .replace(/<\/p>/g, '<br><br>')
                    .replace(/[\r\n]+/g, '<br>'),
                published_at: new Date(post.published_at).toLocaleDateString(),
                is_public: post.is_public
            }))
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } catch (error) {
        console.error('Error processing poetry posts:', error);
        return [];
    }
}

// Updated display sections function
function displaySections(sections) {
    const container = document.getElementById('sections-container');
    container.innerHTML = '';

    sections.forEach(section => {
        const sectionWrapper = document.createElement('div');
        sectionWrapper.classList.add('section');

        const sectionHeader = document.createElement('div');
        sectionHeader.classList.add('section-header');
        sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${section.title}`;

        const sectionContent = document.createElement('div');
        sectionContent.classList.add('section-content');
        sectionContent.style.display = 'none';

        if (section.title === "Poetry") {
            loadPoetrySections(sectionContent);
        } else {
            sectionContent.innerHTML = markdownToHTML(section.content);
        }

        sectionWrapper.appendChild(sectionHeader);
        sectionWrapper.appendChild(sectionContent);
        container.appendChild(sectionWrapper);

        sectionHeader.addEventListener('click', () => {
            const isVisible = sectionContent.style.display === 'block';
            sectionContent.style.display = isVisible ? 'none' : 'block';
            const toggleIcon = sectionHeader.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '+' : '−';
        });
    });
}

// Updated loadPoetrySections function
function loadPoetrySections(parentElement) {
    fetch('patreon-posts.json')
        .then(response => response.json())
        .then(data => {
            const poems = processPoetryPosts(data);
            displayPoetry(poems, parentElement);
        })
        .catch(error => {
            console.error('Error loading poetry:', error);
            parentElement.innerHTML = '<p>Failed to load poetry. Please try again later.</p>';
        });
}

// New function to display poetry
function displayPoetry(poems, container) {
    if (!poems.length) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }

    const poemsContainer = document.createElement('div');
    poemsContainer.classList.add('poems-container');

    poems.forEach(poem => {
        const poemWrapper = document.createElement('div');
        poemWrapper.classList.add('poem');

        const poemHeader = document.createElement('div');
        poemHeader.classList.add('poem-header');
        poemHeader.innerHTML = `
            <span class="toggle-icon">+</span>
            <span class="poem-title">${poem.title}</span>
            <span class="poem-date">${poem.published_at}</span>
        `;

        const poemContent = document.createElement('div');
        poemContent.classList.add('poem-content');
        poemContent.style.display = 'none';
        poemContent.innerHTML = sanitizeHTML(poem.content);

        poemWrapper.appendChild(poemHeader);
        poemWrapper.appendChild(poemContent);
        poemsContainer.appendChild(poemWrapper);

        poemHeader.addEventListener('click', () => {
            const isVisible = poemContent.style.display === 'block';
            poemContent.style.display = isVisible ? 'none' : 'block';
            const toggleIcon = poemHeader.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '+' : '−';
        });
    });

    container.appendChild(poemsContainer);
}

// Utility functions
function sanitizeHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const scripts = tempDiv.getElementsByTagName('script');
    while (scripts[0]) {
        scripts[0].parentNode.removeChild(scripts[0]);
    }

    const allElements = tempDiv.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const attrs = allElements[i].attributes;
        for (let j = attrs.length - 1; j >= 0; j--) {
            if (attrs[j].name.startsWith('on')) {
                allElements[i].removeAttribute(attrs[j].name);
            }
        }
    }

    return tempDiv.innerHTML;
}

function markdownToHTML(text) {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
}

function displayError(message) {
    const container = document.getElementById('sections-container');
    container.innerHTML = `<p class="error-message">${message}</p>`;
}

function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.innerText = new Date().getFullYear();
    }
}

function updatePatreonIcon() {
    const patreonIcon = document.getElementById('patreon-icon');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (patreonIcon) {
        patreonIcon.src = currentTheme === 'light' ? 'icons/patreon_alt.png' : 'icons/patreon.png';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', initializePage);