export function adaptDirectorResult(data) {

    return {

        title:
            data.concept_decision?.concept_name || "",

        globalSubject:
            data.product_analysis?.usage || "",

        hook:
            data.scenario_summary?.hook || "",

        ending:
            data.work_instructions?.scenes?.at(-1)?.ending || "",

        scenes:

            (data.work_instructions?.scenes || []).map(scene => ({

                title:
                    `Scene ${scene.scene_number}`,

                voice:
                    scene.script,

                subtitle:
                    scene.subtitle,

                images:
                    scene.image_search_keywords || [],

                imageQueries:
                    scene.image_search_keywords || [],

                screenEffect:
                    scene.screen_effects,

                tts:
                    scene.tts,

                cta:
                    scene.cta,

                ending:
                    scene.ending

            }))

    };

}
