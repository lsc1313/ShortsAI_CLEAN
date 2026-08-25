from pathlib import Path
from datetime import datetime
import shutil

target = Path("modules/ai/reviewerAI.js")

text = target.read_text(encoding="utf-8")

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = target.with_name(
    f"reviewerAI.js.backup_before_remove_core_reject_{stamp}"
)

shutil.copy2(target, backup)

start_marker = """    if(
        coreSubject
    ){

        const subjectMatched =
            coreSubjectMatches("""
end_marker = """        }
    }
"""

start = text.find(start_marker)

if start == -1:
    raise RuntimeError(
        "CORE SUBJECT REJECT BLOCK START NOT FOUND"
    )

# 정확히 해당 if 블록의 중괄호 구조를 찾아 끝까지 제거
brace_start = text.find("{", start)

depth = 0
end = None

for i in range(brace_start, len(text)):
    if text[i] == "{":
        depth += 1
    elif text[i] == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end is None:
    raise RuntimeError(
        "CORE SUBJECT REJECT BLOCK END NOT FOUND"
    )

block = text[start:end]

if "Reject : Core Subject" not in block:
    raise RuntimeError(
        "TARGET BLOCK DOES NOT CONTAIN CORE SUBJECT REJECT"
    )

text = text[:start] + text[end:]

target.write_text(text, encoding="utf-8")

print("=====================================================")
print("REVIEWER CORE SUBJECT REJECT REMOVED")
print("=====================================================")
print(f"[BACKUP] {backup}")
print("[PATCH] AI / SCIENCE / HISTORY coreSubject hard reject : REMOVED")
print("[PATCH] Image/Video search : NOT MODIFIED")
print("[PATCH] Keyword Reviewer : NOT MODIFIED")
print("=====================================================")
