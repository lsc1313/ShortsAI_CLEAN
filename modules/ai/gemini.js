import axios from "axios";

import {
    getModels,
    removeModel
} from "./modelLoader.js";

async function runGemini(
    prompt,
    useGoogleSearch = false
) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY 없음"
        );
    }

    const models = await getModels(
        "gemini"
    );

    let lastError;

    for (const model of models) {

        if (model.startsWith("gemma")) {
            console.log(
                "[SKIP GEMMA]",
                model
            );
            continue;
        }

        try {

            console.log(
                useGoogleSearch
                    ? "[Gemini Web Search]"
                    : "[Gemini]",
                model
            );

            const body = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            };

            if (useGoogleSearch) {
                body.tools = [
                    {
                        google_search: {}
                    }
                ];
            }

            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                body,
                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    timeout: 120000
                }
            );

            const text =
                res.data
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        part =>
                            part.text || ""
                    )
                    .join("")
                    ?.trim();

            if (text) {
                return text;
            }

        }
        catch (e) {

            lastError = e;

            if (
                process.env.GEMINI_DEBUG === "true"
            ) {
                console.log(
                    useGoogleSearch
                        ? "[Gemini Web Search Fail]"
                        : "[Gemini Fail]",
                    model
                );
            }

            if (
                !useGoogleSearch
            ) {
                removeModel(
                    "gemini",
                    model
                );
            }
        }
    }

    throw (
        lastError ||
        new Error(
            "Gemini 모델 없음"
        )
    );
}

export async function callGemini(
    prompt
) {
    return runGemini(
        prompt,
        false
    );
}

export async function callGeminiSearch(
    prompt
) {
    return runGemini(
        prompt,
        true
    );
}
