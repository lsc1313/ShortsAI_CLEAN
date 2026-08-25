from pathlib import Path
from datetime import datetime
import shutil
import re

IMAGE = Path("modules/image.js")
VIDEO_SEARCH = Path("modules/image/videoSearch.js")
VIDEO = Path("modules/video.js")

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")


def backup(path):
    dst = Path(str(path) + f".backup_before_media_competition_v2_{stamp}")
    shutil.copy2(path, dst)
    print(f"[BACKUP] {dst}")


# =====================================================
# VIDEO SEARCH
# =====================================================

text = VIDEO_SEARCH.read_text()

if 'from "../ai/reviewerAI.js"' not in text:
    marker = 'import {\n    searchPexelsVideo\n} from "../providers/pexelsVideoProvider.js";'

    if marker not in text:
        raise RuntimeError("videoSearch reviewer import marker not found")

    backup(VIDEO_SEARCH)

    text = text.replace(
        marker,
        marker + '\nimport { reviewImage } from "../ai/reviewerAI.js";',
        1
    )
else:
    backup(VIDEO_SEARCH)


# primary video candidate
if 'candidate.mediaType =\n                        "video";' not in text:

    marker = '''candidate.searchPriority =
                        100;'''

    if marker not in text:
        raise RuntimeError("video primary searchPriority not found")

    text = text.replace(
        marker,
        marker + '''

                    candidate.mediaType =
                        "video";''',
        1
    )


# fallback video candidate
if 'candidate.mediaType =\n                            "video";' not in text:

    marker = '''candidate.searchPriority =
                            50;'''

    if marker not in text:
        raise RuntimeError("video fallback searchPriority not found")

    text = text.replace(
        marker,
        marker + '''

                        candidate.mediaType =
                            "video";''',
        1
    )


# =====================================================
# FINAL VIDEO SELECTION
# =====================================================

pattern = re.compile(
    r'''uniqueCandidates\.sort\([\s\S]*?return best;''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "videoSearch final selection block not found by regex"
    )

new_final = '''const reviewed = [];

    for(
        const candidate of uniqueCandidates
    ){

        const result =
            await reviewImage(
                candidate,
                scene
            );

        if(
            !result
        ){
            continue;
        }

        result.mediaType =
            "video";

        result.searchPriority =
            candidate.searchPriority;

        result.primarySubject =
            candidate.primarySubject;

        result.keyword =
            candidate.keyword;

        result.provider =
            candidate.provider;

        result.score =
            Number(
                result.score ||
                candidate.score ||
                0
            );

        reviewed.push(
            result
        );
    }

    if(
        reviewed.length === 0
    ){
        return null;
    }

    reviewed.sort(
        (a,b) =>
            Number(
                b.score || 0
            ) -
            Number(
                a.score || 0
            )
    );

    return reviewed[0];'''

text = (
    text[:match.start()]
    + new_final
    + text[match.end():]
)

VIDEO_SEARCH.write_text(text)

print("[PATCH] Video candidates -> Reviewer")
print("[PATCH] Video final candidate -> mediaType video")


# =====================================================
# IMAGE.JS
# =====================================================

text = IMAGE.read_text()

backup(IMAGE)

if 'from "./image/videoSearch.js"' not in text:

    marker = 'import { searchImage } from "./image/search.js";'

    if marker not in text:
        raise RuntimeError("image search import not found")

    text = text.replace(
        marker,
        marker + '\nimport { searchVideo } from "./image/videoSearch.js";',
        1
    )


if 'from "./video/download.js"' not in text:

    marker = '''import {
    downloadImage
} from "./image/download.js";'''

    if marker not in text:
        raise RuntimeError("downloadImage import not found")

    text = text.replace(
        marker,
        marker + '\nimport { downloadVideo } from "./video/download.js";',
        1
    )


# image result -> image + video competition
pattern = re.compile(
    r'''const result\s*=\s*
            await searchImage\(
                keyword,
                item
            \);

        if\(!result\)\{[\s\S]*?
        \}\s*''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "image.js searchImage result block not found"
    )

new_result = '''const imageResult =
            await searchImage(
                keyword,
                item
            );

        const videoResult =
            await searchVideo(
                keyword,
                item
            );

        const mediaCandidates = [
            imageResult,
            videoResult
        ]
            .filter(Boolean)
            .filter(
                candidate =>
                    candidate?.url &&
                    !usedUrls.has(
                        candidate.url
                    )
            );

        mediaCandidates.sort(
            (a,b) =>
                Number(
                    b.score || 0
                ) -
                Number(
                    a.score || 0
                )
        );

        const result =
            mediaCandidates[0] || null;

        if(!result){

            debug(
                `[IMAGE] Scene ${sceneNo} IMAGE+VIDEO REVIEW FAIL ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS} : ${keyword}`
            );

            continue;
        }

        result.mediaType =
            result.mediaType || "image";

'''

text = (
    text[:match.start()]
    + new_result
    + text[match.end():]
)


# download image/video
pattern = re.compile(
    r'''const file\s*=\s*
            path\.join\(
                IMAGE_DIR,
                `scene_\$\{sceneNo\}_\$\{imageNo\}\.jpg`
            \);

        await downloadImage\(
            result\.url,
            file
        \);[\s\S]*?
        fs\.copyFileSync\(
            file,
            cache
        \);''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "image.js download block not found"
    )

new_download = '''let file;

        if(
            result.mediaType === "video"
        ){

            file =
                path.join(
                    "media/video",
                    `scene_${sceneNo}_stock.mp4`
                );

            await downloadVideo(
                result.url,
                file
            );

        }
        else{

            file =
                path.join(
                    IMAGE_DIR,
                    `scene_${sceneNo}_${imageNo}.jpg`
                );

            await downloadImage(
                result.url,
                file
            );

        }

        if(
            !fs.existsSync(file)
        ){
            continue;
        }

        const size =
            fs.statSync(file).size;

        const minimumSize =
            result.mediaType === "video"
                ? 10000
                : 5000;

        if(
            size < minimumSize
        ){

            fs.unlinkSync(file);

            continue;
        }

        if(
            result.mediaType !== "video"
        ){

            fs.copyFileSync(
                file,
                cache
            );

        }'''

text = (
    text[:match.start()]
    + new_download
    + text[match.end():]
)


# mediaType in images[]
marker = '''score:result.score || 0,

            width:result.width,'''

if marker not in text:
    raise RuntimeError(
        "images.push score marker not found"
    )

text = text.replace(
    marker,
    '''score:result.score || 0,

            mediaType:
                result.mediaType || "image",

            width:result.width,''',
    1
)

IMAGE.write_text(text)

print("[PATCH] Image + Video score competition")
print("[PATCH] Existing image fallback preserved")


# =====================================================
# VIDEO.JS
# =====================================================

text = VIDEO.read_text()

backup(VIDEO)

pattern = re.compile(
    r'''let videoFile = null;[\s\S]*?
        \nif\(
    videoFile &&
    sceneType !== "ending"
\)''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "video.js independent video search block not found"
    )

replacement = '''let videoFile = null;

const selectedVideo =
    imageList.find(
        img =>
            img?.mediaType === "video" &&
            img?.file &&
            fs.existsSync(img.file)
    );

if(
    selectedVideo
){

    videoFile =
        selectedVideo.file;

    debug(
        `Scene ${i+1}`,
        "VIDEO SELECTED BY MEDIA REVIEWER",
        selectedVideo.provider,
        selectedVideo.score
    );

}

if(
    videoFile &&
    sceneType !== "ending"
)'''

text = (
    text[:match.start()]
    + replacement
    + text[match.end():]
)

VIDEO.write_text(text)

print("[PATCH] video.js independent search removed")
print("[PATCH] Reviewer-selected video used")
print("=====================================================")
print("MEDIA COMPETITION PATCH COMPLETE")
print("=====================================================")
