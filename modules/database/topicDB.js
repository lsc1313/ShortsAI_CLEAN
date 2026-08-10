import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DB_DIR = path.resolve("data/db");
const DB_FILE = path.join(DB_DIR, "topic.db");

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, {
        recursive: true
    });
}

const db = new DatabaseSync(DB_FILE);

db.exec(`
CREATE TABLE IF NOT EXISTS topics (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    topic TEXT NOT NULL,

    normalized_topic TEXT NOT NULL,

    channel TEXT NOT NULL DEFAULT '',

    category TEXT NOT NULL DEFAULT '',

    video_id TEXT NOT NULL DEFAULT '',

    url TEXT NOT NULL DEFAULT '',

    keywords TEXT NOT NULL DEFAULT '[]',

    uploaded_at TEXT NOT NULL

);

CREATE INDEX IF NOT EXISTS idx_topic_normalized
ON topics(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_topic_channel
ON topics(channel);

CREATE INDEX IF NOT EXISTS idx_topic_uploaded
ON topics(uploaded_at);
`);

function normalizeTopic(topic = "") {

    return String(topic)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^\w가-힣]/g, "");

}

export function addTopic({
    topic,
    channel = "",
    category = "",
    videoId = "",
    url = "",
    keywords = [],
    uploadedAt = new Date().toISOString()
}) {

    if (!topic) {
        throw new Error(
            "[TopicDB] topic 없음"
        );
    }

    const normalizedTopic =
        normalizeTopic(topic);

    const result = db.prepare(`
        INSERT INTO topics (
            topic,
            normalized_topic,
            channel,
            category,
            video_id,
            url,
            keywords,
            uploaded_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        topic,
        normalizedTopic,
        channel,
        category,
        videoId,
        url,
        JSON.stringify(keywords),
        uploadedAt
    );

    return result.lastInsertRowid;

}

export function existsTopic(topic) {

    if (!topic) {
        return false;
    }

    const normalizedTopic =
        normalizeTopic(topic);

    const row = db.prepare(`
        SELECT id
        FROM topics
        WHERE normalized_topic = ?
        LIMIT 1
    `).get(
        normalizedTopic
    );

    return Boolean(row);

}

export function getTopics() {

    return db.prepare(`
        SELECT *
        FROM topics
        ORDER BY uploaded_at DESC
    `).all();

}

export function getTopicsByChannel(channel) {

    return db.prepare(`
        SELECT *
        FROM topics
        WHERE channel = ?
        ORDER BY uploaded_at DESC
    `).all(
        channel
    );

}

export function countTopics() {

    const row = db.prepare(`
        SELECT COUNT(*) AS count
        FROM topics
    `).get();

    return Number(row.count);

}

export {
    normalizeTopic
};

export default {
    addTopic,
    existsTopic,
    getTopics,
    getTopicsByChannel,
    countTopics,
    normalizeTopic
};
