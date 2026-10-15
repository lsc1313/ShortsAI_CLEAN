import axios from "axios";

// History-only public-domain archive search. No API keys required.
// Fail closed: missing rights/metadata means the image is not returned.
const client = axios.create({ timeout: 15000, headers: { "User-Agent": "ShortsAI-History/1.0 (educational video metadata lookup)" } });
const text = value => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const terms = q => String(q || "").replace(/\b(watching|citizens|dramatic|cinematic|close up|scene|under|during|historical)\b/gi, " ").trim();
const archiveQuery = q => {
    const words = terms(q).split(/\s+/).filter(Boolean);
    // Archive search indexes artifact names, not full cinematic descriptions.
    return words.slice(0, 5).join(" ");
};
const candidate = (provider, url, title, description, width, height, source, license) => ({
    provider, url, tags: [title, description].filter(Boolean).join(" "), description: text(description),
    width: Number(width) || 0, height: Number(height) || 0,
    sourceUrl: source, license, score: 90
});
export async function searchMetHistory(query) {
    if (!query) return [];
    try {
        const search = await client.get("https://collectionapi.metmuseum.org/public/collection/v1/search", { params: { q: archiveQuery(query), hasImages: true } });
        const ids = (search.data?.objectIDs || []).slice(0, 12);
        const found = await Promise.all(ids.map(async id => {
            try {
                const { data: o } = await client.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
                if (!o.isPublicDomain || !o.primaryImage) return null;
                return candidate("MetMuseum", o.primaryImageSmall || o.primaryImage, o.title, [o.objectName, o.culture, o.period, o.artistDisplayName].join(" "), 0, 0, o.objectURL, "CC0");
            } catch { return null; }
        }));
        console.log(`[MetMuseum] eligible=${found.filter(Boolean).length} query=${archiveQuery(query)}`);
        return found.filter(Boolean).slice(0, 6);
    } catch (e) { console.log("[MetMuseum] search unavailable:", e.response?.status || e.message, "- provider skipped"); return []; }
}
export async function searchAicHistory(query) {
    if (!query) return [];
    try {
        const { data } = await client.get("https://api.artic.edu/api/v1/artworks/search", {
            params: { q: archiveQuery(query), limit: 10, fields: "id,title,image_id,is_public_domain,thumbnail,date_display,artist_title" }
        });
        const eligible = (data.data || []).filter(o => o.is_public_domain && o.image_id).map(o =>
            candidate("ArtInstituteChicago", `https://www.artic.edu/iiif/2/${o.image_id}/full/1200,/0/default.jpg`,
                o.title, [o.thumbnail?.alt_text, o.date_display, o.artist_title].join(" "), 0, 0,
                `https://www.artic.edu/artworks/${o.id}`, "CC0")
        ).slice(0, 6);
        console.log(`[ArtInstituteChicago] eligible=${eligible.length} rejected=${JSON.stringify(rejected)} query=${archiveQuery(query)}`);
        return eligible;
    } catch (e) { console.log("[ArtInstituteChicago] search unavailable:", e.message); return []; }
}
let commonsRateLimitedUntil = 0;
export function isCommonsRateLimited() { return Date.now() < commonsRateLimitedUntil; }
export async function searchCommonsHistory(query) {
    if (!query) return [];
    if (isCommonsRateLimited()) {
        console.warn("[WikimediaCommons] Circuit open after HTTP 429; search skipped");
        return [];
    }
    try {
        const { data } = await client.get("https://commons.wikimedia.org/w/api.php", { params: {
            action: "query", generator: "search", gsrsearch: archiveQuery(query),
            gsrnamespace: 6, gsrlimit: 15, prop: "imageinfo", iiprop: "url|size|extmetadata",
            iiurlwidth: 1200, format: "json", origin: "*"
        } });
        const pages = Object.values(data.query?.pages || {});
        const rejected = { format: 0, rights: 0, imageUrl: 0 };
        const eligible = pages.flatMap(p => {
            // Archive PDFs and book scans are not still-image assets for Shorts.
            if (/\.(pdf|djvu|tiff?|svg)$/i.test(String(p.title || ""))) { rejected.format++; return []; }
            const info = p.imageinfo?.[0];
            const meta = info?.extmetadata || {};
            const license = text(meta.LicenseShortName?.value);
            const usage = text(meta.UsageTerms?.value);
            // Conservative: CC BY and CC BY-SA need attribution; accept only PD/CC0 initially.
            if (!/^(CC0|Public domain|PD[- ]|PDM)/i.test(license) && !/public domain/i.test(usage)) { rejected.rights++; return []; }
            const url = info?.thumburl || info?.url;
            if (!url || !/\.(jpe?g|png|webp)(\?|$)/i.test(url)) { rejected.imageUrl++; return []; }
            return [candidate("WikimediaCommons", url, text(meta.ObjectName?.value || p.title),
                text(meta.ImageDescription?.value), info.width, info.height,
                info.descriptionurl, license)];
        }).slice(0, 8);
        console.log(`[WikimediaCommons] results=${pages.length} eligible=${eligible.length} query=${archiveQuery(query)}`);
        return eligible;
    } catch (e) {
        if (e.response?.status === 429) {
            const retryAfter = Number(e.response?.headers?.["retry-after"]);
            const cooldownMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 3600000) : 300000;
            commonsRateLimitedUntil = Date.now() + cooldownMs;
            console.warn("[WikimediaCommons] HTTP 429; circuit opened for", Math.ceil(cooldownMs / 1000), "seconds");
            return [];
        }
        console.log("[WikimediaCommons] search unavailable:", e.message); return [];
    }
}
