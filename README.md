# Wayfare Digital

Marketing and intake site for Wayfare Digital: fast, phone-first websites for small business owners, built and kept running month to month.

It's a static progressive web app (PWA). One HTML page, a service worker for offline support, and a web app manifest so visitors can install it to their home screen.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy on Railway

Connect this repo to a Railway service. Railway detects Node, runs `npm install`, then `npm start`, which serves the site on the port Railway provides. Point your domain at the service in Railway's settings. HTTPS is required for the service worker and install prompt, and Railway provides it automatically.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The whole site: hero, services, "not a template" section, pricing, upkeep tiers, how it works, free audit, intake form |
| `sw.js` | Service worker. Pages load from the network first and fall back to cache when offline. |
| `offline.html` | Shown when a visitor is offline and the page isn't cached yet |
| `manifest.webmanifest` | App name, colors, and icons for installing to a home screen |
| `icons/` | App icons, including a maskable icon for Android |
| `brand/` | Logo files (see below) |
| `serve.json` | Headers for the static server (no caching on `sw.js`, manifest content type) |

## Brand

| File | Use it on |
|---|---|
| `brand/logo.svg` / `logo.png` | Light backgrounds |
| `brand/logo-light.svg` / `logo-light.png` | Dark backgrounds |
| `brand/mark.svg` | The route mark alone, light backgrounds |
| `brand/mark-light.svg` | The route mark alone, dark backgrounds |

The wordmark is Fraunces SemiBold, converted to outlines so the SVGs look the same everywhere. The mark is three stops on a route: Build, Launch, Grow.

Colors:

| Name | Hex |
|---|---|
| Ink Navy | `#1C2B3A` |
| Parchment | `#EFE9DC` |
| Bone White | `#FAF7F0` |
| Trail Ochre | `#B8752E` |
| Moss | `#4A5D45` |

Type: Fraunces for headlines, Work Sans for body text.

## Not built yet

These parts of the page show a confirmation message but don't send data anywhere yet:

- **Intake form.** Needs a backend (for example an n8n webhook) to receive submissions and send the custom quote email.
- **Free audit form.** Needs a backend call to the PageSpeed Insights API, the emailed report, and the follow-up email sequence.
- **Payments.** No Stripe integration yet.

When updating the service worker, bump `CACHE` in `sw.js` (for example `wayfare-v2`) so returning visitors get the new files.
