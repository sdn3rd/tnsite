console.log('script.js is loaded and running.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();
});

function initializePage() {
    console.log('Initializing page...');
    initializeTheme();
    addEventListeners();
    loadSection('introduction'); // Load the default section
    updateYear();
    updatePatreonIcon();
    duplicatePanes(); // Call the duplicatePanes function after initialization
}

/* Theme functions */
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
    const themeToggleImages = document.querySelectorAll('footer #theme-toggle img');
    themeToggleImages.forEach(themeIcon => {
        themeIcon.src = theme === 'light' ? 'icons/darkmode.png' : 'icons/lightmode.png';
    });
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

/* Event Listeners */
function addEventListeners() {
    // Theme Toggle in Footer
    const themeToggleFooter = document.querySelector('footer #theme-toggle');
    if (themeToggleFooter) {
        themeToggleFooter.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering footer collapse
            toggleTheme();
            console.log('Theme toggle in footer clicked.');
        });
        console.log('Added event listener for theme toggle in footer.');
    } else {
        console.warn('Theme toggle in footer not found.');
    }

    // Hamburger Menu Toggle
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    const panels = document.querySelector('.panels');

    if (hamburgerMenu && sideMenu && panels) {
        hamburgerMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            sideMenu.classList.toggle('visible');
            panels.classList.toggle('hidden'); // Slide panels
            document.body.classList.toggle('menu-open'); // Toggle menu-open class on body
            console.log('Menu toggled, panels hidden state changed, and menu-open class toggled.');
        });
    } else {
        console.warn('One or more menu elements not found.');
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            sideMenu.classList.remove('visible');
            panels.classList.add('hidden'); // Ensure panels are hidden when menu is closed
            document.body.classList.remove('menu-open'); // Remove menu-open class from body
            console.log('Clicked outside the menu. Menu closed, panels hidden, and menu-open class removed.');
        }
    });

    // Menu Item Clicks
    const menuItems = document.querySelectorAll('#side-menu a[data-section]');
    menuItems.forEach((item) => {
        item.addEventListener('click', function (event) {
            event.preventDefault();
            const section = this.getAttribute('data-section');
            loadSection(section);
            sideMenu.classList.remove('visible');
            panels.classList.add('hidden'); // Slide panels offscreen
            document.body.classList.remove('menu-open'); // Remove menu-open class from body
            console.log(`Menu item clicked: ${section}. Menu closed, panels hidden, and menu-open class removed.`);
        });
    });

    // Footer Toggle
    const footer = document.querySelector('footer');
    const footerToggle = document.getElementById('footer-toggle');
    const footerToggleIcon = document.getElementById('footer-toggle-icon');

    if (footer && footerToggle && footerToggleIcon) {
        // Make entire footer clickable to collapse
        footer.addEventListener('click', (event) => {
            // If the click is on the footer-toggle or theme toggle, do nothing
            if (footerToggle.contains(event.target) || document.getElementById('theme-toggle').contains(event.target)) {
                return;
            }
            footer.classList.toggle('footer-collapsed');
            // Toggle arrow direction
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on footer.');
        });

        // Ensure the toggle icon itself does not trigger the footer collapse when clicked
        footerToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            footer.classList.toggle('footer-collapsed');
            // Toggle arrow direction
            if (footer.classList.contains('footer-collapsed')) {
                footerToggleIcon.textContent = '^';
            } else {
                footerToggleIcon.textContent = 'v';
            }
            console.log('Footer toggled by clicking on toggle icon.');
        });
    } else {
        console.warn('Footer toggle elements not found.');
    }
}

/* Load Sections */
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
                // If about/introduction, show logo (if necessary)
                if (sectionId === 'introduction') {
                    document.body.classList.add('introduction-page');
                } else {
                    document.body.classList.remove('introduction-page');
                }
                // Ensure title section is visible
                document.querySelector('.title-section').style.display = 'block';
            } else {
                contentDiv.innerHTML = '<p>Section not found.</p>';
                document.body.classList.remove('introduction-page');
                document.querySelector('.title-section').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading sections:', error);
            displayError('Failed to load sections.');
        });
}

/* Load Poetry Section with dynamic content from /patreon-poetry */
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
            return response.text();
        })
        .then(text => {
            console.log('Raw response text received.');
            let data;
            try {
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

/* Function to categorize poems by category */
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

/* Function to display poetry with collapsible sections and poems */
function displayPoetry(poemsByCategory, container) {
    console.log('Displaying poetry by category...');
    if (Object.keys(poemsByCategory).length === 0) {
        container.innerHTML = '<p>No poems found.</p>';
        return;
    }

    container.innerHTML = ''; // Clear container

    // For each category, create a collapsible section
    for (const [collectionName, poems] of Object.entries(poemsByCategory)) {
        // Create collection wrapper
        const collectionWrapper = document.createElement('div');
        collectionWrapper.classList.add('poetry-collection');

        // Collection header
        const collectionHeader = document.createElement('div');
        collectionHeader.classList.add('collection-header');
        collectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${collectionName}`;
        collectionWrapper.appendChild(collectionHeader);

        // Collection content
        const collectionContent = document.createElement('div');
        collectionContent.classList.add('collection-content');
        collectionContent.style.display = 'none'; // Initially collapsed

        // For each poem in the collection
        poems.forEach(poem => {
            // Poem wrapper
            const poemWrapper = document.createElement('div');
            poemWrapper.classList.add('poem');

            // Poem header
            const poemHeader = document.createElement('div');
            poemHeader.classList.add('poem-header');
            poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${poem.title}`;
            poemWrapper.appendChild(poemHeader);

            // Poem content
            const poemContent = document.createElement('div');
            poemContent.classList.add('poem-content');
            poemContent.style.display = 'none'; // Initially collapsed
            poemContent.innerHTML = poem.content.replace(/\n/g, '<br>');
            poemWrapper.appendChild(poemContent);

            // Add event listener to poem header
            poemHeader.addEventListener('click', () => {
                const isVisible = poemContent.style.display === 'block';
                // Collapse all other poems in the same category
                const allPoemContents = collectionContent.querySelectorAll('.poem-content');
                allPoemContents.forEach(pc => pc.style.display = 'none');
                const allPoemHeaders = collectionContent.querySelectorAll('.poem-header .toggle-icon');
                allPoemHeaders.forEach(icon => icon.textContent = '+');

                if (isVisible) {
                    poemContent.style.display = 'none';
                    poemHeader.querySelector('.toggle-icon').textContent = '+';
                } else {
                    poemContent.style.display = 'block';
                    poemHeader.querySelector('.toggle-icon').textContent = '−';
                    // Scroll poem to top
                    poemWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            collectionContent.appendChild(poemWrapper);
        });

        collectionWrapper.appendChild(collectionContent);
        container.appendChild(collectionWrapper);

        // Add event listener to collection header
        collectionHeader.addEventListener('click', () => {
            const isVisible = collectionContent.style.display === 'block';
            if (isVisible) {
                collectionContent.style.display = 'none';
                collectionHeader.querySelector('.toggle-icon').textContent = '+';
            } else {
                collectionContent.style.display = 'block';
                collectionHeader.querySelector('.toggle-icon').textContent = '−';
            }
        });
    }
}

/* Utility functions */
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

/* Function to duplicate panes to fill the panels container */
function duplicatePanes() {
    const panels = document.querySelector('.panels');
    if (!panels) {
        console.warn('Panels container not found.');
        return;
    }

    const panes = Array.from(panels.querySelectorAll('.pane'));
    if (panes.length === 0) {
        console.warn('No pane elements found to duplicate.');
        return;
    }

    // Calculate the total height of the panels container
    const panelsHeight = panels.clientHeight;

    // Calculate the total height of existing panes
    const paneHeight = panes[0].offsetHeight + parseInt(getComputedStyle(panes[0]).marginTop) + parseInt(getComputedStyle(panes[0]).marginBottom);
    let totalPaneHeight = panes.length * paneHeight;

    // Clone panes until totalPaneHeight exceeds panelsHeight
    let cloneIndex = 0;
    while (totalPaneHeight < panelsHeight) {
        const clone = panes[cloneIndex % panes.length].cloneNode(true);
        // Optional: Remove the unique classes to prevent duplicate IDs or issues
        clone.classList.remove(`pane${cloneIndex % panes.length + 1}`);
        panels.appendChild(clone);
        totalPaneHeight += paneHeight;
        cloneIndex++;
        if (cloneIndex > 100) { // Prevent infinite loop
            console.warn('Reached 100 clones, stopping duplication to prevent infinite loop.');
            break;
        }
    }

    console.log(`Duplicated panes to fill the panels container. Total panes: ${panels.querySelectorAll('.pane').length}`);
}
