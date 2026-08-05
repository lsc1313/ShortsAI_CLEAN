/*
=====================================================
SHORTSAI VIDEO EFFECT ENGINE V3
=====================================================

GLOBAL
- 1 Scene = 이미지 1장
- Scene 전체 시간 동안 프레임 번호 기반 Zoom
- 약 15% Zoom In
- 누적 zoom 값에 의존하지 않는다.

RANKING
- 1 Scene = 이미지 3장
- 각 이미지는 독립적인 짧은 Motion
- 각 이미지 약 10% Zoom In

ENDING
- Motion 없음
- 직전 이미지 유지

중요
- 실제 Zoom 계산은 scene.js에서
  Scene/Part의 실제 프레임 수에 맞춰 생성한다.
=====================================================
*/


export function getGlobalEffect(
    frames = 180
){

    const lastFrame =
        Math.max(
            1,
            Number(frames) - 1
        );

    return `zoompan=
z='1+(on/${lastFrame})*0.15':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;

}


export function getRankingEffect(
    frames = 60
){

    const lastFrame =
        Math.max(
            1,
            Number(frames) - 1
        );

    return `zoompan=
z='1+(on/${lastFrame})*0.10':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:
s=2160x3840:
fps=30`;

}


/*
=====================================================
기존 코드 호환

다른 코드에서 getEffect(index)를 호출해도
함수가 없어져서 실패하지 않도록 유지한다.

기본 GLOBAL 6초 / 30fps 기준.
=====================================================
*/

export function getEffect(){

    return getGlobalEffect(180);

}
