import axios from "axios";
import fs from "fs";

export async function downloadImage(
    url,
    file
){

    const res = await axios.get(

        url,

        {
            responseType:"arraybuffer",
            timeout:30000
        }

    );

    fs.writeFileSync(
        file,
        res.data
    );

}
