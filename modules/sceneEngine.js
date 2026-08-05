import fs from "fs";

const rules = JSON.parse(
    fs.readFileSync(
        "data/sceneRules.json",
        "utf8"
    )
);

export function buildScenePlan(topic, scene){

    const voice = String(scene.voice || "");
    const title = String(scene.title || "");

    const plan = {

        subject: title,

        sceneType: "general",

        focus: "",

        action: "",

        location: "",

        priority: "real"

    };

    const text = `${title} ${voice}`.toLowerCase();

    // ===== sceneRules.json에서 대상 찾기 =====

    outer:
    for(const group of Object.values(rules)){

        for(const [name,data] of Object.entries(group)){

            if(text.includes(name.toLowerCase())){

                plan.subject = data.subject;
                plan.sceneType = data.type;

                break outer;

            }

        }

    }

    // ===== 행동 =====

    const actionRules = [

        ["수영","swimming"],
        ["헤엄","swimming"],
        ["달리","running"],
        ["뛰","running"],
        ["먹","eating"],
        ["사냥","hunting"],
        ["공격","attacking"],
        ["싸움","fighting"],
        ["비행","flying"],
        ["날","flying"],
        ["잠","sleeping"]

    ];

    for(const [k,v] of actionRules){

        if(text.includes(k)){

            plan.action = v;
            break;

        }

    }

    // ===== 부위 =====

    const focusRules = [

        ["눈","eye"],
        ["이빨","teeth"],
        ["입","mouth"],
        ["볼주머니","cheek pouch"],
        ["발","feet"],
        ["날개","wing"],
        ["꼬리","tail"],
        ["등껍질","shell"],
        ["껍질","shell"]

    ];

    for(const [k,v] of focusRules){

        if(text.includes(k)){

            plan.focus = v;
            plan.sceneType = "macro";

            break;

        }

    }

    // ===== AI 생성이 더 적합한 장면 =====

    const aiWords = [

        "dna",

        "유전자",

        "양자",

        "편광",

        "자외선",

        "적외선",

        "우주",

        "블랙홀",

        "세포",

        "분자"

    ];

    if(aiWords.some(v=>text.includes(v.toLowerCase()))){

        plan.priority = "ai";

    }

    return plan;

}


export function buildKeywords(plan){

    const subject = plan.subject || "";

    switch(plan.sceneType){

        case "macro":

            return [

                `${subject} ${plan.focus} close up`,
                `${subject} ${plan.focus} macro photography`,
                `${subject} ${plan.focus} extreme close up`

            ];

        case "animal":

            if(plan.action){

                return [

                    `${subject} ${plan.action}`,
                    `${subject} ${plan.action} wildlife`,
                    `${subject} ${plan.action} natural habitat`

                ];

            }

            return [

                `${subject} wildlife`,
                `${subject} close up`,
                `${subject} natural habitat`

            ];

        case "vehicle":

            return [

                `${subject} front view`,
                `${subject} interior`,
                `${subject} engine`

            ];

        case "food":

            return [

                `${subject} close up`,
                `${subject} fresh`,
                `${subject} cooking`

            ];

        default:

            return [

                subject,
                `${subject} close up`,
                `${subject} detail`

            ];

    }

}
