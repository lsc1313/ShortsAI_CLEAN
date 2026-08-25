from pathlib import Path
import re
import shutil
from datetime import datetime

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

def backup(path):
    out = path.with_name(
        path.name + f".backup_before_validation_repair_{stamp}"
    )
    shutil.copy2(path, out)
    print(f"[BACKUP] {out}")

def replace_function(text, function_name, new_function):
    pattern = re.compile(
        rf"function\s+{re.escape(function_name)}\s*\([^)]*\)\s*\{{"
        rf".*?"
        rf"\n\}}",
        re.DOTALL
    )

    match = pattern.search(text)

    if not match:
        raise RuntimeError(
            f"{function_name}: function block not found"
        )

    return (
        text[:match.start()]
        + new_function
        + text[match.end():]
    )

# ============================================================
# SCIENCE
# ============================================================

science = Path("modules/science/director.js")
backup(science)

text = science.read_text(encoding="utf-8")

science_function = r'''function validateScienceSceneSafety(
    scenes
){
    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){
        console.error(
            "[SCIENCE DIRECTOR] FAILED : NO SCENES"
        );

        throw new Error(
            "SCIENCE DIRECTOR 결과에 Scene이 없습니다."
        );
    }

    for(
        let i = 0;
        i < scenes.length;
        i++
    ){
        const scene =
            scenes[i];

        const sceneNumber =
            i + 1;

        /*
        =================================================
        CORE SUBJECT
        =================================================

        coreSubject는 선택 필드다.

        대표 대상이 있는 Scene에서는
        해당 대상을 우선 보호한다.

        대표 대상이 없는 Scene에서는
        빈 문자열을 허용한다.

        coreSubject가 없다고 해서
        Scene을 실패 처리하지 않는다.
        */

        const coreSubject =
            String(
                scene?.coreSubject || ""
            ).trim();

        scene.coreSubject =
            coreSubject;

        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene?.imageQueries
            ) ||
            scene.imageQueries.length === 0
        ){
            console.error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `SCIENCE Scene ${sceneNumber} imageQueries가 없습니다.`
            );
        }

        const queries =
            scene.imageQueries
                .map(
                    query =>
                        String(
                            query || ""
                        ).trim()
                )
                .filter(Boolean);

        if(
            queries.length === 0
        ){
            console.error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `SCIENCE Scene ${sceneNumber} imageQueries가 비어 있습니다.`
            );
        }
    }

    return true;
}'''

text = replace_function(
    text,
    "validateScienceSceneSafety",
    science_function
)

science.write_text(text, encoding="utf-8")

print("[REPAIR] SCIENCE validation OK")

# ============================================================
# HISTORY
# ============================================================

history = Path("modules/history/director.js")
backup(history)

text = history.read_text(encoding="utf-8")

history_function = r'''function validateHistorySceneSafety(
    scenes
){
    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){
        console.error(
            "[HISTORY DIRECTOR] FAILED : NO SCENES"
        );

        throw new Error(
            "HISTORY DIRECTOR 결과에 Scene이 없습니다."
        );
    }

    for(
        let i = 0;
        i < scenes.length;
        i++
    ){
        const scene =
            scenes[i];

        const sceneNumber =
            i + 1;

        /*
        =================================================
        CORE SUBJECT
        =================================================

        coreSubject는 선택 필드다.

        명확한 역사적 대표 대상이 있는 경우에는
        해당 대상을 우선 보호한다.

        대표 대상이 없는 Scene에서는
        빈 문자열을 허용한다.

        coreSubject가 없다고 해서
        Scene을 실패 처리하지 않는다.
        */

        const coreSubject =
            String(
                scene?.coreSubject || ""
            ).trim();

        scene.coreSubject =
            coreSubject;

        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene?.imageQueries
            ) ||
            scene.imageQueries.length === 0
        ){
            console.error(
                `[HISTORY DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `HISTORY_DIRECTOR_SCENE_${sceneNumber}_NO_IMAGE_QUERY`
            );
        }

        const queries =
            scene.imageQueries
                .map(
                    query =>
                        String(
                            query || ""
                        ).trim()
                )
                .filter(Boolean);

        if(
            queries.length === 0
        ){
            console.error(
                `[HISTORY DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `HISTORY_DIRECTOR_SCENE_${sceneNumber}_EMPTY_IMAGE_QUERY`
            );
        }
    }

    console.log(
        `[HISTORY DIRECTOR] SCENE SAFETY PASS : ${scenes.length} SCENES`
    );

    return true;
}'''

text = replace_function(
    text,
    "validateHistorySceneSafety",
    history_function
)

history.write_text(text, encoding="utf-8")

print("[REPAIR] HISTORY validation OK")

print()
print("=====================================================")
print("VALIDATION REPAIR COMPLETE")
print("=====================================================")
print("Science : coreSubject OPTIONAL")
print("History : coreSubject OPTIONAL")
print("Animal  : unchanged")
print("Image/Video pipeline : unchanged")
print("=====================================================")
