/*
=====================================================
SHORTSAI VIDEO EFFECT ENGINE V4
=====================================================

Director 연출값 반영

shot
    establishing
    wide
    medium
    closeup
    macro

cameraMove
    static
    push_in
    pull_out
    pan_left
    pan_right
    tilt_up
    tilt_down

motion
    none
    zoom_in
    zoom_out
    slow_zoom
    shake
    parallax

=====================================================
*/


function getShotZoom(shot){

    switch(String(shot || "").toLowerCase()){

        case "establishing":
            return 1.00;

        case "wide":
            return 1.02;

        case "medium":
            return 1.06;

        case "closeup":
            return 1.12;

        case "macro":
            return 1.18;

        default:
            return 1.05;
    }

}


function getZoomExpression(
    frames,
    shot,
    motion
){

    const lastFrame =
        Math.max(
            1,
            Number(frames) - 1
        );

    const base =
        getShotZoom(shot);

    switch(
        String(motion || "slow_zoom").toLowerCase()
    ){

        case "none":

            return `${base}`;

        case "zoom_in":

            return `${base}+(on/${lastFrame})*0.16`;

        case "zoom_out":

            return `${base+0.16}-(on/${lastFrame})*0.16`;

        case "slow_zoom":

            return `${base}+(on/${lastFrame})*0.10`;

        case "shake":

            return `${base}+sin(on*0.8)*0.008`;

        case "parallax":

            return `${base}+(on/${lastFrame})*0.08`;

        default:

            return `${base}+(on/${lastFrame})*0.10`;
    }

}


function getCameraPosition(
    frames,
    cameraMove
){

    const lastFrame =
        Math.max(
            1,
            Number(frames) - 1
        );

    switch(
        String(cameraMove || "static").toLowerCase()
    ){

        case "pan_left":

            return {
                x:
                    `(iw-iw/zoom)*(1-on/${lastFrame})`,
                y:
                    `ih/2-(ih/zoom/2)`
            };


        case "pan_right":

            return {
                x:
                    `(iw-iw/zoom)*(on/${lastFrame})`,
                y:
                    `ih/2-(ih/zoom/2)`
            };


        case "tilt_up":

            return {
                x:
                    `iw/2-(iw/zoom/2)`,
                y:
                    `(ih-ih/zoom)*(1-on/${lastFrame})`
            };


        case "tilt_down":

            return {
                x:
                    `iw/2-(iw/zoom/2)`,
                y:
                    `(ih-ih/zoom)*(on/${lastFrame})`
            };


        case "push_in":
        case "pull_out":
        case "static":
        default:

            return {
                x:
                    `iw/2-(iw/zoom/2)`,
                y:
                    `ih/2-(ih/zoom/2)`
            };
    }

}


export function getDirectorEffect(
    frames = 180,
    options = {}
){

    const shot =
        options.shot || "medium";

    const cameraMove =
        options.cameraMove || "static";

    const motion =
        options.motion || "slow_zoom";


    /*
    push_in / pull_out은
    cameraMove 자체가 Zoom 방향을 결정하도록 보정
    */

    let zoomMotion =
        motion;


    if(cameraMove === "push_in"){
        zoomMotion = "zoom_in";
    }

    if(cameraMove === "pull_out"){
        zoomMotion = "zoom_out";
    }


    const zoom =
        getZoomExpression(
            frames,
            shot,
            zoomMotion
        );


    const position =
        getCameraPosition(
            frames,
            cameraMove
        );


    return `zoompan=
z='${zoom}':
x='${position.x}':
y='${position.y}':
d=1:
s=2160x3840:
fps=30`;

}


/*
=====================================================
기존 GLOBAL
=====================================================
*/

export function getGlobalEffect(
    frames = 180
){

    return getDirectorEffect(
        frames,
        {
            shot: "medium",
            cameraMove: "static",
            motion: "slow_zoom"
        }
    );

}


/*
=====================================================
기존 RANKING
=====================================================
*/

export function getRankingEffect(
    frames = 60
){

    return getDirectorEffect(
        frames,
        {
            shot: "medium",
            cameraMove: "static",
            motion: "slow_zoom"
        }
    );

}


/*
=====================================================
기존 코드 호환
=====================================================
*/

export function getEffect(){

    return getGlobalEffect(180);

}


/*
=====================================================
기존 SHOPPING 효과

Director 값이 없을 때 사용하는 fallback
=====================================================
*/

export function getShoppingEffect(
    type,
    frames = 180
){

    const lastFrame =
        Math.max(
            1,
            Number(frames) - 1
        );


    switch(type){

        case "hook":

            return `zoompan=
z='1+(on/${lastFrame})*0.22':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;


        case "usage":

            return `zoompan=
z='1.08':
x='(iw-iw/zoom)*(on/${lastFrame})':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;


        case "lifestyle":

            return `zoompan=
z='1+(on/${lastFrame})*0.12':
x='iw/2-(iw/zoom/2)':
y='(ih-ih/zoom)*(on/${lastFrame})':
d=1:
s=2160x3840:
fps=30`;


        case "detail":

            return `zoompan=
z='1+(on/${lastFrame})*0.28':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;


        case "result":

            return `zoompan=
z='1.18-(on/${lastFrame})*0.08':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;


        case "cta":

            return `zoompan=
z='1+(on/${lastFrame})*0.08':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;


        default:

            return getGlobalEffect(frames);

    }

}
