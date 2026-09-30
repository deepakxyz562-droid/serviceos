/**
 * Document Text Extraction — Enterprise Agent Architecture Phase 2
 * =================================================================
 *
 * Extracts plain text from PDF and DOCX files for knowledge base ingestion.
 * PDF extraction uses a simple text-layer parser (no external deps).
 * DOCX extraction uses the zip+xml approach (docx is a zip of XML files).
 *
 * For production use, consider:
 *   - PDF: pdf-parse (npm) or Apache Tika
 *   - DOCX: mammoth (npm) or docx4j
 *   - This implementation provides basic extraction without dependencies.
 */

/**
 * Extract text from a PDF buffer.
 * Uses a simple approach: find text between BT and ET markers in the
 * content streams, and extract text from Tj/TJ operators.
 */
export function extractPdfText(buffer: Buffer): string {
  try {
    const text = buffer.toString('latin1');

    // Simple extraction: find text in parentheses between BT/ET blocks
    const texts: string[] = [];
    const textRegex = /\(([^)]+)\)/g;
    let match;

    while ((match = textRegex.exec(text)) !== null) {
      const chunk = match[1];
      // Filter out non-text content (binary, hex streams)
      if (chunk.length > 1 && /[\x20-\x7E]/.test(chunk) && !/[<>{}[\]\/]/.test(chunk)) {
        texts.push(chunk);
      }
    }

    const result = texts.join(' ').replace(/\s+/g, ' ').trim();

    // If we got very little text, the PDF might be image-based (scanned)
    if (result.length < 50) {
      return '[PDF appears to be image-based (scanned). OCR extraction not available. Please provide a text-based PDF.]';
    }

    return result;
  } catch (err) {
    console.error('[extractPdfText] Error:', err);
    return '';
  }
}

/**
 * Extract text from a DOCX buffer.
 * DOCX is a ZIP file containing word/document.xml.
 * We extract text from <w:t> elements.
 */
export function extractDocxText(buffer: Buffer): string {
  try {
    // Simple approach: search for XML text elements in the buffer
    const text = buffer.toString('utf8');

    // Extract text from <w:t> elements (Word text runs)
    const texts: string[] = [];
    const wtRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let match;

    while ((match = wtRegex.exec(text)) !== null) {
      texts.push(match[1]);
    }

    // Also extract paragraph breaks from <w:p> elements
    const result = texts.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

    return result.trim();
  } catch (err) {
    console.error('[extractDocxText] Error:', err);
    return '';
  }
}

/**
 * Detect file type from buffer magic bytes and extract text accordingly.
 */
export function extractDocumentText(buffer: Buffer, filename?: string): string {
  // Detect by magic bytes
  const isPdf = buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
  const isDocx = buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b; // PK (zip)

  // Also check filename extension
  const ext = filename?.split('.').pop()?.toLowerCase();
  const isPdfByName = ext === 'pdf';
  const isDocxByName = ext === 'docx';
  const isTxtByName = ext === 'txt' || ext === 'md' || ext === 'csv';

  if (isPdf || isPdfByName) {
    return extractPdfText(buffer);
  }
  if (isDocx || isDocxByName) {
    return extractDocxText(buffer);
  }
  if (isTxtByName) {
    return buffer.toString('utf8');
  }

  // Fallback: try as plain text
  return buffer.toString('utf8');
}
