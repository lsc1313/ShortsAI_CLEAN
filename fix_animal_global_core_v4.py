from pathlib import Path
from datetime import datetime
import shutil

path = Path("modules/animal/director.js")
text = path.read_text()

backup = path.with_name(
    f"director.js.backup_before_global_core_subject_v4_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
)
shutil.copy2(path, backup)

marker = "        /*                                                             =================================================              RANKING QUERY COUNT"

pos = text.rfind(marker)

if pos == -1:
    raise RuntimeError("GLOBAL RANKING QUERY COUNT marker not found")

before = text[:pos]

start = before.rfind("        const normalizedSubject =")
if start == -1:
    raise RuntimeError("GLOBAL normalizedSubject block start not found")

block = before[start:]

if "DIRECTOR FAILED : Scene ${sceneIndex + 1} 검색어에 coreSubject 없음" not in block:
    raise RuntimeError("GLOBAL coreSubject rejection block not found")

text = text[:start] + """        /*
        =================================================
        GLOBAL CORE SUBJECT QUERY POLICY
        =================================================

        GLOBAL에서는 대표 coreSubject를
        전체 콘텐츠의 대표 주제로 사용한다.

        Scene별 imageQueries에
        coreSubject 문자열을 강제하지 않는다.

        각 Scene의 imageQueries는
        해당 Scene의 실제 시각적 내용에 맞게 작성한다.
        =================================================
        */
""" + text[pos:]

path.write_text(text)

print("=====================================================")
print("[BACKUP]", backup)
print("[PATCH] Animal GLOBAL coreSubject query hard validation : REMOVED")
print("[PATCH] Animal GLOBAL imageQueries : FREE")
print("[PATCH] Animal RANKING query count : KEPT")
print("[PATCH] Image/Video search : NOT MODIFIED")
print("=====================================================")
