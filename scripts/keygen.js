/* KB.TECH licence key generator. Keep this on YOUR computer only.
   Usage:  npm run keygen -- <MACHINE-ID>      e.g. npm run keygen -- KD64-M8FM-409A-BR1Y */
const fs = require('fs');
const path = require('path');
const { makeKey, normalizeMachineId } = require('../electron/license');

const LOG_DIR = path.join(__dirname, '..', 'license-keys');
const LOG_FILE = path.join(LOG_DIR, 'issued-keys.csv');

const id = normalizeMachineId(process.argv.slice(2).join(''));
if (id.length !== 16) {
  console.log('\n  Type the customer\'s Machine ID after the command, e.g.\n  npm run keygen -- KD64-M8FM-409A-BR1Y\n');
  process.exit(1);
}

const pretty = id.match(/.{4}/g).join('-');
const key = makeKey(id);
fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, 'date,machine_id,licence_key\n');
fs.appendFileSync(LOG_FILE, `${new Date().toISOString()},${pretty},${key}\n`);

console.log(`\n  Machine ID   ${pretty}\n  Licence key  ${key}\n\n  Saved in license-keys\\issued-keys.csv\n`);
