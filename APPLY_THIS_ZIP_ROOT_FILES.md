# 적용 주의

이 ZIP은 압축을 풀면 바로 package.json, vite.config.js, index.html, src/, .github/가 보여야 합니다.
기존 레포 안에 sales_solution_management/ 같은 하위 폴더를 새로 만들면 안 됩니다.
반드시 GitHub 레포 루트에 덮어씌우세요.

정상 구조:
- package.json
- vite.config.js
- index.html
- src/
- .github/workflows/deploy-pages.yml

GitHub Pages 정상 asset 경로:
- ./assets/index-*.js
- ./assets/index-*.css
