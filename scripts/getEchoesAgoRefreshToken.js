import http from "http";
import fs from "fs";
import { google } from "googleapis";
import open from "open";

const PORT = 3001;

const channels = JSON.parse(
    fs.readFileSync("./modules/channels/channels.json", "utf8")
);

const channel = channels.find(item => item.name === "EchoesAgo");

if (!channel) throw new Error("EchoesAgo channel not found");
if (!channel.clientId || !channel.clientSecret) {
    throw new Error("EchoesAgo clientId/clientSecret missing");
}

const oauth2Client = new google.auth.OAuth2(
    channel.clientId,
    channel.clientSecret,
    "http://localhost:" + PORT
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
    ]
});

console.log("");
console.log("EchoesAgo OAuth authorization");
console.log("A browser window will open. Sign in to the EchoesAgo owner account.");
console.log("");

try { await open(authUrl); }
catch { console.log(authUrl); }

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:" + PORT);
    const code = url.searchParams.get("code");

    if (!code) {
        res.end("No Code");
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error("Refresh token was not returned");
        }

        console.log("");
        console.log("==============================");
        console.log("ECHOESAGO REFRESH TOKEN");
        console.log("==============================");
        console.log("");
        console.log(tokens.refresh_token);
        console.log("");
        console.log("==============================");
        console.log("");

        res.end("EchoesAgo authorization complete. Return to the terminal.");
    } catch (err) {
        console.error("AUTH FAILED:", err.message);
        res.end("Authorization failed");
    }

    server.close(() => process.exit());
});

server.listen(PORT, () => {
    console.log("Callback Port : " + PORT);
});
