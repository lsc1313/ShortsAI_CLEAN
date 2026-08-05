import * as planner from "./planner.js";

/*
    =========================================================
    BRAIN

    역할

    1. 사용자 지시 전달
    2. 작업 상태 보관
    3. UI 상태 제공
    4. PAUSE / RESUME / CANCEL 제어 신호 관리

    중요

    - Brain은 직접 쇼츠를 제작하지 않는다.
    - 실제 제작은 Planner → Manager → createShort가 담당한다.
    - 정지/취소는 현재 제작 중인 쇼츠를 강제 종료하지 않는다.
    - Manager가 다음 쇼츠를 시작하기 전에 제어 상태를 확인한다.
    =========================================================
*/


const state = {

    status: "대기",

    target: 0,

    current: 0,

    currentTopic: "",

    topics: [],

    paused: false,

    cancelled: false,

    running: false

};


/*
    =========================================================
    작업 시작
    =========================================================
*/

export async function start(job) {

    /*
        이미 실행 중이면
        새로운 Planner를 중복 실행하지 않는다.
    */

    if (state.running) {

        /*
            정지 상태라면 재개
        */

        if (state.paused) {

            return await resume();

        }


        return getStatus();

    }


    state.status = "제작중";

    state.target =
        Number(job.count) || 0;

    state.current = 0;

    state.currentTopic = "";

    state.topics = [];

    state.paused = false;

    state.cancelled = false;

    state.running = true;


    try {

        const result =
            await planner.execute(
                job,
                updateStatus
            );


        /*
            Manager가 정상적으로 끝났을 때
        */

        state.running = false;


        if (state.cancelled) {

            state.status = "취소";

        }
        else {

            state.status = "완료";

        }


        return result;

    }
    catch(error) {

        state.running = false;

        state.status = "오류";

        throw error;

    }

}


/*
    =========================================================
    Manager / Planner 보고 수신
    =========================================================
*/

export function updateStatus(update = {}) {

    /*
        정지/취소 상태는
        일반 진행 보고가 덮어쓰지 않도록 한다.
    */

    if (
        update.status !== undefined &&
        !state.paused &&
        !state.cancelled
    ) {

        state.status =
            update.status;

    }


    if (
        update.target !== undefined
    ) {

        state.target =
            Number(update.target) || 0;

    }


    if (
        update.current !== undefined
    ) {

        state.current =
            Number(update.current) || 0;

    }


    if (
        update.currentTopic !== undefined
    ) {

        state.currentTopic =
            update.currentTopic || "";

    }


    if (
        Array.isArray(update.topics)
    ) {

        state.topics = [
            ...update.topics
        ];

    }


    return getStatus();

}


/*
    =========================================================
    UI 상태 조회
    =========================================================
*/

export function getStatus() {

    return {

        status:
            state.status,

        target:
            state.target,

        current:
            state.current,

        currentTopic:
            state.currentTopic,

        topics: [
            ...state.topics
        ],

        paused:
            state.paused,

        cancelled:
            state.cancelled,

        running:
            state.running

    };

}


/*
    =========================================================
    Manager 제어 상태 조회

    Manager는 각 쇼츠 시작 직전에 이것을 확인한다.
    =========================================================
*/

export function getControlState() {

    return {

        paused:
            state.paused,

        cancelled:
            state.cancelled,

        running:
            state.running

    };

}


/*
    =========================================================
    PAUSE

    현재 쇼츠를 강제 종료하지 않는다.

    현재 쇼츠 완료 후
    Manager가 다음 쇼츠 시작 전에 멈춘다.
    =========================================================
*/

export async function pause() {

    if (!state.running) {

        return getStatus();

    }


    state.paused = true;

    /*
        정지 버튼을 눌렀지만
        현재 createShort()가 실행 중일 수 있다.

        실제 정지는 Manager가
        다음 후보 시작 직전에 확정한다.
    */

    state.status = "정지중";


    return getStatus();

}


/*
    =========================================================
    RESUME
    =========================================================
*/

export async function resume() {

    if (!state.running) {

        return getStatus();

    }


    state.paused = false;

    state.status = "제작중";


    return getStatus();

}


/*
    =========================================================
    CANCEL

    현재 쇼츠는 강제로 끊지 않는다.

    Manager가 다음 쇼츠를 시작하지 않고
    제작 루프를 종료한다.
    =========================================================
*/

export async function cancel() {

    if (!state.running) {

        state.status = "대기";

        state.target = 0;

        state.current = 0;

        state.currentTopic = "";

        state.topics = [];

        state.paused = false;

        state.cancelled = false;


        return getStatus();

    }


    state.cancelled = true;

    state.paused = false;

    state.status = "취소중";


    return getStatus();

}


/*
    =========================================================
    Manager용 PAUSE 대기

    정지 상태에서는 짧게 기다리면서
    RESUME 또는 CANCEL을 확인한다.
    =========================================================
*/

export function markPaused() {

    if (
        state.running &&
        state.paused &&
        !state.cancelled
    ) {

        state.status = "정지";

        state.currentTopic = "";

    }


    return getStatus();

}


export async function waitIfPaused() {

    while (
        state.paused &&
        !state.cancelled
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    300
                )
        );

    }


    return !state.cancelled;

}


export default {

    start,

    updateStatus,

    getStatus,

    getControlState,

    pause,

    resume,

    cancel,

    markPaused,

    waitIfPaused

};
