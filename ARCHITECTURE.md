# ShortsAI Studio v4
# Architecture Specification

---

# 목표

ShortsAI는 역할을 명확히 분리하여
유지보수, 확장성, 안정성을 확보하는 것을 목표로 한다.

모든 모듈은 하나의 책임(Single Responsibility)만 가진다.

---

# 전체 구조

```
                    Brain
              (CEO / Master AI)
                     │
     ┌───────────────┴───────────────┐
     │                               │
 Planner                         Manager
 (Planning)                  (Production)
     │                               │
     ▼                               ▼
Departments                    Production
     │                               │
     └──────────────┬────────────────┘
                    ▼
                 Services
                    │
                    ▼
               Repositories
```

---

# Brain

역할

- 프로젝트 시작
- 목표 결정
- Planner 호출
- Manager 호출
- 전체 진행상황 확인
- 종료

Brain은 절대로

- createShort
- AI 생성
- DB 조회
- 점수 계산

을 하지 않는다.

---

# Planner

역할

- 생산 요청 생성
- 모든 Department 호출
- 후보 수집
- Proposal Scorer 호출
- Manager에게 전달

Planner는

- 생성하지 않는다.
- 저장하지 않는다.
- 업로드하지 않는다.

Planner는 오직 "기획"만 한다.

---

# Manager

역할

- Queue 관리
- 작업 배정
- Production 호출
- 진행률 관리
- 완료 보고

Manager는 기획하지 않는다.

---

# Departments

예시

departments/

AI
History
Animal
Science
Shopping
Car
Travel
Finance

모든 Department는 동일한 인터페이스를 가진다.

export async function create(request)

반드시 Proposal 배열을 반환한다.

Department는

- 아이디어 생산

만 담당한다.

---

# Services

서비스는 계산만 수행한다.

예시

proposalGenerator
proposalScorer
trendProvider
categoryClassifier
titleOptimizer
thumbnailAnalyzer

서비스는

- 저장하지 않는다.
- 결정하지 않는다.

---

# Repositories

Repository는 데이터만 관리한다.

예시

historyRepository
analyticsRepository
memoryRepository
topicRepository

Repository는

- 조회
- 저장

만 담당한다.

---

# Production

실제 영상 제작

script

tts

image

subtitle

video

thumbnail

upload

Production에서만 createShort를 호출한다.

---

# 개발 원칙

## 1

한 파일 = 하나의 책임

---

## 2

Controller는 계산하지 않는다.

Brain
Planner
Manager

---

## 3

Service는 결정하지 않는다.

---

## 4

Repository는 저장만 한다.

---

## 5

Department는 생산만 한다.

---

## 6

300줄이 넘기 시작하면 분리한다.

500줄이 넘도록 방치하지 않는다.

---

## 7

새 기능은 기존 파일을 수정하지 않는다.

새로운 폴더를 추가한다.

예)

departments/travel

departments/game

departments/sports

---

# 목표

Planner는 약 100줄

Manager는 약 150줄

Brain은 약 100줄

모든 Service는 200줄 이하

모든 Repository는 150줄 이하

모든 Department는 독립적으로 테스트 가능해야 한다.

---

# 최종 목표

ShortsAI는

"기능 중심"

프로젝트가 아니라

"조직 중심"

AI 생산 플랫폼으로 개발한다.
