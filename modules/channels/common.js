import trendService from "../services/trendService.js";
import proposalService from "../services/proposalService.js";
import duplicateService from "../services/duplicateService.js";
import scoringService from "../services/scoringService.js";


export async function runChannel(
    config
) {

    const targetCount =
        Math.max(
            1,
            Number(config.count) || 1
        );


    /*
        후보는 요청량보다 여유 있게 만든다.

        중복 제거 후에도
        targetCount를 확보하기 위함.
    */

    const candidateTarget =
        Math.ceil(
            targetCount * 1.5
        );


    /*
        =====================================================
        1순위 : TREND

        AI가 이미 channel을 분류했다.

        따라서 여기서는 의미판단을 하지 않는다.

        자기 channel Trend만 직접 가져온다.
        =====================================================
    */

    const trends =
        trendService.getTrendingTopics(
            config.category,
            candidateTarget
        );


    console.log(
        `[${config.name}] Trend : ${trends.length}`
    );


    let topics =
        await proposalService.generateTopics(
            trends,
            config
        );


    /*
        과거 업로드 + 현재 후보 내부 중복 제거
    */

    topics =
        await duplicateService.filterDuplicates(
            topics
        );


    /*
        =====================================================
        2순위 : GENERAL

        Trend가 부족하면 일반주제로 채운다.

        여기서는 AI를 호출하지 않는다.
        =====================================================
    */

    if (
        topics.length <
        candidateTarget
    ) {

        const needed =
            candidateTarget -
            topics.length;


        const general =
            await proposalService.generateGeneralTopics(
                config,
                needed,
                topics
            );


        topics.push(
            ...general
        );


        topics =
            await duplicateService.filterDuplicates(
                topics
            );

    }


    /*
        점수화
    */

    topics =
        await scoringService.scoreTopics(
            topics,
            config
        );


    console.log(
        `[${config.name}] 후보 : ${topics.length}`
    );


    return topics;

}
