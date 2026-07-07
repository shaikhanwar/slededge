// data.js — in-memory db, load orchestration, lookup helpers, aggregate metrics
// and persistence. Mode is chosen from ?data= or whether the app is hosted in a
// SharePoint page.
//
//   ?data=local       force the local (seed/localStorage) backend
//   ?data=sharepoint  force the SharePoint backend
//   (default)         SharePoint when hosted on *.sharepoint.com, else local

import { inSharePointPage } from './spconfig.js';
import {
  loadLocal, saveLocal, resetLocal, loadSharePoint, saveSharePoint
} from './store.js';

export const db = {
  industries: [], useCases: [], events: [], patterns: [], accelerators: [], audit: [],
  byId: {}
};

let MODE = 'local'; // 'local' | 'sharepoint'
export const isSharePointMode = () => MODE === 'sharepoint';
export const isLocalMode = () => MODE === 'local';
export const isLiveMode = () => MODE === 'sharepoint';

function param(name) {
  const m = new RegExp('[?&]' + name + '=([^&]+)').exec(location.search);
  return m ? decodeURIComponent(m[1]) : '';
}

function reindex() {
  db.byId = {};
  for (const key of ['industries', 'useCases', 'events', 'patterns', 'accelerators']) {
    for (const r of db[key]) db.byId[r.id] = r;
  }
}

export async function loadData() {
  const forced = param('data');
  MODE = forced === 'sharepoint' ? 'sharepoint'
    : forced === 'local' ? 'local'
    : inSharePointPage() ? 'sharepoint' : 'local';

  let loaded;
  if (MODE === 'sharepoint') {
    loaded = await loadSharePoint();
  } else {
    loaded = await loadLocal();
  }
  Object.assign(db, loaded);
  reindex();
  return db;
}

// ---- Lookups --------------------------------------------------------------
export const industry = (id) => db.byId[id] || null;
export const industryName = (id) => (db.byId[id]?.name) || '—';
export const pattern = (id) => db.byId[id] || null;
export const patternName = (id) => (db.byId[id]?.name) || '—';

export const useCasesForIndustry = (industryId) =>
  db.useCases.filter(u => u.industryId === industryId && u.recordStatus !== 'Archived');
export const useCasesForPattern = (patternId) =>
  db.useCases.filter(u => u.patternId === patternId && u.recordStatus !== 'Archived');
export const acceleratorsForPattern = (patternId) =>
  db.accelerators.filter(a => a.patternId === patternId);

export const activeUseCases = () => db.useCases.filter(u => u.recordStatus !== 'Archived');

// ---- Owner helpers --------------------------------------------------------
export const hasOwner = (uc) => !!(uc.ownerName || uc.ownerEmail);
export const ownerDisplay = (uc) =>
  uc.ownerName ? (uc.ownerEmail ? `${uc.ownerName} <${uc.ownerEmail}>` : uc.ownerName) : (uc.ownerEmail || '');

// ---- Aggregate metrics ----------------------------------------------------
export function programMetrics() {
  const ucs = activeUseCases();
  return {
    useCases: ucs.length,
    industries: db.industries.filter(i => i.recordStatus !== 'Archived').length,
    published: ucs.filter(u => u.status === 'Published').length,
    inReview: ucs.filter(u => u.status === 'In Review').length,
    patterns: db.patterns.filter(p => p.recordStatus !== 'Archived').length,
    upcoming: db.events.filter(e => e.recordStatus !== 'Archived' && e.status !== 'Closed').length
  };
}

// Count of active use cases per industry (for the Industries page).
export function industryCounts() {
  const m = {};
  for (const u of activeUseCases()) m[u.industryId] = (m[u.industryId] || 0) + 1;
  return m;
}

// ---- Persistence ----------------------------------------------------------
const listeners = [];
export function onPersist(cb) { listeners.push(cb); }
function notify(ok, err) { listeners.forEach(l => { try { l(ok, err); } catch { /* ignore */ } }); }

export async function persist() {
  try {
    const ok = MODE === 'sharepoint' ? await saveSharePoint(db) : saveLocal(db);
    notify(ok, ok ? null : new Error('Save returned false.'));
    return ok;
  } catch (e) {
    notify(false, e);
    return false;
  }
}

let _t = null;
export function persistSoon() {
  clearTimeout(_t);
  _t = setTimeout(() => { persist(); }, 250);
}

export function resetDemo() {
  resetLocal();
}

export { reindex };
