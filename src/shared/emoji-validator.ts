/**
 * Emoji validation and safe replacement system
 * Prevents emojis that render as squares on some systems
 */

// Safe emojis that render consistently across most systems
export const SAFE_EMOJIS = {
  // Space theme - basic symbols that are widely supported
  space: {
    rocket: '🚀',     // Very well supported
    star: '⭐',       // Simple star, widely supported  
    lightning: '⚡',  // Well supported
    gear: '⚙️',       // Settings/config
    shield: '🛡️',     // Security/validation
    book: '📖',       // Documentation
    chart: '📊',      // Progress/stats
    link: '🔗',       // Connections
    key: '🔑',        // Access/auth
    globe: '🌍',      // Global/web
  },
  
  // Mythical theme
  mythical: {
    wizard: '🧙‍♂️',
    sword: '⚔️', 
    scroll: '📜',
    crown: '👑',
    gem: '💎',
    fire: '🔥',
    magic: '✨',
    castle: '🏰',
    dragon: '🐉',
    wand: '🪄'
  },
  
  // Ancient theme  
  ancient: {
    temple: '🏛️',
    scroll: '📜', 
    amphora: '🏺',
    pyramid: '🔺',
    coin: '🪙',
    statue: '🗿',
    torch: '🔦',
    map: '🗺️',
    treasure: '💰',
    ruins: '🏛️'
  },
  
  // Developer theme
  developer: {
    computer: '💻',
    code: '📄',
    bug: '🐛',
    gear: '⚙️',
    database: '🗄️',
    folder: '📁',
    terminal: '⌨️',
    monitor: '🖥️',
    disk: '💾',
    network: '🌐'
  }
};

// Problematic emojis that often render as squares
export const PROBLEMATIC_EMOJIS = [
  '🌌', // Milky Way - often renders as square
  '🌠', // Shooting star - problematic on many systems  
];

// Safe replacements for problematic emojis
export const EMOJI_REPLACEMENTS: Record<string, string> = {
  '🌌': '⭐',  // Milky Way -> Star
  '🌠': '⭐',  // Shooting star -> Star 
};

/**
 * Validates if an emoji is safe to use (unlikely to render as square)
 */
export function isEmojiSafe(emoji: string): boolean {
  return !PROBLEMATIC_EMOJIS.includes(emoji);
}

/**
 * Replaces problematic emojis with safe alternatives
 */
export function sanitizeEmoji(emoji: string): string {
  return EMOJI_REPLACEMENTS[emoji] || emoji;
}

/**
 * Sanitizes a text string by replacing problematic emojis
 */
export function sanitizeEmojiInText(text: string): string {
  let sanitized = text;
  
  for (const [problematic, safe] of Object.entries(EMOJI_REPLACEMENTS)) {
    sanitized = sanitized.replace(new RegExp(problematic, 'g'), safe);
  }
  
  return sanitized;
}

/**
 * Gets a safe emoji for a specific theme and purpose
 */
export function getSafeEmoji(theme: keyof typeof SAFE_EMOJIS, purpose: string): string {
  const themeEmojis = SAFE_EMOJIS[theme];
  if (!themeEmojis) return '⭐'; // Fallback to star
  
  // Try to find the exact purpose
  if (purpose in themeEmojis) {
    return themeEmojis[purpose as keyof typeof themeEmojis];
  }
  
  // Try to match by keywords
  const purposeLower = purpose.toLowerCase();
  for (const [key, emoji] of Object.entries(themeEmojis)) {
    if (purposeLower.includes(key) || key.includes(purposeLower)) {
      return emoji;
    }
  }
  
  // Default to first emoji in theme
  return Object.values(themeEmojis)[0] || '⭐';
}

/**
 * Validates and sanitizes quest titles to use safe emojis
 */
export function sanitizeQuestTitle(title: string): string {
  // First sanitize known problematic emojis
  let sanitized = sanitizeEmojiInText(title);
  
  // Additional validation for common quest patterns
  sanitized = sanitized
    .replace(/🌌/g, '⭐')  // Galaxy -> Star
    .replace(/🌠/g, '⭐')  // Shooting star -> Star
  
  return sanitized;
}