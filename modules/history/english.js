export function createEnglishDirector(director){

    const cloned =
        structuredClone(director);

    cloned.title =
        director.titleEn ||
        director.title ||
        "";

    cloned.scenes =
        (director.scenes || []).map(scene=>({

            ...scene,

            script:
                scene.scriptEn ||
                scene.script ||
                "",

            tts:
                scene.ttsEn ||
                scene.scriptEn ||
                scene.tts ||
                scene.script ||
                "",

            subtitle:
                scene.subtitleEn ||
                scene.scriptEn ||
                scene.subtitle ||
                ""

        }));

    return cloned;
}
