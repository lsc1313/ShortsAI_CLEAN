import {
downloadImage,
resizeImage,
createHash
}
from "./modules/vision/index.js";

const file =
await downloadImage(
"https://res.cloudinary.com/b25wctyv/image/upload/v1785945281/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_4a144d2d6bb121ba.jpg"
);

const resized =
await resizeImage(file);

const hash =
await createHash(resized);

console.log(hash);
