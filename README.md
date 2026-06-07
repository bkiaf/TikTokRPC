# TikTokRPC

<p align="center">
  <b>Dynamic TikTok Discord Rich Presence for TikTok profiles</b><br>
  Choose the version that matches your Discord client.
</p>

<p align="center">
  <a href="https://guns.lol/boykisseraf"><img alt="guns.lol" src="https://img.shields.io/badge/guns.lol-boykisseraf-7B46B4?style=for-the-badge"></a>
  <a href="https://www.tiktok.com/@boykisseraf"><img alt="TikTok" src="https://img.shields.io/badge/TikTok-@boykisseraf-000000?style=for-the-badge"></a>
</p>

---

## Choose your version

| Version | Use this if you use | Branch | Download |
|---|---|---|---|
| **Vencord Web** | Discord Web in a browser | [`Vencord-Web`](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Web) | [Download ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Web.zip) |
| **Vencord Desktop** | Discord Desktop with Vencord | [`Vencord-Desktop`](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Desktop) | [Download ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/Vencord-Desktop.zip) |
| **BetterDiscord Windows** | Discord Desktop with BetterDiscord | [`BetterDiscord`](https://github.com/bkiaf/TikTokRPC/tree/BetterDiscord) | [Download ZIP](https://github.com/bkiaf/TikTokRPC/archive/refs/heads/BetterDiscord.zip) |

> The `main` branch is only a landing page. Install from one of the branches above.

---

## Preview

```text
TikTok Profile
@boykisseraf
34 Following • 22.8K Followers • 457K Likes
[Show Profile]
```

TikTokRPC shows public TikTok profile statistics as a Discord Rich Presence activity.

---

## What each branch does

### Vencord Web

Use this version for Discord Web in browsers such as Chrome, Edge, or Brave.

- Builds Vencord Web
- Loads through `chromium-unpacked`
- Works with Discord Web

[Open Vencord Web branch](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Web)

### Vencord Desktop

Use this version for Discord Desktop with Vencord.

- Installs TikTokRPC as a Vencord userplugin
- Builds and injects Vencord Desktop
- Includes the desktop-safe RPC fixes

[Open Vencord Desktop branch](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Desktop)

### BetterDiscord Windows

Use this version for Discord Desktop with BetterDiscord.

- Installs `TikTokRPC.plugin.js`
- No build step required
- Plugin goes into `%APPDATA%\BetterDiscord\plugins`

[Open BetterDiscord branch](https://github.com/bkiaf/TikTokRPC/tree/BetterDiscord)

---

## Cloudflare Worker

TikTokRPC uses a Cloudflare Worker so the plugin can fetch TikTok stats cleanly.

Each user creates their own Worker and puts the Worker URL in TikTokRPC settings.

Example setting:

```text
Stats API URL: https://YOUR-WORKER.workers.dev
```

Do not include:

```text
?username=boykisseraf
```

---

## Discord Application

A Discord Application ID is required for buttons and Rich Presence images.

Recommended asset key:

```text
tiktok
```

Then use this in TikTokRPC settings:

```text
Large Image: tiktok
```

---

## Links

- [TikTok](https://www.tiktok.com/@boykisseraf)
- [guns.lol](https://guns.lol/boykisseraf)
- [Vencord Web](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Web)
- [Vencord Desktop](https://github.com/bkiaf/TikTokRPC/tree/Vencord-Desktop)
- [BetterDiscord](https://github.com/bkiaf/TikTokRPC/tree/BetterDiscord)
