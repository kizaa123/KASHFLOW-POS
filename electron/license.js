/* Free trial and one-time licence for KASHFLOW POS (runs in the Electron main process only).
   - Trial: 5 days from the first launch on a PC.
   - Licence key: 20 characters (XXXXX-XXXXX-XXXXX-XXXXX) made from this PC's Machine ID with a
     KB.TECH secret, so a key only works on the computer it was made for. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const TRIAL_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_SLACK_MS = 6 * 60 * 60 * 1000;
const KEY_LENGTH = 20;
const SIGNED_PREFIX = 'KASHFLOW-POS|license|v2|';
const REG_PATH = 'HKCU\\Software\\KB.TECH STUDIO\\KASHFLOW POS';
const REG_VALUE = 'State';

// Kept split so the secret never appears as one readable value in the installed files.
const SEED_A = '86b127ae2be2fc304101a9a01afdda89183afcd63e6a3f0b43e1c18d59dbe0f4';
const SEED_B = 'eb895c3e9f7e6e91d8a371e739aec73dd3467e4b84e9ab292075842e8189406f';

function secret() {
  const a = Buffer.from(SEED_A, 'hex');
  const b = Buffer.from(SEED_B, 'hex');
  return Buffer.from(a.map((byte, i) => byte ^ b[i]));
}

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function group(str, size) {
  return str.match(new RegExp(`.{1,${size}}`, 'g')).join('-');
}

const QUIET = { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] };

function windowsMachineGuid() {
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], QUIET);
    const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
    return m ? m[1].trim().toLowerCase() : null;
  } catch (_) {
    return null;
  }
}

let cachedMachineId = null;
function machineId() {
  if (cachedMachineId) return cachedMachineId;
  const source = windowsMachineGuid() || `${os.hostname()}|${(os.cpus()[0] || {}).model || ''}|${os.totalmem()}`;
  const digest = crypto.createHash('sha256').update('kashflow-machine|' + source).digest();
  cachedMachineId = group(base32Encode(digest.subarray(0, 10)), 4);
  return cachedMachineId;
}

function normalizeMachineId(id) {
  return String(id || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function normalizeKey(key) {
  return String(key || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
}

/** Used by the KB.TECH key generator and by verifyKey. */
function makeKey(id) {
  const mac = crypto.createHmac('sha256', secret()).update(SIGNED_PREFIX + normalizeMachineId(id)).digest();
  return group(base32Encode(mac).slice(0, KEY_LENGTH), 5);
}

function verifyKey(key, id = machineId()) {
  const given = Buffer.from(normalizeKey(key));
  const expect = Buffer.from(normalizeKey(makeKey(id)));
  return given.length === expect.length && crypto.timingSafeEqual(given, expect);
}

/* ---- Saved state: kept in two places so deleting one does not restart the trial ---- */

function seal(state) {
  const body = JSON.stringify(state);
  const mac = crypto.createHash('sha256').update(machineId() + '|' + body).digest('hex').slice(0, 24);
  return Buffer.from(JSON.stringify({ body, mac })).toString('base64');
}

function unseal(text) {
  if (!text) return { missing: true };
  try {
    const { body, mac } = JSON.parse(Buffer.from(String(text).trim(), 'base64').toString('utf8'));
    const expect = crypto.createHash('sha256').update(machineId() + '|' + body).digest('hex').slice(0, 24);
    if (mac !== expect) return { tampered: true };
    return { state: JSON.parse(body) };
  } catch (_) {
    return { tampered: true };
  }
}

function readRegistry() {
  try {
    const out = execFileSync('reg', ['query', REG_PATH, '/v', REG_VALUE], QUIET);
    const m = out.match(new RegExp(`${REG_VALUE}\\s+REG_SZ\\s+(\\S+)`, 'i'));
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function writeRegistry(text) {
  try {
    execFileSync('reg', ['add', REG_PATH, '/v', REG_VALUE, '/t', 'REG_SZ', '/d', text, '/f'], { ...QUIET, stdio: 'ignore' });
  } catch (_) { /* the file copy is still saved */ }
}

function createLicense(userDataDir) {
  const file = path.join(userDataDir, 'license.dat');

  function readFile() {
    try { return fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  }

  function load() {
    const sources = [unseal(readFile()), unseal(process.platform === 'win32' ? readRegistry() : null)];
    const tampered = sources.some((s) => s.tampered);
    const states = sources.filter((s) => s.state).map((s) => s.state);
    const now = Date.now();
    const state = {
      trialStart: states.length ? Math.min(...states.map((s) => Number(s.trialStart) || now)) : now,
      lastSeen: states.length ? Math.max(...states.map((s) => Number(s.lastSeen) || 0)) : now,
      key: (states.find((s) => s.key && verifyKey(s.key)) || {}).key || null,
    };
    return { state, tampered };
  }

  function save(state) {
    const text = seal(state);
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    } catch (_) { /* registry copy is still saved */ }
    if (process.platform === 'win32') writeRegistry(text);
  }

  function status() {
    const { state, tampered } = load();
    const now = Date.now();
    const base = { machineId: machineId(), trialDays: TRIAL_DAYS };

    if (state.key) {
      save({ ...state, lastSeen: Math.max(now, state.lastSeen) });
      return { ...base, state: 'licensed', daysLeft: null };
    }
    if (tampered) return { ...base, state: 'expired', daysLeft: 0 };
    if (now + CLOCK_SLACK_MS < state.lastSeen) return { ...base, state: 'clock', daysLeft: 0 };

    save({ ...state, lastSeen: Math.max(now, state.lastSeen) });
    const endsAt = state.trialStart + TRIAL_DAYS * DAY_MS;
    if (now >= endsAt) return { ...base, state: 'expired', daysLeft: 0, endsAt };
    return { ...base, state: 'trial', daysLeft: Math.ceil((endsAt - now) / DAY_MS), endsAt };
  }

  function activate(key) {
    if (!verifyKey(key)) return { ok: false, message: "This key doesn't match this computer. Please check it and try again." };
    const { state } = load();
    save({ ...state, key: makeKey(machineId()), lastSeen: Math.max(Date.now(), state.lastSeen) });
    return { ok: true };
  }

  return { status, activate };
}

module.exports = { createLicense, machineId, makeKey, verifyKey, normalizeMachineId };
