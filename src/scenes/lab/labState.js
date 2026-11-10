// Test Your Knowledge: the player's own mission. Everything they choose (destination, parts,
// colours, names), the credits they earn in the quizzes and how each test and flight step went
// is kept here, so every screen of the mode works on the same spaceship. It's saved in the
// browser, so a mission can be finished another day.
//
// The words (part names, facts, notes) are in public/content/scene8/scene.json; the numbers
// that decide how well a part suits a destination are game rules, so they live here.
import { Content } from '../../core/Content.js';

export const LAB = 'lab';
const KEY = 'starSailors.lab.v1';
const BEST_KEY = 'starSailors.labBest.v1';

export const MISSIONS = ['moon', 'mars', 'jupiter'];

// how each kind of part is chosen: one of a kind, or any mix (up to max)
export const CATEGORIES = [
  { id: 'body', pick: 'one', parts: ['crewCapsule', 'rover', 'probe'] },
  { id: 'power', pick: 'one', parts: ['batteries', 'solar', 'solarWings', 'rtg', 'fuelCells'] },
  { id: 'comms', pick: 'one', parts: ['smallAntenna', 'dish'] },
  { id: 'support', pick: 'many', parts: ['lifeSupport', 'insulation', 'radiationVault'] },
  { id: 'entry', pick: 'many', parts: ['heatShield', 'parachutes', 'landingLegs', 'airbags', 'skyCrane'] },
  { id: 'science', pick: 'many', max: 4, parts: ['camera', 'spectrometer', 'drill', 'magnetometer', 'weatherStation', 'seismometer'] },
  { id: 'rocket', pick: 'one', parts: ['smallRocket', 'mediumRocket', 'heavyRocket'] },
  { id: 'extras', pick: 'many', parts: ['extraFuel', 'starTracker'] }
];
export const categoryOf = (partId) => CATEGORIES.find((c) => c.parts.includes(partId));

// ---------- the rules: how well things work at each destination (0-100) ----------
// Sunlight compared with Earth's: solar panels make that much power.
export const SUN = { moon: 1, mars: 0.43, jupiter: 0.04 };
// how cold the trip gets (the thermal test and cruise use it)
export const COLD = { moon: 1, mars: 1.3, jupiter: 1.7 };
const POWER = {
  batteries: { moon: 45, mars: 15, jupiter: 10 }, // run flat after a few days
  solar: { moon: 90, mars: 60, jupiter: 10 }, // weaker the farther from the Sun
  solarWings: { moon: 95, mars: 85, jupiter: 70 }, // huge panels, like Juno's, still work at Jupiter
  rtg: { moon: 80, mars: 100, jupiter: 100 }, // works anywhere, day and night
  fuelCells: { moon: 100, mars: 30, jupiter: 15 } // perfect for a week-long crewed trip only
};
const COMMS = { smallAntenna: { moon: 85, mars: 35, jupiter: 15 }, dish: { moon: 100, mars: 100, jupiter: 100 } };
// how useful each instrument is there (0 = nothing to measure)
const SCIENCE = {
  moon: { camera: 3, spectrometer: 2, drill: 3, magnetometer: 1, weatherStation: 0, seismometer: 3 },
  mars: { camera: 3, spectrometer: 3, drill: 3, magnetometer: 1, weatherStation: 3, seismometer: 2 },
  jupiter: { camera: 3, spectrometer: 3, drill: 0, magnetometer: 3, weatherStation: 0, seismometer: 0 }
};
// the right kind of spacecraft for the job
const BODY_FIT = {
  moon: { crewCapsule: 1, rover: 0.7, probe: 0.6 },
  mars: { rover: 1, probe: 0.65, crewCapsule: 0.4 },
  jupiter: { probe: 1, rover: 0.3, crewCapsule: 0.3 }
};

// A sensible ship for each destination, used when a screen of the mode is opened on its own.
const STARTER = {
  moon: { body: 'crewCapsule', power: 'fuelCells', comms: 'dish', support: ['lifeSupport', 'insulation'], entry: ['heatShield', 'parachutes', 'landingLegs'], science: ['camera', 'drill', 'seismometer'], rocket: 'heavyRocket', extras: ['extraFuel'] },
  mars: { body: 'rover', power: 'rtg', comms: 'dish', support: ['insulation'], entry: ['heatShield', 'parachutes', 'skyCrane'], science: ['camera', 'spectrometer', 'drill', 'weatherStation'], rocket: 'mediumRocket', extras: ['starTracker'] },
  jupiter: { body: 'probe', power: 'rtg', comms: 'dish', support: ['radiationVault', 'insulation'], entry: [], science: ['camera', 'spectrometer', 'magnetometer'], rocket: 'heavyRocket', extras: ['extraFuel', 'starTracker'] }
};

function fresh() {
  return {
    mission: null,
    credits: 0,
    earned: 0,
    quiz: {}, // question id -> { tries, ok }
    parts: {}, // category -> list of part ids
    name: '',
    missionName: '',
    paint: { body: 'white', trim: 'orange', pattern: 'stripes' },
    patch: { shape: 'circle', color: 'navy', emblem: 'rocket' },
    tests: {}, // shake / thermal / systems -> 0-100
    flight: {}, // launch / cruise / arrival / science / home -> 0-100
    events: {} // what happened along the way (for the engineers' notes and the report)
  };
}

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key, v) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore - it just won't be remembered */
  }
}

export const Lab = {
  s: { ...fresh(), ...(read(KEY) || {}) },

  save() {
    write(KEY, this.s);
  },

  // A new mission: forget the old ship (the best report is kept separately).
  start(mission, credits) {
    this.s = fresh();
    this.s.mission = mission;
    this.s.credits = this.s.earned = credits;
    this.save();
  },

  get mission() {
    return MISSIONS.includes(this.s.mission) ? this.s.mission : 'mars';
  },

  // ---------- credits ----------
  earn(n) {
    this.s.credits += n;
    this.s.earned += n;
    this.save();
  },

  // ---------- parts ----------
  picked(cat) {
    return this.s.parts[cat] || [];
  },
  has(id) {
    const c = categoryOf(id);
    return !!c && this.picked(c.id).includes(id);
  },
  allParts() {
    return CATEGORIES.flatMap((c) => this.picked(c.id));
  },
  // Adds or removes a part, paying or refunding its cost. Returns '' when it worked, or why not
  // ('credits' or 'full').
  toggle(id) {
    const c = categoryOf(id);
    const cost = partCost(id);
    const list = this.picked(c.id);
    if (list.includes(id)) {
      this.s.parts[c.id] = list.filter((x) => x !== id);
      this.s.credits += cost;
      this.save();
      return '';
    }
    if (c.pick === 'one') {
      // swapping: the old one is handed back first
      const refund = list.reduce((sum, x) => sum + partCost(x), 0);
      if (this.s.credits + refund < cost) return 'credits';
      this.s.credits += refund - cost;
      this.s.parts[c.id] = [id];
    } else {
      if (c.max && list.length >= c.max) return 'full';
      if (this.s.credits < cost) return 'credits';
      this.s.credits -= cost;
      this.s.parts[c.id] = list.concat(id);
    }
    this.save();
    return '';
  },
  // A screen opened on its own (from the activity list) still needs a ship to work with.
  ensureShip() {
    const starter = STARTER[this.mission];
    if (!this.s.mission) this.s.mission = this.mission;
    if (!this.picked('body').length) {
      Object.entries(starter).forEach(([cat, v]) => {
        if (!this.picked(cat).length) this.s.parts[cat] = [].concat(v);
      });
    }
    if (!this.picked('rocket').length) this.s.parts.rocket = [starter.rocket];
    if (!this.s.name) this.s.name = 'Star Sailor 1';
    if (!this.s.missionName) this.s.missionName = 'Mission Nova';
    this.save();
  },

  // ---------- quiz ----------
  answered(qid) {
    return this.s.quiz[qid] || { tries: 0, ok: false };
  },
  recordAnswer(qid, ok, tries = 1) {
    const r = this.answered(qid);
    this.s.quiz[qid] = { tries: r.tries + tries, ok: r.ok || ok };
    this.save();
  },
  // questions given up on (still unanswered after two tries), for the bonus round
  missed() {
    return Object.entries(this.s.quiz)
      .filter(([, r]) => !r.ok)
      .map(([id]) => id);
  },

  // ---------- tests and flight ----------
  setTest(name, score) {
    this.s.tests[name] = Math.round(Math.max(0, Math.min(100, score)));
    this.save();
  },
  setFlight(name, score) {
    this.s.flight[name] = Math.round(Math.max(0, Math.min(100, score)));
    this.save();
  },
  event(code, on = true) {
    this.s.events[code] = on;
    this.save();
  },

  // ---------- the ship ----------
  design() {
    const one = (cat) => this.picked(cat)[0] || null;
    return {
      mission: this.mission,
      body: one('body'),
      power: one('power'),
      comms: one('comms'),
      support: this.picked('support'),
      entry: this.picked('entry'),
      science: this.picked('science'),
      rocket: one('rocket') || 'smallRocket',
      extras: this.picked('extras'),
      paint: this.s.paint,
      patch: this.s.patch,
      name: this.s.name,
      missionName: this.s.missionName
    };
  },

  // ---------- best report (shown on the menu card) ----------
  best() {
    return read(BEST_KEY);
  },
  keepBest(summary) {
    const b = this.best();
    if (!b || summary.points >= b.points) write(BEST_KEY, summary);
  }
};

// ---------- part data from the content file ----------
export function labContent() {
  return Content.chapter(LAB) || {};
}
export function part(id) {
  return (labContent().parts || {})[id] || { name: id, cost: 1, mass: 0.1 };
}
export function partCost(id) {
  return part(id).cost ?? 1;
}
export function shipMass(d) {
  const ids = [d.body, d.power, d.comms, ...d.support, ...d.entry, ...d.science, ...d.extras].filter(Boolean);
  return Math.round(ids.reduce((m, id) => m + (part(id).mass || 0), 0) * 10) / 10;
}
export function rocketLift(d) {
  const lift = part(d.rocket).lift || {};
  return lift[d.mission] ?? 0;
}

// ---------- rating a design ----------
// Six scores out of 100 (the axes of the report chart) and the notes that explain them. The
// notes are only shown after testing or flying, so the player learns by trying.
export function rate(d) {
  const m = d.mission;
  const notes = [];
  const has = (id) => [d.body, d.power, d.comms, ...d.support, ...d.entry, ...d.science, ...d.extras].includes(id);
  const clamp = (v) => Math.round(Math.max(0, Math.min(100, v)));

  // launch: can the rocket carry it there?
  const mass = shipMass(d);
  const lift = rocketLift(d);
  const ratio = mass ? lift / mass : 2;
  const launch = ratio >= 1.3 ? 100 : ratio >= 1 ? 70 + ((ratio - 1) / 0.3) * 30 : Math.max(10, ratio * 60);
  if (ratio < 1) notes.push('tooHeavy');

  // power at the destination
  const power = d.power ? POWER[d.power][m] : 0;
  if (!d.power) notes.push('noPower');
  else if (power < 60) notes.push({ batteries: 'batteriesFlat', solar: 'solarDim', solarWings: 'solarDim', fuelCells: 'fuelCellsShort' }[d.power] || 'noPower');

  // talking to Earth
  const comms = d.comms ? COMMS[d.comms][m] : 0;
  if (!d.comms) notes.push('noComms');
  else if (comms < 60) notes.push('weakSignal');

  // keeping the ship (and crew) safe
  let protection = 85;
  if (m === 'moon') {
    if (d.body !== 'crewCapsule') notes.push('notCrewed');
    if (!has('lifeSupport') && d.body === 'crewCapsule') {
      protection -= 45;
      notes.push('noLifeSupport');
    }
    if (!has('heatShield')) {
      protection -= 45;
      notes.push('noShieldHome');
    }
  } else if (m === 'mars') {
    if (d.body === 'crewCapsule') notes.push('capsuleFar');
    if (!has('heatShield')) {
      protection -= 50;
      notes.push('noShieldMars');
    }
  } else {
    if (d.body === 'crewCapsule') notes.push('capsuleFar');
    if (!has('radiationVault')) {
      protection -= 50;
      notes.push('noVault');
    }
    if (has('heatShield')) notes.push('shieldJupiter');
  }
  if (has('insulation')) protection += 10;
  else if (COLD[m] > 1) {
    protection -= 10;
    notes.push('noInsulation');
  }
  if (has('radiationVault') && m !== 'jupiter') protection += 5;

  // getting there: touching down, or (at Jupiter) staying in orbit
  let arrival;
  if (m === 'moon') {
    arrival = has('landingLegs') ? 70 : has('skyCrane') && d.body !== 'crewCapsule' ? 55 : 20;
    if (!has('landingLegs')) notes.push('noLegs');
    if (has('airbags') && d.body === 'crewCapsule') notes.push('airbagsCrew');
    if (has('parachutes')) arrival += 30; // for splashing down back on Earth
    else if (d.body === 'crewCapsule') notes.push('noChutesHome');
  } else if (m === 'mars') {
    const touch = has('skyCrane') ? (d.body === 'rover' ? 70 : 60) : has('airbags') ? 62 : has('landingLegs') ? 58 : 15;
    arrival = touch + (has('parachutes') ? 30 : 0);
    if (!has('parachutes')) notes.push('noChutesMars');
    if (touch < 50) notes.push('noTouchdown');
    if (has('airbags') && d.body === 'crewCapsule') notes.push('airbagsCrew');
  } else {
    arrival = has('extraFuel') ? 100 : 60;
    if (!has('extraFuel')) notes.push('noFuelOrbit');
    if (['landingLegs', 'airbags', 'skyCrane', 'parachutes'].some(has)) notes.push('noLandJupiter');
  }
  if (m === 'moon' && has('parachutes') && !has('landingLegs')) notes.push('chutesMoon');

  // science: the best instruments for the place, on the right kind of spacecraft
  const rel = SCIENCE[m];
  const best = Object.values(rel).sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0);
  const got = d.science.reduce((sum, id) => sum + (rel[id] || 0), 0);
  const fit = BODY_FIT[m][d.body] ?? 0.5;
  const science = (got / best) * 100 * fit;
  if (!d.science.length) notes.push('noScience');
  d.science.filter((id) => rel[id] === 0).forEach((id) => notes.push(`${id}Useless`));
  if (fit < 0.7) notes.push(m === 'jupiter' && d.body === 'rover' ? 'roverJupiter' : m === 'mars' && d.body === 'probe' ? 'probeMars' : 'wrongBody');

  return {
    axes: { launch: clamp(launch), power: clamp(power), comms: clamp(comms), protection: clamp(protection), arrival: clamp(arrival), science: clamp(science) },
    mass,
    lift,
    ratio,
    notes: [...new Set(notes)]
  };
}

// how useful one instrument is at the destination (0-3)
export function relevance(mission, id) {
  return SCIENCE[mission][id] || 0;
}
export function powerAt(source, mission) {
  return source ? POWER[source][mission] : 0;
}
export function commsAt(antenna, mission) {
  return antenna ? COMMS[antenna][mission] : 0;
}

// ---------- the final score ----------
const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
export const TESTS = ['shake', 'thermal', 'systems'];
export const FLIGHT = ['launch', 'cruise', 'arrival', 'science', 'home'];

export function finalScore() {
  const d = Lab.design();
  const r = rate(d);
  const design = avg(Object.values(r.axes));
  const tests = avg(TESTS.map((k) => Lab.s.tests[k] ?? 50));
  const flight = avg(FLIGHT.map((k) => Lab.s.flight[k] ?? 50));
  const total = design * 0.35 + tests * 0.15 + flight * 0.5;
  const stars = Math.max(0.5, Math.round((total / 20) * 2) / 2);
  const grade = total >= 92 ? 'S' : total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D';
  const quizRight = Object.values(Lab.s.quiz).filter((q) => q.ok && q.tries === 1).length;
  const points = Math.round(total * 100) + Lab.s.credits * 50 + quizRight * 25;
  // badges: things done especially well
  const badges = [];
  if (quizRight >= 18) badges.push('quizMaster');
  if ((Lab.s.flight.launch ?? 0) >= 90) badges.push('perfectLaunch');
  if ((Lab.s.flight.arrival ?? 0) >= 90) badges.push('smoothArrival');
  if ((Lab.s.flight.science ?? 0) >= 85) badges.push('scienceStar');
  if (avg(TESTS.map((k) => Lab.s.tests[k] ?? 0)) >= 85) badges.push('testPilot');
  if (Lab.s.credits >= 8 && design >= 75) badges.push('budgetBoss');
  if (design >= 90) badges.push('masterEngineer');
  return { d, r, design: Math.round(design), tests: Math.round(tests), flight: Math.round(flight), total: Math.round(total), stars, grade, points, badges, quizRight };
}
