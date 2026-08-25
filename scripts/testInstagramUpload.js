import "dotenv/config";

import fs from "fs";

import {
    uploadInstagramReel
} from "../modules/instagram/instagramUploader.js";


const CHANNEL_FILE =
    "modules/channels/channels.json";

const VIDEO_FILE =
    "media/video/shorts_final.mp4";


if (!fs.existsSync(CHANNEL_FILE)) {

    throw new Error(
        `채널 설정 파일 없음 : ${CHANNEL_FILE}`
    );
}


if (!fs.existsSync(VIDEO_FILE)) {

    throw new Error(
        `테스트 영상 없음 : ${VIDEO_FILE}`
    );
}


const channels =
    JSON.parse(
        fs.readFileSync(
            CHANNEL_FILE,
            "utf8"
        )
    );


const channel =
    channels.find(
        item =>
            item?.name === "History"
    );


if (!channel) {

    throw new Error(
        "History 채널 없음"
    );
}


if (
    channel?.instagram?.enabled !== true
) {

    throw new Error(
        "History Instagram 비활성화 상태"
    );
}


const instagram =
    channel.instagram;


console.log(
    "===== INSTAGRAM HISTORY TEST ====="
);

console.log(
    `CHANNEL  : ${channel.name}`
);

console.log(
    `USERNAME : ${instagram.username}`
);

console.log(
    `IG ID    : ${instagram.instagramUserId}`
);

console.log(
    `TOKEN    : ${instagram.accessToken ? "SET" : "NOT SET"}`
);

console.log(
    `VIDEO    : ${VIDEO_FILE}`
);


const caption = [
    "역사 속 흥미로운 이야기를 짧게 만나보세요.",
    "",
    "#역사 #역사이야기 #역사상식 #릴스 #reels"
].join("\n");


const result =
    await uploadInstagramReel(
        VIDEO_FILE,
        {
            instagramUserId:
                instagram.instagramUserId,

            accessToken:
                instagram.accessToken,

            username:
                instagram.username,

            caption
        }
    );


console.log("");
console.log(
    "===== TEST RESULT ====="
);

console.log(
    JSON.stringify(
        result,
        null,
        2
    )
);
