import axios from "axios";

import {
    getModels,
    removeModel
} from "./modelLoader.js";


function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


function getRetryDelay(
    error,
    attempt,
    status
) {
    const retryAfter =
        error?.response?.headers?.["retry-after"];

    if (retryAfter) {

        const seconds =
            Number(retryAfter);

        if (
            Number.isFinite(seconds) &&
            seconds > 0
        ) {
            return Math.min(
                seconds * 1000,
                60000
            );
        }
    }

    const details =
        error?.response?.data?.error?.details;

    if (Array.isArray(details)) {

        for (const item of details) {

            const delay =
                String(
                    item?.retryDelay || ""
                );

            const match =
                delay.match(
                    /^([\d.]+)s$/
                );

            if (match) {

                const ms =
                    Number(match[1]) *
                    1000;

                if (
                    Number.isFinite(ms) &&
                    ms > 0
                ) {
                    return Math.min(
                        ms,
                        60000
                    );
                }
            }
        }
    }

    if (status === 429) {

        const delays = [
            15000,
            30000,
            60000
        ];

        return delays[
            Math.min(
                attempt - 1,
                delays.length - 1
            )
        ];
    }

    const delays = [
        5000,
        10000,
        20000
    ];

    return delays[
        Math.min(
            attempt - 1,
            delays.length - 1
        )
    ];
}


function cleanErrorInfo(
    error,
    model
) {
    return {
        model,

        status:
            error?.response?.status ||
            null,

        message:
            String(
                error?.response
                    ?.data
                    ?.error
                    ?.message ||
                error?.message ||
                "Unknown Gemini error"
            )
            .replace(
                /key=[^&\s]+/gi,
                "key=***"
            )
    };
}


async function runGemini(
    prompt,
    useGoogleSearch = false
) {
    const apiKey =
        process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY 없음"
        );
    }

    const rawModels =
        await getModels(
            "gemini"
        );

    const preferred = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
        "gemini-2.5-flash"
    ];

    const usableModels =
        rawModels.filter(
            model =>
                model.startsWith(
                    "gemini-"
                ) &&
                !/image|tts|transcribe|computer|robotics|omni|deep-research/i
                    .test(model)
        );

    /*
    너무 많은 모델을 연속 재시도해서
    수십 분 동안 멈추는 것을 방지한다.
    */
    const models = [
        ...preferred.filter(
            model =>
                usableModels.includes(
                    model
                )
        ),

        ...usableModels.filter(
            model =>
                !preferred.includes(
                    model
                )
        )
    ]
    .slice(0, 6);

    let lastErrorInfo = null;

    for (const model of models) {

        if (
            model.startsWith(
                "gemma"
            )
        ) {
            continue;
        }

        /*
        =============================================
        같은 모델 재시도
        =============================================
        */
        const maxAttempts =
            useGoogleSearch
                ? 3
                : 3;

        for (
            let attempt = 1;
            attempt <= maxAttempts;
            attempt++
        ) {

            try {

                console.log(
                    useGoogleSearch
                        ? "[Gemini Web Search]"
                        : "[Gemini]",
                    model,
                    `attempt ${attempt}/${maxAttempts}`
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

                if (
                    useGoogleSearch
                ) {
                    body.tools = [
                        {
                            google_search: {}
                        }
                    ];
                }

                const res =
                    await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        body,
                        {
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            timeout:
                                120000
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

                    if (
                        attempt > 1
                    ) {
                        console.log(
                            `[Gemini recovered] ${model}`
                        );
                    }

                    return text;
                }

                throw new Error(
                    "Gemini empty response"
                );

            }
            catch (error) {

                const info =
                    cleanErrorInfo(
                        error,
                        model
                    );

                lastErrorInfo =
                    info;

                const status =
                    info.status;

                const message =
                    info.message;

                const permanentModelError =
                    status === 404 ||
                    (
                        status === 400 &&
                        /model.*not found|not supported|unsupported model/i
                            .test(message)
                    );

                const unsupportedSearch =
                    useGoogleSearch &&
                    status === 400 &&
                    /google_search|tool|tools|grounding|not supported/i
                        .test(message);

                /*
                =====================================
                잘못된 모델이면 다음 모델
                =====================================
                */
                if (
                    permanentModelError
                ) {

                    console.log(
                        `[Gemini model unavailable] ${model} HTTP ${status}`
                    );

                    if (
                        !useGoogleSearch
                    ) {
                        removeModel(
                            "gemini",
                            model
                        );
                    }

                    break;
                }

                /*
                Google Search 미지원 모델
                */
                if (
                    unsupportedSearch
                ) {

                    console.log(
                        `[Gemini Web Search unsupported] ${model}`
                    );

                    break;
                }

                /*
                =====================================
                429 = 즉시 다음 모델
                서버 오류 = 같은 모델 재시도
                =====================================
                */
                if (
                    status === 429
                ) {

                    console.log(
                        `[Gemini quota/rate limit] ${model} HTTP 429 -> next model`
                    );

                    break;
                }

                if (
                    status &&
                    status >= 500
                ) {

                    console.log(
                        `[Gemini temporary error] ${model} HTTP ${status}`
                    );

                    if (
                        attempt <
                        maxAttempts
                    ) {

                        const delay =
                            getRetryDelay(
                                error,
                                attempt,
                                status
                            );

                        console.log(
                            `[Gemini retry] wait ${Math.round(delay / 1000)}s`
                        );

                        await sleep(
                            delay
                        );

                        continue;
                    }

                    console.log(
                        `[Gemini retry exhausted] ${model}`
                    );

                    break;
                }

                /*
                기타 오류는 해당 모델 종료
                */
                console.log(
                    `[Gemini fail] ${model} HTTP ${status || "UNKNOWN"}`
                );

                break;
            }
        }
    }

    /*
    =============================================
    Axios 원본 Error를 던지지 않는다.
    API KEY 포함 URL 로그 노출 방지.
    =============================================
    */

    if (
        lastErrorInfo
    ) {
        throw new Error(
            `Gemini failed: model=${lastErrorInfo.model} HTTP=${lastErrorInfo.status || "UNKNOWN"} ${lastErrorInfo.message}`
        );
    }

    throw new Error(
        "사용 가능한 Gemini 모델 없음"
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
