from pathlib import Path
from datetime import datetime
import shutil
import re

path = Path("modules/animal/director.js")
text = path.read_text()

pattern = re.compile(
    r'(?s)'
    r'(\s*const\s+normalizedSubject\s*=\s*'
    r'coreSubject\.toLowerCase\(\)\s*;.*?'
    r'\s*)(?=/\*\s*=+\s*RANKING QUERY COUNT)'
)

matches = list(pattern.finditer(text))

if len(matches) != 1:
    raise RuntimeError(
        f"GLOBAL coreSubject validation block expected 1 occurrence, found {len(matches)}"
    )

block = matches[0].group(0)

if "검색어에 coreSubject 없음" not in block:
    raise RuntimeError(
        "Matched block does not contain GLOBAL coreSubject rejection"
    )

backup = path.with_name(
    f"director.js.backup_before_global_core_subject_v5_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
)
shutil.copy2(path, backup)

replacement = """
        /*
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

"""

text = text[:matches[0].start()] + replacement + text[matches[0].end():]

path.write_text(text)

print("=====================================================")
print("[BACKUP]", backup)
print("[PATCH] Animal GLOBAL coreSubject query hard validation : REMOVED")
print("[PATCH] Animal GLOBAL imageQueries : FREE")
print("[PATCH] Animal RANKING query count : KEPT")
print("[PATCH] Image/Video search : NOT MODIFIED")
print("=====================================================")
