import fs from "node:fs";

function patchDirector() {

    const file =
        "./longform/director.js";

    let s =
        fs.readFileSync(
            file,
            "utf8"
        );

    /*
    ====================================================
    1. Director JSON metadata prompt
    ====================================================
    */

    if (
        !s.includes(
            '"thumbnailTextKo"'
        )
    ) {

        const titleEnPattern =
            /(\s*"titleEn":\s*"Natural clickable English long-form YouTube title\.[^"\r\n]*",\r?\n)/;

        if (!titleEnPattern.test(s)) {
            throw new Error(
                "DIRECTOR titleEn prompt target not found"
            );
        }

        s =
            s.replace(
                titleEnPattern,
                `$1    "thumbnailTextKo": "한국어 썸네일용 짧은 문구. 영상 제목을 반복하지 말고 핵심 궁금증이나 반전을 10~22자 정도로 표현. 과장되거나 사실로 확인되지 않은 주장은 금지.",\n    "thumbnailTextEn": "Short natural English thumbnail text, ideally 3 to 7 words. Create curiosity without repeating the full title or making unsupported claims.",\n`
            );
    }


    /*
    ====================================================
    2. normalized metadata
    ====================================================
    */

    if (
        !s.includes(
            "rawMetadata.thumbnailTextKo"
        )
    ) {

        const target =
`        titleEn:
            normalizeTitle(
                rawMetadata.titleEn,
                fallbackTitleEn
            ),

`;

        if (!s.includes(target)) {
            throw new Error(
                "DIRECTOR metadata titleEn target not found"
            );
        }

        const replacement =
`        titleEn:
            normalizeTitle(
                rawMetadata.titleEn,
                fallbackTitleEn
            ),

        thumbnailTextKo:
            normalizeTitle(
                rawMetadata.thumbnailTextKo,
                rawMetadata.titleKo || topic
            ),

        thumbnailTextEn:
            normalizeTitle(
                rawMetadata.thumbnailTextEn,
                rawMetadata.titleEn || fallbackTitleEn
            ),

`;

        s =
            s.replace(
                target,
                replacement
            );
    }


    /*
    ====================================================
    3. root output에도 보존
    ====================================================
    */

    if (
        !s.includes(
            "thumbnailTextKo:\n            longformMetadata.thumbnailTextKo"
        )
    ) {

        const target =
`        titleEn:
            longformMetadata.titleEn,

`;

        if (!s.includes(target)) {
            throw new Error(
                "DIRECTOR output titleEn target not found"
            );
        }

        const replacement =
`        titleEn:
            longformMetadata.titleEn,

        thumbnailTextKo:
            longformMetadata.thumbnailTextKo,

        thumbnailTextEn:
            longformMetadata.thumbnailTextEn,

`;

        s =
            s.replace(
                target,
                replacement
            );
    }

    fs.writeFileSync(
        file,
        s,
        "utf8"
    );
}


function patchThumbnailGenerator() {

    const file =
        "./longform/agents/createLongformThumbnails.js";

    let s =
        fs.readFileSync(
            file,
            "utf8"
        );

    if (
        !s.includes(
            "script?.metadata?.thumbnailTextKo"
        )
    ) {

        const oldKo =
`const titleKo =
    script?.metadata?.titleKo ||
    script?.titleKo ||
    script?.topic ||
    "역사의 숨겨진 이야기";`;

        const newKo =
`const titleKo =
    script?.metadata?.thumbnailTextKo ||
    script?.thumbnailTextKo ||
    script?.metadata?.titleKo ||
    script?.titleKo ||
    script?.topic ||
    "역사의 숨겨진 이야기";`;

        if (!s.includes(oldKo)) {
            throw new Error(
                "KO thumbnail title target not found"
            );
        }

        s =
            s.replace(
                oldKo,
                newKo
            );
    }


    if (
        !s.includes(
            "script?.metadata?.thumbnailTextEn"
        )
    ) {

        const oldEn =
`const titleEn =
    script?.metadata?.titleEn ||
    script?.titleEn ||
    "The Hidden Story of History";`;

        const newEn =
`const titleEn =
    script?.metadata?.thumbnailTextEn ||
    script?.thumbnailTextEn ||
    script?.metadata?.titleEn ||
    script?.titleEn ||
    "The Hidden Story of History";`;

        if (!s.includes(oldEn)) {
            throw new Error(
                "EN thumbnail title target not found"
            );
        }

        s =
            s.replace(
                oldEn,
                newEn
            );
    }

    fs.writeFileSync(
        file,
        s,
        "utf8"
    );
}


patchDirector();
patchThumbnailGenerator();

console.log(
    "LONGFORM THUMBNAIL TEXT PATCHED"
);
