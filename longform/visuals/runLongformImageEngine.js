import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(DATA_ROOT, "longform-script.json");

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function shortText(text = "", max = 180) {
    const s = String(text).replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max) + "..." : s;
}

export function buildImagePayload(data) {
    if (!Array.isArray(data.chapters) || data.chapters.length !== 8) {
        throw new Error("Exactly 8 chapters are required");
    }
    for (const [index, chapter] of data.chapters.entries()) {
        if (Number(chapter.number) !== index + 1 ||
            !Array.isArray(chapter.images) || chapter.images.length !== 2 ||
            chapter.images.some(image => typeof image?.query !== "string" || !image.query.trim())) {
            throw new Error(`Chapter ${index + 1}: exactly two Director image queries are required`);
        }
    }

    const payload = {
        mediaMode: "image",
        title: data.topic,
        topic: data.topic,
        hook: "",
        hookImages: [],

        scenes: data.chapters.map((chapter, idx) => ({
            title: chapter.titleKo || chapter.title || `Chapter ${idx + 1}`,
            sceneType: "global",
            imageLimit: 2,

            subject: chapter.titleKo || chapter.title || "",
            searchSubject: chapter.titleKo || chapter.title || "",
            searchHint: data.topic,
            imagePrompt: `${data.topic} documentary historical image`,
            imageKeywords: [
                data.topic,
                chapter.titleKo || chapter.title || ""
            ].filter(Boolean),

            imageQueries: Array.isArray(chapter.images)
                ? chapter.images.map(x => x.query).filter(Boolean).slice(0, 2)
                : [],

            images: Array.isArray(chapter.images)
                ? chapter.images.map(x => x.query).filter(Boolean).slice(0, 2)
                : [],

            voice: shortText(
                chapter.narrationKo ||
                chapter.narration ||
                "",
                180
            ),

            subtitle: shortText(
                chapter.narrationKo ||
                chapter.narration ||
                "",
                180
            )
        }))
    };

    return payload;
}

export function validateImageResult(result) {
    for (let scene = 1; scene <= 8; scene++) {
        const images = result.images.filter(image => image.scene === scene);
        if (images.length !== 2) throw new Error(`Chapter ${scene}: expected 2 images, got ${images.length}`);
        for (const image of images) {
            if (image.mediaType !== "image" || !["Pixabay", "Pexels"].includes(image.provider) ||
                !fs.existsSync(image.file) || fs.statSync(image.file).size < 5000) {
                throw new Error(`Chapter ${scene}: invalid real-image download`);
            }
        }
    }
    if (result.images.length !== 16) throw new Error("Expected exactly 16 images");
}

async function main() {

    dotenv.config({
        path: path.join(
            ROOT,
            "..",
            ".env"
        )
    });

    const payload =
        buildImagePayload(
            readJSON(INPUT)
        );

    const {
        createImages
    } = await import(
        "../../modules/engine/imageEngine.js"
    );

    const runs =
        path.join(
            DATA_ROOT,
            "visuals",
            "image-runs"
        );

    fs.mkdirSync(
        runs,
        {
            recursive: true
        }
    );


    function validRealImage(image) {

        if (
            !image ||
            image.mediaType !== "image" ||
            ![
                "Pixabay",
                "Pexels"
            ].includes(image.provider) ||
            !image.file ||
            !fs.existsSync(image.file)
        ) {
            return false;
        }

        try {

            return (
                fs.statSync(image.file).size >=
                5000
            );

        }
        catch {

            return false;

        }
    }


    function latestManifest() {

        const files = [];

        for (
            const entry of
            fs.readdirSync(
                runs,
                {
                    withFileTypes: true
                }
            )
        ) {

            if (!entry.isDirectory()) {
                continue;
            }

            const candidate =
                path.join(
                    runs,
                    entry.name,
                    "image-engine-result.json"
                );

            if (
                fs.existsSync(candidate)
            ) {

                files.push({
                    file: candidate,
                    mtime:
                        fs.statSync(
                            candidate
                        ).mtimeMs
                });

            }
        }

        files.sort(
            (a, b) =>
                b.mtime - a.mtime
        );

        return (
            files[0]?.file ||
            null
        );
    }


    async function createOneMissingImage(
        sceneNo,
        slotNo,
        scenePlan,
        query,
        runDir
    ) {

        const recoveryRoot =
            path.join(
                runDir,
                "recovery"
            );

        fs.mkdirSync(
            recoveryRoot,
            {
                recursive: true
            }
        );

        const recoveryDir =
            fs.mkdtempSync(
                path.join(
                    recoveryRoot,
                    "scene-" +
                    sceneNo +
                    "-slot-" +
                    slotNo +
                    "-"
                )
            );

        const partial = {

            mediaMode: "image",

            title:
                payload.title,

            topic:
                payload.topic,

            hook: "",

            hookImages: [],

            scenes: [
                {
                    ...scenePlan,

                    imageLimit: 1,

                    coreSubject:
                        query,

                    imageQueries: [
                        query
                    ],

                    images: [
                        query
                    ],

                    imageKeywords: [
                        query
                    ],

                    imagePrompt:
                        query
                }
            ]
        };

        const previousCwd =
            process.cwd();

        let generated;
        let sourceFile;

        try {

            process.chdir(
                recoveryDir
            );

            const result =
                await createImages(
                    partial
                );

            generated =
                result?.images?.[0];

            if (!generated?.file) {
                throw new Error(
                    "missing image generation returned no image"
                );
            }

            sourceFile =
                path.resolve(
                    generated.file
                );

        }
        finally {

            process.chdir(
                previousCwd
            );

        }

        if (
            !generated ||
            ![
                "Pixabay",
                "Pexels"
            ].includes(
                generated.provider
            ) ||
            !fs.existsSync(
                sourceFile
            ) ||
            fs.statSync(
                sourceFile
            ).size < 5000
        ) {

            throw new Error(
                "recovery image invalid"
            );

        }

        const imageDir =
            path.join(
                runDir,
                "media",
                "images"
            );

        fs.mkdirSync(
            imageDir,
            {
                recursive: true
            }
        );

        const ext =
            path.extname(
                sourceFile
            ) || ".jpg";

        const destination =
            path.join(
                imageDir,
                "scene_" +
                sceneNo +
                "_" +
                slotNo +
                ext
            );

        fs.copyFileSync(
            sourceFile,
            destination
        );

        fs.rmSync(
            recoveryDir,
            {
                recursive: true,
                force: true
            }
        );

        return {

            ...generated,

            scene:
                sceneNo,

            sceneType:
                scenePlan.sceneType ||
                "global",

            keyword:
                generated.keyword ||
                query,

            subject:
                scenePlan.subject ||
                "",

            searchSubject:
                scenePlan.searchSubject ||
                "",

            searchHint:
                scenePlan.searchHint ||
                "",

            file:
                destination
        };
    }


    console.log("");

    console.log(
        "================================"
    );

    console.log(
        "LONGFORM IMAGE ENGINE"
    );

    console.log(
        "================================"
    );

    console.log(
        "TOPIC: " +
        payload.topic
    );

    console.log(
        "CHAPTERS: " +
        payload.scenes.length
    );


    /*
     * 기존 실패 run이 있으면
     * 정상 이미지들을 그대로 재사용한다.
     */
    const previousManifest =
        latestManifest();

    if (previousManifest) {

        try {

            const previous =
                readJSON(
                    previousManifest
                );

            if (
                Array.isArray(
                    previous.images
                )
            ) {

                const reusable = [];

                for (
                    let sceneNo = 1;
                    sceneNo <= 8;
                    sceneNo++
                ) {

                    const valid =
                        previous.images
                        .filter(
                            image =>
                                Number(
                                    image.scene
                                ) ===
                                sceneNo &&
                                validRealImage(
                                    image
                                )
                        )
                        .slice(
                            0,
                            2
                        );

                    reusable.push(
                        ...valid
                    );
                }


                if (
                    reusable.length > 0
                ) {

                    previous.images =
                        reusable;

                    const runDir =
                        path.dirname(
                            previousManifest
                        );

                    console.log(
                        "[IMAGE RESUME] reusable=" +
                        reusable.length +
                        "/16"
                    );


                    for (
                        let sceneNo = 1;
                        sceneNo <= 8;
                        sceneNo++
                    ) {

                        let sceneImages =
                            previous.images
                            .filter(
                                image =>
                                    Number(
                                        image.scene
                                    ) ===
                                    sceneNo
                            );

                        const scenePlan =
                            payload.scenes[
                                sceneNo - 1
                            ];


                        while (
                            sceneImages.length <
                            2
                        ) {

                            const slotNo =
                                sceneImages.length +
                                1;

                            const query =
                                scenePlan
                                    ?.imageQueries
                                    ?.[
                                        slotNo - 1
                                    ] ||
                                scenePlan
                                    ?.images
                                    ?.[
                                        slotNo - 1
                                    ] ||
                                scenePlan
                                    ?.imageQueries
                                    ?.[0] ||
                                (
                                    payload.topic +
                                    " " +
                                    (
                                        scenePlan
                                            ?.title ||
                                        ""
                                    )
                                );


                            console.log(
                                "[IMAGE REPAIR] scene=" +
                                sceneNo +
                                " slot=" +
                                slotNo
                            );

                            console.log(
                                "[IMAGE REPAIR QUERY] " +
                                query
                            );


                            let repaired = null;

                            const repairQueries =
                                [
                                    query,

                                    payload.topic +
                                    " historical archive",

                                    payload.topic +
                                    " documentary history",

                                    "historical archive black and white",

                                    "vintage newspaper archive"
                                ]
                                .map(
                                    value =>
                                        String(
                                            value || ""
                                        ).trim()
                                )
                                .filter(Boolean)
                                .filter(
                                    (value, index, list) =>
                                        list.indexOf(value) === index
                                );


                            for (
                                const repairQuery
                                of repairQueries
                            ) {

                                console.log(
                                    "[IMAGE REPAIR TRY] scene=" +
                                    sceneNo +
                                    " slot=" +
                                    slotNo +
                                    " query=" +
                                    repairQuery
                                );

                                try {

                                    repaired =
                                        await createOneMissingImage(
                                            sceneNo,
                                            slotNo,
                                            scenePlan,
                                            repairQuery,
                                            runDir
                                        );

                                    break;

                                }
                                catch (error) {

                                    console.log(
                                        "[IMAGE REPAIR TRY FAILED] " +
                                        error.message
                                    );

                                }
                            }


                            /*
                             * 무료소스 검색을 모두 실패한 경우:
                             * 같은 Chapter에서 이미 검증된 이미지를
                             * 별도 파일로 복제하여 제작 중단을 방지한다.
                             */
                            if (!repaired) {

                                const existing =
                                    sceneImages.find(
                                        validRealImage
                                    );

                                if (!existing) {
                                    throw new Error(
                                        "No safe image fallback for scene " +
                                        sceneNo
                                    );
                                }

                                const imageDir =
                                    path.join(
                                        runDir,
                                        "media",
                                        "images"
                                    );

                                fs.mkdirSync(
                                    imageDir,
                                    {
                                        recursive: true
                                    }
                                );

                                const ext =
                                    path.extname(
                                        existing.file
                                    ) ||
                                    ".jpg";

                                const destination =
                                    path.join(
                                        imageDir,
                                        "scene_" +
                                        sceneNo +
                                        "_" +
                                        slotNo +
                                        ext
                                    );

                                fs.copyFileSync(
                                    existing.file,
                                    destination
                                );

                                repaired = {
                                    ...existing,

                                    scene:
                                        sceneNo,

                                    file:
                                        destination,

                                    keyword:
                                        "safe fallback copy",

                                    imageType:
                                        "repair-copy-fallback"
                                };

                                console.log(
                                    "[IMAGE REPAIR FALLBACK COPY] scene=" +
                                    sceneNo +
                                    " slot=" +
                                    slotNo
                                );
                            }


                            previous.images.push(
                                repaired
                            );

                            sceneImages.push(
                                repaired
                            );


                            console.log(
                                "[IMAGE REPAIRED] scene=" +
                                sceneNo +
                                " slot=" +
                                slotNo +
                                " provider=" +
                                repaired.provider
                            );
                        }
                    }


                    previous.images.sort(
                        (a, b) => {

                            const sceneDiff =
                                Number(a.scene) -
                                Number(b.scene);

                            if (
                                sceneDiff !== 0
                            ) {
                                return sceneDiff;
                            }

                            return String(
                                a.file
                            ).localeCompare(
                                String(
                                    b.file
                                )
                            );
                        }
                    );


                    validateImageResult(
                        previous
                    );


                    const backup =
                        previousManifest +
                        ".before-repair.bak";

                    if (
                        !fs.existsSync(
                            backup
                        )
                    ) {

                        fs.copyFileSync(
                            previousManifest,
                            backup
                        );

                    }


                    const temp =
                        previousManifest +
                        ".tmp";

                    fs.writeFileSync(
                        temp,
                        JSON.stringify(
                            previous,
                            null,
                            2
                        ),
                        "utf8"
                    );

                    fs.renameSync(
                        temp,
                        previousManifest
                    );


                    console.log("");

                    console.log(
                        "IMAGE ENGINE COMPLETE"
                    );

                    console.log(
                        "SCENES=" +
                        (
                            previous.script
                                ?.length ||
                            8
                        )
                    );

                    console.log(
                        "IMAGES=" +
                        previous.images.length
                    );

                    console.log(
                        "SAVED=" +
                        previousManifest
                    );

                    return;
                }
            }
        }
        catch (error) {

            console.log(
                "[IMAGE RESUME FAILED] " +
                error.message
            );

            throw error;
        }
    }


    /*
     * 이전 이미지가 하나도 없는 경우만
     * 새 run 전체 생성
     */
    const runDir =
        fs.mkdtempSync(
            path.join(
                runs,
                "run-"
            )
        );

    const output =
        path.join(
            runDir,
            "image-engine-result.json"
        );

    console.log(
        "RUN_DIR=" +
        runDir
    );


    const previousCwd =
        process.cwd();

    let result;

    try {

        process.chdir(
            runDir
        );

        result =
            await createImages(
                payload
            );

        for (
            const image of
            result.images
        ) {

            image.file =
                path.resolve(
                    image.file
                );
        }

    }
    finally {

        process.chdir(
            previousCwd
        );
    }


    fs.writeFileSync(
        output,
        JSON.stringify(
            result,
            null,
            2
        ),
        {
            encoding: "utf8",
            flag: "wx"
        }
    );


    validateImageResult(
        result
    );


    console.log("");

    console.log(
        "IMAGE ENGINE COMPLETE"
    );

    console.log(
        "SCENES=" +
        (
            result.script
                ?.length ||
            0
        )
    );

    console.log(
        "IMAGES=" +
        (
            result.images
                ?.length ||
            0
        )
    );

    console.log(
        "SAVED=" +
        output
    );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => {
    console.error("LONGFORM IMAGE ENGINE FAILED:", error.message);
    process.exit(1);
});
