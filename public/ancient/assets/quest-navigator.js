/**
 * Quest Navigator - Interactive navigation system for repo adventures
 * Provides themed quest map and navigation controls
 */

(function() {
  'use strict';

  // Configuration
  const THEMES = {
    space: {
      icon: '🚀',
      mapTitle: 'Star Map',
      homeText: 'Return to Command Deck',
      questPrefix: 'Mission',
      bgClass: 'space-map'
    },
    mythical: {
      icon: '🗺️',
      mapTitle: 'Quest Map',
      homeText: 'Return to Castle',
      questPrefix: 'Quest',
      bgClass: 'mythical-map'
    },
    ancient: {
      icon: '📜',
      mapTitle: 'Ancient Map',
      homeText: 'Return to Temple',
      questPrefix: 'Journey',
      bgClass: 'ancient-map'
    },
    developer: {
      icon: '💻',
      mapTitle: 'Navigation',
      homeText: 'Return to Index',
      questPrefix: 'Module',
      bgClass: 'developer-map'
    }
  };

  class QuestNavigator {
    constructor() {
      this.currentTheme = this.detectTheme();
      this.currentQuest = this.detectCurrentQuest();
      this.totalQuests = this.detectTotalQuests();
      this.isMultiTheme = this.detectMultiTheme();
      this.init();
    }

    detectTheme() {
      // Detect theme from URL or body class
      const pathSegments = window.location.pathname.split('/');
      const themeFromPath = pathSegments[pathSegments.length - 2];
      
      if (THEMES[themeFromPath]) {
        return themeFromPath;
      }
      
      // Fallback: check body class
      for (const theme in THEMES) {
        if (document.body.classList.contains(`theme-${theme}`)) {
          return theme;
        }
      }
      
      // Default fallback
      return 'space';
    }

    detectCurrentQuest() {
      const match = window.location.pathname.match(/quest-(\d+)\.html/);
      return match ? parseInt(match[1], 10) : null;
    }

    detectTotalQuests() {
      // Try to detect from existing quest links
      const questLinks = document.querySelectorAll('a[href*="quest-"]');
      let maxQuest = 5; // Default
      
      questLinks.forEach(link => {
        const match = link.href.match(/quest-(\d+)\.html/);
        if (match) {
          maxQuest = Math.max(maxQuest, parseInt(match[1], 10));
        }
      });
      
      return maxQuest;
    }

    detectMultiTheme() {
      // Check if we're in a subdirectory (multi-theme setup)
      const pathSegments = window.location.pathname.split('/').filter(s => s);
      return pathSegments.length > 1 && pathSegments[0] !== 'index.html';
    }

    init() {
      this.createFloatingButton();
      this.createNavigationOverlay();
      this.enhanceQuestNavigation();
      this.attachEventListeners();
      this.addKeyboardShortcuts();
    }

    createFloatingButton() {
      const button = document.createElement('button');
      button.id = 'quest-navigator-btn';
      button.className = 'quest-nav-floating';
      button.setAttribute('aria-label', 'Open quest navigator');
      button.innerHTML = `
        <span class="nav-icon">${THEMES[this.currentTheme].icon}</span>
        <span class="nav-label">Map</span>
      `;
      document.body.appendChild(button);
    }

    createNavigationOverlay() {
      const overlay = document.createElement('div');
      overlay.id = 'quest-navigator-overlay';
      overlay.className = 'quest-nav-overlay';
      overlay.innerHTML = `
        <div class="quest-nav-container ${THEMES[this.currentTheme].bgClass}">
          <button class="quest-nav-close" aria-label="Close navigator">&times;</button>
          <h2 class="quest-nav-title">${THEMES[this.currentTheme].mapTitle}</h2>
          
          ${this.isMultiTheme ? `
            <div class="quest-nav-realms">
              <a href="../" class="realm-selector">← Change Adventure Theme</a>
            </div>
          ` : ''}
          
          <div class="quest-nav-home">
            <a href="index.html" class="home-link">
              <span class="home-icon">🏠</span>
              ${THEMES[this.currentTheme].homeText}
            </a>
          </div>
          
          <div class="quest-nav-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.calculateProgress()}%"></div>
            </div>
            <span class="progress-text">${this.getProgressText()}</span>
          </div>
          
          <div class="quest-nav-grid">
            ${this.generateQuestGrid()}
          </div>
          
          <div class="quest-nav-legend">
            <span class="legend-item">
              <span class="quest-status completed"></span> Completed
            </span>
            <span class="legend-item">
              <span class="quest-status current"></span> Current
            </span>
            <span class="legend-item">
              <span class="quest-status available"></span> Available
            </span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    generateQuestGrid() {
      let gridHTML = '';
      
      for (let i = 1; i <= this.totalQuests; i++) {
        const status = this.getQuestStatus(i);
        const questTitle = this.getQuestTitle(i);
        
        gridHTML += `
          <a href="quest-${i}.html" class="quest-nav-item ${status}" data-quest="${i}">
            <div class="quest-number">${THEMES[this.currentTheme].questPrefix} ${i}</div>
            <div class="quest-title">${questTitle}</div>
            <div class="quest-star">★</div>
          </a>
        `;
      }
      
      return gridHTML;
    }

    getQuestStatus(questNum) {
      if (questNum === this.currentQuest) return 'current';
      if (questNum < this.currentQuest) return 'completed';
      return 'available';
    }

    getQuestTitle(questNum) {
      // Try to get actual quest titles from the page if available
      const questLink = document.querySelector(`a[href="quest-${questNum}.html"]`);
      if (questLink) {
        const title = questLink.querySelector('h3')?.textContent || 
                     questLink.textContent || 
                     `${THEMES[this.currentTheme].questPrefix} ${questNum}`;
        return title.replace(/Quest \d+:\s*/, '');
      }
      return `Unknown ${THEMES[this.currentTheme].questPrefix}`;
    }

    calculateProgress() {
      if (!this.currentQuest) return 0;
      return Math.round(((this.currentQuest - 1) / this.totalQuests) * 100);
    }

    getProgressText() {
      if (!this.currentQuest) {
        return 'Ready to begin your adventure';
      }
      const completed = this.currentQuest - 1;
      return `${completed} of ${this.totalQuests} quests completed`;
    }

    enhanceQuestNavigation() {
      // Add previous button to quest pages
      if (this.currentQuest && this.currentQuest > 1) {
        const navContainer = document.querySelector('.quest-navigation-bottom');
        if (navContainer) {
          const prevButton = document.createElement('a');
          prevButton.href = `quest-${this.currentQuest - 1}.html`;
          prevButton.className = 'prev-quest-btn';
          prevButton.innerHTML = `← Previous: ${THEMES[this.currentTheme].questPrefix} ${this.currentQuest - 1}`;
          navContainer.insertBefore(prevButton, navContainer.firstChild);
        }
      }

      // Add home button if on last quest
      if (this.currentQuest === this.totalQuests) {
        const navContainer = document.querySelector('.quest-navigation-bottom');
        if (navContainer) {
          const nextButton = navContainer.querySelector('.next-quest-btn');
          if (nextButton) {
            nextButton.innerHTML = `Complete Adventure →`;
            nextButton.href = 'index.html';
            nextButton.classList.add('complete-btn');
          }
        }
      }
    }

    attachEventListeners() {
      const button = document.getElementById('quest-navigator-btn');
      const overlay = document.getElementById('quest-navigator-overlay');
      const closeBtn = overlay.querySelector('.quest-nav-close');

      button.addEventListener('click', () => this.openNavigator());
      closeBtn.addEventListener('click', () => this.closeNavigator());
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeNavigator();
        }
      });
    }

    addKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // M key opens map
        if (e.key === 'm' || e.key === 'M') {
          if (!this.isInputFocused()) {
            this.toggleNavigator();
          }
        }
        
        // Escape closes navigator
        if (e.key === 'Escape') {
          this.closeNavigator();
        }
        
        // Arrow keys for quest navigation (when navigator is closed)
        if (!this.isNavigatorOpen() && this.currentQuest) {
          if (e.key === 'ArrowLeft' && this.currentQuest > 1) {
            window.location.href = `quest-${this.currentQuest - 1}.html`;
          }
          if (e.key === 'ArrowRight' && this.currentQuest < this.totalQuests) {
            window.location.href = `quest-${this.currentQuest + 1}.html`;
          }
        }
      });
    }

    isInputFocused() {
      const activeElement = document.activeElement;
      return activeElement.tagName === 'INPUT' || 
             activeElement.tagName === 'TEXTAREA' || 
             activeElement.isContentEditable;
    }

    isNavigatorOpen() {
      return document.getElementById('quest-navigator-overlay').classList.contains('active');
    }

    openNavigator() {
      const overlay = document.getElementById('quest-navigator-overlay');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    closeNavigator() {
      const overlay = document.getElementById('quest-navigator-overlay');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    toggleNavigator() {
      if (this.isNavigatorOpen()) {
        this.closeNavigator();
      } else {
        this.openNavigator();
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new QuestNavigator());
  } else {
    new QuestNavigator();
  }
})();