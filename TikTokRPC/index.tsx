import * as DataStore from "@api/DataStore";
import { Switch } from "@components/Switch";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, FluxDispatcher, Forms, React, TextInput } from "@webpack/common";

const SOCKET_ID = "TikTokRPC";
const SAVED_ELAPSED_KEY = "TikTokRPC.savedElapsedMs.v4";
const SAVED_OFFSET_KEY = "TikTokRPC.savedOffsetMs.v4";
const logger = new Logger("TikTokRPC");

let showingAlternateActivity = false;
let lastStats: TikTokStats | undefined;
let updatePresenceNow: ((fetchStats?: boolean) => void) | undefined;

interface TikTokStats {
    username: string;
    following: number;
    followers: number;
    likes: number;
    followingText?: string;
    followersText?: string;
    likesText?: string;
    profileUrl?: string;
}

const settings = definePluginSettings({
    config: {
        type: OptionType.COMPONENT,
        component: TikTokRPCSettings
    },
    username: {
        type: OptionType.STRING,
        description: "TikTok username without @",
        default: "boykisseraf",
        hidden: true
    },
    statsApiUrl: {
        type: OptionType.STRING,
        description: "Cloudflare Worker URL",
        default: "",
        hidden: true
    },
    appId: {
        type: OptionType.STRING,
        description: "Discord Application ID",
        default: "0",
        hidden: true
    },
    appName: {
        type: OptionType.STRING,
        description: "TikTok activity name",
        default: "TikTok Profile",
        hidden: true
    },
    largeImage: {
        type: OptionType.STRING,
        description: "TikTok large image asset key",
        default: "",
        hidden: true
    },
    tiktokButtonEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show TikTok button",
        default: true,
        hidden: true
    },
    tiktokButtonText: {
        type: OptionType.STRING,
        description: "TikTok button text",
        default: "Show Profile",
        hidden: true
    },
    updateMinutes: {
        type: OptionType.NUMBER,
        description: "TikTok stats refresh minutes",
        default: 5,
        hidden: true
    },
    startTimeOffsetMinutes: {
        type: OptionType.NUMBER,
        description: "Timer start offset minutes",
        default: 0,
        hidden: true
    },
    saveLastTimer: {
        type: OptionType.BOOLEAN,
        description: "Save last timer",
        default: true,
        hidden: true
    },
    alternateEnabled: {
        type: OptionType.BOOLEAN,
        description: "Alternate RPC enabled",
        default: false,
        hidden: true
    },
    alternateSeconds: {
        type: OptionType.NUMBER,
        description: "Switch seconds",
        default: 10,
        hidden: true
    },
    alternateName: {
        type: OptionType.STRING,
        description: "Second RPC activity name",
        default: "guns.lol",
        hidden: true
    },
    alternateDetails: {
        type: OptionType.STRING,
        description: "Second RPC first line",
        default: "boykisseraf",
        hidden: true
    },
    alternateState: {
        type: OptionType.STRING,
        description: "Second RPC second line",
        default: "https://guns.lol/boykisseraf",
        hidden: true
    },
    alternateLargeImage: {
        type: OptionType.STRING,
        description: "Second RPC large image asset key",
        default: "",
        hidden: true
    },
    alternateButtonEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show second RPC button",
        default: true,
        hidden: true
    },
    alternateButtonText: {
        type: OptionType.STRING,
        description: "Second RPC button text",
        default: "Open Link",
        hidden: true
    },
    alternateUrl: {
        type: OptionType.STRING,
        description: "Second RPC button URL",
        default: "https://guns.lol/boykisseraf",
        hidden: true
    },
    showDebugActivity: {
        type: OptionType.BOOLEAN,
        description: "Show debug activity",
        default: true,
        hidden: true
    }
});


type SettingValue = string | number | boolean;

function useRefresh() {
    const [, setTick] = React.useState(0);
    return () => setTick(tick => tick + 1);
}

function readSetting<T extends SettingValue>(key: string, fallback: T): T {
    const value = (settings.store as Record<string, any>)[key];
    return (value === undefined || value === null) ? fallback : value as T;
}

function requestPresenceUpdate(fetchStats = false) {
    updatePresenceNow?.(fetchStats);
}

function writeSetting(key: string, value: SettingValue, refresh: () => void) {
    (settings.store as Record<string, any>)[key] = value;

    if (key === "alternateEnabled" && value === false) {
        showingAlternateActivity = false;
    }

    refresh();
    requestPresenceUpdate(key === "username" || key === "statsApiUrl");
}

function SettingsCard(props: { title: string; disabled?: boolean; children: any; }) {
    return (
        <div style={{
            border: "1px solid var(--background-modifier-accent)",
            borderRadius: "14px",
            padding: "14px",
            marginBottom: "14px",
            background: props.disabled ? "var(--background-secondary)" : "var(--background-secondary-alt)",
            opacity: props.disabled ? 0.55 : 1
        }}>
            <Forms.FormTitle tag="h3" style={{ marginBottom: "12px" }}>{props.title}</Forms.FormTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {props.children}
            </div>
        </div>
    );
}

function TextField(props: { label: string; setting: string; fallback: string; type?: "text" | "number"; disabled?: boolean; refresh: () => void; }) {
    const value = readSetting(props.setting, props.fallback);
    return (
        <div>
            <Forms.FormTitle tag="h5">{props.label}</Forms.FormTitle>
            <TextInput
                type="text"
                value={String(value)}
                placeholder={props.fallback}
                disabled={props.disabled}
                onChange={value => writeSetting(props.setting, props.type === "number" ? Math.max(0, Number(value) || 0) : value, props.refresh)}
            />
        </div>
    );
}

function ToggleField(props: { label: string; setting: string; fallback: boolean; disabled?: boolean; refresh: () => void; }) {
    const checked = readSetting(props.setting, props.fallback) !== false;
    return (
        <label style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "10px",
            borderRadius: "10px",
            background: "var(--background-secondary)"
        }}>
            <Forms.FormTitle tag="h5" style={{ margin: 0 }}>{props.label}</Forms.FormTitle>
            <Switch
                checked={checked}
                disabled={props.disabled}
                onChange={value => writeSetting(props.setting, value, props.refresh)}
            />
        </label>
    );
}

function TikTokRPCSettings() {
    const refresh = useRefresh();
    const secondEnabled = readSetting("alternateEnabled", false) === true;

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <SettingsCard title="Main">
                <TextField label="Discord App ID" setting="appId" fallback="0" refresh={refresh} />
                <TextField label="Switch Seconds" setting="alternateSeconds" fallback="10" type="number" refresh={refresh} />
                <ToggleField label="Debug Activity" setting="showDebugActivity" fallback={true} refresh={refresh} />
            </SettingsCard>

            <SettingsCard title="TikTok">
                <TextField label="Username" setting="username" fallback="boykisseraf" refresh={refresh} />
                <TextField label="Worker URL" setting="statsApiUrl" fallback="" refresh={refresh} />
                <TextField label="Activity Name" setting="appName" fallback="TikTok Profile" refresh={refresh} />
                <TextField label="Image Asset" setting="largeImage" fallback="" refresh={refresh} />
                <TextField label="Button Text" setting="tiktokButtonText" fallback="Show Profile" refresh={refresh} />
                <ToggleField label="Show Button" setting="tiktokButtonEnabled" fallback={true} refresh={refresh} />
            </SettingsCard>

            <SettingsCard title="Timer">
                <TextField label="Start Offset Minutes" setting="startTimeOffsetMinutes" fallback="0" type="number" refresh={refresh} />
                <TextField label="Update Stats Minutes" setting="updateMinutes" fallback="5" type="number" refresh={refresh} />
                <ToggleField label="Save Last Timer" setting="saveLastTimer" fallback={true} refresh={refresh} />
            </SettingsCard>

            <SettingsCard title="Second RPC" disabled={!secondEnabled}>
                <ToggleField label="Enable Second RPC" setting="alternateEnabled" fallback={false} refresh={refresh} />
                <ToggleField label="Show Button" setting="alternateButtonEnabled" fallback={true} disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Activity Name" setting="alternateName" fallback="guns.lol" disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Image Asset" setting="alternateLargeImage" fallback="" disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Line 1" setting="alternateDetails" fallback="boykisseraf" disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Line 2" setting="alternateState" fallback="https://guns.lol/boykisseraf" disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Button Text" setting="alternateButtonText" fallback="Open Link" disabled={!secondEnabled} refresh={refresh} />
                <TextField label="Button URL" setting="alternateUrl" fallback="https://guns.lol/boykisseraf" disabled={!secondEnabled} refresh={refresh} />
            </SettingsCard>
        </div>
    );
}

function normalizeUsername(username: string) {
    return (username || "boykisseraf").trim().replace(/^@+/, "");
}

function validDiscordAppId(appId?: string) {
    return /^\d{16,21}$/.test((appId || "").trim()) && appId !== "0";
}

function formatTikTokCompact(num: number) {
    const value = Number(num);
    if (!Number.isFinite(value)) return "0";

    const format = (n: number, suffix: string) => {
        const fixed = n >= 100 ? n.toFixed(0) : n.toFixed(1);
        return fixed.replace(/\.0$/, "") + suffix;
    };

    if (Math.abs(value) >= 1_000_000_000) return format(value / 1_000_000_000, "B");
    if (Math.abs(value) >= 1_000_000) return format(value / 1_000_000, "M");
    if (Math.abs(value) >= 1_000) return format(value / 1_000, "K");
    return String(Math.trunc(value));
}

let timerLoaded = false;
let timerBaseElapsedMs = 0;
let timerSessionStartedAt = 0;
let timerAppliedOffsetMs = 0;
let timerPersistMode = true;

function getConfiguredOffsetMs() {
    const minutes = Math.max(0, Number(settings.store.startTimeOffsetMinutes) || 0);
    return minutes * 60_000;
}

function shouldSaveLastTimer() {
    return settings.store.saveLastTimer !== false;
}

function validSavedNumber(value: unknown) {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function getRawElapsedMs() {
    return Math.max(0, timerBaseElapsedMs + (Date.now() - timerSessionStartedAt));
}

async function loadTimerState() {
    const configuredOffset = getConfiguredOffsetMs();
    const saveLastTimer = shouldSaveLastTimer();

    timerPersistMode = saveLastTimer;
    timerAppliedOffsetMs = configuredOffset;

    if (!saveLastTimer) {
        timerBaseElapsedMs = configuredOffset;
        timerSessionStartedAt = Date.now();
        timerLoaded = true;
        return;
    }

    const savedElapsed = validSavedNumber(await DataStore.get(SAVED_ELAPSED_KEY));
    const savedOffset = validSavedNumber(await DataStore.get(SAVED_OFFSET_KEY));

    if (savedElapsed !== undefined) {
        const oldOffset = savedOffset ?? configuredOffset;
        timerBaseElapsedMs = Math.max(0, savedElapsed + configuredOffset - oldOffset);
    } else {
        timerBaseElapsedMs = configuredOffset;
    }

    timerSessionStartedAt = Date.now();
    timerLoaded = true;
    saveTimerState();
}

function ensureTimerLoaded() {
    if (timerLoaded) return;

    const configuredOffset = getConfiguredOffsetMs();

    timerBaseElapsedMs = configuredOffset;
    timerSessionStartedAt = Date.now();
    timerAppliedOffsetMs = configuredOffset;
    timerPersistMode = shouldSaveLastTimer();
    timerLoaded = true;

    saveTimerState();
}

function applyTimerSettingsIfChanged() {
    const configuredOffset = getConfiguredOffsetMs();
    const saveLastTimer = shouldSaveLastTimer();

    if (saveLastTimer !== timerPersistMode) {
        timerBaseElapsedMs = saveLastTimer ? getRawElapsedMs() : configuredOffset;
        timerSessionStartedAt = Date.now();
        timerAppliedOffsetMs = configuredOffset;
        timerPersistMode = saveLastTimer;
        saveTimerState();
        return;
    }

    if (configuredOffset === timerAppliedOffsetMs) return;

    if (saveLastTimer) {
        timerBaseElapsedMs = Math.max(0, getRawElapsedMs() + configuredOffset - timerAppliedOffsetMs);
    } else {
        timerBaseElapsedMs = configuredOffset;
    }

    timerSessionStartedAt = Date.now();
    timerAppliedOffsetMs = configuredOffset;
    saveTimerState();
}

function getElapsedMs() {
    ensureTimerLoaded();
    applyTimerSettingsIfChanged();
    return getRawElapsedMs();
}

function saveTimerState() {
    if (!timerLoaded || !timerPersistMode) return;

    const elapsed = getRawElapsedMs();
    void DataStore.setMany([
        [SAVED_ELAPSED_KEY, elapsed],
        [SAVED_OFFSET_KEY, timerAppliedOffsetMs]
    ]);
}

function getStartTime() {
    return Date.now() - getElapsedMs();
}

async function getApplicationAsset(appId: string, key: string): Promise<string | undefined> {
    if (!validDiscordAppId(appId) || !key) return undefined;

    try {
        const ids = await ApplicationAssetUtils.fetchAssetIds(appId, [key]);
        return ids?.[0];
    } catch (err) {
        logger.error("Failed to fetch Discord application asset", err);
        return undefined;
    }
}

function safeSetActivity(activity: Activity | null) {
    try {
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity,
            socketId: SOCKET_ID,
        });
    } catch (err) {
        logger.error("Failed to dispatch TikTokRPC activity", err);
    }
}

function makeTextActivity(state: string): Activity {
    const username = normalizeUsername(settings.store.username);
    const appId = (settings.store.appId || "0").trim() || "0";
    const appName = (settings.store.appName || "TikTok Profile").trim() || "TikTok Profile";

    return {
        application_id: appId,
        name: appName,
        details: `@${username}`,
        state: state.slice(0, 128),
        type: ActivityType.PLAYING,
        flags: ActivityFlags.INSTANCE,
        timestamps: {
            start: getStartTime()
        }
    };
}

async function fetchTikTokStats(): Promise<TikTokStats> {
    const username = normalizeUsername(settings.store.username);
    const apiBase = settings.store.statsApiUrl?.trim();

    if (!apiBase) throw new Error("Stats API URL is empty");

    const apiUrl = new URL(apiBase);
    apiUrl.searchParams.set("username", username);

    const res = await fetch(apiUrl.toString(), {
        headers: { Accept: "application/json" }
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(json?.error || `Stats API failed: ${res.status} ${res.statusText}`);
    }

    if (!json?.ok) throw new Error(json?.error || "Stats API returned ok=false");

    const following = Number(json.following);
    const followers = Number(json.followers);
    const likes = Number(json.likes);

    if (![following, followers, likes].every(Number.isFinite)) {
        throw new Error("Stats API returned invalid numbers");
    }

    return {
        username: normalizeUsername(json.username || username),
        following,
        followers,
        likes,
        followingText: typeof json.followingText === "string" ? json.followingText : undefined,
        followersText: typeof json.followersText === "string" ? json.followersText : undefined,
        likesText: typeof json.likesText === "string" ? json.likesText : undefined,
        profileUrl: typeof json.profileUrl === "string" ? json.profileUrl : `https://www.tiktok.com/@${username}`
    };
}

function cleanText(value: string | undefined, fallback: string) {
    const text = (value || "").trim();
    return (text || fallback).slice(0, 128);
}

function cleanUrl(value: string | undefined, fallback: string) {
    const text = (value || "").trim();
    return text || fallback;
}

function optionalText(value: string | undefined) {
    const text = (value || "").trim();
    return text ? text.slice(0, 128) : undefined;
}

function setActivityButton(activity: Activity, label: string | undefined, url: string | undefined, fallbackLabel: string, fallbackUrl: string) {
    const buttonText = cleanText(label, fallbackLabel).slice(0, 31);
    const buttonUrl = cleanUrl(url, fallbackUrl);

    if (!buttonText || !buttonUrl) return;

    activity.buttons = [
        buttonText
    ];

    activity.metadata = {
        button_urls: [
            buttonUrl
        ]
    };
}

async function createAlternateActivity(): Promise<Activity> {
    const appId = (settings.store.appId || "0").trim() || "0";
    const url = cleanUrl(settings.store.alternateUrl, "https://guns.lol/boykisseraf");
    const activity: Activity = {
        application_id: appId,
        name: cleanText(settings.store.alternateName, "Custom Link"),
        details: optionalText(settings.store.alternateDetails),
        state: optionalText(settings.store.alternateState),
        type: ActivityType.PLAYING,
        flags: ActivityFlags.INSTANCE,
        timestamps: {
            start: getStartTime()
        }
    };

    if (settings.store.alternateButtonEnabled !== false) {
        setActivityButton(activity, settings.store.alternateButtonText, url, "Open Link", url);
    }

    if (validDiscordAppId(appId)) {
        const imageKey = settings.store.alternateLargeImage?.trim();
        const largeImage = imageKey ? await getApplicationAsset(appId, imageKey) : undefined;
        if (largeImage) {
            activity.assets = {
                large_image: largeImage,
                large_text: cleanText(settings.store.alternateName, "Custom Link")
            };
        }
    }

    return activity;
}

async function createActivity(stats: TikTokStats): Promise<Activity> {
    if (settings.store.alternateEnabled === true && showingAlternateActivity) {
        return createAlternateActivity();
    }

    const followingText = stats.followingText || formatTikTokCompact(stats.following);
    const followersText = stats.followersText || formatTikTokCompact(stats.followers);
    const likesText = stats.likesText || formatTikTokCompact(stats.likes);
    const profileUrl = stats.profileUrl || `https://www.tiktok.com/@${stats.username}`;
    const appId = (settings.store.appId || "0").trim() || "0";

    const activity = makeTextActivity(`${followingText} Following • ${followersText} Followers • ${likesText} Likes`);
    activity.details = `@${stats.username}`;

    if (settings.store.tiktokButtonEnabled !== false) {
        setActivityButton(activity, settings.store.tiktokButtonText, profileUrl, "Show Profile", profileUrl);
    }

    if (validDiscordAppId(appId)) {
        const imageKey = settings.store.largeImage?.trim();
        const largeImage = imageKey ? await getApplicationAsset(appId, imageKey) : undefined;
        if (largeImage) {
            activity.assets = {
                large_image: largeImage,
                large_text: `@${stats.username}`
            };
        }
    }

    return activity;
}

export default definePlugin({
    name: "TikTokRPC",
    description: "Shows a TikTok profile and live public statistics as Discord Rich Presence",
    tags: ["Activity", "TikTok"],
    authors: [{ name: "boykisseraf", id: 1066397096871211020n }],

    settings,

    patches: [
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false"
            }
        }
    ],

    updateInterval: undefined as number | undefined,
    alternateInterval: undefined as number | undefined,
    timerSaveInterval: undefined as number | undefined,
    timerSaveHandler: undefined as (() => void) | undefined,

    async start() {
        try {
            await loadTimerState();
            updatePresenceNow = fetchStats => void this.updatePresence(fetchStats);
            this.timerSaveHandler = () => saveTimerState();
            window.addEventListener("pagehide", this.timerSaveHandler);
            window.addEventListener("beforeunload", this.timerSaveHandler);
            window.addEventListener("visibilitychange", this.timerSaveHandler);
            this.timerSaveInterval = window.setInterval(() => saveTimerState(), 1000);

            void this.updatePresence(true);
            const minutes = Math.max(1, Number(settings.store.updateMinutes) || 5);
            this.updateInterval = window.setInterval(() => {
                saveTimerState();
                void this.updatePresence(true);
            }, minutes * 60_000);

            this.alternateInterval = window.setInterval(() => {
                if (settings.store.alternateEnabled !== true) {
                    if (showingAlternateActivity) {
                        showingAlternateActivity = false;
                        void this.updatePresence(false);
                    }
                    return;
                }

                showingAlternateActivity = !showingAlternateActivity;
                void this.updatePresence(false);
            }, Math.max(5, Number(settings.store.alternateSeconds) || 10) * 1000);
        } catch (err) {
            logger.error("TikTokRPC start failed", err);
            safeSetActivity(makeTextActivity("TikTokRPC start error"));
        }
    },

    stop() {
        saveTimerState();
        timerLoaded = false;

        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }

        if (this.alternateInterval) {
            window.clearInterval(this.alternateInterval);
            this.alternateInterval = undefined;
        }

        if (this.timerSaveInterval) {
            window.clearInterval(this.timerSaveInterval);
            this.timerSaveInterval = undefined;
        }

        if (this.timerSaveHandler) {
            window.removeEventListener("pagehide", this.timerSaveHandler);
            window.removeEventListener("beforeunload", this.timerSaveHandler);
            window.removeEventListener("visibilitychange", this.timerSaveHandler);
            this.timerSaveHandler = undefined;
        }

        updatePresenceNow = undefined;
        showingAlternateActivity = false;
        safeSetActivity(null);
    },

    async updatePresence(fetchStats = true) {
        try {
            if (fetchStats || !lastStats) {
                lastStats = await fetchTikTokStats();
            }

            if (!lastStats && showingAlternateActivity) {
                safeSetActivity(await createAlternateActivity());
                return;
            }

            safeSetActivity(await createActivity(lastStats));
        } catch (err) {
            logger.error("TikTokRPC update failed", err);

            if (showingAlternateActivity) {
                safeSetActivity(await createAlternateActivity());
            }
        }
    }
});
