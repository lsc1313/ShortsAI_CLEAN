from pathlib import Path
from datetime import datetime
import shutil
import re

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

FILES = [
    Path("modules/science/director.js"),
    Path("modules/history/director.js"),
]

def backup(path):
    out = path.with_name(
        path.name + f".backup_before_core_subject_optional_v2_{stamp}"
    )
    shutil.copy2(path, out)
    print(f"[BACKUP] {out}")

def patch_prompt(text, director):
    # 제목 변경
    text = text.replace(
        "CORE SUBJECT — ABSOLUTE RULE",
        "CORE SUBJECT — OPTIONAL VISUAL PRIORITY RULE"
    )

    if director == "science":

        text = text.replace(
            "모든 Scene에는 반드시 해당 Scene의\n핵심 시각 대상을 나타내는 coreSubject가 있어야 한다.",
            "coreSubject는 모든 Scene에 반드시 존재해야 하는 필드가 아니다.\n\n"
            "Scene에 명확한 대표 대상 또는 핵심 주체가 있는 경우에는\n"
            "그 대상을 coreSubject로 지정한다.\n\n"
            "coreSubject는 해당 Scene에서 시각적으로 우선 보호해야 하는\n"
            "대표 대상 또는 핵심 주체다.\n\n"
            "반대로 Scene의 핵심이 특정 하나의 대상이 아니라\n"
            "장소, 배경, 환경, 행동, 현상, 과정, 장치, 상황 자체인 경우에는\n"
            "coreSubject를 빈 문자열로 둔다.\n\n"
            "coreSubject가 없다고 해서 Scene을 실패 처리하지 않는다.\n\n"
            "coreSubject가 있는 경우에는 imageQueries와 video 검색에서\n"
            "해당 coreSubject를 우선적으로 보호한다."
        )

        text = text.replace(
            "coreSubject가 없는 Scene은 실패다.",
            "coreSubject가 없는 Scene은 정상적으로 허용한다."
        )

        text = text.replace(
            "모든 imageQueries에는 해당 Scene의\ncoreSubject가 명확하게 포함되어야 한다.",
            "coreSubject가 존재하는 Scene의 imageQueries는\n"
            "해당 coreSubject를 시각적으로 명확하게 표현해야 한다.\n\n"
            "단, coreSubject가 빈 문자열인 Scene에서는\n"
            "Scene의 script와 visual meaning을 기준으로\n"
            "장소, 배경, 환경, 행동, 현상, 과정, 장치, 상황 등의\n"
            "구체적인 검색어를 작성한다."
        )

    elif director == "history":

        text = text.replace(
            "모든 Scene은 반드시 하나의 명확한",
            "coreSubject는 모든 Scene에 반드시 존재해야 하는 필드가 아니다.\n\n"
            "Scene에 명확한 대표 역사적 대상, 인물, 집단 또는 사건이 있는 경우에는\n"
            "그 대상을 coreSubject로 지정한다.\n\n"
            "coreSubject는 해당 Scene에서 화면으로 우선 보호해야 하는\n"
            "대표 시각 대상이다.\n\n"
            "반대로 Scene의 핵심이 특정 하나의 역사적 주체가 아니라\n"
            "장소, 건축물, 배경, 환경, 행동, 사건의 분위기,\n"
            "전투 현장, 행렬, 시장, 궁궐 내부 등의 시각적 상황인 경우에는\n"
            "coreSubject를 빈 문자열로 둔다.\n\n"
            "coreSubject가 없다고 해서 Scene을 실패 처리하지 않는다.\n\n"
            "모든 Scene은 반드시 하나의 명확한",
            1
        )

        text = text.replace(
            "coreSubject가 없는 Scene은 실패다.",
            "coreSubject가 없는 Scene은 정상적으로 허용한다."
        )

    return text


def patch_validation(text, director):

    # ------------------------------------------------------------
    # 공통: coreSubject 강제 validation block 제거
    # ------------------------------------------------------------

    pattern = re.compile(
        r"""
        (?P<indent>\s*)
        /\*
        \s*
        coreSubject
        [^*]*?
        \*/
        \s*
        const\s+coreSubject\s*=\s*
        String\s*\(
        \s*scene\?\.coreSubject\s*\|\|\s*""
        \s*
        \)\.trim\(\)\s*;
        \s*
        if\s*\(\s*!\s*coreSubject\s*\)\s*
        \{
        .*?
        \}
        """,
        re.VERBOSE | re.DOTALL
    )

    matches = list(pattern.finditer(text))

    if not matches:
        raise RuntimeError(
            f"{director.upper()} validation coreSubject block not found"
        )

    if len(matches) > 1:
        print(
            f"[WARNING] {director.upper()} coreSubject blocks found: {len(matches)}"
        )

    def repl(m):
        indent = m.group("indent")
        return (
            f'{indent}/*\n'
            f'{indent}coreSubject는 선택 필드다.\n'
            f'{indent}존재하면 문자열로 정리하고,\n'
            f'{indent}없으면 빈 문자열로 허용한다.\n'
            f'{indent}*/\n'
            f'{indent}const coreSubject =\n'
            f'{indent}    String(\n'
            f'{indent}        scene?.coreSubject || ""\n'
            f'{indent}    ).trim();\n'
            f'{indent}scene.coreSubject = coreSubject;'
        )

    text = pattern.sub(repl, text, count=1)

    # ------------------------------------------------------------
    # History의 추가 강제 검사 제거
    # ------------------------------------------------------------

    if director == "history":

        text = re.sub(
            r"""
            /\*
            \s*
            모든\s+imageQuery에
            .*?
            coreSubject가\s+반드시\s+포함되어야\s+한다
            .*?
            \*/
            """,
            """
        /*
        coreSubject가 존재하는 경우
        imageQueries는 coreSubject의 역사적 정체성과 의미를 우선 보호한다.

        coreSubject가 없는 경우에는
        Scene의 장소, 배경, 환경, 행동, 사건, 상황을 기준으로 검색한다.
        */
            """,
            text,
            count=1,
            flags=re.VERBOSE | re.DOTALL
        )

    return text


for path in FILES:

    print()
    print(f"========== {path} ==========")

    original = path.read_text(encoding="utf-8")

    backup(path)

    text = original

    if "science" in str(path):
        director = "science"
    else:
        director = "history"

    text = patch_prompt(text, director)
    text = patch_validation(text, director)

    if text == original:
        raise RuntimeError(
            f"{director.upper()}: NOTHING CHANGED"
        )

    path.write_text(text, encoding="utf-8")

    print(f"[PATCH] {director.upper()} OK")


print()
print("=====================================================")
print("CORE SUBJECT POLICY PATCH COMPLETE")
print("=====================================================")
print("Science : OPTIONAL")
print("History : OPTIONAL")
print("Animal  : NOT MODIFIED")
print("AI      : NOT MODIFIED")
print("Image/Video pipeline : NOT MODIFIED")
print("=====================================================")
