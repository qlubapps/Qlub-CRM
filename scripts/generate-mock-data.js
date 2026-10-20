#!/usr/bin/env node
// Generates the fictional dataset for the hackathon build and writes it into ../index.html,
// replacing the five embedded data constants (DATA, BUILTIN_VISITS, DEFAULT_ZONES,
// BUILTIN_REST_STATUS, AM_BY_RID). Every brand, person and number here is invented.
// Seeded, so re-running produces the same data:  node scripts/generate-mock-data.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');

// ---- seeded PRNG (mulberry32) ----
let seed = 20261020;
function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + rnd() * (hi - lo);
const intBetween = (lo, hi) => Math.floor(between(lo, hi + 1));
function gauss(){ let u = 0, v = 0; while(!u) u = rnd(); while(!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

// ---- calendar ----
const START = '2026-01-01';
const DAYS = 290; // 1 Jan → 17 Oct 2026
const startDate = new Date(START + 'T00:00:00Z');
const offDate = off => new Date(startDate.getTime() + off * 86400000);
const iso = d => d.toISOString().slice(0, 10);
const dmy = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

// ---- fictional people ----
const AMS = ['Rania Kassab', 'Faisal Qadri', 'Lina Sabbagh', 'Ziad Mansour'];
const JUNIOR_AM = 'Kareem Nassif'; // deliberately small book (<30) so the ranking cutoff has something to exclude
const OWNERS = ['Jana Fakhoury', 'Waleed Sarraf', 'Rima Haddadin', 'Nabil Karam', 'Dima Azar', 'Hadi Shami'];
const MGRS = ['Samir Atallah', 'Noor Jaber', 'Unassigned'];
const VISITORS = ['Sami Rahal', 'Dana Khoury', 'OB Team']; // must match VISIT_TEAM in index.html

// ---- fictional geography (city → districts) ----
const CITIES = {
  Riyadh:  { code: 'ryd', weight: 0.32, areas: ['Olaya', 'Al Malqa', 'Hittin', 'Al Nakheel', 'Al Wurud', 'Al Yasmin'] },
  Jeddah:  { code: 'jed', weight: 0.30, areas: ['Al Rawdah', 'Al Shati', 'Al Andalus', 'Al Zahra', 'Obhur', 'Al Khalidiyah'] },
  Dammam:  { code: 'dmm', weight: 0.14, areas: ['Al Faisaliyah', 'Al Shati Al Sharqi', 'Al Mazruiyah', 'Al Rakah'] },
  Mecca:   { code: 'mkh', weight: 0.12, areas: ['Al Aziziyah', 'Al Awali', 'Al Shawqiyah'] },
  Medina:  { code: 'med', weight: 0.12, areas: ['Quba', 'Al Aziziyah', 'Sultana'] },
};
const CITY_NAMES = Object.keys(CITIES);
function pickCity(){ let x = rnd(), acc = 0; for(const c of CITY_NAMES){ acc += CITIES[c].weight; if(x < acc) return c; } return CITY_NAMES[0]; }

// ---- invented brands (name, branches, ticket size SAR) ----
const BRAND_WORDS_A = ['Saffron', 'Ember', 'Dune', 'Copper', 'Olive', 'Cedar', 'Marble', 'Salt', 'Juniper', 'Amber', 'Sumac', 'Velvet', 'Harbor', 'Falcon', 'Lantern', 'Orchard', 'Basil', 'Indigo', 'Granite', 'Mirage', 'Clove', 'Pepper', 'Willow', 'Nomad', 'Coral', 'Oasis', 'Ivory', 'Fig', 'Thyme', 'Sable', 'Zest', 'Crescent', 'Hearth', 'Pistachio', 'Tamarind', 'Cardamom'];
const BRAND_WORDS_B = ['Kitchen', 'Grill', 'House', 'Table', 'Bistro', 'Coffee Co', 'Bakery', 'Eatery', 'Smokehouse', 'Diner', 'Lounge', 'Burger Bar', 'Noodle Bar', 'Pizzeria', 'Sushi', 'Shawarma', 'Café', 'Tea House', 'Steakhouse', 'Social'];
const POS = ['', '—', 'foodics', 'foodics', 'foodics', 'deliverect', 'tabsense', 'dgtera', 'chef', 'iiko-go'];

const brandNames = new Set();
while(brandNames.size < 90){ brandNames.add(pick(BRAND_WORDS_A) + ' ' + pick(BRAND_WORDS_B)); }
const brands = [...brandNames].map(name => {
  const roll = rnd();
  const branches = roll < 0.55 ? 1 : roll < 0.8 ? 2 : roll < 0.93 ? 4 : 7;
  return { name, branches, ticket: Math.round(between(55, 260)) };
});

// ---- account profiles drive adoption behaviour ----
// good: steady 45–70% | warn: 30–45% | bad: 5–30% | decline: healthy → slipping | rising: improving
// gap: Qlub processes payments but the POS revenue feed is missing (the app's "Reporting Gap" segment)
function pickProfile(){
  const x = rnd();
  if(x < 0.32) return 'good';
  if(x < 0.56) return 'warn';
  if(x < 0.78) return 'bad';
  if(x < 0.88) return 'decline';
  if(x < 0.96) return 'rising';
  return 'gap';
}

const restaurants = [], profiles = [], usedIds = new Set();
for(const b of brands){
  const homeCity = pickCity();
  for(let k = 0; k < b.branches; k++){
    const city = (k === 0 || rnd() < 0.6) ? homeCity : pickCity();
    const area = pick(CITIES[city].areas);
    let id = `${slug(b.name)}_${CITIES[city].code}_${slug(area)}`;
    let n = 2; while(usedIds.has(id)) id = `${slug(b.name)}_${CITIES[city].code}_${slug(area)}${n++}`;
    usedIds.add(id);
    restaurants.push({ id, brand: b.name, city, area, owner: pick(OWNERS), mgr: pick(MGRS), pos: pick(POS), golive: '' , _ticket: b.ticket });
    profiles.push(pickProfile());
  }
}

// go-live dates: most are mature accounts; a handful went live recently so the Watchlist has content
restaurants.forEach((r, i) => {
  const x = rnd();
  let off;
  if(i % 19 === 7) off = intBetween(DAYS - 30, DAYS - 6);      // live within the last month → Watchlist
  else if(x < 0.12) off = intBetween(40, DAYS - 40);            // went live during 2026
  else off = -intBetween(60, 1000);                             // live before the data window
  r._liveOff = off;
  r.golive = dmy(offDate(off));
});

// ---- daily series: [off, arGMV, restGMV, qOrd, rOrd, qAll] ----
const WEEKDAY_MULT = [0.95, 0.85, 0.85, 0.92, 1.18, 1.25, 1.05]; // Sun..Sat — Thu/Fri busiest
function seasonal(off){
  // Ramadan 2026 (~18 Feb – 19 Mar): restaurant revenue dips, then Eid bump
  if(off >= 48 && off <= 77) return 0.72;
  if(off >= 78 && off <= 82) return 1.3;
  if(off >= 150 && off <= 240) return 0.93; // summer travel softness
  return 1;
}
const series = restaurants.map((r, i) => {
  const prof = profiles[i];
  const base = Math.exp(between(Math.log(2500), Math.log(32000))); // typical daily restaurant GMV, SAR
  const ticket = r._ticket;
  let arStart, arEnd;
  switch(prof){
    case 'good':    arStart = between(0.42, 0.62); arEnd = clamp(arStart + between(-0.03, 0.08), 0.46, 0.72); break;
    case 'warn':    arStart = between(0.28, 0.44); arEnd = clamp(arStart + between(-0.04, 0.05), 0.30, 0.44); break;
    case 'bad':     arStart = between(0.05, 0.28); arEnd = clamp(arStart + between(-0.05, 0.04), 0.03, 0.29); break;
    case 'decline': arStart = between(0.45, 0.62); arEnd = between(0.10, 0.26); break;
    case 'rising':  arStart = between(0.12, 0.25); arEnd = between(0.40, 0.58); break;
    default:        arStart = arEnd = between(0.25, 0.5);
  }
  const first = Math.max(0, r._liveOff);
  // declines happen late in the window so "Slipping" has recent movers
  const bend = prof === 'decline' ? intBetween(DAYS - 70, DAYS - 20) : first;
  const closedDays = new Set(); // occasional zero-Qlub days (staff not pushing, device off)
  const zeroRate = prof === 'bad' ? 0.18 : prof === 'warn' ? 0.06 : 0.02;
  const rows = [];
  let drift = 0;
  for(let off = first; off < DAYS; off++){
    if(rnd() < 0.012) continue; // restaurant closed that day — no row
    const wd = offDate(off).getUTCDay();
    const rest = Math.round(base * WEEKDAY_MULT[wd] * seasonal(off) * Math.exp(gauss() * 0.22));
    let t;
    if(prof === 'decline') t = off < bend ? 0 : (off - bend) / Math.max(1, DAYS - 1 - bend);
    else t = (off - first) / Math.max(1, DAYS - 1 - first);
    // new accounts ramp up over their first ~3 weeks
    const ramp = Math.min(1, (off - r._liveOff + 3) / 21);
    drift = clamp(drift * 0.9 + gauss() * 0.012, -0.06, 0.06);
    let ar = (arStart + (arEnd - arStart) * t) * (r._liveOff > 0 ? ramp : 1) + drift + gauss() * 0.05;
    if(rnd() < zeroRate) ar = 0;
    ar = clamp(ar, 0, 0.92);
    const arGMV = Math.round(rest * ar);
    const rOrd = Math.max(1, Math.round(rest / (ticket * between(0.85, 1.15))));
    const qOrd = arGMV ? Math.max(1, Math.round(rOrd * ar * between(0.9, 1.1))) : 0;
    if(prof === 'gap' && off > DAYS - 45){
      // POS revenue feed went quiet; Qlub still sees payments
      rows.push([off, 0, 0, qOrd, 0, arGMV]);
    } else {
      rows.push([off, arGMV, rest, qOrd, rOrd, arGMV]);
    }
  }
  return rows;
});

// ---- account managers (zones by city||area, then per-restaurant mapping) ----
const DEFAULT_ZONES = {};
let zi = 0;
for(const c of CITY_NAMES) for(const a of CITIES[c].areas) DEFAULT_ZONES[`${c}||${a}`] = AMS[zi++ % AMS.length];

const AM_BY_RID = {};
restaurants.forEach((r, i) => {
  if(i % 23 === 11) return;                       // a few left Unassigned on purpose
  if(i % 13 === 5) { AM_BY_RID[r.id] = JUNIOR_AM; return; }
  AM_BY_RID[r.id] = rnd() < 0.7 ? DEFAULT_ZONES[`${r.city}||${r.area}`] : pick(AMS);
});

// ---- operational status: a few Closed / Review accounts ----
const BUILTIN_REST_STATUS = {};
restaurants.forEach((r, i) => {
  if(profiles[i] === 'bad' && rnd() < 0.15) BUILTIN_REST_STATUS[r.id] = { status: 'Closed', date: '2026-09-30', note: 'Mock data: closed per status sheet' };
  else if(profiles[i] === 'decline' && rnd() < 0.25) BUILTIN_REST_STATUS[r.id] = { status: 'Review', date: '2026-10-01', note: 'Mock data: needs a check-in' };
});
// closed accounts stop trading a couple of weeks before the status date
for(const rid of Object.keys(BUILTIN_REST_STATUS)){
  if(BUILTIN_REST_STATUS[rid].status !== 'Closed') continue;
  const i = restaurants.findIndex(r => r.id === rid);
  series[i] = series[i].filter(row => row[0] < 255);
}

// ---- visit history ----
const PURPOSES = ['Low performing', 'Routine visit', '0 trx yesterday', 'QR delivery', 'Vouchers training', 'Focus list', 'Deliver prize', 'Fixing issue', 'Loyalty training'];
const NEXTS = ['Training', 'Pushback from Staff', 'Routine Check', 'Paper-QR', 'Coverage issue', 'Order Not Fetching', 'Management Issue', 'Missing QRs', 'More on Delivery & Takeaway', ''];
const ACTIONS = ['Re-Training', 'System Checking', 'Raised to tech team', 'No action', 'Explain Qlub value', 'Request AM support', 'Re-visit / Call', 'Deliver prize', ''];
const NOTES = ['Staff walked through the QR flow again', 'Manager supportive, cashier team still defaults to card machine', 'Table stickers faded — replacement requested', 'New shift lead trained on split-bill', 'Peak-hour pushback; suggested a table-tent reminder', 'POS order sync checked and working', 'Owner asked for monthly adoption report', 'Some QRs missing on the terrace', ''];
const BUILTIN_VISITS = [];
let vn = 0;
const atRisk = restaurants.map((r, i) => i).filter(i => ['bad', 'decline', 'warn'].includes(profiles[i]));
for(let k = 0; k < 260; k++){
  const i = rnd() < 0.7 ? pick(atRisk) : intBetween(0, restaurants.length - 1);
  const r = restaurants[i];
  const lo = Math.max(0, r._liveOff);
  if(lo >= DAYS - 2) continue;
  const off = intBetween(lo, DAYS - 1);
  const purpose = pick(PURPOSES);
  BUILTIN_VISITS.push({
    id: 'vb' + (vn++), rid: r.id, date: iso(offDate(off)), owner: pick(VISITORS), purpose,
    notes: pick(NOTES), outcome: purpose === 'QR delivery' ? pick(['Delivered', 'Delivered', 'Not delivered']) : pick(['5.0', '5.0', '4.0', '3.0', '2.0', '1.0', '']),
    action: pick(ACTIONS), next: pick(NEXTS), status: 'Completed',
  });
}
// a few upcoming assignments so the planner / field-team portal have open work
for(let k = 0; k < 14; k++){
  const i = pick(atRisk), r = restaurants[i];
  BUILTIN_VISITS.push({
    id: 'vb' + (vn++), rid: r.id, date: iso(offDate(DAYS + intBetween(0, 6))), owner: pick(VISITORS.slice(0, 2)),
    purpose: pick(['Low performing', 'Focus list', 'QR delivery']), notes: 'Mock assignment', outcome: '', action: '', next: '', status: 'Assigned',
  });
}
BUILTIN_VISITS.sort((a, b) => a.date.localeCompare(b.date));

// ---- write into index.html ----
const DATA = { startDate: START, days: DAYS, restaurants: restaurants.map(({ _ticket, _liveOff, ...r }) => r), series, bench: {} };
const replacements = {
  DATA: `const DATA = ${JSON.stringify(DATA)};`,
  BUILTIN_VISITS: `const BUILTIN_VISITS = ${JSON.stringify(BUILTIN_VISITS)};`,
  DEFAULT_ZONES: `const DEFAULT_ZONES = ${JSON.stringify(DEFAULT_ZONES)};`,
  BUILTIN_REST_STATUS: `const BUILTIN_REST_STATUS = ${JSON.stringify(BUILTIN_REST_STATUS)}; // mock data`,
  AM_BY_RID: `const AM_BY_RID = ${JSON.stringify(AM_BY_RID)};`,
};
const lines = fs.readFileSync(FILE, 'utf8').split('\n');
for(const [name, text] of Object.entries(replacements)){
  const idx = lines.findIndex(l => l.startsWith(`const ${name} = `));
  if(idx < 0) throw new Error(`could not find "const ${name} = " in index.html`);
  lines[idx] = text;
}
fs.writeFileSync(FILE, lines.join('\n'));

// ---- summary ----
const amCount = {};
Object.values(AM_BY_RID).forEach(a => { amCount[a] = (amCount[a] || 0) + 1; });
const profCount = {};
profiles.forEach(p => { profCount[p] = (profCount[p] || 0) + 1; });
console.log(`restaurants: ${restaurants.length}, brands: ${brands.length}, visits: ${BUILTIN_VISITS.length}, statuses: ${Object.keys(BUILTIN_REST_STATUS).length}`);
console.log('profiles', profCount);
console.log('AM books', amCount, 'unassigned', restaurants.length - Object.keys(AM_BY_RID).length);
