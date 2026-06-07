# TikTokRPC-Vencord Web

<p align="center">
  <b>Dynamic TikTok Discord Rich Presence for Vencord</b><br>
  Show live TikTok profile stats on your Discord profile.
</p>

<p align="center">
  <a href="https://guns.lol/boykisseraf"><img alt="guns.lol" src="https://img.shields.io/badge/guns.lol-boykisseraf-7B46B4?style=for-the-badge"></a>
  <a href="https://www.tiktok.com/@boykisseraf"><img alt="TikTok" src="https://img.shields.io/badge/TikTok-@boykisseraf-000000?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Web.zip"><b>Download ZIP</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC-Installer.ps1"><b>Installer</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC/index.tsx"><b>Plugin</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/cloudflare-worker/worker.js"><b>Worker</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/issues"><b>Issues</b></a>
</p>

---

## Preview

```text
TikTok Profile
@boykisseraf
34 Following • 22.8K Followers • 457K Likes
[Show Profile]
```

TikTokRPC is a Vencord userplugin that displays public TikTok profile statistics as a Discord Rich Presence activity.

---

## Features

- Live TikTok public statistics
- Following, Followers, and Likes
- Compact TikTok-style numbers
- Show Profile button
- Optional Rich Presence image
- Cloudflare Worker backend
- Vencord Web support

---

## Download

Use the source ZIP:

[Download TikTokRPC ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Web.zip)

Or clone it:

```powershell
cd $HOME\Downloads
git clone -b Vencord-Web --single-branch https://github.com/bkiaf/TikTokRPC.git
cd TikTokRPC
```

---

## Easy install on Windows

After downloading and extracting the ZIP, run the installer:

```text
Right click TikTokRPC-Installer.ps1
Run with PowerShell
```

---

## One-command setup for Windows

This downloads TikTokRPC, runs the installer, installs requirements when possible, downloads Vencord, installs the plugin, and builds Vencord Web.

```powershell
$Zip = "$env:USERPROFILE\Downloads\TikTokRPC-Vencord-Web.zip"
$Dir = "$env:USERPROFILE\Downloads\TikTokRPC-Vencord-Web"

Remove-Item $Zip -Force -ErrorAction SilentlyContinue
Remove-Item $Dir -Recurse -Force -ErrorAction SilentlyContinue

Invoke-WebRequest "https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Web.zip" -OutFile $Zip
Expand-Archive $Zip "$env:USERPROFILE\Downloads" -Force

cd $Dir
powershell -ExecutionPolicy Bypass -File .\TikTokRPC-Installer.ps1 -VencordPath "$env:USERPROFILE\Downloads\Vencord"
```

The installer will try to:

1. Install Git with winget if missing
2. Install Node.js LTS with winget if missing
3. Install pnpm with npm if missing
4. Download Vencord source
5. Install Vencord dependencies
6. Copy TikTokRPC into `src/userplugins/TikTokRPC`
7. Patch the Vencord plugin modal icons
8. Build Vencord Web

When it finishes, load this folder as an unpacked extension:

```text
C:\Users\YOUR_USER\Downloads\Vencord\dist\chromium-unpacked
```

Browser pages:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`

Enable **Developer mode**, click **Load unpacked**, then select the `chromium-unpacked` folder.

Open Discord Web:

```text
https://discord.com/app
```

Refresh with:

```text
Ctrl + F5
```

Then enable:

```text
User Settings → Vencord → Plugins → TikTokRPC
```

---

## Files

| File | Description |
|---|---|
| [`TikTokRPC/index.tsx`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC/index.tsx) | Vencord userplugin |
| [`cloudflare-worker/worker.js`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/cloudflare-worker/worker.js) | TikTok stats Worker |
| [`TikTokRPC-Installer.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC-Installer.ps1) | Windows installer wrapper |
| [`scripts/setup-windows.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/setup-windows.ps1) | Installs requirements when possible, downloads Vencord, installs TikTokRPC, builds Web |
| [`scripts/setup-web.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/setup-web.ps1) | Downloads/builds Vencord Web and installs TikTokRPC |
| [`scripts/install-plugin.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/install-plugin.ps1) | Installs TikTokRPC into an existing Vencord source folder |
| [`scripts/copy-worker.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/copy-worker.ps1) | Copies the Worker code |
| [`scripts/build-web.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/build-web.ps1) | Rebuilds Vencord Web |

Raw files:

- [`TikTokRPC/index.tsx`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/TikTokRPC/index.tsx)
- [`cloudflare-worker/worker.js`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/cloudflare-worker/worker.js)
- [`TikTokRPC-Installer.ps1`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/TikTokRPC-Installer.ps1)
- [`scripts/setup-windows.ps1`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/scripts/setup-windows.ps1)
- [`scripts/setup-web.ps1`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/scripts/setup-web.ps1)

---

## Manual Vencord setup

Install these first:

- [Git for Windows](https://git-scm.com/download/win)
- [Node.js LTS](https://nodejs.org/en/download)
- [pnpm](https://pnpm.io/installation)

Check:

```powershell
git --version
node --version
pnpm --version
```

Download Vencord:

```powershell
cd $HOME\Downloads
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install --frozen-lockfile
```

Install TikTokRPC:

```powershell
cd $HOME\Downloads\TikTokRPC
powershell -ExecutionPolicy Bypass -File .\scripts\install-plugin.ps1 -VencordPath "$HOME\Downloads\Vencord"
```

Load:

```text
C:\Users\YOUR_USER\Downloads\Vencord\dist\chromium-unpacked
```

---

## Cloudflare Worker setup

TikTokRPC uses a Cloudflare Worker so the plugin can fetch TikTok stats cleanly.

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages**
3. Create a Worker
4. Choose **Start with Hello World**
5. Deploy it
6. Open **Edit code**
7. Replace the default code with [`cloudflare-worker/worker.js`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/cloudflare-worker/worker.js)
8. Deploy again

Raw Worker file:

[`cloudflare-worker/worker.js`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/Vencord-Web/cloudflare-worker/worker.js)

Test your Worker:

```text
https://YOUR-WORKER.workers.dev?username=boykisseraf
```

A working response looks like:

```json
{
  "ok": true,
  "username": "boykisseraf",
  "followingText": "34",
  "followersText": "22.8K",
  "likesText": "457K",
  "display": "34 Following • 22.8K Followers • 457K Likes"
}
```

In TikTokRPC settings, use only the base URL:

```text
https://YOUR-WORKER.workers.dev
```

Do not include:

```text
?username=boykisseraf
```

---

## Discord Application setup

A Discord Application ID is required for the profile button and image.

1. Open [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it:

```text
TikTok Profile
```

4. Open **General Information**
5. Copy **Application ID**
6. Put it in TikTokRPC `App ID`

---

## Rich Presence image

Inside your Discord Application:

```text
Rich Presence → Art Assets → Upload Image
```

Use this asset key:

```text
tiktok
```

Then in TikTokRPC settings:

```text
Large Image: tiktok
```

---

## Recommended TikTokRPC settings

```text
Username: boykisseraf
Stats API URL: https://YOUR-WORKER.workers.dev
App ID: your Discord Application ID
App Name: TikTok Profile
Large Image: tiktok
Update Minutes: 5
Show Profile Button: ON
Show Debug Activity: ON
```

---

## Text-only mode

```text
App ID: 0
```

Text-only mode can show the activity text, but the profile button and Rich Presence image will not work.

---

## Updating

```powershell
cd $HOME\Downloads\TikTokRPC
git pull
powershell -ExecutionPolicy Bypass -File .\TikTokRPC-Installer.ps1 -VencordPath "$HOME\Downloads\Vencord"
```

Then:

```text
chrome://extensions → Reload Vencord
Discord Web → Ctrl + F5
TikTokRPC → OFF → ON
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `git` is not recognized | Run [`TikTokRPC-Installer.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC-Installer.ps1), then restart PowerShell |
| `node` is not recognized | Run [`TikTokRPC-Installer.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/TikTokRPC-Installer.ps1), then restart PowerShell |
| `pnpm` is not recognized | Run `npm install -g pnpm`, then restart PowerShell |
| TikTokRPC does not appear | Run the installer again, reload the extension, refresh Discord Web |
| Activity does not appear | Turn on Discord activity sharing and make sure you are not Invisible |
| Stats error | Test the Worker URL with `?username=boykisseraf` |
| Button does not open | Use a real Discord Application ID, not `0` |
| Image does not show | Upload an asset and match the asset key exactly |
| Header icons disappear | Run [`patch-vencord-modal.ps1`](https://github.com/bkiaf/TikTokRPC/blob/Vencord-Web/scripts/patch-vencord-modal.ps1) again |

---

## Notes

- This is a Vencord userplugin.
- Custom Vencord plugins require a source build.
- The Cloudflare Worker URL is not included because every user creates their own Worker.
- Browser security still requires you to load the built extension manually from the extensions page.

---

## Links

- [TikTok](https://www.tiktok.com/@boykisseraf)
- [guns.lol](https://guns.lol/boykisseraf)
- [Repository](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Web)
- [Download ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Web.zip)
