/**
 * Prompt Builder Pattern
 * 
 * Provides a clean, readable way to build LLM prompts using a fluent API.
 * Replaces large, unreadable string concatenations with structured builders.
 */

export interface PromptSection {
  title?: string;
  content: string;
  required?: boolean;
}

export interface PromptContext {
  [key: string]: any;
}

/**
 * Base prompt builder class
 */
export class PromptBuilder {
  private sections: PromptSection[] = [];
  private context: PromptContext = {};

  /**
   * Add a section to the prompt
   */
  section(title: string, content: string, required: boolean = true): this {
    this.sections.push({ title, content, required });
    return this;
  }

  /**
   * Add content without a title
   */
  content(text: string): this {
    this.sections.push({ content: text });
    return this;
  }

  /**
   * Set context variables for template interpolation
   */
  withContext(context: PromptContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Add a list of items
   */
  list(title: string, items: string[]): this {
    if (items.length === 0) return this;
    const content = items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
    return this.section(title, content);
  }

  /**
   * Add a rules section
   */
  rules(items: string[]): this {
    return this.section('Rules', items.map(r => `- ${r}`).join('\n'));
  }

  /**
   * Add examples
   */
  examples(items: string[]): this {
    return this.section('Examples', items.map(e => `- ${e}`).join('\n'));
  }

  /**
   * Build the final prompt string
   */
  build(): string {
    const parts: string[] = [];

    for (const section of this.sections) {
      if (section.title) {
        parts.push(`## ${section.title}`);
      }
      parts.push(this.interpolate(section.content));
      parts.push(''); // Empty line between sections
    }

    return parts.join('\n').trim();
  }

  /**
   * Interpolate template variables in content
   */
  private interpolate(text: string): string {
    let result = text;
    for (const [key, value] of Object.entries(this.context)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  /**
   * Get system prompt (role definition)
   */
  buildSystem(): string {
    // System prompt is typically the first section or a separate method
    const systemSection = this.sections.find(s => s.title?.toLowerCase().includes('role') || s.title?.toLowerCase().includes('system'));
    return systemSection ? this.interpolate(systemSection.content) : '';
  }

  /**
   * Get user prompt (task instructions)
   */
  buildUser(): string {
    // User prompt is everything except system
    const userSections = this.sections.filter(s => 
      !s.title?.toLowerCase().includes('role') && 
      !s.title?.toLowerCase().includes('system')
    );
    return userSections.map(s => {
      let part = '';
      if (s.title) part += `## ${s.title}\n`;
      part += this.interpolate(s.content);
      return part;
    }).join('\n\n').trim();
  }
}

/**
 * Factory function for creating prompt builders
 */
export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder();
}

