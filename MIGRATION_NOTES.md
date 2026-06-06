# TypeScript to JavaScript Migration Notes

## 변경 내용

- React entry 파일 변환: `src/main.tsx` → `src/main.jsx`
- App 파일 변환: `src/App.tsx` → `src/App.jsx`
- 서비스/데이터 파일 변환: `*.ts` → `*.js`
- TypeScript 전용 파일 제거: `tsconfig.json`, `src/vite-env.d.ts`, `src/types.ts`
- `index.html` 진입점 수정: `/src/main.tsx` → `/src/main.jsx`
- `package.json` 빌드 스크립트 수정: `tsc -b && vite build` → `vite build`
- TypeScript 관련 devDependency 제거: `typescript`, `@types/react`, `@types/react-dom`
- GitHub Pages 배포 base 경로 수정: `/sales_solution_management/`
- GitHub Actions Node 버전 조정: `22`

## 검증 결과

아래 명령으로 로컬 빌드 성공을 확인했습니다.

```bash
npm ci --ignore-scripts
npm run build
```

빌드는 성공했으며, Vite에서 번들 크기 경고가 출력됩니다. 이는 오류가 아니라 큰 chunk에 대한 성능 경고입니다.

## 주의 사항

`xlsx@0.18.5`에 대해 `npm audit` 기준 high severity 취약점 경고가 있습니다. 현재 npm registry 기준 자동 수정 가능한 버전이 제공되지 않는 것으로 표시됩니다. 외부에서 받은 Excel 파일을 직접 처리하는 기능을 운영 환경에 노출할 경우 별도 검토가 필요합니다.
