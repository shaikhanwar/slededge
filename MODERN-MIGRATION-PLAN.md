# SLED Use Case Library — Modern SharePoint Migration Plan

**Status:** 📋 Planning / feasibility — **no build has started.** Revisited 2026-07-20 (new machine); direction firmed (see §6).
**Author:** (fill in) · **Created:** 2026-07-13 · **Track:** `SLEDEdge/`
**Current direction:** **SPFx (React) — Option B — is the recommended platform.** Every alternative is eliminated by a hard constraint: custom script/classic aspx (NoScript tenant-wide, no exception), Power Apps/Option C (developer environment only, not licensed for production), out-of-box modern (UX downgrade), external Azure host/Option D (external infra + Entra app reg the design avoided). SPFx is the only path that keeps the full custom UX **and** runs on a NoScript site (trusted via the App Catalog, which is confirmed to exist). The **only** open item is confirming we can *publish* our own `.sppkg` (Phase 0 gate). **Option E (out-of-box web parts)** remains the fallback if no publish path exists. Classic left untouched throughout.

> **Purpose of this document.** Record *why* we must move, *what actually
> breaks*, the *options* available, a *feasibility* read on each, and a
> *recommended phased plan* — **before** any code is written. The existing
> **classic** version stays exactly as-is; the modern version is built in
> **parallel** and only replaces it after sign-off.

---

## 1. Why we're here (the blocker)

The current app is a zero-build, vanilla **ES-module single-page app** served as
`SiteAssets/sled/index.aspx`. That page carries `<script type="module">`, which
means it **requires "Allow users to run custom script"** to be enabled on the
site.

Our tenant now has **custom script DISABLED tenant-wide** (`NoScript` /
`DenyAddAndCustomizePages = 1`). Consequently:

- The classic `index.aspx` doorway **will not execute** in PROD (the SLED Edge
  hub). Scripts are stripped / the page won't run.
- The **Embed web part iframe** doorway to that same `index.aspx` also fails,
  because it still points at a script-hosting aspx.
- We **cannot** simply "turn custom script back on" — it's a tenant governance
  control, not a per-site exception we own.

## 2. What actually breaks vs. what still works

This is the most important scoping fact and shapes every option below.

| Layer | Status on a NoScript / modern site | Notes |
|---|---|---|
| **6 SharePoint lists + doc library** | ✅ Unaffected | Data model does **not** change. Reusable as-is. |
| **SharePoint REST API** (`_api/web/lists`, `contextinfo`, `X-RequestDigest`) | ✅ Works | The app's entire read/write layer (`store.js`, `docs.js`, `auth.js`) is standard same-origin REST — allowed on modern sites. |
| **Power Automate approval flow** | ✅ Unaffected | Bound to the list, independent of the UI host. |
| **Custom `<script>` in an aspx / SiteAssets** | ❌ Blocked | This is the *only* thing NoScript removes — our current hosting mechanism. |
| **Script Editor / Content Editor web parts** | ❌ Blocked | Classic script-injection web parts are disabled by NoScript. |

> **Why do the other `.aspx` pages on SLED Edge run, then?** Because they are
> **modern pages**, not classic script pages. Every modern page (`+ New → Page`)
> is saved as an `.aspx` in the **Site Pages** library, but it contains **no
> custom code** — it is a canvas of **Microsoft first-party web parts** (Text,
> Hero, Quick Links, Events, Embed, Power Apps, …) rendered by SharePoint's own
> framework (`sp-pages-assembly`, `spwebworker.js`, …). NoScript blocks **your**
> custom `<script>`, not Microsoft's page framework. So modern pages + built-in
> web parts always work; the classic `index.aspx` (which carries our own
> `<script type="module">`) does not. The `.aspx` extension is not the signal —
> *whose* code runs on the page is.

**Conclusion:** ~85% of the solution (data model, REST layer, business logic,
approval flow) is portable. We are replacing the **hosting + presentation shell**
only, not rebuilding the system.

## 3. Guiding principles

1. **Keep the classic version intact.** No edits to the existing `app/` code or
   the DEV deployment. It remains the reference and a working fallback on the
   custom-script-allowed DEV site.
2. **Do not touch the 6 lists / library or their internal column names.** The
   modern app talks to the **same lists**. This is what makes migration low-risk.
3. **Build in parallel, cut over on sign-off.** The modern app is a new artifact
   in a new folder; nothing in PROD changes until it's validated.
4. **Prefer the Microsoft-sanctioned modern path** that survives NoScript with no
   governance exceptions and no external infrastructure.
5. **Reuse before rewrite.** Favor options that let us carry over the existing
   vanilla JS logic rather than re-implement it.

## 4. Options considered

Five options, from "reuse the most code" to "no-code". Effort is relative
(S/M/L), not a schedule.

### Option A — SPFx web part that reuses the existing vanilla JS ⭐ *(recommended)*

Package the current app as a **SharePoint Framework (SPFx) client-side web
part**. SPFx is *the* Microsoft-approved way to run custom UI/JS on modern,
NoScript sites — the package is trusted via the tenant **App Catalog**, so the
per-site custom-script switch is irrelevant.

- The web part's `render()` mounts the existing DOM into its container element;
  we lift-and-shift `app.js`, `store.js`, `data.js`, `factory.js`, `auth.js`,
  `docs.js`, `constants.js` largely as-is.
- Swap the site-URL resolution to use the SPFx **page context**
  (`this.context.pageContext.web.absoluteUrl`) instead of `_spPageContextInfo`,
  and (optionally) use `SPHttpClient` instead of raw `fetch` + manual digest.
- Ship as one `.sppkg`; drop the web part onto a **modern Site Page** on SLED
  Edge.

| | |
|---|---|
| **Effort** | **M** — mostly wrapping, not rewriting. |
| **Reuse** | **High** (~80–90% of current JS/CSS). |
| **Modern-compliant** | ✅ Yes — sanctioned for NoScript. |
| **New infra** | Tenant **App Catalog** + package approval; a Node/gulp build toolchain (dev-time only). |
| **Risk** | Low–Medium — build toolchain setup + one-time package deployment governance. |

### Option B — SPFx web part, full React + Fluent UI rewrite

Same SPFx hosting as A, but re-implement the UI in **React + Fluent UI** for the
most "native modern SharePoint" look and long-term maintainability.

| | |
|---|---|
| **Effort** | **L** — full UI rewrite of ~1,000 lines of render logic. |
| **Reuse** | Medium (data/logic reused; all rendering rebuilt). |
| **Modern-compliant** | ✅ Yes. |
| **New infra** | Same as A. |
| **Risk** | Medium — largest build effort; best end state. |

### Option C — Power Apps (canvas / custom page) over the same lists

Rebuild the UI as a **Power App** bound to the six SharePoint lists, surfaced in
SLED Edge via the Power Apps web part or a custom page.

| | |
|---|---|
| **Effort** | **M–L** — visual rebuild of every screen; complex filter/detail UX is harder to match. |
| **Reuse** | Low (UI rebuilt; lists reused). |
| **Modern-compliant** | ✅ Yes — fully governed, no custom script. |
| **New infra** | Power Platform environment + licensing; premium connectors if scaled. |
| **Risk** | Medium — licensing/governance, UX parity gaps vs. the current rich SPA. |

### Option D — External host (Azure Static Web App) + embed

Host the exact SPA on an external origin (e.g., Azure Static Web Apps) and embed
it, authenticating to SharePoint via **MSAL + Microsoft Graph / SharePoint API**.

| | |
|---|---|
| **Effort** | **L** — add auth (app registration, tokens, CORS), swap same-origin REST for Graph, allow-list the origin. |
| **Reuse** | Medium (UI reused; entire data/auth layer reworked). |
| **Modern-compliant** | ✅ Page-wise, but introduces **external infra + Entra app registration + admin consent** — the very things the current design avoided. |
| **New infra** | Azure hosting, Entra app registration, HTML Field Security allow-listing. |
| **Risk** | High — most moving parts, cross-origin auth, extra approvals. |

### Option E — Out-of-box, no-code modern pages

Drop the custom app entirely; use **native List web parts, list views, and JSON
column/view formatting** on modern pages.

| | |
|---|---|
| **Effort** | **S** — configuration only. |
| **Reuse** | Lists only; no app. |
| **Modern-compliant** | ✅ Yes. |
| **New infra** | None. |
| **Risk** | Low technically, but **loses the curated SPA UX** (guided register forms, role-aware detail tabs, KPIs, audit flow). Likely a downgrade in experience. |

## 5. Feasibility summary

| Option | Reuse | Effort | Modern-compliant | New infra / approvals | UX parity | Overall feasibility |
|---|---|---|---|---|---|---|
| A — SPFx (reuse JS) | High | M | ✅ | App Catalog + build toolchain | ✅ Full | Strong (if App Catalog) |
| **B — SPFx (React rewrite)** | Med | L | ✅ | App Catalog + build toolchain | ✅ Full+ | ⭐ **Primary — if App Catalog reachable** |
| C — Power Apps | Low | M–L | ✅ | Power Platform + licensing | ⚠ Partial | ❌ Ruled out (dev env only) |
| D — External SWA + embed | Med | L | ✅* | Azure + Entra app reg | ✅ Full | Least preferred (admin walls) |
| **E — Out-of-box no-code** | None | S | ✅ | None | ❌ Downgrade | ⭐ **Fallback — if no App Catalog** |

\* Compliant at the page level, but reintroduces external hosting + app
registration the current design deliberately avoided.

## 6. Decision

### Revised decision (2026-07-13, v3): it comes down to App Catalog access
Two paths have now been eliminated by hard constraints:
- **Custom script** (classic aspx) — blocked tenant-wide (NoScript).
- **Power Apps (Option C)** — **ruled out:** only a **Developer environment** is
  available, which is **not licensed for production use**.

That leaves exactly **two** viable paths, and the choice between them depends on a
single question — **can we deploy to an App Catalog?**

| If… | Then build | UX parity |
|---|---|---|
| **An App Catalog is reachable** (tenant, or a site-collection catalog on `/teams/CRISP`) | **Option B — SPFx (React)** | ✅ Full parity — the target |
| **No App Catalog at all** | **Option E — out-of-box web parts** (List views + JSON formatting + Quick Links) | ❌ Reduced scope / downgrade |

**Lead to chase:** a **site owner** appears to manage several working
sites and may already have an "App" deployment path. **If a site owner can deploy
apps, SPFx is unblocked and becomes the plan.** Confirming this is now the single
decisive action (see the Phase 0 gate).

> **Update (2026-07-13):** the tenant **"Apps you can add" page confirms a tenant
> App Catalog EXISTS** and the org already runs many **custom SPFx apps** (plus
> visible `Test/UAT/SIT` apps implying an established submission pipeline). So SPFx
> is **feasible**. The remaining question narrows from *"does a catalog exist?"*
> (yes) to **"how do we get OUR `.sppkg` published into it?"** — i.e. do we have
> **publish** rights (App Catalog owner / SharePoint admin) or a **submission
> process**, versus the *consume* rights ("Add" an existing app) already
> confirmed. Check: open the App Catalog site \u2192 **Apps for SharePoint** library \u2192
> is there an **Upload/+ New**? If not, find the submission process; else use a
> **site-collection App Catalog** on `/teams/CRISP`.

> **Note on the hub's `.aspx` pages:** their Network traces are **100% first-party
> Microsoft** scripts (`sp-*`, `sb-*`, `suiteux.*`, `spwebworker.js`, `ms-odsp-*`)
> — the modern page framework + suite shell, **not** custom code. They are **not**
> evidence of an App Catalog. A custom SPFx bundle would instead load from
> `ClientSideAssets` / the SharePoint CDN with the solution's own name.

<details>
<summary><strong>Option B (SPFx) — the preferred target if App Catalog is available</strong></summary>

**Option B — SPFx built in React, preserving current functionality as-is.**
Full control to replicate the rich catalog UX (filter bar, tabbed detail views,
KPI home, guided register wizards, role-aware UI, document uploads), reuses the
existing data/business logic (`store.js`, `factory.js`, `auth.js`, `docs.js`),
needs no external infrastructure and no Entra app registration, and talks to the
same six lists with no data migration. **Blocked only by the App Catalog
question.** For SPFx, lists are created by an admin-only in-app self-provisioning
routine using exact internal names (manual/one-time, create-if-missing, scoped to
the seven SLED names, additive-only — never touches other hub lists).

</details>

<details>
<summary><strong>Option E (out-of-box web parts) — the fallback if no App Catalog</strong></summary>

No custom code at all. Create the six SLED lists in the hub, then build modern
pages using **List web parts / list views**, **JSON column & view formatting**
(for status pills, cards, conditional styling), **Highlighted Content**, and
**Quick Links**. Register/edit happens through the **native list forms** (which
can be tailored with **Format this form** / conditional show-hide). This loses the
guided wizards, custom filter bar, and tabbed detail experience, but needs no
admin, no App Catalog, and no custom script.

</details>

### Delivery shape (page-in-hub, either path)
Either path is surfaced the same way: a **new modern page inside the SLED Edge
hub** (`microsoft.sharepoint.com/teams/CRISP`), reached from a **Quick Links
tile** on the hub home (like the existing "Frontier & Industry Use Cases" tiles).
The six SLED lists live in the hub's **Site Contents**.

```
SLED Edge hub (microsoft.sharepoint.com/teams/CRISP)
   ├─ Home page ...... existing GTM Resources tiles + NEW "Use Case Library" tile ─┐
   ├─ NEW modern page ── SPFx web part (if App Catalog)  ── OR ── out-of-box parts ─┘
   └─ Site Contents ...... the 6 lists + SLEDSolutionArchitecture library live HERE
```

**Trade-off accepted:** the **six lists + doc library live in the SLED Edge site's
Site Contents** and inherit its permissions (no separate site to isolate them).

### List provisioning
The six SLED lists are created in the hub, **SLED names only**. Method depends on
the path:

- **SPFx path:** an admin-only in-app **self-provisioning** routine creates them
  via `SPHttpClient` with exact internal names — manual/one-time,
  create-if-missing, additive-only. (SPFx addresses columns by exact internal
  name, so this guarantees a match.)
- **Out-of-box path:** create the lists **by hand in the UI** or **import the
  existing CSVs** ([`lists/`](lists/)) via **Site contents → New → List → From
  CSV/Excel**; view/form formatting binds to whatever columns exist.

**HARD REQUIREMENT — protect the hub's other lists:** only ever **create** the
seven SLED artifacts — `SLEDIndustries`, `SLEDUseCases`, `SLEDEvents`,
`SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog`, and the
`SLEDSolutionArchitecture` library. **Never** edit, rename, retype, or delete any
other list on `/teams/CRISP`. All existing GTM lists are out of scope.

### Why aspx / custom code is out (and what unblocks SPFx)
The classic `index.aspx` is **the blocked artifact** — inline `<script>` only runs
when "Allow custom script" is ON (now OFF tenant-wide). On modern sites the only
sanctioned way to run **custom code** is **SPFx**, distributed through an **App
Catalog** (the tenant trust boundary). **No App Catalog = no custom code.** If a
**site owner** (or an admin) can enable a **site-collection App Catalog** on
`/teams/CRISP` (`Add-SPOSiteCollectionAppCatalog`) or grant access to the tenant
App Catalog, **SPFx (Option B) is unblocked**; otherwise we fall back to
out-of-box web parts (Option E).

### Confirmed answers
| Question | Answer |
|---|---|
| Option | **Option B (SPFx) if App Catalog reachable, else Option E (out-of-box)** |
| Power Apps (Option C) | **Ruled out** — only a Developer environment (not for production) |
| Deciding factor | Can a **site owner** deploy to an App Catalog? (Phase 0 gate) |
| Delivery / surfacing | New modern **page in the SLED Edge hub** + a **Quick Links tile** |
| Where the 6 lists live | In **SLED Edge Site Contents** (page-in-hub trade-off) |
| How lists are created | SPFx: in-app self-provision (exact names) · Out-of-box: UI / CSV import |
| Classic version | **Leave as-is.** New work lives in a new top-level **`ModernSP/`** folder |

### Still open (Phase 0 gate)
1. **Decisive (narrowed):** a tenant **App Catalog is confirmed to exist** (org runs custom SPFx apps). Remaining question = **can we publish OUR `.sppkg`** — do we have **App Catalog owner / SharePoint admin** upload rights, or a **submission process**? (Consume/“Add” rights are already confirmed.) → **Publishable = Option B (SPFx)** · **Not publishable & no site-collection catalog = Option E**.
2. Confirm OK to create the **six SLED lists in the hub** (UI / CSV or self-provision).
3. If SPFx: confirm build toolchain (Node LTS + supported SPFx generator).

## 7. Phased plan

> The **classic version is never modified.** New work lives in a new top-level
> **`ModernSP/`** folder (SPFx solution, or list schema/CSVs + page config docs
> for the out-of-box path). Both paths target the **SLED Edge hub**.

**Path A — SPFx (if App Catalog reachable):**

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 — Prerequisites** | Confirm App Catalog access via a site owner; pin Node/SPFx versions | App Catalog path confirmed |
| **1 — SPFx scaffold (React)** | Empty full-width web part on a test page + workbench | Renders on a NoScript modern page |
| **2 — Self-provisioning setup** | In-app "Initialize library" creates the 6 lists (exact names, SLED-only) | Lists present; other hub lists untouched |
| **3 — Data + logic layer** | Port `store/factory/auth/docs/constants`; SPFx page context + `SPHttpClient` | Read-path parity |
| **4 — UI rebuild (React/Fluent)** | Home KPIs, use cases + filter bar + detail tabs, industries, events, patterns, audit, register wizards | Visual + functional parity signed off |
| **5 — Write path & roles** | Register/edit/upload + role-aware UI; re-verify approval flow | Full CRUD + audit verified |
| **6 — Package & go-live** | `.sppkg` to App Catalog; new page + Quick Links tile on the hub | Users on modern; classic remains as-is |

**Path B — Out-of-box (fallback, no App Catalog):**

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 — Prerequisites** | Confirm App Catalog truly unavailable; agree reduced scope | Scope signed off |
| **1 — Lists in the hub** | Create the 6 SLED lists via UI / CSV import (SLED names only) | Lists present; other hub lists untouched |
| **2 — Views & formatting** | List views + JSON column/view formatting (status pills, cards) | Browse/filter via list UX |
| **3 — Pages** | Modern pages with List / Highlighted Content / Quick Links web parts | Home + entity pages built |
| **4 — Forms** | Tailor native list forms (Format this form, conditional show/hide) | Register/edit via list forms |
| **5 — Approval & go-live** | Re-verify approval flow; new page + Quick Links tile on the hub | Live in-hub; classic remains as-is |

## 8. Coexistence & rollback

- **Classic is left as-is** (untouched code + its custom-script-allowed **DEV** site).
  It remains a working fallback; no decommission is planned.
- **Build safely:** develop on a **test page / limited audience** before adding the
  tile to the hub home — blast radius stays near zero.
- **At go-live:** SLED Edge gets a new page + a Quick Links tile pointing to it.
  No existing hub content is removed.
- **Rollback:** remove the tile/page; the six SLED lists are the only new data and
  are self-contained, so nothing else is affected.

## 9. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **App Catalog unreachable** (`microsoft.sharepoint.com`) | No SPFx → downgrade to out-of-box | **Decisive Phase 0 check via a site owner.** If truly unavailable, accept Option E (reduced scope) |
| Power Apps not viable (dev env only) | Removes Option C | Already accepted — excluded from the plan |
| Editing the **hub's other lists** by mistake | Breaks GTM content | Create **only** the seven SLED lists; never touch any other list on `/teams/CRISP` |
| **UX downgrade** on the out-of-box path | Stakeholder disappointment | Set expectations up front; prefer SPFx if App Catalog is granted |
| Lists hand-created (out-of-box path) internal-name drift | Minor formatting/reference friction | Not fatal for list UX; for SPFx use in-app self-provisioning with exact names |
| App/page added to the **production hub** prematurely | Blast radius on SLED Edge | Build on a test page / limited audience; add the tile only after sign-off |
| SPFx build toolchain unfamiliar | Slows the SPFx path | Pin supported Node LTS + SPFx generator; keep scaffold minimal |

---

### Appendix — current architecture reference

- **Host page:** `app/index.aspx` (classic, script-hosting — the blocked piece).
- **Data layer:** `app/js/store.js`, `app/js/docs.js` — same-origin REST
  (`_api/web/lists`, `contextinfo`, `X-RequestDigest`). **Portable.**
- **Host detection / site URL:** `app/js/spconfig.js` — the single place to
  repoint for SPFx page context.
- **Business logic / UI:** `app/js/app.js` (router + renderers), `factory.js`,
  `data.js`, `auth.js`, `constants.js`, `app/css/styles.css`. **Reusable.**
- **Lists (unchanged):** `SLEDIndustries`, `SLEDUseCases`, `SLEDEvents`,
  `SLEDPatterns`, `SLEDAccelerators`, `SLEDAuditLog` + `SLEDSolutionArchitecture`
  library.
