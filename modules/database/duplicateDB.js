import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";


const DB_DIR =
    path.resolve("data/db");

const DB_FILE =
    path.join(
        DB_DIR,
        "duplicate.db"
    );


/*
    =========================================================
    Duplicate DB 보관 기간

    최근 90일 동안 업로드한 주제만
    중복으로 판단한다.

    90일이 지난 주제는 자동 삭제되어
    다시 후보로 사용할 수 있다.
    =========================================================
*/

const RETENTION_DAYS = 90;


if (!fs.existsSync(DB_DIR)) {

    fs.mkdirSync(
        DB_DIR,
        {
            recursive: true
        }
    );

}


const db =
    new DatabaseSync(
        DB_FILE
    );


db.exec(`
CREATE TABLE IF NOT EXISTS uploaded_topics (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    topic TEXT NOT NULL,

    normalized_topic TEXT NOT NULL,

    channel TEXT NOT NULL DEFAULT '',

    uploaded_at TEXT NOT NULL

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_duplicate_normalized
ON uploaded_topics(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_duplicate_channel
ON uploaded_topics(channel);

CREATE INDEX IF NOT EXISTS idx_duplicate_uploaded
ON uploaded_topics(uploaded_at);
`);


/*
    =========================================================
    Topic 정규화
    =========================================================
*/

export function normalizeTopic(
    topic = ""
) {

    return String(topic)

        .normalize("NFKC")

        .toLowerCase()

        .replace(/[^\w가-힣]/g, "");

}


/*
    =========================================================
    7일 초과 Duplicate 삭제

    Duplicate DB는 영구 기억이 아니다.

    최근 7일 동안 실제 업로드한 주제만
    중복 방지 대상으로 유지한다.
    =========================================================
*/

export function clearOldDuplicates(
    days = RETENTION_DAYS
) {

    const limit =
        new Date(
            Date.now() -
            Number(days) *
            24 *
            60 *
            60 *
            1000
        ).toISOString();


    const result =
        db.prepare(`
            DELETE FROM uploaded_topics
            WHERE uploaded_at < ?
        `).run(
            limit
        );


    return Number(
        result.changes || 0
    );

}


/*
    =========================================================
    중복 여부 확인

    검사 전에 7일 초과 자료를 정리한다.
    =========================================================
*/

export function existsDuplicate(
    topic
) {

    clearOldDuplicates();


    const normalized =
        normalizeTopic(
            topic
        );


    if (!normalized) {

        return false;

    }


    const row =
        db.prepare(`
            SELECT id

            FROM uploaded_topics

            WHERE normalized_topic = ?

            LIMIT 1
        `).get(
            normalized
        );


    return Boolean(
        row
    );

}


/*
    =========================================================
    실제 업로드 성공 주제 저장
    =========================================================
*/

export function addDuplicate({
    topic,
    channel = "",
    uploadedAt =
        new Date().toISOString()
} = {}) {

    const normalized =
        normalizeTopic(
            topic
        );


    if (!normalized) {

        throw new Error(
            "[DuplicateDB] topic 없음"
        );

    }


    /*
        저장 전에 오래된 데이터 정리.

        같은 주제가 7일 전에 존재했다면
        먼저 삭제되므로 다시 저장 가능하다.
    */

    clearOldDuplicates();


    const result =
        db.prepare(`
            INSERT OR IGNORE INTO uploaded_topics (

                topic,
                normalized_topic,
                channel,
                uploaded_at

            )

            VALUES (?, ?, ?, ?)
        `).run(

            String(topic).trim(),

            normalized,

            String(
                channel || ""
            ),

            uploadedAt

        );


    return (
        result.changes > 0
    );

}


/*
    =========================================================
    전체 Duplicate 조회
    =========================================================
*/

export function getDuplicates() {

    clearOldDuplicates();


    return db.prepare(`
        SELECT *

        FROM uploaded_topics

        ORDER BY uploaded_at DESC
    `).all();

}


/*
    =========================================================
    Duplicate 개수
    =========================================================
*/

export function countDuplicates() {

    clearOldDuplicates();


    const row =
        db.prepare(`
            SELECT COUNT(*) AS count

            FROM uploaded_topics
        `).get();


    return Number(
        row?.count || 0
    );

}


/*
    =========================================================
    수동 전체 초기화

    정상 AUTO 흐름에서는 사용하지 않는다.
    =========================================================
*/

export function clearDuplicates() {

    const result =
        db.prepare(`
            DELETE FROM uploaded_topics
        `).run();


    return Number(
        result.changes || 0
    );

}


export default {

    normalizeTopic,

    existsDuplicate,

    addDuplicate,

    getDuplicates,

    countDuplicates,

    clearOldDuplicates,

    clearDuplicates

};
