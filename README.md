# satvikshah.com

Personal website of CA Satvik Shah — Chartered Accountant, entrepreneur and advisor, Vadodara.

**Live site:** https://satvikshah.com

## How it works

- This repository is the source of the website. Netlify (project `satvikshah`) deploys it automatically.
- Any change committed to the `main` branch goes live on satvikshah.com within a minute or two.
- There is no build step: the files here are published exactly as they are.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole website: all pages, styles and scripts |
| `img/` | Photographs (web-sized, plus high-resolution `press-*` versions for the press kit) |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and iPhone home-screen icons |
| `img/og-share.jpg` | Image shown when the site link is shared on WhatsApp, LinkedIn etc. |
| `404.html` | "Page not found" page |
| `robots.txt`, `sitemap.xml` | Search engine files |
| `netlify.toml` | Netlify settings: security headers and redirect from the Netlify address to satvikshah.com |

## Editing content

Most content lives near the bottom of `index.html`, in the script section:

- `CONFIG` — email, phone, WhatsApp number, booking link, contact-form endpoint
- `SOCIAL` — social media profile links
- `V` — organisations and roles shown on *My Work*
- `JOURNAL`, `PRINCIPLES`, `ARTICLES`, `IDEAS` — timeline, principles, articles and short ideas

Edit on GitHub (pencil icon on the file), commit to `main`, and Netlify publishes the change.

## Contact form

Enquiries are sent to satvikshah@jsassignments.com through FormSubmit. The first enquiry after launch triggers a one-time activation email from FormSubmit; click "Activate Form" in it.

## Deploys

This repository is public so that Netlify's free plan builds every commit automatically.
It contains only the website's own files, the same ones any visitor's browser downloads.
