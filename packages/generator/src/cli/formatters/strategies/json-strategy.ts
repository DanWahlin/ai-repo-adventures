import { BaseFormatStrategy, AdventureData } from '../format-strategy.js';

/**
 * JSON format strategy
 */
export class JsonStrategy extends BaseFormatStrategy {
  format(data: AdventureData): string {
    const jsonData = {
      title: data.title,
      theme: data.theme,
      story: data.story,
      quests: data.quests.map(quest => ({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        codeFiles: quest.codeFiles || [],
        content: this.getQuestContent(quest, data)
      }))
    };

    return JSON.stringify(jsonData, null, 2);
  }

  getFileExtension(): string {
    return 'json';
  }
}
