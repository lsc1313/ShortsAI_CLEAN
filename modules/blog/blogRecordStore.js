/*
=========================================================
ShortsAI Blog Factory
BLOG RECORD STORE
=========================================================
*/

import fs from "fs";
import path from "path";


const DATA_DIR =
    path.resolve(
        "data/blog"
    );


const RECORD_FILE =
    path.join(
        DATA_DIR,
        "records.json"
    );


function ensureStore() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }


    if (!fs.existsSync(RECORD_FILE)) {

        fs.writeFileSync(
            RECORD_FILE,
            JSON.stringify(
                [],
                null,
                2
            ),
            "utf8"
        );

    }

}


export function getBlogRecords() {

    ensureStore();


    try {

        const raw =
            fs.readFileSync(
                RECORD_FILE,
                "utf8"
            );


        const data =
            JSON.parse(raw);


        return Array.isArray(data)
            ? data
            : [];

    }
    catch {

        return [];

    }

}


export function addBlogRecord(
    record
) {

    const records =
        getBlogRecords();


    const item = {

        id:
            `blog_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        createdAt:
            new Date().toISOString(),

        ...record

    };


    records.unshift(
        item
    );


    fs.writeFileSync(
        RECORD_FILE,
        JSON.stringify(
            records,
            null,
            2
        ),
        "utf8"
    );


    return item;

}


export default {
    getBlogRecords,
    addBlogRecord
};
