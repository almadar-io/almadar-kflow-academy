/**
 * Utility functions for parsing JSON, especially for streaming/incremental parsing
 */

/**
 * Incrementally parse JSON from streaming content
 * Extracts key-value pairs as they become available, including partial arrays
 * 
 * @param content - The streaming JSON content (may be incomplete)
 * @returns A partial object with extracted key-value pairs
 * 
 * @example
 * // As content streams in: '{"title": "Learn Java", "milestones": [{"id": "m1"'
 * parseIncrementalJSON(content)
 * // Returns: { title: "Learn Java", milestones: [{ id: "m1" }] }
 */
export function parseIncrementalJSON(content: string): any {
  const partialGoal: any = {};
  
  // First, try to parse the entire JSON if it's complete
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch {
    // JSON not complete yet, continue with incremental parsing
  }
  
  // Extract top-level keys and their values incrementally
  // This regex matches: "key": followed by a value (string, number, boolean, array, object)
  const keyValueRegex = /"([^"]+)":\s*((?:"(?:[^"\\]|\\.)*")|(?:true|false|null)|(?:-?\d+\.?\d*)|(?:\[[^\]]*\])|(?:\{[^}]*\})|(?:[^,}\]]+))/g;
  let match;
  const processedKeys = new Set<string>();
  
  while ((match = keyValueRegex.exec(content)) !== null) {
    const key = match[1];
    let valueStr = match[2]?.trim();
    
    // Skip if we've already processed this key (except for arrays which we update incrementally)
    if (!valueStr) continue;
    
    try {
      // Handle string values
      if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
        if (!processedKeys.has(key)) {
          partialGoal[key] = JSON.parse(valueStr);
          processedKeys.add(key);
        }
      }
      // Handle boolean values
      else if (valueStr === 'true' || valueStr === 'false') {
        if (!processedKeys.has(key)) {
          partialGoal[key] = valueStr === 'true';
          processedKeys.add(key);
        }
      }
      // Handle null
      else if (valueStr === 'null') {
        if (!processedKeys.has(key)) {
          partialGoal[key] = null;
          processedKeys.add(key);
        }
      }
      // Handle numbers
      else if (/^-?\d+$/.test(valueStr)) {
        if (!processedKeys.has(key)) {
          partialGoal[key] = parseInt(valueStr, 10);
          processedKeys.add(key);
        }
      } else if (/^-?\d+\.\d+$/.test(valueStr)) {
        if (!processedKeys.has(key)) {
          partialGoal[key] = parseFloat(valueStr);
          processedKeys.add(key);
        }
      }
      // Handle arrays - extract incrementally
      else if (valueStr.startsWith('[')) {
        const keyPos = content.indexOf(`"${key}":`, match.index);
        if (keyPos !== -1) {
          const arrayStart = content.indexOf('[', keyPos);
          if (arrayStart !== -1) {
            // Try to parse complete array first
            let depth = 0;
            let i = arrayStart;
            let completeArray = false;
            while (i < content.length) {
              if (content[i] === '[') depth++;
              if (content[i] === ']') depth--;
              if (depth === 0) {
                try {
                  const arrayStr = content.substring(arrayStart, i + 1);
                  partialGoal[key] = JSON.parse(arrayStr);
                  processedKeys.add(key);
                  completeArray = true;
                  break;
                } catch {
                  // Array not complete yet, will try incremental parsing
                }
              }
              i++;
            }
            
            // If array is not complete, extract items incrementally
            if (!completeArray) {
              const arrayContent = content.substring(arrayStart + 1);
              const items: any[] = [];
              let itemStart = 0;
              let itemDepth = 0;
              let inString = false;
              let escapeNext = false;
              
              for (let j = 0; j < arrayContent.length; j++) {
                const char = arrayContent[j];
                
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"' && !escapeNext) {
                  inString = !inString;
                  continue;
                }
                
                if (!inString) {
                  if (char === '{' || char === '[') {
                    itemDepth++;
                  } else if (char === '}' || char === ']') {
                    itemDepth--;
                  }
                  
                  // Item separator or end of array
                  if ((char === ',' && itemDepth === 0) || (char === ']' && itemDepth === 0)) {
                    if (j > itemStart) {
                      const itemStr = arrayContent.substring(itemStart, char === ']' ? j : j).trim();
                      if (itemStr) {
                        try {
                          const item = JSON.parse(itemStr);
                          items.push(item);
                        } catch {
                          // Item not complete yet, but we'll keep what we have
                        }
                      }
                    }
                    if (char === ']') break;
                    itemStart = j + 1;
                  }
                }
              }
              
              // Update array with extracted items
              if (items.length > 0) {
                partialGoal[key] = items;
                processedKeys.add(key);
              }
            }
          }
        }
      }
      // Handle objects - find the complete object in content
      else if (valueStr.startsWith('{')) {
        if (!processedKeys.has(key)) {
          const keyPos = content.indexOf(`"${key}":`, match.index);
          if (keyPos !== -1) {
            const objStart = content.indexOf('{', keyPos);
            if (objStart !== -1) {
              let depth = 0;
              let i = objStart;
              while (i < content.length) {
                if (content[i] === '{') depth++;
                if (content[i] === '}') depth--;
                if (depth === 0) {
                  try {
                    const objStr = content.substring(objStart, i + 1);
                    partialGoal[key] = JSON.parse(objStr);
                    processedKeys.add(key);
                    break;
                  } catch {
                    // Object not complete yet
                  }
                }
                i++;
              }
            }
          }
        }
      }
    } catch {
      // Value not parseable yet, skip
    }
  }
  
  return partialGoal;
}

