import { Planner } from "./planner.js";
import { Manager } from "./manager.js";

export class Brain {

    constructor({
        planner,
        manager,
        ui,
        logger = console
    }) {

        this.planner = planner;
        this.manager = manager;
        this.ui = ui;
        this.logger = logger;

    }

    /*
    ======================================
        회장 명령
    ======================================
    */

    async quickGenerate(request) {

        this.reportUI("빠른생성 시작");

        return await this.planner.quickGenerate(request);

    }

    async autoGenerate(request) {

        this.reportUI("일괄자동생성 시작");

        return await this.planner.autoGenerate(request);

    }

    async customGenerate(request) {

        this.reportUI("지정자동생성 시작");

        return await this.planner.customGenerate(request);

    }

    /*
    ======================================
        생산 제어
    ======================================
    */

    async pause() {

        this.reportUI("작업 일시정지");

        return await this.manager.pause();

    }

    async resume() {

        this.reportUI("작업 재시작");

        return await this.manager.resume();

    }

    async cancel() {

        this.reportUI("작업 취소");

        return await this.manager.cancel();

    }

    /*
    ======================================
        Manager 보고
    ======================================
    */

    receiveProgress(progress) {

        this.reportUI(progress);

    }

    receiveComplete(result) {

        this.reportUI(result);

    }

    receiveError(error) {

        this.reportUI(error);

    }

    /*
    ======================================
        UI 보고
    ======================================
    */

    reportUI(message) {

        this.logger.log(message);

        if (
            this.ui &&
            typeof this.ui.update === "function"
        ) {

            this.ui.update(message);

        }

    }

}
