// Prints the CHANGELOG.md section for one version (used as the GitHub Release body).
// Usage: node tools/release-notes.js 1.0.0
const fs = require('fs');
const path = require('path');

const version = (process.argv[2] || '').replace(/^v/, '');
if (!version) {
  console.error('Usage: node tools/release-notes.js <version>');
  process.exit(2);
}

const text = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const lines = text.split('\n');
const start = lines.findIndex((l) => l.startsWith('## [' + version + ']'));
if (start < 0) {
  console.error('No CHANGELOG.md section found for version ' + version);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
if (end < 0) end = lines.length;
// Drop the footer link references that follow the last section.
const body = lines.slice(start + 1, end).filter((l) => !/^\[[^\]]+\]: https?:\/\//.test(l)).join('\n').trim();
if (!body) {
  console.error('CHANGELOG.md section for ' + version + ' is empty');
  process.exit(1);
}
console.log(body);
