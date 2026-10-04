import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(
    "D:/ShortsAI_DATA/longform/state/longform-production.db"
);

db.prepare(`
    UPDATE productions
    SET
        ko_video_id = '',
        ko_url = '',
        last_error = ''
    WHERE id = 2
`).run();

console.log(
    db.prepare(`
        SELECT
            id,
            status,
            stage,
            ko_video_id,
            en_video_id,
            last_error
        FROM productions
        WHERE id = 2
    `).get()
);

db.close();
