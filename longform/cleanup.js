import fs from "node:fs";
import path from "node:path";

import {
    BASE_DATA_ROOT
} from "./config/paths.js";


export function cleanupLongformProduction({
    jobRoot = ""
} = {}) {

    if (!jobRoot) {
        throw new Error(
            "Longform cleanup jobRoot missing"
        );
    }


    const jobsRoot =
        path.resolve(
            BASE_DATA_ROOT,
            "jobs"
        );


    const target =
        path.resolve(
            jobRoot
        );


    /*
    jobs 루트 자체 또는 jobs 바깥은
    절대 삭제 금지
    */

    if (
        target === jobsRoot ||
        !target.startsWith(
            jobsRoot + path.sep
        )
    ) {

        throw new Error(
            `Unsafe longform cleanup target: ${target}`
        );

    }


    if (
        fs.existsSync(
            target
        )
    ) {

        fs.rmSync(
            target,
            {
                recursive: true,
                force: true
            }
        );

    }


    console.log(
        `[LONGFORM CLEANUP] JOB REMOVED: ${target}`
    );


    return true;
}


export default {
    cleanupLongformProduction
};
