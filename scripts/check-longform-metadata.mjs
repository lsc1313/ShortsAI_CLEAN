import fs from "node:fs";
import { google } from "googleapis";

const channels = JSON.parse(
    fs.readFileSync("./modules/channels/channels.json", "utf8")
      .replace(/^\uFEFF/, "")
);

const targets = [
    { name: "History",   id: "0MPrCAbXRvo" },
    { name: "EchoesAgo", id: "_7SYjNOnd3M" }
];

for (const target of targets) {
    const channel = channels.find(x => x.name === target.name);

    const auth = new google.auth.OAuth2(
        channel.clientId,
        channel.clientSecret
    );

    auth.setCredentials({
        refresh_token: channel.refreshToken
    });

    const youtube = google.youtube({
        version: "v3",
        auth
    });

    const r = await youtube.videos.list({
        part: ["snippet"],
        id: [target.id]
    });

    const s = r.data.items?.[0]?.snippet;

    console.log("\n==============================");
    console.log(target.name);
    console.log("==============================");
    console.log("TITLE:");
    console.log(s?.title || "");
    console.log("\nDESCRIPTION:");
    console.log(s?.description || "");
    console.log("\nTAGS:");
    console.log(s?.tags || []);
}

