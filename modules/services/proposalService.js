/*
    =========================================================
    PROPOSAL SERVICE

    역할

    1. Trend → Channel 후보 변환
    2. Trend 부족분 → 일반 주제 조합 생성

    중요

    - AI 호출 없음
    - 쇼츠 제목 생성 안 함
    - 완성 문장 생성 안 함
    - Create AI에게 넘길 "주제 소재"만 생성
    =========================================================
*/


/*
    =========================================================
    CHANNEL SUBJECT POOLS

    subject
        무엇에 대한 영상인가

    angle
        어떤 관점으로 다룰 것인가

    두 요소를 조합해서
    일반 주제 후보를 만든다.
    =========================================================
*/

const GENERAL_POOLS = {


    /*
        HISTORY
    */

    history: {

        subjects: [

            "조선",
            "고려",
            "고구려",
            "백제",
            "신라",
            "삼국시대",
            "대한제국",
            "한국사",
            "세계사",

            "고대 이집트",
            "로마 제국",
            "몽골 제국",
            "오스만 제국",
            "중세 유럽",
            "고대 그리스",

            "세계대전",
            "고대 문명",
            "사라진 문명",
            "역사 인물",
            "왕과 황제",
            "역사적 전쟁",
            "고대 유적",
            "역사 미스터리"

        ],

        angles: [

            "생활",
            "음식",
            "전쟁",
            "무기",
            "왕실",
            "직업",
            "기술",
            "문화",
            "법과 처벌",
            "경제",
            "군대",
            "의학",
            "교육",
            "발명",
            "미스터리",
            "실화",
            "기록",
            "사건",
            "비밀",
            "의외의 사실"

        ]

    },


    /*
        ANIMAL
    */

    animal: {

        subjects: [

            "강아지",
            "고양이",
            "사자",
            "호랑이",
            "늑대",
            "곰",
            "코끼리",
            "기린",
            "판다",
            "원숭이",

            "돌고래",
            "고래",
            "상어",
            "문어",
            "해파리",
            "심해 생물",

            "독수리",
            "올빼미",
            "앵무새",

            "악어",
            "뱀",
            "도마뱀",

            "사슴벌레",
            "장수풍뎅이",
            "개미",
            "벌",
            "거미",

            "피그미다람쥐",
            "희귀동물",
            "멸종위기 동물",
            "야생동물"

        ],

        angles: [

            "행동",
            "습성",
            "지능",
            "사냥",
            "생존",
            "먹이",
            "번식",
            "수면",
            "의사소통",
            "사회생활",

            "감각",
            "속도",
            "힘",
            "방어",
            "공격",

            "천적",
            "서식지",
            "진화",
            "신체 능력",
            "특이한 능력",

            "인간과의 관계",
            "반려",
            "오해",
            "신기한 사실",
            "의외의 행동"

        ]

    },


    /*
        AI
    */

    ai: {

        subjects: [

            "ChatGPT",
            "Gemini",
            "OpenAI",
            "생성형 AI",
            "AI 에이전트",
            "AI 로봇",
            "AI 검색",
            "AI 이미지",
            "AI 영상",
            "AI 음성",

            "AI 코딩",
            "AI 스마트폰",
            "AI 자동차",
            "AI 업무자동화",
            "AI 교육",
            "AI 의료",
            "AI 산업",
            "AI 직업",
            "AI 기술",
            "AI 미래",

            "인공지능",
            "대형언어모델",
            "AI 비서",
            "AI 콘텐츠",
            "AI 자동화"

        ],

        angles: [

            "기능",
            "활용",
            "업무",
            "자동화",
            "생산성",

            "비교",
            "변화",
            "미래",
            "직업",
            "산업",

            "장점",
            "한계",
            "위험",
            "가능성",
            "기술",

            "일상생활",
            "교육",
            "창작",
            "개발",
            "검색",

            "돈 버는 방법",
            "시간 절약",
            "새로운 기능",
            "활용 사례",
            "미래 변화"

        ]

    },


    /*
        SHOPPING
    */

    shopping: {

        subjects: [

            "생활용품",
            "주방용품",
            "청소용품",
            "수납용품",
            "욕실용품",

            "전자제품",
            "소형가전",
            "스마트폰 액세서리",
            "컴퓨터 주변기기",

            "자동차 용품",
            "캠핑용품",
            "여행용품",

            "여름용품",
            "겨울용품",

            "아이디어 상품",
            "가성비 제품",
            "생활 필수템",
            "신제품",
            "인기상품",
            "편리한 생활용품",

            "주방 필수템",
            "청소 필수템",
            "수납 아이템",
            "사무용품",
            "집들이 용품"

        ],

        angles: [

            "가성비",
            "편의성",
            "실용성",
            "신제품",
            "인기",
            "추천",

            "가격",
            "기능",
            "비교",
            "활용",
            "장단점",

            "생활 개선",
            "시간 절약",
            "공간 절약",
            "정리",
            "청소",

            "여행",
            "캠핑",
            "자동차",
            "주방",
            "욕실",

            "아이디어",
            "필수",
            "숨은 기능",
            "구매 포인트",
            "사용법"

        ]

    }

};


/*
    =========================================================
    Trend → 후보
    =========================================================
*/

export async function generateTopics(
    trends = [],
    channel = {}
) {

    const candidates = [];


    for (const trend of trends) {

        const title =
            typeof trend === "string"
                ? trend
                : trend?.title;


        if (!title) {

            continue;

        }


        candidates.push({

            topic:
                String(title).trim(),

            category:
                channel.category,

            channel:
                channel.name,

            trend: true,

            hot: true,

            source:
                trend?.source || "",

            trendScore:
                Number(
                    trend?.score || 0
                ),

            keywords:
                extractKeywords(
                    title
                )

        });

    }


    return candidates;

}


/*
    =========================================================
    GENERAL 후보 생성

    예:

    조선 + 음식
    문어 + 지능
    ChatGPT + 업무
    생활용품 + 가성비

    이것은 제목이 아니다.

    Create AI가 이후 이 소재를 받아
    실제 쇼츠 제목/스크립트를 만든다.
    =========================================================
*/

export async function generateGeneralTopics(
    channel = {},
    count = 0,
    existing = []
) {

    const requested =
        Math.max(
            0,
            Number(count) || 0
        );


    if (requested === 0) {

        return [];

    }


    const channelKey =
        String(
            channel.category || ""
        )
            .trim()
            .toLowerCase();


    const pool =
        GENERAL_POOLS[
            channelKey
        ];


    if (
        !pool ||
        !Array.isArray(pool.subjects) ||
        !Array.isArray(pool.angles)
    ) {

        return [];

    }


    /*
        현재 후보와 겹치지 않게 한다.
    */

    const used =
        new Set();


    for (const item of existing) {

        const topic =
            typeof item === "string"
                ? item
                : item?.topic;


        const key =
            normalize(
                topic
            );


        if (key) {

            used.add(key);

        }

    }


    /*
        모든 subject × angle 조합 생성

        AI 채널 예:
        25 × 25 = 최대 625개

        고정 20개 목록보다
        훨씬 많은 후보를 만들 수 있다.
    */

    const combinations = [];


    for (
        const subject
        of pool.subjects
    ) {

        for (
            const angle
            of pool.angles
        ) {

            const topic =
                `${subject} ${angle}`;


            const key =
                normalize(
                    topic
                );


            if (
                !key ||
                used.has(key)
            ) {

                continue;

            }


            combinations.push({

                topic,

                subject,

                angle

            });

        }

    }


    /*
        Fisher-Yates Shuffle

        Array.sort(Math.random)보다
        안정적으로 섞는다.
    */

    shuffle(
        combinations
    );


    const result = [];


    for (
        const item
        of combinations
    ) {

        if (
            result.length >=
            requested
        ) {

            break;

        }


        const key =
            normalize(
                item.topic
            );


        if (
            !key ||
            used.has(key)
        ) {

            continue;

        }


        used.add(key);


        result.push({

            topic:
                item.topic,

            subject:
                item.subject,

            angle:
                item.angle,

            category:
                channel.category,

            channel:
                channel.name,

            trend: false,

            hot: false,

            source:
                "general",

            trendScore: 0,

            keywords:
                extractKeywords(
                    item.topic
                )

        });

    }


    return result;

}


/*
    =========================================================
    Shuffle
    =========================================================
*/

function shuffle(
    list = []
) {

    for (
        let i =
            list.length - 1;

        i > 0;

        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            list[i],
            list[j]
        ] = [
            list[j],
            list[i]
        ];

    }


    return list;

}


/*
    =========================================================
    Normalize
    =========================================================
*/

function normalize(
    text = ""
) {

    return String(text)

        .normalize("NFKC")

        .toLowerCase()

        .replace(
            /[^\w가-힣]/g,
            ""
        );

}


/*
    =========================================================
    Keywords
    =========================================================
*/

function extractKeywords(
    text = ""
) {

    return String(text)

        .replace(
            /[^\w가-힣 ]/g,
            ""
        )

        .split(/\s+/)

        .filter(
            value =>
                value.length > 1
        );

}


export default {

    generateTopics,

    generateGeneralTopics

};
