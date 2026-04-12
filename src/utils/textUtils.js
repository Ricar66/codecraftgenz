/**
 * Remove markdown syntax from a string, returning plain text.
 */
export function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')        // *italic*
    .replace(/`(.+?)`/g, '$1')          // `code`
    .replace(/#{1,6}\s+/g, '')          // ## headers
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url)
    .replace(/!\[.*?\]\(.+?\)/g, '')    // ![image](url)
    .trim();
}
