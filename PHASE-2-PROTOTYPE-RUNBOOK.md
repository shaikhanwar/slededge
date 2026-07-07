# SLED Use Case Library — Phase 2 Prototype & GUI Deployment Runbook (DEV)

**Status:** Phase 2 deliverable — build & deploy the prototype in DEV
**Tenant:** `vw4gr.onmicrosoft.com` · **Root:** `https://vw4gr.sharepoint.com`
**Site:** `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary`
**App URL (after deploy):** `<site>/SiteAssets/sled/index.aspx`
**Last updated:** 2026-06-30

> **Architecture (updated).** The prototype is now a **multi-page app over six lists**, modelled on the Hackathon Content Library (HCL) and adapted for SLED: use cases are mapped to an **Industry** (not an Agency), the calendar is renamed **Events** (standalone, not linked to use cases), and we keep **Patterns/Accelerators**, a **Pipeline** flag on each use case, and an **Audit** trail. There are no Teams, no event management, no scoring/winners.
>
> **GUI-first by design.** The only scripted step is the no-PnP list provisioning, run from the **SharePoint Online Management Shell** via Site Designs — the same proven approach used in the HCL hackathon — with **no PnP, no app registration, no admin consent, and no F12 browser console**.
>
> **What you'll stand up:** six lists (`SLEDIndustries`, `SLEDUseCases`, `SLEDEvents`, `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`) → the app at `SiteAssets/sled/index.aspx` whose own pages browse, register and edit every entity and write back to the lists over same-origin REST.

---

## Environment tracker

| Item | DEV | PROD (SLED Edge) |
|---|---|---|
| Tenant | `vw4gr` | |
| SharePoint Admin URL | `https://vw4gr-admin.sharepoint.com` | |
| Target site URL | `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary` | |
| Site template | Communication site → **Blank** | (existing SLED Edge) |
| Custom script allowed? | ☐ | ☐ |
| Six `SLED*` lists created? | ☐ | ☐ |
| Columns + indexing + Title rename done? | ☐ | ☐ |
| App files uploaded to `SiteAssets/sled`? | ☐ | ☐ |
| App page renders + reads/writes all lists? | ☐ | ☐ |
| App page link added to navigation? | ☐ | ☐ |
| (Optional) curator views created? | ☐ | ☐ |
| (Optional) approval flow built? | ☐ | ☐ |

> ⚠️ **On SharePoint the app page is `index.aspx`, not `.html`.** A raw `.html` file in a SharePoint library usually **downloads instead of rendering**; `index.aspx` renders inline through the page pipeline. (Same lesson as the HCL.) **Locally, preview with `index.html`** — the `<%@ Page %>` directive at the top of `index.aspx` only renders on SharePoint and shows as stray text in a local file server.

---

## Prerequisites — local preview (optional but recommended)

Before deploying, preview the exact UI locally against the dummy data:

```powershell
# from the workspace root (wherever you copied it on this machine):
cd ./SLEDEdge/app
pwsh ./serve.ps1 -Port 8087
# open http://localhost:8087/index.html
```

You'll see the full app — Home (KPIs), Use Cases (browse/filter + detail tabs), Industries, Events, Pipeline, Patterns, Audit, and the Register forms — reading the seed JSON in [app/data/](app/data/) (`industries.json`, `usecases.json`, `events.json`, `patterns.json`). Edits persist to `localStorage` in demo mode. This is exactly what the deployed page looks like — only the data source changes (live lists vs seed JSON).

---

## §1 — Create the DEV site (GUI)

**Where:** SharePoint admin center → `https://vw4gr-admin.sharepoint.com`

1. Left nav **Sites → Active sites** → **+ Create**.
2. Choose **Communication site** (cleaner navigation for a catalog).
3. **Site name:** `SLEDUseCaseLibrary` → confirm the URL becomes `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary`.
4. **Language:** English. **Time zone:** your zone. **Owner:** you (admin).
5. **Finish**. Wait for provisioning, then open the site.

> **PROD note:** In Phase 4 you skip this step and use the existing **SLED Edge** site instead.

---

## §2 — Allow custom script on the site (GUI, one-time)

The app page (`index.aspx` with inline `<script>` references) requires custom script to be **allowed** on the site.

**Where:** SharePoint admin center → **Sites → Active sites → SLEDUseCaseLibrary → Settings** (or **Site information**).

1. Find **Custom scripts** → set **Allow users to run custom script on this site** to **Allow**.
2. Save. (It can take a few minutes to apply. If you provisioned via PowerShell, the equivalent is `Set-SPOSite -DenyAddAndCustomizePages 0`.)

> Without this, the uploaded `index.aspx` may not execute its scripts.

---

## §3 — Provision the six lists (PowerShell Site Designs, no PnP, no console)

This creates the six `SLED*` lists with plain **Text / Note** columns (the app stores booleans as `Yes`/`No` and multi-values as `; `-joined text) plus the `SLEDSolutionArchitecture` document library. It uses **SharePoint Site Designs / Site Scripts** through the **SharePoint Online Management Shell** — the same no-PnP, no-app-registration approach proven in the HCL hackathon (`HackDocuments/scripts/provision-via-sitedesign.ps1`). Each column is declared with an explicit **Field XML internal name** so the app's REST round-trips never hit a "field does not exist" error.

**Prerequisites (one-time):**

```powershell
# Install the SharePoint Online Management Shell (no PnP):
Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser -Force
```

**Run the script** (you'll be prompted to sign in as a SharePoint/tenant admin):

```powershell
cd .\SLEDEdge\lists
pwsh -File .\provision-sled-via-sitedesign.ps1 `
     -SiteUrl "https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary"
```

- The admin URL (`https://vw4gr-admin.sharepoint.com`) is auto-derived from the site URL.
- Communication site is assumed (`-WebTemplate 68`); add `-WebTemplate 64` for a Team site.
- The script is **idempotent** — Site Designs are additive, so re-running only adds any missing columns. Safe to repeat if a chunk fails.
- Columns are applied in **chunks of 12** (a Site Design apply has a per-apply stage cap); large lists like `SLEDUseCases` apply in 2–3 parts. Each part runs in the background and completes within a few seconds.
- It also creates the **`SLEDSolutionArchitecture` document library** (versioning on). The app uploads Solution Architecture artifacts here into one folder per record, named by `UseCaseId` (use cases) or `PatternId` (patterns) — see [app/js/docs.js](app/js/docs.js). No columns are added; the folder name is the only association. If your tenant blocks doc-library creation via Site Design, re-run with `-SkipLibrary` and create it by hand (**Site contents → New → Document library → `SLEDSolutionArchitecture`**).

Expected tail: `Lists OK: 6 | failed: 0` → `Done.`

The authoritative schema this mirrors is [lists/sled-list-schema.json](lists/sled-list-schema.json), which in turn mirrors the app's column maps in [app/js/store.js](app/js/store.js).

> **Title column:** the app reuses the built-in `Title` field as each list's name. The script leaves its display name as **Title** (Site Designs don't rename it). This is purely cosmetic — optionally rename it later per list (**List settings → Title → Rename** to Industry Name / Use Case Name / etc.).

> **Verify (GUI):** **Site contents** shows `SLEDIndustries`, `SLEDUseCases`, `SLEDEvents`, `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`, and the `SLEDSolutionArchitecture` library. Open each → **List settings** and confirm the columns exist. Column *internal* names are unprefixed (e.g. `IndustryId`, `BusinessProblem`) — this is required, the app addresses them by those exact names.

> **Reusable for PROD:** run the exact same script against the production site URL — no app registration, no console, ever.

---

## §4 — Forms & data entry (app-driven)

Unlike the original single-list prototype, **you do not need to customize the SharePoint default forms.** The app provides its own multi-step Register and Edit forms for every entity (Use Case, Industry, Event, Pattern/Accelerator) and writes records back to the lists over REST. Registering a use case captures its Industry mapping, the **In Pipeline** flag, and all solution/value fields in one form.

> *(Optional)* If curators will also edit items directly in the lists, you can tidy the default forms per list (reorder columns, hide the audit/`*Text` bookkeeping fields). This is cosmetic — the app never depends on it.

---

## §5 — (Optional) Curator views

The app does all browsing/filtering itself (Use Cases browse, Pipeline, Industries, Events, Patterns, Audit), so list views are optional. If you want in-list curator views, useful ones are:

1. On `SLEDUseCases`: **Published** (`UCStatus` = `Published`, grouped by `IndustryId`), **Review Queue** (`UCStatus` = `In Review`, sort `Modified` desc), **In Pipeline** (`InPipeline` = `Yes`).
2. On `SLEDAuditLog`: sort `AtText` descending for a chronological change log.

---

## §6 — Seed data

The local preview already ships seed content in [app/data/](app/data/). On SharePoint you have two options:

- **Let the app seed it:** open the deployed app in **Demo** mode once (append `?data=local`), then use **Register** forms to add records and **Save to SharePoint** — or
- **Enter a few records directly** via each list's **+ New** to validate structure (at least 2–3 use cases across different industries, one flagged **In Pipeline = Yes**, plus an industry or two so the Use Case → Industry mapping resolves).

> No bulk import is required for the prototype — a handful of records across the verticals is enough to validate every page.

---

## §7 — Deploy the app files (GUI upload to `SiteAssets/sled`)

**Where:** the site → **Site contents → Site Assets** (the `SiteAssets` library). If it isn't visible, browse to `…/sites/SLEDUseCaseLibrary/SiteAssets`.

1. Create a folder named **`sled`** inside **Site Assets**.
2. Upload the contents of the local [app/](app/) folder, preserving structure:
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
   (You can drag the `css` and `js` folders directly into the library, or use **Upload → Folder**.)
   - **Do not** upload the local `data/` folder, `index.html`, or `serve.ps1` — those are only for local preview. On SharePoint the app auto-switches to **live list** mode.
3. Open the app: `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx`.
   - Every page renders from the **live lists**.
   - **Register** forms create records and write them back to the lists.
   - If pages are empty or a save fails, re-check the list names in §3; if scripts don't run, re-check §2.

> **How auto-detection works:** [app/js/spconfig.js](app/js/spconfig.js) resolves the current `*.sharepoint.com` site and [app/js/data.js](app/js/data.js) reads the six lists via same-origin REST. Locally it falls back to the seed JSON. You change **nothing** in code between DEV and PROD — you re-upload these files and re-provision the lists on the target site.

---

## §8 — Surface the page in navigation (GUI)

Make the app easy to reach from the site (and later, from SLED Edge).

**Option A — link directly to the app page (simplest):**
1. Site → **Edit** the top/left navigation → **+ Add link**.
2. **Address:** `…/SiteAssets/sled/index.aspx` · **Display name:** `Use Case Library`. Save.

**Option B — embed in a Site Page (themed wrapper):**
1. **+ New → Page → Blank**. Name it `SLED Use Case Library`.
2. Add an **Embed** web part → point it at the app URL (allowed because it's same-site). Publish.
3. Add **that page** to navigation. (Use Option A if Embed height feels constrained.)

> **PROD note:** in Phase 4 add the link under SLED Edge's "Solution Plays & Use Cases" section and apply the SLED Edge theme.

---

## §9 — (Optional) Approval flow in Power Automate (GUI)

Implements: new/edited item with **Status = In Review** → curator approval → **Published** (approve) or **Draft** (reject) → notify.

**Where:** list → **Integrate → Power Automate → Create a flow → Start from blank** (or `make.powerautomate.com`).

1. **Trigger:** *When an item is created or modified* → Site Address = DEV site, List = `SLEDUseCases`.
2. **Trigger condition** (Settings on the trigger, prevents loops):
   `@equals(triggerOutputs()?['body/UCStatus'], 'In Review')`
3. **Action — Start and wait for an approval:** type **Approve/Reject – First to respond**; **Assigned to** = your admin/curator (placeholder: you, or the `SLED Use Case Curators` group once created); include Title, `IndustryId`, `BusinessProblem`, `OwnerName`, and the item link in the details.
4. **Condition — Outcome:**
   - **If Approved →** *Update item* → set **`UCStatus` = Published**.
   - **If Rejected →** *Update item* → set **`UCStatus` = Draft**; *Post a message / Send an email* to the owner with the reviewer comments.
5. **Save** and test (§10).

> **Approver for now:** admin approves (as you noted). When the `SLED Use Case Curators` group exists, switch the *Assigned to* to that group. **PROD note:** recreate or repoint this flow to the PROD list — only the connection target changes because internal column names are identical.

---

## §10 — Test the prototype (GUI)

1. **Register:** open the app → **+ Register → Register a Use Case** → fill the form (pick an Industry, optionally tick **Flag for the productionization pipeline**) → **Create use case**. The record appears in **Use Cases** and writes back to `SLEDUseCases`.
2. **Browse/filter:** on **Use Cases**, try the Industry / Status filters and the search box; confirm the list updates.
3. **Detail:** open a use case → check the **Overview / Solution & Tech / Value & Impact / Pipeline & Owner / Artifacts** tabs.
4. **Pipeline:** open **Pipeline** → edit an owner/next-step inline; confirm it saves. Flag/unflag from a use case's **Edit** form.
5. **Industries / Events / Patterns:** confirm each lists its records; register a new one of each.
6. **Audit:** archive a record, confirm it appears under **Audit**, then restore it.
7. *(If flow built)* approve a use case via Approvals → its status flips to **Published**.

**Phase 3 sign-off checklist** (verify before PROD):
- [ ] All six lists provisioned with the correct (unprefixed) column internal names
- [ ] Register forms create Industry / Use Case / Event / Pattern records that round-trip to the lists
- [ ] Use Cases browse/filter + detail tabs work from the live lists
- [ ] Pipeline inline owner/next-step edits save; In-Pipeline flag toggles
- [ ] Audit archive/restore works and is logged
- [ ] (Optional) approval flow flips `UCStatus` to Published

---

## §11 — DEV → PROD (preview of Phase 4)

When approved, repeat on the **SLED Edge** site with **identical internal names** so everything ports:

| Artifact | Method |
|---|---|
| Six lists + columns + indexing + Title rename | Re-run [lists/provision-sled-list-browser.js](lists/provision-sled-list-browser.js) on SLED Edge |
| App files | Re-upload [app/](app/) JS/CSS/`index.aspx` to `SiteAssets/sled` on SLED Edge (no code changes) |
| (Optional) curator views | Redo §5 clicks (1:1 mapping) |
| (Optional) approval flow | Recreate/repoint to the PROD `SLEDUseCases` list (connection change only) |
| Content | Re-register curated items in the app, or copy items between lists |
| Navigation + theme | Add link under SLED Edge nav; apply hub theme |

---

## §12 — Permissions & roles (SharePoint groups + app gating)

Security is enforced **twice**: SharePoint is the real gate (the app reads/writes the lists as the signed-in user, so any disallowed write fails with a 403), and the app mirrors those permissions in the UI so people only see the buttons they can actually use. The app resolves the user's role on load via [app/js/auth.js](app/js/auth.js) (`_api/web/currentuser`, the user's groups, and the `EffectiveBasePermissions` on `SLEDUseCases`).

### Roles

| Role | SharePoint group (permission level) | Can do |
|---|---|---|
| **Viewer** | `SLED Visitors` (**Read**) | Browse everything; download Solution Architecture files. No create/edit/delete. |
| **Contributor** | `SLED Members` (**Contribute**) | Create use cases; edit/archive and upload files on the use cases **they own** (owner email match). |
| **Curator** | `SLED Curators` (**Edit**) | Edit/archive **any** record; manage Industries, Patterns, Accelerators, Events; manage all files. |

> The app picks the role from group membership first: a group whose name contains *Curator* or *Owner* ⇒ Curator; *Member* or *Contributor* ⇒ Contributor; Site Collection Admins are always Curator. If groups aren't read, it falls back to the list's effective permissions (ManageLists ⇒ Curator, AddListItems ⇒ Contributor, else Viewer).

### Set up the groups (GUI)

1. DEV site → **Settings ⚙ → Site permissions → Advanced permissions settings**.
2. **Create Group** three times (or reuse the site's default Visitors/Members/Owners):
   - `SLED Visitors` → permission level **Read**.
   - `SLED Members` → permission level **Contribute**.
   - `SLED Curators` → permission level **Edit**.
3. Add people to each group. (You, as admin, are already effectively Curator.)
4. Because the app reads/writes the lists as the user, **no per-list permission changes are required** — the lists inherit from the site. If you later break inheritance on a list, keep at least Read for Visitors, Contribute for Members, and Edit for Curators.

> **Solution Architecture library:** `SLEDSolutionArchitecture` also inherits site permissions, so Contributors can upload to use-case folders and Viewers can download. Only Curators upload to **pattern** folders because the app limits pattern management to Curators.

### Verify

- Sign in (or use a test account) in each group and open the app: Viewers see no **+ Register** button and read-only detail pages; Contributors see **Register a Use Case** and Edit/Archive only on their own use cases; Curators see everything.
- **Local demo:** there's no real sign-in, so the mode bar shows a **Preview as** switcher (Viewer / Contributor / Curator) — or append `?role=viewer|contributor|curator` to the URL — to preview each role's UX. The demo defaults to Curator.

---

## File map (this folder)

| Path | Purpose |
|---|---|
| [lists/sled-list-schema.json](lists/sled-list-schema.json) | Authoritative six-list column definitions |
| [lists/provision-sled-list-browser.js](lists/provision-sled-list-browser.js) | No-PnP browser provisioning for all six lists |
| [app/index.aspx](app/index.aspx) | App host page (renders on SharePoint) |
| [app/index.html](app/index.html) | Local-preview host page (use this with serve.ps1) |
| [app/css/styles.css](app/css/styles.css) | HCL-derived design system (SLED rebrand) |
| [app/js/constants.js](app/js/constants.js) | Verticals, segments, statuses, choice lists |
| [app/js/spconfig.js](app/js/spconfig.js) | Site/list resolution + DEV/PROD auto-detection |
| [app/js/factory.js](app/js/factory.js) | Record builders (Industry/UseCase/Event/Pattern/Accelerator) |
| [app/js/store.js](app/js/store.js) | Local (seed/localStorage) + SharePoint REST persistence |
| [app/js/data.js](app/js/data.js) | In-memory db, lookups, metrics, persistence glue |
| [app/js/docs.js](app/js/docs.js) | Solution Architecture file attachments (SharePoint library / IndexedDB) |
| [app/js/auth.js](app/js/auth.js) | Identity + role resolution and permission gating |
| [app/js/app.js](app/js/app.js) | Router, all pages, Register/Edit forms, Audit |
| [app/data/](app/data/) | Seed JSON (local preview only) |
| [app/serve.ps1](app/serve.ps1) | Local preview web server |
