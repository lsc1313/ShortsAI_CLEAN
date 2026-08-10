/*
=========================================================
ShortsAI Blog Factory
BLOGGER CLIENT v2
=========================================================

역할
- Google Blogger API 실제 연결
- 기본값은 DRAFT
- 명시적으로 publish:true를 주기 전에는 공개 금지

환경변수
BLOGGER_CLIENT_ID
BLOGGER_CLIENT_SECRET
BLOGGER_REFRESH_TOKEN
BLOGGER_BLOG_ID
=========================================================
*/

import "dotenv/config";

import {
    google
} from "googleapis";


function getRequiredEnv(
    name
) {

    const value =
        String(
            process.env[name] || ""
        ).trim();


    if (!value) {

        throw new Error(
            `BloggerClient: ${name}이 없습니다.`
        );

    }


    return value;

}


function createAuth() {

    const clientId =
        getRequiredEnv(
            "BLOGGER_CLIENT_ID"
        );


    const clientSecret =
        getRequiredEnv(
            "BLOGGER_CLIENT_SECRET"
        );


    const refreshToken =
        getRequiredEnv(
            "BLOGGER_REFRESH_TOKEN"
        );


    const auth =
        new google.auth.OAuth2(
            clientId,
            clientSecret
        );


    auth.setCredentials({

        refresh_token:
            refreshToken

    });


    return auth;

}


export async function publishBlog({
    title,
    html,
    tags = [],
    publish = false,
    blogType = "shopping"
}) {

    if (!title) {

        throw new Error(
            "BloggerClient: 제목이 없습니다."
        );

    }


    if (!html) {

        throw new Error(
            "BloggerClient: 본문이 없습니다."
        );

    }


    const blogEnvName =
        blogType === "science"
            ? "BLOGGER_SCIENCE_BLOG_ID"
            : "BLOGGER_BLOG_ID";

    const blogId =
        getRequiredEnv(
            blogEnvName
        );


    const auth =
        createAuth();


    const blogger =
        google.blogger({

            version:
                "v3",

            auth

        });


    /*
    =====================================================
    안전장치

    기본값:
    publish === false

    따라서 Blog Factory에서 별도 옵션을 전달하지 않는
    현재 구조에서는 무조건 DRAFT로 생성된다.
    =====================================================
    */

    const isDraft =
        publish !== true;


    console.log(
        `[BloggerClient] MODE : ${
            isDraft
                ? "DRAFT"
                : "PUBLISH"
        }`
    );


    try {

        const result =
            await blogger.posts.insert({

                blogId,

                isDraft,

                requestBody: {

                    kind:
                        "blogger#post",

                    title:
                        String(
                            title
                        ).trim(),

                    content:
                        String(
                            html
                        ),

                    labels:
                        Array.isArray(
                            tags
                        )
                            ? tags
                                .map(
                                    value =>
                                        String(value).trim()
                                )
                                .filter(Boolean)
                                .slice(0, 20)

                            : []

                }

            });


        const post =
            result.data;


        console.log(
            "[BloggerClient] POST CREATED"
        );


        console.log(
            "[BloggerClient] POST ID :",
            post.id
        );


        return {

            success:
                true,

            mode:
                isDraft
                    ? "DRAFT"
                    : "PUBLISHED",

            postId:
                post.id || null,

            url:
                post.url || null,

            title:
                post.title ||
                title,

            tags:
                post.labels ||
                tags

        };

    }
    catch (error) {

        console.error(
            "[BloggerClient] FAIL"
        );


        console.error(
            error?.response?.data ||
            error?.message ||
            error
        );


        throw new Error(
            `BloggerClient 게시 실패: ${
                error?.response?.data?.error?.message ||
                error?.message ||
                "알 수 없는 오류"
            }`
        );

    }

}


export default {

    publishBlog

};
