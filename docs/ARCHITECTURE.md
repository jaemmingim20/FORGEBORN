# FORGEBORN — Phase 1 구조 설계

공식 규칙은 루트의 `GDD.md`이며, 첨부 원문을 그대로 보존한다. 이번 구현은 제16장 Phase 1에 한정한다. 제4장의 걷기 4.5m/s, 달리기 6.5m/s를 사용한다. 스태미나는 Phase 6이므로 아직 소모하지 않는다.

## 구현 전 파일 구조

```text
GDD.md                         공식 기획서 원문
index.html                     게임 진입점, 로딩/실패 안내
src/
  main.ts                      비동기 부팅, 치명적 오류 처리
  startGame.ts                 오류 경계 안에서 불러오는 게임·스타일 진입점
  core/
    GameManager.ts             시스템 조립, 고정 시간 물리 루프, 게임 상태
    EventBus.ts                타입 안전한 시스템 간 이벤트
    types.ts                   렌더러에 의존하지 않는 공통 계약
  input/InputManager.ts        키보드, 마우스, 포인터 잠금과 포커스
  physics/
    PhysicsWorld.ts            Rapier 초기화, 정적 충돌체, 레이 쿼리, 수명 관리
    PlayerMotor.ts             캡슐 캐릭터, 중력, 점프, 경사/낮은 턱 이동
  player/PlayerController.ts    입력→물리 연결, 1인칭 카메라
  render/
    SceneRenderer.ts           Three.js 렌더링, 크기 변경, 조명, 하늘
    materials.ts               재사용 재질, 시드 기반 절차적 텍스처
  world/
    WorldManager.ts            구역 판별, 설비 등록, 시선 대상 확인
    WorldBuilder.ts            연결된 월드와 충돌체 조립
    ModelFactory.ts            교체 가능한 설비 임시 모델
    primitives.ts              공용 형상 생성, 정적 지오메트리 병합
    data.ts                    구역, 설비 위치/설명, 생성 시드
  ui/
    UIManager.ts               시작/일시정지, 조작 설정, HUD, 지도
    styles.css                 중세풍 반응형 화면
    fonts.css                  번들에 포함하는 한국어 WOFF2 글꼴
tests/
  physics.test.ts              실제 Rapier 이동·중력·충돌 회귀 검증
  world.test.ts                구역 및 연결 경로/설비 계약 검증
  game.spec.ts                실제 Chromium WebGL·조작·탐방 검증
  boot.spec.ts                하위 경로·단일 HTML·부팅 실패/복구 검증
docs/
  ARCHITECTURE.md              이 설계와 확장 경계
  PHASE1.md                   완료 보고와 다음 단계
```

## 시스템 책임과 데이터 흐름

`InputManager → PlayerController → PlayerMotor → PhysicsWorld`가 이동을 처리한다. 물리는 60Hz로 실행하며, 렌더링 주기와 분리한다. `SceneRenderer`는 게임 규칙을 소유하지 않는다. `WorldManager`는 데이터의 구역 경계와 설비 ID를 판별하고 `EventBus`로 UI에 알린다. 물리 코드에는 Three.js 및 DOM 의존성이 없다.

모델은 로컬 좌표의 시각 그룹과 충돌 명세로 구성한다. 월드 배치 시 같은 변환을 두 표현에 적용한다. 향후 GLB로 시각 모델을 교체해도 설비 ID, 월드 배치 및 상호작용 계약은 유지할 수 있다. 정적 형상은 재질별 병합으로 드로 콜을 줄이고, 조명·불꽃·표지판은 별도로 유지한다.

## 월드 연결

미터 단위, Y-up, 북쪽은 -Z. 카운터(z=12…20) ↔ 대장간(z=-4…12) ↔ 뒷마당(z=-27…-4)에서 동쪽 훈련장(x=12…29), 북쪽 광산 입구(z=-45…-27)로 걸어서 이동한다. 출입구는 최소 3m 폭이다. 광산은 입구와 짧은 진입부까지만 구성하고, 안쪽 끝에는 눈에 보이는 폐쇄벽과 충돌체를 둔다.

모든 주요 설비는 안정적인 ID와 향후 담당 단계 메타데이터를 가진다. 용광로는 정확히 1개, 훈련 허수아비는 3개를 배치한다. 채굴·제련·제작·거래·전투·인벤토리·화폐·날짜·저장 기능과 NPC는 실행하지 않는다. 바라본 설비에는 용도와 미구현 단계를 안내할 뿐, 가짜 제작/거래 버튼을 만들지 않는다. 아직 필요한 책임이 없는 Manager 빈 껍데기를 양산하지 않는다.

## 검증 및 기본값

필수: TypeScript strict, 프로덕션 빌드, 실제 Rapier 물리 테스트, Chromium의 WebGL/WASM 초기화 및 콘솔 오류 확인, 실제 키 입력으로 5개 구역 연결 이동, 점프·벽 충돌·일시정지·크기 변경 확인. Phase 2 이후 규칙은 이번 테스트 대상이 아니다.

GDD 미정값: 캡슐 반지름 0.32m, 눈높이 1.65m, 중력 24m/s², 점프 초기 속력 7m/s, 최대 자동 턱 넘기 0.28m. 고정된 시드로 배경을 생성하고 초기 월드를 재현한다. 브라우저 포커스 상실/탭 숨김/포인터 잠금 해제 시 멈추고 입력을 비운다. 디버그 훅은 개발 모드에서만 활성화한다.

## 이후 확장

다음은 Phase 2만 진행한다: 광산 내부·광물 데이터·곡괭이 뷰모델·채굴·수집·인벤토리. 설비 ID와 공통 이벤트 계약에 새 이벤트를 추가해 연결한다. 경제는 렌더러와 분리하며, 저장 스키마/트랜잭션 규칙은 해당 단계에서 구현한다.

## 부팅과 배포 경로 보완

미리보기의 하위 URL에서는 사이트 루트 기준 `/assets/...` 요청이 실패할 수 있다. Vite의 `base: './'`로 빌드하고, 미리보기용 `standalone/index.html`에는 코드·CSS·글꼴·WASM을 모두 포함한다. 일반 배포용 `dist/` 청크 분리는 유지한다.

`index.html`의 의존성 없는 초기 안내가 모듈 실행 전 오류와 15초 이상 지연을 알린다. `main.ts`는 `startGame.ts`를 동적으로 가져와 모듈 그래프의 다운로드 실패도 오류 경계 안에서 처리한다. 게임은 로딩 단계 콜백만 추가로 제공하며 이동과 월드 규칙은 바꾸지 않는다.
