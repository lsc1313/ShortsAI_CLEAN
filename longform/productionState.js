import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./config/paths.js";

fs.mkdirSync(PATHS.state, { recursive: true });

const DB_FILE = path.join(
  PATHS.state,
  "longform-production.db"
);

const db = new DatabaseSync(DB_FILE);

db.exec(`
CREATE TABLE IF NOT EXISTS productions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  topic TEXT NOT NULL,
  normalized_topic TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'reserved',
  stage TEXT NOT NULL DEFAULT 'topic',

  ko_video_id TEXT NOT NULL DEFAULT '',
  en_video_id TEXT NOT NULL DEFAULT '',

  ko_url TEXT NOT NULL DEFAULT '',
  en_url TEXT NOT NULL DEFAULT '',

  last_error TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_longform_topic
ON productions(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_longform_status
ON productions(status);
`);

export function normalizeTopic(topic = "") {
  return String(topic)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}


function longestCommonSubstringLength(a, b) {

  const x = normalizeTopic(a);
  const y = normalizeTopic(b);

  if (!x || !y) return 0;

  const prev =
    new Array(y.length + 1).fill(0);

  let best = 0;

  for (let i = 1; i <= x.length; i++) {

    const curr =
      new Array(y.length + 1).fill(0);

    for (let j = 1; j <= y.length; j++) {

      if (x[i - 1] === y[j - 1]) {

        curr[j] =
          prev[j - 1] + 1;

        if (curr[j] > best) {
          best = curr[j];
        }

      }

    }

    for (let j = 0; j <= y.length; j++) {
      prev[j] = curr[j];
    }

  }

  return best;
}


function similarity(a, b) {

  const x = normalizeTopic(a);
  const y = normalizeTopic(b);

  if (!x || !y) return 0;

  if (x === y) return 1;

  if (
    x.includes(y) ||
    y.includes(x)
  ) {
    return 0.98;
  }


  /*
  고유명사/사건명 보호.

  예:
  아르자마스16
  보이니치필사본
  디아틀로프패스

  제목 문장이 달라도
  긴 핵심 문자열이 동일하면
  같은 주제일 가능성이 매우 높다.
  */

  const commonLength =
    longestCommonSubstringLength(
      x,
      y
    );

  if (commonLength >= 10) {
    return 0.97;
  }

  if (commonLength >= 8) {
    return 0.94;
  }

  if (commonLength >= 6) {
    return 0.90;
  }


  const makePairs = value => {

    const set =
      new Set();

    for (
      let i = 0;
      i < value.length - 1;
      i++
    ) {
      set.add(
        value.slice(i, i + 2)
      );
    }

    return set;
  };


  const A =
    makePairs(x);

  const B =
    makePairs(y);


  if (!A.size || !B.size) {
    return 0;
  }


  let intersection = 0;

  for (const item of A) {

    if (B.has(item)) {
      intersection++;
    }

  }


  return (
    intersection /
    (
      A.size +
      B.size -
      intersection
    )
  );
}


export function findDuplicateTopic(
  topic,
  threshold = 0.72
) {
  const rows = db.prepare(`
    SELECT *
    FROM productions
    WHERE status IN (
      'reserved',
      'producing',
      'completed',
      'existing'
    )
    ORDER BY created_at DESC
  `).all();

  for (const row of rows) {
    const score = similarity(
      topic,
      row.topic
    );

    if (score >= threshold) {
      return {
        duplicate: true,
        score,
        row
      };
    }
  }

  return {
    duplicate: false,
    score: 0,
    row: null
  };
}


export function rememberExistingTopic(
  topic
) {

  const value =
    String(topic || "").trim();

  if (!value) {
    return null;
  }

  const normalized =
    normalizeTopic(value);


  const existing =
    db.prepare(`
      SELECT *
      FROM productions
      WHERE normalized_topic = ?
      LIMIT 1
    `).get(
      normalized
    );


  if (existing) {
    return existing.id;
  }


  const now =
    new Date().toISOString();


  const result =
    db.prepare(`
      INSERT INTO productions (
        topic,
        normalized_topic,
        status,
        stage,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      value,
      normalized,
      "existing",
      "legacy",
      now,
      now
    );


  return Number(
    result.lastInsertRowid
  );
}


export function reserveTopic(topic) {
  const duplicate =
    findDuplicateTopic(topic);

  if (duplicate.duplicate) {
    return {
      reserved: false,
      ...duplicate
    };
  }

  const now =
    new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO productions (
      topic,
      normalized_topic,
      status,
      stage,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    topic,
    normalizeTopic(topic),
    "reserved",
    "topic",
    now,
    now
  );

  return {
    reserved: true,
    id: Number(result.lastInsertRowid)
  };
}

export function updateStage(
  id,
  stage,
  status = "producing"
) {
  db.prepare(`
    UPDATE productions
    SET
      stage = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    stage,
    status,
    new Date().toISOString(),
    id
  );
}


export function updateUploadResult(
  id,
  language,
  {
    videoId = "",
    url = ""
  } = {}
) {

  const now =
    new Date().toISOString();

  if (language === "ko") {

    db.prepare(`
      UPDATE productions
      SET
        ko_video_id = ?,
        ko_url = ?,
        status = 'producing',
        stage = 'upload_ko',
        last_error = '',
        updated_at = ?
      WHERE id = ?
    `).run(
      videoId,
      url,
      now,
      id
    );

    return;
  }

  if (language === "en") {

    db.prepare(`
      UPDATE productions
      SET
        en_video_id = ?,
        en_url = ?,
        status = 'producing',
        stage = 'upload_en',
        last_error = '',
        updated_at = ?
      WHERE id = ?
    `).run(
      videoId,
      url,
      now,
      id
    );

    return;
  }

  throw new Error(
    `Unknown upload language: ${language}`
  );
}


export function completeProduction(
  id,
  {
    koVideoId = "",
    enVideoId = "",
    koUrl = "",
    enUrl = ""
  } = {}
) {
  db.prepare(`
    UPDATE productions
    SET
      status = 'completed',
      stage = 'completed',
      ko_video_id = ?,
      en_video_id = ?,
      ko_url = ?,
      en_url = ?,
      last_error = '',
      updated_at = ?
    WHERE id = ?
  `).run(
    koVideoId,
    enVideoId,
    koUrl,
    enUrl,
    new Date().toISOString(),
    id
  );
}

export function failProduction(
  id,
  stage,
  error
) {
  db.prepare(`
    UPDATE productions
    SET
      status = 'failed',
      stage = ?,
      last_error = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    stage,
    String(error || ""),
    new Date().toISOString(),
    id
  );
}

export function getLatestUnfinished() {
  return db.prepare(`
    SELECT *
    FROM productions
    WHERE status IN (
      'reserved',
      'producing',
      'failed'
    )
    ORDER BY updated_at DESC
    LIMIT 1
  `).get() || null;
}

export function getProduction(id) {
  return db.prepare(`
    SELECT *
    FROM productions
    WHERE id = ?
  `).get(id) || null;
}

export default {
  rememberExistingTopic,
updateUploadResult,
normalizeTopic,
  findDuplicateTopic,
  reserveTopic,
  updateStage,
  completeProduction,
  failProduction,
  getLatestUnfinished,
  getProduction
};
