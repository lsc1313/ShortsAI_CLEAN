from pathlib import Path
from datetime import datetime
import shutil
import re

TARGET = Path("modules/ai/reviewerAI.js")

if not TARGET.exists():
    raise SystemExit(f"ERROR: {TARGET} not found")

text = TARGET.read_text(encoding="utf-8")

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = TARGET.with_name(
    f"reviewerAI.js.backup_before_core_subject_policy_{stamp}"
)
shutil.copy2(TARGET, backup)

print(f"[BACKUP] {backup}")

print()
print("========== coreSubjectMatches ==========")

m = re.search(
    r"function\s+coreSubjectMatches\s*\([^)]*\)\s*\{",
    text
)

if not m:
    print("ERROR: coreSubjectMatches function not found")
    print("BACKUP CREATED ONLY")
    raise SystemExit(1)

start = m.start()
brace = text.find("{", m.start())

depth = 0
end = None

for i in range(brace, len(text)):
    if text[i] == "{":
        depth += 1
    elif text[i] == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end is None:
    print("ERROR: coreSubjectMatches closing brace not found")
    print("BACKUP CREATED ONLY")
    raise SystemExit(1)

old_func = text[start:end]

print(old_func)

print()
print("========== POLICY ==========")
print("Animal  : STRICT")
print("AI      : ADVISORY")
print("Science : ADVISORY")
print("History : ADVISORY")
print()

new_func = r'''
function coreSubjectMatches(
    coreSubject = "",
    query = "",
    options = {}
){

    const subject =
        String(coreSubject || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    const text =
        String(query || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    const channel =
        String(
            options?.channel ||
            options?.category ||
            ""
        )
        .toLowerCase()
        .trim();

    /*
    =====================================================
    CORE SUBJECT POLICY

    Animal:
        coreSubject is mandatory.
        Subject mismatch may reject.

    AI / Science / History:
        coreSubject is advisory.
        Scene meaning is evaluated separately.
        coreSubject mismatch alone must NOT reject.

    =====================================================
    */

    if(
        channel === "animal"
    ){

        if(
            !subject ||
            !text
        ){
            return false;
        }

        const words =
            subject
                .split(/\s+/)
                .filter(
                    word =>
                        word.length > 2
                );

        if(!words.length){
            return false;
        }

        let matched = 0;

        for(
            const word of words
        ){

            if(
                text.includes(word)
            ){
                matched++;
            }

        }

        const required =
            words.length <= 3
                ? words.length
                : 2;

        return matched >= required;
    }

    /*
    Non-Animal:
    coreSubject is NOT a hard rejection condition.

    The reviewer must judge the complete Scene meaning.
    */

    return true;
}
'''

text = text[:start] + new_func.strip() + text[end:]

TARGET.write_text(text, encoding="utf-8")

print()
print("=====================================================")
print("REVIEWER CORE SUBJECT POLICY PATCH")
print("=====================================================")
print("Animal  : STRICT")
print("AI      : OPTIONAL / ADVISORY")
print("Science : OPTIONAL / ADVISORY")
print("History : OPTIONAL / ADVISORY")
print("Image/Video search : NOT MODIFIED")
print("=====================================================")
print()
print("[IMPORTANT]")
print("This patch changes only coreSubject hard rejection.")
print("It does NOT change image/video search.")
