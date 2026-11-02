# InstaVault — Multi-platform Media Workspace

A mobile-first Progressive Web App (PWA) with separate workspaces for Instagram, TikTok, YouTube, Facebook, X, Pinterest, Snapchat, Telegram, WhatsApp and Threads.

## Features in this build
- Ten platform workspaces with domain/link recognition (recognition only; no scraping or media fetching).
- Import images and videos from your device and tag them to a platform.
- Preview and save imported files using the browser.
- Shared activity/download history, dark/light theme and PWA app shell.
- Optional Google Apps Script activity logging.
- No social-media passwords, API keys or access tokens in the frontend.

## Simple GitHub Pages setup
1. Upload the contents of this folder to the root of your existing GitHub repository. `index.html` must be at the repository root.
2. Open repository **Settings → Pages**.
3. Under Build and deployment, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. Wait for GitHub Pages to publish the site.
5. Open the published URL on your phone and use the browser menu → **Add to Home screen**.

## Google Sheets activity logging (optional)
The Apps Script endpoint is optional and only logs app activity metadata. It does not fetch or download social media. Deploy `backend/apps-script/Code.gs` as a web app and paste its `/exec` URL in Settings. Do not log private message contents or sensitive data.

## Important limitations
- A recognized URL is not a downloaded file. This frontend does not scrape platform pages or provide a universal downloader.
- Use each service's official download/export tools, official APIs where eligible, or files you own/have permission to save. Platform API access and permitted use vary.
- No private-account bypass, login/session scraping, DRM removal, paywall bypass, encryption bypass, disappearing-message capture, or view-once media capture.
- WhatsApp and Telegram content must be exported or saved by the user and then imported manually. Snapchat support is limited to user-owned Memories exports/local files.
- Files are handled locally in the current browser session. File bytes are not persisted after the session; browser local storage keeps activity metadata/settings only.
- This build does not implement social OAuth or server-side API integrations.

## Files
- `index.html` — app interface
- `style.css` — responsive styling
- `app.js` — platform workspaces and local media handling
- `manifest.json`, `service-worker.js` — PWA support
- `backend/apps-script/Code.gs` — optional activity logger


## Official app connections

See `backend/oauth/README.md` for the platform-by-platform integration plan, security requirements, and credential checklist. OAuth is not active in this static build; each provider needs its own developer app and secure backend. Personal Instagram accounts cannot use the professional-account media API flow.
