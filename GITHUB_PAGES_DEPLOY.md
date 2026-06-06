# GitHub Pages 배포 방법

이 프로젝트는 GitHub Pages 프로젝트 사이트로 배포되도록 설정되어 있습니다.

예상 주소:

```text
https://yujinjung-git.github.io/sales_solution_management/
```

## 핵심 설정

`vite.config.js`의 `base`는 반드시 아래처럼 고정되어야 합니다.

```js
base: "/sales_solution_management/"
```

이 값이 `/`이면 배포된 `index.html`이 `/assets/...`를 찾게 되어 GitHub Pages에서 JS/CSS 404가 발생합니다.
정상 빌드 결과는 `/sales_solution_management/assets/...` 형태여야 합니다.

## GitHub 설정

Repository → Settings → Pages → Build and deployment → Source를 `GitHub Actions`로 설정합니다.

Custom domain은 비워둡니다.

## 배포

```bash
git add .
git commit -m "Fix GitHub Pages asset base path"
git push
```

GitHub Actions가 성공하면 위 예상 주소로 접속합니다.
