import { createShoppingDirector } from "./shopping/director.js";

import { createImage } from "./image.js";
import { createTTS } from "./tts.js";
import { createSubtitle } from "./subtitle.js";
import { createVideo } from "./video.js";
import { createMetadata } from "./metadata.js";
import { uploadVideo } from "./upload.js";

import {
    step,
    success
} from "./logger.js";

export async function createShort(
    topic,
    channel,
    options={}
){

    const product =
        options.product;

    step("DIRECTOR");

    const director =
        await createShoppingDirector(
            product
        );

    success("DIRECTOR 완료");

    step("IMAGE");

    const images =
        await createImage(
            director
        );

    success("IMAGE 완료");

    step("TTS");

    const voices =
        await createTTS(
            director
        );

    success("TTS 완료");

    step("SUBTITLE");

    const subtitle =
        await createSubtitle(
            director,
            voices
        );

    success("SUBTITLE 완료");

    step("VIDEO");

    const video =
        await createVideo(
            director,
            images,
            voices
        );

    success("VIDEO 완료");

    step("METADATA");

    const metadata =
        await createMetadata(
            director,
            product
        );

    success("METADATA 완료");

    step("UPLOAD");

await uploadVideo(
    video.file,
    metadata,
    channel,
    topic,
    metadata.thumbnail
);

    success("UPLOAD 완료");

    return {
        director,
        images,
        voices,
        subtitle,
        video,
        metadata
    };

}
