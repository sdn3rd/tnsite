// script.js

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
  
  // Enhanced poetry detection and processing
  function loadPoetrySections(parentElement) {
    fetch('/patreon-poetry')
      .then(response => response.json())
      .then(data => {
        const poemsByCategory = categorizePoems(data);
        displayPoetry(poemsByCategory, parentElement);
      })
      .catch(error => {
        console.error('Error loading poetry:', error);
        parentElement.innerHTML = '<p>Failed to load poetry. Please try again later.</p>';
      });
  }
  
  // Function to categorize poems by category
  function categorizePoems(poems) {
    const categories = {};
  
    poems.forEach(poem => {
      const category = poem.category || 'Uncategorized';
  
      if (!categories[category]) {
        categories[category] = [];
      }
  
      categories[category].push(poem);
    });
  
    return categories;
  }
  
  // Updated displayPoetry function
  function displayPoetry(poemsByCategory, container) {
    if (Object.keys(poemsByCategory).length === 0) {
      container.innerHTML = '<p>No poems found.</p>';
      return;
    }
  
    // For each category, create a section
    Object.keys(poemsByCategory).forEach(categoryName => {
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
  