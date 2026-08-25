from pathlib import Path
import shutil
from datetime import datetime

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

files = [
    Path("modules/science/director.js"),
    Path("modules/history/director.js"),
]

for path in files:
    text = path.read_text(encoding="utf-8")

    backup = path.with_name(
        path.name + f".backup_before_core_subject_cleanup_{stamp}"
    )
    shutil.copy2(path, backup)
    print(f"[BACKUP] {backup}")

    marker = "scene.coreSubject = coreSubject; HAS NO CORE SUBJECT`"

    if marker not in text:
        raise RuntimeError(
            f"{path}: corrupted coreSubject block not found"
        )

    start = text.index("scene.coreSubject = coreSubject; HAS NO CORE SUBJECT`")

    # 이 위치부터 기존 실패 블록의 마지막 throw 종료까지 제거
    end_marker = ");"
    end = text.index(end_marker, start) + len(end_marker)

    text = text[:start] + "scene.coreSubject = coreSubject;" + text[end:]

    path.write_text(text, encoding="utf-8")

    print(f"[CLEANUP] {path} OK")

print()
print("CORE SUBJECT VALIDATION CLEANUP COMPLETE")
