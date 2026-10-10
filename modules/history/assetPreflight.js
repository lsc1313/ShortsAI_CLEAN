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
    const original = [...new Set((queries || []).map(q => String(q || "").trim()).filter(Boolean))];
    const joined = original.join(" ").toLowerCase();
    if (/폼페이|pompeii|vesuvius|베수비오/.test(joined)) {
        return [
            { query: "Pompeii archaeological ruins", category: "ruins" },
            { query: "Pompeii plaster casts", category: "casts" },
            { query: "Pompeii Roman fresco", category: "fresco" },
            { query: "Mount Vesuvius volcano", category: "volcano" },
            { query: "Pompeii ancient Roman artifacts", category: "artifacts" },
            { query: "Pompeii excavation", category: "excavation" },
            { query: "Pompeii archaeological site map", category: "map" },
            { query: "The Last Day of Pompeii painting", category: "artwork" }
        ];
    }
    return original.slice(0, 8).map((query, i) => ({ query, category: `query-${i + 1}` }));
}

export async function collectHistoryAssets(queries, { maxAssets = 12, outputDir = "media/history-preflight" } = {}) {
    const research = buildResearchQueries(queries);
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
