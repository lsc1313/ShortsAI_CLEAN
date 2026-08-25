import {
    existsDuplicate,
    addDuplicate,
    getDuplicates
} from "../database/duplicateDB.js";


function getTopic(candidate) {

    if (typeof candidate === "string") {
        return candidate;
    }

    return (
        candidate?.topic ||
        candidate?.title ||
        ""
    );
}

export async function isDuplicate(candidate) {

    const topic =
        getTopic(candidate);

    if (!topic) {
        return false;
    }

    return existsDuplicate(topic);
}

export async function filterDuplicates(
    candidates = []
) {

    const results = [];

    const current = new Set();

    for (const candidate of candidates) {

        const topic =
            getTopic(candidate);

        if (!topic) {
            continue;
        }

        const key =
            topic
                .normalize("NFKC")
                .toLowerCase()
                .replace(/[^\w가-힣]/g, "");

        /*
            현재 후보 목록 내부 중복
        */

        if (current.has(key)) {
            continue;
        }

        current.add(key);

        /*
            과거 업로드 중복
        */

        if (
            await isDuplicate(candidate)
        ) {
            continue;
        }

        results.push(candidate);
    }

    return results;
}

export async function getRecentDuplicates() {

    return getDuplicates()
        .map(item => ({
            topic: item.topic,
            channel: item.channel,
            uploadedAt: item.uploaded_at
        }));

}

/*
    실제 업로드 성공 후에만 호출
*/

export async function remember(candidate) {

    const topic =
        getTopic(candidate);

    if (!topic) {
        return false;
    }

    return addDuplicate({
        topic,
        channel:
            candidate?.channel || "",
        uploadedAt:
            candidate?.uploadedAt ||
            new Date().toISOString()
    });
}

export default {
    filterDuplicates,
    isDuplicate,
    remember,
    getRecentDuplicates
};
