import type { AdventureTheme } from '../shared/index.js';
import { THEMES, getAllThemes } from '../shared/index.js';

/**
 * ThemeManager - Manages theme vocabulary, guidelines, and theme-specific content
 * Extracted from AdventureManager to follow single responsibility principle
 */
export class ThemeManager {
  
  /**
   * Get theme-specific guidelines for story generation
   */
  getThemeGuidelines(theme: AdventureTheme): string {
    const THEME_RESTRICTIONS = {
      [THEMES.SPACE.key]: '(space ships, galaxies, astronauts - NOT kingdoms or magic)',
      [THEMES.MYTHICAL.key]: '(castles, knights, magic, mythical creatures - NOT space ships or ancient temples)',
      [THEMES.ANCIENT.key]: '(temples, pyramids, ancient wisdom - NOT space ships or mythical castles)'
    } as const;
    
    const themeRestrictions = THEME_RESTRICTIONS[theme] || THEME_RESTRICTIONS[THEMES.SPACE.key];
    
    return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
${this.getThemeVocabulary(theme)}

**Story Requirements:**
- Create an overarching narrative that connects all adventures
- Each adventure should feel like a chapter in a larger story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${themeRestrictions}`;
  }

  /**
   * Get theme-specific vocabulary and examples
   */
  getThemeVocabulary(theme: AdventureTheme): string {
    const vocabularies = {
      [THEMES.SPACE.key]: `
**Adventure Emojis:** 🚀 🛸 🌌 ⭐ 🪐 🛰️ 🔭 🌟 🚁 🎯
- Architecture → "🚀 Starship Design" or "🛰️ Orbital Platform"
- Configuration → "🎛️ Navigation Control Center" or "🌌 Command Bridge"
- APIs → "📡 Interstellar Communication Hub" or "⚡ Quantum Data Relay"
- Database → "🗄️ Data Archive Constellation" or "☁️ Information Nebula"
- Functions → "🧭 Navigation Protocols" or "⚙️ System Procedures"
- Classes → "👥 Crew Modules" or "🔧 Ship Components"
- Tests → "🔬 System Diagnostics" or "🎮 Mission Simulation Chamber"
- Dependencies → "🤝 Allied Fleet" or "🔗 Support Network"`,
      
      [THEMES.MYTHICAL.key]: `
**Adventure Emojis:** 🏰 ⚔️ 🗡️ 🛡️ 🏺 🔮 🗝️ 👑 🏛️ 🎭
- Architecture → "🏰 Castle Design" or "🗺️ Kingdom Layout"  
- Configuration → "⚔️ Enchanted Armory" or "💎 Royal Treasury"
- APIs → "📜 Royal Messenger Network" or "🏛️ Diplomatic Embassy"
- Database → "📚 Ancient Knowledge Vault" or "🐉 Dragon's Hoard"
- Functions → "🔮 Magical Spells" or "✨ Mythical Incantations"
- Classes → "🏠 Guild Houses" or "👑 Noble Orders"
- Tests → "⚔️ Trial by Combat" or "🧠 Wisdom Challenges"
- Dependencies → "🤝 Allied Kingdoms" or "🛡️ Mythical Alliances"`,
      
      [THEMES.ANCIENT.key]: `
**Adventure Emojis:** 🏛️ 📜 🏺 ⚱️ 🗿 🔺 🌅 📿 🕯️ 🧙
- Architecture → "🏛️ Temple Complex" or "🔺 Pyramid Structure"
- Configuration → "🕯️ Sacred Ritual Chamber" or "🔮 Oracle's Sanctum"
- APIs → "🛤️ Trade Route Network" or "📜 Messenger Papyrus System"
- Database → "📚 Sacred Scroll Library" or "🏺 Stone Tablet Archive"
- Functions → "🕯️ Ancient Rituals" or "⚱️ Sacred Ceremonies"
- Classes → "👨‍🏫 Priest Orders" or "🔨 Craftsman Guilds"
- Tests → "⚖️ Divine Trials" or "🧠 Wisdom Examinations"
- Dependencies → "🤝 Trade Alliances" or "💰 Tribute Networks"`
    };
    
    return vocabularies[theme as keyof typeof vocabularies] || vocabularies.space;
  }

  /**
   * Get theme-specific metaphors for technical concepts
   */
  getThemeMetaphors(theme: AdventureTheme): Record<string, string> {
    const metaphors = {
      [THEMES.SPACE.key]: {
        'function': 'navigation protocol',
        'class': 'ship component',
        'api': 'communication relay',
        'database': 'data constellation',
        'config': 'control center',
        'test': 'system diagnostic',
        'dependency': 'allied fleet'
      },
      [THEMES.MYTHICAL.key]: {
        'function': 'magical spell',
        'class': 'guild house',
        'api': 'messenger network',
        'database': 'knowledge vault',
        'config': 'enchanted armory',
        'test': 'trial by combat',
        'dependency': 'allied kingdom'
      },
      [THEMES.ANCIENT.key]: {
        'function': 'sacred ritual',
        'class': 'priest order',
        'api': 'trade route',
        'database': 'scroll library',
        'config': 'ritual chamber',
        'test': 'divine trial',
        'dependency': 'trade alliance'
      }
    };

    return metaphors[theme as keyof typeof metaphors] || metaphors.space;
  }

  /**
   * Get theme-specific emojis for different adventure types
   */
  getThemeEmojis(theme: AdventureTheme): Record<string, string> {
    const emojis = {
      [THEMES.SPACE.key]: {
        'architecture': '🚀',
        'configuration': '🎛️',
        'api': '📡',
        'database': '🗄️',
        'core-logic': '🧭',
        'testing': '🔬',
        'dependencies': '🤝'
      },
      [THEMES.MYTHICAL.key]: {
        'architecture': '🏰',
        'configuration': '⚔️',
        'api': '📜',
        'database': '📚',
        'core-logic': '🔮',
        'testing': '⚔️',
        'dependencies': '🛡️'
      },
      [THEMES.ANCIENT.key]: {
        'architecture': '🏛️',
        'configuration': '🕯️',
        'api': '🛤️',
        'database': '📚',
        'core-logic': '⚱️',
        'testing': '⚖️',
        'dependencies': '🤝'
      }
    };

    return emojis[theme as keyof typeof emojis] || emojis.space;
  }

  /**
   * Get all available themes dynamically
   */
  getAvailableThemes(): AdventureTheme[] {
    return getAllThemes().map(theme => theme.key as AdventureTheme);
  }

  /**
   * Validate if a theme is supported
   */
  isValidTheme(theme: string): theme is AdventureTheme {
    return this.getAvailableThemes().includes(theme as AdventureTheme);
  }

  /**
   * Get theme display name and description
   */
  getThemeInfo(theme: AdventureTheme): { name: string; description: string; emoji: string } {
    const themeInfo = {
      [THEMES.SPACE.key]: {
        name: 'Space Explorer',
        description: 'Explore code like navigating through galaxies and starships',
        emoji: '🚀'
      },
      [THEMES.MYTHICAL.key]: {
        name: 'Mythical Quest',
        description: 'Discover code secrets in magical kingdoms and castles',
        emoji: '🏰'
      },
      [THEMES.ANCIENT.key]: {
        name: 'Ancient Wisdom',
        description: 'Uncover code mysteries in temples and ancient civilizations',
        emoji: '🏛️'
      }
    };

    return themeInfo[theme as keyof typeof themeInfo] || themeInfo.space;
  }
}