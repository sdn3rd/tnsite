// script.js

// Function to initialize the page
function initializePage() {
    console.log('Initializing page...');
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
      console.log(`Applying saved theme: ${savedTheme}`);
      applyTheme(savedTheme);
    } else {
      console.log('No saved theme found, detecting OS theme preference.');
      detectOSTheme();
    }
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    }
  }
  
  function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updatePatreonIcon();
  }
  
  function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    console.log(`Detected OS theme preference: ${theme}`);
    applyTheme(theme);
  }
  
  function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    console.log(`Theme toggled to: ${newTheme}`);
    applyTheme(newTheme);
  }
  
  function addEventListeners() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', toggleTheme);
      console.log('Added event listener for theme toggle.');
    } else {
      console.warn('Theme toggle switch not found.');
    }
  }
  
  // Updated loadSections function
  function loadSections() {
    console.log('Loading sections from sections.json...');
    fetch('sections.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch sections.json: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Sections loaded:', data);
        displaySections(data);
      })
      .catch(error => {
        console.error('Error loading sections:', error);
        displayError('Failed to load sections.');
      });
  }
  
  // Enhanced poetry detection and processing
  function loadPoetrySections(parentElement) {
    console.log('Loading poetry from /patreon-poetry...');
    fetch('/patreon-poetry')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch /patreon-poetry: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        console.log('Raw response text:', text);
        let data;
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.error('Invalid JSON response from /patreon-poetry:', error);
          throw new Error('Invalid JSON response from /patreon-poetry');
        }
        console.log('Poetry data received:', data);
        const poemsByCategory = categorizePoems(data);
        console.log('Poems categorized:', poemsByCategory);
        displayPoetry(poemsByCategory, parentElement);
      })
      .catch(error => {
        console.error('Error loading poetry:', error);
        parentElement.innerHTML = '<p>Failed to load poetry. Please try again later.</p>';
      });
  }
  
  // Function to categorize poems by category
  function categorizePoems(poems) {
    console.log('Categorizing poems...');
    const categories = {};
  
    poems.forEach(poem => {
      const category = poem.category || 'Uncategorized';
  
      if (!categories[category]) {
        categories[category] = [];
      }
  
      categories[category].push(poem);
    });
  
    console.log('Categorized poems:', categories);
    return categories;
  }
  
  // Updated displaySections function
  function displaySections(sections) {
    console.log('Displaying sections...');
    const container = document.getElementById('sections-container');
    if (!container) {
      console.error('Sections container not found.');
      return;
    }
    container.innerHTML = '';
  
    sections.forEach(section => {
      console.log(`Rendering section: ${section.title}`);
      const sectionWrapper = document.createElement('div');
      sectionWrapper.classList.add('section');
  
      const sectionHeader = document.createElement('div');
      sectionHeader.classList.add('section-header');
      sectionHeader.innerHTML = `<span class="toggle-icon">+</span> ${section.title}`;
  
      const sectionContent = document.createElement('div');
      sectionContent.classList.add('section-content');
      sectionContent.style.display = 'none';
  
      if (section.title === 'Poetry') {
        console.log('Loading poetry section content...');
        loadPoetrySections(sectionContent);
      } else {
        console.log(`Loading content for section: ${section.title}`);
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
  
  // Updated displayPoetry function
  function displayPoetry(poemsByCategory, container) {
    console.log('Displaying poetry by category...');
    if (Object.keys(poemsByCategory).length === 0) {
      container.innerHTML = '<p>No poems found.</p>';
      return;
    }
  
    // For each category, create a section
    Object.keys(poemsByCategory).forEach(categoryName => {
      console.log(`Rendering category: ${categoryName}`);
      const categoryWrapper = document.createElement('div');
      categoryWrapper.classList.add('poetry-category');
  
      const categoryHeader = document.createElement('div');
      categoryHeader.classList.add('category-header');
      categoryHeader.innerHTML = `<span class="toggle-icon">+</span> ${categoryName}`;
  
      const categoryContent = document.createElement('div');
      categoryContent.classList.add('category-content');
      categoryContent.style.display = 'none';
  
      const poemsContainer = document.createElement('div');
      poemsContainer.classList.add('poems-container');
  
      poemsByCategory[categoryName].forEach(poem => {
        console.log(`Rendering poem: ${poem.title}`);
        const poemWrapper = document.createElement('div');
        poemWrapper.classList.add('poem');
  
        const poemHeader = document.createElement('div');
        poemHeader.classList.add('poem-header');
        poemHeader.innerHTML = `<span class="toggle-icon">+</span> ${poem.title}`;
  
        const poemContent = document.createElement('div');
        poemContent.classList.add('poem-content');
        poemContent.style.display = 'none';
        poemContent.innerHTML = sanitizeHTML(poem.content);
  
        poemWrapper.appendChild(poemHeader);
        poemWrapper.appendChild(poemContent);
        poemsContainer.appendChild(poemWrapper);
  
        // Event listener for poem collapse
        poemHeader.addEventListener('click', () => {
          const isVisible = poemContent.style.display === 'block';
          poemContent.style.display = isVisible ? 'none' : 'block';
          const toggleIcon = poemHeader.querySelector('.toggle-icon');
          toggleIcon.textContent = isVisible ? '+' : '−';
        });
      });
  
      categoryContent.appendChild(poemsContainer);
      categoryWrapper.appendChild(categoryHeader);
      categoryWrapper.appendChild(categoryContent);
      container.appendChild(categoryWrapper);
  
      // Event listener for category collapse
      categoryHeader.addEventListener('click', () => {
        const isVisible = categoryContent.style.display === 'block';
        categoryContent.style.display = isVisible ? 'none' : 'block';
        const toggleIcon = categoryHeader.querySelector('.toggle-icon');
        toggleIcon.textContent = isVisible ? '+' : '−';
      });
    });
  }
  
  // Utility functions
  function sanitizeHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
  
    // Remove script tags
    const scripts = tempDiv.getElementsByTagName('script');
    while (scripts[0]) {
      scripts[0].parentNode.removeChild(scripts[0]);
    }
  
    // Remove inline event handlers
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
    if (!container) {
      console.error('Sections container not found while displaying error.');
      return;
    }
    container.innerHTML = `<p class="error-message">${message}</p>`;
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
  
  // Initialize page
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    initializePage();
  });
  