/**
 * Split text into chunks based on newlines only
 * Returns all chunks separated by newlines (excluding empty lines)
 * This is an alternative chunking strategy that can be easily reverted
 */
export function chunkTextByNewline(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Split by newlines (both \n and \r\n)
  const lines = text.split(/\r?\n/);
  
  // Filter out empty lines and trim each line
  const chunks = lines
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Only return chunks with at least 2 characters
  return chunks.filter(chunk => chunk.length >= 2);
}

/**
 * Split text into chunks based on newlines and special characters
 * Stops chunking when encountering any character other than normal characters (letters, numbers, spaces, basic punctuation)
 * Returns only the first chunk for highlighting
 */
export function chunkText(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Normal characters: letters, numbers, spaces, and basic punctuation
  // We'll check character by character to stop at the first non-normal character
  const isNormalChar = (char: string): boolean => {
    const code = char.charCodeAt(0);
    // Letters (a-z, A-Z)
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true;
    // Numbers (0-9)
    if (code >= 48 && code <= 57) return true;
    // Space
    if (code === 32) return true;
    // Basic punctuation: . , ! ? ; : ' " - ( )
    if ([46, 44, 33, 63, 59, 58, 39, 34, 45, 40, 41].includes(code)) return true;
    return false;
  };
  
  // Find the first chunk - take text until we hit a non-normal character or newline
  let firstChunk = '';
  let i = 0;
  
  // Skip leading whitespace (spaces and tabs)
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
    i++;
  }
  
  // Collect characters until we hit a special character or newline
  while (i < text.length) {
    const char = text[i];
    
    // Stop at newlines (both \n and \r)
    if (char === '\n' || char === '\r') {
      break;
    }
    
    // Stop at non-normal characters (special characters, HTML tags, markdown syntax, etc.)
    if (!isNormalChar(char)) {
      break;
    }
    
    firstChunk += char;
    i++;
  }
  
  // Trim the chunk
  firstChunk = firstChunk.trim();
  
  // Only return if we have a valid chunk (at least 2 characters)
  if (firstChunk.length < 2) {
    return [];
  }
  
  // Return only the first chunk
  return [firstChunk];
}

