import { BaseFormatStrategy, AdventureData } from '../format-strategy.js';

/**
 * Markdown format strategy
 */
export class MarkdownStrategy extends BaseFormatStrategy {
  format(data: AdventureData): string {
    let content = `## ${data.title}\n\n${data.story}\n\n`;

    data.quests.forEach((quest) => {
      content += `## ${quest.title}\n\n`;
      content += `${quest.description}\n\n`;

      if (quest.codeFiles && quest.codeFiles.length > 0) {
        content += `**Files to explore:**\n`;
        quest.codeFiles.forEach(file => {
          content += `- \`${file}\`\n`;
        });
        content += '\n';
      }

      const questContent = this.getQuestContent(quest, data);
      if (questContent) {
        content += `### Quest Content\n\n${questContent}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  }

  getFileExtension(): string {
    return 'md';
  }
}
