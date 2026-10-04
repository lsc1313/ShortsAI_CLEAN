import fs from "node:fs";

function patchFile(file, patcher) {
    let src = fs.readFileSync(file, "utf8");
    const next = patcher(src);

    if (next === src) {
        console.log("NO CHANGE:", file);
        return;
    }

    fs.copyFileSync(
        file,
        file + ".bak-core-subject"
    );

    fs.writeFileSync(
        file,
        next,
        "utf8"
    );

    console.log("PATCHED:", file);
}


/*
=====================================================
1. SHARED IMAGE ENGINE
coreSubject 전달 추가
=====================================================
*/

patchFile(
    "./modules/engine/imageEngine.js",
    src => {

        if (
            src.includes(
                "coreSubject:\n                scene.coreSubject ||"
            )
        ) {
            return src;
        }

        const target =
`            subject:scene.subject || "",

            searchSubject:`;

        const replacement =
`            subject:scene.subject || "",

            coreSubject:
                scene.coreSubject ||
                scene.subject ||
                scene.searchSubject ||
                topic ||
                "",

            searchSubject:`;

        if (!src.includes(target)) {
            throw new Error(
                "imageEngine coreSubject target not found"
            );
        }

        return src.replace(
            target,
            replacement
        );
    }
);


/*
=====================================================
2. LONGFORM RECOVERY
보충용 Scene에는 검색어 자체를 coreSubject로 사용
=====================================================
*/

patchFile(
    "./longform/visuals/runLongformImageEngine.js",
    src => {

        if (
            src.includes(
                "coreSubject:\n                        query,"
            )
        ) {
            return src;
        }

        const target =
`                    imageLimit: 1,

                    imageQueries: [`;

        const replacement =
`                    imageLimit: 1,

                    coreSubject:
                        query,

                    imageQueries: [`;

        if (!src.includes(target)) {
            throw new Error(
                "longform recovery target not found"
            );
        }

        return src.replace(
            target,
            replacement
        );
    }
);

console.log(
    "CORE SUBJECT PATCH COMPLETE"
);
