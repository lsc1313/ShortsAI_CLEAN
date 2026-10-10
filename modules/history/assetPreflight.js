import fs from "node:fs";
import path from "node:path";
import { searchCommonsHistory, searchMetHistory, searchAicHistory } from "../providers/historyArchives.js";
import { downloadImage } from "../image/download.js";

/**
 * History-only asset-first research stage.
 * Archives are visual references, NOT sources proving narration claims.
 * Downloads must succeed before an asset can be offered to the Director.
 */
export async function collectHistoryAssets(queries, { maxAssets = 12, outputDir = "media/history-preflight" } = {}) {
    const uniqueQueries = [...new Set((queries || []).map(q => String(q || "").trim()).filter(Boolean))].slice(0, 8);
    fs.mkdirSync(outputDir, { recursive: true });
    const results = [];
    const seen = new Set();
    for (const query of uniqueQueries) {
        const groups = await Promise.all([
            searchCommonsHistory(query),
            searchMetHistory(query),
            searchAicHistory(query)
        ]);
        for (const candidate of groups.flat()) {
            if (results.length >= maxAssets) break;
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
                    id: results.length + 1,
                    query,
                    file,
                    provider: candidate.provider,
                    title: String(candidate.tags || "").slice(0, 240),
                    sourceUrl: candidate.sourceUrl,
                    license: candidate.license,
                    url: candidate.url
                });
            } catch (error) {
                console.log("[HISTORY ASSET PREFLIGHT] Download rejected:", candidate.provider, error.message);
                if (fs.existsSync(file)) fs.unlinkSync(file);
            }
        }
        if (results.length >= maxAssets) break;
    }
    console.log("[HISTORY ASSET PREFLIGHT]", JSON.stringify({ searched: uniqueQueries.length, downloaded: results.length }));
    return results;
}
