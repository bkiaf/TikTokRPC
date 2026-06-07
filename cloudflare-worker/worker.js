const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

const MEMORY_CACHE = globalThis.__TIKTOK_RPC_MEMORY_CACHE__ ||= new Map();

function json(data, status = 200, cacheSeconds = 60) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": `public, max-age=${cacheSeconds}`,
            ...CORS_HEADERS
        }
    });
}

function formatTikTokCompact(num) {
    const value = Number(num);
    if (!Number.isFinite(value)) return "0";

    const format = (n, suffix) => {
        const fixed = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(1);
        return fixed.replace(/\.0$/, "") + suffix;
    };

    if (Math.abs(value) >= 1_000_000_000) return format(value / 1_000_000_000, "B");
    if (Math.abs(value) >= 1_000_000) return format(value / 1_000_000, "M");
    if (Math.abs(value) >= 1_000) return format(value / 1_000, "K");

    return String(Math.trunc(value));
}

function parseCompactNumber(value) {
    const raw = String(value || "").trim().replace(/,/g, "");
    const match = raw.match(/^([\d.]+)\s*([KMB])?$/i);
    if (!match) return NaN;

    const num = Number(match[1]);
    if (!Number.isFinite(num)) return NaN;

    const suffix = (match[2] || "").toUpperCase();
    if (suffix === "K") return Math.round(num * 1_000);
    if (suffix === "M") return Math.round(num * 1_000_000);
    if (suffix === "B") return Math.round(num * 1_000_000_000);
    return Math.round(num);
}

function decodeHtmlEntities(text = "") {
    return text
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&")
        .replaceAll("&#x2F;", "/")
        .replaceAll("&#x27;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("\\u002F", "/");
}

function makePayload(user, stats, requestedUsername, meta = {}) {
    const following = Number(stats.followingCount ?? stats.following ?? stats.following_count);
    const followers = Number(stats.followerCount ?? stats.follower ?? stats.followers ?? stats.fans);
    const likes = Number(stats.heartCount ?? stats.heart ?? stats.likes ?? stats.diggCount);

    if (![following, followers, likes].every(Number.isFinite)) {
        throw new Error("TikTok stats were found but numbers are invalid");
    }

    const uniqueId = String(user.uniqueId || user.unique_id || user.username || requestedUsername).replace(/^@+/, "");
    const secUid = String(user.secUid || user.sec_uid || user.secUID || "");
    const followingText = formatTikTokCompact(following);
    const followersText = formatTikTokCompact(followers);
    const likesText = formatTikTokCompact(likes);

    return {
        ok: true,
        username: uniqueId,
        following,
        followers,
        likes,
        followingText,
        followersText,
        likesText,
        display: `${followingText} Following • ${followersText} Followers • ${likesText} Likes`,
        avatarUrl: user.avatarLarger || user.avatarMedium || user.avatarThumb || user.avatar || user.avatar_url || "",
        profileUrl: `https://www.tiktok.com/@${uniqueId}`,
        secUid,
        fetchedAt: new Date().toISOString(),
        ...meta
    };
}

function extractJsonScript(html, id) {
    const re = new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i");
    const match = html.match(re);
    if (!match) return null;

    try {
        return JSON.parse(decodeHtmlEntities(match[1].trim()));
    } catch {
        return null;
    }
}

function pickStatsFromSigiState(state, username) {
    const users = state?.UserModule?.users || {};
    const statsMap = state?.UserModule?.stats || {};

    const user =
        users[username] ||
        Object.values(users).find(u => String(u?.uniqueId || "").toLowerCase() === username.toLowerCase());

    if (!user) return null;

    const stats =
        statsMap[user.id] ||
        statsMap[user.uniqueId] ||
        statsMap[username] ||
        Object.values(statsMap).find(s =>
            Number.isFinite(Number(s?.followerCount)) &&
            Number.isFinite(Number(s?.followingCount)) &&
            Number.isFinite(Number(s?.heartCount))
        );

    if (!stats) return null;
    return { user, stats };
}

function walkObjects(obj, limit = 2500) {
    const out = [];
    const stack = [obj];
    const seen = new Set();

    while (stack.length && out.length < limit) {
        const item = stack.pop();
        if (!item || typeof item !== "object" || seen.has(item)) continue;
        seen.add(item);
        out.push(item);

        for (const value of Object.values(item)) {
            if (value && typeof value === "object") stack.push(value);
        }
    }

    return out;
}

function pickStatsFromAnyData(data, username) {
    const scope = data?.__DEFAULT_SCOPE__ || {};
    const detail =
        scope["webapp.user-detail"] ||
        scope["webapp.user-detail-v2"] ||
        Object.values(scope).find(v => v?.userInfo?.user && v?.userInfo?.stats);

    if (detail?.userInfo?.user && detail?.userInfo?.stats) {
        return { user: detail.userInfo.user, stats: detail.userInfo.stats };
    }

    const direct = data?.userInfo || data?.body?.userInfo || data?.data?.userInfo;
    if (direct?.user && direct?.stats) return { user: direct.user, stats: direct.stats };

    const directUser = data?.user || data?.data?.user;
    const directStats = data?.stats || data?.data?.stats;
    if (directUser && directStats) return { user: directUser, stats: directStats };

    for (const obj of walkObjects(data)) {
        const user = obj?.userInfo?.user || obj?.user;
        const stats = obj?.userInfo?.stats || obj?.stats;
        if (user && stats) {
            const uniqueId = String(user.uniqueId || user.unique_id || "").toLowerCase();
            if (!uniqueId || uniqueId === username.toLowerCase()) return { user, stats };
        }
    }

    return null;
}

function pickRegexNumber(html, keys) {
    for (const key of keys) {
        const patterns = [
            new RegExp(`"${key}"\\s*:\\s*(\\d+)`, "i"),
            new RegExp(`\\\\"${key}\\\\"\\s*:\\s*(\\d+)`, "i"),
            new RegExp(`&quot;${key}&quot;\\s*:\\s*(\\d+)`, "i"),
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) return Number(match[1]);
        }
    }

    return NaN;
}

function pickRegexString(html, keys) {
    for (const key of keys) {
        const patterns = [
            new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, "i"),
            new RegExp(`\\\\"${key}\\\\"\\s*:\\s*\\\\"([^\\\\"]+)\\\\"`, "i"),
            new RegExp(`&quot;${key}&quot;\\s*:\\s*&quot;([^&]+)&quot;`, "i"),
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                try {
                    return JSON.parse(`"${match[1]}"`);
                } catch {
                    return decodeHtmlEntities(match[1]);
                }
            }
        }
    }

    return "";
}

function pickMetaStats(html, username) {
    const text = decodeHtmlEntities(html)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

    const followingMatch = text.match(/([\d.,]+[KMB]?)\s+Following/i);
    const followersMatch = text.match(/([\d.,]+[KMB]?)\s+Followers/i);
    const likesMatch = text.match(/([\d.,]+[KMB]?)\s+Likes/i);

    const following = parseCompactNumber(followingMatch?.[1]);
    const followers = parseCompactNumber(followersMatch?.[1]);
    const likes = parseCompactNumber(likesMatch?.[1]);

    if ([following, followers, likes].every(Number.isFinite)) {
        return makePayload({ uniqueId: username }, {
            followingCount: following,
            followerCount: followers,
            heartCount: likes
        }, username, { source: "html-meta" });
    }

    return null;
}

function parseTikTokJson(jsonData, username) {
    const picked = pickStatsFromAnyData(jsonData, username);
    if (picked) return makePayload(picked.user, picked.stats, username, { source: "json" });

    throw new Error("Could not find TikTok user stats in JSON data");
}

function parseTikTokProfile(html, username) {
    const universal = extractJsonScript(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
    let picked = universal ? pickStatsFromAnyData(universal, username) : null;

    if (!picked) {
        const sigi = extractJsonScript(html, "SIGI_STATE");
        picked = sigi ? pickStatsFromSigiState(sigi, username) || pickStatsFromAnyData(sigi, username) : null;
    }

    if (!picked) {
        const next = extractJsonScript(html, "__NEXT_DATA__");
        picked = next ? pickStatsFromAnyData(next, username) : null;
    }

    if (picked) {
        return makePayload(picked.user, picked.stats, username, { source: "html-json" });
    }

    const following = pickRegexNumber(html, ["followingCount", "following"]);
    const followers = pickRegexNumber(html, ["followerCount", "followers", "fans"]);
    const likes = pickRegexNumber(html, ["heartCount", "heart", "likes", "diggCount"]);

    if ([following, followers, likes].every(Number.isFinite)) {
        return makePayload({
            uniqueId: pickRegexString(html, ["uniqueId", "unique_id", "username"]) || username,
            secUid: pickRegexString(html, ["secUid", "sec_uid", "secUID"]),
            avatarLarger: pickRegexString(html, ["avatarLarger", "avatarMedium", "avatarThumb", "avatar"])
        }, { followingCount: following, followerCount: followers, heartCount: likes }, username, { source: "regex" });
    }

    const meta = pickMetaStats(html, username);
    if (meta) return meta;

    throw new Error("Could not find TikTok user stats in page data");
}

function makeApiUrl(path, params = {}) {
    const url = new URL(`https://www.tiktok.com${path}`);
    const defaults = {
        aid: "1988",
        app_language: "en",
        app_name: "tiktok_web",
        browser_language: "en-US",
        browser_name: "Mozilla",
        browser_online: "true",
        browser_platform: "Win32",
        browser_version: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        channel: "tiktok_web",
        cookie_enabled: "true",
        device_platform: "web_pc",
        focus_state: "true",
        from_page: "user",
        history_len: "2",
        is_fullscreen: "false",
        is_page_visible: "true",
        language: "en",
        os: "windows",
        priority_region: "",
        referer: "",
        region: "US",
        screen_height: "1080",
        screen_width: "1920",
        tz_name: "UTC",
        webcast_language: "en"
    };

    for (const [key, value] of Object.entries({ ...defaults, ...params })) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    return url;
}

function getListArray(data) {
    if (Array.isArray(data?.userList)) return data.userList;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data?.userList)) return data.data.userList;
    if (Array.isArray(data?.data?.users)) return data.data.users;
    if (Array.isArray(data?.following)) return data.following;
    return [];
}

function withFollowing(payload, following, meta = {}) {
    const next = {
        ...payload,
        following,
        followingText: formatTikTokCompact(following),
        followingSource: meta.followingSource || payload.followingSource || "profile-stats",
        profileFollowing: meta.profileFollowing ?? payload.profileFollowing ?? payload.following,
        followingListCounted: meta.followingListCounted ?? payload.followingListCounted,
    };

    next.display = `${next.followingText} Following • ${next.followersText} Followers • ${next.likesText} Likes`;
    return next;
}

async function fetchFollowingListCount(secUid, profileCount, headers) {
    if (!secUid) throw new Error("Missing secUid for following list count");
    if (!Number.isFinite(profileCount) || profileCount < 0 || profileCount > 500) {
        throw new Error("Following list count skipped");
    }

    const seen = new Set();
    let cursor = 0;
    let pages = 0;
    const maxPages = Math.max(2, Math.min(25, Math.ceil(profileCount / 30) + 3));

    while (pages < maxPages) {
        const apiUrl = makeApiUrl("/api/user/list/", {
            secUid,
            count: "30",
            minCursor: "0",
            maxCursor: String(cursor),
            cursor: String(cursor)
        });

        const res = await fetch(apiUrl.toString(), {
            headers: {
                ...headers,
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.tiktok.com/"
            },
            redirect: "follow"
        });

        if (!res.ok) throw new Error(`Following list returned ${res.status}`);

        const data = await res.json().catch(() => null);
        if (!data) throw new Error("Following list returned invalid JSON");

        const list = getListArray(data);
        if (!list.length && pages === 0) throw new Error("Following list returned empty");

        for (const item of list) {
            const user = item?.user || item;
            const key = user?.secUid || user?.id || user?.uniqueId || JSON.stringify(user);
            if (key) seen.add(String(key));
        }

        pages++;

        const hasMore = data.hasMore === true || data.has_more === true || data.hasMore === 1 || data.has_more === 1;
        const nextCursor = Number(data.maxCursor ?? data.max_cursor ?? data.cursor ?? data.nextCursor ?? 0);

        if (!hasMore || !Number.isFinite(nextCursor) || nextCursor === cursor) break;
        cursor = nextCursor;
    }

    if (!seen.size) throw new Error("Following list count was empty");
    return { count: seen.size, pages };
}

async function improveFollowingCount(payload, headers) {
    try {
        const profileFollowing = Number(payload.following);
        const exact = await fetchFollowingListCount(payload.secUid, profileFollowing, headers);
        return withFollowing(payload, exact.count, {
            followingSource: "following-list",
            profileFollowing,
            followingListCounted: exact.count,
            followingListPages: exact.pages
        });
    } catch (err) {
        return {
            ...payload,
            followingSource: payload.followingSource || "profile-stats",
            followingListError: String(err?.message || err)
        };
    }
}

function buildHeaders(accept = "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7") {
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": accept,
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.tiktok.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Upgrade-Insecure-Requests": "1"
    };
}

async function fetchTikTok(username, debug = false) {
    const encoded = encodeURIComponent(username);
    const htmlHeaders = buildHeaders();
    const jsonHeaders = buildHeaders("application/json, text/plain, */*");

    const apiUrl = makeApiUrl("/api/user/detail/", { uniqueId: username });

    const targets = [
        { url: `https://www.tiktok.com/@${encoded}?is_from_webapp=1&sender_device=pc&lang=en`, type: "html", headers: htmlHeaders },
        { url: `https://www.tiktok.com/@${encoded}?lang=en`, type: "html", headers: htmlHeaders },
        { url: `https://www.tiktok.com/@${encoded}`, type: "html", headers: htmlHeaders },
        { url: apiUrl.toString(), type: "json", headers: jsonHeaders }
    ];

    const errors = [];

    for (const target of targets) {
        try {
            const res = await fetch(target.url, { headers: target.headers, redirect: "follow" });
            if (!res.ok) {
                errors.push(`${target.type} ${res.status} ${target.url}`);
                continue;
            }

            const contentType = res.headers.get("content-type") || "";

            if (target.type === "json" || contentType.includes("application/json")) {
                const data = await res.json();
                const payload = await improveFollowingCount(parseTikTokJson(data, username), htmlHeaders);
                return debug ? { ...payload, debugTargets: errors } : payload;
            }

            const html = await res.text();
            const payload = await improveFollowingCount(parseTikTokProfile(html, username), htmlHeaders);
            return debug ? { ...payload, debugTargets: errors } : payload;
        } catch (err) {
            errors.push(`${target.type} ${String(err?.message || err)} ${target.url}`);
        }
    }

    throw new Error(errors.join(" | ") || "Unknown TikTok fetch error");
}

async function readJsonResponse(response) {
    try {
        return await response.clone().json();
    } catch {
        return null;
    }
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const username = (url.searchParams.get("username") || "boykisseraf")
            .trim()
            .replace(/^@+/, "");

        if (!/^[a-zA-Z0-9._]{2,32}$/.test(username)) {
            return json({ ok: false, error: "Invalid TikTok username" }, 400);
        }

        const cache = caches.default;
        const lower = username.toLowerCase();
        const noCache = url.searchParams.has("nocache") || url.searchParams.has("debug") || url.searchParams.has("v");
        const debug = url.searchParams.has("debug");
        const freshKey = new Request(`https://tiktok-rpc-cache.local/fresh/${lower}`);
        const staleKey = new Request(`https://tiktok-rpc-cache.local/stale/${lower}`);

        if (!noCache) {
            const fresh = await cache.match(freshKey);
            if (fresh) return fresh;
        }

        try {
            const data = await fetchTikTok(username, debug);
            const cleanData = {
                ...data,
                stale: false,
                cached: false,
                lastSuccessfulFetchAt: new Date().toISOString()
            };

            MEMORY_CACHE.set(lower, cleanData);

            const freshResponse = json(cleanData, 200, 60);
            const staleResponse = json({ ...cleanData, stale: true, cached: true }, 200, 86400);

            ctx.waitUntil(cache.put(freshKey, freshResponse.clone()));
            ctx.waitUntil(cache.put(staleKey, staleResponse.clone()));

            return freshResponse;
        } catch (err) {
            const liveError = String(err?.message || err);
            const stale = await cache.match(staleKey);

            if (stale) {
                const cachedData = await readJsonResponse(stale);
                if (cachedData?.ok) {
                    return json({
                        ...cachedData,
                        ok: true,
                        stale: true,
                        cached: true,
                        warning: "TikTok live fetch failed, using last successful stats",
                        liveError
                    }, 200, 300);
                }
            }

            const memoryData = MEMORY_CACHE.get(lower);
            if (memoryData?.ok) {
                return json({
                    ...memoryData,
                    ok: true,
                    stale: true,
                    cached: true,
                    memoryCached: true,
                    warning: "TikTok live fetch failed, using in-memory stats",
                    liveError
                }, 200, 300);
            }

            return json({
                ok: false,
                error: liveError,
                hint: "TikTok blocked the live fetch or changed the page data. Once one successful fetch happens, the Worker will reuse the last good stats during temporary failures."
            }, 500);
        }
    }
};
