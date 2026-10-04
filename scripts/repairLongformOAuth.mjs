import http from "node:http";
import fs from "node:fs";
import { google } from "googleapis";
import open from "open";

const FILE = "./modules/channels/channels.json";
const BACKUP =
    "./modules/channels/channels.json.before-longform-readonly-oauth";

const channels = JSON.parse(
    fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "")
);

const TARGETS = [
    { name: "History", port: 3001 },
    { name: "EchoesAgo", port: 3001 }
];

const SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl"
];

if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(FILE, BACKUP);
}

async function authorize(target) {

    const channel =
        channels.find(x => x.name === target.name);

    if (!channel) {
        throw new Error(
            `${target.name} channel not found`
        );
    }

    if (
        !channel.clientId ||
        !channel.clientSecret
    ) {
        throw new Error(
            `${target.name} OAuth client missing`
        );
    }

    const redirect =
        `http://localhost:${target.port}`;

    const oauth =
        new google.auth.OAuth2(
            channel.clientId,
            channel.clientSecret,
            redirect
        );

    const authUrl =
        oauth.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: true,
            scope: SCOPES
        });

    console.log("");
    console.log("==============================");
    console.log(`${target.name} AUTH`);
    console.log("==============================");

    const tokens =
        await new Promise((resolve, reject) => {

            const server =
                http.createServer(
                    async (req, res) => {

                        try {

                            const url =
                                new URL(
                                    req.url,
                                    redirect
                                );

                            const code =
                                url.searchParams.get(
                                    "code"
                                );

                            if (!code) {
                                res.end("No code");
                                return;
                            }

                            const result =
                                await oauth.getToken(
                                    code
                                );

                            res.end(
                                `${target.name} OAuth OK. You can close this window.`
                            );

                            server.close();

                            resolve(
                                result.tokens
                            );

                        }
                        catch (error) {

                            res.end(
                                "OAuth failed."
                            );

                            server.close();

                            reject(error);
                        }
                    }
                );

            server.listen(
                target.port,
                async () => {

                    console.log(
                        `Callback Port : ${target.port}`
                    );

                    try {
                        await open(authUrl);
                    }
                    catch {
                        console.log(authUrl);
                    }
                }
            );
        });

    if (!tokens.refresh_token) {
        throw new Error(
            `${target.name}: no refresh_token returned`
        );
    }

    oauth.setCredentials({
        refresh_token:
            tokens.refresh_token
    });

    /*
     * refresh token 자체 검증
     */
    await oauth.getAccessToken();

    /*
     * readonly 권한 + 실제 로그인 채널 확인
     */
    const youtube =
        google.youtube({
            version: "v3",
            auth: oauth
        });

    const me =
        await youtube.channels.list({
            part: ["id", "snippet"],
            mine: true
        });

    const actual =
        me.data.items?.[0];

    if (!actual?.id) {
        throw new Error(
            `${target.name}: authenticated YouTube channel not found`
        );
    }

    console.log("ACTUAL CHANNEL TITLE =", actual.snippet?.title || "");
console.log("ACTUAL CHANNEL ID    =", actual.id);

if (
    channel.channelId &&
    /^UC[A-Za-z0-9_-]{20,}$/.test(channel.channelId) &&
    channel.channelId !== actual.id
) {
    throw new Error(
        `${target.name}: WRONG ACCOUNT / CHANNEL`
    );
}

    console.log(
        `CHANNEL VERIFIED : ${actual.snippet?.title || target.name}`
    );

    channel.refreshToken =
        tokens.refresh_token;

    fs.writeFileSync(
        FILE,
        JSON.stringify(
            channels,
            null,
            2
        ) + "\n",
        "utf8"
    );

    console.log(
        `${target.name} TOKEN VERIFIED + SAVED`
    );
}

for (const target of TARGETS) {
    await authorize(target);
}

console.log("");
console.log("==============================");
console.log("LONGFORM OAUTH READY");
console.log("==============================");



