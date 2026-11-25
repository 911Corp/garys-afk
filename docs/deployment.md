# Deployment

Target: GitHub Pages at `https://911corp.github.io/garys-afk/` (not deployed yet; this URL is the
target, not a live address).

Going public is a human decision. Nothing deploys on push: the Pages workflow only runs when someone
starts it by hand.

## One-time setup

1. Create the public repository `911Corp/garys-afk` and push this project to `main`.
2. In the repository settings, open **Pages** and set **Source** to **GitHub Actions**.

## Each release

1. Make sure the checks pass locally or in the CI workflow (lint, typecheck, unit tests, build).
2. Optional but recommended: `npm run build && npm run test:e2e`.
3. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
4. In the **Actions** tab, open **Deploy to GitHub Pages** and click **Run workflow**.
5. Visit the site, then reload it once: the service worker installs the new version, and the next
   load uses it. Installed PWAs update the same way.

## Other hosts

The build is a plain folder of static files. For a root domain, build with `GARYS_AFK_BASE=/ npm run
build`. Any static host works; no server-side configuration is needed (routing uses the URL hash).

## Cache and updates

Each build gets a cache name made of the version and a hash of the file list. Old caches are
deleted when the new worker activates. If a user is stuck on an old version, clearing site data in
the browser removes it.
