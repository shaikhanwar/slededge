/* ===========================================================================
 * provision-sled-list-browser.js
 * ---------------------------------------------------------------------------
 * Creates the SIX SharePoint lists that back the SLED Use Case Library app:
 *   SLEDIndustries, SLEDUseCases, SLEDEvents, SLEDPatterns,
 *   SLEDAccelerators, SLEDAuditLog
 * …plus one document LIBRARY, SLEDSolutionArchitecture, that holds uploaded
 * architecture artifacts (one folder per use case, named by UseCaseId).
 * Every column is a plain Text ("Single line of text") or Note ("Multiple
 * lines of text") field — no Choice / Person / Number / Lookup — because the
 * app stores booleans as the text "Yes"/"No" and multi-values as "; "-joined
 * text, so a string-only mapping round-trips with zero type friction.
 *
 * Column INTERNAL names are NOT SLED-prefixed (IndustryId, BusinessProblem, …):
 * the app reads/writes them by those exact names. Only the LIST titles carry
 * the SLED prefix. The built-in Title column is reused as each list's name
 * field (and renamed for display).
 *
 * Runs entirely in the BROWSER's authenticated session — no PnP, no app
 * registration, no admin consent.
 *
 * HOW TO RUN
 *   1. Open the SharePoint SITE to provision into, e.g.
 *        https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibraryDEV
 *      (must be a SharePoint page so REST is same-origin).
 *   2. Press F12 -> Console.
 *   3. Paste this entire file and press Enter.
 *   4. Watch the log. Idempotent: existing lists/fields are skipped.
 *
 * Mirrors SLEDEdge/lists/sled-list-schema.json 1:1 and the app's column maps
 * in SLEDEdge/app/js/store.js (MAPS).
 * ======================================================================== */
(async () => {
  'use strict';

  // Resolve the current site (web) URL from the SharePoint page context.
  const site =
    (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl) ||
    location.origin;

  const log  = (...a) => console.log('%c[sled]', 'color:#0a7', ...a);
  const warn = (...a) => console.warn('[sled]', ...a);
  const err  = (...a) => console.error('[sled]', ...a);

  const VERBOSE = {
    'Accept': 'application/json;odata=verbose',
    'Content-Type': 'application/json;odata=verbose'
  };

  const xml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // Field schema builders (Text = single line, Note = multi-line).
  const T = (name, display) =>
    `<Field Type="Text" DisplayName="${xml(display)}" Name="${xml(name)}" MaxLength="255"/>`;
  const N = (name, display, lines = 6) =>
    `<Field Type="Note" DisplayName="${xml(display)}" Name="${xml(name)}" NumLines="${lines}" RichText="FALSE"/>`;

  // --- The six lists --------------------------------------------------------
  // Each column: [internalName, displayName, kind]  kind: 'Text' | 'Note'
  // The Title column is reused (renamed via titleAs) — NOT recreated here.
  const LISTS = [
    {
      title: 'SLEDIndustries', titleAs: 'Industry Name', index: ['IndustryId'],
      cols: [
        ['IndustryId', 'Industry Id', 'Text'],
        ['Segment', 'Segment', 'Text'],
        ['Description', 'Description', 'Note'],
        ['RecordStatus', 'Record Status', 'Text'],
        ['CreatedByName', 'Created By Name', 'Text'],
        ['CreatedAtText', 'Created At Text', 'Text'],
        ['ModifiedByName', 'Modified By Name', 'Text'],
        ['ModifiedAtText', 'Modified At Text', 'Text']
      ]
    },
    {
      title: 'SLEDUseCases', titleAs: 'Use Case Name',
      index: ['UseCaseId', 'IndustryId', 'UCStatus'],
      cols: [
        ['UseCaseId', 'Use Case Id', 'Text'],
        ['IndustryId', 'Industry Id', 'Text'],
        ['Segment', 'Segment', 'Text'],
        ['UCStatus', 'Status', 'Text'],
        ['BusinessProblem', 'Business Problem', 'Note'],
        ['CurrentProcess', 'Current Process', 'Note'],
        ['ChallengeSummary', 'Challenge Summary', 'Note'],
        ['ProposedSolution', 'Proposed Solution', 'Note'],
        ['Beneficiaries', 'Beneficiaries', 'Note'],
        ['Tags', 'Tags', 'Note'],
        ['Components', 'Components', 'Note'],
        ['CopilotRole', 'Copilot Role', 'Text'],
        ['Services', 'Services', 'Note'],
        ['SolutionPlay', 'Solution Play', 'Text'],
        ['PatternId', 'Pattern Id', 'Text'],
        ['DataDependencies', 'Data Dependencies', 'Note'],
        ['Compliance', 'Compliance', 'Note'],
        ['Risks', 'Risks', 'Note'],
        ['BusinessValue', 'Business Value', 'Note'],
        ['EstimatedImpact', 'Estimated Impact', 'Text'],
        ['ImpactMetric', 'Impact Metric', 'Text'],
        ['Feasibility', 'Feasibility', 'Note'],
        ['Reusability', 'Reusability', 'Note'],
        ['OwnerName', 'Owner Name', 'Text'],
        ['OwnerEmail', 'Owner Email', 'Text'],
        ['ReferenceUrl', 'Reference URL', 'Text'],
        ['RepoUrl', 'Repo URL', 'Text'],
        ['RecordStatus', 'Record Status', 'Text'],
        ['CreatedByName', 'Created By Name', 'Text'],
        ['CreatedAtText', 'Created At Text', 'Text'],
        ['ModifiedByName', 'Modified By Name', 'Text'],
        ['ModifiedAtText', 'Modified At Text', 'Text']
      ]
    },
    {
      title: 'SLEDEvents', titleAs: 'Event Title', index: ['EventId'],
      cols: [
        ['EventId', 'Event Id', 'Text'],
        ['StartDate', 'Start Date', 'Text'],
        ['EndDate', 'End Date', 'Text'],
        ['EventStatus', 'Status', 'Text'],
        ['Format', 'Format', 'Text'],
        ['Location', 'Location', 'Text'],
        ['Themes', 'Themes', 'Note'],
        ['Organizers', 'Organizers', 'Note'],
        ['RegistrationUrl', 'Registration URL', 'Text'],
        ['Notes', 'Notes', 'Note'],
        ['RecordStatus', 'Record Status', 'Text'],
        ['CreatedByName', 'Created By Name', 'Text'],
        ['CreatedAtText', 'Created At Text', 'Text'],
        ['ModifiedByName', 'Modified By Name', 'Text'],
        ['ModifiedAtText', 'Modified At Text', 'Text']
      ]
    },
    {
      title: 'SLEDPatterns', titleAs: 'Pattern Name', index: ['PatternId'],
      cols: [
        ['PatternId', 'Pattern Id', 'Text'],
        ['Summary', 'Summary', 'Note'],
        ['Repeatability', 'Repeatability', 'Text'],
        ['SolutionPlay', 'Solution Play', 'Text'],
        ['Components', 'Components', 'Note'],
        ['AcceleratorIds', 'Accelerator Ids', 'Note'],
        ['RecordStatus', 'Record Status', 'Text'],
        ['CreatedByName', 'Created By Name', 'Text'],
        ['CreatedAtText', 'Created At Text', 'Text'],
        ['ModifiedByName', 'Modified By Name', 'Text'],
        ['ModifiedAtText', 'Modified At Text', 'Text']
      ]
    },
    {
      title: 'SLEDAccelerators', titleAs: 'Accelerator Name', index: ['AcceleratorId'],
      cols: [
        ['AcceleratorId', 'Accelerator Id', 'Text'],
        ['AccType', 'Type', 'Text'],
        ['PatternId', 'Pattern Id', 'Text'],
        ['Url', 'URL', 'Text']
      ]
    },
    {
      title: 'SLEDAuditLog', titleAs: 'Record Title', index: ['AuditId'],
      cols: [
        ['AuditId', 'Audit Id', 'Text'],
        ['RecordId', 'Record Id', 'Text'],
        ['RecordType', 'Record Type', 'Text'],
        ['Action', 'Action', 'Text'],
        ['Summary', 'Summary', 'Note'],
        ['ByName', 'By Name', 'Text'],
        ['AtText', 'At Text', 'Text']
      ]
    }
  ];

  const schemaFor = (name, display, kind) =>
    kind === 'Note' ? N(name, display) : T(name, display);

  // ---- REST helpers -------------------------------------------------------
  async function getDigest() {
    const r = await fetch(`${site}/_api/contextinfo`, {
      method: 'POST', headers: VERBOSE, credentials: 'same-origin'
    });
    if (!r.ok) throw new Error(`contextinfo failed (${r.status}). Are you signed in to ${site}?`);
    const j = await r.json();
    return j.d.GetContextWebInformation.FormDigestValue;
  }

  async function listExists(title) {
    const r = await fetch(
      `${site}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')?$select=Title`,
      { headers: { 'Accept': 'application/json;odata=nometadata' }, credentials: 'same-origin' });
    return r.ok;
  }

  async function existingFields(title) {
    const r = await fetch(
      `${site}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields?$select=InternalName&$top=500`,
      { headers: { 'Accept': 'application/json;odata=nometadata' }, credentials: 'same-origin' });
    const set = new Set();
    if (r.ok) {
      const j = await r.json();
      (j.value || []).forEach(f => set.add(String(f.InternalName).toLowerCase()));
    }
    return set;
  }

  async function createList(title, digest) {
    const body = JSON.stringify({
      '__metadata': { 'type': 'SP.List' },
      'BaseTemplate': 100,
      'Title': title,
      'ContentTypesEnabled': false,
      'EnableVersioning': true,
      'MajorVersionLimit': 50,
      'Description': `SLED Use Case Library — ${title}.`
    });
    const r = await fetch(`${site}/_api/web/lists`, {
      method: 'POST',
      headers: { ...VERBOSE, 'X-RequestDigest': digest },
      credentials: 'same-origin', body
    });
    if (!r.ok) throw new Error(`create list "${title}" failed (${r.status}): ${await r.text()}`);
  }

  // Document LIBRARY (BaseTemplate 101) for per-use-case architecture artifacts.
  // The app (app/js/docs.js) stores files in folders named by UseCaseId here.
  async function createLibrary(title, digest) {
    const body = JSON.stringify({
      '__metadata': { 'type': 'SP.List' },
      'BaseTemplate': 101,
      'Title': title,
      'EnableVersioning': true,
      'MajorVersionLimit': 50,
      'Description': `SLED Use Case Library — uploaded architecture documents (one folder per use case).`
    });
    const r = await fetch(`${site}/_api/web/lists`, {
      method: 'POST',
      headers: { ...VERBOSE, 'X-RequestDigest': digest },
      credentials: 'same-origin', body
    });
    if (!r.ok) throw new Error(`create library "${title}" failed (${r.status}): ${await r.text()}`);
  }

  // CreateFieldAsXml with AddFieldInternalNameHint(8) + AddFieldToDefaultView(16) = 24.
  async function addFieldXml(title, schemaXml, digest) {
    const body = JSON.stringify({
      'parameters': {
        '__metadata': { 'type': 'SP.XmlSchemaFieldCreationInformation' },
        'SchemaXml': schemaXml,
        'Options': 24
      }
    });
    const r = await fetch(
      `${site}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields/createfieldasxml`,
      { method: 'POST', headers: { ...VERBOSE, 'X-RequestDigest': digest }, credentials: 'same-origin', body });
    if (!r.ok) throw new Error(`createfieldasxml failed (${r.status}): ${await r.text()}`);
  }

  // MERGE-update a field by internal name (Title rename + Indexed flag).
  async function updateField(title, internalName, props, digest) {
    const body = JSON.stringify({ '__metadata': { 'type': 'SP.Field' }, ...props });
    const r = await fetch(
      `${site}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields/getbyinternalnameortitle('${encodeURIComponent(internalName)}')`,
      { method: 'POST',
        headers: { ...VERBOSE, 'X-RequestDigest': digest, 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
        credentials: 'same-origin', body });
    if (!r.ok) throw new Error(`update field "${internalName}" failed (${r.status}): ${await r.text()}`);
  }

  // ---- run ----------------------------------------------------------------
  log(`Target site: ${site}`);
  let digest = await getDigest();
  let listsCreated = 0, fieldsAdded = 0, indexed = 0, errors = 0;

  for (const L of LISTS) {
    log(`================ ${L.title} ================`);
    try {
      if (await listExists(L.title)) {
        log(`• "${L.title}" exists — ensuring columns`);
      } else {
        await createList(L.title, digest);
        listsCreated++;
        log(`✓ "${L.title}" — list created (versioning on, limit 50)`);
      }

      // Rename the default Title column for nicer display.
      try { await updateField(L.title, 'Title', { 'Title': L.titleAs }, digest); log(`  Title -> "${L.titleAs}"`); }
      catch (e) { warn(`  rename Title: ${e.message}`); }

      const have = await existingFields(L.title);
      for (const [name, display, kind] of L.cols) {
        if (have.has(name.toLowerCase())) { log(`  • ${name} — exists`); continue; }
        try {
          await addFieldXml(L.title, schemaFor(name, display, kind), digest);
          fieldsAdded++;
          log(`  ✓ ${name}`);
        } catch (e) { errors++; warn(`  ${name}: ${e.message}`); }
      }

      // Index the business-key / filter columns (best-effort, safe to re-run).
      for (const name of (L.index || [])) {
        try { await updateField(L.title, name, { 'Indexed': true }, digest); indexed++; log(`  ⌗ indexed ${name}`); }
        catch (e) { warn(`  index ${name}: ${e.message}`); }
      }
    } catch (e) {
      errors++; err(`${L.title}: ${e.message}`);
    }
  }

  // ---- Document library for architecture artifacts ------------------------
  const DOC_LIB = 'SLEDSolutionArchitecture';
  log(`================ ${DOC_LIB} (library) ================`);
  try {
    if (await listExists(DOC_LIB)) {
      log(`• "${DOC_LIB}" exists — leaving as is`);
    } else {
      await createLibrary(DOC_LIB, digest);
      listsCreated++;
      log(`✓ "${DOC_LIB}" — document library created (versioning on). The app uploads one folder per use case here.`);
    }
  } catch (e) {
    errors++; err(`${DOC_LIB}: ${e.message}`);
  }

  log('==================================================');
  log(`Done. Lists created: ${listsCreated}, fields added: ${fieldsAdded}, indexed: ${indexed}, errors: ${errors}`);
  if (errors === 0) log('All six lists + the document library are ready. Next: deploy the app to SiteAssets/sled/ and open index.aspx (see PHASE-2-PROTOTYPE-RUNBOOK.md).');
  else warn('Finished with some errors — review the messages above.');
})();
