# ShortsAI Studio Architecture

## Goal

모든 쇼츠 제작을 Brain이 관리하고,
각 Channel이 독립적으로 주제를 생성하며,
공통 AI Judge가 최종 판단한다.

---

## Structure

modules/

brain/
- brain.js
- registry.js
- scheduler.js
- index.js

channels/

ai/
history/
shopping/
animal/

각 Channel

- config.js
- topicEngine.js
- scoreEngine.js
- index.js

core/

- aiJudge.js

기존 제작 모듈

- createShort.js
- ai.js
- script.js
- image.js
- tts.js
- subtitle.js
- video.js
- thumbnail.js
- metadata.js
- upload.js

---

## Flow

Brain

↓

Scheduler

↓

Channel

↓

Topic Engine

↓

Score Engine

↓

AI Judge (필요 시)

↓

createShort()

↓

Upload

---

## Rule

Brain는 제작만 담당한다.

Channel은 주제만 담당한다.

createShort()는 영상 제작만 담당한다.

모든 Channel은 동일한 인터페이스를 가진다.

새로운 Channel은 modules/channels 아래에만 추가한다.

Brain은 새로운 Channel을 수정 없이 사용할 수 있어야 한다.

