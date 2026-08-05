import fs from "fs";
import path from "path";

const STORAGE_DIR =
    path.resolve(
        process.cwd(),
        "brain/storage"
    );

const STORAGE_FILE =
    path.join(
        STORAGE_DIR,
        "channel-blocks.json"
    );


function ensureStorage() {

    if (!fs.existsSync(STORAGE_DIR)) {

        fs.mkdirSync(
            STORAGE_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(STORAGE_FILE)) {

        fs.writeFileSync(
            STORAGE_FILE,
            JSON.stringify(
                {
                    blockedChannels: {}
                },
                null,
                2
            ),
            "utf8"
        );

    }

}


function readStorage() {

    ensureStorage();

    try {

        const raw =
            fs.readFileSync(
                STORAGE_FILE,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        if (
            !data ||
            typeof data !== "object"
        ) {

            return {
                blockedChannels: {}
            };

        }

        if (
            !data.blockedChannels ||
            typeof data.blockedChannels !== "object"
        ) {

            data.blockedChannels = {};

        }

        return data;

    }
    catch (error) {

        console.error(
            "[ChannelBlockStore] 읽기 실패:",
            error.message
        );

        return {
            blockedChannels: {}
        };

    }

}


function writeStorage(data) {

    ensureStorage();

    const tempFile =
        STORAGE_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        STORAGE_FILE
    );

}


export function getBlockedChannels() {

    const data =
        readStorage();

    return new Map(
        Object.entries(
            data.blockedChannels || {}
        )
        .map(
            ([channel, info]) => [

                channel,

                typeof info === "string"
                    ? info
                    : (
                        info?.reason ||
                        "UPLOAD_BLOCKED"
                    )

            ]
        )
    );

}


export function getChannelBlockInfo(
    channel
) {

    const data =
        readStorage();

    return (
        data.blockedChannels?.[
            channel
        ] ||
        null
    );

}


export function blockChannel(
    channel,
    reason = "UPLOAD_BLOCKED",
    details = {}
) {

    if (!channel) {

        throw new Error(
            "차단할 채널명이 없습니다."
        );

    }

    const data =
        readStorage();

    data.blockedChannels[channel] = {

        reason,

        blockedAt:
            new Date().toISOString(),

        ...details

    };

    writeStorage(data);

    console.log(
        `[ChannelBlockStore] BLOCKED : ${channel} / ${reason}`
    );

    return (
        data.blockedChannels[channel]
    );

}


export function unblockChannel(
    channel
) {

    const data =
        readStorage();

    if (
        !Object.prototype.hasOwnProperty.call(
            data.blockedChannels,
            channel
        )
    ) {

        return false;

    }

    delete data.blockedChannels[
        channel
    ];

    writeStorage(data);

    console.log(
        `[ChannelBlockStore] UNBLOCKED : ${channel}`
    );

    return true;

}


export function isChannelBlocked(
    channel
) {

    const data =
        readStorage();

    return Boolean(
        data.blockedChannels?.[
            channel
        ]
    );

}


export function clearAllChannelBlocks() {

    writeStorage({
        blockedChannels: {}
    });

    console.log(
        "[ChannelBlockStore] ALL CLEAR"
    );

    return true;

}
