/**
 * Parses streaming content to extract concept, description, and parents tags
 * Returns structured data for display
 */

export interface ParsedConcept {
  name: string;
  description: string;
  parents: string[];
}

/**
 * Parses accumulated stream content to extract concepts with their descriptions and parents
 * @param content - The accumulated stream content
 * @returns Array of parsed concepts
 */
export function parseStreamingConcepts(content: string): ParsedConcept[] {
  const concepts: ParsedConcept[] = [];
  
  // Match concept blocks with description and parents
  const conceptBlockRegex = /<concept>(.*?)<\/concept>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<parents>([\s\S]*?)<\/parents>/gi;
  const matches = Array.from(content.matchAll(conceptBlockRegex));
  
  matches.forEach((match) => {
    const name = match[1]?.trim() || '';
    const description = match[2]?.trim() || '';
    const parentsText = match[3]?.trim() || '';
    
    // Parse parents (comma-separated)
    const parents = parentsText
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
    
    if (name) {
      concepts.push({
        name,
        description,
        parents,
      });
    }
  });
  
  // Also handle incomplete concepts (concept tag without full block)
  const incompleteConceptRegex = /<concept>(.*?)<\/concept>/gi;
  const incompleteMatches = Array.from(content.matchAll(incompleteConceptRegex));
  
  incompleteMatches.forEach((match) => {
    const name = match[1]?.trim() || '';
    if (name && !concepts.some(c => c.name === name)) {
      concepts.push({
        name,
        description: '',
        parents: [],
      });
    }
  });
  
  return concepts;
}

