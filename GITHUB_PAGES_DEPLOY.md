# GitHub Pages 배포 방법

이 프로젝트는 GitHub Pages 배포용으로 설정되어 있습니다.

## 예상 배포 주소

```text
https://yujinjung-git.github.io/sales_solution_management/
```

## GitHub 설정

Repository → Settings → Pages → Build and deployment → Source를 `GitHub Actions`로 설정합니다.

## Push 전 주의

`.github/workflows/deploy-pages.yml` 파일을 push하려면 GitHub Personal Access Token에 `workflow` 권한이 필요합니다.

필요 권한:

```text
repo
workflow
```

## 배포 흐름

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push
```

이후 Repository → Actions → `Deploy to GitHub Pages` workflow가 성공하면 배포 URL로 접속할 수 있습니다.

## 로컬 확인

```bash
npm install
npm run dev
```

## 배포 빌드 확인

```bash
GITHUB_PAGES=true npm run build
```
