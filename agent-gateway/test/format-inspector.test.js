import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectFileFormat } from '../src/format-inspector.js';
import { officeParts, zipFixture } from '../test-support/office-fixture.js';

test('text and XML inspectors reject binary, malformed, external-resource and expansion constructs', async () => {
  assert.equal((await inspectFileFormat(Buffer.from('# Progress\nHello'), 'md')).verdict, 'inspected');
  assert.equal((await inspectFileFormat(Buffer.from('<root>hello &amp; goodbye</root>'), 'xml')).verdict, 'inspected');
  for (const [type, content] of [
    ['md', Buffer.from([0xff, 0x00])], ['md', Buffer.from('<script>alert(1)</script>')],
    ['xml', Buffer.from('<root>')],
    ['xml', Buffer.from('<!DOCTYPE root [<!ENTITY x SYSTEM "file:///sensitive">]><root>&x;</root>')],
    ['xml', Buffer.from('<root xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="https://example.test"/></root>')],
    ['xml', Buffer.from('<?xml-stylesheet href="https://example.test/style"?><root/>')],
    ['xml', Buffer.from('<x>'.repeat(65) + '</x>'.repeat(65))],
  ]) assert.equal((await inspectFileFormat(content, type)).verdict, 'rejected');
});

test('Office inspector distinguishes package types without extracting archive files', async () => {
  assert.equal((await inspectFileFormat(zipFixture(officeParts('docx')), 'docx')).verdict, 'inspected');
  assert.equal((await inspectFileFormat(zipFixture(officeParts('xlsx')), 'xlsx')).verdict, 'inspected');
  assert.equal((await inspectFileFormat(zipFixture(officeParts('docx')), 'xlsx')).reason, 'OFFICE_PACKAGE_TYPE_MISMATCH');
  assert.equal((await inspectFileFormat(Buffer.from('not a zip'), 'docx')).verdict, 'rejected');
});

test('Office inspector blocks duplicate entries, active parts, external relationships and excessive expansion', async () => {
  const rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://example.test/hyperlink" TargetMode="External" Target="https://example.test"/></Relationships>';
  for (const entries of [
    [...officeParts(), ['word/vbaProject.bin', 'macro']],
    [...officeParts(), ['word/_rels/document.xml.rels', rels]],
    [...officeParts(), ['word/document.xml', '<root/>']],
    [...officeParts(), ['../escape.xml', '<root/>']],
  ]) assert.equal((await inspectFileFormat(zipFixture(entries), 'docx')).verdict, 'rejected');
  const bomb = zipFixture([...officeParts(), ['word/large.xml', '<root>' + 'a'.repeat(100_000) + '</root>']], { compress: true });
  assert.equal((await inspectFileFormat(bomb, 'docx')).reason, 'ARCHIVE_EXPANSION_LIMIT');
});

test('PDF requires further review and parser timeouts do not mark a file inspected', async () => {
  assert.equal((await inspectFileFormat(Buffer.from('%PDF-1.7\n1 0 obj\n%%EOF\n'), 'pdf')).reason, 'PDF_INSPECTOR_REQUIRED');
  assert.equal((await inspectFileFormat(Buffer.from('not-pdf'), 'pdf')).verdict, 'rejected');
  const timeout = await inspectFileFormat(Buffer.from('<root/>'), 'xml', { timeoutMs: 1 });
  assert.equal(timeout.verdict, 'review_required');
  assert.equal(timeout.reason, 'FORMAT_CHECK_TIMEOUT');
});
