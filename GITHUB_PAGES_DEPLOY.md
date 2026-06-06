# GitHub Pages 배포 안내

이 프로젝트는 GitHub Pages 프로젝트 사이트 기준으로 설정되어 있습니다.

예상 배포 주소:

```text
https://yujinjung-git.github.io/sales_solution_management/
```

## 필수 설정

GitHub Repository에서 아래 설정을 확인하세요.

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

Custom domain은 비워둡니다.

## 핵심 설정

`vite.config.js`는 아래처럼 고정되어 있어야 합니다.

```js
export default defineConfig({
  base: "/sales_solution_management/",
  plugins: [react()],
});
```

GitHub Pages 프로젝트 사이트는 루트(`/`)가 아니라 `/sales_solution_management/` 하위 경로에 배포되므로, 빌드 결과의 JS/CSS 경로도 `/sales_solution_management/assets/...` 형태여야 합니다.

## 배포 방법

```bash
git add .
git commit -m "Fix GitHub Pages deployment"
git push
```

이후 GitHub Actions에서 `Deploy to GitHub Pages`가 성공해야 합니다.

## 확인 포인트

Actions 로그의 `Verify GitHub Pages asset paths` 단계에서 `dist/index.html` 안에 아래 경로가 보여야 정상입니다.

```html
/sales_solution_management/assets/
```

만약 브라우저 Console에 아래처럼 뜨면 잘못된 빌드가 배포된 상태입니다.

```text
/assets/index-xxxx.js 404
/assets/index-xxxx.css 404
```

정상 경로는 아래처럼 보여야 합니다.

```text
/sales_solution_management/assets/index-xxxx.js
/sales_solution_management/assets/index-xxxx.css
```
