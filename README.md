# SLED Use Case Library (SLEDEdge)

An internal Microsoft catalog of **reusable use cases** across the five SLED
verticals — **State & Local Government, Public Safety & Justice, Public Health &
Social Services, Transportation & Urban Infrastructure, and Education.** It lets
Microsoft teams **contribute** use cases, **browse** them by industry / segment /
keyword, and **reuse** proven scenarios — surfaced through a modern SharePoint
Online page inside the **SLED Edge** GTM hub.

Delivered entirely on **Microsoft 365 no-code / low-code**: six SharePoint
**Lists** (data) + a zero-build, single-page app (`index.aspx`) that browses,
registers and edits every entity over same-origin REST, with an optional Power
Automate approval flow.

> **No build step, no SPFx, no app registration.** The app is plain ES modules.
> On `*.sharepoint.com` it reads/writes the live lists; anywhere else
> (localhost / `file://`) it falls back to bundled seed JSON. The only
> host-aware code lives in [`app/js/spconfig.js`](app/js/spconfig.js).

---

## Contents

| Doc | What it covers |
|---|---|
| [docs/FLOW-DIAGRAM.md](docs/FLOW-DIAGRAM.md) | Architecture & data-flow diagrams (Mermaid) |
| [docs/SHAREPOINT-DEPLOYMENT.md](docs/SHAREPOINT-DEPLOYMENT.md) | Step-by-step SharePoint Online deployment |
| [docs/EMBED-IN-MODERN-PAGES.md](docs/EMBED-IN-MODERN-PAGES.md) | *(Optional)* Embedding the app in a SharePoint modern page |
| [PHASE-1-PLAN-AND-ARCHITECTURE.md](PHASE-1-PLAN-AND-ARCHITECTURE.md) | Full architecture, data model & governance plan |
| [PHASE-2-PROTOTYPE-RUNBOOK.md](PHASE-2-PROTOTYPE-RUNBOOK.md) | Detailed GUI-first prototype stand-up runbook |

---

## Features

- **Home** — KPIs / coverage across the five verticals.
- **Use Cases** — browse with a horizontal filter bar (Industry, Segment,
  Solution Play, Status, Tags, Search) + detail tabs (Overview, Solution & Tech,
  Value & Impact, Owner & Artifacts).
- **Industries** — the five fixed SLED verticals.
- **Events** — a standalone events catalog.
- **Patterns / Solution accelerators** — reusable assets, templates and repos.
- **Audit** — soft archive / restore with a chronological change log.
- **Register hub** — guided multi-step forms for every entity that write back to
  the lists over REST.
- **Role-aware UI** — Viewer / Contributor / Curator, resolved from SharePoint
  group membership and list permissions ([`app/js/auth.js`](app/js/auth.js)).

## The six SharePoint lists

| List | Holds |
|---|---|
| `SLEDIndustries` | The five SLED verticals |
| `SLEDUseCases` | The use case system of record |
| `SLEDEvents` | Standalone events |
| `SLEDPatterns` | Reusable patterns |
| `SLEDAccelerators` | Solution accelerators / templates |
| `SLEDAuditLog` | Change / archive log |

Plus a `SLEDSolutionArchitecture` document library for per-record artifacts.

---

## Repository layout

```
SLEDEdge/
  README.md                          this file
  PHASE-1-PLAN-AND-ARCHITECTURE.md   design baseline
  PHASE-2-PROTOTYPE-RUNBOOK.md       detailed GUI stand-up steps
  CHECKPOINT.md                      crash-recovery handoff / status
  docs/
    FLOW-DIAGRAM.md                  architecture & data-flow diagrams
    SHAREPOINT-DEPLOYMENT.md         step-by-step deployment guide
    EMBED-IN-MODERN-PAGES.md         optional modern-page embedding
  lists/
    sled-list-schema.json            canonical six-list column definitions
    provision-sled-via-sitedesign.ps1  PowerShell Site Designs provisioner (no PnP)
    provision-sled-list-browser.js   browser-console provisioner (no PnP)
  app/
    index.aspx                       SharePoint host page (renders on SPO)
    index.html                       local-preview host page
    css/styles.css                   design system
    js/                              constants, spconfig, factory, store,
                                     data, docs, auth, app (ES modules)
    data/                            seed JSON (local preview ONLY — do not deploy)
    serve.ps1                        local preview server
```

---

## Run locally

Requires **PowerShell 7** (`pwsh`).

```powershell
cd ./app
pwsh ./serve.ps1 -Port 8087
# open http://localhost:8087/index.html
```

You'll see the full app reading the seed JSON in [`app/data/`](app/data/); edits
persist to `localStorage` in demo mode. Preview each role by appending
`?role=viewer|contributor|curator` to the URL. Use `index.html` locally —
`index.aspx` only renders on SharePoint.

## Deploy to SharePoint

See **[docs/SHAREPOINT-DEPLOYMENT.md](docs/SHAREPOINT-DEPLOYMENT.md)** for the
full step-by-step guide. In short:

1. Create a Communication site and **allow custom script** on it.
2. Provision the six lists with the PowerShell Site Designs script in
   [`lists/`](lists/).
3. Upload the [`app/`](app/) files (minus `data/`, `index.html`, `serve.ps1`) to
   `SiteAssets/sled/`.
4. Open `…/SiteAssets/sled/index.aspx` and (optionally) surface it in navigation
   or [embed it in a modern page](docs/EMBED-IN-MODERN-PAGES.md).

---

## Notes

- This is an **internal Microsoft** enablement tool. Replace the example tenant
  placeholders (`https://<tenant>.sharepoint.com/...`) with your own site URL.
- No secrets or credentials are stored in this repository. The app authenticates
  as the signed-in SharePoint user; SharePoint is the real security gate.
