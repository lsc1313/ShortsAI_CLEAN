import axios from "axios";
import fs from "fs";

export async function downloadVideo(
    url,
    file
){

    const res =
        await axios.get(
            url,
            {
                responseType:"arraybuffer",
                timeout:60000
            }
        );

    fs.writeFileSync(
        file,
        res.data
    );

}
