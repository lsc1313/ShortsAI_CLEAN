import cv from "@techstark/opencv-js";

await cv;

console.log("===== KEYS =====");

console.log(
Object.keys(cv)
.slice(0,200)
);

console.log("===== END =====");
