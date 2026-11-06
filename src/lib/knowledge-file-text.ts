/** Extract text with document-aware parsers; never index raw binary bytes. */
export const KNOWLEDGE_FILE_MAX_BYTES = 10 * 1024 * 1024;
export async function extractKnowledgeFile(buffer: Buffer, filename: string): Promise<string> {
  if (buffer.length > KNOWLEDGE_FILE_MAX_BYTES) throw new Error('Maximum file size is 10 MB.');
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['txt', 'md', 'csv', 'json'].includes(ext || '')) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (text.includes('\0')) throw new Error('This file does not contain readable text.');
    return text.trim();
  }
  if (ext === 'docx') {
    const { extractRawText } = await import('mammoth');
    return (await extractRawText({ buffer })).value.trim();
  }
  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { return (await parser.getText()).text.trim(); }
    finally { await parser.destroy(); }
  }
  throw new Error('Use a PDF, DOCX, TXT, Markdown, CSV or JSON file.');
}
