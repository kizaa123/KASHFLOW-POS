/* Copies the icon font, charts and export libraries out of node_modules into vendor/,
   so every page works with no internet connection. Runs automatically after `npm install`. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);
const out = (...p) => path.join(root, 'vendor', ...p);

const files = [
  [nm('@fortawesome', 'fontawesome-free', 'css', 'all.min.css'), out('fontawesome', 'css', 'all.min.css')],
  [nm('chart.js', 'dist', 'chart.umd.js'), out('chart.umd.min.js')],
  [nm('xlsx', 'dist', 'xlsx.full.min.js'), out('xlsx.full.min.js')],
  [nm('jspdf', 'dist', 'jspdf.umd.min.js'), out('jspdf.umd.min.js')],
  [nm('jspdf-autotable', 'dist', 'jspdf.plugin.autotable.min.js'), out('jspdf.plugin.autotable.min.js')],
];

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(nm())) {
  console.log('copy-vendor: node_modules not found, skipping.');
  process.exit(0);
}

for (const [from, to] of files) {
  if (!fs.existsSync(from)) {
    console.error('copy-vendor: missing ' + path.relative(root, from));
    process.exitCode = 1;
    continue;
  }
  copy(from, to);
}

const fontsFrom = nm('@fortawesome', 'fontawesome-free', 'webfonts');
const fontsTo = out('fontawesome', 'webfonts');
fs.mkdirSync(fontsTo, { recursive: true });
for (const f of fs.readdirSync(fontsFrom)) copy(path.join(fontsFrom, f), path.join(fontsTo, f));

console.log('copy-vendor: offline libraries copied to vendor/');
