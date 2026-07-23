# (Optional) Embedding the Library in a SharePoint Modern Page

The app runs perfectly as a standalone full-width page at
`…/SiteAssets/sled/index.aspx`. But you can also surface it **inside a modern
SharePoint Site Page** so it inherits the site's suite bar, search and theme —
useful when integrating into the **SLED Edge** hub.

Both doorways use the **same lists and the same data**; only the chrome around
the app differs.

| Doorway | URL shape | Chrome |
|---|---|---|
| **Standalone** | `…/SiteAssets/sled/index.aspx` | Full-width, no site chrome |
| **Embedded** | `…/SitePages/Use-Case-Library.aspx` | Suite bar + search + site theme |

---

## Method — Embed web part (iframe)

Because the app lives on the **same site**, the modern **Embed** web part can
iframe it without any allow-listing.

1. On the site: **+ New → Page → Blank**.
2. Name it e.g. `SLED Use Case Library`.
3. Add a section (**full-width** section gives the most room), then add the
   **Embed** web part.
4. In the Embed web part, paste the app URL:
   ```
   https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx
   ```
   or the full `<iframe>` form:
   ```html
   <iframe src="https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx"
           width="100%" height="1600" style="border:0;"></iframe>
   ```
5. **Publish** the page.
6. Add the page to the site (and later SLED Edge) navigation.

> **Same-site only.** The Embed web part iframes same-site content freely. If you
> ever host the app on a *different* site collection, add that origin under
> **SharePoint admin center → Advanced → HTML field security** for the target
> site.

---

## Recommended page settings for a clean embed

| Setting | Where | Why |
|---|---|---|
| **Header layout: Minimal** | Page → Edit → header area settings | Reclaims vertical space |
| **Section: Full-width** | Add-section chooser | Removes side padding so the app fills the width |
| **Site navigation: off** *(optional)* | Site settings → Change the look → Navigation | Avoids double navigation (the app has its own) |
| **Fixed iframe height** | Embed web part | The app is a SPA; a generous fixed height (≈1400–1800px) avoids inner scrollbars |

---

## Tips & gotchas

- **Use `index.aspx`, not `index.html`.** A raw `.html` in a SharePoint library
  tends to *download* rather than render; `.aspx` renders inline through the page
  pipeline.
- **Iframe height is fixed.** Modern Embed doesn't auto-resize to content. Pick a
  height that fits your busiest page, or prefer the standalone doorway for the
  richest pages (long Use Case detail views).
- **Optional code polish (not required):** the app can detect it's framed
  (`window.self !== window.top`) and hide its own footer / trim padding for a
  tighter embed. This is additive and does not affect the standalone view.
- **Theme:** the embedded page inherits the site/hub theme automatically; the app
  itself keeps its own design system inside the iframe.

---

## Which doorway should I use?

- **Standalone** — best for day-to-day use and the richest pages; maximum space,
  no inner scrollbars. Link to it directly from navigation.
- **Embedded** — best for **integration into SLED Edge**, where you want the app
  to feel like a native hub page with the suite bar, search and theme around it.

You can ship **both** and link each where it fits — they read and write the same
lists.
