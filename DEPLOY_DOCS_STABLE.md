# GitHub Pages 배포 방식

이 버전은 GitHub Actions를 사용하지 않고, `main` 브랜치의 `/docs` 폴더를 GitHub Pages로 배포합니다.

GitHub 설정:
- Settings > Pages
- Source: Deploy from a branch
- Branch: main
- Folder: /docs
- Custom domain: 비움

빌드 산출물은 해시 파일명을 쓰지 않고 고정 파일명을 사용합니다.
- docs/assets/index.js
- docs/assets/index.css

기존 hash 파일명 캐시 문제를 피하기 위한 구성입니다.
