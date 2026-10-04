import { DATA_ROOT } from "../config/paths.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(DATA_ROOT, "topic-candidates.json");
const OUTPUT = path.join(DATA_ROOT, "topic-research.json");

const LOOKBACK_DAYS = 30;
const MAX_RESULTS = 10;

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function isoDurationToSeconds(value = "") {
    const match = String(value).match(
        /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );

    if (!match) return 0;

    return (
        Number(match[1] || 0) * 86400 +
        Number(match[2] || 0) * 3600 +
        Number(match[3] || 0) * 60 +
        Number(match[4] || 0)
    );
}

async function searchYouTube(youtube, query) {

    const publishedAfter = new Date(
        Date.now() - LOOKBACK_DAYS * 86400000
    ).toISOString();

    const search = await youtube.search.list({
        part: ["snippet"],
        type: ["video"],
        q: query,
        maxResults: MAX_RESULTS,
        order: "relevance",
        publishedAfter,
        regionCode: "KR",
        relevanceLanguage: "ko"
    });

    const items = search.data.items || [];

    const ids = items
        .map(item => item?.id?.videoId)
        .filter(Boolean);

    if (!ids.length) return [];

    const details = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: ids
    });

    return (details.data.items || []).map(video => {

        const seconds =
            isoDurationToSeconds(
                video?.contentDetails?.duration
            );

        return {
            videoId: video.id,
            title: video?.snippet?.title || "",
            publishedAt: video?.snippet?.publishedAt || "",
            views: Number(
                video?.statistics?.viewCount || 0
            ),
            likes: Number(
                video?.statistics?.likeCount || 0
            ),
            comments: Number(
                video?.statistics?.commentCount || 0
            ),
            durationSeconds: seconds,
            durationMinutes:
                Math.round((seconds / 60) * 10) / 10,
            isLongform: seconds >= 600
        };
    });
}

export async function researchTopics(limit = null) {

    if (!process.env.YOUTUBE_API_KEY) {
        throw new Error("YOUTUBE_API_KEY missing");
    }

    const youtube = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_API_KEY
    });

    const data = readJSON(INPUT);

    let candidates = data.candidates || [];

    if (Number.isInteger(limit) && limit > 0) {
        candidates = candidates.slice(0, limit);
    }

    const results = [];

    console.log("");
    console.log("================================");
    console.log("LONGFORM YOUTUBE RESEARCH");
    console.log("================================");
    console.log(`LOOKBACK: ${LOOKBACK_DAYS} DAYS`);
    console.log(`TOPICS: ${candidates.length}`);

    for (const candidate of candidates) {

        /*
            API quota protection:
            후보 하나당 우선 대표 검색어 1개만 사용.
            30개 후보 = search.list 30회.
        */

        const query =
            candidate.searchQueries?.find(q => /[가-힣]/.test(q)) ||
            candidate.searchQueries?.[0] ||
            candidate.topic;

        console.log("");
        console.log(
            `[${candidate.id}/${candidates.length}] ${query}`
        );

        let videos = [];

        try {
            videos = await searchYouTube(
                youtube,
                query
            );
        }
        catch (error) {
            console.error(
                "YOUTUBE SEARCH FAILED:",
                error.message
            );
        }

        const totalViews =
            videos.reduce(
                (sum, video) =>
                    sum + video.views,
                0
            );

        const maxViews =
            videos.reduce(
                (max, video) =>
                    Math.max(max, video.views),
                0
            );

        const longformVideos =
            videos.filter(
                video => video.isLongform
            );

        const longformViews =
            longformVideos.reduce(
                (sum, video) =>
                    sum + video.views,
                0
            );

        const avgViews =
            videos.length
                ? Math.round(
                    totalViews / videos.length
                )
                : 0;

        results.push({
            id: candidate.id,
            topic: candidate.topic,
            titleIdea: candidate.titleIdea,
            searchQueries: candidate.searchQueries,
            reason: candidate.reason,

            youtube: {
                query,
                lookbackDays: LOOKBACK_DAYS,
                resultCount: videos.length,
                totalViews,
                averageViews: avgViews,
                maxViews,
                longformCount:
                    longformVideos.length,
                longformViews,
                videos
            }
        });

        console.log(
            `VIDEOS=${videos.length}` +
            ` | VIEWS=${totalViews}` +
            ` | MAX=${maxViews}` +
            ` | LONGFORM=${longformVideos.length}`
        );
    }

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(
            {
                researchedAt:
                    new Date().toISOString(),
                genre: data.genre,
                lookbackDays: LOOKBACK_DAYS,
                topics: results
            },
            null,
            2
        ),
        "utf8"
    );

    console.log("");
    console.log("================================");
    console.log("RESEARCH COMPLETE");
    console.log(`SAVED: ${OUTPUT}`);
    console.log("================================");

    return results;
}

if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === __filename
) {

    const limitArg =
        Number(process.argv[2]);

    const limit =
        Number.isInteger(limitArg) &&
        limitArg > 0
            ? limitArg
            : null;

    researchTopics(limit)
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
