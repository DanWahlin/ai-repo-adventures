import { BaseFormatStrategy, AdventureData } from '../format-strategy.js';

/**
 * XML format strategy
 */
export class XmlStrategy extends BaseFormatStrategy {
  format(data: AdventureData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<adventure>\n';
    xml += `  <title>${this.escapeXml(data.title)}</title>\n`;
    xml += `  <theme>${this.escapeXml(data.theme)}</theme>\n`;
    xml += `  <story>${this.escapeXml(data.story)}</story>\n`;
    xml += '  <quests>\n';

    data.quests.forEach(quest => {
      xml += '    <quest>\n';
      xml += `      <id>${this.escapeXml(quest.id)}</id>\n`;
      xml += `      <title>${this.escapeXml(quest.title)}</title>\n`;
      xml += `      <description>${this.escapeXml(quest.description)}</description>\n`;

      if (quest.codeFiles && quest.codeFiles.length > 0) {
        xml += '      <files>\n';
        quest.codeFiles.forEach(file => {
          xml += `        <file>${this.escapeXml(file)}</file>\n`;
        });
        xml += '      </files>\n';
      }

      const questContent = this.getQuestContent(quest, data);
      if (questContent) {
        xml += `      <content>${this.escapeXml(questContent)}</content>\n`;
      }

      xml += '    </quest>\n';
    });

    xml += '  </quests>\n';
    xml += '</adventure>\n';

    return xml;
  }

  getFileExtension(): string {
    return 'xml';
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
