import { SaxesParser } from 'saxes';
import yauzl from 'yauzl';
import { crc32 } from 'node:zlib';

export const INSPECTOR_VERSION = 'format-v1';
class FormatError extends Error { constructor(reason) { super(reason); this.reason = reason; } }
const stop = (reason) => { throw new FormatError(reason); };
const TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';
const RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

function decode(content) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(content); }
  catch { stop('INVALID_UTF8'); }
}

function inspectXml(content, onTag = () => {}) {
  if (content.length > 2 * 1024 * 1024) stop('XML_SIZE_LIMIT');
  const text = decode(content);
  let depth = 0;
  let count = 0;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', () => stop('MALFORMED_XML'));
  parser.on('doctype', () => stop('DTD_FORBIDDEN'));
  parser.on('processinginstruction', () => stop('XML_PROCESSING_INSTRUCTION_FORBIDDEN'));
  parser.on('xmldecl', ({ encoding }) => {
    if (encoding && encoding.toLowerCase() !== 'utf-8') stop('XML_ENCODING_UNSUPPORTED');
  });
  parser.on('opentag', (node) => {
    if (++depth > 64 || ++count > 100_000 || Object.keys(node.attributes).length > 128) stop('XML_COMPLEXITY_LIMIT');
    if (node.uri === 'http://www.w3.org/2001/XInclude') stop('EXTERNAL_RESOURCE_FORBIDDEN');
    for (const attr of Object.values(node.attributes)) {
      if (attr.value.length > 8192) stop('XML_COMPLEXITY_LIMIT');
      if (attr.uri === 'http://www.w3.org/2001/XMLSchema-instance' && /schemaLocation$/i.test(attr.local)) {
        stop('EXTERNAL_RESOURCE_FORBIDDEN');
      }
    }
    onTag(node, depth);
  });
  parser.on('closetag', () => { depth--; });
  // No external entity loader, network resolver, XSLT or XInclude processing is installed.
  parser.write(text).close();
}

async function inspectOffice(content, fileType) {
  const main = fileType === 'docx' ? 'word/document.xml' : 'xl/workbook.xml';
  const expectedType = fileType === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
  const zip = await yauzl.fromBufferPromise(content, { strictFileNames: true, validateEntrySizes: true });
  const seen = new Set();
  let total = 0;
  let mainFound = false;
  let typesFound = false;
  let relsFound = false;
  let needsMediaReview = false;
  try {
    if (zip.entryCount > 256) stop('ARCHIVE_ENTRY_LIMIT');
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      const lower = name.toLowerCase();
      if (seen.has(lower)) stop('ARCHIVE_DUPLICATE_ENTRY');
      seen.add(lower);
      if (name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || name.includes(':')) stop('ARCHIVE_PATH_FORBIDDEN');
      if (((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) stop('ARCHIVE_LINK_FORBIDDEN');
      if (entry.generalPurposeBitFlag & 1) stop('ENCRYPTED_ARCHIVE_FORBIDDEN');
      if (/vba|activex|embeddings|externalLinks|connections\.xml/i.test(name)) stop('OFFICE_ACTIVE_CONTENT_FORBIDDEN');
      if (name.endsWith('/')) continue;
      total += entry.uncompressedSize;
      if (entry.uncompressedSize > 2 * 1024 * 1024 || total > 8 * 1024 * 1024 ||
          entry.uncompressedSize > Math.max(1, entry.compressedSize) * 100) stop('ARCHIVE_EXPANSION_LIMIT');
      const xmlPart = lower.endsWith('.xml') || lower.endsWith('.rels');
      if (!xmlPart && !/\.(png|jpe?g|gif|webp)$/.test(lower)) stop('OFFICE_UNSUPPORTED_PART');
      const stream = await zip.openReadStreamPromise(entry);
      let size = 0;
      const parts = [];
      for await (const part of stream) {
        size += part.length;
        if (size > entry.uncompressedSize || size > 2 * 1024 * 1024) { stream.destroy(); stop('ARCHIVE_EXPANSION_LIMIT'); }
        parts.push(part);
      }
      const bytes = Buffer.concat(parts);
      if (crc32(bytes) !== entry.crc32) stop('ARCHIVE_CRC_MISMATCH');
      if (!xmlPart) { needsMediaReview = true; continue; }
      inspectXml(bytes, (node, depth) => {
        const attr = (key) => node.attributes[key]?.value;
        if (lower.endsWith('.rels') && node.local === 'Relationship' && node.uri === RELS) {
          if (attr('TargetMode')?.toLowerCase() === 'external' || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(attr('Target') ?? '')) {
            stop('OFFICE_EXTERNAL_RELATIONSHIP_FORBIDDEN');
          }
          if (name === '_rels/.rels' && /\/officeDocument$/.test(attr('Type') ?? '') &&
              [main, '/' + main].includes(attr('Target'))) relsFound = true;
        }
        if (name === '[Content_Types].xml' && node.uri === TYPES) {
          const contentType = attr('ContentType') ?? '';
          if (/macroEnabled|vba|activeX|oleObject/i.test(contentType)) stop('OFFICE_ACTIVE_CONTENT_FORBIDDEN');
          if (node.local === 'Override' && attr('PartName') === '/' + main && contentType === expectedType) typesFound = true;
        }
        if (name === main && depth === 1 && node.local === (fileType === 'docx' ? 'document' : 'workbook') &&
            node.uri === (fileType === 'docx' ? W : X)) mainFound = true;
      });
    }
    if (!mainFound || !typesFound || !relsFound) stop('OFFICE_PACKAGE_TYPE_MISMATCH');
    return needsMediaReview ? 'OFFICE_MEDIA_REVIEW_REQUIRED' : 'FORMAT_RULES_COMPLETED';
  } finally { zip.close(); }
}

/** Returns structural observations, never a declaration that content is safe to execute or disclose. */
export async function inspectFormatCore(content, fileType) {
  const outcome = (verdict, reason) => ({ verdict, reason, inspectorVersion: INSPECTOR_VERSION });
  try {
    if (!Buffer.isBuffer(content) || !content.length || content.length > 2 * 1024 * 1024) stop('FORMAT_SIZE_LIMIT');
    if (fileType === 'md') {
      const text = decode(content);
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) || /^(?:%PDF-|PK\x03\x04|MZ)/.test(text)) stop('MARKDOWN_BINARY_CONTENT');
      if (/<\s*(?:script|iframe|object|embed|svg|math)\b/i.test(text)) stop('MARKDOWN_ACTIVE_HTML');
      if (/<\/?[a-z][^>]*>/i.test(text)) return outcome('review_required', 'MARKDOWN_HTML_REVIEW_REQUIRED');
      return outcome('inspected', 'FORMAT_RULES_COMPLETED');
    }
    if (fileType === 'xml') { inspectXml(content); return outcome('inspected', 'FORMAT_RULES_COMPLETED'); }
    if (fileType === 'docx' || fileType === 'xlsx') {
      const reason = await inspectOffice(content, fileType);
      return outcome(reason === 'FORMAT_RULES_COMPLETED' ? 'inspected' : 'review_required', reason);
    }
    if (fileType === 'pdf') {
      if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(content.subarray(0, 16).toString('ascii')) ||
          !/%%EOF\s*$/.test(content.subarray(-1024).toString('ascii'))) stop('PDF_STRUCTURE_INVALID');
      return outcome('review_required', 'PDF_INSPECTOR_REQUIRED');
    }
    stop('UNSUPPORTED_FILE_TYPE');
  } catch (error) {
    return outcome('rejected', error instanceof FormatError ? error.reason : 'FORMAT_PARSE_FAILED');
  }
}
