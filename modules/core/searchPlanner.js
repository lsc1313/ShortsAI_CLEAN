import { generateSearch } from "../ai/searchAI.js";

export async function buildSearchPlan(
    global,
    scene
){

const result =
    await generateSearch(
        global,
        scene
    );

    console.log("");
    console.log("===== SEARCH PLANNER =====");
    console.log(result);
    console.log("==========================");

    return {

        ...scene,

        searchSubject:
            result.searchName || "",

        searchName:
            result.searchName || "",

        imageQueries:
            Array.isArray(result.imageQueries)
                ? result.imageQueries
                : []

    };

}
