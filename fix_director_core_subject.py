from pathlib import Path
import shutil
import re
from datetime import datetime

ROOT = Path(".")

FILES = [
    ROOT / "modules/science/director.js",
    ROOT / "modules/history/director.js",
]

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

def backup(path):
    backup_path = path.with_name(
        path.name + f".backup_before_core_subject_optional_{stamp}"
    )
    shutil.copy2(path, backup_path)
    print(f"[BACKUP] {path} -> {backup_path}")
    return backup_path


def replace_required(text, old, new, label, path):
    count = text.count(old)

    if count == 0:
        raise RuntimeError(
            f"[ABORT] {path}: expected text not found: {label}"
        )

    text = text.replace(old, new)
    print(f"[OK] {path}: {label} ({count})")
    return text


def remove_required_core_subject_failure(text, path, director_name):
    pattern = re.compile(
        r"""
        (?P<indent>[ \t]*)
        const\s+coreSubject\s*=\s*
        String\s*\(
            scene\?\.coreSubject\s*\|\|\s*""
        \)\.trim\(\)\s*;

        \s*

        (?P=indent)
        if\s*\(\s*
            !coreSubject
        \s*\)\s*\{
            .*?
            \[
                """ + re.escape(director_name) + r"""\s+DIRECTOR\]\s+FAILED\s*:\s*
                SCENE\s+\$\{sceneNumber\}\s+HAS\s+NO\s+CORE\s+SUBJECT
            .*?
        (?P=indent)\}
        """,
        re.S | re.X,
    )

    match = pattern.search(text)

    if not match:
        raise RuntimeError(
            f"[ABORT] {path}: mandatory coreSubject failure block not found"
        )

    # coreSubject 자체는 이후 validation에서 필요할 수 있으므로
    # 선언은 유지하고 실패 처리만 제거한다.
    block = match.group(0)

    replacement = re.sub(
        r"""
        (?P<indent>[ \t]*)
        if\s*\(\s*
            !coreSubject
        \s*\)\s*\{
            .*?
        (?P=indent)\}
        """,
        "",
        block,
        flags=re.S | re.X,
    )

    text = text[:match.start()] + replacement + text[match.end():]

    print(
        f"[OK] {path}: {director_name} coreSubject mandatory failure removed"
    )

    return text


def make_core_subject_optional_match(text, path):
    old = """    if(
        !words.length ||
        !text
    ){
        return false;
    }"""

    new = """    if(
        !text
    ){
        return false;
    }

    if(
        !words.length
    ){
        return true;
    }"""

    if old not in text:
        raise RuntimeError(
            f"[ABORT] {path}: coreSubjectMatchesQuery empty-coreSubject guard not found"
        )

    text = text.replace(old, new, 1)

    print(
        f"[OK] {path}: coreSubjectMatchesQuery() now allows empty coreSubject"
    )

    return text


def process_science(path):
    text = path.read_text()

    # Prompt contract
    text = replace_required(
        text,
        "핵심 시각 대상을 나타내는 coreSubject가 있어야 한다.",
        "명확한 핵심 시각 대상이 있는 경우 coreSubject를 지정한다. "
        "명확한 핵심 시각 대상이 없는 경우 coreSubject는 빈 문자열로 둔다.",
        "science coreSubject definition",
        path,
    )

    text = replace_required(
        text,
        "coreSubject가 없는 Scene은 실패다.",
        "coreSubject가 없는 Scene도 실패하지 않는다. "
        "이 경우 장소, 배경, 환경, 행동, 현상, 과정, 장치, 상황 등 "
        "Scene의 시각적 의미를 기준으로 검색한다.",
        "science no-coreSubject rule",
        path,
    )

    text = replace_required(
        text,
        "coreSubject와 전혀 관계없는 imageQueries는 실패다.",
        "coreSubject가 존재하는 경우에만 coreSubject와 전혀 관계없는 "
        "imageQueries를 실패 처리한다. coreSubject가 없는 Scene은 "
        "Scene의 시각적 의미를 기준으로 imageQueries를 판단한다.",
        "science imageQuery rule",
        path,
    )

    text = replace_required(
        text,
        "coreSubject 필수",
        "coreSubject 선택",
        "science safety label",
        path,
    )

    # Safety: coreSubject가 없다고 Director 전체를 실패시키지 않는다.
    text = remove_required_core_subject_failure(
        text,
        path,
        "SCIENCE",
    )

    # Reviewer/search matching:
    # coreSubject가 없으면 false가 아니라 true.
    text = make_core_subject_optional_match(text, path)

    path.write_text(text)
    print(f"[DONE] {path}")


def process_history(path):
    text = path.read_text()

    replacements = [
        (
            "coreSubject를 가져야 한다.",
            "명확한 대표 주제가 있는 Scene에서는 coreSubject를 지정한다. "
            "대표 주제가 없는 Scene에서는 coreSubject를 빈 문자열로 둘 수 있다.",
            "history coreSubject definition",
        ),
        (
            "coreSubject가 없는 Scene은 실패다.",
            "coreSubject가 없는 Scene도 실패하지 않는다. "
            "이 경우 장소, 배경, 환경, 행동, 현상, 과정, 시대, 상황 등 "
            "Scene의 시각적 의미를 기준으로 검색한다.",
            "history no-coreSubject rule",
        ),
    ]

    for old, new, label in replacements:
        text = replace_required(
            text,
            old,
            new,
            label,
            path,
        )

    # History may contain several mandatory phrases.
    optional_phrases = [
        (
            "coreSubject가 없거나 불명확한 Scene을",
            "coreSubject가 없거나 불명확한 Scene도",
            "history ambiguous subject rule",
        ),
        (
            "해당 Scene의 coreSubject가 반드시 포함되어야 한다.",
            "coreSubject가 존재하는 Scene에서는 해당 Scene의 coreSubject가 "
            "검색어에 우선 반영되어야 한다.",
            "history query subject rule",
        ),
        (
            "imageQuery에 coreSubject의",
            "imageQuery에는 coreSubject가 존재하는 경우 해당 coreSubject의",
            "history query wording",
        ),
    ]

    for old, new, label in optional_phrases:
        if old in text:
            text = text.replace(old, new)
            print(f"[OK] {path}: {label}")
        else:
            print(f"[SKIP] {path}: optional text not found: {label}")

    # Safety: coreSubject 필수 문구가 있다면 선택으로 변경.
    text = text.replace(
        "coreSubject 필수",
        "coreSubject 선택",
    )

    # Safety mandatory failure.
    text = remove_required_core_subject_failure(
        text,
        path,
        "HISTORY",
    )

    # coreSubject matching:
    # coreSubject가 없으면 검색어 자체를 허용.
    text = make_core_subject_optional_match(text, path)

    path.write_text(text)
    print(f"[DONE] {path}")


print("=" * 70)
print("ShortsAI_CLEAN Director coreSubject optionalization")
print("=" * 70)

for path in FILES:
    if not path.exists():
        raise RuntimeError(f"[ABORT] File not found: {path}")

print()
print("[1] Creating backups")
for path in FILES:
    backup(path)

print()
print("[2] Modifying Science Director")
process_science(FILES[0])

print()
print("[3] Modifying History Director")
process_history(FILES[1])

print()
print("=" * 70)
print("ALL MODIFICATIONS COMPLETED")
print("=" * 70)
print()
print("Animal Director was NOT modified.")
print("AI Director was NOT modified.")
