# ModernSP — SPFx (App Catalog) Preparation Runbook

**Goal:** rebuild the SLED Use Case Library as a **modern SharePoint** app that runs
on the NoScript SLED Edge hub, using **SPFx** deployed through an **App Catalog**.
This folder holds the modern rebuild; the **classic** version in `../app/` stays
untouched.

> **Gate:** everything past “Step 0” starts only after a **site owner (or an
> admin) confirms App Catalog access** (see §1). If the answer is *no*, we switch
> to the out-of-box fallback (see the main plan
> [../MODERN-MIGRATION-PLAN.md](../MODERN-MIGRATION-PLAN.md), Path B).

---

## 1. The gate — confirm App Catalog access

A tenant **App Catalog is confirmed to exist** (the org's “Apps you can add” page
lists many custom SPFx apps). So SPFx is **feasible**; the remaining question is
narrower — **can we publish OUR package into it?**

- **Consume rights (confirmed):** a site owner can **“Add”** an already-published
  app to a site.
- **Publish rights (to verify):** uploading a **new `.sppkg`** needs an **App
  Catalog owner / SharePoint admin**, or an org **submission process** (the
  visible `Test/UAT/SIT` apps imply one exists).

**Verify publish:** open the **App Catalog site → Apps for SharePoint** library —
is there an **Upload / + New**? If yes → we can publish. If no → find the
submission process, or enable a **site-collection App Catalog** on `/teams/CRISP`.
If none of these work, use the out-of-box fallback (main plan, Path B).

> **Publishing is never done from the "My apps" page** — that page only *adds*
> existing apps. Not seeing a "publish" option there means nothing about your
> rights.

### Split the environments (build vs. go-live)
| Environment | Role | Use |
|---|---|---|
| **Dev tenant** (separate sandbox; you are likely admin) | Build & test | Create an App Catalog there yourself (SP admin center → More features → Apps → App Catalog), publish freely, test end-to-end on the hosted **workbench** |
| **Production** (`microsoft.sharepoint.com`, App Catalog confirmed) | Go-live | Submit the finished `.sppkg` via the **"My requests" / app-request process** (the `Test/UAT/SIT` apps got in this way), or an App Catalog owner uploads it |

> The dev sandbox's empty apps list is **not a blocker** — it just has no App
> Catalog yet. It's the ideal place to build because you control it.

---

## 2. The two App Catalog options (either one works)

| Type | Who enables it | Scope | How we deploy |
|---|---|---|---|
| **Tenant App Catalog** | SharePoint admin (already exists on most tenants) | Whole tenant | Upload `.sppkg` once; enable for the SLED Edge site |
| **Site-collection App Catalog** on `/teams/CRISP` | Admin runs `Add-SPOSiteCollectionAppCatalog` once | Just this site | An **“Apps for SharePoint”** library appears; the **site owner** uploads the `.sppkg` there |

> **Preferred for us:** the **site-collection App Catalog** on `/teams/CRISP` — it
> keeps everything inside the site the owner already controls and needs no
> tenant-wide rights after the one-time enablement.

**Check what exists (any of these):**
- Site contents → look for an **“Apps for SharePoint”** library.
- `Get-PnPTenantAppCatalogUrl` (tenant) / `Get-PnPSiteCollectionAppCatalog` (site).
- SharePoint Admin Center → **More features → Apps → App Catalog**.

---

## 3. Developer toolchain (set up while we wait on the App Catalog answer)

SPFx needs a specific Node.js version — **match the SPFx compatibility matrix**
(don’t use the newest Node blindly).

- **Node.js LTS** — use the version supported by the SPFx generator we install
  (currently Node 18/20/22 depending on SPFx version). Install via `nvm` so we
  can switch.
- Global tools:
  ```powershell
  npm install -g gulp-cli yo @microsoft/generator-sharepoint
  ```
- Verify:
  ```powershell
  node -v ; npm -v ; yo --version ; gulp -v
  ```

> We can install the toolchain and even **scaffold the project now** — only the
> final **deploy** step needs the App Catalog.

---

## 4. Scaffold the web part (Step 1 of the build)

```powershell
# from SLEDEdge/ModernSP
yo @microsoft/sharepoint
#  Solution name:            sled-use-case-library
#  Component type:           WebPart
#  Framework:                React
#  Target:                   SharePoint Online only (latest)
#  Deployment:               tenant-wide? (No — we scope to the site)
```

- Make it a **full-page** experience: place a single web part on a **Single Part
  App Page** (or a full-width section) so it fills the page like the classic app.
- Local dev uses the **hosted workbench** on a test site:
  `https://microsoft.sharepoint.com/teams/CRISP/_layouts/15/workbench.aspx`
  (run `gulp serve --nobrowser`).

---

## 5. Reuse the existing logic (Step 2–3)

The classic app’s **data + business logic is portable**; only the site-URL/REST
plumbing changes to SPFx context. Map:

| Classic file (`../app/js/`) | Modern use |
|---|---|
| `store.js`, `docs.js` | Data access — swap raw `fetch`+digest for **`SPHttpClient`** / SPFx page context |
| `spconfig.js` | Replace host detection with `this.context.pageContext.web.absoluteUrl` |
| `factory.js`, `data.js`, `auth.js`, `constants.js` | Reuse largely as-is |
| `app.js`, `css/styles.css` | Re-implement rendering in **React/Fluent** (parity, not lift-and-shift) |
| `../lists/sled-list-schema.json` | Drives the self-provisioning routine |

---

## 6. Self-provisioning the six lists (Step 2, safety-critical)

An **admin-only “Initialize library”** button in the web part creates the lists
via `SPHttpClient`. **Hard rules (protect the hub’s other lists):**

1. **Manual, one-time** — never on page load or a timer.
2. **Create-if-missing only** — never delete/rename/retype/empty anything.
3. **Scoped to seven exact names** — `SLEDIndustries`, `SLEDUseCases`,
   `SLEDEvents`, `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`, and the
   `SLEDSolutionArchitecture` library. Never enumerate or touch any other list.
4. **Additive-only** on existing SLED lists (add a missing column at most).
5. **Idempotent no-op** if re-run.

---

## 7. Build, package & deploy (Step 6 — needs the App Catalog)

```powershell
gulp bundle --ship
gulp package-solution --ship
#  -> produces sharepoint/solution/sled-use-case-library.sppkg
```

Then:
1. Upload `sled-use-case-library.sppkg` to the **App Catalog**
   (tenant catalog, or the site’s **“Apps for SharePoint”** library).
2. **Deploy / Trust** the solution.
3. On SLED Edge: **Site contents → + New → App → add** the SLED app.
4. Create a **new full-width modern page**; add the **SLED web part**.
5. Run **“Initialize library”** once (creates the six lists).
6. Add a **Quick Links tile** on the hub home pointing to the new page.

---

## 8. Prep checklist

- [ ] **Site owner confirms App Catalog access** (§1) — the gate
- [ ] Which catalog: tenant vs. site-collection on `/teams/CRISP` (§2)
- [ ] Node LTS + `gulp-cli`, `yo`, `@microsoft/generator-sharepoint` installed (§3)
- [ ] Project scaffolded (`sled-use-case-library`) (§4)
- [ ] `gulp serve` works on the hosted workbench (§4)
- [ ] Data layer ported to `SPHttpClient` + SPFx context (§5)
- [ ] Self-provisioning routine built to the safety rules (§6)
- [ ] React UI parity with the classic app (§5)
- [ ] `.sppkg` built, deployed, web part on a page, lists initialized (§7)
- [ ] Quick Links tile added; classic left untouched (§7)

> Full context, options and phased plan:
> [../MODERN-MIGRATION-PLAN.md](../MODERN-MIGRATION-PLAN.md).
