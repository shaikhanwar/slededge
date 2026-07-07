// app.js — hash router + page renderers for the SLED Use Case Library.
import {
  loadData, db, industry, industryName, pattern, patternName,
  useCasesForIndustry, useCasesForPattern, acceleratorsForPattern, activeUseCases,
  hasOwner, ownerDisplay, programMetrics, industryCounts,
  isSharePointMode, isLocalMode, persist, persistSoon, resetDemo, onPersist, reindex
} from './data.js';
import {
  buildIndustry, buildUseCase, buildEvent, buildPattern, buildAccelerator, nextId
} from './factory.js';
import {
  listDocuments, uploadDocument, deleteDocument,
  isAllowed, isImage, safeName, fmtSize, extOf, ALLOWED_EXT, MAX_BYTES
} from './docs.js';
import {
  loadIdentity, identity, role, roleLabel, currentUserName, setDemoRole, ROLES,
  canCreate, canEdit, canUpload, canManageTaxonomy, canManageEvents, isViewer
} from './auth.js';
import {
  VERTICALS, SEGMENTS, SOLUTION_PLAYS, STATUSES, TAGS, REPEATABILITY,
  ACCELERATOR_TYPES, EVENT_STATUS, EVENT_FORMAT, STATUS_CLASS
} from './constants.js';

const app = document.getElementById('app');

// ---- DOM helpers ----------------------------------------------------------
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const nowIso = () => new Date().toISOString();
const mount = (node) => { app.replaceChildren(node); window.scrollTo(0, 0); };

function toast(msg) {
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---- Save-failure banner --------------------------------------------------
function showSaveError(err) {
  const reason = err && err.message ? err.message : 'Unknown error.';
  let bar = document.getElementById('saveError');
  if (!bar) {
    bar = el(`<div id="saveError" class="save-error" role="alert">
      <span class="save-error-icon">⚠</span>
      <span class="save-error-text"></span>
      <span class="save-error-actions">
        <button class="btn tiny" id="saveRetry">Retry save</button>
        <button class="btn tiny ghost" id="saveDismiss">Dismiss</button>
      </span></div>`);
    document.body.appendChild(bar);
    bar.querySelector('#saveRetry').onclick = async () => {
      bar.querySelector('.save-error-text').textContent = 'Retrying…';
      if (await persist()) toast('Saved.');
    };
    bar.querySelector('#saveDismiss').onclick = () => bar.remove();
  }
  bar.querySelector('.save-error-text').innerHTML =
    `<strong>Changes not saved.</strong> ${esc(reason)} Your edits are still on screen — fix the issue and click Retry.`;
}
onPersist((ok, err) => { if (ok) document.getElementById('saveError')?.remove(); else showSaveError(err); });

const savedNote = () => isSharePointMode() ? 'Saved to SharePoint.' : 'Saved (demo — stored in this browser).';

// ---- Choice / form helpers ------------------------------------------------
const opts = (values, selected) => values.map(v =>
  `<option value="${esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${esc(v)}</option>`).join('');
const industryOptions = (selected) => `<option value="">— Select —</option>` +
  db.industries.filter(i => i.recordStatus !== 'Archived')
    .map(i => `<option value="${esc(i.id)}"${i.id === selected ? ' selected' : ''}>${esc(i.name)}${i.segment ? ' · ' + esc(i.segment) : ''}</option>`).join('');
const patternOptions = (selected) => `<option value="">— None —</option>` +
  db.patterns.filter(p => p.recordStatus !== 'Archived')
    .map(p => `<option value="${esc(p.id)}"${p.id === selected ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

const statusBadge = (status) => `<span class="badge ${STATUS_CLASS[status] || 'draft'}">${esc(status || 'Draft')}</span>`;
const csv = (a) => (Array.isArray(a) ? a : []).join(', ');
const tagChips = (a) => (Array.isArray(a) ? a : []).map(t => `<span class="chip">${esc(t)}</span>`).join(' ');
const val = (form, name) => { const f = form.querySelector(`[name="${name}"]`); return f ? f.value.trim() : ''; };
const checked = (form, name) => { const f = form.querySelector(`[name="${name}"]`); return !!(f && f.checked); };

// ---- Audit ----------------------------------------------------------------
const titleOf = (rec) => rec.title || rec.name || rec.recordTitle || rec.id;
function logAudit(rec, type, action, summary) {
  db.audit.push({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recordId: rec.id, recordType: type, recordTitle: titleOf(rec),
    action, summary: summary || '', by: currentUserName(), at: nowIso()
  });
}
function stampCreate(rec, type) {
  rec.createdBy = currentUserName(); rec.createdAt = nowIso();
  rec.modifiedBy = currentUserName(); rec.modifiedAt = rec.createdAt;
  logAudit(rec, type, 'Created', `${type} created.`);
}
function stampEdit(rec, type, summary) {
  rec.modifiedBy = currentUserName(); rec.modifiedAt = nowIso();
  logAudit(rec, type, 'Updated', summary || `${type} updated.`);
}
function archiveRecord(rec, type) {
  rec.recordStatus = 'Archived'; rec.modifiedBy = currentUserName(); rec.modifiedAt = nowIso();
  logAudit(rec, type, 'Archived', `${type} archived.`);
}
function restoreRecord(rec, type) {
  rec.recordStatus = 'Active'; rec.modifiedBy = currentUserName(); rec.modifiedAt = nowIso();
  logAudit(rec, type, 'Restored', `${type} restored.`);
}
const auditFor = (recordId) => db.audit.filter(a => a.recordId === recordId).sort((a, b) => (a.at < b.at ? 1 : -1));
const actionTone = (a) => ({ Created: 'good', Updated: 'info', Archived: 'warn', Restored: 'info', Deleted: 'danger' }[a] || '');

// ---- Modal ----------------------------------------------------------------
function openModal(title, bodyHtml, wide) {
  const overlay = el(`<div class="modal-overlay"><div class="modal-card${wide ? ' wide' : ''}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" data-cancel>✕</button></div>
    <div class="modal-body">${bodyHtml}</div></div></div>`);
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-cancel]')) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}
function openAuditModal(recordId) {
  const rec = db.byId[recordId] || db.audit.find(a => a.recordId === recordId) || {};
  const entries = auditFor(recordId);
  const rows = entries.length ? entries.map(e => `<tr>
      <td>${esc(new Date(e.at).toLocaleString())}</td>
      <td><span class="chip ${actionTone(e.action)}">${esc(e.action)}</span></td>
      <td>${esc(e.by)}</td><td>${esc(e.summary)}</td></tr>`).join('')
    : `<tr><td colspan="4" class="dim">No history recorded.</td></tr>`;
  openModal('Record history', `
    <div class="audit-meta">
      <div><span class="audit-k">Created by</span>${esc(rec.createdBy || '—')}</div>
      <div><span class="audit-k">Created</span>${rec.createdAt ? esc(new Date(rec.createdAt).toLocaleString()) : '—'}</div>
      <div><span class="audit-k">Modified by</span>${esc(rec.modifiedBy || '—')}</div>
      <div><span class="audit-k">Modified</span>${rec.modifiedAt ? esc(new Date(rec.modifiedAt).toLocaleString()) : '—'}</div>
    </div>
    <p class="hint">In SharePoint these map to Created / Created By / Modified / Modified By plus version history.</p>
    <div class="tbl-scroll"><table class="tbl audit-tbl"><thead><tr><th>When</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`, true);
}

// ---- Tab wiring (detail pages) --------------------------------------------
function wireTabs(scope) {
  const btns = [...scope.querySelectorAll('.tabs button[data-tab]')];
  const panels = [...scope.querySelectorAll('[data-panel]')];
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.toggle('active', x === b));
    panels.forEach(p => p.classList.toggle('hide', p.dataset.panel !== b.dataset.tab));
  }));
}

// =====================================================================
// PAGES
// =====================================================================

function pageHome() {
  const m = programMetrics();
  const recent = activeUseCases().slice().sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1)).slice(0, 6);
  const upcoming = db.events.filter(e => e.recordStatus !== 'Archived').slice()
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1)).slice(0, 4);
  const node = el(`<div>
    <div class="page-head"><h1>SLED Use Case Library</h1>
      <p>Capture, browse and reuse proven SLED Use Cases</p></div>
    <div class="grid cols-4" style="margin-bottom:18px">
      <div class="kpi"><div class="num">${m.useCases}</div><div class="lbl">Use cases</div></div>
      <div class="kpi good"><div class="num">${m.published}</div><div class="lbl">Published</div></div>
      <div class="kpi"><div class="num">${m.inReview}</div><div class="lbl">In review</div></div>
      <div class="kpi"><div class="num">${m.industries}</div><div class="lbl">Industries</div></div>
    </div>
    <div class="detail-grid">
      <div>
        <h2 class="sec-h">Recently updated use cases</h2>
        <div class="grid cols-2" id="recentUc"></div>
      </div>
      <div>
        <div class="card quick-actions">
          <h3>Quick actions</h3>
          <ul class="numbered-links">
            ${canCreate('useCase') ? '<li><a href="#/register/usecase"><span class="n">1</span> Register a use case</a></li>' : ''}
            ${canManageTaxonomy() ? '<li><a href="#/register/industry"><span class="n">2</span> Register an industry</a></li>' : ''}
            ${canManageEvents() ? '<li><a href="#/register/event"><span class="n">3</span> Add an event</a></li>' : ''}
            ${canManageTaxonomy() ? '<li><a href="#/register/pattern"><span class="n">4</span> Define a pattern</a></li>' : ''}
            ${isViewer() ? '<li class="dim tiny" style="padding:8px 2px">You have read-only access. Browse the catalog using the menu above.</li>' : ''}
          </ul>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>Upcoming events</h3>
          <div class="stack-sm" style="margin-top:8px">${upcoming.length ? upcoming.map(e =>
            `<div class="tiny"><strong>${esc(e.title)}</strong><br><span class="dim">${fmtDate(e.startDate)} · ${esc(e.status)}</span></div>`).join('')
            : '<span class="dim tiny">No events yet.</span>'}</div>
        </div>
      </div>
    </div></div>`);
  const rc = node.querySelector('#recentUc');
  if (recent.length) recent.forEach(uc => rc.appendChild(ucCard(uc)));
  else rc.appendChild(el('<span class="dim">No use cases yet. Use “+ Register” to add one.</span>'));
  return node;
}

// ---- Use case card --------------------------------------------------------
function ucCard(uc) {
  const node = el(`<div class="card hover uc-card">
    <div class="uc-top"><h3>${esc(uc.title)}</h3>${statusBadge(uc.status)}</div>
    <div class="uc-meta">${esc(industryName(uc.industryId))}${uc.segment ? ' · ' + esc(uc.segment) : ''}</div>
    <div class="tag-row">${tagChips((uc.tags || []).slice(0, 4))}</div>
    <div class="tiny dim">${hasOwner(uc) ? '👤 ' + esc(ownerDisplay(uc)) : ''}</div>
  </div>`);
  node.addEventListener('click', () => { location.hash = `#/usecase/${uc.id}`; });
  return node;
}

// ---- Use cases browse -----------------------------------------------------
const ucFilter = { industry: '', segment: '', solutionPlay: '', status: '', tag: '', search: '' };
function filteredUseCases() {
  let list = activeUseCases();
  if (ucFilter.industry) list = list.filter(u => u.industryId === ucFilter.industry);
  if (ucFilter.segment) list = list.filter(u => u.segment === ucFilter.segment);
  if (ucFilter.solutionPlay) list = list.filter(u => u.solutionPlay === ucFilter.solutionPlay);
  if (ucFilter.status) list = list.filter(u => u.status === ucFilter.status);
  if (ucFilter.tag) list = list.filter(u => (u.tags || []).includes(ucFilter.tag));
  if (ucFilter.search) {
    const q = ucFilter.search.toLowerCase();
    list = list.filter(u => [u.title, u.businessProblem, u.proposedSolution, csv(u.tags), csv(u.services)]
      .join(' ').toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.title.localeCompare(b.title));
}
function pageUseCases() {
  const industryOpts = `<option value="">All</option>` +
    db.industries.filter(i => i.recordStatus !== 'Archived').map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');
  const node = el(`<div>
    <div class="page-head spread"><div><h1>Use Cases</h1><p>Browse and filter the SLED Use Case</p></div>
      ${canCreate('useCase') ? '<a class="btn primary" href="#/register/usecase">+ Register a use case</a>' : ''}</div>
    <div class="filterbar">
      <div class="filter-fields">
        <label class="filter-field"><span>Industry</span><select class="select" id="fIndustry">${industryOpts}</select></label>
        <label class="filter-field"><span>Segment</span><select class="select" id="fSegment"><option value="">All</option>${opts(SEGMENTS, '')}</select></label>
        <label class="filter-field"><span>Solution Play</span><select class="select" id="fPlay"><option value="">All</option>${opts(SOLUTION_PLAYS, '')}</select></label>
        <label class="filter-field"><span>Status</span><select class="select" id="fStatus"><option value="">All</option>${opts(STATUSES, '')}</select></label>
        <label class="filter-field"><span>Tags</span><select class="select" id="fTag"><option value="">All</option>${opts(TAGS, '')}</select></label>
        <label class="filter-field"><span>Search text</span><input id="ucSearch" placeholder="Search title, problem, solution…" value="${esc(ucFilter.search)}"></label>
      </div>
      <div class="filter-foot"><button class="btn tiny ghost" id="fClear">Clear filters</button><span class="filter-count" id="ucCount"></span></div>
    </div>
    <div class="grid cols-3" id="ucResults"></div></div>`);
  const results = node.querySelector('#ucResults');
  const count = node.querySelector('#ucCount');
  const render = () => {
    const list = filteredUseCases();
    results.replaceChildren(...(list.length ? list.map(ucCard) : [el('<span class="dim">No matching use cases.</span>')]));
    count.textContent = `COUNT: ${list.length}`;
  };
  const fIndustry = node.querySelector('#fIndustry');
  const fSegment = node.querySelector('#fSegment');
  const fPlay = node.querySelector('#fPlay');
  const fStatus = node.querySelector('#fStatus');
  const fTag = node.querySelector('#fTag');
  const fSearch = node.querySelector('#ucSearch');
  fIndustry.value = ucFilter.industry; fSegment.value = ucFilter.segment; fPlay.value = ucFilter.solutionPlay;
  fStatus.value = ucFilter.status; fTag.value = ucFilter.tag;
  fIndustry.addEventListener('change', e => { ucFilter.industry = e.target.value; render(); });
  fSegment.addEventListener('change', e => { ucFilter.segment = e.target.value; render(); });
  fPlay.addEventListener('change', e => { ucFilter.solutionPlay = e.target.value; render(); });
  fStatus.addEventListener('change', e => { ucFilter.status = e.target.value; render(); });
  fTag.addEventListener('change', e => { ucFilter.tag = e.target.value; render(); });
  fSearch.addEventListener('input', e => { ucFilter.search = e.target.value; render(); });
  node.querySelector('#fClear').addEventListener('click', () => {
    Object.assign(ucFilter, { industry: '', segment: '', solutionPlay: '', status: '', tag: '', search: '' });
    fIndustry.value = ''; fSegment.value = ''; fPlay.value = ''; fStatus.value = ''; fTag.value = ''; fSearch.value = '';
    render();
  });
  render();
  return node;
}

// ---- Use case detail ------------------------------------------------------
function field(dt, dd) { return dd ? `<dt>${esc(dt)}</dt><dd>${dd}</dd>` : ''; }
function pageUseCase(id) {
  const uc = db.byId[id];
  if (!uc || uc.recordStatus === 'Archived') return notFound('Use case');
  const editable = canEdit('useCase', uc);
  const link = (url) => url && url !== '#' ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>` : '<span class="dim">—</span>';
  const node = el(`<div>
    <div class="breadcrumb"><a href="#/usecases">Use Cases</a> / ${esc(uc.id)}</div>
    <div class="hero">
      <div class="spread"><h1>${esc(uc.title)}</h1>${statusBadge(uc.status)}</div>
      <div class="hero-meta">
        <span>🏛 ${esc(industryName(uc.industryId))}</span>
        ${uc.segment ? `<span>📍 ${esc(uc.segment)}</span>` : ''}
        ${uc.solutionPlay ? `<span>🎯 ${esc(uc.solutionPlay)}</span>` : ''}
      </div>
      <div class="tag-row">${tagChips(uc.tags)}</div>
      <div class="record-actions" style="margin-top:12px">
        ${editable ? '<button class="btn" data-edit>Edit</button>' : ''}
        <button class="btn ghost" data-audit>History</button>
        ${editable ? '<button class="btn danger" data-archive>Archive</button>' : ''}
      </div>
    </div>
    <div class="tabs">
      <button data-tab="overview" class="active">Overview</button>
      <button data-tab="tech">Solution &amp; Tech</button>
      <button data-tab="value">Value &amp; Impact</button>
      <button data-tab="artifacts">Artifacts</button>
    </div>
    <div data-panel="overview"><div class="card"><dl class="fields">
      ${field('Industry', esc(industryName(uc.industryId)))}
      ${field('Segment', esc(uc.segment))}
      ${field('Owner', hasOwner(uc) ? esc(ownerDisplay(uc)) : '<span class="dim">—</span>')}
      ${field('Business problem', esc(uc.businessProblem))}
      ${field('Current process', esc(uc.currentProcess))}
      ${field('Challenge summary', esc(uc.challengeSummary))}
      ${field('Proposed solution', esc(uc.proposedSolution))}
      ${field('Beneficiaries', esc(uc.beneficiaries))}
      ${field('Tags', tagChips(uc.tags))}
    </dl></div></div>
    <div data-panel="tech" class="hide"><div class="card"><dl class="fields">
      ${field('Solution play', esc(uc.solutionPlay))}
      ${field('Components', esc(csv(uc.components)))}
      ${field('Copilot role', esc(uc.copilotRole))}
      ${field('Azure / M365 services', esc(csv(uc.services)))}
      ${field('Pattern', uc.patternId ? `<a href="#/pattern/${esc(uc.patternId)}">${esc(patternName(uc.patternId))}</a>` : '')}
      ${field('Data dependencies', esc(uc.dataDependencies))}
      ${field('Compliance', esc(uc.compliance))}
      ${field('Risks', esc(uc.risks))}
    </dl></div></div>
    <div data-panel="value" class="hide"><div class="card"><dl class="fields">
      ${field('Business value', esc(uc.businessValue))}
      ${field('Estimated impact', esc(uc.estimatedImpact))}
      ${field('Impact metric', esc(uc.impactMetric))}
      ${field('Feasibility', esc(uc.feasibility))}
      ${field('Reusability', esc(uc.reusability))}
    </dl></div></div>
    <div data-panel="artifacts" class="hide"><div class="card">
      ${solutionArchSection({ readOnly: !editable })}
      <dl class="fields" style="margin-top:16px">
        ${field('Repo', link(uc.repoUrl))}
      </dl>
    </div></div>
  </div>`);
  wireTabs(node);
  if (editable) {
    node.querySelector('[data-edit]').addEventListener('click', () => openEditUseCase(uc.id));
    node.querySelector('[data-archive]').addEventListener('click', () => {
      if (!confirm('Archive this use case? It can be restored from the Audit page.')) return;
      archiveRecord(uc, 'Use case'); persistSoon(); toast('Use case archived.'); location.hash = '#/usecases';
    });
  }
  node.querySelector('[data-audit]').addEventListener('click', () => openAuditModal(uc.id));
  wireDocs(node.querySelector('[data-docs]'), uc.id, { readOnly: !editable });
  return node;
}

// ---- Solution Architecture (uploader for use cases & patterns) ------------
// Reusable section markup. `staged` = create-form mode (hold files in memory
// until the record exists), otherwise live mode (upload straight to the record).
function solutionArchSection({ staged = false, readOnly = false } = {}) {
  return `<div class="docs" data-docs>
    <div class="docs-head">
      <h3>Solution Architecture</h3>
      <p class="muted tiny">Diagrams, decks and specs${staged ? ' to attach when this is created' : ''}.${readOnly ? '' : ` Allowed: ${ALLOWED_EXT.join(', ')} · up to ${fmtSize(MAX_BYTES)}.`}</p>
    </div>
    ${readOnly ? '' : `<label class="docs-drop" data-drop>
      <input type="file" data-file multiple accept="${ALLOWED_EXT.map(e => '.' + e).join(',')}" hidden>
      <span class="docs-drop-icon">⬆</span>
      <span>Drop files here or <strong>browse</strong></span>
    </label>`}
    <div class="docs-grid" data-doclist></div>
  </div>`;
}

function vetFiles(files) {
  const ok = [], rejected = [];
  for (const file of Array.from(files || [])) {
    if (!isAllowed(file.name)) rejected.push(`${file.name} (type .${extOf(file.name) || '?'} not allowed)`);
    else if (file.size > MAX_BYTES) rejected.push(`${file.name} (over ${fmtSize(MAX_BYTES)})`);
    else ok.push(file);
  }
  return { ok, rejected };
}

// Live mode: upload immediately to an existing record's folder.
function wireDocs(section, recordId, { readOnly = false } = {}) {
  if (!section) return;
  const drop = section.querySelector('[data-drop]');
  const input = section.querySelector('[data-file]');
  const listEl = section.querySelector('[data-doclist]');

  async function refresh() {
    try {
      const docs = await listDocuments(recordId);
      renderDocTiles(listEl, docs.map(normalizeStored), { readOnly, onRemove: async (d) => {
        if (!confirm(`Remove "${d.name}"?`)) return false;
        try { await deleteDocument(d._doc); toast('Removed.'); return true; }
        catch (err) { toast(`Couldn't remove: ${err.message}`); return false; }
      }, refresh });
    } catch (err) {
      listEl.innerHTML = `<div class="dim tiny" style="padding:8px 2px">Couldn't load: ${esc(err.message)}</div>`;
    }
  }
  if (readOnly) { refresh(); return; }
  async function handle(files) {
    const { ok, rejected } = vetFiles(files);
    let n = 0;
    for (const file of ok) {
      try { await uploadDocument(recordId, file); n++; }
      catch (err) { rejected.push(`${file.name} (${err.message})`); }
    }
    if (n) toast(`${n} file${n > 1 ? 's' : ''} uploaded.`);
    if (rejected.length) toast(`Skipped: ${rejected.join('; ')}`);
    await refresh();
  }
  wireDropZone(drop, input, handle);
  refresh();
}

// Staged mode (create forms): hold File objects until the record is saved.
// Returns { files } so the caller can flush them after creating the record.
function wireDocsStaged(section) {
  const staged = [];
  if (!section) return { files: () => staged };
  const drop = section.querySelector('[data-drop]');
  const input = section.querySelector('[data-file]');
  const listEl = section.querySelector('[data-doclist]');

  function render() {
    renderDocTiles(listEl, staged.map(normalizeStaged), { onRemove: (d) => {
      const i = staged.indexOf(d._file);
      if (i >= 0) { URL.revokeObjectURL(d.href); staged.splice(i, 1); }
      return true;
    }, refresh: render });
  }
  function handle(files) {
    const { ok, rejected } = vetFiles(files);
    ok.forEach(f => staged.push(f));
    if (rejected.length) toast(`Skipped: ${rejected.join('; ')}`);
    render();
  }
  wireDropZone(drop, input, handle);
  render();
  return { files: () => staged };
}

// Upload any staged files to a freshly-created record. Best-effort.
async function flushStagedDocs(recordId, getFiles) {
  const files = (getFiles && getFiles()) || [];
  for (const file of files) {
    try { await uploadDocument(recordId, file); }
    catch (err) { toast(`Couldn't upload ${file.name}: ${err.message}`); }
  }
}

function wireDropZone(drop, input, handle) {
  input.addEventListener('change', () => { handle(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer) handle(e.dataTransfer.files); });
}

// Normalize stored docs / staged files to one tile shape.
function normalizeStored(doc) {
  return { name: doc.name, size: doc.size, href: doc.href, image: isImage(doc.name), _doc: doc };
}
function normalizeStaged(file) {
  return { name: file.name, size: file.size, href: URL.createObjectURL(file), image: isImage(file.name), _file: file };
}

function docIcon(name) {
  const e = extOf(name);
  if (['ppt', 'pptx'].includes(e)) return '📊';
  if (e === 'pdf') return '📄';
  if (['doc', 'docx'].includes(e)) return '📝';
  if (['xls', 'xlsx'].includes(e)) return '📈';
  if (['vsd', 'vsdx'].includes(e)) return '📐';
  return '📎';
}

// Tile grid with image thumbnails (or a big icon for non-images).
function renderDocTiles(listEl, docs, { onRemove, refresh, readOnly = false }) {
  if (!docs.length) {
    listEl.innerHTML = `<div class="dim tiny" style="padding:8px 2px;grid-column:1/-1">No files yet.</div>`;
    return;
  }
  listEl.innerHTML = docs.map((d, i) => `
    <figure class="doctile" data-i="${i}">
      <a class="doctile-thumb" href="${esc(d.href)}" target="_blank" rel="noopener" title="Open ${esc(d.name)}">
        ${d.image
          ? `<img src="${esc(d.href)}" alt="${esc(d.name)}" loading="lazy">`
          : `<span class="doctile-icon">${docIcon(d.name)}</span><span class="doctile-ext">.${esc(extOf(d.name))}</span>`}
      </a>
      <figcaption class="doctile-cap">
        <a class="doctile-name" href="${esc(d.href)}" target="_blank" rel="noopener" download="${esc(d.name)}" title="${esc(d.name)}">${esc(d.name)}</a>
        <span class="doctile-meta tiny dim">${esc(fmtSize(d.size))}</span>
      </figcaption>
      ${readOnly ? '' : `<button class="doctile-del" data-del="${i}" title="Remove" aria-label="Remove ${esc(d.name)}">✕</button>`}
    </figure>`).join('');
  if (readOnly) return;
  listEl.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const d = docs[Number(btn.dataset.del)];
      const removed = await onRemove(d);
      if (removed && refresh) refresh();
    });
  });
}

// ---- Industries -----------------------------------------------------------
function pageIndustries() {
  const counts = industryCounts();
  const manage = canManageTaxonomy();
  const list = db.industries.filter(i => i.recordStatus !== 'Archived').sort((a, b) => a.name.localeCompare(b.name));
  const node = el(`<div>
    <div class="page-head spread"><div><h1>Industries</h1><p>The SLED verticals</p></div>
      ${manage ? '<a class="btn primary" href="#/register/industry">+ Register an industry</a>' : ''}</div>
    <div class="grid cols-3" id="indGrid"></div></div>`);
  const grid = node.querySelector('#indGrid');
  if (!list.length) grid.appendChild(el('<span class="dim">No industries yet.</span>'));
  list.forEach(i => {
    const c = el(`<div class="card hover">
      <div class="spread"><h3>${esc(i.name)}</h3><span class="status-pill">${counts[i.id] || 0} use case${(counts[i.id] || 0) === 1 ? '' : 's'}</span></div>
      ${i.segment ? `<div class="uc-meta">${esc(i.segment)}</div>` : ''}
      <p class="tiny muted">${esc(i.description) || '<span class="dim">No description.</span>'}</p>
      <div class="record-actions" style="margin-top:6px">
        ${manage ? '<button class="btn tiny" data-edit>Edit</button>' : ''}
        <button class="btn tiny ghost" data-open>View use cases</button>
      </div></div>`);
    if (manage) c.querySelector('[data-edit]').addEventListener('click', () => openEditIndustry(i.id));
    c.querySelector('[data-open]').addEventListener('click', () => { location.hash = `#/industry/${i.id}`; });
    grid.appendChild(c);
  });
  return node;
}
function pageIndustry(id) {
  const ind = db.byId[id];
  if (!ind) return notFound('Industry');
  const manage = canManageTaxonomy();
  const ucs = useCasesForIndustry(id);
  const node = el(`<div>
    <div class="breadcrumb"><a href="#/industries">Industries</a> / ${esc(ind.name)}</div>
    <div class="hero"><h1>${esc(ind.name)}</h1>
      ${ind.segment ? `<div class="hero-meta"><span>📍 ${esc(ind.segment)}</span></div>` : ''}
      <p class="muted">${esc(ind.description)}</p>
      <div class="record-actions">${manage ? '<button class="btn" data-edit>Edit</button>' : ''}
        <button class="btn ghost" data-audit>History</button></div></div>
    <h2 class="sec-h">Use cases in this industry (${ucs.length})</h2>
    <div class="grid cols-3" id="indUc"></div></div>`);
  const g = node.querySelector('#indUc');
  if (ucs.length) ucs.forEach(uc => g.appendChild(ucCard(uc)));
  else g.appendChild(el('<span class="dim">No use cases mapped yet.</span>'));
  if (manage) node.querySelector('[data-edit]').addEventListener('click', () => openEditIndustry(ind.id));
  node.querySelector('[data-audit]').addEventListener('click', () => openAuditModal(ind.id));
  return node;
}

// ---- Events (standalone) --------------------------------------------------
function pageEvents() {
  const manage = canManageEvents();
  const list = db.events.filter(e => e.recordStatus !== 'Archived').slice()
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  const node = el(`<div>
    <div class="page-head spread"><div><h1>Events</h1><p>SLED events and engagements.</p></div>
      ${manage ? '<a class="btn primary" href="#/register/event">+ Add an event</a>' : ''}</div>
    <div class="grid cols-2" id="evGrid"></div></div>`);
  const grid = node.querySelector('#evGrid');
  if (!list.length) grid.appendChild(el('<span class="dim">No events yet.</span>'));
  list.forEach(e => {
    const d = e.startDate ? new Date(e.startDate + 'T00:00:00') : null;
    const c = el(`<div class="card"><div class="cal-item">
      <div class="cal-date"><div class="m">${d ? d.toLocaleDateString('en-US', { month: 'short' }) : '—'}</div>
        <div class="d">${d ? d.getDate() : '—'}</div><div class="y">${d ? d.getFullYear() : ''}</div></div>
      <div style="flex:1">
        <div class="spread"><h3>${esc(e.title)}</h3><span class="status-pill">${esc(e.status)}</span></div>
        <div class="uc-meta">${fmtDate(e.startDate)}${e.endDate ? ' – ' + fmtDate(e.endDate) : ''} · ${esc(e.format)}${e.location ? ' · ' + esc(e.location) : ''}</div>
        <div class="tag-row" style="margin-top:6px">${tagChips(e.themes)}</div>
        <div class="record-actions" style="margin-top:8px">
          ${manage ? '<button class="btn tiny" data-edit>Edit</button>' : ''}
          <button class="btn tiny ghost" data-audit>History</button>
          ${manage ? '<button class="btn tiny danger" data-archive>Archive</button>' : ''}</div>
      </div></div></div>`);
    if (manage) {
      c.querySelector('[data-edit]').addEventListener('click', () => openEditEvent(e.id));
      c.querySelector('[data-archive]').addEventListener('click', () => {
        if (!confirm('Archive this event?')) return;
        archiveRecord(e, 'Event'); persistSoon(); toast('Event archived.'); route();
      });
    }
    c.querySelector('[data-audit]').addEventListener('click', () => openAuditModal(e.id));
    grid.appendChild(c);
  });
  return node;
}

// ---- Patterns -------------------------------------------------------------
function pagePatterns() {
  const list = db.patterns.filter(p => p.recordStatus !== 'Archived').sort((a, b) => a.name.localeCompare(b.name));
  const node = el(`<div>
    <div class="page-head spread"><div><h1>Patterns</h1><p>Reusable solution patterns and accelerators.</p></div>
      ${canManageTaxonomy() ? '<a class="btn primary" href="#/register/pattern">+ Define a pattern</a>' : ''}</div>
    <div class="grid cols-3" id="patGrid"></div></div>`);
  const grid = node.querySelector('#patGrid');
  if (!list.length) grid.appendChild(el('<span class="dim">No patterns yet.</span>'));
  list.forEach(p => {
    const ucCount = useCasesForPattern(p.id).length;
    const accCount = acceleratorsForPattern(p.id).length;
    const c = el(`<div class="card hover">
      <div class="spread"><h3>${esc(p.name)}</h3><span class="chip ${p.repeatability === 'High' ? 'good' : ''}">${esc(p.repeatability)}</span></div>
      <p class="tiny muted">${esc(p.summary)}</p>
      <div class="tag-row">${tagChips(p.components)}</div>
      <div class="divider"></div>
      <div class="tiny dim">${ucCount} use case${ucCount === 1 ? '' : 's'} · ${accCount} accelerator${accCount === 1 ? '' : 's'}</div></div>`);
    c.addEventListener('click', () => { location.hash = `#/pattern/${p.id}`; });
    grid.appendChild(c);
  });
  return node;
}
function pagePattern(id) {
  const p = db.byId[id];
  if (!p) return notFound('Pattern');
  const editable = canManageTaxonomy();
  const ucs = useCasesForPattern(id);
  const accs = acceleratorsForPattern(id);
  const node = el(`<div>
    <div class="breadcrumb"><a href="#/patterns">Patterns</a> / ${esc(p.name)}</div>
    <div class="hero"><div class="spread"><h1>${esc(p.name)}</h1><span class="chip ${p.repeatability === 'High' ? 'good' : ''}">${esc(p.repeatability)} repeatability</span></div>
      <p class="muted">${esc(p.summary)}</p>
      ${p.solutionPlay ? `<div class="hero-meta"><span>🎯 ${esc(p.solutionPlay)}</span></div>` : ''}
      <div class="tag-row">${tagChips(p.components)}</div>
      <div class="record-actions" style="margin-top:10px">${editable ? '<button class="btn" data-edit>Edit</button>' : ''}
        <button class="btn ghost" data-audit>History</button></div></div>
    <div class="detail-grid">
      <div><h2 class="sec-h">Use cases applying this pattern (${ucs.length})</h2>
        <div class="grid cols-2" id="patUc"></div></div>
      <div><div class="card"><h3>Accelerators</h3>
        <div class="stack-sm" style="margin-top:8px">${accs.length ? accs.map(a =>
          `<div class="tiny"><strong>${esc(a.name)}</strong> <span class="dim">· ${esc(a.type)}</span><br>${a.url && a.url !== '#' ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a>` : '<span class="dim">no link</span>'}</div>`).join('')
          : '<span class="dim tiny">No accelerators linked.</span>'}</div></div></div>
    </div>
    <div class="card" style="margin-top:16px">${solutionArchSection({ readOnly: !editable })}</div></div>`);
  const g = node.querySelector('#patUc');
  if (ucs.length) ucs.forEach(uc => g.appendChild(ucCard(uc)));
  else g.appendChild(el('<span class="dim">None yet.</span>'));
  if (editable) node.querySelector('[data-edit]').addEventListener('click', () => openEditPattern(p.id));
  node.querySelector('[data-audit]').addEventListener('click', () => openAuditModal(p.id));
  wireDocs(node.querySelector('[data-docs]'), p.id, { readOnly: !editable });
  return node;
}

// ---- Audit ----------------------------------------------------------------
function pageAudit() {
  const archived = ['industries', 'useCases', 'events', 'patterns']
    .flatMap(k => db[k].filter(r => r.recordStatus === 'Archived').map(r => ({ r, type: k })));
  const log = db.audit.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const node = el(`<div>
    <div class="page-head"><h1>Audit</h1><p>Change history across every record. Archived items can be restored or permanently deleted.</p></div>
    <h2 class="sec-h">Archived records (${archived.length})</h2>
    <div class="tbl-scroll" style="margin-bottom:24px"><table class="tbl"><thead><tr><th>Record</th><th>Type</th><th>Modified</th><th></th></tr></thead>
      <tbody id="archBody"></tbody></table></div>
    <h2 class="sec-h">Change log</h2>
    <div class="searchbar"><input id="auditSearch" placeholder="Search the log…"></div>
    <div class="tbl-scroll"><table class="tbl"><thead><tr><th>When</th><th>Record</th><th>Type</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
      <tbody id="logBody"></tbody></table></div></div>`);
  const archBody = node.querySelector('#archBody');
  if (!archived.length) archBody.appendChild(el('<tr><td colspan="4" class="dim">No archived records.</td></tr>'));
  archived.forEach(({ r, type }) => {
    const tr = el(`<tr><td>${esc(titleOf(r))}</td><td>${esc(type)}</td><td>${r.modifiedAt ? esc(new Date(r.modifiedAt).toLocaleString()) : '—'}</td>
      <td class="record-actions"><button class="btn tiny" data-restore>Restore</button><button class="btn tiny danger" data-del>Delete</button></td></tr>`);
    tr.querySelector('[data-restore]').addEventListener('click', () => { restoreRecord(r, 'Record'); persistSoon(); route(); });
    tr.querySelector('[data-del]').addEventListener('click', () => {
      if (!confirm('Permanently delete this record? This cannot be undone.')) return;
      const map = { industries: 'industries', useCases: 'useCases', events: 'events', patterns: 'patterns' };
      const coll = db[map[type]]; const i = coll.indexOf(r); if (i >= 0) coll.splice(i, 1);
      logAudit(r, 'Record', 'Deleted', 'Permanently deleted.'); reindex(); persistSoon(); route();
    });
    archBody.appendChild(tr);
  });
  const logBody = node.querySelector('#logBody');
  const renderLog = (q) => {
    const rows = log.filter(e => !q || [e.recordTitle, e.summary, e.by, e.recordId, e.action].join(' ').toLowerCase().includes(q));
    logBody.replaceChildren(...(rows.length ? rows.map(e => el(`<tr>
      <td>${esc(new Date(e.at).toLocaleString())}</td>
      <td>${db.byId[e.recordId] ? `<a href="#/${routeFor(e.recordType)}/${esc(e.recordId)}">${esc(e.recordTitle)}</a>` : esc(e.recordTitle)}</td>
      <td>${esc(e.recordType)}</td><td><span class="chip ${actionTone(e.action)}">${esc(e.action)}</span></td>
      <td>${esc(e.by)}</td><td>${esc(e.summary)}</td></tr>`)) : [el('<tr><td colspan="6" class="dim">No log entries.</td></tr>')]));
  };
  node.querySelector('#auditSearch').addEventListener('input', e => renderLog(e.target.value.toLowerCase()));
  renderLog('');
  return node;
}
const routeFor = (type) => ({ 'Use case': 'usecase', 'Industry': 'industry', 'Pattern': 'pattern' }[type] || 'usecase');

// ---- About ----------------------------------------------------------------
function pageAbout() {
  return el(`<div>
    <div class="page-head"><h1>About</h1><p>SLED Use Case Library</p></div>
    <div class="card" style="max-width:760px">
      <p>An internal Microsoft catalog of reusable use cases across the five SLED verticals: State &amp; Local Government, Public Safety &amp; Justice, Public Health &amp; Social Services, Transportation &amp; Urban Infrastructure, and Education.</p>
      <p>Adapted from the Hackathon Content Library: use cases map to an <strong>Industry</strong> (instead of an Agency), carry a lifecycle <strong>Status</strong> (Draft / In Review / Published), and name an <strong>Owner</strong>. Reusable <strong>Patterns</strong> and Solution accelerators and a full <strong>Audit</strong> trail are retained. Events are tracked standalone and are not linked to use cases.</p>
      <table class="tbl"><tbody>
        <tr><th>Front end</th><td>Vanilla JS single-page app (hash router, no build step)</td></tr>
        <tr><th>Data model</th><td>Industries · Use Cases · Events · Patterns · Accelerators · Audit log</td></tr>
        <tr><th>Persistence</th><td>SharePoint Lists when hosted; local browser storage for demo</td></tr>
        <tr><th>Hosting</th><td>SharePoint Online (SiteAssets) — portable across sites</td></tr>
      </tbody></table>
    </div></div>`);
}

function notFound(what) {
  return el(`<div class="page-head"><h1>${esc(what)} not found</h1><p><a href="#/home">Back to home</a></p></div>`);
}

// Shown when a viewer/contributor opens a page (or types a URL) they can't use.
function permDenied(action) {
  return el(`<div><div class="page-head"><h1>Not available</h1>
    <p>You don't have permission to ${esc(action)}. You're signed in as <strong>${esc(roleLabel())}</strong>.
    Contact a catalog curator if you need access.</p></div>
    <p><a class="btn" href="#/home">Back to home</a></p></div>`);
}

// =====================================================================
// REGISTER HUB + FORMS
// =====================================================================
function pageRegister() {
  const steps = [
    ['1', 'Register a use case', 'Capture a SLED use case mapped to an industry.', '#/register/usecase', canCreate('useCase')],
    ['2', 'Register an industry', 'Add or adjust a SLED vertical.', '#/register/industry', canManageTaxonomy()],
    ['3', 'Add an event', 'Track a SLED event (standalone).', '#/register/event', canManageEvents()],
    ['4', 'Reusable pattern / Solution accelerator', 'Define a repeatable solution pattern.', '#/register/pattern', canManageTaxonomy()]
  ].filter(s => s[4]);
  if (!steps.length) return permDenied('add content to the library');
  const node = el(`<div><div class="page-head"><h1>Register &amp; Capture</h1><p>Add content to the library.</p></div>
    <ul class="register-steps">${steps.map(([n, t, d, h]) => `<li data-go="${h}">
      <span class="step-n">${n}</span><span class="step-body"><strong>${esc(t)}</strong><span class="dim tiny">${esc(d)}</span></span>
      <span class="step-go">Open →</span></li>`).join('')}</ul></div>`);
  node.querySelectorAll('[data-go]').forEach(li => li.addEventListener('click', () => { location.hash = li.dataset.go; }));
  return node;
}

// ---- Reusable form fragments ----------------------------------------------
function useCaseFields(uc) {
  return `
  <div class="form-grid">
    <div class="form-field full"><label>Use case title <span class="req">*</span></label><input name="title" value="${esc(uc.title)}" required></div>
    <div class="form-field"><label>Industry <span class="req">*</span></label><select name="industryId" required>${industryOptions(uc.industryId)}</select></div>
    <div class="form-field"><label>Segment</label><select name="segment"><option value="">— Select —</option>${opts(SEGMENTS, uc.segment)}</select></div>
    <div class="form-field"><label>Status</label><select name="status">${opts(STATUSES, uc.status || 'Draft')}</select></div>
    <div class="form-field"><label>Solution play</label><select name="solutionPlay"><option value="">— Select —</option>${opts(SOLUTION_PLAYS, uc.solutionPlay)}</select></div>

    <div class="form-section full"><span class="form-section-title">Overview</span></div>
    <div class="form-field full"><label>Business problem <span class="req">*</span></label><textarea name="businessProblem" required>${esc(uc.businessProblem)}</textarea></div>
    <div class="form-field full"><label>Current process</label><textarea name="currentProcess">${esc(uc.currentProcess)}</textarea></div>
    <div class="form-field full"><label>Proposed solution <span class="req">*</span></label><textarea name="proposedSolution" required>${esc(uc.proposedSolution)}</textarea></div>
    <div class="form-field full"><label>Beneficiaries</label><input name="beneficiaries" value="${esc(uc.beneficiaries)}"></div>
    <div class="form-field full"><label>Tags <span class="hint">(comma-separated)</span></label><input name="tags" value="${esc(csv(uc.tags))}" placeholder="${esc(TAGS.slice(0, 3).join(', '))}…"></div>

    <div class="form-section full"><span class="form-section-title">Solution &amp; tech</span></div>
    <div class="form-field full"><label>Components <span class="hint">(comma-separated)</span></label><input name="components" value="${esc(csv(uc.components))}"></div>
    <div class="form-field"><label>Copilot role</label><input name="copilotRole" value="${esc(uc.copilotRole)}"></div>
    <div class="form-field"><label>Services <span class="hint">(comma-separated)</span></label><input name="services" value="${esc(csv(uc.services))}"></div>
    <div class="form-field"><label>Pattern</label><select name="patternId">${patternOptions(uc.patternId)}</select></div>
    <div class="form-field"><label>Data dependencies</label><input name="dataDependencies" value="${esc(uc.dataDependencies)}"></div>
    <div class="form-field full"><label>Compliance</label><textarea name="compliance">${esc(uc.compliance)}</textarea></div>
    <div class="form-field full"><label>Risks</label><textarea name="risks">${esc(uc.risks)}</textarea></div>

    <div class="form-section full"><span class="form-section-title">Value &amp; impact</span></div>
    <div class="form-field full"><label>Business value</label><textarea name="businessValue">${esc(uc.businessValue)}</textarea></div>
    <div class="form-field"><label>Estimated impact</label><input name="estimatedImpact" value="${esc(uc.estimatedImpact)}"></div>
    <div class="form-field"><label>Impact metric</label><input name="impactMetric" value="${esc(uc.impactMetric)}"></div>
    <div class="form-field"><label>Feasibility</label><input name="feasibility" value="${esc(uc.feasibility)}"></div>
    <div class="form-field"><label>Reusability</label><input name="reusability" value="${esc(uc.reusability)}"></div>

    <div class="form-section full"><span class="form-section-title">Owner &amp; artifacts</span></div>
    <div class="form-field"><label>Owner name</label><input name="ownerName" value="${esc(uc.ownerName)}"></div>
    <div class="form-field"><label>Owner email</label><input name="ownerEmail" type="email" value="${esc(uc.ownerEmail)}"></div>
    <div class="form-field"><label>Repo URL</label><input name="repoUrl" value="${esc(uc.repoUrl === '#' ? '' : uc.repoUrl)}"></div>
  </div>`;
}
function readUseCase(form, base) {
  return {
    ...base,
    title: val(form, 'title'), industryId: val(form, 'industryId'), segment: val(form, 'segment'),
    status: val(form, 'status'), solutionPlay: val(form, 'solutionPlay'),
    businessProblem: val(form, 'businessProblem'), currentProcess: val(form, 'currentProcess'),
    proposedSolution: val(form, 'proposedSolution'), beneficiaries: val(form, 'beneficiaries'),
    tags: val(form, 'tags'), components: val(form, 'components'), copilotRole: val(form, 'copilotRole'),
    services: val(form, 'services'), patternId: val(form, 'patternId') || null,
    dataDependencies: val(form, 'dataDependencies'), compliance: val(form, 'compliance'), risks: val(form, 'risks'),
    businessValue: val(form, 'businessValue'), estimatedImpact: val(form, 'estimatedImpact'),
    impactMetric: val(form, 'impactMetric'), feasibility: val(form, 'feasibility'), reusability: val(form, 'reusability'),
    ownerName: val(form, 'ownerName'), ownerEmail: val(form, 'ownerEmail'),
    referenceUrl: base.referenceUrl || '#', repoUrl: val(form, 'repoUrl') || '#'
  };
}

function pageRegisterUseCase() {
  if (!canCreate('useCase')) return permDenied('register use cases');
  const draft = buildUseCase({});
  const node = el(`<div><div class="page-head"><h1>Register a use case</h1><p>Capture a SLED use case mapped to an industry. ${esc(savedNote())}</p></div>
    <form class="card" id="ucForm">${useCaseFields(draft)}
      <div class="form-section">${solutionArchSection({ staged: true })}</div>
      <div class="modal-actions"><a class="btn ghost" href="#/usecases">Cancel</a><button class="btn primary" type="submit">Create use case</button></div></form></div>`);
  const form = node.querySelector('#ucForm');
  const staged = wireDocsStaged(form.querySelector('[data-docs]'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!val(form, 'industryId')) { toast('Please select an industry.'); return; }
    const uc = buildUseCase(readUseCase(form, {}));
    stampCreate(uc, 'Use case'); db.useCases.push(uc); reindex(); persistSoon();
    await flushStagedDocs(uc.id, staged.files);
    toast(`Use case created. ${savedNote()}`); location.hash = `#/usecase/${uc.id}`;
  });
  return node;
}
function openEditUseCase(id) {
  const uc = db.byId[id];
  const overlay = openModal('Edit use case', `<form class="modal-form" id="ucEdit">${useCaseFields(uc)}
    <div class="modal-actions"><button class="btn" type="button" data-cancel>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`, true);
  const form = overlay.querySelector('#ucEdit');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    Object.assign(uc, buildUseCase(readUseCase(form, uc)));
    stampEdit(uc, 'Use case'); reindex(); persistSoon(); overlay.remove(); toast(`Saved. ${savedNote()}`); route();
  });
}

// ---- Industry form --------------------------------------------------------
function industryFields(i) {
  return `<div class="form-grid">
    <div class="form-field full"><label>Industry name <span class="req">*</span></label>
      <input name="name" list="vertList" value="${esc(i.name)}" required placeholder="Pick a SLED vertical or type one">
      <datalist id="vertList">${VERTICALS.map(v => `<option value="${esc(v)}">`).join('')}</datalist></div>
    <div class="form-field full"><label>Segment</label><select name="segment"><option value="">— Select —</option>${opts(SEGMENTS, i.segment)}</select></div>
    <div class="form-field full"><label>Description</label><textarea name="description">${esc(i.description)}</textarea></div>
  </div>`;
}
const readIndustry = (form, base) => ({ ...base, name: val(form, 'name'), segment: val(form, 'segment'), description: val(form, 'description') });
function pageRegisterIndustry() {
  if (!canManageTaxonomy()) return permDenied('register industries');
  const node = el(`<div><div class="page-head"><h1>Register an industry</h1><p>Add or adjust a SLED vertical. ${esc(savedNote())}</p></div>
    <form class="card" id="indForm" style="max-width:680px">${industryFields(buildIndustry({}))}
      <div class="modal-actions"><a class="btn ghost" href="#/industries">Cancel</a><button class="btn primary" type="submit">Create industry</button></div></form>
    <h2 class="sec-h" style="margin-top:26px">Existing industries</h2><div class="grid cols-3" id="indList"></div></div>`);
  const form = node.querySelector('#indForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!val(form, 'name')) { toast('Name is required.'); return; }
    const ind = buildIndustry(readIndustry(form, {}));
    stampCreate(ind, 'Industry'); db.industries.push(ind); reindex(); persistSoon();
    toast(`Industry created. ${savedNote()}`); location.hash = '#/industries';
  });
  const listBox = node.querySelector('#indList');
  db.industries.filter(i => i.recordStatus !== 'Archived').forEach(i =>
    listBox.appendChild(el(`<div class="card tiny"><strong>${esc(i.name)}</strong>${i.segment ? '<br>' + esc(i.segment) : ''}</div>`)));
  return node;
}
function openEditIndustry(id) {
  const ind = db.byId[id];
  const overlay = openModal('Edit industry', `<form class="modal-form" id="indEdit">${industryFields(ind)}
    <div class="modal-actions"><button class="btn" type="button" data-cancel>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`);
  overlay.querySelector('#indEdit').addEventListener('submit', (e) => {
    e.preventDefault();
    Object.assign(ind, buildIndustry(readIndustry(overlay.querySelector('#indEdit'), ind)));
    stampEdit(ind, 'Industry'); reindex(); persistSoon(); overlay.remove(); toast(`Saved. ${savedNote()}`); route();
  });
}

// ---- Event form -----------------------------------------------------------
function eventFields(e) {
  return `<div class="form-grid">
    <div class="form-field full"><label>Event title <span class="req">*</span></label><input name="title" value="${esc(e.title)}" required></div>
    <div class="form-field"><label>Start date</label><input name="startDate" type="date" value="${esc(e.startDate)}"></div>
    <div class="form-field"><label>End date</label><input name="endDate" type="date" value="${esc(e.endDate)}"></div>
    <div class="form-field"><label>Status</label><select name="status">${opts(EVENT_STATUS, e.status)}</select></div>
    <div class="form-field"><label>Format</label><select name="format">${opts(EVENT_FORMAT, e.format)}</select></div>
    <div class="form-field full"><label>Location</label><input name="location" value="${esc(e.location)}"></div>
    <div class="form-field full"><label>Themes <span class="hint">(comma-separated)</span></label><input name="themes" value="${esc(csv(e.themes))}"></div>
    <div class="form-field full"><label>Organizers <span class="hint">(comma-separated)</span></label><input name="organizers" value="${esc(csv(e.organizers))}"></div>
    <div class="form-field full"><label>Registration URL</label><input name="registrationUrl" value="${esc(e.registrationUrl === '#' ? '' : e.registrationUrl)}"></div>
    <div class="form-field full"><label>Notes</label><textarea name="notes">${esc(e.notes)}</textarea></div>
  </div>`;
}
const readEvent = (form, base) => ({
  ...base, title: val(form, 'title'), startDate: val(form, 'startDate'), endDate: val(form, 'endDate'),
  status: val(form, 'status'), format: val(form, 'format'), location: val(form, 'location'),
  themes: val(form, 'themes'), organizers: val(form, 'organizers'),
  registrationUrl: val(form, 'registrationUrl') || '#', notes: val(form, 'notes')
});
function pageRegisterEvent() {
  if (!canManageEvents()) return permDenied('add events');
  const node = el(`<div><div class="page-head"><h1>Add an event</h1><p>Track a SLED event. ${esc(savedNote())}</p></div>
    <form class="card" id="evForm" style="max-width:760px">${eventFields(buildEvent({}))}
      <div class="modal-actions"><a class="btn ghost" href="#/events">Cancel</a><button class="btn primary" type="submit">Add event</button></div></form></div>`);
  const form = node.querySelector('#evForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!val(form, 'title')) { toast('Title is required.'); return; }
    const ev = buildEvent(readEvent(form, {}));
    stampCreate(ev, 'Event'); db.events.push(ev); reindex(); persistSoon();
    toast(`Event added. ${savedNote()}`); location.hash = '#/events';
  });
  return node;
}
function openEditEvent(id) {
  const ev = db.byId[id];
  const overlay = openModal('Edit event', `<form class="modal-form" id="evEdit">${eventFields(ev)}
    <div class="modal-actions"><button class="btn" type="button" data-cancel>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`, true);
  overlay.querySelector('#evEdit').addEventListener('submit', (e) => {
    e.preventDefault();
    Object.assign(ev, buildEvent(readEvent(overlay.querySelector('#evEdit'), ev)));
    stampEdit(ev, 'Event'); reindex(); persistSoon(); overlay.remove(); toast(`Saved. ${savedNote()}`); route();
  });
}

// ---- Pattern form ---------------------------------------------------------
function patternFields(p) {
  return `<div class="form-grid">
    <div class="form-field full"><label>Pattern name <span class="req">*</span></label><input name="name" value="${esc(p.name)}" required></div>
    <div class="form-field"><label>Repeatability</label><select name="repeatability">${opts(REPEATABILITY, p.repeatability)}</select></div>
    <div class="form-field"><label>Solution play</label><select name="solutionPlay"><option value="">— Select —</option>${opts(SOLUTION_PLAYS, p.solutionPlay)}</select></div>
    <div class="form-field full"><label>Summary <span class="req">*</span></label><textarea name="summary" required>${esc(p.summary)}</textarea></div>
    <div class="form-field full"><label>Components <span class="hint">(comma-separated)</span></label><input name="components" value="${esc(csv(p.components))}"></div>
  </div>`;
}
const readPattern = (form, base) => ({
  ...base, name: val(form, 'name'), repeatability: val(form, 'repeatability'),
  solutionPlay: val(form, 'solutionPlay'), summary: val(form, 'summary'), components: val(form, 'components')
});
function pageRegisterPattern() {
  if (!canManageTaxonomy()) return permDenied('manage patterns');
  const node = el(`<div><div class="page-head"><h1>Reusable pattern / Solution accelerator</h1><p>Define a repeatable solution pattern and link accelerators. ${esc(savedNote())}</p></div>
    <div class="grid cols-2">
      <form class="card" id="patForm"><h3>Define a pattern</h3>${patternFields(buildPattern({}))}
        <div class="form-section">${solutionArchSection({ staged: true })}</div>
        <div class="modal-actions"><button class="btn primary" type="submit">Create pattern</button></div></form>
      <form class="card" id="accForm"><h3>Add an accelerator</h3><div class="form-grid">
        <div class="form-field full"><label>Accelerator name <span class="req">*</span></label><input name="name" required></div>
        <div class="form-field"><label>Type</label><select name="type">${opts(ACCELERATOR_TYPES, '')}</select></div>
        <div class="form-field"><label>Pattern <span class="req">*</span></label><select name="patternId" required>${patternOptions('')}</select></div>
        <div class="form-field full"><label>URL</label><input name="url"></div>
      </div><div class="modal-actions"><button class="btn primary" type="submit">Add accelerator</button></div></form>
    </div>
    <h2 class="sec-h" style="margin-top:24px">Pattern library</h2><div class="grid cols-3" id="patList"></div></div>`);
  const staged = wireDocsStaged(node.querySelector('#patForm [data-docs]'));
  node.querySelector('#patForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (!val(form, 'name')) { toast('Name is required.'); return; }
    const p = buildPattern(readPattern(form, {}));
    stampCreate(p, 'Pattern'); db.patterns.push(p); reindex(); persistSoon();
    flushStagedDocs(p.id, staged.files).then(() => { toast(`Pattern created. ${savedNote()}`); route(); });
  });
  node.querySelector('#accForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (!val(form, 'name') || !val(form, 'patternId')) { toast('Name and pattern are required.'); return; }
    const a = buildAccelerator({ name: val(form, 'name'), type: val(form, 'type'), patternId: val(form, 'patternId'), url: val(form, 'url') || '#' });
    db.accelerators.push(a);
    const p = db.byId[a.patternId]; if (p) { p.acceleratorIds = [...(p.acceleratorIds || []), a.id]; stampEdit(p, 'Pattern', 'Accelerator linked.'); }
    reindex(); persistSoon(); toast(`Accelerator added. ${savedNote()}`); route();
  });
  const listBox = node.querySelector('#patList');
  const pats = db.patterns.filter(p => p.recordStatus !== 'Archived');
  if (!pats.length) listBox.appendChild(el('<span class="dim">No patterns yet.</span>'));
  pats.forEach(p => {
    const c = el(`<div class="card hover tiny"><strong>${esc(p.name)}</strong> <span class="chip ${p.repeatability === 'High' ? 'good' : ''}">${esc(p.repeatability)}</span>
      <p class="dim">${esc(p.summary)}</p></div>`);
    c.addEventListener('click', () => { location.hash = `#/pattern/${p.id}`; });
    listBox.appendChild(c);
  });
  return node;
}
function openEditPattern(id) {
  const p = db.byId[id];
  const overlay = openModal('Edit pattern', `<form class="modal-form" id="patEdit">${patternFields(p)}
    <div class="modal-actions"><button class="btn" type="button" data-cancel>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`);
  overlay.querySelector('#patEdit').addEventListener('submit', (e) => {
    e.preventDefault();
    Object.assign(p, buildPattern({ ...readPattern(overlay.querySelector('#patEdit'), p), acceleratorIds: p.acceleratorIds }));
    stampEdit(p, 'Pattern'); reindex(); persistSoon(); overlay.remove(); toast(`Saved. ${savedNote()}`); route();
  });
}

// =====================================================================
// ROUTER + CHROME
// =====================================================================
const ROUTES = {
  home: pageHome, usecases: pageUseCases, industries: pageIndustries, events: pageEvents,
  patterns: pagePatterns, audit: pageAudit, about: pageAbout,
  register: pageRegister
};
function route() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\//, '').split('/');
  const base = parts[0] || 'home';
  const sub = parts[1] || '';
  const id = parts.slice(1).join('/');
  let node;
  if (base === 'usecase') node = pageUseCase(id);
  else if (base === 'industry') node = pageIndustry(id);
  else if (base === 'pattern') node = pagePattern(id);
  else if (base === 'register' && sub === 'usecase') node = pageRegisterUseCase();
  else if (base === 'register' && sub === 'industry') node = pageRegisterIndustry();
  else if (base === 'register' && sub === 'event') node = pageRegisterEvent();
  else if (base === 'register' && sub === 'pattern') node = pageRegisterPattern();
  else node = (ROUTES[base] || pageHome)();
  mount(node);
  document.querySelectorAll('#mainnav a[data-route]').forEach(a =>
    a.classList.toggle('active', a.dataset.route === base || (base === 'register' && false)));
  closeRegisterMenu();
}

// Register dropdown
function closeRegisterMenu() { document.getElementById('registerMenu')?.classList.remove('open'); }
function wireChrome() {
  const menu = document.getElementById('registerMenu');
  const toggle = document.getElementById('registerToggle');
  if (toggle) toggle.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (menu && !menu.contains(e.target)) menu.classList.remove('open'); });
}

// Show/hide the Register menu items to match the signed-in user's role.
function applyChrome() {
  const menu = document.getElementById('registerMenu');
  if (!menu) return;
  const allowed = {
    '#/register/usecase': canCreate('useCase'),
    '#/register/industry': canManageTaxonomy(),
    '#/register/event': canManageEvents(),
    '#/register/pattern': canManageTaxonomy()
  };
  let any = false;
  menu.querySelectorAll('.nav-dd-panel a').forEach(a => {
    const href = a.getAttribute('href');
    if (href in allowed) { a.style.display = allowed[href] ? '' : 'none'; if (allowed[href]) any = true; }
  });
  menu.style.display = any ? '' : 'none';   // viewers get no Register button
}

// Mode bar (between header and main)
function renderModeBar() {
  document.getElementById('modeBar')?.remove();
  // On SharePoint the native suite bar already provides search + sign-in + identity,
  // so we show no status bar at all. A banner only appears if a save fails (see showSaveError).
  if (isSharePointMode()) return;
  const who = identity();
  const roleSwitcher = isLocalMode()
    ? `<label class="role-switch tiny">Preview as
        <select id="demoRole">${ROLES.map(r =>
          `<option value="${r}"${role() === r ? ' selected' : ''}>${r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select></label>`
    : '';
  const bar = el(`<div id="modeBar" class="csvbar">
    <span class="csvbar-tag">Demo</span>
    <span class="csvbar-status">Local demo — edits are saved in <code>this browser</code> only.</span>
    <span class="csvbar-identity tiny">👤 ${esc(who.name)} · <strong>${esc(roleLabel())}</strong></span>
    <span class="csvbar-actions">${roleSwitcher} <button class="btn tiny danger" id="resetDemo">Reset demo data</button></span>
  </div>`);
  document.querySelector('.topbar').after(bar);
  bar.querySelector('#demoRole')?.addEventListener('change', (e) => { setDemoRole(e.target.value); location.reload(); });
  bar.querySelector('#resetDemo')?.addEventListener('click', () => {
    if (!confirm('Reset to the seeded demo data? Your local edits will be cleared.')) return;
    resetDemo(); location.reload();
  });
}

// ---- Boot -----------------------------------------------------------------
window.addEventListener('hashchange', route);
loadData()
  .then(() => loadIdentity())
  .then(() => {
    wireChrome();
    applyChrome();
    renderModeBar();
    route();
  }).catch(err => {
    app.innerHTML = `<div class="alert-banner">Failed to load data: ${esc(err.message)}</div>`;
    console.error(err);
  });
