# ShortsAI Studio v4
# Development Roadmap

---

# 프로젝트 목표

AI가 스스로

- 기획
- 생산
- 학습
- 성장

하는 자동화 Shorts 플랫폼 구축

---

# Sprint 1

## 목표

기본 구조 구축

완료 조건

- Brain 분리
- Planner 분리
- Manager 분리
- Queue 분리

---

# Sprint 2

## Planner 리팩터링

목표

Planner를 기획 전용으로 변경

제거 대상

- AI 생성
- DB 조회
- Trend 검색
- Score 계산
- Category 분류

Planner 역할

- 요청 생성
- Department 호출
- 결과 수집
- Proposal Scorer 호출

완료 조건

planner.js

100~150줄

---

# Sprint 3

## Services 구축

생성

proposalGenerator

proposalScorer

trendProvider

categoryClassifier

titleOptimizer

thumbnailAnalyzer

logger

utils

완료 조건

모든 계산이 Service에서 수행

---

# Sprint 4

## Repository 구축

생성

historyRepository

analyticsRepository

memoryRepository

topicRepository

queueRepository

완료 조건

JSON 접근 코드 제거

---

# Sprint 5

## Department 구축

생성

AI

History

Animal

Science

Shopping

Car

Travel

Finance

모든 Department

create(request)

인터페이스 통일

완료 조건

Planner는 Department만 호출

---

# Sprint 6

## Production 구축

생성

Script

Image

TTS

Subtitle

Video

Thumbnail

Upload

Production에서만

createShort 실행

---

# Sprint 7

## Learning System

생성

Learning Engine

Trend Learning

History Analyzer

CTR Analyzer

Growth Analyzer

목표

AI가 성공한 콘텐츠를 학습

---

# Sprint 8

## Multi Channel

지원

유튜브 채널 여러 개

카테고리별 채널

채널별 전략

예약 업로드

---

# Sprint 9

## Automation

자동 실행

자동 예약

자동 업로드

자동 통계

자동 학습

자동 재생성

---

# Sprint 10

## AI Organization

Brain

↓

Planner

↓

Departments

↓

Manager

↓

Production

↓

Learning

↓

Brain

완전한 AI 순환 구조 구축

---

# 개발 규칙

Sprint는 반드시 순서대로 진행한다.

Sprint를 건너뛰지 않는다.

완료되지 않은 Sprint는 다음 Sprint로 넘어가지 않는다.

---

# 완료 기준

각 Sprint는

- 코드 작성

- 테스트

- 리팩터링

- 문서 업데이트

까지 완료해야 종료된다.

---

# 최종 목표

사람은

목표만 입력한다.

Brain이

기획

생산

업로드

학습

개선

까지 모두 수행하는

AI 조직 시스템을 완성한다.
