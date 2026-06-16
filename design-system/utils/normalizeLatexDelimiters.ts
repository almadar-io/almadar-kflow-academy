/**
 * Normalizes LaTeX math delimiters in markdown content.
 *
 * remark-math only recognizes `$...$` for inline math and `$$...$$` for
 * display math by default. Generated lesson content sometimes uses LaTeX
 * style `\( ... \)` / `\[ ... \]` delimiters, which would otherwise be
 * emitted as plain text. This helper converts those delimiters before
 * rendering so KaTeX can process them.
 */
export function normalizeLatexDelimiters(content: string): string {
  if (!content) return content;

  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$");
}
