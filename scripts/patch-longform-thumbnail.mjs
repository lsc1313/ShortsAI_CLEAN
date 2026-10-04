import fs from "node:fs";

function mustReplace(
    source,
    oldValue,
    newValue,
    label
) {
    if (!source.includes(oldValue)) {
        throw new Error(
            `PATCH TARGET NOT FOUND: ${label}`
        );
    }

    return source.replace(
        oldValue,
        newValue
    );
}


/*
====================================================
FACTORY
====================================================
*/

const factoryFile =
    "./longform/factory.js";

let factory =
    fs.readFileSync(
        factoryFile,
        "utf8"
    );

if (
    !factory.includes(
        "LONGFORM THUMBNAIL GENERATION"
    )
) {

    const markerText =
        "    KO + EN SPEECH / SUBTITLE";

    const markerIndex =
        factory.indexOf(markerText);

    if (markerIndex < 0) {
        throw new Error(
            "FACTORY SPEECH MARKER NOT FOUND"
        );
    }

    const commentIndex =
        factory.lastIndexOf(
            "    /*",
            markerIndex
        );

    if (commentIndex < 0) {
        throw new Error(
            "FACTORY COMMENT MARKER NOT FOUND"
        );
    }

    const thumbnailBlock = `
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
      \`[LONGFORM THUMBNAIL] KO=\${koThumbnail}\`
    );

    console.log(
      \`[LONGFORM THUMBNAIL] EN=\${enThumbnail}\`
    );


`;

    factory =
        factory.slice(
            0,
            commentIndex
        ) +
        thumbnailBlock +
        factory.slice(
            commentIndex
        );

    fs.writeFileSync(
        factoryFile,
        factory,
        "utf8"
    );
}


/*
====================================================
UPLOAD FACTORY
====================================================
*/

const uploadFile =
    "./longform/uploadFactory.js";

let upload =
    fs.readFileSync(
        uploadFile,
        "utf8"
    );

if (
    !upload.includes(
        "thumbnail-ko.jpg"
    )
) {

    const markerText =
        "    KOREAN";

    const markerIndex =
        upload.indexOf(markerText);

    if (markerIndex < 0) {
        throw new Error(
            "UPLOAD KO MARKER NOT FOUND"
        );
    }

    const commentIndex =
        upload.lastIndexOf(
            "    /*",
            markerIndex
        );

    if (commentIndex < 0) {
        throw new Error(
            "UPLOAD COMMENT MARKER NOT FOUND"
        );
    }

    const thumbVars = `
    const koThumbnail =
        workRoot
            ? path.join(
                workRoot,
                "thumbnails",
                "thumbnail-ko.jpg"
            )
            : "";

    const enThumbnail =
        workRoot
            ? path.join(
                workRoot,
                "thumbnails",
                "thumbnail-en.jpg"
            )
            : "";


`;

    upload =
        upload.slice(
            0,
            commentIndex
        ) +
        thumbVars +
        upload.slice(
            commentIndex
        );
}


/*
uploadVideo 5번째 인자 = thumbnailFile
*/

let uploadCount = 0;

upload =
    upload.replace(
        /(\s+topic\s*\|\|\s*\r?\n\s+script\.topic\s*\|\|\s*\r?\n\s+"")(\s*\r?\n\s*\);)/g,
        (
            full,
            topicPart,
            closePart
        ) => {

            uploadCount++;

            if (uploadCount === 1) {
                return (
                    topicPart +
                    "," +
                    "\n" +
                    "                koThumbnail" +
                    closePart
                );
            }

            if (uploadCount === 2) {
                return (
                    topicPart +
                    "," +
                    "\n" +
                    "                enThumbnail" +
                    closePart
                );
            }

            return full;
        }
    );

if (
    !upload.includes("koThumbnail") ||
    !upload.includes("enThumbnail")
) {
    throw new Error(
        "UPLOAD THUMBNAIL ARG PATCH FAILED"
    );
}

fs.writeFileSync(
    uploadFile,
    upload,
    "utf8"
);

console.log(
    "LONGFORM THUMBNAIL WIRING PATCHED"
);
