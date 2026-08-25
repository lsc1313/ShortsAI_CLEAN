from pathlib import Path
import shutil

path = Path("modules/animal/director.js")
backup = Path("modules/animal/director.js.backup_before_global_core_subject_20260818_232611")

if not backup.exists():
    raise RuntimeError(f"BACKUP NOT FOUND: {backup}")

shutil.copy2(backup, path)
print("[RESTORE] Animal Director restored from backup")

text = path.read_text()

marker = """        const normalizedSubject =
            coreSubject.toLowerCase();

        for(
            const query of scene.imageQueries
        ){

            const normalizedQuery =
                query.toLowerCase();

            if(
                !normalizedQuery.includes(
                    normalizedSubject
                )
            ){

                throw new Error(
                    `DIRECTOR FAILED : Scene ${sceneIndex + 1} 검색어에 coreSubject 없음 / ${coreSubject} / ${query}`
                );

            }

        }
"""

count = text.count(marker)

if count != 1:
    raise RuntimeError(
        f"ACTUAL GLOBAL CORE VALIDATION expected 1 occurrence, found {count}"
    )

replacement = """        /*
        =================================================
        CORE SUBJECT SEARCH VALIDATION
        =================================================
        GLOBAL:
        대표 coreSubject는 전체 콘텐츠의 대표 주제다.
        Scene별 검색어에 coreSubject 문자열을 강제하지 않는다.

        RANKING:
        Scene별 coreSubject와 검색어의 연결을 검증한다.
        =================================================
        */

        if(
            format === "ranking" &&
            coreSubject
        ){

            const normalizedSubject =
                coreSubject.toLowerCase();

            for(
                const query of scene.imageQueries
            ){

                const normalizedQuery =
                    query.toLowerCase();

                if(
                    !normalizedQuery.includes(
                        normalizedSubject
                    )
                ){

                    throw new Error(
                        `DIRECTOR FAILED : Scene ${sceneIndex + 1} 검색어에 coreSubject 없음 / ${coreSubject} / ${query}`
                    );

                }

            }

        }

"""

text = text.replace(marker, replacement, 1)

path.write_text(text)

print("[PATCH] Animal GLOBAL coreSubject query hard validation : REMOVED")
print("[PATCH] Animal RANKING coreSubject query validation : KEPT")
print("[PATCH] Image/Video search : NOT MODIFIED")
print("=====================================================")
