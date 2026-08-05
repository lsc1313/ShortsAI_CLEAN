# ShortsAI Studio v4
# Project Structure

---

# Root

```
ShortsAI/

brain/
departments/
production/
services/
repositories/
database/
config/
public/
logs/
temp/
assets/
tests/
docs/
```

---

# brain/

```
brain/

brain.js
planner.js
manager.js
queue.js
```

역할

brain.js
- 전체 시작
- 전체 종료

planner.js
- 기획

manager.js
- 생산관리

queue.js
- 작업대기열

---

# departments/

```
departments/

ai/
history/
animal/
science/
shopping/
car/
travel/
game/
finance/
```

각 Department 구조

```
ai/

index.js
generator.js
analyzer.js
reviewer.js
config.js
```

index.js만 외부 공개

---

# production/

```
production/

script/
tts/
image/
subtitle/
video/
thumbnail/
upload/
```

예

```
production/

script/

index.js
generator.js
reviewer.js
```

---

# services/

```
services/

proposalGenerator.js
proposalScorer.js
trendProvider.js
categoryClassifier.js
titleOptimizer.js
thumbnailAnalyzer.js
logger.js
utils.js
```

서비스는 계산만 한다.

---

# repositories/

```
repositories/

historyRepository.js
analyticsRepository.js
memoryRepository.js
topicRepository.js
queueRepository.js
```

데이터만 관리

---

# database/

```
database/

history.json
topics.json
analytics.json
memory.json
queue.json
```

---

# config/

```
config/

app.js
brain.js
planner.js
production.js
youtube.js
gemini.js
```

설정만 존재

---

# public/

```
public/

index.html
css/
js/
images/
```

웹 화면

---

# assets/

```
assets/

fonts/
music/
overlay/
effects/
templates/
```

영상 제작 리소스

---

# temp/

```
temp/

images/
audio/
video/
subtitle/
```

임시 생성 파일

---

# logs/

```
logs/

system.log
brain.log
planner.log
manager.log
production.log
```

로그 저장

---

# tests/

```
tests/

brain.test.js
planner.test.js
manager.test.js
department.test.js
production.test.js
```

---

# docs/

```
docs/

ARCHITECTURE.md
PROJECT_STRUCTURE.md
API.md
ROADMAP.md
CHANGELOG.md
```

프로젝트 문서

---

# 신규 기능 추가 규칙

새로운 기능은

기존 파일 수정이 아니라

새로운 폴더를 추가한다.

예

```
departments/sports/

departments/movie/

departments/politics/
```

Planner는 수정하지 않는다.

---

# 목표

프로젝트가 커져도

폴더만 늘어나고

Brain, Planner, Manager는 거의 변경되지 않는다.
