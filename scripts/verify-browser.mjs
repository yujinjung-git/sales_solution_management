import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const tempDir = fileURLToPath(new URL("../.playwright-temp/", import.meta.url));
mkdirSync(tempDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  env: { ...process.env, TEMP: tempDir, TMP: tempDir },
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("dialog", async (dialog) => {
  await dialog.accept();
});

const targetUrl = process.env.CRM_URL ?? "http://127.0.0.1:5180";
await page.goto(targetUrl, { waitUntil: "networkidle" });
await page.waitForSelector("body");
const loginBodyText = await page.locator("body").innerText();
const loginScreenOnly = loginBodyText.includes("Sales CRM") && loginBodyText.includes("KICA") && loginBodyText.includes("영업 현황판") && loginBodyText.includes("고객 이력 관리") && !loginBodyText.includes("SalesOps AI CRM") && !loginBodyText.includes("한국차세대연구원") && !loginBodyText.includes("₩");
await page.getByLabel("이메일").fill("wrong@salesops.ai");
await page.getByLabel("비밀번호").fill("wrong");
await page.getByRole("button", { name: /^로그인$/ }).click();
const invalidLoginText = await page.locator(".formError").innerText();
await page.getByLabel("이메일").fill("demo@salesops.ai");
await page.getByLabel("비밀번호").fill("demo1234");
await page.getByRole("button", { name: /^로그인$/ }).click();
await page.locator("h1", { hasText: "영업 현황판" }).waitFor();
await page.reload({ waitUntil: "networkidle" });
await page.locator("h1", { hasText: "영업 현황판" }).waitFor();
const initialBodyText = await page.locator("body").innerText();
const noGlobalContextBar = (await page.locator(".contextBar").count()) === 0;
const noGlobalTopButton = !(await page.locator(".topbar").innerText()).includes("초안 생성");
const hasMenuHeader = initialBodyText.includes("영업 현황판") && !initialBodyText.includes("B2B 영업 담당자를 위한");
const hasHongUser = initialBodyText.includes("홍길동") && initialBodyText.includes("영업 담당자");
const firstMenuText = await page.getByLabel("주요 메뉴").locator("button").first().innerText();
const defaultIsSalesStatus = (await page.locator("h1").innerText()) === "영업 현황판";

await page.getByLabel("주요 메뉴").getByRole("button", { name: /문서 생성/ }).click();
const documentPanel = page.locator("section.panel").filter({ hasText: "문서 요청" });
await documentPanel.getByRole("button", { name: /초안 생성/ }).click();
const titleText = await page.locator("h1").innerText();
const draftTitle = await page.locator(".draftPaper h3").innerText();
const mailDownloadNameText = await page.locator(".downloadBox").innerText();
const mailDownloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: /^다운로드$/ }).click();
const mailDownload = await mailDownloadPromise;
const mailDownloadedFileName = mailDownload.suggestedFilename();
await documentPanel.getByRole("button", { name: /초안 저장/ }).click();
const draftSaveFeedback = await page.locator(".saveFeedback").innerText();
await documentPanel.getByRole("button", { name: "복사", exact: true }).click();
await page.waitForTimeout(100);
const draftCopyFeedback = await page.locator(".saveFeedback").innerText();
await page.getByRole("button", { name: "문서 이력 저장", exact: true }).click();
const documentHistoryFeedback = await page.locator(".saveFeedback").innerText();
await page.getByRole("button", { name: "이력에 저장", exact: true }).click();
const documentActivityFeedback = await page.locator(".saveFeedback").innerText();
await documentPanel.getByLabel("문서 유형").selectOption("견적서");
const quoteFormText = await documentPanel.innerText();
await documentPanel.getByRole("button", { name: /초안 생성/ }).click();
const quoteDownloadNameText = await page.locator(".downloadBox").innerText();
const quoteDownloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: /^다운로드$/ }).click();
const quoteDownload = await quoteDownloadPromise;
const quoteDownloadedFileName = quoteDownload.suggestedFilename();
await documentPanel.getByLabel("고객사").selectOption("hanbit-bank");
const documentFormText = await documentPanel.innerText();

await page.getByRole("button", { name: /영업 현황/ }).click();
const actionRailAbsentInSalesStatus = (await page.locator(".actionRail").count()) === 0;
const statusBoardText = await page.locator(".mainPanel").innerText();
await page.getByRole("button", { name: /^올해$/ }).click();
const annualSummaryText = await page.locator(".mainPanel").innerText();
await page.getByRole("button", { name: /^이번 달$/ }).click();
const salesHeaderText = await page.locator(".topbar").innerText();
const statusBoardCardCount = await page.locator(".pipelineCard").count();
await page.locator(".pipelineCard").filter({ hasText: "신규 OI 발굴" }).click();
await page.getByText("신규 OI 발굴 상세").waitFor();
const stageModalText = await page.locator(".modalPanel").innerText();
await page.locator(".stageDealRow").first().getByRole("button").first().click();
await page.waitForSelector(".drawerPanel");
const stageDrawerText = await page.locator(".drawerPanel").innerText();
await page.locator(".drawerPanel").getByRole("button", { name: /닫기/ }).first().click();
await page.getByRole("button", { name: /영업 현황/ }).click();
const salesControlsText = await page.locator(".salesControlPanel").innerText();
await page.getByRole("button", { name: /상태 기준 설정/ }).click();
await page.getByLabel("마지막 컨택 후 주의 전환 일수").fill("3");

await page.getByRole("button", { name: /신규 영업 추가/ }).click();
await page.getByRole("button", { name: /영업 사이트 추가/ }).click();
const validationText = await page.locator(".formError").innerText();

const addForm = page.locator("section.panel").filter({ hasText: "신규 영업 사이트 추가" });
const addFormText = await addForm.innerText();
await addForm.getByLabel("영업 유형").selectOption("신규 제안");
await addForm.getByLabel("고객사명").fill("테스트산업");
await addForm.getByLabel("영업 건명").fill("테스트 SSO 신규 제안");
await addForm.getByLabel("산업군").fill("제조");
await addForm.getByLabel("예상 매출").fill("25000000");
await addForm.getByRole("textbox", { name: /담당자 필수/ }).fill("김현규");
await addForm.getByRole("textbox", { name: /다음 액션 필수/ }).fill("첫 제안 미팅 확정");
await addForm.getByLabel("첨부자료명").fill("테스트_소개자료.pdf");
await page.getByRole("button", { name: /영업 사이트 추가/ }).click();

const salesStatusText = await page.locator(".mainPanel").innerText();
const salesDealRowCount = await page.locator(".salesRow").count();
const salesBodyText = await page.locator("body").innerText();
await page.getByRole("button", { name: /^신규 제안$/ }).click();
const filteredText = await page.locator(".mainPanel").innerText();
await page.locator("span.statusTag").first().click();
const statusExplanationVisible = await page.locator(".statusExplanationBox").isVisible();

await page.locator(".salesRow").filter({ hasText: "테스트 SSO 신규 제안" }).first().click({ position: { x: 20, y: 20 } });
await page.waitForSelector(".drawerPanel");
const detailVisible = await page.locator(".drawerPanel").isVisible();
const selectedRowCount = await page.locator(".salesRow.selectedRow").count();
const drawerDetailText = await page.locator(".drawerPanel").innerText();
await page.locator(".drawerPanel").getByRole("button", { name: /^이력$/ }).click();
await page.locator(".drawerPanel").getByRole("button", { name: /다음 액션 수정/ }).click();
await page.locator(".inlineEditBox").getByLabel("다음 액션", { exact: true }).fill("QA 후속 연락");
await page.locator(".inlineEditBox").getByLabel("다음 액션 기한").fill("2026-06-03");
await page.locator(".inlineEditBox").getByRole("button", { name: /^저장$/ }).click();
const nextActionEditText = await page.locator(".detailPanel").innerText();
await page.locator(".drawerPanel").getByRole("button", { name: /이력 추가/ }).click();
const activityForm = page.locator(".activityForm");
const activityTargetText = await activityForm.locator(".activityTarget").innerText();
await activityForm.getByLabel("활동 유형").selectOption("미팅");
await activityForm.getByLabel("제목").fill("1차 미팅 진행");
await activityForm.getByLabel("담당자").fill("김현규");
await activityForm.getByLabel("상세 내용").fill("요구사항과 예산 범위를 확인했습니다.");
await activityForm.getByRole("textbox", { name: /다음 액션 선택/ }).fill("수정 제안서 전달");
await activityForm.getByRole("button", { name: /^이력 추가$/ }).click();
const detailAfterActivity = await page.locator(".detailPanel").innerText();
const feedbackText = await page.locator(".saveFeedback").innerText();
await page.locator(".detailTimelineItem").filter({ hasText: "1차 미팅 진행" }).getByRole("button", { name: "수정" }).click();
const editForm = page.locator(".activityForm").filter({ hasText: "이력 수정 대상" });
await editForm.getByLabel("제목").fill("1차 미팅 진행 수정");
await editForm.getByRole("button", { name: /^이력 수정$/ }).click();
const detailAfterEdit = await page.locator(".detailPanel").innerText();
await page.locator(".detailTimelineItem").filter({ hasText: "1차 미팅 진행 수정" }).getByRole("button", { name: "삭제" }).click();
const detailAfterDelete = await page.locator(".detailPanel").innerText();
await page.locator(".drawerPanel").getByRole("button", { name: /닫기/ }).first().click();

await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(250);
const mobileText = await page.locator("body").innerText();

await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByLabel("주요 메뉴").getByRole("button", { name: /가격 가이드/ }).click();
const pricingHeaderText = await page.locator(".topbar").innerText();
const pricingText = await page.locator(".mainPanel").innerText();
const pricingRecommendedBefore = await page.locator(".metricCard").filter({ hasText: "권장 할인율" }).innerText();
await page.getByRole("button", { name: /가격 전략 계산/ }).click();
const pricingCalcFeedback = await page.locator(".saveFeedback").innerText();
await page.getByRole("button", { name: /견적 조건 저장/ }).click();
const pricingSaveFeedback = await page.locator(".saveFeedback").innerText();
await page.getByRole("button", { name: /가격 기준 설정/ }).click();
const pricingSettingsText = await page.locator(".modalPanel").innerText();
await page.getByLabel("기본 권장 할인율").fill("20");
await page.locator(".modalPanel").getByRole("button", { name: /저장/ }).click();
const pricingSettingsSavedText = await page.locator(".mainPanel").innerText();
const pricingRecommendedAfter = await page.locator(".metricCard").filter({ hasText: "권장 할인율" }).innerText();
await page.getByRole("button", { name: /로그아웃/ }).click();
const logoutText = await page.locator("body").innerText();

await page.screenshot({
  fullPage: true,
  path: fileURLToPath(new URL("../verification-screenshot.png", import.meta.url)),
});
await browser.close();

const result = {
  titleText,
  draftTitle,
  loginScreenOnly,
  invalidLoginShowsError: invalidLoginText.includes("이메일 또는 비밀번호가 올바르지 않습니다."),
  loginPersistsAfterReload: defaultIsSalesStatus,
  logoutHidesCrmData: logoutText.includes("Sales CRM") && logoutText.includes("KICA") && logoutText.includes("로그인") && !logoutText.includes("SalesOps AI CRM") && !logoutText.includes("한국차세대연구원") && !logoutText.includes("₩"),
  userNameChanged: hasHongUser,
  defaultIsSalesStatus,
  firstMenuIsSalesStatus: firstMenuText.includes("영업 현황"),
  noGlobalContextBar,
  noGlobalTopButton,
  hasMenuHeader,
  hasDocumentInternalSelector: titleText.includes("문서 만들기") && documentFormText.includes("고객사") && documentFormText.includes("영업 건") && documentFormText.includes("문서 유형") && quoteFormText.includes("최종 제안 금액"),
  hasDocumentSaveCopyFeedback: draftSaveFeedback.includes("임시 저장") && (draftCopyFeedback.includes("복사") || draftCopyFeedback.includes("권한")),
  hasDocumentHistoryActions: documentHistoryFeedback.includes("문서 이력") && documentActivityFeedback.includes("영업 이력"),
  hasDocumentDownload: mailDownloadNameText.includes(".docx") && mailDownloadedFileName.endsWith(".docx") && quoteDownloadNameText.includes(".xlsx") && quoteDownloadedFileName.endsWith(".xlsx"),
  hasSalesInternalFilters: salesHeaderText.includes("영업 현황판") && salesControlsText.includes("검색") && salesControlsText.includes("영업 단계") && salesControlsText.includes("담당자"),
  hasPeriodToggle: statusBoardText.includes("이번 달") && statusBoardText.includes("올해"),
  hasAnnualMetrics: annualSummaryText.includes("올해 예상 매출") && annualSummaryText.includes("올해 수주 매출") && annualSummaryText.includes("목표 달성률"),
  hasPricingInternalSelector: pricingHeaderText.includes("가격 가이드") && pricingText.includes("고객사") && pricingText.includes("영업 건") && pricingText.includes("가격 전략 계산"),
  hasSalesStatusBoard: statusBoardText.includes("영업 현황판") && !statusBoardText.includes("영업 파이프라인"),
  hasSevenStageCards: statusBoardCardCount === 7 && statusBoardText.includes("계약 완료(수주)") && statusBoardText.includes("종료"),
  hasStageDetailModal: stageModalText.includes("상세 상태별 분포") && stageModalText.includes("고객/딜 리스트"),
  hasStageRowDrawer: stageDrawerText.includes("상태 사유") && stageDrawerText.includes("개요") && stageDrawerText.includes("이력"),
  recommendedActionsMenuRemoved: !mobileText.includes("추천 액션"),
  actionRailRemovedFromSalesStatus: actionRailAbsentInSalesStatus,
  hasNextActionPanel: !initialBodyText.includes("추천/근거"),
  hasHanbit: documentFormText.includes("한빛은행"),
  hasValidation: validationText.includes("필수 항목"),
  hasRequiredOptionalBadges: addFormText.includes("필수") && addFormText.includes("선택"),
  hasNewProposalPipeline: salesStatusText.includes("신규 OI 발굴") && salesStatusText.includes("신규 제안") && filteredText.includes("테스트 SSO 신규 제안"),
  hasNewDeal: salesStatusText.includes("테스트산업") && salesStatusText.includes("테스트 SSO 신규 제안"),
  hasTwentyPlusDeals: salesDealRowCount >= 20,
  statusExplanationVisible,
  detailVisible,
  hasDrawerSummary: drawerDetailText.includes("예상 매출") && drawerDetailText.includes("고객 기본 정보") && drawerDetailText.includes("문서") && drawerDetailText.includes("가격"),
  selectedRowVisible: selectedRowCount === 1,
  activityTargetClear: activityTargetText.includes("테스트산업") && activityTargetText.includes("테스트 SSO 신규 제안"),
  hasActivityAppend: detailAfterActivity.includes("1차 미팅 진행") && detailAfterActivity.includes("수정 제안서 전달"),
  hasActivityFeedback: feedbackText.includes("테스트산업 / 테스트 SSO 신규 제안 이력이 추가되었습니다."),
  hasActivityEdit: detailAfterEdit.includes("1차 미팅 진행 수정") && detailAfterEdit.includes("수정일"),
  hasActivityDelete: !detailAfterDelete.includes("1차 미팅 진행 수정"),
  hasNextActionEdit: nextActionEditText.includes("QA 후속 연락") && nextActionEditText.includes("다음 액션이 수정되었습니다."),
  mobileKeepsMenu: mobileText.includes("문서 생성") && mobileText.includes("영업 현황") && mobileText.includes("가격 가이드"),
  hasPricing: pricingText.includes("권장 할인율") && pricingText.includes("유사 레퍼런스") && pricingText.includes("예상 마진율") && pricingText.includes("가격 기준 설정"),
  hasPricingFeedback: pricingCalcFeedback.includes("최신 조건") && pricingSaveFeedback.includes("임시 저장"),
  hasPricingSettings: pricingSettingsText.includes("할인율 기준") && pricingSettingsText.includes("마진 기준") && pricingSettingsSavedText.includes("가격 기준 설정이 저장되었습니다."),
  pricingSettingsAffectResult: pricingRecommendedBefore !== pricingRecommendedAfter,
  consoleErrors,
};
const ok = Object.entries(result)
  .filter(([key]) => !["titleText", "draftTitle", "consoleErrors"].includes(key))
  .every(([, value]) => value === true) && consoleErrors.length === 0;

console.log(JSON.stringify({ ok, ...result }, null, 2));
if (!ok) process.exit(1);
