# FORGEBORN Phase 3 — VS Code에서 실행하기

## Go Live로 바로 실행

1. 압축을 풀고 FORGEBORN 폴더를 VS Code로 엽니다.
2. Live Server 확장을 설치합니다.
3. 오른쪽 아래 Go Live를 클릭합니다.
4. 대장간에 들어가기를 누릅니다.

.vscode/settings.json이 standalone 폴더를 서버 루트로 지정합니다.
소스를 수정한 뒤에는 npm run build:standalone으로 실행본을 갱신하세요.

## Vite 개발 실행

1. 이 ZIP의 압축을 해제합니다.
2. Node.js 24 LTS를 설치합니다. 이미 Node.js 22.12 이상이 있다면 사용할 수 있습니다.
   공식 다운로드: https://nodejs.org/
3. VS Code에서 FORGEBORN 폴더를 엽니다. FORGEBORN.code-workspace를 열어도 됩니다.
4. VS Code의 터미널 > 새 터미널을 선택합니다.
5. package.json이 보이는 프로젝트 폴더에서 아래 명령을 차례대로 실행합니다.

```sh
npm ci
npm run dev
```

6. 터미널에 표시된 Local 주소를 Ctrl+클릭하여 Chrome 또는 Edge에서 엽니다.
7. 대장간에 들어가기를 클릭합니다.

Windows PowerShell에서 npm.ps1 실행 정책 오류가 나면 아래 명령을 사용하세요.
보안 설정을 변경할 필요가 없습니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

서버를 종료하려면 터미널에서 Ctrl+C를 누릅니다.
다음 실행부터는 npm run dev만 실행하면 됩니다.

## 조작

WASD 이동 / 마우스 시점 / Shift 달리기 / Space 점프 / G 지도 / Esc 일시정지

## 함께 포함한 파일

- src/: TypeScript 게임 소스
- GDD.md: 공식 기획서
- package-lock.json: 재현 가능한 의존성 설치
- tests/: 물리 및 브라우저 테스트
- docs/: 구조 설계와 Phase 1 완료 보고
- standalone/index.html: 코드·에셋이 포함된 단일 HTML 실행본
- THIRD_PARTY_LICENSES/: 실행본에 포함된 라이브러리와 글꼴 라이선스

TypeScript 수정 사항의 즉시 반영은 npm run dev를 사용합니다. Go Live는 빌드된 실행본을 제공합니다.
node_modules와 .git은 압축에 포함하지 않았습니다. npm ci가 필요한 패키지를 설치합니다.

## 검증 명령

npm run typecheck
npm test
npm run build

브라우저 테스트를 실행할 때는 먼저 npx playwright install chromium을 실행한 뒤
npm run test:browser를 실행합니다.

## Phase 2 채굴하기

- 대장간 뒤편 광산 입구로 걸어갑니다.
- 입구 약 7m 안쪽의 왼쪽 벽에 첫 철광석이 있습니다.
- 가까이 가서 조준하고 좌클릭으로 3회 타격하면 광석을 수집합니다.
- Tab으로 인벤토리를 확인하고, 다시 Tab 또는 닫기로 게임에 복귀합니다.
- 3번 키는 곡괭이 장착/해제입니다.
- 첫 철광석을 가지고 대장간으로 돌아오면 첫 채굴 목표가 완료됩니다.
- 진행은 현재 세션에만 유지됩니다. 제작·거래·영구 저장은 아직 없습니다.

## Phase 3 용광로

1. 철광석을 얻어 대장간으로 돌아옵니다.
2. 돌 용광로 가까이에서 바라보고 E를 누릅니다.
3. 철 제련 시작을 클릭합니다. 철광석 1개가 차감됩니다.
4. 게임 시간 12초 후 철 재료 1개가 인벤토리에 자동 수집됩니다.
5. 철 재료 1개와 석탄 1개가 있으면 강철 합금을 선택할 수 있습니다.
6. 창은 닫기/Tab/Esc로 닫습니다. 창을 열어둔 상태에서도 제련은 진행합니다.

## 확장 광산 길 찾기

광산은 더 큰 분기와 순환 갱도로 바뀌었습니다. G를 눌러 주변 지하 지도를 보세요.
화면 오른쪽 위의 출구 방향과 통로 표지를 따라 대장간으로 돌아올 수 있습니다.
