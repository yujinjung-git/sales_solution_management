# GitHub Pages 배포 방식: /docs 폴더 사용

이 버전은 GitHub Actions를 사용하지 않습니다.
`npm run build`로 생성된 정적 파일을 `/docs` 폴더에 포함해두었고, GitHub Pages가 `/docs` 폴더를 그대로 배포하게 하는 방식입니다.

## GitHub 설정

Repository → Settings → Pages → Build and deployment에서 아래처럼 설정합니다.

- Source: Deploy from a branch
- Branch: main
- Folder: /docs

저장 후 1~3분 뒤 아래 주소로 접속합니다.

https://yujinjung-git.github.io/sales_solution_management/

## 중요

Custom domain은 비워둡니다.
GitHub Actions는 사용하지 않습니다.
