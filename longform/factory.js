import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { DATA_ROOT, BASE_DATA_ROOT } from "./config/paths.js";

import {
  uploadLongform
} from "./uploadFactory.js";

import {
  cleanupLongformProduction
} from "./cleanup.js";

import {
  reserveTopic,
  updateStage,
  failProduction,
  getLatestUnfinished
} from "./productionState.js";

const ROOT = path.resolve("./longform");

const STAGES = {
  reserved: 0,
  research: 1,
  director: 2,
  images: 3,
  speech: 4,
  render: 5,
  ready: 6,
  upload_ko: 7,
  upload_en: 8,
  completed: 9
};

let ACTIVE_JOB_ROOT = "";

function getJobRoot(id) {
  return path.join(
    BASE_DATA_ROOT,
    "jobs",
    String(id)
  );
}

function readJSON(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8")
      .replace(/^\uFEFF/, "")
  );
}

function runNode(script, args = []) {
  console.log("");
  console.log(`[LONGFORM FACTORY] RUN ${script}`);

  return execFileSync(
    process.execPath,
    [script, ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
      maxBuffer: 32 * 1024 * 1024,

      env: {
        ...process.env,

        ...(ACTIVE_JOB_ROOT
          ? {
              LONGFORM_JOB_ROOT:
                ACTIVE_JOB_ROOT
            }
          : {})
      }
    }
  );
}

function extractValue(output, key) {
  const line = String(output || "")
    .split(/\r?\n/)
    .find(line =>
      line.startsWith(`${key}=`)
    );

  return line
    ? line.slice(key.length + 1).trim()
    : "";
}

function extractTopic(data) {
  if (!data) return "";

  const direct = [
    data?.selected?.topic,
    data?.selectedTopic,
    data?.finalTopic,
    data?.winner?.topic,
    data?.best?.topic,
    data?.topic
  ];

  for (const value of direct) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  const arrays = [
    data?.verified,
    data?.results,
    data?.candidates,
    data?.finalists,
    data?.topics
  ];

  for (const list of arrays) {
    if (!Array.isArray(list)) continue;

    for (const item of list) {
      const topic =
        extractTopic(item);

      if (topic) return topic;
    }
  }

  return "";
}

function latestFile(
  root,
  fileName,
  after = 0
) {
  if (!fs.existsSync(root)) {
    return "";
  }

  const found = [];

  function walk(dir) {
    for (
      const entry of fs.readdirSync(
        dir,
        { withFileTypes: true }
      )
    ) {
      const full =
        path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (
        entry.name === fileName
      ) {
        const stat =
          fs.statSync(full);

        if (
          stat.mtimeMs >= after
        ) {
          found.push({
            file: full,
            time: stat.mtimeMs
          });
        }
      }
    }
  }

  walk(root);

  found.sort(
    (a, b) =>
      b.time - a.time
  );

  return found[0]?.file || "";
}

function stageDone(
  current,
  target
) {
  return (
    STAGES[current] ?? -1
  ) >= STAGES[target];
}


async function discoverAndReserveTopic() {

  runNode(
    "./longform/agents/topicScout.js"
  );

  runNode(
    "./longform/agents/topicResearcher.js"
  );

  runNode(
    "./longform/agents/topicSelector.js"
  );

  runNode(
    "./longform/agents/topicVerifier.js"
  );


  const verificationFile =
    path.join(
      DATA_ROOT,
      "topic-verification.json"
    );


  if (
    !fs.existsSync(
      verificationFile
    )
  ) {
    throw new Error(
      "topic-verification.json not found"
    );
  }


  const verification =
    readJSON(
      verificationFile
    );


  const candidates =
    Array.isArray(
      verification.verified
    )
      ? verification.verified
          .filter(candidate => {

            const status =
              String(
                candidate?.verification?.status ||
                ""
              ).toUpperCase();

            return (
              (
                status === "PASS" ||
                status === "FIX"
              ) &&
              candidate?.verification?.longformReady === true
            );

          })
          .sort(
            (a, b) =>
              Number(
                b?.scores?.finalScore || 0
              ) -
              Number(
                a?.scores?.finalScore || 0
              )
          )
      : [];


  if (!candidates.length) {
    throw new Error(
      "No verified longform candidates"
    );
  }


  let selected = null;
  let reserved = null;


  for (
    const candidate
    of candidates
  ) {

    const topic =
      String(
        candidate?.verification?.correctedTopic ||
        candidate?.topic ||
        ""
      ).trim();


    if (!topic) {
      continue;
    }


    const result =
      reserveTopic(
        topic
      );


    if (
      !result.reserved
    ) {

      console.log(
        `[LONGFORM FACTORY] DUPLICATE SKIP : ${topic}`
      );

      continue;

    }


    selected = {
      ...candidate,

      selectedTopic:
        topic
    };


    reserved = {
      ...result,
      topic
    };


    console.log(
      `[LONGFORM FACTORY] SELECTED : ${topic}`
    );

    break;

  }


  if (
    !selected ||
    !reserved
  ) {
    throw new Error(
      "All verified longform topics are duplicates"
    );
  }


  const jobRoot =
    getJobRoot(
      reserved.id
    );


  fs.mkdirSync(
    jobRoot,
    {
      recursive: true
    }
  );


  /*
  Production Research가
  선택된 후보 하나를 확실히 사용하도록
  해당 회차 verification 파일을 고정한다.
  */

  const jobVerification = {
    ...verification,

    selected,

    selectedTopic:
      reserved.topic
  };


  fs.writeFileSync(
    path.join(
      jobRoot,
      "topic-verification.json"
    ),

    JSON.stringify(
      jobVerification,
      null,
      2
    ),

    "utf8"
  );


  console.log(
    `[LONGFORM FACTORY] RESERVED: ${reserved.topic}`
  );

  console.log(
    `[LONGFORM FACTORY] JOB ROOT CREATED: ${jobRoot}`
  );


  return {
    id:
      reserved.id,

    topic:
      reserved.topic,

    status:
      "reserved",

    stage:
      "reserved",

    created_at:
      new Date().toISOString()
  };

}


/*
=========================================================
LONGFORM FACTORY

Manager에서 이 함수만 호출한다.

order 예:
{
  type: "longform",
  category: "history",
  mode: "auto",
  languages: ["ko", "en"]
}
=========================================================
*/

export async function runLongformFactory(
  order = {}
) {

  console.log("");
  console.log("================================");
  console.log("LONGFORM FACTORY START");
  console.log("================================");

  console.log(
    `[FACTORY] CATEGORY=${order.category || "history"}`
  );

  let production =
    getLatestUnfinished();

  if (production) {
    console.log(
      `[FACTORY] RESUME ID=${production.id}`
    );

    console.log(
      `[FACTORY] TOPIC=${production.topic}`
    );

    console.log(
      `[FACTORY] STAGE=${production.stage}`
    );
  } else {
    production =
      await discoverAndReserveTopic();
  }

  const id =
    Number(production.id);

  const jobRoot =
    getJobRoot(id);

  fs.mkdirSync(
    jobRoot,
    { recursive: true }
  );

  ACTIVE_JOB_ROOT =
    jobRoot;

  console.log(
    `[LONGFORM FACTORY] WORK ROOT=${jobRoot}`
  );

  const createdAt =
    Date.parse(
      production.created_at || ""
    ) || Date.now();

  let currentStage =
    production.stage ||
    "reserved";

  try {

    /*
    =====================================================
    RESEARCH
    =====================================================
    */

    if (
      !stageDone(
        currentStage,
        "research"
      )
    ) {
      runNode(
        "./longform/agents/productionResearchAgent.js"
      );

      updateStage(
        id,
        "research"
      );

      currentStage =
        "research";
    }


    /*
    =====================================================
    DIRECTOR
    KO + EN + IMAGE QUERY
    =====================================================
    */

    if (
      !stageDone(
        currentStage,
        "director"
      )
    ) {
      runNode(
        "./longform/director.js"
      );

      updateStage(
        id,
        "director"
      );

      currentStage =
        "director";
    }


    /*
    =====================================================
    IMAGE
    =====================================================
    */

    let imageManifest =
      latestFile(
        path.join(jobRoot, "visuals", "image-runs"),
        "image-engine-result.json",
        createdAt
      );

    if (
      !stageDone(
        currentStage,
        "images"
      ) ||
      !imageManifest
    ) {
      const output =
        runNode(
          "./longform/visuals/runLongformImageEngine.js"
        );

      imageManifest =
        extractValue(
          output,
          "SAVED"
        );

      if (
        !imageManifest ||
        !fs.existsSync(
          imageManifest
        )
      ) {
        throw new Error(
          "Image manifest missing"
        );
      }

      updateStage(
        id,
        "images"
      );

      currentStage =
        "images";
    }



    /*
    =====================================================
    LONGFORM THUMBNAIL GENERATION
    =====================================================
    */

    const koThumbnail =
      path.join(
        jobRoot,
        "thumbnails",
        "thumbnail-ko.jpg"
      );

    const enThumbnail =
      path.join(
        jobRoot,
        "thumbnails",
        "thumbnail-en.jpg"
      );

    if (
      !fs.existsSync(koThumbnail) ||
      !fs.existsSync(enThumbnail)
    ) {

      runNode(
        "./longform/agents/createLongformThumbnails.js",
        [
          imageManifest
        ]
      );

      if (
        !fs.existsSync(koThumbnail) ||
        !fs.existsSync(enThumbnail)
      ) {
        throw new Error(
          "Longform thumbnail generation failed"
        );
      }
    }

    console.log(
      `[LONGFORM THUMBNAIL] KO=${koThumbnail}`
    );

    console.log(
      `[LONGFORM THUMBNAIL] EN=${enThumbnail}`
    );


    /*
    =====================================================
    KO + EN SPEECH / SUBTITLE
    =====================================================
    */

    let enSpeechManifest =
      latestFile(
        path.join(jobRoot, "speech-runs"),
        "speech-manifest.json",
        0
      );

    if (
      !stageDone(
        currentStage,
        "speech"
      ) ||
      !enSpeechManifest
    ) {

      // Korean:
      // SunHi +0%
      // TTS와 SRT 동시 생성
      runNode(
        "./longform/agents/subtitleKo.js"
      );

      runNode(
        "./longform/agents/mergeSubtitlesKo.js"
      );

      // English:
      // Christopher +0%
      // TTS + SRT + manifest 동시 생성
      const enOutput =
        runNode(
          "./longform/agents/subtitleEn.js"
        );

      enSpeechManifest =
        extractValue(
          enOutput,
          "SPEECH_COMPLETE"
        );

      if (
        !enSpeechManifest ||
        !fs.existsSync(
          enSpeechManifest
        )
      ) {

        enSpeechManifest =
          latestFile(
            path.join(
              jobRoot,
              "speech-runs"
            ),
            "speech-manifest.json",
            0
          );

      }

      if (
        !enSpeechManifest ||
        !fs.existsSync(
          enSpeechManifest
        )
      ) {
        throw new Error(
          "English speech manifest missing"
        );
      }

      console.log(
        `[LONGFORM FACTORY] EN SPEECH MANIFEST=${enSpeechManifest}`
      );

      updateStage(
        id,
        "speech"
      );

      currentStage =
        "speech";
    }


    /*
    KO merged subtitle timing normalization.
    Small <=250ms overlaps are clipped safely.
    */
    runNode(
      "./longform/agents/normalizeKoSubtitles.js"
    );


    /*
    =====================================================
    RENDER KO
    =====================================================
    */

    let koVideo =
      latestFile(
        path.join(jobRoot, "visuals", "render-runs"),
        "longform-ko-full.mp4",
        createdAt
      );

    let enVideo =
      latestFile(
        path.join(jobRoot, "visuals", "render-runs"),
        "longform-en-full.mp4",
        createdAt
      );

    if (
      !stageDone(
        currentStage,
        "render"
      ) ||
      !koVideo ||
      !enVideo
    ) {

      if (!koVideo) {
        const koOutput =
          runNode(
            "./longform/visuals/renderLongform.js",
            [
              imageManifest,
              "ko",
              "full",
              "",
              String(id)
            ]
          );

        koVideo =
          extractValue(
            koOutput,
            "RENDER_COMPLETE"
          )
          .replace(
            /\s+DURATION=.*$/,
            ""
          )
          .trim();
      }

      if (!enVideo) {
        const enOutput =
          runNode(
            "./longform/visuals/renderLongform.js",
            [
              imageManifest,
              "en",
              "full",
              enSpeechManifest,
              String(id)
            ]
          );

        enVideo =
          extractValue(
            enOutput,
            "RENDER_COMPLETE"
          )
          .replace(
            /\s+DURATION=.*$/,
            ""
          )
          .trim();
      }

      if (
        !koVideo ||
        !fs.existsSync(koVideo)
      ) {
        throw new Error(
          "KO final video missing"
        );
      }

      if (
        !enVideo ||
        !fs.existsSync(enVideo)
      ) {
        throw new Error(
          "EN final video missing"
        );
      }

      updateStage(
        id,
        "render"
      );

      currentStage =
        "render";
    }


    /*
    =====================================================
    MANAGER RETURN

    아직 업로드는 여기서 실행하지 않는다.
    다음 단계에서 Upload Factory 연결.
    =====================================================
    */

    updateStage(
      id,
      "ready"
    );

    currentStage =
      "ready";


    /*
    =====================================================
    LONGFORM AUTO UPLOAD

    KO -> History
    EN -> EchoesAgo

    uploadFactory가 언어별 성공 ID를 즉시 DB에 저장한다.
    =====================================================
    */

    console.log("");
    console.log(
      "================================"
    );
    console.log(
      "LONGFORM AUTO UPLOAD"
    );
    console.log(
      "================================"
    );


    const uploadResult =
      await uploadLongform({
        productionId: id,

        topic:
          production.topic,

        koVideo,

        enVideo,

        workRoot:
          jobRoot
      });


    currentStage =
      "completed";


    /*
    =====================================================
    SAFE AUTO CLEANUP

    반드시 KO + EN 업로드 성공 후에만 도달한다.

    실패 시 여기까지 오지 않으므로
    이미지/음성/자막/렌더 파일을 보존한다.
    =====================================================
    */

    let cleanupCompleted =
      false;

    try {

      cleanupLongformProduction({
        jobRoot
      });

      cleanupCompleted =
        true;

    }
    catch (cleanupError) {

      console.error(
        "[LONGFORM CLEANUP FAILED]",
        cleanupError?.message ||
        cleanupError
      );

    }

    console.log("");
    console.log("================================");
    console.log("LONGFORM FACTORY READY");
    console.log("================================");

    console.log(
      `PRODUCTION_ID=${id}`
    );

    console.log(
      `TOPIC=${production.topic}`
    );

    if (cleanupCompleted) {

      console.log(
        "LOCAL_VIDEO_FILES=CLEANED"
      );

    }
    else {

      console.log(
        `KO_VIDEO=${koVideo}`
      );

      console.log(
        `EN_VIDEO=${enVideo}`
      );

    }

    return {
      ok: true,
      type: "longform",
      productionId: id,
      topic: production.topic,
      category:
        order.category ||
        "history",

      outputs: {
        ko: koVideo,
        en: enVideo
      },

      channels: {
        ko: "History",
        en: "EchoesAgo"
      },

      uploads:
        uploadResult,

      cleanup:
        cleanupCompleted,

      stage:
        "completed"
    };

  } catch (error) {

    failProduction(
      id,
      currentStage,
      error?.message ||
      String(error)
    );

    console.error(
      "[LONGFORM FACTORY FAILED]",
      error?.message || error
    );

    throw error;
  }
}

export default {
  runLongformFactory
};
