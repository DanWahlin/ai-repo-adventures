import { BaseFormatStrategy, AdventureData } from '../format-strategy.js';

/**
 * Plain text format strategy
 */
export class TextStrategy extends BaseFormatStrategy {
  format(data: AdventureData): string {
    let content = `${data.title}\n`;
    content += `${'='.repeat(data.title.length)}\n\n`;
    content += `Theme: ${data.theme}\n\n`;
    content += `STORY\n${'-'.repeat(50)}\n${data.story}\n\n`;
    content += `QUESTS\n${'-'.repeat(50)}\n\n`;

    data.quests.forEach((quest, index) => {
      content += `${index + 1}. ${quest.title}\n\n`;
      content += `${quest.description}\n\n`;

      if (quest.codeFiles && quest.codeFiles.length > 0) {
        content += `Files to explore:\n`;
        quest.codeFiles.forEach(file => {
          content += `  - ${file}\n`;
        });
        content += '\n';
      }

      const questContent = this.getQuestContent(quest, data);
      if (questContent) {
        content += `Quest Content:\n${questContent}\n\n`;
      }

      content += `${'-'.repeat(50)}\n\n`;
    });

    return content;
  }

  getFileExtension(): string {
    return 'txt';
  }
}
