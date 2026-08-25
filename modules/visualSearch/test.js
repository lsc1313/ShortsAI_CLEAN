import "dotenv/config";
import {
    searchVisual
} from "./index.js";


const scene = {

    type:"hook",

    coreSubject:
        "Joseon nobleman wearing satgat bamboo hat",

    subject:
        "Joseon nobleman wearing satgat bamboo hat",

    searchSubject:
        "Joseon nobleman wearing satgat bamboo hat",

    script:
        "A mysterious Joseon nobleman entered a hidden tavern at night while hiding his face.",

    sceneDescription:
        "A Joseon-era nobleman secretly entering a traditional Korean tavern at night, hiding his face under a satgat bamboo hat.",

    location:
        "Joseon dynasty Korea",

    era:
        "Joseon dynasty",

    visualType:
        "auto"

};


console.log(
    "===================================="
);

console.log(
    "[VISUAL ROUTER TEST] START"
);

console.log(
    "===================================="
);


try{

    const result =
        await searchVisual(
            scene,
            "Joseon nobleman wearing satgat bamboo hat entering traditional Korean tavern at night"
        );


    console.log(
        "===================================="
    );

    console.log(
        "[VISUAL ROUTER TEST] RESULT"
    );

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );

    console.log(
        "===================================="
    );


}
catch(error){

    console.error(
        "[VISUAL ROUTER TEST] FAILED"
    );

    console.error(
        error?.message ||
        error
    );

}
