import fs from "node:fs";

const file =
    "./longform/visuals/runLongformImageEngine.js";

let src =
    fs.readFileSync(file, "utf8");

const target = `                            const repaired =
                                await createOneMissingImage(
                                    sceneNo,
                                    slotNo,
                                    scenePlan,
                                    query,
                                    runDir
                                );`;

if (!src.includes(target)) {
    throw new Error(
        "LONGFORM repair call target not found"
    );
}

const replacement = `                            let repaired = null;

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
                            }`;

src =
    src.replace(
        target,
        replacement
    );

fs.copyFileSync(
    file,
    file + ".bak-repair-fallback"
);

fs.writeFileSync(
    file,
    src,
    "utf8"
);

console.log(
    "LONGFORM IMAGE FALLBACK PATCHED"
);
