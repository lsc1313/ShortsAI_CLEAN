import http from "node:http";
import fs from "node:fs";
import { google } from "googleapis";
import open from "open";

const PORT = 3001;
const FILE = "./modules/channels/channels.json";
const BACKUP = "./modules/channels/channels.json.before-echoesago-oauth-repair";

const channels = JSON.parse(
    fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "")
);

const channel = channels.find(
    item => item.name === "EchoesAgo"
);

if (!channel) {
    throw new Error("EchoesAgo channel not found");
}

if (!channel.clientId || !channel.clientSecret) {
    throw new Error("EchoesAgo OAuth client missing");
}

const oauth = new google.auth.OAuth2(
    channel.clientId,
    channel.clientSecret,
    `http://localhost:${PORT}`
);

const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
        "https://www.googleapis.com/auth/youtube.upload"
    ]
});

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(
            req.url,
            `http://localhost:${PORT}`
        );

        const code = url.searchParams.get("code");

        if (!code) {
            res.end("No authorization code.");
            return;
        }

        const { tokens } =
            await oauth.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error(
                "Google returned no refresh_token"
            );
        }

        /*
         * 저장 전에 새 토큰 자체를 즉시 검증한다.
         */
        oauth.setCredentials({
            refresh_token: tokens.refresh_token
        });

        await oauth.getAccessToken();

        console.log("");
        console.log("TOKEN VERIFIED");

        if (!fs.existsSync(BACKUP)) {
            fs.copyFileSync(FILE, BACKUP);
        }

        channel.refreshToken =
            tokens.refresh_token;

        fs.writeFileSync(
            FILE,
            JSON.stringify(channels, null, 2) + "\n",
            "utf8"
        );

        console.log(
            "CHANNELS.JSON UPDATED"
        );
        console.log(
            "ECHOESAGO OAUTH REPAIR COMPLETE"
        );

        res.end(
            "EchoesAgo OAuth OK. You can close this window."
        );
    }
    catch (error) {
        console.error(
            "OAUTH REPAIR FAILED:",
            error.message
        );

        res.end(
            "OAuth failed. Check terminal."
        );
    }
    finally {
        server.close();
    }
});

server.listen(PORT, async () => {
    console.log(
        `Callback Port : ${PORT}`
    );

    try {
        await open(authUrl);
    }
    catch {
        console.log(authUrl);
    }
});
