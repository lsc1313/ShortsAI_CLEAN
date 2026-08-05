const RULES = [
    {
        category: "AI",
        keywords: [
            "ai","gpt","chatgpt","gemini",
            "인공지능","챗gpt","자동화","프롬프트"
        ]
    },
    {
        category: "역사",
        keywords: [
            "역사","조선","고려","신라",
            "왕","전쟁","독립","문화재"
        ]
    },
    {
        category: "동물",
        keywords: [
            "강아지","고양이","동물",
            "햄스터","앵무새","사슴벌레",
            "곤충","반려"
        ]
    },
    {
        category: "쇼핑",
        keywords: [
            "추천","구매","쿠팡","가격",
            "리뷰","할인","상품","쇼핑"
        ]
    }
];

export function classify(topic=""){

    const text = topic.toLowerCase();

    for(const rule of RULES){

        if(rule.keywords.some(
            k=>text.includes(k.toLowerCase())
        )){
            return rule.category;
        }

    }

    return "AI";

}
