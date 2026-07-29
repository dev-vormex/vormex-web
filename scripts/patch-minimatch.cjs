// minimatch 3 expects brace-expansion to export a function. The security-fixed
// brace-expansion 5 keeps that function as a named export. Adapt old transitive
// consumers until ESLint's plugin tree upgrades minimatch.
const fs = require('node:fs');
const path = require('node:path');

const legacyImport = "var expand = require('brace-expansion')";
const compatibleImport = [
  "var braceExpansion = require('brace-expansion')",
  "var expand = typeof braceExpansion === 'function' ? braceExpansion : braceExpansion.expand",
].join('\n');

function patchMinimatch(directory) {
  const packagePath = path.join(directory, 'package.json');
  const sourcePath = path.join(directory, 'minimatch.js');
  if (!fs.existsSync(packagePath) || !fs.existsSync(sourcePath)) return 0;

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (!String(packageJson.version || '').startsWith('3.')) return 0;

  const source = fs.readFileSync(sourcePath, 'utf8');
  if (source.includes(compatibleImport)) return 0;
  if (!source.includes(legacyImport)) {
    throw new Error(`Unsupported minimatch 3 layout at ${sourcePath}`);
  }

  fs.writeFileSync(sourcePath, source.replace(legacyImport, compatibleImport));
  return 1;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return 0;
  let patched = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') continue;
    const child = path.join(directory, entry.name);
    if (entry.name === 'minimatch') patched += patchMinimatch(child);
    patched += walk(child);
  }
  return patched;
}

const patched = walk(path.resolve(__dirname, '..', 'node_modules'));
if (patched > 0) {
  console.log(`Patched ${patched} minimatch 3 installation(s) for brace-expansion 5 compatibility.`);
}
