import http from "http";
import { google } from "googleapis";
import open from "open";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3002;

const oauth2Client = new google.auth.OAuth2(
    process.env.BLOGGER_CLIENT_ID,
    process.env.BLOGGER_CLIENT_SECRET,
    `http://localhost:${PORT}`
);

const scopes = [
    "https://www.googleapis.com/auth/blogger"
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes
});

console.log("");
console.log("========================================");
console.log("Blogger OAuth 인증");
console.log("========================================");
console.log("");
console.log(authUrl);
console.log("");

try {
    await open(authUrl);
} catch (e) {}

http.createServer(async (req, res) => {

    const url = new URL(
        req.url,
        `http://localhost:${PORT}`
    );

    const code = url.searchParams.get("code");

    if (!code) {
        res.end("No Code");
        return;
    }

    try {

        const { tokens } =
            await oauth2Client.getToken(code);

        console.log("");
        console.log("========== BLOGGER 인증 완료 ==========");
        console.log("");

        console.log("Refresh Token");
        console.log(tokens.refresh_token || "(없음)");

        console.log("");

        console.log("Access Token");
        console.log(tokens.access_token || "(없음)");

        console.log("");

        console.log("Scope");
        console.log(tokens.scope || "(확인 불가)");

        console.log("");

        res.end(
            "Blogger 인증 완료. 터미널을 확인하세요."
        );

    } catch (err) {

        console.error("");
        console.error("========== BLOGGER 인증 실패 ==========");
        console.error("");
        console.error(
            err?.response?.data ||
            err?.message ||
            err
        );

        res.end("Blogger 인증 실패");

    }

    process.exit();

}).listen(PORT, () => {

    console.log(
        `Callback Port : ${PORT}`
    );

});

