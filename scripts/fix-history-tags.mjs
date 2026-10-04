import fs from "node:fs";
import { google } from "googleapis";

const channels = JSON.parse(
    fs.readFileSync(
        "./modules/channels/channels.json",
        "utf8"
    ).replace(/^\uFEFF/, "")
);

const channel =
    channels.find(x => x.name === "History");

const auth =
    new google.auth.OAuth2(
        channel.clientId,
        channel.clientSecret
    );

auth.setCredentials({
    refresh_token: channel.refreshToken
});

const youtube =
    google.youtube({
        version: "v3",
        auth
    });

const videoId = "0MPrCAbXRvo";

const current =
    await youtube.videos.list({
        part: ["snippet"],
        id: [videoId]
    });

const s =
    current.data.items?.[0]?.snippet;

if (!s) {
    throw new Error("History video not found");
}

const tags = [
    "우주전쟁",
    "오슨 웰스",
    "1938 우주전쟁",
    "1938년 라디오 방송",
    "라디오 역사",
    "미국 역사",
    "미디어 역사",
    "가짜뉴스 역사",
    "언론 역사",
    "대중 심리",
    "집단 공황",
    "역사 다큐",
    "역사 다큐멘터리",
    "War of the Worlds",
    "Orson Welles"
];

await youtube.videos.update({
    part: ["snippet"],

    requestBody: {
        id: videoId,

        snippet: {
            title: s.title,
            description: s.description,
            categoryId: s.categoryId,
            tags
        }
    }
});

await new Promise(
    resolve => setTimeout(resolve, 2000)
);

const check =
    await youtube.videos.list({
        part: ["snippet"],
        id: [videoId]
    });

const updated =
    check.data.items?.[0]?.snippet;

console.log("");
console.log("==============================");
console.log("HISTORY TAG UPDATE");
console.log("==============================");
console.log("TAGS =", updated?.tags || []);
console.log(
    "TAG COUNT =",
    updated?.tags?.length || 0
);
