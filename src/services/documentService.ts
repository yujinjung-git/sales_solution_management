import type { Customer, Deal, License, SalesActivity, SalesDeal, WinLossCase } from "../types";
import type { PricingGuide } from "./pricingService";
import { formatCurrency, formatNumber, today } from "./format";

export type DocumentType =
  | "메일"
  | "견적서"
  | "공문"
  | "제안서";

export type DocumentTone = "공식적" | "정중함" | "간결함" | "영업 친화적" | "기술 설명 중심" | "내부 보고용";
export type DocumentAudience = "고객 전달용" | "내부용";

export type DocumentDraftInput = {
  documentType: DocumentType;
  templateName: string;
  audience: DocumentAudience;
  recipient: string;
  purpose: string;
  tone: DocumentTone;
  keyPoints: string;
  extraRequest: string;
  selectedActivityIds: string[];
  includePricingGuide: boolean;
  emailPurpose: string;
  recipientName: string;
  recipientTitle: string;
  senderName: string;
  subjectDirection: string;
  attachmentName: string;
  quoteLicensePeriod: string;
  quoteMaintenancePeriod: string;
  quoteBuildSupportIncluded: boolean;
  quoteAppliedDiscountRate: number;
  quoteValidUntil: string;
  quoteSpecialTerms: string;
  officialPurpose: string;
  officialRecipient: string;
  officialReferenceDept: string;
  officialSenderDept: string;
  officialTitle: string;
  officialSummary: string;
  officialTechConditions: string;
  officialLimitations: string;
  officialDocumentNo: string;
  officialDate: string;
  documentLength?: "짧게" | "보통" | "자세히";
  outputDetail?: "요약형" | "표준형" | "상세형";
  styleStrength?: "매우 공식적" | "일반 공식" | "실무형" | "친근한 영업형";
  includeItems?: string[];
  excludeItems?: string[];
  excludeText?: string;
  ccRecipient?: string;
};

export type DocumentDraftContext = {
  customer: Customer;
  deal: Deal;
  license: License;
  salesDeal?: SalesDeal;
  activities: SalesActivity[];
  pricingGuide?: PricingGuide;
  cases: WinLossCase[];
};

export type DocumentDraft = {
  id: string;
  documentType: DocumentType;
  templateName: string;
  audience: DocumentAudience;
  title: string;
  sections: { label: string; value: string }[];
  body: string;
  createdAt: string;
  createdBy: string;
  referencedActivityIds: string[];
  includesPricingGuide: boolean;
};

export const documentTemplates: Record<DocumentType, string[]> = {
  메일: ["첫 접촉 메일", "미팅 일정 제안", "견적 송부 메일", "제안서 송부 메일", "미팅 후속 메일", "장기 미응답 재접촉 메일", "자료 요청 메일", "자료 송부 메일"],
  견적서: ["기본 라이선스 견적서", "서버 이중화 포함 견적서", "유지보수 포함 견적서", "공공기관 제출용 견적서", "갱신 견적서", "추가 모듈 견적서"],
  공문: ["제공 공문 양식", "기술 질의 답변 공문", "호환성 확인 공문", "제품 공급 확인 공문", "구축 가능 여부 공문", "가격/견적 제출 공문", "계약/납품 관련 공문"],
  제안서: ["신규 도입 제안서", "추가 모듈 제안서", "갱신 제안서", "SSO 확장 제안서", "OTP 도입 제안서", "공공기관 제안서", "금융권 제안서"],
};

export function buildDocumentContext(
  customer: Customer,
  deal: Deal,
  license: License,
  salesDeal: SalesDeal | undefined,
  activities: SalesActivity[],
  pricingGuide: PricingGuide | undefined,
  cases: WinLossCase[],
): DocumentDraftContext {
  return { customer, deal, license, salesDeal, activities, pricingGuide, cases };
}

export function generateDocumentDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  if (input.documentType === "메일") return generateEmailDraft(input, context);
  if (input.documentType === "견적서") return generateQuoteDraft(input, context);
  if (input.documentType === "공문") return generateOfficialLetterDraft(input, context);
  return generateProposalDraft(input, context);
}

export function generateEmailDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  const customerName = displayCustomer(context.customer);
  const activities = selectedActivityLines(input, context);
  const include = (name: string) => shouldInclude(input, name);
  const title = input.subjectDirection || `[${customerName}] ${input.emailPurpose || input.purpose} 관련 안내`;
  const body = [
    `${input.recipientName || "담당자"} ${input.recipientTitle || "님"}, 안녕하세요.`,
    toneLead(input.tone, context),
    `${customerName} ${context.deal.name} 건과 관련해 ${input.purpose || input.emailPurpose} 목적으로 연락드립니다.`,
    include("최근 영업 이력") && activities.length ? `최근 확인된 이력은 다음과 같습니다.\n${activities.join("\n")}` : "",
    input.keyPoints ? `핵심 내용\n${input.keyPoints}` : "",
    include("제품/모듈 구성") ? `검토 제품/모듈: ${context.customer.installedModules.join(", ")}` : "",
    include("첨부 안내") && input.attachmentName ? `첨부: ${input.attachmentName}` : "",
    include("다음 액션") ? `확인 부탁드릴 사항은 ${context.salesDeal?.nextAction || "다음 검토 일정 및 필요 자료"}입니다.` : "",
    "감사합니다.",
    `${input.senderName || "홍길동"} 드림`,
  ].filter(Boolean).join("\n\n");

  return makeDraft(input, title, [
    ["메일 제목", title],
    ["받는 사람", input.recipientName || input.recipient || "고객 담당자"],
    ["참조", input.ccRecipient || "미등록"],
    ["인사말", `${input.recipientName || "담당자"}님께 전달`],
    ["본문", body],
    ["요청/확인 사항", context.salesDeal?.nextAction || "후속 일정 확인"],
    ["첨부 안내", input.attachmentName || "첨부 없음"],
    ["서명", input.senderName || "홍길동"],
  ], body);
}

export function generateQuoteDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  const customerName = displayCustomer(context.customer);
  const appliedDiscount = input.quoteAppliedDiscountRate || context.deal.requestedDiscountRate;
  const initialPrice = Math.round(context.deal.expectedRevenue / Math.max(0.01, 1 - context.deal.requestedDiscountRate / 100));
  const finalAmount = Math.round(initialPrice * (1 - appliedDiscount / 100));
  const pricing = input.includePricingGuide && context.pricingGuide ? context.pricingGuide : null;
  const unitPrice = Math.round(initialPrice / Math.max(1, context.deal.userCount));
  const discountAmount = initialPrice - finalAmount;
  const body = [
    `${customerName} ${context.deal.name} 견적서 초안`,
    `견적 번호: QT-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${context.deal.id.slice(0, 4).toUpperCase()}`,
    `견적일: ${today.toISOString().slice(0, 10)}`,
    `제품/라이선스 구성: ${context.customer.installedModules.join(", ")}`,
    `수량: ${formatNumber(context.deal.userCount)} User`,
    `단가: ${formatCurrency(unitPrice)}`,
    `공급가: ${formatCurrency(initialPrice)}`,
    `최초 제안가: ${formatCurrency(initialPrice)}`,
    `적용 할인율: ${appliedDiscount}%`,
    `할인 금액: ${formatCurrency(discountAmount)}`,
    `최종 제안 금액: ${formatCurrency(finalAmount)}`,
    `유지보수 조건: ${input.quoteMaintenancePeriod || "1년"}`,
    `구축/기술지원 범위: ${input.quoteBuildSupportIncluded ? "구축 지원 포함" : "기본 기술지원"}`,
    `견적 유효기간: ${input.quoteValidUntil || "발행 후 30일"}`,
    `결제 조건: ${input.extraRequest || "발주 후 협의"}`,
    input.quoteSpecialTerms ? `특이 조건: ${input.quoteSpecialTerms}` : "",
    pricing && input.audience === "내부용" ? `가격 가이드 반영: 권장 할인율 ${pricing.recommendedDiscountRate}%, 최대 허용 할인율 ${pricing.maxAllowedDiscountRate}%, 예상 수주 확률 ${pricing.winProbability}%` : "",
    input.audience === "내부용" && pricing ? `내부 가격 메모: 예상 마진율 ${pricing.expectedMarginRate}%, 마진 위험도 ${pricing.marginRiskLevel}` : "",
  ].filter(Boolean).join("\n");

  return makeDraft(input, `${customerName} ${context.deal.name} 견적서 초안`, [
    ["견적 제목", `${customerName} ${context.deal.name}`],
    ["견적 번호", `QT-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${context.deal.id.slice(0, 4).toUpperCase()}`],
    ["견적일", today.toISOString().slice(0, 10)],
    ["견적 유효기간", input.quoteValidUntil || "발행 후 30일"],
    ["고객 정보", `${customerName} / ${context.customer.industry}`],
    ["제품/라이선스 구성", context.customer.installedModules.join(", ")],
    ["수량", `${formatNumber(context.deal.userCount)} User`],
    ["단가", formatCurrency(unitPrice)],
    ["공급가", formatCurrency(initialPrice)],
    ["할인율", `${appliedDiscount}%`],
    ["할인 금액", formatCurrency(discountAmount)],
    ["최종 금액", formatCurrency(finalAmount)],
    ["유지보수 조건", input.quoteMaintenancePeriod || "1년"],
    ["구축 지원 범위", input.quoteBuildSupportIncluded ? "구축 지원 포함" : "기본 기술지원"],
    ["결제 조건", input.extraRequest || "발주 후 협의"],
    ["비고", input.quoteSpecialTerms || "조건 협의 가능"],
    ...(input.audience === "내부용" && pricing ? [["내부 가격 메모", pricing.internalApprovalMessage] as [string, string]] : []),
  ], body);
}

export function generateOfficialLetterDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  return generateKicaOfficialLetterDraft(input, context);
}

function generateKicaOfficialLetterDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  const customerName = displayCustomer(context.customer);
  const isProvidedTemplate = input.templateName.includes("제공") || input.templateName.includes("양식");
  const target = input.officialTechConditions || (isProvidedTemplate ? "OTP 인증서버 #1, #2" : context.customer.installedModules.join(", ") || context.license.productName);
  const title = input.officialTitle || (isProvidedTemplate ? "취약사항 조치 안내의 건" : `${input.officialPurpose || "기술 질의"} 안내의 건`);
  const docNo = input.officialDocumentNo || "OO사업팀-26-00";
  const officialDate = formatOfficialDate(input.officialDate || "2026-04-07");
  const recipient = input.officialRecipient || customerName;
  const reference = input.officialReferenceDept || "수신처 제위";
  const recipientBaseName = recipient.replace(/\(.+\)/, "");
  const honorific = recipientBaseName.includes("공사")
    ? "귀 공사"
    : context.customer.industry.includes("공공")
      ? "귀 기관"
      : "귀 사";
  const defaultPlan = isProvidedTemplate
    ? "8443 포트는 현재 API 통신 용도로 사용 중이며, 연동 시스템이 명확히 식별되지 않은 상태에서 서버 방화벽 ACL 적용 시 서비스 영향이 발생할 가능성이 있어 즉시 조치는 어려운 상황입니다."
    : `${target} 관련 요청 사항은 서비스 영향도와 연동 시스템을 확인한 뒤 단계적으로 조치할 예정입니다.`;
  const plan = input.officialSummary || defaultPlan;
  const requestContext = input.keyPoints || `${context.deal.name} 관련 사항`;
  const body = [
    "(http://www.sales_crm.co.kr)",
    "",
    "(12345) 경기도 성남시 수정구 금토로 123, 1층",
    "담당자  OO사업팀 홍길동 과장 전화 010-1234-5678 팩스 02-123-1234 메일 salescrm@google.com",
    "",
    `문서번호 : ${docNo}`,
    `시행일자 : ${officialDate}`,
    `수    신 : ${recipient}`,
    `참    조 : ${reference}`,
    `제    목 : ${title}`,
    "",
    `1. ${honorific}의 무궁한 발전을 기원합니다.`,
    `2. ${honorific}에서 통보해주신 ${requestContext}와 관련하여, 다음과 같은 사유로 즉시 조치가 불가피하게 지연됨을 안내 드리오니, 업무에 참고 부탁드립니다.`,
    "",
    "- 아 래 -",
    `가.       조치 대상 : ${target}`,
    `나.       조치 계획 : ${plan}`,
    input.officialLimitations ? `다.       제한 사항 : ${input.officialLimitations}` : "",
    input.attachmentName ? `붙임 : ${input.attachmentName}` : "",
    "",
    "CRM 주식회사 대표이사",
  ].filter(Boolean).join("\n");

  return makeDraft(input, title, [
    ["문서 번호", docNo],
    ["시행일", officialDate],
    ["수신", recipient],
    ["참조", reference],
    ["제목", title],
    ["주소", "(12345) 경기도 성남시 수정구 금토로 123, 1층"],
    ["담당자", "OO사업팀 홍길동 과장 / 010-1234-5678 / salescrm@google.com"],
    ["본문", body],
    ["조치 대상", target],
    ["조치 계획", plan],
    ["검토 의견", "서비스 영향도를 고려하여 연동 시스템 식별 후 단계적으로 조치 예정"],
    ["첨부", input.attachmentName || "없음"],
  ], body);
}

function generateOfficialLetterDraftLegacy(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  const customerName = displayCustomer(context.customer);
  const target = context.customer.installedModules.join(", ") || context.license.productName;
  const plan = input.officialSummary || `${target} 관련 요청 사항은 서비스 영향도와 연동 시스템 확인 후 단계적으로 조치 및 회신 예정입니다.`;
  const title = input.officialTitle || `${input.officialPurpose || "취약사항"} 조치 안내의 건`;
  const docNo = input.officialDocumentNo || "OO사업팀-26-00";
  const officialDate = formatOfficialDate(input.officialDate || "2026-05-28");
  const recipient = input.officialRecipient || customerName;
  const reference = input.officialReferenceDept || "수신처 제위";
  const recipientShortName = recipient.replace(/\(.+\)/, "");
  const honorific = recipientShortName.endsWith("공사") || recipientShortName.endsWith("기관") || context.customer.industry.includes("공공") ? "귀 공사" : "귀 사";
  const bodyParagraph = input.officialSummary || `${context.deal.name} 건과 관련하여, 다음과 같은 사유로 조치 및 검토 일정 안내가 필요함을 전달드립니다.`;
  const body = [
    "(http://www.sales_crm.co.kr)",
    "",
    "(12345) 경기도 성남시 수정구 금토로 123, 1층",
    "담당자  OO사업팀 홍길동 과장 전화 010-1234-5678 팩스 02-123-1234 메일 salescrm@google.com",
    "",
    `문서번호 : ${docNo}`,
    `시행일자 : ${officialDate}`,
    `수    신 : ${recipient}`,
    `참    조 : ${reference}`,
    `제    목 : ${title}`,
    "",
    `1. ${honorific}의 무궁한 발전을 기원합니다.`,
    `2. ${honorific}에서 통보해주신 ${context.deal.name} 관련 사항과 관련하여, ${bodyParagraph}`,
    "",
    "- 아 래 –",
    `가.       조치 대상 : ${target}`,
    `나.       조치 계획 : ${plan}`,
    input.officialTechConditions ? `다.       기술 조건 : ${input.officialTechConditions}` : "",
    input.officialLimitations ? `라.       제한 사항 : ${input.officialLimitations}` : "",
    input.attachmentName ? `붙임 : ${input.attachmentName}` : "",
    "",
    "CRM 주식회사 대표이사",
  ].filter(Boolean).join("\n");
  return makeDraft(input, title, [
    ["문서 번호", docNo],
    ["시행일", officialDate],
    ["수신", recipient],
    ["참조", reference],
    ["제목", title],
    ["주소", "(12345) 경기도 성남시 수정구 금토로 123, 1층"],
    ["담당자", "OO사업팀 홍길동 과장 / 010-1234-5678 / salescrm@google.com"],
    ["본문", body],
    ["조치 대상", target],
    ["조치 계획", plan],
    ["검토 의견", input.officialSummary || "서비스 영향도를 고려하여 단계적으로 조치 예정"],
    ["첨부", input.attachmentName || "없음"],
  ], body);
}

function generateProposalDraft(input: DocumentDraftInput, context: DocumentDraftContext): DocumentDraft {
  const pricing = input.includePricingGuide && context.pricingGuide ? context.pricingGuide : null;
  const internal = input.audience === "내부용";
  const include = (name: string) => shouldInclude(input, name);
  const body = [
    `${displayCustomer(context.customer)} 제안서`,
    `작성 목적: ${input.purpose}`,
    `영업 건: ${context.deal.name}`,
    `현재 단계: ${context.salesDeal?.salesStage || context.deal.stage} / ${context.salesDeal?.detailStage || "상세 미등록"}`,
    include("상태 사유") ? `상태 사유: ${context.salesDeal?.statusReason || "미등록"}` : "",
    include("고객 요구사항 요약") ? `핵심 내용: ${input.keyPoints || "고객 검토 상황과 후속 액션을 중심으로 정리합니다."}` : "",
    include("최근 영업 이력") ? selectedActivityLines(input, context).join("\n") : "",
    pricing && include("가격 조건") ? `가격 판단: 권장 할인율 ${pricing.recommendedDiscountRate}%, 최대 허용 할인율 ${pricing.maxAllowedDiscountRate}${internal ? `, 수주 확률 ${pricing.winProbability}%` : ""}` : "",
    internal && pricing ? `내부 참고: ${pricing.internalApprovalMessage}` : "",
    include("다음 액션") ? `후속 액션: ${context.salesDeal?.nextAction || "고객 확인 후 다음 일정 확정"}` : "",
  ].filter(Boolean).join("\n\n");
  return makeDraft(input, `${displayCustomer(context.customer)} ${context.deal.name} 제안서`, [
    ["표지", `${displayCustomer(context.customer)} ${context.deal.name} 제안서`],
    ["제안 배경", `${context.customer.industry} 고객의 ${context.deal.name} 검토 건입니다.`],
    ["고객 요구사항 요약", input.keyPoints || context.customer.environment.join(", ")],
    ["제안 제품/모듈", context.customer.installedModules.join(", ")],
    ["구성안", `${formatNumber(context.deal.userCount)} User 기준 인증 구성`],
    ["기대 효과", "인증 보안 강화, 운영 편의성 개선, 향후 확장 기반 확보"],
    ["구축 범위", context.customer.environment.join(", ")],
    ["일정", "기술 검토 후 구축 일정 확정"],
    ["견적 요약", pricing ? `권장 할인율 ${pricing.recommendedDiscountRate}%, 요청 할인율 ${context.deal.requestedDiscountRate}%` : formatCurrency(context.deal.expectedRevenue)],
    ["레퍼런스", context.cases.slice(0, 3).map((item) => `${item.customerName} ${item.result}`).join(", ")],
    ["후속 제안 사항", context.salesDeal?.nextAction || "고객 검토 후 후속 제안"],
  ], body);
}

function makeDraft(input: DocumentDraftInput, title: string, sectionPairs: [string, string][], body: string): DocumentDraft {
  return {
    id: `doc-${Date.now()}`,
    documentType: input.documentType,
    templateName: input.templateName,
    audience: input.audience,
    title,
    sections: sectionPairs.map(([label, value]) => ({ label, value })),
    body,
    createdAt: today.toISOString().slice(0, 10),
    createdBy: "홍길동",
    referencedActivityIds: input.selectedActivityIds,
    includesPricingGuide: input.includePricingGuide,
  };
}

function selectedActivityLines(input: DocumentDraftInput, context: DocumentDraftContext) {
  return context.activities
    .filter((activity) => input.selectedActivityIds.includes(activity.id))
    .map((activity) => `- ${activity.activityDate} ${activity.activityType}: ${activity.title}`);
}

function shouldInclude(input: DocumentDraftInput, name: string) {
  if (!input.includeItems?.length) return true;
  return input.includeItems.includes(name);
}

function toneLead(tone: DocumentTone, context: DocumentDraftContext) {
  if (tone === "간결함") return "문의주신 구성은 적용 가능 여부를 아래 조건 중심으로 확인하면 됩니다.";
  if (tone === "영업 친화적") return "현재 검토 중인 구성은 향후 인증 범위 확장까지 고려할 때 적합한 방향입니다.";
  if (tone === "기술 설명 중심") return `${context.customer.environment.join(", ")} 조건을 기준으로 기술 검토 의견을 정리했습니다.`;
  if (tone === "내부 보고용") return "본 건은 기술 검토와 가격 협상 전 고객 예산 확인이 필요한 상태입니다.";
  return "귀 기관에서 문의하신 사항에 대해 아래와 같이 검토 의견을 전달드립니다.";
}

function displayCustomer(customer: Customer) {
  return customer.displayName || customer.name;
}

function formatOfficialDate(value: string) {
  return value.replace(/-/g, ".");
}
