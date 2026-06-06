# 적용 안내

이 ZIP은 반드시 기존 Git 레포 폴더의 루트에 풀어야 합니다.

정상 루트 구조:

- package.json
- vite.config.js
- index.html
- .github/workflows/deploy-pages.yml
- src/

기존 레포 폴더에서는 `.git`만 남기고 나머지를 삭제한 뒤, 이 ZIP 안의 파일/폴더를 그대로 복사하세요.

GitHub Pages asset 경로는 `vite.config.js`의 `base: "./"`로 고정했습니다.
정상 빌드 결과는 `dist/index.html` 안에서 `./assets/...`를 가리켜야 합니다.
