import cv from "@techstark/opencv-js";

console.log("===== OpenCV TEST =====");

try {

    await cv;

    console.log("OpenCV Loaded : OK");

    console.log("Version :", cv.getBuildInformation ?
        "BuildInfo Available" :
        "Unknown");

    const mat =
        new cv.Mat(
            100,
            100,
            cv.CV_8UC3
        );

    console.log(
        "Mat :",
        mat.rows,
        "x",
        mat.cols
    );

    mat.delete();

    console.log("===== SUCCESS =====");

} catch (e) {

    console.error("FAILED");
    console.error(e);

}
