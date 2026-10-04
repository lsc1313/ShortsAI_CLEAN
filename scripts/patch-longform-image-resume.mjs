import fs from "node:fs";

const file =
    "./longform/visuals/runLongformImageEngine.js";

let src =
    fs.readFileSync(file, "utf8");

const start =
    src.indexOf("async function main() {");

const end =
    src.indexOf(
        "if (process.argv[1]",
        start
    );

if (start < 0 || end < 0) {
    throw new Error(
        "IMAGE MAIN RANGE NOT FOUND"
    );
}

const newMain = String.raw`async function main() {

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


                            const repaired =
                                await createOneMissingImage(
                                    sceneNo,
                                    slotNo,
                                    scenePlan,
                                    query,
                                    runDir
                                );


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
}`;

src =
    src.slice(0, start) +
    newMain +
    "\n\n" +
    src.slice(end);

fs.writeFileSync(
    file,
    src,
    "utf8"
);

console.log(
    "LONGFORM IMAGE RESUME PATCHED"
);
