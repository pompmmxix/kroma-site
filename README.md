# kroma-site

Static website for **kroma.fit** — landing page, privacy policy, and terms
of use for the Kroma wardrobe app.

Hosted on GitHub Pages from the `main` branch. Custom domain is set via
the `CNAME` file. No build step — plain HTML and CSS.

## Files

| File          | Purpose                                        |
|---------------|------------------------------------------------|
| `index.html`  | Landing page                                   |
| `privacy.html`| Privacy policy (GDPR-compliant)                |
| `terms.html`  | Terms of use                                   |
| `style.css`   | Shared stylesheet — system fonts only, no external requests |
| `favicon.svg` | Brand mark — **must stay byte-identical to `wardrobe-app/public/icon.svg`** |
| `CNAME`       | `kroma.fit` — tells GitHub Pages the domain    |

## Brand mark sync

The favicon **is** the app icon. They must stay identical so the brand
reads consistently in the browser tab, on the home screen, and in the
header of every page.

If you change `favicon.svg` here, also update
`pompmmxix/wardrobe-app/public/icon.svg` to match (and regenerate
Android PNGs — see that repo's `public/icon.README.md`).

A simple way to keep them in sync if you have both repos cloned side by
side:

```bash
cp ../wardrobe-app/public/icon.svg ./favicon.svg
```

## Before publishing

There are a few `TODO` markers in the HTML files that need filling in:

- Data controller identity (name / business name)
- Country of establishment
- Last-updated date
- Governing law jurisdiction (in `terms.html`)

Search for `TODO` in the repo to find them.

## Deploy

Push to `main`. GitHub Pages picks it up automatically within a minute or
two. HTTPS certificate is provisioned by GitHub on first deploy with the
custom domain.

## Related

The Kroma app itself lives at
[pompmmxix/wardrobe-app](https://github.com/pompmmxix/wardrobe-app).
