import { createShort }
from "../modules/createShort.js";

import {
    createBlog
} from "../modules/blog/blogFactory.js";

import {
    createScienceBlog
} from "../modules/blog/scienceBlogFactory.js";

import {
    createLinkPage
} from "../modules/link/index.js";

import {
    getControlState,
    markPaused,
    waitIfPaused
} from "./brain.js";

import channels
from "../modules/channels/channels.json"
with { type: "json" };

import {
    getBlockedChannels,
    blockChannel,
    unblockChannel
} from "./channelBlockStore.js";

import {
    processChannelQueue
} from "../modules/queueUploader.js";


export class Manager {

    constructor(logger = console) {

        this.logger = logger;

    }


    async execute(
        planner,
        reporter = null
    ) {

        this.logger.log(
            "[Manager] Start"
        );


        /*
            =================================================
            Planner가 준비한 후보만 사용한다.

            목표 수량을 억지로 채우지 않는다.

            후보가 부족하거나
            사용할 수 없는 채널이 있어도
            추가 후보 생성 / 무한 보충하지 않는다.
            =================================================
        */

        const target =
            planner.job.count;

        /*
            영구 업로드 차단 채널 로드

            서버 재시작 후에도 유지되며
            최초 후보 선택부터 제외한다.
        */
        const blockedChannels =
            getBlockedChannels();

        if (blockedChannels.size > 0) {

            this.logger.log(
                `[Manager] 저장된 차단 채널 : ${
                    [...blockedChannels.keys()].join(", ")
                }`
            );

            /*
                =============================================
                BLOCKED CHANNEL QUEUE RECOVERY

                YouTube 업로드 제한으로 차단된 채널은
                새 영상을 제작하기 전에 보관된 Queue 영상으로
                업로드 가능 여부를 먼저 확인한다.

                성공:
                    Queue 처리
                    영구 차단 해제
                    현재 실행 차단 Map에서도 제거

                업로드 제한 유지:
                    Queue 보존
                    차단 유지
                    신규 영상 제작 금지

                일반 오류:
                    안전을 위해 차단 유지
                =============================================
            */

            for (
                const channelName
                of [...blockedChannels.keys()]
            ) {

                const channel =
                    this.getChannel(
                        channelName
                    );

                if (!channel) {

                    this.logger.log(
                        `[Manager] Queue 채널 찾기 실패 : ${channelName}`
                    );

                    continue;
                }

                try {

                    this.logger.log(
                        `[Manager] Queue 업로드 확인 : ${channelName}`
                    );

                    const queueResult =
                        await processChannelQueue(
                            channel
                        );

                    /*
                        Queue 전체 처리가 정상 완료된 경우에만
                        채널 차단을 해제한다.

                        blocked === false만으로 판단하면
                        일반 업로드 오류에서도 차단이 풀릴 수 있으므로
                        success / remaining까지 함께 확인한다.
                    */
                    if (
                        queueResult?.success === true &&
                        queueResult?.blocked === false &&
                        Number(
                            queueResult?.processed || 0
                        ) > 0 &&
                        Number(
                            queueResult?.remaining || 0
                        ) === 0
                    ) {

                        unblockChannel(
                            channelName
                        );

                        blockedChannels.delete(
                            channelName
                        );

                        this.logger.log(
                            `[Manager] Queue 확인 성공 - 채널 차단 해제 : ${channelName}`
                        );

                    }
                    else if (
                        queueResult?.blocked === true
                    ) {

                        this.logger.log(
                            `[Manager] Queue 업로드 제한 유지 : ${channelName}`
                        );

                    }
                    else {

                        this.logger.log(
                            `[Manager] Queue 확인 실패 - 채널 차단 유지 : ${channelName}`
                        );

                    }

                }
                catch (error) {

                    /*
                        Queue 검사 자체에서 예상하지 못한 오류가 발생해도
                        신규 제작을 허용하지 않는다.

                        기존 차단 상태를 그대로 유지한다.
                    */

                    console.error(
                        `[Manager] Queue 검사 오류 : ${channelName}`,
                        error.message
                    );

                }

            }

        }

        const orders =
            planner.nextOrders(
                target,
                [
                    ...blockedChannels.keys()
                ]
            );


        const approved = [];

        /*
            =================================================
            후보 공급기

            필요한 수량만큼 Planner pool에서 계속 가져온다.

            - 차단 채널 제외
            - isAvailable 검사
            - 사용 불가 후보 자동 폐기
            - Planner pool 고갈 시 종료
            - 무한루프 방지
            =================================================
        */

        const supplyCandidates =
            async (
                needed,
                blockedChannels =
                    new Map()
            ) => {

                let supplied = 0;

                while (
                    supplied < needed &&
                    planner.pool.length > 0
                ) {

                    const candidates =
                        planner.nextOrders(
                            needed - supplied,
                            [
                                ...blockedChannels.keys()
                            ]
                        );

                    if (
                        candidates.length === 0
                    ) {
                        break;
                    }

                    for (
                        const candidate
                        of candidates
                    ) {

                        const available =
                            await this.isAvailable(
                                candidate
                            );

                        if (!available) {

                            this.logger.log(
                                `[Manager] 사용 불가 : ${candidate.channel} / ${candidate.topic}`
                            );

                            continue;
                        }

                        approved.push(
                            candidate
                        );

                        supplied++;

                        this.logger.log(
                            `[Manager] 후보 공급 : ${candidate.channel} / ${candidate.topic}`
                        );

                        if (
                            supplied >= needed
                        ) {
                            break;
                        }

                    }

                }

                return supplied;

            };


        /*
            현재 받은 후보를
            한 번만 검사한다.
        */

        for (const order of orders) {

            const available =
                await this.isAvailable(
                    order
                );


            if (!available) {

                this.logger.log(
                    `[Manager] 사용 불가 : ${order.channel} / ${order.topic}`
                );

                continue;

            }


            approved.push(
                order
            );

        }

        /*
            최초 요청에서 사용 불가 후보가 빠졌다면
            Planner의 남은 pool에서 즉시 보충한다.
        */

        if (
            approved.length < target
        ) {

            await supplyCandidates(
                target -
                approved.length
            );

        }



        this.logger.log(
            `[Manager] 요청 : ${planner.job.count}`
        );

        this.logger.log(
            `[Manager] 제작 가능 : ${approved.length}`
        );


        /*
            =================================================
            제작할 후보가 하나도 없으면 종료

            재생성하지 않는다.
            Planner를 다시 호출하지 않는다.
            =================================================
        */

        if (
            approved.length === 0
        ) {

            this.logger.log(
                "[Manager] 제작 가능한 후보 없음 - 종료"
            );


            if (reporter) {

                reporter({

                    status: "완료",

                    target:
                        planner.job.count,

                    current: 0,

                    currentTopic: "",

                    topics: []

                });

            }


            return true;

        }


        /*
            Brain / UI에
            실제 제작 예정 목록 보고
        */

        if (reporter) {

            reporter({

                status: "제작중",

                target:
                    planner.job.count,

                current: 0,

                currentTopic:
                    approved[0]?.topic || "",

                topics:
                    approved.map(
                        order => ({
                            topic:
                                order.topic,

                            channel:
                                order.channel,

                            status:
                                "waiting"
                        })
                    )

            });

        }


        let completed = 0;

        /*
            현재 Brain 실행에서만 유지되는
            YouTube 업로드 차단 채널 목록.

            한 채널에서 업로드 한도가 확인되면
            같은 실행의 남은 해당 채널 작업은
            제작 자체를 시작하지 않는다.
        */
        /*
            blockedChannels는 execute 시작 시
            영구 저장소에서 이미 로드됨
        */

        const topicStates =
            approved.map(
                order => ({
                    topic: order.topic,
                    channel: order.channel,
                    status: "waiting"
                })
            );


        /*
            =================================================
            승인된 후보만 그대로 제작

            실패했다고 다른 후보로 교체하지 않는다.
            =================================================
        */

        for (
            let index = 0;
            index < approved.length &&
            completed < target;
            index++
        ) {

            /*
                =============================================
                BRAIN CONTROL

                현재 쇼츠를 시작하기 직전에만 확인한다.

                PAUSE
                - 여기서 대기
                - RESUME되면 같은 후보부터 계속

                CANCEL
                - 남은 후보를 시작하지 않고 종료

                이미 실행 중인 createShort는
                강제로 중단하지 않는다.
                =============================================
            */

            const control =
                getControlState();


            if (control.cancelled) {

                this.logger.log(
                    "[Manager] 사용자 취소 - 남은 제작 종료"
                );

                break;

            }


            if (control.paused) {

                this.logger.log(
                    "[Manager] 사용자 정지 - 재개 대기"
                );


                /*
                    현재 createShort()가 끝났고
                    다음 후보 시작 직전까지 왔다.

                    여기서 실제 정지 상태를 확정한다.
                */

                markPaused();


                const canContinue =
                    await waitIfPaused();


                if (!canContinue) {

                    this.logger.log(
                        "[Manager] 정지 중 취소 - 남은 제작 종료"
                    );

                    break;

                }


                this.logger.log(
                    "[Manager] 사용자 재개"
                );

            }


            /*
                정지 대기에서 빠져나온 직후
                CANCEL이 들어왔을 가능성까지 다시 확인한다.
            */

            if (
                getControlState().cancelled
            ) {

                this.logger.log(
                    "[Manager] 사용자 취소 - 남은 제작 종료"
                );

                break;

            }


            const order =
                approved[index];


            /*
                이미 YouTube 업로드 제한이 확인된
                채널의 남은 후보는 제작하지 않는다.

                여기서 continue 되므로
                createShort()가 호출되지 않고
                AI / 이미지 / TTS / VIDEO 비용도 발생하지 않는다.
            */
            if (
                blockedChannels.has(
                    order.channel
                )
            ) {

                topicStates[index].status =
                    "blocked";

                this.logger.log(
                    `[Manager] 제작 차단 : ${order.channel} / ${order.topic} / ${blockedChannels.get(order.channel)}`
                );


                if (reporter) {

                    reporter({

                        status:
                            "제작중",

                        current:
                            completed,

                        currentTopic:
                            "",

                        topics:
                            topicStates

                    });

                }

                /*
                    후보 보충은 공통 remainingNeeded
                    계산에서만 수행한다.
                */


                /*
                    새 후보가 approved에 추가되었으면
                    UI 상태 배열에도 추가한다.
                */

                while (
                    topicStates.length <
                    approved.length
                ) {

                    const candidate =
                        approved[
                            topicStates.length
                        ];

                    topicStates.push({
                        topic:
                            candidate.topic,

                        channel:
                            candidate.channel,

                        status:
                            "waiting"
                    });

                }



                continue;

            }


            topicStates[index].status =
                "processing";

            const channel =
                this.getChannel(
                    order.channel
                );


            if (!channel) {

                this.logger.log(
                    `[Manager] Channel Not Found : ${order.channel}`
                );

                continue;

            }


            if (reporter) {

                reporter({

                    status: "제작중",

                    current:
                        completed,

                    currentTopic:
                        order.topic,

                    topics:
                        topicStates

                });

            }


            try {

                await createShort(
                    order.topic,
                    channel,
                    {
                        product:
                            order.product || null
                    }
                );


                /*
                =============================================
                BLOG FACTORY

                구조
                Manager
                  ├─ Short Factory
                  └─ Blog Factory

                실행 조건
                - 현재 작업에 실제 product가 존재
                - partnerUrl 존재
                - 상품이 비활성화 상태가 아님

                중요
                - Blog 실패는 Short 성공을 취소하지 않는다.
                - Blog Factory는 독립적인 보조 Factory다.
                - Blogger 기본 정책은 DRAFT다.
                =============================================
                */

                if (
                    order.product &&
                    order.product.partnerUrl &&
                    order.product.enabled !== false
                ) {

                    this.logger.log(
                        `[Manager] Blog Factory 시작 : ${order.product.name || order.topic}`
                    );

                    try {

                        const blogResult =
                            await createBlog(
                                order.product
                            );


                        if (
                            blogResult?.success === true
                        ) {

                            this.logger.log(
                                `[Manager] Blog Factory 완료 : ${blogResult?.content?.title || order.product.name || order.topic}`
                            );

                            this.logger.log(
                                `[Manager] Blog Mode : ${blogResult?.publish?.mode || "UNKNOWN"}`
                            );

                            if (
                                blogResult?.publish?.postId
                            ) {

                                this.logger.log(
                                    `[Manager] Blog Post ID : ${blogResult.publish.postId}`
                                );

                            }

                        }
                        else {

                            this.logger.log(
                                `[Manager] Blog Factory 결과 없음 : ${order.product.name || order.topic}`
                            );

                        }

                    }
                    catch (blogError) {

                        /*
                        Blog 실패는 Short Factory 성공을
                        실패로 변경하지 않는다.
                        */

                        console.error(
                            `[Manager] Blog Factory 실패 : ${order.product.name || order.topic}`,
                            blogError?.message || blogError
                        );

                    }

                }


                
                  /*
                  =============================================
                  SCIENCE BLOG FACTORY
                  =============================================

                  Science 채널은 상품과 관계없이
                  order.topic 기반으로 생활과학 블로그를 만든다.

                  - 기존 Shopping Blog와 완전히 분리
                  - product 불필요
                  - Science Blog 실패가 Shorts 성공을 취소하지 않는다.
                  - 기본은 DRAFT
                  =============================================
                  */


if (
    String(
        channel?.name ||
        channel?.category ||
        ""
    )
        .trim()
        .toLowerCase() === "science"
) {

                      this.logger.log(
                          `[Manager] Science Blog Factory 시작 : ${order.topic}`
                      );

                      try {

                          const scienceBlogResult =
                              await createScienceBlog(
                                  order.topic
                              );

                          if (
                              scienceBlogResult?.success === true
                          ) {

                              this.logger.log(
                                  `[Manager] Science Blog Factory 완료 : ${scienceBlogResult?.content?.title || order.topic}`
                              );

                              this.logger.log(
                                  `[Manager] Science Blog Mode : ${scienceBlogResult?.publish?.mode || "UNKNOWN"}`
                              );

                              if (
                                  scienceBlogResult?.publish?.postId
                              ) {

                                  this.logger.log(
                                      `[Manager] Science Blog Post ID : ${scienceBlogResult.publish.postId}`
                                  );

                              }

                              if (
                                  scienceBlogResult?.publish?.url
                              ) {

                                  this.logger.log(
                                      `[Manager] Science Blog URL : ${scienceBlogResult.publish.url}`
                                  );

                              }

                          }
                          else {

                              this.logger.log(
                                  `[Manager] Science Blog Factory 결과 없음 : ${order.topic}`
                              );

                          }

                      }
                      catch (scienceBlogError) {

                          console.error(
                              `[Manager] Science Blog Factory 실패 : ${order.topic}`,
                              scienceBlogError?.message ||
                              scienceBlogError
                          );

                      }

                  }

/*
                =============================================
                LINK FACTORY

                구조

                Manager
                  ├─ Short Factory
                  ├─ Blog Factory
                  └─ Link Factory

                실행 조건

                - 현재 작업에 실제 product가 존재
                - partnerUrl 존재
                - 상품이 비활성화 상태가 아님

                역할

                - 쇼핑 쇼츠에서 사용할 프로필 링크 페이지 갱신
                - 기존 상품이면 productionCount 갱신
                - 신규 상품이면 Link Record 추가
                - public/shop/index.html 재생성

                중요

                - AI 호출 없음
                - 외부 상품 분석 없음
                - 원본 Product DB 수정 없음
                - Link Factory 실패는
                  Short 성공을 취소하지 않는다.
                =============================================
                */

                if (
                    order.product &&
                    order.product.partnerUrl &&
                    order.product.enabled !== false
                ) {

                    this.logger.log(
                        `[Manager] Link Factory 시작 : ${order.product.name || order.topic}`
                    );

                    try {

                        const linkResult =
                            await createLinkPage(
                                order.product
                            );


                        if (
                            linkResult?.success === true
                        ) {

                            this.logger.log(
                                `[Manager] Link Factory 완료 : ${order.product.name || order.topic}`
                            );

                            this.logger.log(
                                `[Manager] Link Records : ${linkResult?.recordCount ?? "UNKNOWN"}`
                            );

                        }
                        else {

                            this.logger.log(
                                `[Manager] Link Factory 결과 없음 : ${order.product.name || order.topic}`
                            );

                        }

                    }
                    catch (linkError) {

                        /*
                        Link Factory 실패는
                        Short / Blog 성공을
                        실패로 변경하지 않는다.
                        */

                        console.error(
                            `[Manager] Link Factory 실패 : ${order.product.name || order.topic}`,
                            linkError?.message || linkError
                        );

                    }

                }


                completed++;

                topicStates[index].status =
                    "completed";


                this.logger.log(
                    `[Manager] 완료 : ${order.channel} / ${order.topic}`
                );

            }
            catch (error) {

                topicStates[index].status =
                    "failed";

                /*
                    한 후보 실패 때문에
                    전체 자동생성을 중단하지 않는다.

                    대신 다음 후보로 진행한다.

                    새로운 후보를 생성해서
                    실패분을 보충하지 않는다.
                */

                console.error(
                    `[Manager] 제작 실패 : ${order.channel} / ${order.topic}`,
                    error.message
                );


                /*
                    upload.js가 YouTube 업로드 한도를
                    감지해서 channelBlocked 신호를 보내면
                    현재 Brain 실행에서 해당 채널을 차단한다.
                */
                if (
                    error?.channelBlocked === true ||
                    error?.shortsAIError ===
                        "YOUTUBE_UPLOAD_LIMIT"
                ) {

                    const blockReason =
                        error?.blockReason ||
                        "UPLOAD_BLOCKED";

                    /*
                        현재 실행 즉시 차단
                    */
                    blockedChannels.set(
                        order.channel,
                        blockReason
                    );

                    /*
                        서버 재시작 후에도
                        차단 상태를 유지한다.
                    */
                    try {

                        blockChannel(
                            order.channel,
                            blockReason,
                            {
                                shortsAIError:
                                    error?.shortsAIError ||
                                    "YOUTUBE_UPLOAD_LIMIT",

                                message:
                                    error?.message || ""
                            }
                        );

                    }
                    catch (storeError) {

                        console.error(
                            "[Manager] 채널 차단 저장 실패:",
                            storeError.message
                        );

                    }

                    /*
                        이미 승인된 후보 중
                        같은 채널의 아직 시작하지 않은 작업을
                        즉시 전부 blocked 처리한다.
                    */
                    for (
                        let blockedIndex =
                            index + 1;

                        blockedIndex <
                            approved.length;

                        blockedIndex++
                    ) {

                        if (
                            approved[
                                blockedIndex
                            ]?.channel ===
                                order.channel &&
                            topicStates[
                                blockedIndex
                            ]?.status ===
                                "waiting"
                        ) {

                            topicStates[
                                blockedIndex
                            ].status =
                                "blocked";

                        }

                    }

                    this.logger.log(
                        `[Manager] 채널 업로드 차단 : ${order.channel}`
                    );

                }

            }


            /*
                =================================================
                제작 실패 후보 자동 보충

                일반 실패:
                    후보 1개 보충

                업로드 제한:
                    blockedChannels에 등록된 채널을 제외하고
                    다른 채널 후보 보충

                이미 대기 중인 정상 후보가 충분하면
                    불필요하게 더 가져오지 않는다.
                =================================================
            */

            const usableWaiting =
                approved
                    .slice(index + 1)
                    .filter(
                        (candidate, offset) => {

                            const state =
                                topicStates[
                                    index +
                                    1 +
                                    offset
                                ];

                            return (
                                state?.status ===
                                    "waiting" &&
                                !blockedChannels.has(
                                    candidate.channel
                                )
                            );

                        }
                    )
                    .length;

            const remainingNeeded =
                Math.max(
                    0,
                    target -
                    completed -
                    usableWaiting
                );

            if (
                remainingNeeded > 0 &&
                planner.pool.length > 0
            ) {

                const before =
                    approved.length;

                await supplyCandidates(
                    remainingNeeded,
                    blockedChannels
                );

                /*
                    새 후보 UI 상태 추가
                */

                for (
                    let i = before;
                    i < approved.length;
                    i++
                ) {

                    topicStates.push({
                        topic:
                            approved[i].topic,

                        channel:
                            approved[i].channel,

                        status:
                            "waiting"
                    });

                }

            }


            if (reporter) {

                reporter({

                    status:
                        completed >= approved.length
                            ? "완료"
                            : "제작중",

                    current:
                        completed,

                    currentTopic: "",

                    topics:
                        topicStates

                });

            }

        }


        /*
            =================================================
            후보 풀 처리 종료

            요청 수량보다 적게 만들어졌더라도
            여기서 정상 종료한다.
            =================================================
        */

        this.logger.log(
            `[Manager] 종료 : ${completed}/${target}`
        );


        /*
            취소로 종료된 경우
            아직 시작하지 않은 작업을 cancelled로 표시한다.
        */

        const cancelled =
            getControlState().cancelled;


        if (cancelled) {

            for (const item of topicStates) {

                if (item.status === "waiting") {

                    item.status = "cancelled";

                }

            }

        }


        if (reporter) {

            reporter({

                status:
                    cancelled
                        ? "취소"
                        : "완료",

                target:
                    planner.job.count,

                current:
                    completed,

                currentTopic:
                    cancelled
                        ? `⛔ 작업이 취소되었습니다. ${completed}/${planner.job.count}개 제작 완료`
                        : "",

                topics:
                    topicStates

            });

        }


        return true;

    }


    getChannel(
        channelName
    ) {

        return channels.find(
            channel =>
                channel.name ===
                channelName
        );

    }


    async isAvailable(
        order
    ) {

        const channel =
            this.getChannel(
                order.channel
            );


        if (!channel) {

            return false;

        }


        if (!channel.enabled) {

            return false;

        }


        if (
            channel.status !==
            "NORMAL"
        ) {

            return false;

        }


        return true;

    }


    async pause() {

        return true;

    }


    async resume() {

        return true;

    }


    async cancel() {

        return true;

    }

}


export default Manager;
