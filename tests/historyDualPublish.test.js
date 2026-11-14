import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    buildEnglishHistoryDirector,
    buildEnglishHistoryMetadata,
    saveHistoryKOVideo,
    saveHistoryPair,
    uploadHistoryPair,
    readHistoryPair,
    findUnfinishedHistoryPair
} from "../modules/history/dualPublish.js";

test("History bilingual: one shared plan, two videos, KO upload exactly once after EN fails", async () => {
    const oldCwd = process.cwd();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "history-pair-test-"));
    try {
        process.chdir(tmp);
        fs.mkdirSync("modules/channels", { recursive: true });
        const ko = { name: "History", clientId: "a", clientSecret: "b", refreshToken: "c", channelId: "KO" };
        const en = { name: "EchoesAgo", clientId: "d", clientSecret: "e", refreshToken: "f", channelId: "EN" };
        fs.writeFileSync("modules/channels/channels.json", JSON.stringify([ko, en]));

        const director = {
            titleEn: "Test Historical Event",
            scenes: [
                { type: "global", tts: "한국어", subtitle: "한국어", scriptEn: "An event happened.", ttsEn: "An event happened.", subtitleEn: "An event happened.", imageQueries: ["historical artifact"] }
            ]
        };
        const translated = buildEnglishHistoryDirector(director);
        assert.equal(translated.scenes[0].tts, "An event happened.");
        assert.equal(director.scenes[0].tts, "한국어");
        assert.deepEqual(translated.scenes[0].imageQueries, director.scenes[0].imageQueries);
        assert.match(buildEnglishHistoryMetadata(director).description, /#Shorts/);

        const koFile = path.join(tmp, "ko.mp4");
        const enFile = path.join(tmp, "en.mp4");
        fs.writeFileSync(koFile, Buffer.alloc(12000, 1));
        fs.writeFileSync(enFile, Buffer.alloc(12000, 2));

        const topic = "test-topic";
        saveHistoryKOVideo(topic, koFile);
        saveHistoryPair({
            topic,
            englishVideo: enFile,
            koMetadata: { title: "한국어" },
            enMetadata: { title: "English" }
        });
        let koCalls = 0;
        let enCalls = 0;
        const uploader = async (_file, _meta, channel) => {
            if (channel.name === "History") {
                koCalls++;
                return { success: true, id: "ko-video", url: "https://youtu.be/ko-video" };
            }
            enCalls++;
            if (enCalls === 1) throw new Error("Temporary EN failure");
            return { success: true, id: "en-video", url: "https://youtu.be/en-video" };
        };

        await assert.rejects(uploadHistoryPair(topic, ko, { uploader }), /Temporary EN failure/);
        assert.equal(readHistoryPair(topic).ko.id, "ko-video");
        assert.equal(readHistoryPair(topic).en.id, "");
        assert.equal(findUnfinishedHistoryPair().topic, topic);

        const result = await uploadHistoryPair(topic, ko, { uploader });
        assert.equal(result.ko.id, "ko-video");
        assert.equal(result.en.id, "en-video");
        assert.equal(koCalls, 1);
        assert.equal(enCalls, 2);
        assert.equal(findUnfinishedHistoryPair(), null);

        await uploadHistoryPair(topic, ko, { uploader });
        assert.equal(koCalls, 1);
        assert.equal(enCalls, 2);
    } finally {
        process.chdir(oldCwd);
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test("History bilingual rejects missing English narration", () => {
    assert.throws(
        () => buildEnglishHistoryDirector({ titleEn: "Title", scenes: [{ scriptEn: "text" }] }),
        /HISTORY_EN_SCENE_1_INCOMPLETE/
    );
});

test("History bilingual persists YouTube ID even if post-insert code throws", async () => {
    const oldCwd = process.cwd();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "history-pair-insert-"));
    try {
        process.chdir(tmp);
        fs.mkdirSync("modules/channels", { recursive: true });
        const ko = { name: "History", clientId: "a", clientSecret: "b", refreshToken: "c", channelId: "KO" };
        const en = { name: "EchoesAgo", clientId: "d", clientSecret: "e", refreshToken: "f", channelId: "EN" };
        fs.writeFileSync("modules/channels/channels.json", JSON.stringify([ko, en]));
        const koFile = path.join(tmp, "ko.mp4");
        const enFile = path.join(tmp, "en.mp4");
        fs.writeFileSync(koFile, Buffer.alloc(12000));
        fs.writeFileSync(enFile, Buffer.alloc(12000));
        saveHistoryKOVideo("crash-topic", koFile);
        saveHistoryPair({
            topic: "crash-topic", englishVideo: enFile,
            koMetadata: { title: "KO" }, enMetadata: { title: "EN" }
        });
        let koCalls = 0;
        const crashAfterInsert = async (_file, _meta, channel, _topic, _thumbnail, _hotdeal, onInserted) => {
            if (channel.name === "History") {
                koCalls++;
                await onInserted({ id: "uploaded-before-crash", url: "https://youtu.be/uploaded-before-crash" });
                throw new Error("process failed after successful YouTube insert");
            }
            return { success: true, id: "english-id" };
        };
        await assert.rejects(
            uploadHistoryPair("crash-topic", ko, { uploader: crashAfterInsert }),
            /process failed after successful/
        );
        assert.equal(readHistoryPair("crash-topic").ko.id, "uploaded-before-crash");
        const recovery = await uploadHistoryPair("crash-topic", ko, {
            uploader: async (_f, _m, channel) => {
                assert.equal(channel.name, "EchoesAgo");
                return { success: true, id: "english-id" };
            }
        });
        assert.equal(recovery.ko.id, "uploaded-before-crash");
        assert.equal(recovery.en.id, "english-id");
        assert.equal(koCalls, 1);
    } finally {
        process.chdir(oldCwd);
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});
