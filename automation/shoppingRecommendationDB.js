import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DB_DIR =
    path.resolve("data/db");

const DB_FILE =
    path.join(
        DB_DIR,
        "shopping_recommendation.db"
    );

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
CREATE TABLE IF NOT EXISTS shopping_recommendations (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id TEXT NOT NULL,

    product_name TEXT NOT NULL,

    normalized_name TEXT NOT NULL,

    search_topic TEXT NOT NULL DEFAULT '',

    uploaded_at TEXT NOT NULL

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_product_id
ON shopping_recommendations(product_id);

CREATE INDEX IF NOT EXISTS idx_shopping_normalized_name
ON shopping_recommendations(normalized_name);

CREATE INDEX IF NOT EXISTS idx_shopping_uploaded_at
ON shopping_recommendations(uploaded_at);
`);

function normalizeName(
    value = ""
) {
    return String(value)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^0-9a-zA-Z가-힣]/g, "");
}

function clearOld(
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

    db.prepare(`
        DELETE FROM shopping_recommendations
        WHERE uploaded_at < ?
    `).run(
        limit
    );
}

export function isRecommendedProduct({
    productId,
    productName
} = {}) {

    clearOld();

    const id =
        String(
            productId || ""
        ).trim();

    if (id) {

        const byId =
            db.prepare(`
                SELECT id
                FROM shopping_recommendations
                WHERE product_id = ?
                LIMIT 1
            `).get(
                id
            );

        if (byId) {
            return true;
        }
    }

    const normalized =
        normalizeName(
            productName
        );

    if (!normalized) {
        return false;
    }

    const byName =
        db.prepare(`
            SELECT id
            FROM shopping_recommendations
            WHERE normalized_name = ?
            LIMIT 1
        `).get(
            normalized
        );

    return Boolean(
        byName
    );
}

export function rememberRecommendedProduct({
    productId,
    productName,
    searchTopic = "",
    uploadedAt =
        new Date().toISOString()
} = {}) {

    const id =
        String(
            productId || ""
        ).trim();

    const name =
        String(
            productName || ""
        ).trim();

    if (!id) {
        throw new Error(
            "[ShoppingRecommendationDB] productId 없음"
        );
    }

    if (!name) {
        throw new Error(
            "[ShoppingRecommendationDB] productName 없음"
        );
    }

    clearOld();

    const normalized =
        normalizeName(
            name
        );

    const result =
        db.prepare(`
            INSERT OR IGNORE INTO shopping_recommendations (
                product_id,
                product_name,
                normalized_name,
                search_topic,
                uploaded_at
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            id,
            name,
            normalized,
            String(searchTopic || "").trim(),
            uploadedAt
        );

    return (
        Number(result.changes || 0) > 0
    );
}

export function getRecentRecommendations() {

    clearOld();

    return db.prepare(`
        SELECT
            product_id AS productId,
            product_name AS productName,
            search_topic AS searchTopic,
            uploaded_at AS uploadedAt

        FROM shopping_recommendations

        ORDER BY uploaded_at DESC
    `).all();
}

export default {
    isRecommendedProduct,
    rememberRecommendedProduct,
    getRecentRecommendations
};
