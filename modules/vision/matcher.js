import { resizeImage } from "./resize.js";
import { createHash, hashScore } from "./phash.js";

export async function compareImages(image1, image2) {

    const resized1 = await resizeImage(image1);
    const resized2 = await resizeImage(image2);

    const hash1 = await createHash(resized1);
    const hash2 = await createHash(resized2);

    return {
        score: hashScore(hash1, hash2),
        hash1,
        hash2
    };
}
