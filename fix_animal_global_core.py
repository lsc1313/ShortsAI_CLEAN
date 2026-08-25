from pathlib import Path
from datetime import datetime
import shutil

path = Path("modules/animal/director.js")
text = path.read_text()

start = text.index("        CORE SUBJECT SEARCH VALIDATION", text.index("scene.imageQueries.length === 0"))
end = text.index("        /*", start + 10)

old = text[start:end]

new = """        CORE SUBJECT SEARCH VALIDATION
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

text = text[:start] + new + text[end:]

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = path.with_name(
    f"director.js.backup_before_global_core_subject_{timestamp}"
)

shutil.copy2(path, backup)
path.write_text(text)

print(f"[BACKUP] {backup}")
print("[PATCH] Animal GLOBAL coreSubject query validation : REMOVED")
print("[PATCH] Animal RANKING coreSubject query validation : KEPT")
print("[PATCH] Image/Video search : NOT MODIFIED")
