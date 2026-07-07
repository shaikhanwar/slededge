# Deploying the SLED Use Case Library to SharePoint Online

A step-by-step guide to stand up the library on a SharePoint Online site. The
only scripted step is list provisioning (via SharePoint **Site Designs** in the
SharePoint Online Management Shell — **no PnP, no app registration, no admin
consent, no F12 browser console**). Everything else is done in the browser.

> Replace `https://<tenant>.sharepoint.com` and `<SiteName>` throughout with your
> own tenant root and site. This guide uses a site named `SLEDUseCaseLibrary` as
> the example.

**What you'll end up with:** six `SLED*` lists + one document library → the app at
`…/SiteAssets/sled/index.aspx`, whose own pages browse, register and edit every
entity and write back to the lists over same-origin REST.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **SharePoint / tenant admin** | Needed to create the site and allow custom script |
| **PowerShell 7** (`pwsh`) | For the local preview server (optional) |
| **SharePoint Online Management Shell** | For list provisioning — install once (below) |
| The `SLEDEdge` repo cloned locally | You'll upload files from [`app/`](../app/) |

Install the management shell once (no PnP):

```powershell
Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser -Force
```

> **Optional — preview locally first.** From the repo's `app/` folder run
> `pwsh ./serve.ps1 -Port 8087` and open `http://localhost:8087/index.html` to
> see the exact UI against seed data before deploying.

---

## Step 1 — Create the site

**SharePoint admin center → `https://<tenant>-admin.sharepoint.com`**

1. **Sites → Active sites → + Create**.
2. Choose **Communication site** (cleaner navigation for a catalog).
3. **Site name:** `SLEDUseCaseLibrary` → confirm the URL becomes
   `https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary`.
4. Set **Language**, **Time zone**, and **Owner** (you).
5. **Finish** and wait for provisioning.

> **PROD (SLED Edge):** skip this step — use the existing SLED Edge site.

---

## Step 2 — Allow custom script (one-time)

The app page (`index.aspx` with inline `<script>` references) requires custom
script to be **allowed** on the site.

**SharePoint admin center → Sites → Active sites → your site → Settings.**

1. Find **Custom scripts** → set **Allow users to run custom script on this
   site** to **Allow**.
2. Save. It can take a few minutes to apply.

> PowerShell equivalent: `Set-SPOSite -Identity <siteUrl> -DenyAddAndCustomizePages 0`.
> Without this, the uploaded `index.aspx` may not execute its scripts.

---

## Step 3 — Provision the six lists

Creates the six `SLED*` lists (plain Text/Note columns — the app stores booleans
as `Yes`/`No` and multi-values as `; `-joined text) plus the
`SLEDSolutionArchitecture` document library. Uses **Site Designs / Site Scripts**
through the management shell. Each column is declared with an explicit Field XML
internal name so the app's REST round-trips never hit a "field does not exist"
error.

```powershell
cd ./lists
pwsh -File ./provision-sled-via-sitedesign.ps1 `
     -SiteUrl "https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary"
```

- You'll be prompted to sign in as a SharePoint/tenant admin.
- The admin URL is auto-derived from the site URL.
- Communication site is assumed (`-WebTemplate 68`); add `-WebTemplate 64` for a
  Team site.
- **Idempotent** — Site Designs are additive, so re-running only adds missing
  columns. Safe to repeat if a chunk fails.
- Columns apply in **chunks of 12** (per-apply stage cap); large lists apply in
  2–3 parts.
- If your tenant blocks doc-library creation via Site Design, re-run with
  `-SkipLibrary` and create `SLEDSolutionArchitecture` by hand
  (**Site contents → New → Document library**).

Expected tail: `Lists OK: 6 | failed: 0` → `Done.`

**Verify (GUI):** **Site contents** shows `SLEDIndustries`, `SLEDUseCases`,
`SLEDEvents`, `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`, and the
`SLEDSolutionArchitecture` library. Column *internal* names are **unprefixed**
(e.g. `IndustryId`, `BusinessProblem`) — the app addresses them by those exact
names.

> **Alternative (no admin shell):** paste
> [`lists/provision-sled-list-browser.js`](../lists/provision-sled-list-browser.js)
> into the browser console while signed in to the site. Same result, also
> idempotent.

> The authoritative schema is
> [`lists/sled-list-schema.json`](../lists/sled-list-schema.json), which mirrors
> the app's column maps in [`app/js/store.js`](../app/js/store.js).

---

## Step 4 — Set up permissions & roles

Security is enforced by SharePoint (the app reads/writes as the signed-in user,
so any disallowed write fails with 403). The app mirrors the user's role in the
UI.

| Role | SharePoint group (permission level) | Can do |
|---|---|---|
| **Viewer** | `SLED Visitors` (**Read**) | Browse everything; download artifacts |
| **Contributor** | `SLED Members` (**Contribute**) | Create use cases; edit/archive their own |
| **Curator** | `SLED Curators` (**Edit**) | Edit/archive any record; manage all entities |

1. Site → **Settings ⚙ → Site permissions → Advanced permissions settings**.
2. Create (or reuse) the three groups above with the listed permission levels.
3. Add people to each group. Site Collection Admins are always treated as
   Curator.

The lists and the `SLEDSolutionArchitecture` library inherit site permissions —
no per-list changes required.

---

## Step 5 — Deploy the app files

**Site contents → Site Assets** (the `SiteAssets` library).

1. Create a folder named **`sled`** inside **Site Assets**.
2. Upload the contents of the local [`app/`](../app/) folder, preserving
   structure:

   ```
   SiteAssets/sled/
     index.aspx
     css/styles.css
     js/constants.js
     js/spconfig.js
     js/factory.js
     js/store.js
     js/data.js
     js/docs.js
     js/auth.js
     js/app.js
   ```

   Drag the `css` and `js` folders into the library, or use **Upload → Folder**.
3. **Do not** upload `app/data/`, `index.html`, or `serve.ps1` — those are for
   local preview only. On SharePoint the app auto-switches to **live list** mode.

Open the app:
`https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx`

- Every page renders from the **live lists**.
- **Register** forms create records and write them back to the lists.
- If pages are empty or a save fails, re-check the list names (Step 3); if
  scripts don't run, re-check custom script (Step 2).

---

## Step 6 — Surface the app in navigation

**Option A — link directly (simplest):**

1. Site → **Edit** the navigation → **+ Add link**.
2. **Address:** `…/SiteAssets/sled/index.aspx` · **Display name:**
   `Use Case Library`. Save.

**Option B — embed in a modern Site Page (themed wrapper):**
see [EMBED-IN-MODERN-PAGES.md](EMBED-IN-MODERN-PAGES.md).

---

## Step 7 — Seed & validate

1. **Register:** open the app → **+ Register → Register a Use Case** → pick an
   Industry, fill the form → **Create use case**. Confirm it appears in **Use
   Cases** and writes back to `SLEDUseCases`.
2. **Browse/filter:** try the Industry / Segment / Status filters and search.
3. **Detail tabs:** open a use case → check Overview / Solution & Tech / Value &
   Impact / Owner & Artifacts.
4. **Industries / Events / Patterns:** confirm each lists its records; register
   one of each.
5. **Audit:** archive a record, confirm it appears under **Audit**, then restore
   it.

A handful of records across the verticals is enough to validate every page.

---

## Step 8 — (Optional) Approval flow in Power Automate

Implements: item with **Status = In Review** → curator approval → **Published**
(approve) or **Draft** (reject) → notify.

**List → Integrate → Power Automate → Create a flow → Start from blank.**

1. **Trigger:** *When an item is created or modified* → your site, List =
   `SLEDUseCases`.
2. **Trigger condition** (prevents loops):
   `@equals(triggerOutputs()?['body/UCStatus'], 'In Review')`
3. **Start and wait for an approval** — type *Approve/Reject – First to
   respond*; assign to your curator group; include Title, `IndustryId`,
   `BusinessProblem`, `OwnerName`, and the item link.
4. **Condition on Outcome:**
   - **Approved →** *Update item* → `UCStatus` = **Published**.
   - **Rejected →** *Update item* → `UCStatus` = **Draft**; email the owner with
     the reviewer comments.
5. **Save** and test.

---

## Step 9 — DEV → PROD (SLED Edge)

Keep internal names **identical** so everything ports:

| Artifact | Method |
|---|---|
| Six lists + columns | Re-run the provisioning script against the SLED Edge site |
| App files | Re-upload [`app/`](../app/) to `SiteAssets/sled` (no code changes) |
| Approval flow | Recreate/repoint to the PROD `SLEDUseCases` list (connection change only) |
| Content | Re-register curated items in the app, or copy items between lists |
| Navigation + theme | Add link under SLED Edge nav; apply the hub theme |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `index.aspx` downloads instead of rendering | Ensure you used `index.aspx` (not `.html`) and custom script is **allowed** (Step 2) |
| Pages load but are empty | List names/columns wrong — re-verify Step 3 (internal names are unprefixed) |
| Saves fail with 403 | The signed-in user lacks Contribute/Edit — check group membership (Step 4) |
| App shows demo data on SharePoint | You uploaded the `data/` folder or opened it off a non-`sharepoint.com` host |
| Scripts don't run at all | Custom script not yet applied — wait a few minutes after Step 2, then hard-reload |
