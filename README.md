# Match-3 Stage Puzzle — 3Pizzle

**[지금 플레이하기](https://ahagoitda.github.io/3pizzle-game/)**

웹 브라우저에서 바로 즐기는 3매칭 스테이지 퍼즐 게임. 설치 불필요, 클릭 한 번으로 실행.

## 게임 모드

- **Match-3 Stage Mode**: 월드 1(숲), 월드 2(동굴)의 10개 스테이지에 도전하는 퍼즐 게임.
- 각 스테이지별 난이도(젬 색상 개수), 목표 점수, 제한 시간 등이 실시간 적용되며, 로컬스토리지에 진행도가 저장됩니다.

## 기술 스택

- **HTML5 Canvas** — 모든 그래픽 및 프리미엄 일러스트 렌더링
- **Vanilla JavaScript** — 외부 라이브러리 / 프레임워크 미사용
- **CSS3** — 반응형 레이아웃, Glass-morphism UI
- **HTML5 Audio + Web Audio API** — 배경음악(BGM) 트랙 재생 및 실시간 사운드 효과 생성
- **localStorage** — 최고 점수 및 스테이지 진행도 연동

## 프로젝트 구조

```
index.html        # 메인 페이지 + CSS + Canvas
main.js           # 메뉴(스테이지 선택기), 게임 전환, 점수 관리
match3_levels.js  # 각 스테이지 정보 및 로컬스토리지 진행도 관리
match3.js         # 매치-3 퍼즐 핵심 로직 및 인게임 연출
effects.js        # 파티클, 화면 진동, 이펙트 유틸
sw.js             # 서비스 워커 캐싱 정의
```

## 특징

- 설치 불필요 — 브라우저만 있으면 즉시 실행 (PWA 지원)
- 마법 숲(나노바나나 AI 일러스트) 및 네온 동굴 월드 디자인
- 피버 타임(Fever Time), 파티클 이펙트, 화면 진동, 아이템(망치, 셔플) 기능 탑재
