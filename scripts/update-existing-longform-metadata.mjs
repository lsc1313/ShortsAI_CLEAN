import fs from "node:fs";
import { google } from "googleapis";

const channels = JSON.parse(
    fs.readFileSync(
        "./modules/channels/channels.json",
        "utf8"
    ).replace(/^\uFEFF/, "")
);

const targets = [
    {
        channelName: "History",
        videoId: "0MPrCAbXRvo",

        title:
            "1938년 우주전쟁 라디오 패닉의 진실 | 미국 전역은 정말 공황에 빠졌나?",

        description: `1938년 10월 30일, 오슨 웰스의 라디오 드라마 《우주전쟁》은 미국 전역을 공포에 빠뜨렸다는 전설로 남았습니다. 하지만 실제 기록을 살펴보면 이야기는 훨씬 복잡합니다.

일부 청취자가 가상의 화성 침공을 실제 뉴스로 오해한 것은 사실이지만, 당시 청취율 조사와 후대 연구는 전국적인 대규모 공황이라는 이미지가 크게 과장됐을 가능성을 보여줍니다. 다음 날 신문들의 선정적인 보도 역시 이 전설이 커지는 데 중요한 역할을 했습니다.

이 영상에서는 1938년 실제 방송 내용, 당시 청취자들의 반응, 신문과 라디오의 경쟁, 그리고 우주전쟁 패닉이 어떻게 현대 미디어 역사상 가장 유명한 사례 중 하나가 되었는지를 추적합니다.

역사적 사건 뒤에 숨은 기록과 오해를 함께 살펴봅니다.

#우주전쟁 #오슨웰스 #역사다큐`,

        tags: [
            "우주전쟁",
            "오슨웰스",
            "1938년",
            "라디오방송",
            "라디오역사",
            "미국역사",
            "미디어역사",
            "가짜뉴스",
            "언론역사",
            "대중심리",
            "집단공황",
            "역사다큐",
            "역사다큐멘터리",
            "WarOfTheWorlds",
            "OrsonWelles"
        ]
    },

    {
        channelName: "EchoesAgo",
        videoId: "_7SYjNOnd3M",

        title:
            "The 1938 War of the Worlds Panic: What Really Happened?",

        description: `On October 30, 1938, Orson Welles War of the Worlds radio broadcast became one of the most famous stories in media history — remembered as the night America supposedly descended into panic over a Martian invasion.

But what really happened?

Some listeners did mistake the fictional broadcast for real news, yet contemporary evidence suggests the scale of the nationwide panic was later greatly exaggerated. Sensational newspaper coverage helped transform the incident into a legend that has survived for decades.

In this documentary, we examine the original 1938 broadcast, the reaction of listeners, the rivalry between radio and newspapers, and how the story of the War of the Worlds panic became larger than the event itself.

Subscribe to EchoesAgo for documentaries uncovering the real stories behind historys most enduring legends.

#WarOfTheWorlds #OrsonWelles #HistoryDocumentary`,

        tags: [
            "War of the Worlds",
            "Orson Welles",
            "1938 War of the Worlds",
            "1938 radio broadcast",
            "Mercury Theatre",
            "radio history",
            "media history",
            "American history",
            "mass panic",
            "fake news history",
            "journalism history",
            "media literacy",
            "historical documentary",
            "history documentary",
            "H G Wells",
            "EchoesAgo"
        ]
    }
];

for (const target of targets) {

    const channel =
        channels.find(
            x => x.name === target.channelName
        );

    if (!channel) {
        throw new Error(
            `${target.channelName} channel not found`
        );
    }

    const auth =
        new google.auth.OAuth2(
            channel.clientId,
            channel.clientSecret
        );

    auth.setCredentials({
        refresh_token:
            channel.refreshToken
    });

    const youtube =
        google.youtube({
            version: "v3",
            auth
        });

    /*
    현재 categoryId 보존
    */
    const current =
        await youtube.videos.list({
            part: ["snippet"],
            id: [target.videoId]
        });

    const oldSnippet =
        current.data.items?.[0]?.snippet;

    if (!oldSnippet) {
        throw new Error(
            `${target.channelName}: video not found`
        );
    }

    await youtube.videos.update({
        part: ["snippet"],

        requestBody: {
            id: target.videoId,

            snippet: {
                title:
                    target.title,

                description:
                    target.description,

                tags:
                    target.tags,

                categoryId:
                    oldSnippet.categoryId || "27",

                ...(oldSnippet.defaultLanguage
                    ? {
                        defaultLanguage:
                            oldSnippet.defaultLanguage
                    }
                    : {}),

                ...(oldSnippet.defaultAudioLanguage
                    ? {
                        defaultAudioLanguage:
                            oldSnippet.defaultAudioLanguage
                    }
                    : {})
            }
        }
    });

    /*
    수정 결과 확인
    */
    const check =
        await youtube.videos.list({
            part: ["snippet"],
            id: [target.videoId]
        });

    const s =
        check.data.items?.[0]?.snippet;

    console.log("");
    console.log("==============================");
    console.log(`${target.channelName} UPDATED`);
    console.log("==============================");
    console.log("TITLE =", s?.title);
    console.log("TAGS  =", s?.tags?.length || 0);
    console.log(
        "DESCRIPTION LENGTH =",
        s?.description?.length || 0
    );
}

console.log("");
console.log("==============================");
console.log("LONGFORM METADATA UPDATE COMPLETE");
console.log("==============================");
