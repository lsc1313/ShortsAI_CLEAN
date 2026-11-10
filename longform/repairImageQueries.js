import fs from "node:fs";
import { callAI } from "../modules/ai/index.js";

/**
 * Repair only malformed/missing image query pairs.
 * Never edit historical narration, chapter order or factual content.
 */
export function invalidImageChapters(data) {
    if (!Array.isArray(data?.chapters) || data.chapters.length !== 8) {
        throw new Error("Exactly 8 chapters are required");
    }
    return data.chapters.flatMap((chapter, index) => {
        const valid = Number(chapter?.number) === index + 1 &&
            Array.isArray(chapter?.images) &&
            chapter.images.length === 2 &&
            chapter.images.every(image =>
                typeof image?.query === "string" && image.query.trim()
            ) &&
            chapter.images[0].query.trim().toLowerCase() !==
                chapter.images[1].query.trim().toLowerCase();
        if (Number(chapter?.number) !== index + 1) {
            throw new Error(`Chapter ${index + 1}: invalid chapter number`);
        }
        return valid ? [] : [index];
    });
}

export async function repairLongformImageQueries(data, { outputFile = "" } = {}) {
    const missing = invalidImageChapters(data);
    if (!missing.length) return data;

    console.log("[LONGFORM IMAGE QUERY REPAIR] chapters=" + missing.map(i => i + 1).join(","));

    const request = {
        topic: String(data.topic || ""),
        chapters: missing.map(i => ({
            number: i + 1,
            titleKo: data.chapters[i].titleKo || data.chapters[i].title || "",
            titleEn: data.chapters[i].titleEn || "",
            purpose: data.chapters[i].purposeKo || "",
            narrationExcerpt: String(data.chapters[i].narrationKo || "").slice(0, 550),
            existingQueries: data.chapters[i].images
        }))
    };
    const prompt = [
        "You are repairing the IMAGE SEARCH QUERY FIELDS of an existing 8-chapter historical documentary.",
        "Return exactly TWO DISTINCT concrete ENGLISH historical image search queries for EACH requested chapter.",
        "Prioritize documented, findable historical images: maps, museum objects, original photographs, records, or labeled later illustrations.",
        "Keep exact historical period and chapter subject. Never invent a historical photograph or use unrelated generic scenery.",
        "Do NOT rewrite the narration or any other chapter field. Do not assert that a source has been found.",
        "Return ONLY JSON: {\"chapters\":[{\"number\":1,\"queries\":[\"English query one\",\"English query two\"]}]}",
        "If historically appropriate searches cannot be supplied, return an empty queries array for that chapter.",
        "INPUT: " + JSON.stringify(request)
    ].join("\n");

    const raw = String(await callAI(prompt) || "").trim()
        .replace(/^\x60\x60\x60(?:json)?\s*/i, "")
        .replace(/\s*\x60\x60\x60$/, "");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error("LONGFORM_IMAGE_QUERY_REPAIR_INVALID_JSON");
    }
    if (!Array.isArray(parsed?.chapters) || parsed.chapters.length !== missing.length) {
        throw new Error("LONGFORM_IMAGE_QUERY_REPAIR_INCOMPLETE");
    }
    const expected = new Set(missing.map(i => i + 1));
    const seen = new Set();
    const replacements = new Map();
    for (const item of parsed.chapters) {
        if (!Number.isInteger(item?.number) || !expected.has(item.number) ||
            seen.has(item.number) || !Array.isArray(item.queries) || item.queries.length !== 2 ||
            !item.queries.every(q => typeof q === "string" && q.trim()) ||
            item.queries[0].trim().toLowerCase() === item.queries[1].trim().toLowerCase()) {
            throw new Error("LONGFORM_IMAGE_QUERY_REPAIR_INVALID_PAIR");
        }
        seen.add(item.number);
        replacements.set(item.number, item.queries.map(q => q.trim()));
    }

    // Only image search terms are replaced; preserve every other serialized field.
    const updated = {
        ...data,
        chapters: data.chapters.map((chapter, index) => {
            const queries = replacements.get(index + 1);
            return queries
                ? { ...chapter, images: queries.map(query => ({ query, purpose: "chapter illustration" })) }
                : chapter;
        })
    };
    if (invalidImageChapters(updated).length) {
        throw new Error("LONGFORM_IMAGE_QUERY_REPAIR_STILL_INVALID");
    }

    if (outputFile) {
        const backup = outputFile + ".before-image-query-repair";
        if (fs.existsSync(outputFile) && !fs.existsSync(backup)) {
            fs.copyFileSync(outputFile, backup);
        }
        const temporary = outputFile + ".image-query-repair.tmp";
        fs.writeFileSync(temporary, JSON.stringify(updated, null, 2), "utf8");
        fs.renameSync(temporary, outputFile);
    }
    console.log("[LONGFORM IMAGE QUERY REPAIR] COMPLETE");
    return updated;
}
