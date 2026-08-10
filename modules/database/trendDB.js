import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";


const DB_DIR =
    path.resolve("data/db");

const DB_FILE =
    path.join(
        DB_DIR,
        "trend.db"
    );


/*
    Trend 보관 기간

    Trend는 장기 기억 데이터가 아니다.

    최대 7일만 유지한다.
*/

const RETENTION_DAYS = 7;


if (!fs.existsSync(DB_DIR)) {

    fs.mkdirSync(
        DB_DIR,
        {
            recursive: true
        }
    );

}


const db =
    new DatabaseSync(DB_FILE);


/*
    =========================================================
    TREND DB

    주의:

    서버 시작 시 DB를 삭제하지 않는다.

    기존 Trend는 최대 7일간 유지하고
    오래된 데이터만 자동 삭제한다.
    =========================================================
*/


db.exec(`
CREATE TABLE IF NOT EXISTS trends (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL,

    normalized_title TEXT NOT NULL,

    channel TEXT NOT NULL DEFAULT '',

    source TEXT NOT NULL DEFAULT '',

    score REAL NOT NULL DEFAULT 0,

    collected_at TEXT NOT NULL

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_unique
ON trends(
    normalized_title,
    channel
);

CREATE INDEX IF NOT EXISTS idx_trend_channel
ON trends(channel);

CREATE INDEX IF NOT EXISTS idx_trend_source
ON trends(source);

CREATE INDEX IF NOT EXISTS idx_trend_collected
ON trends(collected_at);
`);


/*
    =========================================================
    Trend 갱신 상태

    데이터 자체의 collected_at과 별도로

    "마지막 정상 Trend 수집/분류 완료 시각"

    을 저장한다.

    12시간 재수집 판단은 이 값을 사용한다.
    =========================================================
*/


db.exec(`
CREATE TABLE IF NOT EXISTS trend_state (

    key TEXT PRIMARY KEY,

    value TEXT NOT NULL

);
`);


/*
    =========================================================
    Normalize
    =========================================================
*/


export function normalizeTrend(
    title = ""
) {

    return String(title)

        .normalize("NFKC")

        .toLowerCase()

        .replace(/[^\w가-힣]/g, "");

}


/*
    =========================================================
    7일 초과 Trend 삭제
    =========================================================
*/


export function clearOldTrends(
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
            DELETE FROM trends
            WHERE collected_at < ?
        `).run(
            limit
        );


    return Number(
        result.changes || 0
    );

}


/*
    =========================================================
    Trend 저장

    기존 DB 전체를 먼저 삭제하지 않는다.

    같은 제목 + 같은 채널은 갱신하고,
    새로운 Trend는 추가한다.

    따라서 특정 채널의 신규 Trend가
    일시적으로 0개여도
    이전 7일 이내 Trend는 유지된다.
    =========================================================
*/


export function saveTrends(
    trends = []
) {

    if (
        !Array.isArray(trends) ||
        trends.length === 0
    ) {

        return 0;

    }


    const now =
        new Date().toISOString();


    const insert =
        db.prepare(`
            INSERT INTO trends (
                title,
                normalized_title,
                channel,
                source,
                score,
                collected_at
            )

            VALUES (?, ?, ?, ?, ?, ?)

            ON CONFLICT(
                normalized_title,
                channel
            )

            DO UPDATE SET

                title =
                    excluded.title,

                source =
                    excluded.source,

                score =
                    excluded.score,

                collected_at =
                    excluded.collected_at
        `);


    let saved = 0;


    for (const item of trends) {

        const title =
            typeof item === "string"
                ? item
                : item?.title;


        const channel =
            typeof item === "object"
                ? String(
                    item?.channel || ""
                )
                    .trim()
                    .toLowerCase()
                : "";


        if (
            !title ||
            !channel
        ) {

            continue;

        }


        const normalized =
            normalizeTrend(
                title
            );


        if (!normalized) {

            continue;

        }


        insert.run(

            String(title).trim(),

            normalized,

            channel,

            Array.isArray(item?.source)
                ? item.source.join(",")
                : String(
                    item?.source || ""
                ),

            Number(
                item?.score || 0
            ),

            now

        );


        saved++;

    }


    /*
        저장 후 7일 초과 데이터 정리
    */

    clearOldTrends();


    return saved;

}


/*
    =========================================================
    마지막 정상 Trend 갱신 시각 저장

    AI 분류까지 정상 완료되고
    Trend 저장이 성공했을 때만 호출한다.
    =========================================================
*/


export function setLastRefresh(
    time = new Date().toISOString()
) {

    db.prepare(`
        INSERT INTO trend_state (
            key,
            value
        )

        VALUES (
            'last_refresh',
            ?
        )

        ON CONFLICT(key)

        DO UPDATE SET
            value = excluded.value
    `).run(
        time
    );


    return time;

}


/*
    =========================================================
    마지막 정상 Trend 갱신 시각 조회
    =========================================================
*/


export function getLastRefresh() {

    const row =
        db.prepare(`
            SELECT value

            FROM trend_state

            WHERE key = 'last_refresh'

            LIMIT 1
        `).get();


    return (
        row?.value ||
        null
    );

}


/*
    =========================================================
    특정 채널 Trend 조회

    각 Channel은 자기 Trend만 가져간다.
    =========================================================
*/


export function getTrendsByChannel(
    channel,
    limit = 200
) {

    /*
        조회할 때도
        7일 초과 자료를 정리한다.
    */

    clearOldTrends();


    const key =
        String(channel || "")

            .trim()

            .toLowerCase();


    if (!key) {

        return [];

    }


    return db.prepare(`
        SELECT

            title,
            channel,
            source,
            score,
            collected_at

        FROM trends

        WHERE channel = ?

        ORDER BY

            score DESC,

            collected_at DESC

        LIMIT ?
    `).all(

        key,

        Number(limit)

    );

}


/*
    =========================================================
    전체 Trend 조회
    =========================================================
*/


export function getAllTrends(
    limit = 500
) {

    clearOldTrends();


    return db.prepare(`
        SELECT

            title,
            channel,
            source,
            score,
            collected_at

        FROM trends

        ORDER BY

            score DESC,

            collected_at DESC

        LIMIT ?
    `).all(
        Number(limit)
    );

}


/*
    =========================================================
    Trend 개수
    =========================================================
*/


export function countTrends(
    channel = ""
) {

    clearOldTrends();


    const key =
        String(channel || "")

            .trim()

            .toLowerCase();


    if (key) {

        const row =
            db.prepare(`
                SELECT COUNT(*) AS count

                FROM trends

                WHERE channel = ?
            `).get(
                key
            );


        return Number(
            row?.count || 0
        );

    }


    const row =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM trends
        `).get();


    return Number(
        row?.count || 0
    );

}


/*
    수동 초기화용

    정상 실행에서는 사용하지 않는다.
*/

export function clearTrends() {

    const result =
        db.prepare(`
            DELETE FROM trends
        `).run();


    return Number(
        result.changes || 0
    );

}


export default {

    saveTrends,

    getTrendsByChannel,

    getAllTrends,

    countTrends,

    clearOldTrends,

    clearTrends,

    setLastRefresh,

    getLastRefresh,

    normalizeTrend

};
