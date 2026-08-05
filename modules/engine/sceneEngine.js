export async function analyzeScene(scene) {

    return {

role: scene.role || "body",

sceneType:
    /^([1-9]|10)위/.test(scene.title || "")
        ? "ranking"
        : "global",

        subject: String(
            scene.sceneSubject ||
            scene.searchSubject ||
            scene.title ||
            ""
        ).trim(),

        category: "",

        action: "",

        focus: "",

        location: "",

        confidence: 0

    };

}
