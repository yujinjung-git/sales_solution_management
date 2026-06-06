# GitHub Pages 배포 안내

이 버전은 GitHub Pages 하위 경로 문제를 피하기 위해 Vite `base`를 상대 경로 `./`로 고정했습니다.

배포 주소:

```text
https://yujinjung-git.github.io/sales_solution_management/
```

## 적용 방법

```bash
git add .
git commit -m "Fix GitHub Pages relative asset paths"
git push
```

GitHub에서 아래 설정 확인:

```text
Repository → Settings → Pages → Build and deployment → Source: GitHub Actions
```

## 정상 빌드 확인 기준

Actions 로그의 `Verify relative asset paths` 단계에서 `dist/index.html`에 아래처럼 보여야 합니다.

```html
<script type="module" crossorigin src="./assets/index-xxxxx.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-xxxxx.css">
```

아래처럼 나오면 실패입니다.

```html
<script type="module" crossorigin src="/assets/index-xxxxx.js"></script>
```
