# Changelog

All notable changes to the SLED Use Case Library (classic app) are documented
here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-07-23 — About page & contacts

### Added
- **Owners & contacts** on the About page, rendered as signature-style cards
  (name · title · org · a bold **Email** label above the address as a `mailto:`
  link): Orry Young, Jennifer Meidl, Anwar Shaikh.

### Changed
- **About page is now independent.** Removed the "Adapted from the Hackathon
  Content Library" framing and rewrote the copy to describe the library's own
  purpose — a single, searchable home for the SLED field to find, understand and
  reuse proven use cases. Refreshed the data-model row to the current eight
  entities (Industries · Verticals · Solution Plays · Use Cases · Patterns ·
  Accelerators · Events · Audit log).
- Cache-bust bumped to `styles.css?v=7`, `app.js?v=14`.

## 2026-07-23 — Browse & search filters

### Added
- **Filter bars on every browse page.** Industries, Solution Plays, Patterns and
  Events now have the same filter bar as Use Cases (a **Clear filters** button
  and a live **COUNT**), each including a **Search text** field:
  - **Industries** — search (matches name, description and vertical names).
  - **Solution Plays** — search (matches name and description).
  - **Patterns** — **Repeatability** + **Solution Play** dropdowns + search
    (name, summary, components).
  - **Events** — **Status** + **Format** dropdowns + **From date** / **To date**
    range pickers + search (title, location, themes, organizers, notes).
- Reuses the existing `.filterbar` styles and shared helpers (`opts`, `csv`,
  `solutionPlayNames`); no new SharePoint columns or list changes.

### Changed
- Cache-bust bumped: `index.aspx` loads `js/app.js?v=11`.

## 2026-07-23

### Added
- **Industry → Vertical taxonomy.** Verticals are a first-class, registrable
  entity (`SLEDVerticals`); each belongs to a parent industry. Use cases link to
  an Industry **and** a Vertical via a dependent dropdown. Industry detail pages
  list their verticals.
- **Solution Plays as data.** Microsoft solution plays are now a registrable,
  editable list (`SLEDSolutionPlays`) instead of a hardcoded choice set, with a
  dedicated **Solution Plays** browse page. Use cases and patterns pick from the
  approved records.
- **Approval workflow.** Content submitted by contributors is held **Pending**
  and hidden from the catalog until reviewed. A new **Approvals** tab (visible to
  Owners/Approvers only, with a pending-count badge) provides **Approve** and
  **Reject** (with a reason) actions. Approval columns
  (`ApprovalStatus`, `SubmittedByName`, `SubmittedAtText`, `ReviewedByName`,
  `ReviewedAtText`, `ReviewNote`) were added to Industries, Verticals, Solution
  Plays, Use Cases, Patterns and Accelerators.
- **New registration flows** for Verticals and Solution Plays, plus a reordered
  Register hub: Use Case → Solution Play → Pattern/Accelerator → Industry →
  Vertical → Event.
- **Data seeder & reset** browser scripts: `lists/seed-sled-data-browser.js`
  (seeds Industries, Verticals, Solution Plays, Use Cases, Patterns,
  Accelerators — idempotent) and `lists/clear-sled-data-browser.js` (clears all
  `SLED*` lists into the Recycle Bin).

### Changed
- **Segment → Vertical** throughout the UI, data model, seed data, schema and
  provisioning.
- **Role model.** Contributors can create Use Cases, Patterns, Accelerators and
  Solution Plays (all queued for approval); Curators/Owners do everything and
  manage Industries, Verticals and Events. SharePoint role resolution now treats
  **group membership as authoritative** (permission probing is a fallback only).
- **Navigation** reordered to: Home, Use Cases, Industries, Solution Plays,
  Patterns, Events, Approvals, Audit, About.
- Provisioning now creates **eight** `SLED*` lists; the Site Designs script runs
  in **Windows PowerShell 5.1 or PowerShell 7**. README and `docs/` updated to
  match (lists, roles, approval lifecycle, deployment steps).

### Fixed
- SharePoint role detection no longer mis-promotes members of the default
  **Members** group (which has *Edit* / Manage-Lists rights) to Curator, so the
  approval workflow engages correctly.
- The **+ Add a vertical** button rendered white-on-white on the page header
  (now legible); button order corrected (Register an industry first).
- Mermaid **Contribution & approval lifecycle** diagram failed to render on
  GitHub (a `;` in a sequence-diagram note was parsed as a statement separator);
  replaced with a comma.

## Baseline

Prior to the above, the app was a zero-build, vanilla-ES-module single-page app
over six SharePoint lists (Industries, UseCases, Events, Patterns, Accelerators,
AuditLog) with a role-aware UI and an optional Power Automate approval flow. See
the README and `docs/` for architecture, diagrams and deployment.
