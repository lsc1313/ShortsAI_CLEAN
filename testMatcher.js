import {
    downloadImage,
    compareImages
} from "./modules/vision/index.js";

const tests = [

{
    name: "같은 이미지",
    url1: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945281/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_4a144d2d6bb121ba.jpg",
    url2: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945281/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_4a144d2d6bb121ba.jpg"
},

{
    name: "같은 상품 (1 ↔ 2)",
    url1: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945281/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_4a144d2d6bb121ba.jpg",
    url2: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945282/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_14d9214294c6d915.jpg"
},

{
    name: "같은 상품 (1 ↔ 3)",
    url1: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945281/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_4a144d2d6bb121ba.jpg",
    url2: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945284/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_447ebf41153d48da.jpg"
},

{
    name: "같은 상품 (2 ↔ 3)",
    url1: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945282/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_14d9214294c6d915.jpg",
    url2: "https://res.cloudinary.com/b25wctyv/image/upload/v1785945284/shortsai/blog/products/product_0e7458ff-ea93-4633-aa15-f1b056d9084d_447ebf41153d48da.jpg"
}

];

for(const t of tests){

    const file1 = await downloadImage(t.url1);
    const file2 = await downloadImage(t.url2);

    const result =
        await compareImages(file1,file2);

    console.log();
    console.log("=================================");
    console.log(t.name);
    console.log("SCORE :", result.score);
    console.log("=================================");

}
