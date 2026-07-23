# SLED Use Case Library — Flow & Architecture Diagrams

This document captures the solution as a set of diagrams: the component
architecture, the runtime data flow, the contribution / approval lifecycle, the
DEV → PROD deployment flow, and the DEV/PROD host auto-detection logic.

All diagrams are [Mermaid](https://mermaid.js.org/) and render natively on
GitHub.

---

## 1. Component architecture

```mermaid
flowchart TD
    subgraph M365[Microsoft 365 Tenant]
        subgraph Site[SharePoint Site · SLED Use Case Library / SLED Edge]
            app["Single-page app<br/>SiteAssets/sled/index.aspx"]
            page["(Optional) Modern Site Page<br/>with Embed web part"]
            subgraph Lists[Eight SharePoint Lists + 1 Library]
                l1[(SLEDIndustries)]
                l7[(SLEDVerticals)]
                l8[(SLEDSolutionPlays)]
                l2[(SLEDUseCases)]
                l3[(SLEDEvents)]
                l4[(SLEDPatterns)]
                l5[(SLEDAccelerators)]
                l6[(SLEDAuditLog)]
                lib[["SLEDSolutionArchitecture<br/>document library"]]
            end
        end
        flow["Power Automate<br/>(optional approval flow)"]
        search[(SharePoint Search)]
    end

    viewer([Viewer]) -->|browse / filter| app
    contributor([Contributor]) -->|register / edit own| app
    curator([Curator]) -->|manage all| app

    page -->|iframe embed| app
    app <-->|same-origin REST| l1 & l2 & l3 & l4 & l5 & l6 & l7 & l8
    app <-->|upload / download artifacts| lib

    l2 -->|Status = In Review| flow
    flow -->|approve → Published| l2
    flow -->|notify| curator
    l2 --> search
```

---

## 2. Runtime data flow (DEV/PROD host detection)

The identical code runs in both environments. `app/js/spconfig.js` inspects the
host and chooses the data source — no code change between DEV and PROD.

```mermaid
flowchart TD
    start([App loads: index.aspx / index.html]) --> detect{"Host is<br/>*.sharepoint.com ?"}
    detect -->|Yes| live["Live mode:<br/>read/write eight lists<br/>via same-origin REST"]
    detect -->|No| demo["Demo mode:<br/>read seed JSON in app/data/<br/>persist edits to localStorage"]
    live --> render[Render pages]
    demo --> render
    render --> role{"Resolve role<br/>(auth.js)"}
    role -->|Site admin / *Curator*| curator[Curator UX: manage all]
    role -->|*Member* / *Contributor*| contrib[Contributor UX: own records]
    role -->|else / Read| viewer[Viewer UX: read-only]
```

---

## 3. Contribution & approval lifecycle

```mermaid
sequenceDiagram
    actor C as Contributor
    participant App as App (Register form)
    participant L as SLED list (Use Case / Pattern / …)
    participant Ap as Approvals tab
    actor R as Curator / Owner

    C->>App: Submit (Use Case, Pattern, Accelerator or Solution Play)
    App->>L: Create/update item (ApprovalStatus = Pending)
    Note over L: Hidden from the public catalog while Pending
    R->>Ap: Open Approvals (Owners/Approvers only)
    alt Approve
        Ap->>L: ApprovalStatus = Approved
        Note over L: Now visible in the catalog
    else Reject
        Ap->>L: ApprovalStatus = Rejected (+ reason)
        Note over L: Stays hidden, kept for audit
    end
```

> Curator/Owner submissions publish immediately. The in-app Approvals queue is
> the primary workflow; the optional Power Automate flow can add Teams/email
> notifications.

---

## 4. Deployment flow (DEV → PROD)

```mermaid
flowchart LR
    subgraph DEV[DEV site]
        d1[Create Communication site] --> d2[Allow custom script]
        d2 --> d3[Provision eight lists<br/>Site Designs PowerShell]
        d3 --> d4[Upload app/ to SiteAssets/sled]
        d4 --> d5[Open index.aspx<br/>+ optional nav / embed]
        d5 --> d6[Validate round-trip saves]
    end
    d6 ==>|sign-off| PROD
    subgraph PROD[SLED Edge site]
        p1[Re-run provisioning script] --> p2[Re-upload app/ files]
        p2 --> p3[Add link under SLED Edge nav]
        p3 --> p4[Apply hub theme]
    end
```

> Internal column names are kept **identical** across DEV and PROD, so the app,
> view formatting and the approval flow port with only the site/list URL
> changing.
