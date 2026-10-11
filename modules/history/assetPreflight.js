import fs from "node:fs";
import path from "node:path";
import { searchCommonsHistory } from "../providers/historyArchives.js";
import { downloadImage } from "../image/download.js";

/**
 * History-only asset-first research stage.
 * Archives are visual references, NOT sources proving narration claims.
 * Downloads must succeed before an asset can be offered to the Director.
 */
// Search different visual categories rather than filling the pool with the first painting.
function buildResearchQueries(queries) {
    return [...new Map((queries || [])
        .filter(item => item && typeof item === "object")
        .map(item => ({
            query: String(item.query || "").trim(),
            category: String(item.category || "").trim().toLowerCase()
        }))
        .filter(item => item.query.length >= 4 && item.category.length >= 3)
        .map(item => [item.query.toLowerCase(), item])).values()].slice(0, 8);
}

export async function collectHistoryAssets(queries, { maxAssets = 12, outputDir = "media/history-preflight" } = {}) {
    const research = buildResearchQueries(queries);
    if (research.length < 3) {
        throw new Error("[HISTORY ASSET PREFLIGHT] Research plan needs at least 3 searches");
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const results = [];
    const seen = new Set();
    const tried = new Set();
    const stats = { queries: 0, candidates: 0, duplicate: 0, downloadFailed: 0, tooSmall: 0, accepted: 0 };
    const searchAll = async query => {
        // Wikimedia Commons is the only currently working archive provider.
        // Met returns 410 and Art Institute image downloads return 403 in the observed run.
        return searchCommonsHistory(query);
    };
    const unsuitableMetadata = candidate => {
        const title = String(candidate.tags || "").toLowerCase();
        // A map/chart/diagram or unrelated administrative material is not a visual
        // depiction of a physical historical action. This is a conservative filter,
        // not a substitute for the editorial semantic gate.
        return /\\b(map of|location map|chart of|diagram of|inquiry|committee|courtroom|hearing|investigation|portrait of)\\b/i.test(title);
    };
    const collectQuery = async ({ query, category }, limit = 3) => {
        const normalized = query.toLowerCase().trim();
        if (!normalized || tried.has(normalized) || results.length >= maxAssets) return;
        tried.add(normalized);
        stats.queries++;
        const candidates = (await searchAll(query)).filter(candidate => !unsuitableMetadata(candidate));
        stats.candidates += candidates.length;
        let accepted = 0;
        for (const candidate of candidates) {
            if (results.length >= maxAssets || accepted >= limit) break;
            const key = candidate.sourceUrl || candidate.url;
            if (!key || !candidate.url || seen.has(key)) {
                stats.duplicate++;
                continue;
            }
            seen.add(key);
            const file = path.join(outputDir, `asset_${results.length + 1}.jpg`);
            try {
                await downloadImage(candidate.url, file, {
                    historyArchive: true, provider: candidate.provider
                });
                if (!fs.existsSync(file) || fs.statSync(file).size < 5000) {
                    stats.tooSmall++;
                    if (fs.existsSync(file)) fs.unlinkSync(file);
                    continue;
                }
                results.push({
                    id: results.length + 1, query, category, file,
                    provider: candidate.provider,
                    title: String(candidate.tags || "").slice(0, 240),
                    sourceUrl: candidate.sourceUrl,
                    license: candidate.license,
                    url: candidate.url
                });
                accepted++;
                stats.accepted++;
            } catch (error) {
                stats.downloadFailed++;
                console.log("[HISTORY ASSET PREFLIGHT] Download rejected:", candidate.provider, error.message);
                if (fs.existsSync(file)) fs.unlinkSync(file);
            }
        }
        console.log("[HISTORY ASSET QUERY]", JSON.stringify({
            query, found: candidates.length, accepted, total: results.length
        }));
    };
    for (const item of research) {
        if (results.length >= maxAssets) break;
        await collectQuery(item);
    }
    // Bounded no-AI fallback: shorten archive-index queries only when inventory is low.
    // Keep the original search terms; never synthesize a new historical claim.
    if (results.length < 3) {
        for (const item of research) {
            if (results.length >= 3) break;
            const words = item.query.trim().split(/\\s+/);
            const shorter = words.slice(0, Math.min(2, words.length)).join(" ");
            if (shorter.length >= 4 && shorter.toLowerCase() !== item.query.toLowerCase()) {
                await collectQuery({ query: shorter, category: item.category }, 3);
            }
        }
    }
    console.log("[HISTORY ASSET PREFLIGHT]", JSON.stringify({
        searched: stats.queries, downloaded: results.length, stats,
        categories: [...new Set(results.map(a => a.category))]
    }));
    return results;
}
