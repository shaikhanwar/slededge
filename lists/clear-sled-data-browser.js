/*
 * clear-sled-data-browser.js — one-paste data reset for the SLED Use Case Library.
 *
 * WHAT IT DOES
 *   Deletes EVERY item from the SLED* lists over same-origin REST, as the
 *   signed-in user, so you can re-seed a clean, consistent dataset for
 *   end-to-end testing. Deleted items go to the site Recycle Bin (recoverable
 *   for a while), not permanent deletion.
 *
 *   Lists cleared: SLEDUseCases, SLEDVerticals, SLEDIndustries, SLEDEvents,
 *                  SLEDPatterns, SLEDAccelerators, SLEDAuditLog.
 *   (The SLEDSolutionArchitecture document library is left untouched.)
 *
 * HOW TO RUN
 *   1. Sign in and open ANY page on the SLED site, e.g.
 *        https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx
 *   2. Press F12 -> Console.
 *   3. Paste this entire file and press Enter.
 *   4. Confirm the prompt. Watch the per-list "deleted / failed" counts.
 *   5. Re-seed with lists/seed-sled-data-browser.js, then reload the app.
 */
(async () => {
  const m = location.pathname.match(/^(.*?\/(?:sites|teams)\/[^/]+)/i);
  const site = (window._spPageContextInfo && _spPageContextInfo.webAbsoluteUrl)
    || (m ? location.origin + m[1] : location.origin);

  // Children before parents (cosmetic — SharePoint has no referential integrity).
  const LISTS = [
    'SLEDUseCases', 'SLEDVerticals', 'SLEDSolutionPlays', 'SLEDIndustries',
    'SLEDEvents', 'SLEDPatterns', 'SLEDAccelerators', 'SLEDAuditLog'
  ];

  if (!confirm(`Delete ALL items from every SLED* list on:\n${site}\n\nItems go to the site Recycle Bin (recoverable). Continue?`)) {
    console.log('%cSLED clear — cancelled.', 'color:#a00;font-weight:bold');
    return;
  }
  console.log('%cSLED clear', 'font-weight:bold', '-> site:', site);

  const getJson = async (url, init) => {
    const r = await fetch(url, { ...init, headers: { Accept: 'application/json;odata=nometadata', ...(init && init.headers) }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText + ' @ ' + url);
    return r.json();
  };

  const ci = await getJson(site + '/_api/contextinfo', { method: 'POST' });
  const digest = (ci.GetContextWebInformation || ci).FormDigestValue;

  const totals = { deleted: 0, failed: 0 };
  for (const list of LISTS) {
    // Collect all item IDs (paged).
    const ids = [];
    let url = site + `/_api/web/lists/getbytitle('${list}')/items?$select=Id&$top=5000`;
    try {
      while (url) {
        const j = await getJson(url);
        (j.value || []).forEach(it => ids.push(it.Id));
        url = j['odata.nextLink'] || j['@odata.nextLink'] || '';
      }
    } catch (e) {
      console.warn(`Cannot read '${list}' — is it provisioned? Skipping.`, e.message);
      continue;
    }

    let del = 0, fail = 0;
    for (const id of ids) {
      try {
        const r = await fetch(site + `/_api/web/lists/getbytitle('${list}')/items(${id})`, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'X-RequestDigest': digest, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' }
        });
        if (r.ok) del++; else { fail++; console.warn('  FAIL', list, id, r.status); }
      } catch (e) { fail++; console.warn('  ERR', list, id, e.message); }
    }
    totals.deleted += del; totals.failed += fail;
    console.log(`%c${list}%c  deleted ${del} | failed ${fail} (of ${ids.length})`, 'font-weight:bold', 'font-weight:normal');
  }

  console.log(`%cDone.%c total deleted ${totals.deleted}, failed ${totals.failed}. Now run seed-sled-data-browser.js to repopulate, then reload the app.`, 'font-weight:bold;color:green', 'font-weight:normal');
})();
