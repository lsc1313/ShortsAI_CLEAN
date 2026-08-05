const PROMPTS = {

    animal:`
실제 존재하는 동물만 사용한다.

Pixabay, Pexels에서 검색 가능한 영어만 사용한다.

검색어는 반드시

동물명 + 핵심부위 + 행동 + 촬영기법

형태를 사용한다.

예시

Golden Hamster cheek pouch eating sunflower seed macro photography

Golden Hamster incisors close up documentary photography

Golden Hamster running natural habitat wildlife photography
`,

    vehicle:`
실사 자동차만 사용한다.

차량명 + 부위 + 촬영기법

예시

BMW M3 engine bay photography

BMW M3 interior dashboard

BMW M3 wheel close up
`,

    food:`
완성된 음식만 사용한다.

음식명 + 상태 + 촬영기법

예시

Pepperoni pizza cheese close up

Fresh sushi salmon macro photography
`,

    history:`
실제 역사 사진이나 유적만 사용한다.

예시

Ancient Egypt pyramid aerial photography

Roman Colosseum documentary photography
`,

    science:`
실제 촬영 가능한 대상만 사용한다.

예시

Microscope cell macro

DNA laboratory photography
`,

    space:`
NASA 또는 ESA 기준 실사 사진만 사용한다.

예시

Mars surface NASA

Moon crater photography

Milky Way galaxy long exposure
`,

    default:`
현재 장면을 가장 잘 표현하는

실사 사진 검색어만 생성한다.
`

};

export function getPrompt(plan){

    return (

        PROMPTS[plan.category] ||

        PROMPTS.default

    );

}
