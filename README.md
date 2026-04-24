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
| `style.css`   | Shared stylesheet                              |
| `CNAME`       | `kroma.fit` — tells GitHub Pages the domain    |

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
