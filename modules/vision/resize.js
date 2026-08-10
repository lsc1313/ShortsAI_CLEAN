import fs from "fs/promises";
import path from "path";
import { Jimp } from "jimp";

const CACHE_DIR = "cache/vision_resize";

async function ensureDir() {
    await fs.mkdir(CACHE_DIR, {
        recursive: true
    });
}

export async function resizeImage(file) {

    if (!file) {
        throw new Error(
            "resizeImage(): file 없음"
        );
    }

    await ensureDir();

    const output =
        path.join(
            CACHE_DIR,
            path.basename(
                file,
                path.extname(file)
            ) + ".png"
        );

    try {

        await fs.access(output);

        return output;

    } catch {}

    const image =
        await Jimp.read(file);

    image.contain({
        w: 256,
        h: 256
    });

    await image.write(output);

    return output;

}

export async function clearResizeCache() {

    await fs.rm(
        CACHE_DIR,
        {
            recursive: true,
            force: true
        }
    );

    await ensureDir();

}
