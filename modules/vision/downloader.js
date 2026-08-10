import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = "cache/vision";

async function ensureCacheDir() {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

function getExtension(url) {

    try {

        const pathname =
            new URL(url).pathname;

        const ext =
            path.extname(pathname).toLowerCase();

        if (
            ext &&
            ext.length <= 5
        ) {
            return ext;
        }

    } catch {}

    return ".jpg";

}

function buildFilename(url) {

    const hash =
        crypto
            .createHash("sha1")
            .update(url)
            .digest("hex");

    return hash + getExtension(url);

}

export async function downloadImage(url) {

    if (
        typeof url !== "string" ||
        !url.trim()
    ) {
        throw new Error("downloadImage(): URL 없음");
    }

    await ensureCacheDir();

    const filename =
        buildFilename(url);

    const filepath =
        path.join(
            CACHE_DIR,
            filename
        );

    try {

        await fs.access(filepath);

        return filepath;

    } catch {}

    const response =
        await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0"
            }
        });

    if (!response.ok) {

        throw new Error(
            "이미지 다운로드 실패 : " +
            response.status
        );

    }

    const buffer =
        Buffer.from(
            await response.arrayBuffer()
        );

    await fs.writeFile(
        filepath,
        buffer
    );

    return filepath;

}

export async function clearVisionCache() {

    await fs.rm(
        CACHE_DIR,
        {
            recursive: true,
            force: true
        }
    );

    await ensureCacheDir();

}
