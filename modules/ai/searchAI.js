import { callAI } from "./index.js";

export async function generateSearch(
    global,
    scene
){

    const prompt = `

너는 Shutterstock, GettyImages, AdobeStock, Pexels 검색 전문가다.

반드시 JSON만 출력한다.

=========================
GLOBAL VIDEO
=========================

제목
${global.title}

영상 전체 주제
${global.globalSubject || global.title}

영상 종류
${global.videoType || ""}

=========================
CURRENT SCENE
=========================

${JSON.stringify(scene,null,2)}

=========================
절대 규칙
=========================

1.
모든 검색어는
"영상 전체 주제"를 절대로 벗어나면 안 된다.

2.
Scene보다
영상 전체 주제를 우선한다.

3.
동음이의어가 있으면
영상 주제를 기준으로 선택한다.

예시

고양이 영상
Sphinx
→ Sphynx Cat

꽃 영상
Rose
→ Rose Flower

자동차 영상
Jaguar
→ Jaguar Car

동물 영상
Jaguar
→ Jaguar Animal

4.
searchName은

실제 사진 사이트에서 검색 가능한

대표 영어 명칭

5.

imageQueries는

searchName을 다양한 표현으로 검색한 것이다.

6.

추상적인 단어 금지

예)

beautiful

amazing

best

cool

background

wallpaper

X

7.

반드시 실존하는 대상만 사용

8.

Hook

Intro

Body

Ranking

Ending

모두

영상 전체 주제를 유지한다.

9.

다른 분야의 검색어를 만들면 안 된다.

예)

고양이 영상

↓

dog

wolf

lion

Egypt

Sphinx Monument

X

10.

검색 성공률을 가장 우선한다.

=========================

JSON

{

"searchName":"",

"imageQueries":[

"...",

"...",

"...",

"..."

]

}

`;

const text = await callAI(
    prompt
);

let result =

    String(text)

    .replace(/```json/gi,"")

    .replace(/```/g,"")

    .trim();

    const start =

        result.indexOf("{");

    const end =

        result.lastIndexOf("}");

    if(

        start!=-1 &&

        end!=-1

    ){

        result=

        result.substring(

            start,

            end+1

        );

    }

    result = JSON.parse(result);

    if(

        !Array.isArray(

            result.imageQueries

        )

    ){

        result.imageQueries=[];

    }

    result.imageQueries =

        result.imageQueries

        .map(x=>String(x).trim())

        .filter(Boolean)

        .filter(

            (v,i,a)=>

            a.indexOf(v)===i

        )

        .slice(0,4);

    return result;

}
