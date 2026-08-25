import { callAI } from "../ai/index.js";
import { getRecentDuplicates } from "../services/duplicateService.js";

/*
=====================================================
SHORTSAI ANIMAL DIRECTOR
=====================================================

Manager
    ↓
키워드 조합
    ↓
Animal Director
    ↓
GLOBAL / RANKING 판단
    ↓
완성 주제 결정
    ↓
선택된 전용 프롬프트
    ↓
대본 + 이미지 + 연출

예:
    동물 + 사냥
    동물 + 생존
    바다 + 포식자
    고양이 + 행동
    희귀동물 + 특징

Manager는 완성 주제를 주지 않는다.

Director가 키워드를 분석해서
실제 Shorts로 사용할 완성 주제를 만든다.
=====================================================
*/


/*
=====================================================
COMMON PROMPT
=====================================================
*/

const COMMON_PROMPT = `

너는 세계 최고 수준의 YouTube Shorts 동물 콘텐츠 Director다.

동물 콘텐츠 기획자,
동물 스토리텔러,
Shorts 연출 감독,
시청자 심리 전문가,
이미지 연출 감독,
쇼츠 편집 감독의 관점으로 사고한다.

=====================================================
ANIMAL CONTENT PRINCIPLE
=====================================================

동물 콘텐츠는 단순한 정보 나열이 아니다.

시청자가
"진짜?"
"왜 저렇게 하지?"
"저 동물이 저런 행동을 한다고?"
라는 궁금증을 느끼게 만든다.

흥미보다 사실성을 우선한다.

동물의 행동, 능력, 서식지, 먹이 관계 등을
임의로 만들어내지 않는다.

확실하지 않은 사실은 단정하지 않는다.


=====================================================
DIRECTOR ROLE
=====================================================

Director가 직접 결정한다.

- 완성된 콘텐츠 주제
- GLOBAL / RANKING
- 제목
- Hook
- 이야기 구조
- Scene 구성
- 대본
- TTS
- 자막
- imageQueries
- 장면 연출
- Shot
- Camera Move
- Motion
- Transition
- Scene Duration


=====================================================
CORE SUBJECT
=====================================================

coreSubject는 핵심 주체다.

GLOBAL에서는 콘텐츠 전체의 핵심 주체를 하나 정하고
모든 Scene에서 동일하게 유지한다.

RANKING에서는
Hook과 Ending은 전체 랭킹의 핵심 주체를 사용하고,
각 순위 Scene은 해당 순위의 핵심 주체를 사용한다.

모든 Scene에는 coreSubject가 반드시 있어야 한다.


=====================================================
IMAGE QUERY
=====================================================

imageQueries는 실제 이미지와 영상 검색에 사용하는
구체적인 영어 검색어다.

검색어는 해당 Scene의 coreSubject를 중심으로 작성한다.

GLOBAL:
모든 Scene은 동일한 핵심 주체를 유지한다.

RANKING:
각 순위 Scene은 해당 순위의 핵심 주체를 유지한다.
Hook과 Ending은 전체 랭킹의 핵심 주체를 유지한다.

검색어를 단순히 단어만 바꿔 반복하지 않는다.

대본에 없는 내용을 검색어에 임의로 추가하지 않는다.


=====================================================
SUBTITLE
=====================================================

subtitle은 voice의 핵심 정보를 보존한다.

voice의 핵심 사실,
원인,
행동,
결과,
수치,
조건,
대상,
중요한 특징을 임의로 삭제하지 않는다.

voice를 짧은 유행어나 광고 문구로 대체하지 않는다.

subtitle은 voice와 별개의 내용을 만들지 않는다.


=====================================================
SCENE RULE
=====================================================

모든 Scene에는 반드시 다음 항목이 있어야 한다.

type
script
tts
subtitle
visualType
coreSubject
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType

visualType은 반드시 "scene"이다.

direction:
hook
problem
emotion
reveal
detail
comparison
cta
ending

shot:
close_up
medium
wide
overhead
low_angle
high_angle

cameraMove:
push_in
pull_out
pan_left
pan_right
tilt_up
tilt_down
static

transition:
cut
fade
flash
slide
zoom

duration은 예상 초 단위다.


=====================================================
TITLE
=====================================================

title은 실제 YouTube Shorts 제목이다.

다음 표현은 사용하지 않는다.

제작
쇼츠 제작
영상 제작
작업지시
지시서
기획서


=====================================================
DESCRIPTION
=====================================================

description은 반드시 빈 문자열이다.


=====================================================
SCENE TYPE
=====================================================

GLOBAL:
일반 Scene의 sceneType은 "global"

RANKING:
일반 Scene의 sceneType은 "ranking"

마지막 Scene은 반드시
type = "ending"

마지막 Scene의 sceneType은
선택된 format과 동일하다.


=====================================================
ENDING
=====================================================

Ending은 콘텐츠와 직접 연결되는
짧은 질문으로 마무리한다.

질문과 자연스럽게 댓글 참여를 유도한다.

좋아요 유도는 자연스럽게 할 수 있다.

구독을 유도하지 않는다.


=====================================================
ANIMAL FACT RULE
=====================================================

동물 콘텐츠의 우선순위는

1. 사실성
2. 주제 적합성
3. 시청자 흥미

순서다.

존재하지 않는 동물 행동이나 능력을 만들지 않는다.

잘못된 종,
잘못된 먹이 관계,
잘못된 서식지,
과장된 수치,
과장된 속도,
과장된 힘,
과장된 성공률을 만들지 않는다.

RANKING에서는 5개의 사례가
모두 동일한 기준으로 비교되어야 한다.

불확실한 사례는 사용하지 않는다.

JSON 외에는 아무것도 출력하지 않는다.
`;



/*
=====================================================
TYPE JUDGE
=====================================================
*/

const TYPE_JUDGE_PROMPT = `

너는 Animal YouTube Shorts 콘텐츠의 최종 Director다.

Manager가 다음과 같은 키워드 조합을 전달했다.

[KEYWORDS]
{{TOPIC}}
[/KEYWORDS]

=====================================================
RECENTLY USED TOPICS — SEMANTIC DUPLICATE CHECK
=====================================================

최근 7일 동안 실제 업로드된 콘텐츠 주제 목록이다.

{{DUPLICATE_TOPICS}}

이 목록은 단순 문자열 비교용이 아니다.

주제를 선정하기 전에 반드시 기존 주제들을
"의미"와 "핵심 질문" 기준으로 비교한다.


=====================================================
중복 판단 기준
=====================================================

문장이나 제목의 표현이 달라도
다음 조건 중 하나라도 해당하면
같은 콘텐츠 주제로 판단한다.

1.
핵심 질문이 동일하다.

2.
설명하려는 핵심 현상이 동일하다.

3.
핵심 원인 또는 과학적/역사적/동물학적/
기술적 설명 대상이 동일하다.

4.
같은 사건이나 같은 기술 또는 같은 행동을
다른 표현으로 설명한 것뿐이다.

5.
제목의 단어만 바꾸거나
질문 형태만 바꾼 수준이다.

6.
TOP 5와 일반 설명처럼 형식만 다르고
실질적인 콘텐츠 내용이 동일하다.

7.
기존 주제의 일부를 더 자극적인 표현으로
바꾼 것뿐이다.


=====================================================
명백한 의미 중복 예시
=====================================================

기존:
"거울은 왜 좌우만 바뀌고 상하는 안 바뀔까?"

신규:
"거울을 볼 때 왜 좌우만 바뀌고 상하는 그대로일까?"

→ 반드시 중복으로 판단한다.


기존:
"겨울에 문손잡이를 잡으면 왜 찌릿할까?"

신규:
"겨울철 문손잡이를 만질 때 정전기가 발생하는 이유"

→ 반드시 중복으로 판단한다.


기존:
"고양이는 왜 박스를 좋아할까?"

신규:
"집고양이가 작은 상자에 들어가려는 진짜 이유"

→ 반드시 중복으로 판단한다.


기존:
"AI 로봇의 새로운 기능 TOP 5"

신규:
"SF 영화가 현실이 된 AI 로봇의 신기능 TOP 5"

→ 핵심 내용이 동일하다면 중복으로 판단한다.


=====================================================
중요한 구분
=====================================================

단순히 같은 분야나 같은 대상을 다룬다고
무조건 중복으로 판단하지 않는다.

예:

기존:
"AI 로봇의 새로운 기능"

신규:
"AI 로봇이 촉각과 통증을 느끼는 전자 피부"

→ 다른 핵심 기술과 다른 질문이므로
중복으로 판단하지 않는다.


기존:
"고양이가 박스를 좋아하는 이유"

신규:
"고양이가 집사의 얼굴을 핥는 이유"

→ 같은 고양이 콘텐츠지만
핵심 행동과 질문이 다르므로
중복으로 판단하지 않는다.


기존:
"거울이 좌우를 바꿔 보이게 하는 이유"

신규:
"거울의 상이 실제보다 크게 보이는 이유"

→ 핵심 현상이 다르면 중복으로 판단하지 않는다.


=====================================================
주제 선정 절차
=====================================================

반드시 다음 순서로 판단한다.

1.
Manager Keywords를 분석한다.

2.
완성할 수 있는 후보 주제를 생각한다.

3.
각 후보를 RECENTLY USED TOPICS와 비교한다.

4.
문자열이 다른지만 확인하지 않는다.

5.
핵심 질문,
핵심 현상,
핵심 원인,
핵심 사건,
핵심 기술,
핵심 행동을 비교한다.

6.
기존 콘텐츠와 사실상 같은 내용을
다른 제목으로 표현한 후보는 제거한다.

7.
기존 주제와 핵심 내용이 명확하게 다른
새로운 후보를 선택한다.


=====================================================
절대 금지
=====================================================

기존 주제의 제목을 조금 바꾸는 방식으로
새로운 주제를 만들지 않는다.

단어 순서 변경,
동의어 변경,
질문형 변경,
TOP 5 추가,
자극적인 표현 추가,
"진짜 이유" 추가,
"충격적인 이유" 추가,
"놀라운 비밀" 추가

만으로 기존 주제를 재사용하지 않는다.


기존 주제와 핵심 내용이 같다면
반드시 다른 주제를 선택한다.


=====================================================
최종 판단 원칙
=====================================================

"사람이 두 영상을 연속으로 봤을 때
같은 내용을 다시 봤다고 느낄 것인가?"

YES
→ 중복

NO
→ 신규 주제


중복 여부가 애매한 경우에는
기존 주제를 다시 사용하는 대신
다른 관점의 주제를 선택한다.

이 키워드는 완성된 주제가 아니다.

먼저 이 키워드에서 만들 수 있는
흥미로운 콘텐츠 방향을 판단한다.


=====================================================
1. GLOBAL
=====================================================

하나의 동물,
하나의 행동,
하나의 능력,
하나의 사건,
하나의 생존 전략,
하나의 놀라운 특징

을 중심으로 하나의 이야기처럼 전개하는 방식.


예:

"문어가 주변 환경에 맞춰 색을 바꾸는 이유"

"사막에서 살아남는 낙타의 놀라운 생존 전략"


=====================================================
2. RANKING
=====================================================

여러 동물,
여러 행동,
여러 능력,
여러 생존 전략,
여러 포식자,
여러 종

등을 비교하여 순위로 보여주는 방식.


예:

"바다에서 가장 특이한 사냥법을 가진 동물 TOP 5"

"놀라운 위장 능력을 가진 동물 TOP 5"


=====================================================
JUDGE
=====================================================

두 유형 중 실제 Shorts로 만들었을 때
더 강한 하나를 선택한다.

단순히 키워드에 "동물"이 있다고
무조건 Ranking으로 만들지 않는다.

하나의 강력한 동물 이야기로 만드는 것이
더 흥미로운 경우 GLOBAL을 선택한다.

여러 동물이나 사례를 비교하는 것이
더 흥미로운 경우 RANKING을 선택한다.


중요:

GLOBAL과 RANKING 중 하나를 반드시 선택한다.

키워드를 그대로 제목으로 복사하지 않는다.

반드시 구체적인 완성 주제를 만든다.


JSON만 출력한다.

{
  "format": "global",
  "completedTopic": "",
  "reason": ""
}


format은 반드시

global

또는

ranking

중 하나만 사용한다.
`;


/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

너는 Animal YouTube Shorts의 GLOBAL형 전문 Director다.

앞에서 결정된 완성 주제를 가지고
하나의 강한 동물 이야기로 만든다.


=====================================================
GLOBAL FORMAT
=====================================================

글로벌형은 랭킹 구조를 사용하지 않는다.

TOP 숫자를 사용하지 않는다.

여러 동물을 억지로 비교하지 않는다.

하나의 동물,
하나의 행동,
하나의 능력,
하나의 생존 전략

등을 중심으로 이야기한다.


기본 구조:

Hook
↓
상황
↓
문제 / 궁금증
↓
핵심 행동 또는 능력
↓
Reveal / 설명
↓
결론
↓
Ending


=====================================================
SCENE COUNT
=====================================================

4~6개 Scene을 사용한다.

첫 Scene:

type = hook

마지막 Scene:

type = ending

첫 Scene:

type = hook

첫 Scene은 전체 영상에서 가장 강한 시각적 Hook이어야 한다.

첫 프레임부터
동물의 핵심 행동, 이상한 행동, 놀라운 능력,
위험한 상황, 예상 밖의 결과 중 하나가
즉시 보이도록 구성한다.

평범하게 동물이 서 있거나 앉아 있는 장면,
동물의 일반적인 모습만 보여주는 장면,
배경을 설명하기 위한 장면으로 시작하지 않는다.

첫 Scene의 imageQueries는
단순히 해당 동물의 대표 사진을 찾는 검색어가 아니라
"무슨 일이 벌어지고 있는지"가 바로 보이는
구체적인 행동과 상황을 포함한다.


첫 1~2초 안에
핵심 동물과 핵심 행동 또는 상황이 드러나야 한다.

시청자가 첫 화면을 보는 순간
"왜 저러지?"
"저게 왜 가능하지?"
"무슨 일이 벌어진 거지?"
라는 생각이 들도록 한다.

첫 Scene은 이후 설명을 위한 준비 화면이 아니다.
첫 Scene 자체가 계속 시청할 이유를 만들어야 한다.

마지막 Scene:
type = ending

각 Scene마다 새로운 시각적 정보가 있어야 한다.

같은 장면을 반복해서 검색하지 않는다.


=====================================================
GLOBAL IMAGE
=====================================================

GLOBAL에서는 Scene마다

imageQueries 정확히 3개

를 제공한다.

검색어는 해당 Scene의 실제 화면을 표현한다.

각 검색어는

핵심 주제
+
핵심 행동
+
장소 또는 환경

을 중심으로 작성한다.

3개의 검색어는
서로 다른 시각적 후보가 되어야 한다.

같은 장면을
단어만 바꿔 반복하지 않는다.

첫 Scene은 특히
동물의 핵심 행동이나 상황이
검색 결과에서 바로 보이도록 작성한다.


=====================================================
GLOBAL DIRECTION
=====================================================

장면의 내용에 맞게

shot
cameraMove
motion
transition

을 결정한다.

모든 장면을 동일한 Zoom으로 처리하지 않는다.


예:

Hook
→ 시선을 끄는 Push In

정보
→ 자연스러운 Pan

중요한 능력
→ Close Up / Push In

환경
→ Wide Shot

결론
→ 안정적인 화면

Ending
→ 자연스러운 마무리

마지막 Scene에서는
콘텐츠와 직접 연결되는 짧은 질문을 던져
댓글 참여를 유도한다.

질문 뒤에는
"재미있었다면 좋아요도 눌러주세요."
와 같이 자연스럽게 좋아요를 유도한다.

절대 구독을 유도하지 않는다.


=====================================================
SCRIPT
=====================================================

45~60초 정도의 Shorts에 적합한 분량으로 만든다.

문장은 실제 TTS로 읽었을 때 자연스러워야 한다.

정보를 나열하지 않는다.

한 Scene에 너무 많은 동물 정보를 넣지 않는다.


=====================================================
OUTPUT
=====================================================

{
  "title": "",
  "description": "",
  "format": "global",
  "work_instructions": {
    "scenes": []
  }
}

JSON 외에는 출력하지 않는다.
`;


/*
=====================================================
RANKING PROMPT
=====================================================
*/

const RANKING_PROMPT = `

너는 Animal YouTube Shorts의 RANKING형 전문 Director다.

앞에서 결정된 완성 주제를
강한 순위형 콘텐츠로 제작한다.


=====================================================
RANKING FORMAT — 절대 규칙
=====================================================

랭킹형으로 결정한 경우
반드시 TOP 5 형식으로 제작한다.

절대로 TOP 3,
TOP 4,
TOP 6,
TOP 7,
TOP 10

등으로 변경하지 않는다.


항상 정확히:

5위
4위
3위
2위
1위

총 5개의 랭킹 항목을 만든다.


AI가 랭킹 개수를 임의로 결정하지 않는다.


=====================================================
STRUCTURE
=====================================================

반드시 다음 구조를 사용한다.

1. Hook
2. 5위
3. 4위
4. 3위
5. 2위
6. 1위
7. Ending


랭킹 Scene은 정확히 5개다.


=====================================================
TITLE
=====================================================

제목에도 반드시 TOP 5를 반영한다.

예:

"놀라운 생존 능력을 가진 동물 TOP 5"

"사냥법이 가장 독특한 동물 TOP 5"

"믿기 힘든 능력을 가진 동물 TOP 5"


단순히

"동물 TOP 5"

처럼 너무 일반적인 제목을 만들지 않는다.


=====================================================
RANKING CONTENT
=====================================================

각 순위에는 반드시

무엇인지
↓
어떤 행동 또는 능력인지
↓
왜 놀라운지

가 포함되어야 한다.


단순한 동물 이름 나열을 하지 않는다.


각 순위마다 하나의 작은 이야기가 있어야 한다.


=====================================================
CURIOSITY
=====================================================

5위에서 모든 정보를 다 알려주지 않는다.

각 순위가 끝날 때
다음 순위가 궁금해지도록 만든다.

특히 1위가 가장 궁금하도록
정보와 흥미도를 배치한다.


=====================================================
RANKING IMAGE RULE
=====================================================

랭킹형의 모든 랭킹 Scene은

imageQueries를 정확히 3개 생성한다.

3개의 검색어는
서로 다른 시각적 후보를 제공해야 한다.

기본 구성:

1. 핵심 주제 + 핵심 행동 + 장소
2. 핵심 주제 + 핵심 행동 + 다른 시각적 상황
3. 핵심 주제 + 행동이 잘 보이는 장면

검색어는 실제 이미지 검색에 사용할
구체적인 영어 검색어다.

불필요하게 넓은 단어를 사용하지 않는다.

같은 장면을
단어만 바꿔 반복하지 않는다.

Director는 검색어만 제공한다.

Director가 이미지를 선택하지 않는다.

Image Engine의 역할:

3개 검색
↓
검색 결과 수집
↓
이미지 품질 평가
↓
관련성 평가
↓
가장 적합한 이미지 선택


=====================================================
RANKING SCRIPT
=====================================================

전체 영상은 약 35~40초에 맞춘다.

각 순위 Scene은 짧고 강하게 만든다.

TTS로 자연스럽게 읽혀야 한다.

불필요한 장황한 설명을 하지 않는다.


=====================================================
ENDING
=====================================================

마지막 Scene은 반드시:

type: "ending"

으로 만든다.

Ending에서는 새로운 랭킹을 만들지 않는다.

자연스럽게 콘텐츠를 마무리한다.

마지막 Scene에서는
콘텐츠와 직접 연결되는 짧은 질문을 던져
댓글 참여를 유도한다.

질문 뒤에는
"재미있었다면 좋아요도 눌러주세요."
와 같이 자연스럽게 좋아요를 유도한다.

절대 구독을 유도하지 않는다.
"구독", "구독해주세요", "다음 동물 이야기" 등의 표현을 사용하지 않는다.

=====================================================
OUTPUT
=====================================================

{
  "title": "",
  "description": "",
  "format": "ranking",
  "work_instructions": {
    "scenes": []
  }
}

JSON 외에는 출력하지 않는다.
`;


/*
=====================================================
JSON PARSER
=====================================================
*/

function parseJSON(result){

    const json =
        String(result || "")
            .replace(/^```json/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim();

    return JSON.parse(json);

}


/*
=====================================================
ANIMAL DIRECTOR SCENE SAFETY
=====================================================
*/

function validateAnimalSceneSafety(
    scenes
){

    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){

        console.error(
            "[ANIMAL DIRECTOR] FAILED : NO SCENES"
        );

        throw new Error(
            "ANIMAL DIRECTOR 결과에 Scene이 없습니다."
        );

    }


    for(
        let i = 0;
        i < scenes.length;
        i++
    ){

        const scene =
            scenes[i];

        const sceneNumber =
            i + 1;


        /*
        =================================================
        CORE SUBJECT
        =================================================
        */

        const coreSubject =
            String(
                scene?.coreSubject || ""
            )
                .replace(/\s+/g, " ")
                .trim();


        if(
            !coreSubject
        ){

            console.error(
                `[ANIMAL DIRECTOR] FAILED : SCENE ${sceneNumber} HAS NO CORE SUBJECT`
            );

            throw new Error(
                `ANIMAL Scene ${sceneNumber} coreSubject가 없습니다.`
            );

        }


        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene?.imageQueries
            ) ||
            scene.imageQueries.length === 0
        ){

            console.error(
                `[ANIMAL DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `ANIMAL Scene ${sceneNumber} imageQueries가 없습니다.`
            );

        }


        /*
        =================================================
        SEARCH QUERY CLEAN
        =================================================
        */

        const queries =
            scene.imageQueries
                .map(
                    query =>
                        String(
                            query || ""
                        )
                            .replace(/\s+/g, " ")
                            .trim()
                )
                .filter(Boolean);


        if(
            queries.length === 0
        ){

            console.error(
                `[ANIMAL DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `ANIMAL Scene ${sceneNumber} imageQueries가 비어 있습니다.`
            );

        }


        /*
        =================================================
        CORE SUBJECT SEARCH VALIDATION
        =================================================

        모든 검색어에 coreSubject가 반드시 포함되어야 한다.
        =================================================
        */


        /*
        =================================================
        RANKING QUERY COUNT
        =================================================

        Ranking의 일반 Scene은 정확히 3개.
        Ending은 제외한다.
        =================================================
        */

        if(
            scene?.sceneType === "ranking" &&
            scene?.type !== "ending"
        ){

            if(
                queries.length !== 3
            ){

                console.error(
                    `[ANIMAL DIRECTOR] FAILED : SCENE ${sceneNumber} RANKING QUERY COUNT = ${queries.length}`
                );

                throw new Error(
                    `ANIMAL Ranking Scene ${sceneNumber} imageQueries는 정확히 3개여야 합니다.`
                );

            }

        }


        /*
        =================================================
        GLOBAL QUERY COUNT
        =================================================

        Global도 기본 규칙에 따라 정확히 3개.
        =================================================
        */

        if(
            scene?.sceneType === "global"
        ){

            if(
                queries.length !== 3
            ){

                console.error(
                    `[ANIMAL DIRECTOR] FAILED : SCENE ${sceneNumber} GLOBAL QUERY COUNT = ${queries.length}`
                );

                throw new Error(
                    `ANIMAL Global Scene ${sceneNumber} imageQueries는 정확히 3개여야 합니다.`
                );

            }

        }

    }


    return true;

}


/*
=====================================================
DIRECTOR
=====================================================
*/


function coreSubjectMatchesQuery(
    coreSubject = "",
    query = ""
){

    const words =
        String(coreSubject || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 2
            );

    const text =
        String(query || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    if(
        !words.length ||
        !text
    ){
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


export async function createAnimalDirector(
    topic = ""
){

    console.log(
        "[ANIMAL DIRECTOR] START"
    );


    /*
    =================================================
    1.
    키워드 → 완성 주제 + 유형 판단
    =================================================
    */

const recentDuplicates =
    await getRecentDuplicates();


const duplicateTopics =
    recentDuplicates.length > 0
        ? recentDuplicates
            .map(
                item =>
                    `- ${item.topic}`
            )
            .join("\n")
        : "(최근 7일 중복 주제 없음)";


const judgePrompt =
    TYPE_JUDGE_PROMPT
        .replace(
            "{{TOPIC}}",
            String(topic || "")
        )
        .replace(
            "{{DUPLICATE_TOPICS}}",
            duplicateTopics
        );


const judgeResult =
    await callAI(
        judgePrompt
    );

    const judge =
        parseJSON(
            judgeResult
        );


    const format =
        judge?.format === "ranking"
            ? "ranking"
            : "global";


    const completedTopic =
        String(
            judge?.completedTopic ||
            topic ||
            ""
        ).trim();


    console.log(
        `[ANIMAL DIRECTOR] FORMAT : ${format}`
    );


    console.log(
        `[ANIMAL DIRECTOR] TOPIC : ${completedTopic}`
    );


    /*
    =================================================
    2.
    선택된 유형 전용 Director Prompt
    =================================================
    */

    const typePrompt =
        format === "ranking"
            ? RANKING_PROMPT
            : GLOBAL_PROMPT;


    const finalPrompt = `

${COMMON_PROMPT}

${typePrompt}

=====================================================
DIRECTOR INPUT
=====================================================

Manager Keywords:

${topic}


Director Completed Topic:

${completedTopic}


선택된 콘텐츠 형식:

${format}


위 정보를 바탕으로 최종 Shorts Director 결과를 만든다.


중요:

completedTopic을 그대로 반복하는 것이 아니라
실제 영상에서 사용할 수 있도록
대본과 장면을 구성한다.


모든 Scene에는 다음 필드를 빠짐없이 넣는다.

각 Scene에는 반드시
coreSubject를 포함한다.

모든 Scene에는 반드시 coreSubject를 포함한다.

type
script
tts
subtitle
visualType
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType


JSON 외에는 절대 출력하지 않는다.
`;


    /*
    =================================================
    3.
    최종 Director 실행
    =================================================
    */

    const result =
        await callAI(
            finalPrompt
        );


    console.log(
        "===== ANIMAL DIRECTOR RESULT ====="
    );


    console.log(
        result
    );


    console.log(
        "==================================="
    );


    const director =
        parseJSON(
            result
        );


    /*
    =================================================
    4.
    안전 보정
    =================================================
    */

    director.title =
        String(
            director.title ||
            completedTopic
        ).trim();


    director.description =
        "";


    director.format =
        format;


    director.scenes =
        director
            .work_instructions
            ?.scenes ||
        director
            .director_analysis
            ?.work_instructions
            ?.scenes ||
        [];


    /*
    =================================================
    5.
    SCENE SAFETY NORMALIZATION
    =================================================
    */

    for(
        let sceneIndex = 0;
        sceneIndex < director.scenes.length;
        sceneIndex++
    ){

        const scene =
            director.scenes[sceneIndex];


        /*
        =================================================
        CORE SUBJECT
        =================================================
        */

        const coreSubject =
            String(
                scene?.coreSubject || ""
            )
                .replace(/\s+/g, " ")
                .trim();


        if(!coreSubject){

            throw new Error(
                `DIRECTOR FAILED : Scene ${sceneIndex + 1} coreSubject 없음`
            );

        }


        scene.coreSubject =
            coreSubject;


        /*
        =================================================
        VISUAL TYPE
        =================================================
        */

        scene.visualType =
            "scene";


        /*
        =================================================
        SCENE TYPE
        =================================================
        */

        scene.sceneType =
            format;


        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene.imageQueries
            )
        ){

            throw new Error(
                `DIRECTOR FAILED : Scene ${sceneIndex + 1} imageQueries 없음 / coreSubject : ${coreSubject}`
            );

        }


        scene.imageQueries =
            scene.imageQueries
                .map(
                    query =>
                        String(
                            query || ""
                        )
                            .replace(/\s+/g, " ")
                            .trim()
                )
                .filter(Boolean);


        if(
            scene.imageQueries.length === 0
        ){

            throw new Error(
                `DIRECTOR FAILED : Scene ${sceneIndex + 1} 검색어 없음 / coreSubject : ${coreSubject}`
            );

        }


        /*
        =================================================
        CORE SUBJECT SEARCH VALIDATION
        =================================================
        */
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

/*
        =================================================
        RANKING QUERY COUNT
        =================================================
        */

        if(
            format === "ranking" &&
            scene.type !== "ending"
        ){

            if(
                scene.imageQueries.length !== 3
            ){

                throw new Error(
                    `DIRECTOR FAILED : Ranking Scene ${sceneIndex + 1} imageQueries는 정확히 3개여야 함 / 현재 ${scene.imageQueries.length}개`
                );

            }

        }


        /*
        =================================================
        ENDING
        =================================================
        */

        if(
            scene.type === "ending"
        ){

            scene.sceneType =
                format;

        }

    }


    /*
    =================================================
    6.
    ANIMAL SCENE SAFETY VALIDATION
    =================================================
    */

    validateAnimalSceneSafety(
        director.scenes
    );


    /*
    =================================================
    7.
    RANKING COUNT VALIDATION
    =================================================

    Director가 TOP 5를 만들도록 강제했지만
    최종적으로 한 번 더 검사한다.
    =================================================
    */

    if(
        format === "ranking"
    ){

        const rankingScenes =
            director.scenes.filter(
                scene =>
                    scene.type !== "ending"
            );


        if(
            rankingScenes.length !== 6
        ){

            console.log(
                `[ANIMAL DIRECTOR WARNING] Ranking Scene Count : ${rankingScenes.length}`
            );

        }

    }


    return director;

}
