# FORGEBORN — VS Code에서 실행하기

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

개발 실행에는 npm run dev를 사용합니다. VS Code Live Server는 TypeScript를 변환하지 않습니다.
node_modules와 .git은 압축에 포함하지 않았습니다. npm ci가 필요한 패키지를 설치합니다.

## 검증 명령
npm run typecheck
npm test
npm run build

브라우저 테스트를 실행할 때는 먼저 npx playwright install chromium을 실행한 뒤
npm run test:browser를 실행합니다.
