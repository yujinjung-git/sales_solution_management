# 유지보수 계약관리 기능 반영 내역

- 실제 `유지보수.xlsx` 데이터를 기준으로 2026년 이후 유효 계약 182건을 반영했습니다.
- 원본 엑셀에 없는 제품/수량/담당자 정보는 계약명, End-User, 계약사, 청구방식 기준으로 추정 보강했습니다.
- 왼쪽 사이드바에 `유지보수 계약관리` 메뉴를 추가했습니다.
- 대시보드 카드 클릭 시 해당 계약 목록으로 필터링됩니다.
- GitHub Pages는 `/docs` 배포 방식을 유지합니다.

## 배포 방법

GitHub Pages 설정:

- Source: Deploy from a branch
- Branch: main
- Folder: /docs
- Custom domain: 비움

수정 후 배포:

```bash
git add -A
git commit -m "Add real maintenance contract data"
git push
```
