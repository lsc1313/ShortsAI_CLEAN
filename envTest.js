import "dotenv/config";

console.log("dotenv =", process.env.OPENROUTER_API_KEY ? "OK" : "FAIL");

if(process.env.OPENROUTER_API_KEY){
    console.log(
        process.env.OPENROUTER_API_KEY.substring(0,12)
    );
}
