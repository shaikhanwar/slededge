# SLEDEdge Checkpoint — SLED Use Case Library

**Purpose:** Crash-recovery handoff so this work can resume on any machine (incl. a fresh VM) with full context.
**Last updated:** 2026-07-08
**Active track:** `SLEDEdge/` (this folder). The Hackathon Content Library in `hackathon-content-library/` is the **reference** solution this is modelled on; it is a separate, completed solution.

---

## 1. What this is

The **SLED Use Case Library** — an internal Microsoft catalog of reusable use cases across the five SLED verticals (State & Local Government; Public Safety & Justice; Public Health & Social Services; Transportation & Urban Infrastructure; Education). It is a **multi-page app over six SharePoint lists**, adapted from the Hackathon Content Library (HCL) model with these SLED differences:

- Use cases map to an **Industry** (vertical), not an Agency.
- The calendar is renamed **Events** and is **standalone** (not linked to use cases).
- Each use case names an **Owner** (name + email).
- We keep **Patterns / Solution accelerators** and an **Audit** trail.
- **Dropped from HCL:** teams, team mapping, event management, scoring/winners. **Also dropped (2026-06-29):** the productionization Pipeline, plus the Next step, Lessons, and Demo URL fields.

Delivered entirely on **Microsoft 365 no-code/low-code**: six SharePoint **Lists** (data) + a custom multi-page SPA (`index.aspx`) that browses, registers and edits every entity over same-origin REST + an optional Power Automate approval flow.

**Delivery path:** Phase 1 (plan) → Phase 2 (DEV prototype) → Phase 3 (review checkpoint) → Phase 4 (deploy to PROD / SLED Edge).

---

## 2. Where things stand

| Phase | Status |
|---|---|
| **Phase 1 — Plan & Architecture** | ✅ Complete — [PHASE-1-PLAN-AND-ARCHITECTURE.md](PHASE-1-PLAN-AND-ARCHITECTURE.md) (draft v1.0, design only) |
| **Phase 2 — DEV prototype build** | ✅ Code built & verified locally — six-list app + schema + provisioning + runbook all written; all pages render against seed data. |
| **Phase 2 — DEV deploy to SharePoint** | ✅ **Deployed.** Site `SLEDUseCaseLibrary` created; six lists + `SLEDSolutionArchitecture` library provisioned via PowerShell Site Designs; app uploaded to `SiteAssets/sled/`; both standalone + embedded Site Page live. |
| **Phase 3 — Review checkpoint** | 🔄 In progress — UI polish + deployment shape being finalized. |
| **Phase 4 — PROD (SLED Edge)** | ⬜ Pending |

### Deployment state (2026-06-30)
- **Site:** `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary` (NOT `…DEV`). Custom script allowed.
- **Lists provisioned** (PowerShell Site Designs, NO PnP, NO F12): all six `SLED*` lists + `SLEDSolutionArchitecture` doc library, via [lists/provision-sled-via-sitedesign.ps1](lists/provision-sled-via-sitedesign.ps1). Run: `pwsh -File .\provision-sled-via-sitedesign.ps1 -SiteUrl "https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary"`. Idempotent. (`setversioning` is NOT a valid createSPList subaction — library uses `setDescription` instead; modern libs version by default.)
- **App files** at `SiteAssets/sled/` (index.aspx, css/, js/). Re-upload these on any change; both views auto-pick-up.
- **Two doorways (same lists/data):**
  - Standalone (full-width, no chrome): `…/SiteAssets/sled/index.aspx`
  - Embedded (suite bar + search): `…/SitePages/Use-Case-Library.aspx` (Blank Site Page → Embed web part with iframe to index.aspx; site nav turned off; header can be set Minimal).

### Pending / next actions
1. Seed a few records via the app to validate live round-trip saves (Register → Save to SharePoint).
2. (Optional, later) Tenant branding: make suite bar black (M365 admin → Org settings → Organization profile → Custom themes — tenant-wide, needs Global Admin).
3. (Optional) Code tweak: hide app footer + trim padding when embedded (detect `window.self !== window.top`) — additive, won't affect standalone. NOT yet done.
4. (Optional) Set header Layout=Minimal on the embed page; add the page to site nav if desired.
5. Cosmetic: list Title columns still show "Title" (Site Designs can't rename) — optionally rename per list.

### Built & on disk
- **Plan:** [PHASE-1-PLAN-AND-ARCHITECTURE.md](PHASE-1-PLAN-AND-ARCHITECTURE.md) — architecture, data model, governance, UX, deployment.
- **Runbook:** [PHASE-2-PROTOTYPE-RUNBOOK.md](PHASE-2-PROTOTYPE-RUNBOOK.md) — GUI-first DEV stand-up steps (§1–§11).
- **List schema:** [lists/sled-list-schema.json](lists/sled-list-schema.json) — authoritative defs for the six lists (`SLEDIndustries`, `SLEDUseCases`, `SLEDEvents`, `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`).
- **Provisioning:** [lists/provision-sled-list-browser.js](lists/provision-sled-list-browser.js) — no-PnP browser-console creator for all six lists (idempotent).
- **App (ES-module SPA, no build step):** [app/index.aspx](app/index.aspx) (SharePoint host), [app/index.html](app/index.html) (local host), [app/css/styles.css](app/css/styles.css), and `js/`: [constants.js](app/js/constants.js), [spconfig.js](app/js/spconfig.js), [factory.js](app/js/factory.js), [store.js](app/js/store.js), [data.js](app/js/data.js), [app.js](app/js/app.js).
- **Seed data (local preview only):** [app/data/](app/data/) — `industries.json`, `usecases.json`, `events.json`, `patterns.json`.
- **Local server:** [app/serve.ps1](app/serve.ps1).

### Not done yet (the next actions)
1. Create the DEV site + allow custom script (runbook §1–§2).
2. Provision the six lists (runbook §3 — paste the browser script).
3. Upload `app/` (JS/CSS/`index.aspx`) to `SiteAssets/sled` and surface in nav (runbook §7–§8).
4. Register a few records in the app (or add via the lists) to validate round-trip (runbook §6).
5. (Optional) curator views / approval flow (runbook §5/§9); then test (§10) and sign off Phase 3.

---

## 3. Environment / target

| Item | Value |
|---|---|
| Tenant | `vw4gr.onmicrosoft.com` |
| Root | `https://vw4gr.sharepoint.com` |
| Admin | `https://vw4gr-admin.sharepoint.com` |
| **Site** | `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary` |
| App URL (after deploy) | `<site>/SiteAssets/sled/index.aspx` |
| PROD | the existing **SLED Edge** site (Phase 4) |

The app **auto-detects** its host: on `*.sharepoint.com` it reads the six live lists via same-origin REST; anywhere else (file://, localhost) it falls back to the local seed JSON. No code change between DEV and PROD — re-provision the lists and re-upload `app/` on the target site. The only host-aware logic lives in [app/js/spconfig.js](app/js/spconfig.js).

---

## 4. How to run locally (any machine)

From this folder's `app/` directory:

```powershell
cd ./SLEDEdge/app          # relative to the workspace root, wherever it lives
pwsh ./serve.ps1 -Port 8087
# open http://localhost:8087/index.html
```

You'll see the full app — Home (KPIs), Use Cases (browse via the horizontal filter bar + detail tabs), Industries, Events, Patterns, Audit, and the Register forms — reading the seed JSON in [app/data/](app/data/). Edits persist to `localStorage` in demo mode. This is exactly what the deployed page looks like — only the data source differs. (Use `index.html` locally; `index.aspx` is for SharePoint and its `<%@ Page %>` directive only renders there.)

---

## 5. Architecture cheat-sheet

```
SLEDEdge/
  PHASE-1-PLAN-AND-ARCHITECTURE.md   design (approved baseline)
  PHASE-2-PROTOTYPE-RUNBOOK.md       GUI stand-up steps (DEV)
  CHECKPOINT.md                      this file
  lists/
    sled-list-schema.json            CANONICAL six-list column definitions
    provision-sled-list-browser.js   no-PnP browser-console provisioner (idempotent)
  app/
    index.aspx                       SharePoint-renderable host page
    index.html                       local-preview host page
    css/styles.css                   HCL-derived design system (SLED rebrand)
    js/constants.js                  verticals, segments, statuses, choice lists
    js/spconfig.js                   site/list resolution + DEV/PROD auto-detect (only host-aware code)
    js/factory.js                    record builders (Industry/UseCase/Event/Pattern/Accelerator)
    js/store.js                      local (seed/localStorage) + SharePoint REST persistence
    js/data.js                       in-memory db, lookups, metrics, persistence glue
    js/app.js                        router, all pages, Register/Edit forms, Audit
    data/                            seed JSON (local preview ONLY — do not deploy)
    serve.ps1                        local preview server
```

The column maps in [app/js/store.js](app/js/store.js) (`MAPS`) are the source of truth; keep [lists/sled-list-schema.json](lists/sled-list-schema.json) and the provisioning script aligned with them whenever a field changes.

---

## 6. Moving to a new VM

The code is portable — nothing depends on the absolute path. See the workspace-level guide in [../CHECKPOINT.md](../CHECKPOINT.md#8-moving-to-a-new-vm). In short:

1. Copy the **entire workspace folder** (the parent of `SLEDEdge/`) to the new VM — keep the internal structure intact; the absolute location can be anything.
2. Ensure **PowerShell 7** (`pwsh`) is installed for the local preview server (`winget install Microsoft.PowerShell`).
3. Verify the prototype runs: `cd ./SLEDEdge/app; pwsh ./serve.ps1 -Port 8087` → open the URL.
4. Nothing in the SharePoint deploy path is machine-specific — the runbook steps are all done in the browser against the tenant above, so they work identically from any VM.

> Docs in this folder use **relative paths** so they stay correct after the copy. If you ever see an absolute `d:\...` path, treat it as illustrative and substitute the new workspace root.

---

## 7. Session log — 2026-06-29 (resume here tomorrow)

### Done today — 7-point simplification of the prototype (all verified locally at `localhost:8087`)
1. **Pipeline removed entirely** — deleted the `pagePipeline` page, removed it from `ROUTES`, dropped the **Pipeline** nav link from both [app/index.html](app/index.html) and [app/index.aspx](app/index.aspx), and removed the `inPipeline` field + `needsPipelineOwner` helper across [factory.js](app/js/factory.js), [store.js](app/js/store.js), [data.js](app/js/data.js) and the seed JSON. `programMetrics` no longer returns `inPipeline`/`noOwner`.
2. **Registration** — removed the "Flag for the productionization pipeline" checkbox from the use-case form.
3. **Removed Next step + Lessons** (and Demo URL, see #5) from the form, `readUseCase`, factory, store, data, seed, schema and provisioning script.
4. **Owner retained** — `ownerName` + `ownerEmail`; shown on cards (👤) and in the Overview, edited under a renamed "Owner & artifacts" form section.
5. **Demo URL removed** everywhere.
6. **Renamed** "Reusable pattern / accelerator" → **"Reusable pattern / Solution accelerator"** in the Register hub, the pattern page heading, and both nav dropdowns.
7. **Use Cases filters reworked** — replaced the left sidebar facets with a horizontal **filter bar** (Industry, Segment, Solution Play, Status, Tags, Search) + **Clear filters** button + a live **`COUNT: n`**. New CSS classes `.filterbar/.filter-fields/.filter-field/.filter-foot/.filter-count` added to [app/css/styles.css](app/css/styles.css).

Lists kept in sync: [lists/sled-list-schema.json](lists/sled-list-schema.json) and [lists/provision-sled-list-browser.js](lists/provision-sled-list-browser.js) had the `InPipeline`, `NextStep`, `DemoUrl`, `Lessons` columns removed from `SLEDUseCases`. No errors in any JS/JSON.

### Pick up tomorrow
- **Deploy to the DEV SharePoint site** — runbook §1–§3 (create site + allow custom script + provision the six lists), then §7–§8 (upload `app/` to `SiteAssets/sled`, surface in nav), then §6 round-trip validation. The lists/provisioning script is already updated for the simplified UseCases columns.
- Optional polish: tidy the now-unused legacy `.browse/.facets/.savedviews` rules and the dead `/* Pipeline funnel */` block in [app/css/styles.css](app/css/styles.css) (harmless, left in place).
- The browser tab may be cached — hard-reload (append `?v=N` to the URL) when re-verifying.

---

## 8. Session log — 2026-07-08 (GitHub publish, docs, demo data seeded to SharePoint)

### GitHub repository
- Published `SLEDEdge/` to **https://github.com/shaikhanwar/slededge** (branch `main`). Git was not installed on this machine — installed **Git for Windows** via winget; Git Credential Manager handled auth. Commit author: `shaikhanwar <shaikh.anwar@live.com>` (local repo config).
- The repo root **is** the `SLEDEdge/` folder. The remote had an auto-generated `README.md` which was merged (kept ours).
- **Not pushed / local only:** the `.pptx` deck (git-ignored) and all demo seed-data edits below — the user explicitly wanted demo data kept out of git.

### Docs authored (in repo)
- [README.md](README.md) — made **self-contained**: inlined the flow diagrams, full step-by-step SharePoint deployment, and the modern-page embedding guide (plus a Table of Contents). The `docs/` files remain as standalone copies.
- [docs/FLOW-DIAGRAM.md](docs/FLOW-DIAGRAM.md) — 4 Mermaid diagrams (component architecture, DEV/PROD host-detection flow, approval sequence, DEV→PROD deployment).
- [docs/SHAREPOINT-DEPLOYMENT.md](docs/SHAREPOINT-DEPLOYMENT.md) — 9-step deploy guide + troubleshooting.
- [docs/EMBED-IN-MODERN-PAGES.md](docs/EMBED-IN-MODERN-PAGES.md) — Embed web part / iframe guidance.
- New docs use generic `https://<tenant>.sharepoint.com` placeholders. **Note:** the older phase docs (`CHECKPOINT.md`, `PHASE-1`, `PHASE-2`) still contain the real `vw4gr` tenant URLs — scrub if the repo must be fully sanitized.

### Demo data added (from the FY26 CAF deck, `FY26 Results & FY27 CAF Strategy (1).pptx`)
All seed edits are **local only** (in `app/data/`), not committed:
- **Use Cases** — added `UC-007`…`UC-013` (NYC AI Hackathon, Louisiana OTS App-in-a-Day, Florida App/AI-in-a-Day, NYC legacy app-mod, NYC workflow automation, NYC resident chatbots, NYC NL dashboards). All fields populated; each links to a pattern (`patternId`) and has demo owner + reference/repo URLs. Total now **13** use cases in [app/data/usecases.json](app/data/usecases.json) (top key is `useCases`).
- **Patterns** — added `PAT-003`…`PAT-007`; **Accelerators** — added `ACC-003`…`ACC-009`, in [app/data/patterns.json](app/data/patterns.json). Totals: **7 patterns / 9 accelerators**.
- **Events** — added `EV-004`…`EV-009` (the hackathons + honorable mentions) in [app/data/events.json](app/data/events.json). Total **9** events. *(Not seeded to SharePoint — see below.)*

### Seeded to the LIVE SharePoint lists (scope: Use Cases, Patterns, Accelerators only)
- Built a one-paste browser-console seeder: [lists/seed-sled-data-browser.js](lists/seed-sled-data-browser.js). It embeds the seed JSON, resolves the site from the page URL, gets a form digest, and POSTs to `SLEDUseCases` / `SLEDPatterns` / `SLEDAccelerators` over same-origin REST as the signed-in user. **Idempotent** (skips records whose `UseCaseId`/`PatternId`/`AcceleratorId` already exists). Column mapping mirrors [app/js/store.js](app/js/store.js) `MAPS`.
- **Bug fixed mid-run:** first paste created 7 patterns + 9 accelerators but **0 use cases** because the script read `UC.usecases` while the file key is `useCases`. Fixed to `UC.useCases || UC.usecases` (line ~294). Second paste created the 13 use cases.
- **User confirmed the test data was added successfully** on `https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary`.

### Environment facts learned (this machine)
- **PowerShell 7 (`pwsh`) is NOT installed** — only Windows PowerShell 5.1. Run `serve.ps1` with `powershell -File .\serve.ps1 -Port 8087` (the `HttpListener` `Add-Type` warning is harmless; the server still starts). `node` is also not installed.
- Local preview server was left running during the session on port 8087 — **stopped at end of session.**

### Pick up next
- Optional: seed **Events** (`EV-004…009`) to SharePoint too — extend the seeder's `MAPS` with a `SLEDEvents` entry (columns per `store.js` MAPS `events`).
- Optional: sanitize the older phase docs (remove `vw4gr` tenant references) if the public repo should be fully generic.
- Optional: replace the generic seed records `UC-001…006` with real content, or delete them from the lists.
