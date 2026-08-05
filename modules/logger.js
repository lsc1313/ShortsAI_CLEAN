const DEBUG =
    process.env.DEBUG === "true";

export function log(...msg){

    console.log(...msg);

}

export function debug(...msg){

    if(DEBUG){

        console.log(...msg);

    }

}

export function section(title){

    console.log("");

    console.log(
        "==========",
        title,
        "=========="
    );

}

export function success(title){

    console.log(
        "✔",
        title
    );

}

export function error(title){

    console.log(
        "✖",
        title
    );

}

export function step(title){

    console.log(
        "▶",
        title
    );

}
