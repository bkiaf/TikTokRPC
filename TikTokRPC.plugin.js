/**
 * @name TikTokRPC
 * @author boykisseraf
 * @authorId 1066397096871211020
 * @version 0.1.21-bd-data-image-fix
 * @description Dynamic TikTok Discord Rich Presence for BetterDiscord.
 * @source https://github.com/bkiaf/TikTokRPC/tree/BetterDiscord
 * @updateUrl https://raw.githubusercontent.com/bkiaf/TikTokRPC/BetterDiscord/TikTokRPC.plugin.js
 * @runAt idle
 */

module.exports = class TikTokRPC {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(meta.name);
        this.settings = {};
        this.lastStats = null;
        this.rpc = null;
        this.getAsset = async () => "";
        this.updateInterval = null;
        this.alternateInterval = null;
        this.timerSaveInterval = null;
        this.showingAlternateActivity = false;
        this.timerStartMs = Date.now();
        this.defaultApplicationId = "1002618051608444958";
        this.defaults = {
            username: "boykisseraf",
            statsApiUrl: "",
            appId: "0",
            appName: "TikTok Profile",
            largeImage: "tiktok",
            updateMinutes: "5",
            tiktokButtonEnabled: true,
            tiktokButtonText: "Show Profile",
            startTimeOffsetMinutes: "0",
            saveLastTimer: true,
            alternateEnabled: false,
            alternateSeconds: "10",
            alternateName: "Custom Link",
            alternateDetails: "",
            alternateState: "",
            alternateUrl: "https://guns.lol/boykisseraf",
            alternateButtonEnabled: true,
            alternateButtonText: "Open Link",
            alternateLargeImage: ""
        };
    }

    async start() {
        this.settings = Object.assign({}, this.defaults, this.api.Data.load("settings") || {});
        this.loadTimerState();
        this.showingAlternateActivity = false;

        const ready = await this.waitForDiscordModules();
        if (!ready) {
            this.api.UI.showToast("TikTokRPC could not find Discord dispatcher", { type: "error" });
            return;
        }

        await this.updatePresence(true);
        this.startIntervals();
        this.api.UI.showToast("TikTokRPC started", { type: "success" });
    }

    stop() {
        this.saveTimerState();
        this.stopIntervals();
        this.setActivity(null);
        this.api.UI.showToast("TikTokRPC stopped");
    }

    async waitForDiscordModules() {
        for (let i = 0; i < 30; i++) {
            this.setupModules();

            if (this.rpc?.dispatch) {
                this.api.Logger.log("Discord dispatcher found");
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.api.Logger.error("Discord dispatcher was not found");
        return false;
    }

    findDispatcher() {
        const Webpack = this.api.Webpack;
        const attempts = [
            () => Webpack.getByKeys?.("dispatch", "_subscriptions", { searchExports: true }),
            () => Webpack.getByKeys?.("dispatch", "subscribe", { searchExports: true }),
            () => Webpack.getModule?.(m => m?.dispatch && (m?._subscriptions || m?.subscribe), { searchExports: true }),
            () => Webpack.getModule?.(m => m?.dispatch && typeof m.dispatch === "function", { searchExports: true })
        ];

        for (const attempt of attempts) {
            try {
                const mod = attempt();
                if (mod?.dispatch) return mod;
            } catch (err) {
                this.api.Logger.error("Dispatcher lookup failed", err);
            }
        }

        return null;
    }

    findAssetFetcher() {
        const Webpack = this.api.Webpack;
        const byAssetSource = m => {
            if (!m) return false;

            if (typeof m === "function") {
                const source = Function.prototype.toString.call(m);
                return source.includes("APPLICATION_ASSETS_FETCH") || source.includes("getAssetImage: size must");
            }

            if (typeof m === "object") {
                return Object.values(m).some(v => {
                    if (typeof v !== "function") return false;
                    const source = Function.prototype.toString.call(v);
                    return source.includes("APPLICATION_ASSETS_FETCH") || source.includes("getAssetImage: size must");
                });
            }

            return false;
        };

        const attempts = [
            () => Webpack.getBySource?.("APPLICATION_ASSETS_FETCH", { searchExports: true }),
            () => Webpack.getBySource?.("getAssetImage: size must === [number, number] for Twitch", { searchExports: true }),
            () => Webpack.getModule?.(byAssetSource, { searchExports: true }),
            () => Webpack.getModule?.(byAssetSource)
        ];

        for (const attempt of attempts) {
            try {
                const mod = attempt();
                const found = this.pickAssetFetcher(mod);
                if (found) return found;
            } catch (err) {
                this.api.Logger.error("Asset fetcher lookup failed", err);
            }
        }

        return null;
    }

    pickAssetFetcher(mod) {
        if (!mod) return null;

        if (typeof mod === "function") {
            const source = Function.prototype.toString.call(mod);
            if (source.includes("APPLICATION_ASSETS_FETCH")) return mod;
        }

        if (typeof mod === "object") {
            for (const key in mod) {
                const value = mod[key];
                if (typeof value !== "function") continue;

                const source = Function.prototype.toString.call(value);
                if (source.includes("APPLICATION_ASSETS_FETCH")) return value;
            }

            for (const key in mod) {
                const value = mod[key];
                if (typeof value !== "function") continue;

                const source = Function.prototype.toString.call(value);
                if (source.includes("getAssetImage: size must")) return value;
            }
        }

        return null;
    }

    normalizeAsset(value) {
        if (!value) return "";

        if (typeof value === "string") return value;

        if (Array.isArray(value)) {
            for (const item of value) {
                const normalized = this.normalizeAsset(item);
                if (normalized) return normalized;
            }
            return "";
        }

        if (typeof value === "object") {
            return String(
                value.id ||
                value.asset_id ||
                value.assetId ||
                value.key ||
                value.name ||
                ""
            );
        }

        return "";
    }

    async resolveApplicationAsset(appId, key) {
        if (!appId || !key) return "";

        const cleanKey = String(key).trim();
        if (!cleanKey) return "";

        if (!this.fetchAsset) return cleanKey;

        const calls = [
            () => this.fetchAsset(appId, [cleanKey, undefined]),
            () => this.fetchAsset(appId, [cleanKey]),
            () => this.fetchAsset(appId, cleanKey),
            () => this.fetchAsset(appId, [cleanKey.toLowerCase(), undefined]),
            () => this.fetchAsset(appId, [cleanKey.toLowerCase()])
        ];

        for (const call of calls) {
            try {
                const result = await call();
                const normalized = this.normalizeAsset(result);
                if (normalized) return normalized;
            } catch (err) {
                this.api.Logger.error("Asset fetch attempt failed", err);
            }
        }

        return cleanKey;
    }

    setupModules() {
        this.rpc = this.findDispatcher();
        this.fetchAsset = this.findAssetFetcher();

        this.getAsset = async key => {
            const appId = this.getAssetApplicationId();
            if (!appId || !key) return "";

            const asset = await this.resolveApplicationAsset(appId, key);
            if (!asset) this.api.Logger.error("Asset was not found", { appId, key });

            return asset;
        };
    }

    startIntervals() {
        this.stopIntervals();

        const minutes = Math.max(1, Number(this.settings.updateMinutes) || 5);
        this.updateInterval = setInterval(() => {
            this.saveTimerState();
            this.updatePresence(true);
        }, minutes * 60_000);

        this.alternateInterval = setInterval(() => {
            if (this.settings.alternateEnabled !== true) {
                if (this.showingAlternateActivity) {
                    this.showingAlternateActivity = false;
                    this.updatePresence(false);
                }
                return;
            }

            this.showingAlternateActivity = !this.showingAlternateActivity;
            this.updatePresence(false);
        }, Math.max(5, Number(this.settings.alternateSeconds) || 10) * 1000);

        this.timerSaveInterval = setInterval(() => this.saveTimerState(), 1000);
    }

    stopIntervals() {
        clearInterval(this.updateInterval);
        clearInterval(this.alternateInterval);
        clearInterval(this.timerSaveInterval);
        this.updateInterval = null;
        this.alternateInterval = null;
        this.timerSaveInterval = null;
    }

    normalizeUsername(value) {
        return String(value || "boykisseraf").trim().replace(/^@+/, "") || "boykisseraf";
    }

    cleanText(value, fallback = "") {
        const text = String(value ?? "").trim();
        return (text || fallback).slice(0, 128);
    }

    optionalText(value) {
        const text = String(value ?? "").trim();
        return text ? text.slice(0, 128) : undefined;
    }

    cleanUrl(value, fallback = "") {
        const text = String(value ?? "").trim();
        return text || fallback;
    }

    validAppId(value) {
        return /^\d{17,22}$/.test(String(value || ""));
    }

    getApplicationId() {
        const appId = this.cleanText(this.settings.appId, "0");
        return this.validAppId(appId) ? appId : this.defaultApplicationId;
    }

    getAssetApplicationId() {
        const appId = this.cleanText(this.settings.appId, "0");
        return this.validAppId(appId) ? appId : "";
    }

    formatCompact(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return "0";
        const f = (n, s) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(1)).replace(/\.0$/, "") + s;
        if (Math.abs(num) >= 1_000_000_000) return f(num / 1_000_000_000, "B");
        if (Math.abs(num) >= 1_000_000) return f(num / 1_000_000, "M");
        if (Math.abs(num) >= 1_000) return f(num / 1_000, "K");
        return String(Math.trunc(num));
    }

    parseCompactNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : NaN;

        const text = String(value ?? "").trim();
        if (!text) return NaN;

        const match = text.replace(/,/g, "").match(/^([\d.]+)\s*([KMB])?$/i);
        if (!match) return Number(text.replace(/,/g, ""));

        const number = Number(match[1]);
        if (!Number.isFinite(number)) return NaN;

        const suffix = (match[2] || "").toUpperCase();
        if (suffix === "K") return number * 1_000;
        if (suffix === "M") return number * 1_000_000;
        if (suffix === "B") return number * 1_000_000_000;

        return number;
    }

    pickNumber(data, keys) {
        for (const key of keys) {
            const value = data?.[key];
            const parsed = this.parseCompactNumber(value);
            if (Number.isFinite(parsed)) return parsed;
        }

        return NaN;
    }

    pickStatsFromDisplay(display) {
        const text = String(display || "");
        const following = this.parseCompactNumber(text.match(/([\d.,]+\s*[KMB]?)\s+Following/i)?.[1]);
        const followers = this.parseCompactNumber(text.match(/([\d.,]+\s*[KMB]?)\s+Followers/i)?.[1]);
        const likes = this.parseCompactNumber(text.match(/([\d.,]+\s*[KMB]?)\s+Likes/i)?.[1]);

        return { following, followers, likes };
    }

    loadTimerState() {
        const offsetMs = Math.max(0, Number(this.settings.startTimeOffsetMinutes) || 0) * 60_000;
        const saved = Number(this.api.Data.load("savedElapsedMs") || 0);
        const elapsed = this.settings.saveLastTimer === true && saved > 0 ? saved : offsetMs;
        this.timerStartMs = Date.now() - elapsed;
    }

    saveTimerState() {
        if (this.settings.saveLastTimer !== true) return;
        this.api.Data.save("savedElapsedMs", Math.max(0, Date.now() - this.timerStartMs));
    }

    getStartTime() {
        return Math.floor(this.timerStartMs);
    }

    saveSettings() {
        this.api.Data.save("settings", this.settings);
    }

    setButton(activity, label, url, fallbackLabel, fallbackUrl) {
        const buttonText = this.cleanText(label, fallbackLabel).slice(0, 31);
        const buttonUrl = this.cleanUrl(url, fallbackUrl);
        if (!buttonText || !buttonUrl) return;

        activity.buttons = [buttonText];
        activity.metadata = { button_urls: [buttonUrl] };
    }

    setActivity(activity) {
        if (!this.rpc?.dispatch) {
            this.api.Logger.error("Cannot set activity: dispatcher missing");
            return;
        }

        const payload = activity && Object.keys(activity).length
            ? Object.assign(activity, { flags: 1, type: activity.type ?? 0 })
            : {};

        this.rpc.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: payload
        });
    }

    async fetchTikTokStats() {
        const username = this.normalizeUsername(this.settings.username);
        const apiBase = this.cleanUrl(this.settings.statsApiUrl, "");

        if (!apiBase) throw new Error("Stats API URL is empty");

        const apiUrl = new URL(apiBase);
        apiUrl.searchParams.set("username", username);

        const res = await fetch(apiUrl.toString(), {
            headers: { Accept: "application/json" }
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) throw new Error(json?.error || `Stats API failed: ${res.status} ${res.statusText}`);
        if (!json?.ok) throw new Error(json?.error || "Stats API returned ok=false");

        let following = this.pickNumber(json, ["following", "followingCount", "following_count"]);
        let followers = this.pickNumber(json, ["followers", "follower", "followerCount", "follower_count", "fans"]);
        let likes = this.pickNumber(json, ["likes", "heart", "heartCount", "heart_count", "diggCount"]);

        if (![following, followers, likes].every(Number.isFinite)) {
            following = this.parseCompactNumber(json.followingText);
            followers = this.parseCompactNumber(json.followersText);
            likes = this.parseCompactNumber(json.likesText);
        }

        if (![following, followers, likes].every(Number.isFinite)) {
            const fromDisplay = this.pickStatsFromDisplay(json.display);
            following = fromDisplay.following;
            followers = fromDisplay.followers;
            likes = fromDisplay.likes;
        }

        if (![following, followers, likes].every(Number.isFinite)) {
            throw new Error("Stats API returned invalid numbers");
        }

        return {
            username: this.normalizeUsername(json.username || json.uniqueId || username),
            following,
            followers,
            likes,
            followingText: typeof json.followingText === "string" ? json.followingText : this.formatCompact(following),
            followersText: typeof json.followersText === "string" ? json.followersText : this.formatCompact(followers),
            likesText: typeof json.likesText === "string" ? json.likesText : this.formatCompact(likes),
            profileUrl: typeof json.profileUrl === "string" ? json.profileUrl : `https://www.tiktok.com/@${username}`
        };
    }

    async getSafeStats(fetchFresh) {
        if (!fetchFresh && this.lastStats) return this.lastStats;

        try {
            const stats = await this.fetchTikTokStats();
            this.lastStats = stats;
            this.api.Data.save("lastStats", stats);
            return stats;
        } catch (err) {
            this.api.Logger.error("TikTok stats fetch failed", err);

            if (this.lastStats) return this.lastStats;

            const cached = this.api.Data.load("lastStats");
            if (cached && [cached.following, cached.followers, cached.likes].every(v => Number.isFinite(this.parseCompactNumber(v)))) {
                this.lastStats = {
                    ...cached,
                    following: this.parseCompactNumber(cached.following),
                    followers: this.parseCompactNumber(cached.followers),
                    likes: this.parseCompactNumber(cached.likes)
                };
                return this.lastStats;
            }

            return null;
        }
    }

    async applyLargeImage(activity, key, text) {
        if (!this.getAssetApplicationId()) return activity;

        const cleanKey = this.cleanText(key, "");
        if (!cleanKey) return activity;

        const large = await this.getAsset(cleanKey);
        if (!large) return activity;

        activity.assets = {
            ...(activity.assets || {}),
            large_image: large,
            large_text: this.cleanText(text, cleanKey)
        };

        return activity;
    }

    async makeSetupActivity(message) {
        const username = this.normalizeUsername(this.settings.username);
        const activity = {
            application_id: this.getApplicationId(),
            name: this.cleanText(this.settings.appName, "TikTok Profile"),
            details: `@${username}`,
            state: message.slice(0, 128),
            type: 0,
            flags: 1,
            timestamps: { start: this.getStartTime() }
        };

        if (this.settings.tiktokButtonEnabled !== false) {
            this.setButton(activity, this.settings.tiktokButtonText, `https://www.tiktok.com/@${username}`, "Show Profile", `https://www.tiktok.com/@${username}`);
        }

        return this.applyLargeImage(activity, this.settings.largeImage, `@${username}`);
    }

    async makeTikTokActivity(stats) {
        if (!stats) return this.makeSetupActivity(this.settings.statsApiUrl ? "Stats unavailable" : "Set Worker URL in settings");

        const followingText = stats.followingText || this.formatCompact(stats.following);
        const followersText = stats.followersText || this.formatCompact(stats.followers);
        const likesText = stats.likesText || this.formatCompact(stats.likes);
        const profileUrl = stats.profileUrl || `https://www.tiktok.com/@${stats.username}`;

        const activity = {
            application_id: this.getApplicationId(),
            name: this.cleanText(this.settings.appName, "TikTok Profile"),
            details: `@${stats.username}`,
            state: `${followingText} Following • ${followersText} Followers • ${likesText} Likes`.slice(0, 128),
            type: 0,
            flags: 1,
            timestamps: { start: this.getStartTime() }
        };

        if (this.settings.tiktokButtonEnabled !== false) {
            this.setButton(activity, this.settings.tiktokButtonText, profileUrl, "Show Profile", profileUrl);
        }

        await this.applyLargeImage(activity, this.settings.largeImage, `@${stats.username}`);

        return activity;
    }

    async makeAlternateActivity() {
        const appId = this.getApplicationId();
        const assetAppId = this.getAssetApplicationId();
        const url = this.cleanUrl(this.settings.alternateUrl, "https://guns.lol/boykisseraf");

        const activity = {
            application_id: appId,
            name: this.cleanText(this.settings.alternateName, "Custom Link"),
            details: this.optionalText(this.settings.alternateDetails),
            state: this.optionalText(this.settings.alternateState),
            type: 0,
            flags: 1,
            timestamps: { start: this.getStartTime() }
        };

        if (this.settings.alternateButtonEnabled !== false) {
            this.setButton(activity, this.settings.alternateButtonText, url, "Open Link", url);
        }

        if (assetAppId) {
            await this.applyLargeImage(activity, this.settings.alternateLargeImage, this.cleanText(this.settings.alternateName, "Custom Link"));
        }

        return activity;
    }

    async updatePresence(fetchStats = true) {
        try {
            if (this.settings.alternateEnabled === true && this.showingAlternateActivity) {
                this.setActivity(await this.makeAlternateActivity());
                if (fetchStats) this.getSafeStats(true);
                return;
            }

            const stats = await this.getSafeStats(fetchStats);
            this.setActivity(await this.makeTikTokActivity(stats));
        } catch (err) {
            this.api.Logger.error("Update failed", err);
            this.showingAlternateActivity = false;
            this.setActivity(await this.makeTikTokActivity(this.lastStats));
        }
    }

    setting(type, id, name, note = "") {
        return {
            type,
            id,
            name,
            note,
            value: this.settings[id]
        };
    }

    getSettingsPanel() {
        this.settings = Object.assign({}, this.defaults, this.api.Data.load("settings") || {});

        return this.api.UI.buildSettingsPanel({
            settings: [
                {
                    type: "category",
                    id: "main",
                    name: "Main",
                    collapsible: true,
                    shown: true,
                    settings: [
                        this.setting("text", "appId", "App ID", "Use 0 for text-only mode."),
                        this.setting("text", "appName", "App Name"),
                        this.setting("text", "updateMinutes", "Update Minutes")
                    ]
                },
                {
                    type: "category",
                    id: "tiktok",
                    name: "TikTok",
                    collapsible: true,
                    shown: true,
                    settings: [
                        this.setting("text", "username", "Username"),
                        this.setting("text", "statsApiUrl", "Worker URL"),
                        this.setting("text", "largeImage", "Large Image"),
                        this.setting("switch", "tiktokButtonEnabled", "Show Button"),
                        this.setting("text", "tiktokButtonText", "Button Text")
                    ]
                },
                {
                    type: "category",
                    id: "timer",
                    name: "Timer",
                    collapsible: true,
                    shown: false,
                    settings: [
                        this.setting("text", "startTimeOffsetMinutes", "Start Time Offset Minutes"),
                        this.setting("switch", "saveLastTimer", "Save Last Timer")
                    ]
                },
                {
                    type: "category",
                    id: "second",
                    name: "Second RPC",
                    collapsible: true,
                    shown: false,
                    settings: [
                        this.setting("switch", "alternateEnabled", "Enable Second RPC"),
                        this.setting("text", "alternateSeconds", "Switch Seconds"),
                        this.setting("text", "alternateName", "Name"),
                        this.setting("text", "alternateDetails", "Details"),
                        this.setting("text", "alternateState", "State"),
                        this.setting("text", "alternateUrl", "URL"),
                        this.setting("switch", "alternateButtonEnabled", "Show Button"),
                        this.setting("text", "alternateButtonText", "Button Text"),
                        this.setting("text", "alternateLargeImage", "Large Image")
                    ]
                }
            ],
            onChange: (category, id, value) => {
                this.settings[id] = value;
                this.saveSettings();

                if (["updateMinutes", "alternateSeconds"].includes(id)) {
                    this.startIntervals();
                }

                if (["startTimeOffsetMinutes", "saveLastTimer"].includes(id)) {
                    this.loadTimerState();
                }

                if (id === "alternateEnabled" && value !== true) {
                    this.showingAlternateActivity = false;
                }

                this.updatePresence(true);
            }
        });
    }
};
