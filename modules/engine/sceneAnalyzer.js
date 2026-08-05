const STOPWORDS = [
    "그리고","하지만","그러나","정말","매우","엄청","바로",
    "이","그","저","있는","하는","됩니다","입니다",
    "있습니다","것","수","때","처럼","가장","또한"
];

const SUBJECTS = {

    "햄스터":"Hamster",
    "고양이":"Cat",
    "강아지":"Dog",
    "사마귀새우":"Mantis Shrimp",
    "호랑이":"Tiger",
    "사자":"Lion",

    "bmw":"BMW",
    "벤츠":"Mercedes-Benz",
    "테슬라":"Tesla",

    "에펠탑":"Eiffel Tower",
    "피라미드":"Pyramid",

    "달":"Moon",
    "화성":"Mars",
    "지구":"Earth"

};

const BODY_PARTS = {

    "눈":"eye",
    "동공":"eye",
    "이빨":"teeth",
    "치아":"teeth",
    "앞니":"incisors",
    "입":"mouth",
    "귀":"ear",
    "코":"nose",
    "꼬리":"tail",
    "발":"paw",
    "발톱":"claw",
    "날개":"wing",
    "지느러미":"fin"

};

const ACTIONS = {

    "먹":"eating",
    "씹":"chewing",
    "달리":"running",
    "걷":"walking",
    "수영":"swimming",
    "잠":"sleeping",
    "사냥":"hunting",
    "날":"flying",
    "헤엄":"swimming",
    "자라":"growing",
    "생기":"forming",
    "공격":"attacking",
    "방어":"defending"

};

export function analyzeSceneDeep(scene){

    const text =
        `${scene.title || ""} ${scene.voice || ""}`
        .toLowerCase();

const result = {

    primarySubject:"",

    secondarySubjects:[],

    bodyPart:"",

    action:"",

    object:"",

    location:"",

    period:"",

    camera:"normal",

    style:"realistic photography",

    imagePlan:{

        context:"",

        detail:"",

        action:""

    },

    searchIntent:"",

    imagePrompts:[],

    negativeKeywords:[

        "cartoon",

        "illustration",

        "anime",

        "logo",

        "icon",

        "watermark",

        "text",

        "low quality",

        "blurry",

        "cgi",

        "3d render"

    ]

};

    for(const key in SUBJECTS){

        if(text.includes(key.toLowerCase())){

            result.primarySubject =
                SUBJECTS[key];

            break;

        }

    }

    for(const key in BODY_PARTS){

        if(text.includes(key)){

            result.bodyPart =
                BODY_PARTS[key];

            break;

        }

    }

    for(const key in ACTIONS){

        if(text.includes(key)){

            result.action =
                ACTIONS[key];

            break;

        }

    }

const parts = [];

const primary =

    result.primarySubject ||

    scene.subject ||

    scene.searchSubject ||

    scene.title ||

    "";

if(primary){

    result.primarySubject = primary;

    parts.push(primary);

}

if(

    result.bodyPart &&

    !parts.includes(result.bodyPart)

){

    parts.push(result.bodyPart);

}

if(

    result.action &&

    !parts.includes(result.action)

){

    parts.push(result.action);

}

result.searchIntent = parts.join(" ");

if(result.primarySubject){

    result.imagePlan.context =
        `${result.primarySubject}, realistic documentary photography, wide shot`;

}

if(result.bodyPart){

    result.imagePlan.detail =
        `${result.primarySubject} ${result.bodyPart}, macro photography, ultra detailed`;

}else{

    result.imagePlan.detail =
        `${result.primarySubject}, close up portrait, highly detailed`;

}

if(result.action){

    result.imagePlan.action =
        `${result.primarySubject} ${result.action}, natural action photography`;

}else{

    result.imagePlan.action =
        `${result.primarySubject}, natural behavior, realistic wildlife photography`;

}

result.imagePrompts = [

    result.imagePlan.context,

    result.imagePlan.detail,

    result.imagePlan.action

].filter(Boolean);

    console.log("");
    console.log("===== SCENE ANALYZER =====");
    console.log(result);
    console.log("==========================");

    return result;

}
