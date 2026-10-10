import fs from "node:fs";
import path from "node:path";
import { searchCommonsHistory, searchMetHistory, searchAicHistory } from "../providers/historyArchives.js";
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
    if (research.length < 4 || new Set(research.map(q => q.category)).size < 3) {
        throw new Error("[HISTORY ASSET PREFLIGHT] Research plan needs 4 searches across 3 categories");
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const results = [];
    const seen = new Set();
    // Limit each category to two assets, leaving room for distinct visual evidence.
    for (const { query, category } of research) {
        if (results.length >= maxAssets) break;
        let groups;
        try {
            groups = await Promise.all([
                searchCommonsHistory(query),
                searchMetHistory(query),
                searchAicHistory(query)
            ]);
        } catch (error) {
            console.log("[HISTORY ASSET PREFLIGHT] Archive query failed:", query, error.message);
            continue;
        }
        let acceptedInCategory = 0;
        for (const candidate of groups.flat()) {
            if (results.length >= maxAssets || acceptedInCategory >= 2) break;
            const key = candidate.sourceUrl || candidate.url;
            if (!key || seen.has(key) || !candidate.url) continue;
            seen.add(key);
            const file = path.join(outputDir, `asset_${results.length + 1}.jpg`);
            try {
                await downloadImage(candidate.url, file, {
                    historyArchive: true, provider: candidate.provider
                });
                if (!fs.existsSync(file) || fs.statSync(file).size < 5000) {
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
                acceptedInCategory++;
            } catch (error) {
                console.log("[HISTORY ASSET PREFLIGHT] Download rejected:", candidate.provider, error.message);
                if (fs.existsSync(file)) fs.unlinkSync(file);
            }
        }
    }
    console.log("[HISTORY ASSET PREFLIGHT]", JSON.stringify({
        searched: research.length, downloaded: results.length,
        categories: [...new Set(results.map(a => a.category))]
    }));
    return results;
}
