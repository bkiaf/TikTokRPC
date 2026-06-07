# TikTokRPC-BetterDiscord

<p align="center">
  <b>Dynamic TikTok Discord Rich Presence for BetterDiscord</b><br>
  Show live TikTok profile stats on your Discord profile.
</p>

<p align="center">
  <a href="https://guns.lol/boykisseraf"><img alt="guns.lol" src="https://img.shields.io/badge/guns.lol-boykisseraf-7B46B4?style=for-the-badge"></a>
  <a href="https://www.tiktok.com/@boykisseraf"><img alt="TikTok" src="https://img.shields.io/badge/TikTok-@boykisseraf-000000?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://github.com/bkiaf/TikTokRPC/archive/refs/heads/BetterDiscord.zip"><b>Download ZIP</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/TikTokRPC.plugin.js"><b>Plugin</b></a>
  ·
  <a href="https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/cloudflare-worker/worker.js"><b>Worker</b></a>
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

TikTokRPC is a BetterDiscord plugin that displays public TikTok profile statistics as a Discord Rich Presence activity.

---

## Features

- Live TikTok public statistics
- Following, Followers, and Likes
- Compact TikTok-style numbers
- Show Profile button
- Optional Rich Presence image
- Cloudflare Worker backend
- BetterDiscord support

---

## Download

Use the source ZIP:

[Download TikTokRPC ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/BetterDiscord.zip)

Or download the plugin file directly:

[Download TikTokRPC.plugin.js](https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/TikTokRPC.plugin.js)

---

## Windows setup

### Easy install

Download the ZIP, extract it, then run the installer:

```text
Right click TikTokRPC-Installer.ps1
Run with PowerShell
```

### Manual install

Copy this file:

```text
TikTokRPC.plugin.js
```

Into:

```text
%APPDATA%\BetterDiscord\plugins
```

Then open Discord:

```text
User Settings → BetterDiscord → Plugins → TikTokRPC
```

Turn it on.

---

## Files

| File | Description |
|---|---|
| [`TikTokRPC.plugin.js`](https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/TikTokRPC.plugin.js) | BetterDiscord plugin |
| [`TikTokRPC-Installer.ps1`](https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/TikTokRPC-Installer.ps1) | Windows installer |
| [`cloudflare-worker/worker.js`](https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/cloudflare-worker/worker.js) | TikTok stats Worker |

Raw files:

- [`TikTokRPC.plugin.js`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/TikTokRPC.plugin.js)
- [`TikTokRPC-Installer.ps1`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/TikTokRPC-Installer.ps1)
- [`cloudflare-worker/worker.js`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/cloudflare-worker/worker.js)

---

## Cloudflare Worker setup

TikTokRPC uses a Cloudflare Worker so the plugin can fetch TikTok stats cleanly.

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages**
3. Create a Worker
4. Choose **Start with Hello World**
5. Deploy it
6. Open **Edit code**
7. Replace the default code with [`cloudflare-worker/worker.js`](https://github.com/bkiaf/TikTokRPC/blob/BetterDiscord/cloudflare-worker/worker.js)
8. Deploy again

Raw Worker file:

[`cloudflare-worker/worker.js`](https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/cloudflare-worker/worker.js)

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
```

---

## Text-only mode

```text
App ID: 0
```

Text-only mode can show the activity text, but the profile button and Rich Presence image will not work.

---

## Updating

Download the latest `TikTokRPC.plugin.js`, replace the old file in:

```text
%APPDATA%\BetterDiscord\plugins
```

Then reload Discord:

```text
Ctrl + R
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| TikTokRPC does not appear | Make sure `TikTokRPC.plugin.js` is inside `%APPDATA%\BetterDiscord\plugins` |
| Activity does not appear | Turn on Discord activity sharing and make sure you are not Invisible |
| Stats error | Test the Worker URL with `?username=boykisseraf` |
| Button does not open | Use a real Discord Application ID, not `0` |
| Image does not show | Upload an asset and match the asset key exactly |

---

## Notes

- This is a BetterDiscord plugin.
- The Cloudflare Worker URL is not included because every user creates their own Worker.
- No build step is required.

---

## Links

- [TikTok](https://www.tiktok.com/@boykisseraf)
- [guns.lol](https://guns.lol/boykisseraf)
- [Repository](https://github.com/bkiaf/TikTokRPC/tree/BetterDiscord)
- [Download ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/BetterDiscord.zip)
