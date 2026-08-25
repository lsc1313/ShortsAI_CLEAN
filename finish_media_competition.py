from pathlib import Path
import shutil
from datetime import datetime
import re

stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

IMAGE = Path("modules/image.js")
VIDEO = Path("modules/video.js")


def backup(path):
    dst = Path(
        str(path)
        + f".backup_before_media_competition_finish_{stamp}"
    )
    shutil.copy2(path, dst)
    print("[BACKUP]", dst)


# =====================================================
# IMAGE.JS
# =====================================================

text = IMAGE.read_text()
backup(IMAGE)

# searchVideo import
if 'from "./image/videoSearch.js"' not in text:

    pattern = r'import\s*\{\s*searchImage\s*\}\s*from\s*"\./image/search\.js";'

    match = re.search(pattern, text)

    if not match:
        raise RuntimeError(
            "searchImage import not found"
        )

    text = (
        text[:match.end()]
        + '\nimport { searchVideo } from "./image/videoSearch.js";'
        + text[match.end():]
    )


# downloadVideo import
if 'from "./video/download.js"' not in text:

    pattern = r'import\s*\{\s*downloadImage\s*\}\s*from\s*"\./image/download\.js";'

    match = re.search(pattern, text)

    if not match:
        raise RuntimeError(
            "downloadImage import not found"
        )

    text = (
        text[:match.end()]
        + '\nimport { downloadVideo } from "./video/download.js";'
        + text[match.end():]
    )


# -----------------------------------------------------
# IMAGE + VIDEO REVIEW COMPETITION
# -----------------------------------------------------

pattern = re.compile(
    r'''const result\s*=\s*
\s*await searchImage\(
\s*keyword,
\s*item
\s*\);

\s*if\(!result\)\s*\{

\s*debug\(
\s*`[^`]*REVIEW FAIL[^`]*`
\s*\);

\s*continue;
\s*\}''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "IMAGE SEARCH RESULT BLOCK not found"
    )

new_block = '''const imageResult =
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
            result.mediaType || "image";'''

text = (
    text[:match.start()]
    + new_block
    + text[match.end():]
)


# -----------------------------------------------------
# DOWNLOAD WINNER
# -----------------------------------------------------

pattern = re.compile(
    r'''const file\s*=\s*
\s*path\.join\(
\s*IMAGE_DIR,\s*
\s*`scene_\$\{sceneNo\}_\$\{imageNo\}\.jpg`
\s*\);

\s*await downloadImage\(
\s*result\.url,
\s*file
\s*\);''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "IMAGE DOWNLOAD BLOCK not found"
    )

new_block = '''let file;

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

        }'''

text = (
    text[:match.start()]
    + new_block
    + text[match.end():]
)


# mediaType 저장
marker = '''score:result.score || 0,

            width:result.width,'''

if marker not in text:
    raise RuntimeError(
        "images.push SCORE marker not found"
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

print("[PATCH] IMAGE + VIDEO competition : OK")


# =====================================================
# VIDEO.JS
# =====================================================

text = VIDEO.read_text()
backup(VIDEO)

pattern = re.compile(
    r'''let videoFile = null;[\s\S]*?
\s*if\(
\s*videoFile &&
\s*sceneType !== "ending"
\s*\)''',
    re.MULTILINE
)

match = pattern.search(text)

if not match:
    raise RuntimeError(
        "VIDEO independent search block not found"
    )

new_block = '''let videoFile = null;

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
    + new_block
    + text[match.end():]
)

VIDEO.write_text(text)

print("[PATCH] VIDEO independent search : REMOVED")
print("[PATCH] VIDEO uses Reviewer winner : OK")
print("=====================================================")
print("MEDIA COMPETITION FINISH COMPLETE")
print("=====================================================")
