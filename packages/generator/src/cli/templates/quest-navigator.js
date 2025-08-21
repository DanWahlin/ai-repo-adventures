/**
 * Quest Navigator - Interactive navigation system for repo adventures
 * Provides themed quest map and navigation controls
 */

(function() {
  'use strict';

  // Configuration
  const THEMES = {
    space: {
      mapTitle: 'Star Map',
      homeText: 'Return to Command Deck',
      questPrefix: 'Mission',
      bgClass: 'space-map'
    },
    mythical: {
      mapTitle: 'Quest Map',
      homeText: 'Return to Castle',
      questPrefix: 'Quest',
      bgClass: 'mythical-map'
    },
    ancient: {
      mapTitle: 'Ancient Map',
      homeText: 'Return to Temple',
      questPrefix: 'Journey',
      bgClass: 'ancient-map'
    },
    developer: {
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
      button.className = `quest-nav-floating ${THEMES[this.currentTheme].bgClass}`;
      button.setAttribute('aria-label', 'Open quest navigator');
      button.innerHTML = `
        <span class="nav-icon">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="compass-icon">
            <g class="compass-spikes">
              <path d="M100 5 L105 25 L100 20 L95 25 Z" fill="currentColor"/>
              <path d="M195 100 L175 95 L180 100 L175 105 Z" fill="currentColor"/>
              <path d="M100 195 L95 175 L100 180 L105 175 Z" fill="currentColor"/>
              <path d="M5 100 L25 105 L20 100 L25 95 Z" fill="currentColor"/>
              <path d="M164 36 L159 51 L155 46 L150 52 Z" fill="currentColor"/>
              <path d="M164 164 L150 148 L155 154 L159 149 Z" fill="currentColor"/>
              <path d="M36 164 L51 159 L46 155 L52 150 Z" fill="currentColor"/>
              <path d="M36 36 L52 50 L46 45 L51 41 Z" fill="currentColor"/>
            </g>
            <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" stroke-width="3"/>
            <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" stroke-width="6"/>
            <g class="compass-segments">
              <path d="M100 25 A75 75 0 0 1 153 47 L145 55 A65 65 0 0 0 100 35 Z" fill="currentColor" opacity="0.8"/>
              <path d="M153 153 A75 75 0 0 1 100 175 L100 165 A65 65 0 0 0 145 145 Z" fill="currentColor" opacity="0.8"/>
              <path d="M47 153 A75 75 0 0 1 25 100 L35 100 A65 65 0 0 0 55 145 Z" fill="currentColor" opacity="0.8"/>
              <path d="M25 100 A75 75 0 0 1 47 47 L55 55 A65 65 0 0 0 35 100 Z" fill="currentColor" opacity="0.8"/>
            </g>
            <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3,3"/>
            <g class="compass-rose">
              <path d="M100 45 L110 95 L100 85 L90 95 Z" fill="currentColor"/>
              <path d="M100 155 L90 105 L100 115 L110 105 Z" fill="currentColor" opacity="0.7"/>
              <path d="M155 100 L105 90 L115 100 L105 110 Z" fill="currentColor" opacity="0.7"/>
              <path d="M45 100 L95 110 L85 100 L95 90 Z" fill="currentColor" opacity="0.7"/>
              <path d="M135 65 L100 90 L110 80 L105 85 Z" fill="currentColor" opacity="0.5"/>
              <path d="M135 135 L105 115 L110 120 L100 110 Z" fill="currentColor" opacity="0.5"/>
              <path d="M65 135 L95 115 L90 120 L100 110 Z" fill="currentColor" opacity="0.5"/>
              <path d="M65 65 L100 90 L90 80 L95 85 Z" fill="currentColor" opacity="0.5"/>
            </g>
            <circle cx="100" cy="100" r="8" fill="currentColor"/>
            <circle cx="100" cy="100" r="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
          </svg>
        </span>
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
              <span class="home-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/>
                </svg>
              </span>
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
      const navContainer = document.querySelector('.quest-navigation-bottom');
      if (!navContainer) return;

      // Only add previous button if it doesn't already exist
      if (this.currentQuest && this.currentQuest > 1) {
        const existingPrevButton = navContainer.querySelector('.prev-quest-btn');
        if (!existingPrevButton) {
          const prevButton = document.createElement('a');
          prevButton.href = `quest-${this.currentQuest - 1}.html`;
          prevButton.className = 'prev-quest-btn';
          prevButton.innerHTML = `← Previous: Quest ${this.currentQuest - 1}`;
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