from pathlib import Path
from datetime import datetime
import shutil

path = Path("modules/animal/director.js")
text = path.read_text()

backup = path.with_name(
    f"director.js.backup_before_global_core_subject_v3_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
)
shutil.copy2(path, backup)

start_marker = """        const normalizedSubject =
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

if text.count(start_marker) != 1:
    raise RuntimeError(
        f"GLOBAL CORE VALIDATION BLOCK expected 1 occurrence, found {text.count(start_marker)}"
    )

text = text.replace(start_marker, """        /*
        GLOBAL:
        대표 coreSubject는 전체 콘텐츠의 대표 주제다.

        Scene별 imageQueries에
        coreSubject 문자열을 강제하지 않는다.

        Scene별 검색어는 각 Scene의 실제 시각적 내용을
        기준으로 자유롭게 구성한다.
        */
""", 1)

path.write_text(text)

print("=====================================================")
print("[BACKUP]", backup)
print("[PATCH] Animal GLOBAL coreSubject query hard validation : REMOVED")
print("[PATCH] Animal GLOBAL imageQueries : FREE")
print("[PATCH] Animal RANKING query count : KEPT")
print("[PATCH] Image/Video search : NOT MODIFIED")
print("=====================================================")
