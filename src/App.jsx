import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, BriefcaseBusiness, ChevronRight, ClipboardList, FileText, History, Layers3, LayoutDashboard, Plus, Settings2, ShieldCheck, X, } from "lucide-react";
import { crmData } from "./data/mockData";
import { maintenanceContracts, maintenanceGeneratedAt } from "./data/maintenanceContracts";
import { buildDocumentContext, documentTemplates, generateDocumentDraft, } from "./services/documentService";
import { calculatePricingGuide, createDefaultPricingInput, defaultPricingGuideSettings, } from "./services/pricingService";
import { buildExportFileName, exportDocument, getSupportedExportFormats, recommendedExportFormat, } from "./services/documentExportService";
import { defaultSalesStatusSettings, deriveDealFromActivity, detailStagesBySalesStage, getSalesOverview, getSalesPeriodSummary, pipelineStages, } from "./services/salesOverviewService";
import { calculateExistingCustomerStatus, getExistingCustomerStatusReason, getExistingCustomerSummary, opportunityToSalesDeal, } from "./services/existingCustomerService";
import { formatCurrency, formatNumber, today } from "./services/format";
const salesTableColumnStorageKey = "sales-crm-sales-table-columns";
const salesTableSortStorageKey = "sales-crm-sales-table-sort";
const salesTableViewStorageKey = "sales-crm-sales-table-view";
const defaultSalesColumnKeys = [
    "customer",
    "deal",
    "status",
    "salesStage",
    "nextAction",
    "dueDate",
    "contact",
    "expectedRevenue",
    "lastContact",
];
const optionalSalesColumnKeys = [
    "detailStage",
    "phone",
    "notes",
    "owner",
    "industry",
    "products",
    "requestedDiscount",
    "competitor",
    "source",
    "memo",
];
const salesColumnMeta = {
    customer: { label: "고객사", width: 240, required: true, sortable: true },
    deal: { label: "영업 건", width: 260, required: true, sortable: true },
    status: { label: "상태", width: 96, sortable: true },
    salesStage: { label: "영업 단계", width: 136, sortable: true },
    nextAction: { label: "다음 액션", width: 240 },
    dueDate: { label: "기한", width: 116, sortable: true },
    contact: { label: "고객 담당자", width: 160, sortable: true },
    expectedRevenue: { label: "예상 매출", width: 138, sortable: true },
    lastContact: { label: "마지막 컨택", width: 120, sortable: true },
    detailStage: { label: "상세 상태", width: 136, sortable: true },
    phone: { label: "연락처", width: 138 },
    notes: { label: "특이사항", width: 190 },
    owner: { label: "담당자", width: 108, sortable: true },
    industry: { label: "산업군", width: 104, sortable: true },
    products: { label: "제품/모듈", width: 180 },
    requestedDiscount: { label: "요청 할인율", width: 112, sortable: true },
    competitor: { label: "경쟁사 여부", width: 112 },
    source: { label: "유입 경로", width: 136 },
    memo: { label: "메모", width: 260 },
};
const salesStatusSortOrder = ["위험", "지연", "주의", "보류", "정상", "수주", "실패"];
const documentTypes = [
    "메일",
    "견적서",
    "공문",
    "제안서",
];
const documentTones = ["공식적", "정중함", "간결함", "영업 친화적", "기술 설명 중심", "내부 보고용"];
const documentTypeCards = {
    메일: {
        description: "고객에게 보낼 첫 접촉, 후속 연락, 자료 송부 메일을 작성합니다.",
        examples: "견적 송부 메일, 미팅 후속 메일",
        recommended: "Word, PDF",
    },
    견적서: {
        description: "라이선스, 유지보수, 증설 견적서를 표 형태로 작성합니다.",
        examples: "기본 견적서, 공공기관 제출용 견적서",
        recommended: "Excel, PDF",
    },
    공문: {
        description: "공식 기술 답변, 제품 공급 확인, 구축 가능 여부 공문을 작성합니다.",
        examples: "기술 질의 답변 공문, 호환성 확인 공문",
        recommended: "Word, PDF",
    },
    제안서: {
        description: "고객 요구사항과 제품 구성을 바탕으로 제안 문서를 작성합니다.",
        examples: "신규 도입 제안서, 고도화 제안서",
        recommended: "Word, PDF",
    },
};
const documentIncludeOptions = ["고객 요구사항 요약", "최근 영업 이력", "제품/모듈 구성", "기술 조건", "가격 조건", "유지보수 조건", "구축 일정", "레퍼런스", "다음 액션", "첨부 안내", "상태 사유"];
const documentExcludeOptions = ["내부 메모 제외", "마진 정보 제외", "가격 방어 논리 제외", "실패 사례 제외", "담당자 개인 메모 제외"];
const contactRoles = ["실무 담당자", "기술 담당자", "구매 담당자", "의사결정자", "최종 승인권자", "파트너 담당자", "기타"];
const contactMethods = ["전화", "이메일", "문자", "메신저", "방문 미팅", "미확인"];
const influenceLevels = ["낮음", "보통", "높음", "핵심"];
const activityTypes = [
    "신규 인입",
    "신규 제안",
    "전화",
    "이메일",
    "미팅",
    "견적서 발송",
    "제안서 발송",
    "기술 검토",
    "보안 검토",
    "추가 자료 송부",
    "공문 발송",
    "내부 검토",
    "계약 협의",
    "계약 완료",
    "발주 완료",
    "보류",
    "수주",
    "실패",
    "기타",
];
const defaultInquiry = {
    kri: "aarch64 아키텍처와 망분리 환경에서 OTP 서버 이중화 구성이 가능한지 공식 답변서 형태로 정리해 주세요.",
    "hanbit-bank": "VPN 인증만 사용 중인 환경에서 내부 업무 포털 SSO까지 확장 가능한지와 감사 로그 강화 방안을 제안서 형태로 정리해 주세요.",
    semyeong: "라이선스 갱신 시점에 DR 구성과 사용자 증설을 함께 제안할 수 있도록 고객 전달용 초안을 작성해 주세요.",
};
const statusLabels = {
    정상: "정상",
    주의: "주의",
    지연: "지연",
    위험: "위험",
    보류: "보류",
    수주: "수주",
    실패: "실패",
};
const priorityLabels = {
    high: "높음",
    medium: "중간",
    low: "낮음",
};
const headerCopy = {
    documents: {
        title: "문서 만들기",
        description: "고객 정보, 영업 이력, 가격 기준을 바탕으로 메일, 견적서, 공문 초안을 작성합니다.",
    },
    salesStatus: {
        title: "영업 현황판",
        description: "진행 중인 영업 건, 다음 액션, 위험 딜을 한눈에 확인합니다.",
    },
    existingCustomers: {
        title: "기존 고객 관리",
        description: "계약 완료 고객의 라이선스, 갱신 일정, 추가 영업 기회를 관리합니다.",
    },
    maintenanceContracts: {
        title: "유지보수 계약관리",
        description: "유지보수 엑셀 데이터를 기반으로 계약 만료, 청구 방식, 제품별 고객사, 파트너사를 관리합니다.",
    },
    recommendedActions: {
        title: "추천 액션",
        description: "오늘 처리할 일과 위험 딜 후속 액션을 우선순위로 확인합니다.",
    },
    pricing: {
        title: "가격 가이드",
        description: "유사 Win/Loss 사례를 바탕으로 권장 할인율과 협상 기준을 확인합니다.",
    },
};
const currentUser = {
    id: "user-001",
    name: "홍길동",
    role: "영업 담당자",
    email: "demo@salesops.ai",
};
const pricingSettingsStorageKey = "sales-crm-pricing-settings";
function customerDisplayName(customer) {
    return customer.displayName || customer.name;
}
function toDocumentCustomer(deal) {
    if (!deal)
        return crmData.customers[0];
    return {
        id: deal.customerId,
        name: deal.customerName,
        baseName: deal.customerName.split("(")[0],
        displayName: deal.customerName,
        industry: deal.industry,
        companySize: `${formatNumber(deal.expectedUserCount)} User`,
        healthScore: deal.computedStatus === "위험" ? 48 : deal.computedStatus === "주의" ? 64 : 78,
        environment: [deal.detailStage, deal.source, deal.memo || "영업 현황 데이터 기반"],
        installedModules: deal.productModules?.length ? deal.productModules : ["OTP"],
        recentIssues: [deal.computedStatusReason || deal.statusReason],
    };
}
function toDocumentDeal(deal) {
    const fallback = crmData.deals[0];
    if (!deal)
        return fallback;
    return {
        id: deal.id,
        customerId: deal.customerId,
        name: deal.title,
        stage: deal.detailStage,
        userCount: deal.expectedUserCount || fallback.userCount,
        expectedRevenue: deal.expectedRevenue,
        competitorInvolved: deal.competitorInvolved,
        requestedDiscountRate: deal.requestedDiscountRate ?? 0,
    };
}
function toDocumentLicense(deal) {
    const fallback = crmData.licenses[0];
    if (!deal)
        return fallback;
    return {
        id: `lic-${deal.id}`,
        customerId: deal.customerId,
        productName: deal.productModules?.join(", ") || "OTP Suite",
        licenseCount: deal.expectedUserCount || fallback.licenseCount,
        usageRate: 70,
        startDate: "2026-05-30",
        endDate: "2027-05-29",
        maintenanceEndDate: "2027-05-29",
    };
}
function draftToText(draft) {
    return [
        draft.title,
        `문서 유형: ${draft.documentType}`,
        `템플릿: ${draft.templateName}`,
        ...draft.sections.map((section) => `${section.label}\n${section.value}`),
        draft.body,
    ].join("\n\n");
}
function getPrimaryContact(contacts, customerId, preferredId) {
    return contacts.find((contact) => contact.id === preferredId)
        ?? contacts.find((contact) => contact.customerId === customerId && contact.isPrimary)
        ?? contacts.find((contact) => contact.customerId === customerId)
        ?? null;
}
function contactSummary(contact) {
    if (!contact)
        return "미등록";
    return `${contact.name}${contact.department ? ` / ${contact.department}` : ""}`;
}
function contactDetail(contact) {
    if (!contact)
        return "미등록";
    return [contact.name, contact.department, contact.position, contact.role].filter(Boolean).join(" / ");
}
function getCustomerNote(notes, customerId) {
    return notes.find((note) => note.customerId === customerId) ?? { customerId };
}
function hasCustomerNotes(note) {
    if (!note)
        return false;
    return Boolean(note.customerNote || note.salesNote || note.technicalNote || note.contractNote || note.relationshipNote || note.internalNote);
}
function shortNoteLabels(note) {
    if (!note)
        return [];
    return [
        note.customerNote && "특이사항 있음",
        note.salesNote && "가격/영업 주의",
        note.technicalNote && "기술 주의",
        note.contractNote && "계약 주의",
    ].filter(Boolean);
}
function customerNoteTooltip(note) {
    if (!note || !hasCustomerNotes(note))
        return "등록된 특이사항이 없습니다.";
    return [
        note.customerNote && `고객: ${note.customerNote}`,
        note.salesNote && `영업: ${note.salesNote}`,
        note.technicalNote && `기술: ${note.technicalNote}`,
        note.contractNote && `계약: ${note.contractNote}`,
        note.relationshipNote && `관계: ${note.relationshipNote}`,
        note.internalNote && `내부: ${note.internalNote}`,
    ].filter(Boolean).join(" / ");
}
function loadSalesTableColumns() {
    try {
        const saved = localStorage.getItem(salesTableColumnStorageKey);
        if (!saved)
            return defaultSalesColumnKeys;
        const parsed = JSON.parse(saved);
        const allColumns = new Set([...defaultSalesColumnKeys, ...optionalSalesColumnKeys]);
        const validColumns = parsed.filter((column) => allColumns.has(column));
        const requiredColumns = defaultSalesColumnKeys.filter((column) => salesColumnMeta[column].required);
        const merged = [...requiredColumns, ...validColumns.filter((column) => !requiredColumns.includes(column))];
        return merged.length >= requiredColumns.length ? merged : defaultSalesColumnKeys;
    }
    catch {
        return defaultSalesColumnKeys;
    }
}
function loadSalesTableViewMode() {
    try {
        const saved = localStorage.getItem(salesTableViewStorageKey);
        return saved === "card" ? "card" : "table";
    }
    catch {
        return "table";
    }
}
function loadSalesSortState() {
    try {
        const saved = localStorage.getItem(salesTableSortStorageKey);
        if (!saved)
            return null;
        const parsed = JSON.parse(saved);
        if (!parsed)
            return null;
        if (!salesColumnMeta[parsed.key]?.sortable)
            return null;
        return parsed.direction === "desc" ? { key: parsed.key, direction: "desc" } : { key: parsed.key, direction: "asc" };
    }
    catch {
        return null;
    }
}
function compareText(a, b) {
    return (a || "").localeCompare(b || "", "ko");
}
function compareDate(a, b) {
    return new Date(a || "9999-12-31").getTime() - new Date(b || "9999-12-31").getTime();
}
function defaultDealSort(a, b) {
    const statusDiff = salesStatusSortOrder.indexOf(a.computedStatus) - salesStatusSortOrder.indexOf(b.computedStatus);
    if (statusDiff !== 0)
        return statusDiff;
    const dueDiff = compareDate(a.nextActionDueDate, b.nextActionDueDate);
    if (dueDiff !== 0)
        return dueDiff;
    return b.expectedRevenue - a.expectedRevenue;
}
function getDealSortValue(deal, key, contacts) {
    const primaryContact = getPrimaryContact(contacts, deal.customerId, deal.primaryContactId);
    if (key === "customer")
        return deal.customerName;
    if (key === "deal")
        return deal.title;
    if (key === "salesStage")
        return pipelineStages.indexOf(deal.salesStage);
    if (key === "detailStage")
        return deal.detailStage;
    if (key === "status")
        return salesStatusSortOrder.indexOf(deal.computedStatus);
    if (key === "expectedRevenue")
        return deal.expectedRevenue;
    if (key === "owner")
        return deal.owner;
    if (key === "contact")
        return contactSummary(primaryContact);
    if (key === "lastContact")
        return deal.lastContactDate;
    if (key === "dueDate")
        return deal.nextActionDueDate || "9999-12-31";
    if (key === "requestedDiscount")
        return deal.requestedDiscountRate ?? -1;
    if (key === "industry")
        return deal.industry;
    return "";
}
function sortSalesDeals(deals, sortState, contacts) {
    const sorted = [...deals];
    if (!sortState)
        return sorted.sort(defaultDealSort);
    sorted.sort((a, b) => {
        const left = getDealSortValue(a, sortState.key, contacts);
        const right = getDealSortValue(b, sortState.key, contacts);
        let result = 0;
        if (sortState.key === "status" || sortState.key === "salesStage" || sortState.key === "expectedRevenue" || sortState.key === "requestedDiscount") {
            result = Number(left) - Number(right);
        }
        else if (sortState.key === "lastContact" || sortState.key === "dueDate") {
            result = compareDate(String(left), String(right));
        }
        else {
            result = compareText(String(left), String(right));
        }
        return sortState.direction === "desc" ? -result : result;
    });
    return sorted;
}
function cardSortOptionFromState(sortState) {
    if (!sortState)
        return "default";
    if (sortState.key === "status" && sortState.direction === "asc")
        return "risk";
    if (sortState.key === "dueDate" && sortState.direction === "asc")
        return "due";
    if (sortState.key === "expectedRevenue" && sortState.direction === "desc")
        return "revenue";
    if (sortState.key === "lastContact" && sortState.direction === "asc")
        return "lastContactOld";
    if (sortState.key === "customer" && sortState.direction === "asc")
        return "customer";
    return "default";
}
function sortStateFromCardOption(option) {
    if (option === "risk")
        return { key: "status", direction: "asc" };
    if (option === "due")
        return { key: "dueDate", direction: "asc" };
    if (option === "revenue")
        return { key: "expectedRevenue", direction: "desc" };
    if (option === "lastContactOld")
        return { key: "lastContact", direction: "asc" };
    if (option === "customer")
        return { key: "customer", direction: "asc" };
    return null;
}
function loadPricingSettings() {
    try {
        const saved = localStorage.getItem(pricingSettingsStorageKey);
        if (!saved)
            return defaultPricingGuideSettings;
        const parsed = JSON.parse(saved);
        return {
            ...defaultPricingGuideSettings,
            ...parsed,
            industryDiscountWeight: { ...defaultPricingGuideSettings.industryDiscountWeight, ...parsed.industryDiscountWeight },
            winProbability: { ...defaultPricingGuideSettings.winProbability, ...parsed.winProbability },
            referenceWeights: { ...defaultPricingGuideSettings.referenceWeights, ...parsed.referenceWeights },
        };
    }
    catch {
        return defaultPricingGuideSettings;
    }
}
const emptySalesForm = {
    salesType: "신규 인입",
    customerName: "",
    industry: "",
    contactName: "",
    contactDepartment: "",
    contactPosition: "",
    contactRole: "실무 담당자",
    contactPhone: "",
    contactEmail: "",
    title: "",
    proposedModules: "",
    estimatedUserCount: "",
    expectedRevenue: "",
    source: "",
    salesStage: "신규 OI 발굴",
    detailStage: "신규 인입",
    owner: "",
    firstContactDate: "2026-05-28",
    lastContactDate: "2026-05-28",
    nextAction: "",
    nextActionDueDate: "2026-06-01",
    competitorInvolved: "no",
    requestedDiscountRate: "",
    attachmentName: "",
    customerNote: "",
    salesNote: "",
    technicalNote: "",
    contractNote: "",
    relationshipNote: "",
    internalNote: "",
    memo: "",
};
const emptyActivityForm = {
    activityDate: "2026-05-28",
    activityType: "전화",
    customerContactId: "",
    title: "",
    description: "",
    owner: "",
    nextAction: "",
    nextActionDueDate: "",
    relatedDocumentName: "",
    memo: "",
};
function App() {
    const [authUser, setAuthUser] = useState(() => {
        return localStorage.getItem("sales-crm-auth") === "true" ? currentUser : null;
    });
    function handleLogin(email, password) {
        if (email === "demo@salesops.ai" && password === "demo1234") {
            localStorage.setItem("sales-crm-auth", "true");
            setAuthUser(currentUser);
            return true;
        }
        return false;
    }
    function handleLogout() {
        localStorage.removeItem("sales-crm-auth");
        setAuthUser(null);
    }
    if (!authUser) {
        return <LoginView onLogin={handleLogin}/>;
    }
    return <CrmShell user={authUser} onLogout={handleLogout}/>;
}
function CrmShell({ user, onLogout }) {
    const [activeView, setActiveView] = useState("salesStatus");
    const [customerId, setCustomerId] = useState(crmData.customers[0].id);
    const [documentType, setDocumentType] = useState(documentTypes[0]);
    const [tone, setTone] = useState("공식적");
    const [inquiry, setInquiry] = useState(defaultInquiry[customerId]);
    const [draft, setDraft] = useState(null);
    const [salesDeals, setSalesDeals] = useState(crmData.salesDeals);
    const [salesTasks, setSalesTasks] = useState(crmData.salesTasks);
    const [salesActivities, setSalesActivities] = useState(crmData.salesActivities);
    const [existingCustomers, setExistingCustomers] = useState(crmData.existingCustomers);
    const [customerOpportunities, setCustomerOpportunities] = useState(crmData.customerOpportunities);
    const [customerContacts, setCustomerContacts] = useState(crmData.customerContacts);
    const [customerNotes, setCustomerNotes] = useState(crmData.customerNotes);
    const [savedDocuments, setSavedDocuments] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("sales-crm-document-history") || "[]");
        }
        catch {
            return [];
        }
    });
    const [savedPricingGuides, setSavedPricingGuides] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("sales-crm-pricing-history") || "[]");
        }
        catch {
            return [];
        }
    });
    const [statusSettings, setStatusSettings] = useState(defaultSalesStatusSettings);
    const [pricingSettings, setPricingSettings] = useState(loadPricingSettings);
    const [drawerDealId, setDrawerDealId] = useState(null);
    const [documentDealId, setDocumentDealId] = useState(crmData.salesDeals[0].id);
    const [pricingInput, setPricingInput] = useState(() => createDefaultPricingInput(crmData.deals[0], crmData.customers[0].industry, crmData.customers[0].installedModules));
    const customer = crmData.customers.find((item) => item.id === customerId) ?? crmData.customers[0];
    const deal = crmData.deals.find((item) => item.customerId === customer.id) ?? crmData.deals[0];
    const license = crmData.licenses.find((item) => item.customerId === customer.id) ?? crmData.licenses[0];
    const industryCases = crmData.winLossCases.filter((item) => item.industry === customer.industry);
    const opportunitySalesDeals = useMemo(() => customerOpportunities
        .filter((opportunity) => opportunity.activeInSalesPipeline)
        .map((opportunity) => {
        const existingCustomer = existingCustomers.find((item) => item.id === opportunity.existingCustomerId);
        return existingCustomer ? opportunityToSalesDeal(opportunity, existingCustomer) : null;
    })
        .filter((item) => Boolean(item)), [customerOpportunities, existingCustomers]);
    const allSalesDeals = useMemo(() => {
        const opportunityIds = new Set(opportunitySalesDeals.map((item) => item.id));
        return [...salesDeals.filter((deal) => !opportunityIds.has(deal.id)), ...opportunitySalesDeals];
    }, [salesDeals, opportunitySalesDeals]);
    const salesOverview = useMemo(() => getSalesOverview(allSalesDeals, salesTasks, salesActivities, statusSettings), [allSalesDeals, salesTasks, salesActivities, statusSettings]);
    const drawerDeal = salesOverview.dealsWithStatus.find((item) => item.id === drawerDealId) ?? null;
    const documentSalesDeal = salesOverview.dealsWithStatus.find((item) => item.id === documentDealId) ?? salesOverview.dealsWithStatus[0];
    const documentCustomer = toDocumentCustomer(documentSalesDeal);
    const documentDeal = toDocumentDeal(documentSalesDeal);
    const documentLicense = toDocumentLicense(documentSalesDeal);
    const documentIndustryCases = crmData.winLossCases.filter((item) => item.industry === documentCustomer.industry);
    const documentPricingInput = createDefaultPricingInput(documentDeal, documentCustomer.industry, documentCustomer.installedModules);
    const documentPricingGuide = calculatePricingGuide(documentDeal, documentIndustryCases, documentPricingInput, pricingSettings);
    const documentActivities = salesActivities.filter((activity) => activity.customerId === documentCustomer.id || activity.dealId === documentSalesDeal?.id);
    const pricingGuide = useMemo(() => calculatePricingGuide(deal, industryCases, pricingInput, pricingSettings), [deal, industryCases, pricingInput, pricingSettings]);
    const currentHeader = headerCopy[activeView];
    function handleCustomerChange(nextCustomerId) {
        const nextDeal = crmData.deals.find((item) => item.customerId === nextCustomerId);
        setCustomerId(nextCustomerId);
        setInquiry(defaultInquiry[nextCustomerId]);
        setDraft(null);
        const nextCustomer = crmData.customers.find((item) => item.id === nextCustomerId) ?? crmData.customers[0];
        setPricingInput(createDefaultPricingInput(nextDeal, nextCustomer.industry, nextCustomer.installedModules));
    }
    function savePricingSettings(settings) {
        localStorage.setItem(pricingSettingsStorageKey, JSON.stringify(settings));
        setPricingSettings(settings);
    }
    function saveDocument(document) {
        setSavedDocuments((current) => {
            const next = [document, ...current.filter((item) => item.id !== document.id)];
            localStorage.setItem("sales-crm-document-history", JSON.stringify(next));
            return next;
        });
    }
    function updateDocumentDownload(documentId) {
        setSavedDocuments((current) => {
            const next = current.map((item) => item.id === documentId ? { ...item, lastDownloadedAt: formatDate(today) } : item);
            localStorage.setItem("sales-crm-document-history", JSON.stringify(next));
            return next;
        });
    }
    function savePricingGuideResult(record) {
        setSavedPricingGuides((current) => {
            const next = [record, ...current];
            localStorage.setItem("sales-crm-pricing-history", JSON.stringify(next));
            return next;
        });
        const activity = {
            id: `act-pricing-${Date.now()}`,
            dealId: record.dealId,
            customerId: record.customerId,
            customerName: record.customerName,
            activityDate: record.calculatedAt,
            activityType: "내부 검토",
            title: "가격 가이드 결과 저장",
            description: `요청 ${record.requestedDiscountRate}% / 권장 ${record.recommendedDiscountRate}% / 마지노선 ${record.maxAllowedDiscountRate}% / 수주 확률 ${record.winProbability}%`,
            owner: record.calculatedBy,
            memo: record.strategySummary,
            createdAt: record.calculatedAt,
        };
        setSalesActivities((current) => [activity, ...current]);
    }
    function createDraft(input) {
        setDraft(generateDocumentDraft(input, buildDocumentContext(customer, deal, documentLicense, documentSalesDeal, documentActivities, documentPricingGuide, documentIndustryCases)));
    }
    function addDocumentDeal(form) {
        const id = `doc-deal-${Date.now()}`;
        const customerKey = `doc-customer-${Date.now()}`;
        const modules = form.productModules.split(",").map((item) => item.trim()).filter(Boolean);
        const newDeal = {
            id,
            customerId: customerKey,
            customerName: form.customerName.trim(),
            title: form.title.trim(),
            salesType: "신규 인입",
            salesStage: "신규 OI 발굴",
            detailStage: "신규 인입",
            industry: form.industry.trim() || "엔터프라이즈",
            expectedRevenue: Number(form.expectedRevenue || 0),
            owner: form.owner.trim() || "홍길동",
            firstContactDate: formatDate(today),
            lastContactDate: formatDate(today),
            lastUpdatedAt: formatDate(today),
            nextAction: "문서 초안 작성 후 고객 확인",
            nextActionDueDate: formatDate(today),
            status: "정상",
            statusReason: "문서 만들기 화면에서 신규 등록된 영업 건입니다.",
            source: "문서 만들기 직접 등록",
            productModules: modules.length ? modules : ["OTP"],
            expectedUserCount: Number(form.userCount || 0),
            competitorInvolved: false,
            requestedDiscountRate: 0,
            memo: "문서 작성 중 생성된 고객/영업 건",
        };
        setSalesDeals((current) => [newDeal, ...current]);
        setDocumentDealId(id);
        setDraft(null);
    }
    function addSalesDeal(form) {
        const id = `sd-${Date.now()}`;
        const matchedCustomer = crmData.customers.find((item) => [item.name, item.displayName, item.baseName].filter(Boolean).includes(form.customerName.trim()));
        const customerKey = matchedCustomer?.id ?? `custom-${Date.now()}`;
        const contactId = form.contactName.trim() ? `contact-${customerKey}-${Date.now()}` : undefined;
        const newDeal = {
            id,
            customerId: customerKey,
            customerName: form.customerName.trim(),
            title: form.title.trim(),
            salesType: form.salesType,
            salesStage: form.salesStage,
            detailStage: form.detailStage,
            industry: form.industry.trim(),
            expectedRevenue: Number(form.expectedRevenue || 0),
            owner: form.owner.trim(),
            source: form.source.trim() || "직접 등록",
            firstContactDate: form.firstContactDate,
            lastContactDate: form.lastContactDate,
            lastUpdatedAt: formatDate(today),
            nextAction: form.nextAction.trim(),
            nextActionDueDate: form.nextActionDueDate,
            status: "정상",
            statusReason: "신규 등록 후 다음 액션 기한이 남아 있고 최근 컨택 이력이 있는 상태입니다.",
            competitorInvolved: form.competitorInvolved === "yes",
            requestedDiscountRate: form.requestedDiscountRate ? Number(form.requestedDiscountRate) : undefined,
            productModules: form.proposedModules.split(",").map((item) => item.trim()).filter(Boolean),
            expectedUserCount: form.estimatedUserCount ? Number(form.estimatedUserCount) : 0,
            customerContactName: form.contactName.trim() || undefined,
            customerContactPhone: form.contactPhone.trim() || undefined,
            customerContactEmail: form.contactEmail.trim() || undefined,
            primaryContactId: contactId,
            memo: [form.memo, form.attachmentName && `첨부자료: ${form.attachmentName}`, form.internalNote && `내부 참고: ${form.internalNote}`]
                .filter(Boolean)
                .join(" / "),
        };
        const activityType = form.salesType;
        const activity = {
            id: `act-${id}`,
            dealId: id,
            customerId: customerKey,
            customerName: newDeal.customerName,
            activityDate: form.firstContactDate,
            activityType,
            title: `${form.salesType} 등록`,
            description: form.memo || `${form.source || "유입 경로 미입력"}에서 시작된 영업 건입니다.`,
            owner: newDeal.owner,
            nextAction: newDeal.nextAction,
            nextActionDueDate: newDeal.nextActionDueDate,
            relatedDocumentName: form.attachmentName || undefined,
            memo: form.internalNote || undefined,
            createdAt: formatDate(today),
        };
        setSalesDeals((current) => [newDeal, ...current]);
        if (contactId) {
            setCustomerContacts((current) => [
                {
                    id: contactId,
                    customerId: customerKey,
                    name: form.contactName.trim(),
                    department: form.contactDepartment.trim() || undefined,
                    position: form.contactPosition.trim() || undefined,
                    role: form.contactRole,
                    phone: form.contactPhone.trim() || undefined,
                    email: form.contactEmail.trim() || undefined,
                    preferredContactMethod: "미확인",
                    influenceLevel: "보통",
                    isPrimary: true,
                    note: form.relationshipNote.trim() || undefined,
                },
                ...current.map((contact) => contact.customerId === customerKey ? { ...contact, isPrimary: false } : contact),
            ]);
        }
        if (form.customerNote || form.salesNote || form.technicalNote || form.contractNote || form.relationshipNote || form.internalNote) {
            saveCustomerNotes(customerKey, {
                customerId: customerKey,
                customerNote: form.customerNote.trim() || undefined,
                salesNote: form.salesNote.trim() || undefined,
                technicalNote: form.technicalNote.trim() || undefined,
                contractNote: form.contractNote.trim() || undefined,
                relationshipNote: form.relationshipNote.trim() || undefined,
                internalNote: form.internalNote.trim() || undefined,
            });
        }
        setSalesActivities((current) => [activity, ...current]);
        setSalesTasks((current) => addTaskFromDeal(current, newDeal));
    }
    function addActivity(deal, form) {
        const activity = {
            id: `act-${Date.now()}`,
            dealId: deal.id,
            customerId: deal.customerId,
            customerName: deal.customerName,
            activityDate: form.activityDate,
            activityType: form.activityType,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            owner: form.owner.trim(),
            nextAction: form.nextAction.trim() || undefined,
            nextActionDueDate: form.nextActionDueDate || undefined,
            relatedDocumentName: form.relatedDocumentName.trim() || undefined,
            customerContactId: form.customerContactId || undefined,
            memo: form.memo.trim() || undefined,
            createdAt: formatDate(today),
        };
        setSalesActivities((current) => [activity, ...current]);
        setSalesDeals((current) => current.map((item) => (item.id === deal.id ? deriveDealFromActivity(item, activity) : item)));
        if (["수주", "계약 완료", "발주 완료"].includes(activity.activityType)) {
            setExistingCustomers((current) => {
                if (current.some((item) => item.customerId === deal.customerId && item.customerName === deal.customerName))
                    return current;
                return [createExistingCustomerFromWonDeal(deal, activity), ...current];
            });
        }
        if (activity.nextAction && activity.nextActionDueDate) {
            setSalesTasks((current) => [
                {
                    id: `task-${activity.id}`,
                    dealId: deal.id,
                    customerName: deal.customerName,
                    title: activity.nextAction ?? "후속 액션",
                    dueDate: activity.nextActionDueDate ?? formatDate(today),
                    priority: "medium",
                    owner: activity.owner,
                    status: "todo",
                },
                ...current,
            ]);
        }
    }
    function updateActivity(deal, form) {
        if (!form.id)
            return;
        const updatedActivity = {
            id: form.id,
            dealId: deal.id,
            customerId: deal.customerId,
            customerName: deal.customerName,
            activityDate: form.activityDate,
            activityType: form.activityType,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            owner: form.owner.trim(),
            nextAction: form.nextAction.trim() || undefined,
            nextActionDueDate: form.nextActionDueDate || undefined,
            relatedDocumentName: form.relatedDocumentName.trim() || undefined,
            customerContactId: form.customerContactId || undefined,
            memo: form.memo.trim() || undefined,
            createdAt: salesActivities.find((activity) => activity.id === form.id)?.createdAt ?? formatDate(today),
            updatedAt: formatDate(today),
        };
        setSalesActivities((current) => current.map((activity) => (activity.id === form.id ? updatedActivity : activity)));
        setSalesDeals((current) => current.map((item) => (item.id === deal.id ? deriveDealFromActivity(item, updatedActivity) : item)));
    }
    function deleteActivity(deal, activityId) {
        setSalesActivities((current) => current.map((activity) => (activity.id === activityId ? { ...activity, deletedAt: formatDate(today), updatedAt: formatDate(today) } : activity)));
        setSalesDeals((current) => current.map((item) => (item.id === deal.id ? { ...item, lastUpdatedAt: formatDate(today) } : item)));
    }
    function updateDealNextAction(deal, nextAction, nextActionDueDate) {
        setSalesDeals((current) => current.map((item) => item.id === deal.id
            ? {
                ...item,
                nextAction,
                nextActionDueDate,
                lastUpdatedAt: formatDate(today),
            }
            : item));
        setSalesTasks((current) => [
            {
                id: `task-next-${deal.id}-${Date.now()}`,
                dealId: deal.id,
                customerName: deal.customerName,
                title: nextAction,
                dueDate: nextActionDueDate,
                priority: "medium",
                owner: deal.owner,
                status: "todo",
            },
            ...current,
        ]);
    }
    function saveCustomerContact(customerId, form) {
        const id = form.id ?? `contact-${customerId}-${Date.now()}`;
        const nextContact = {
            id,
            customerId,
            name: form.name.trim(),
            department: form.department.trim() || undefined,
            position: form.position.trim() || undefined,
            role: form.role,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            preferredContactMethod: form.preferredContactMethod,
            influenceLevel: form.influenceLevel,
            isPrimary: form.isPrimary,
            note: form.note.trim() || undefined,
        };
        setCustomerContacts((current) => {
            const withoutCurrent = current.filter((contact) => contact.id !== id);
            const normalized = nextContact.isPrimary
                ? withoutCurrent.map((contact) => contact.customerId === customerId ? { ...contact, isPrimary: false } : contact)
                : withoutCurrent;
            return [nextContact, ...normalized];
        });
        if (nextContact.isPrimary) {
            setSalesDeals((current) => current.map((deal) => deal.customerId === customerId ? {
                ...deal,
                primaryContactId: id,
                customerContactName: nextContact.name,
                customerContactPhone: nextContact.phone,
                customerContactEmail: nextContact.email,
            } : deal));
            setExistingCustomers((current) => current.map((customer) => customer.customerId === customerId ? { ...customer, primaryContactId: id } : customer));
        }
    }
    function deleteCustomerContact(contactId, customerId) {
        setCustomerContacts((current) => {
            const target = current.find((contact) => contact.id === contactId);
            const remaining = current.filter((contact) => contact.id !== contactId);
            if (!target?.isPrimary)
                return remaining;
            const replacement = remaining.find((contact) => contact.customerId === customerId);
            return replacement
                ? remaining.map((contact) => contact.id === replacement.id ? { ...contact, isPrimary: true } : contact)
                : remaining;
        });
    }
    function setPrimaryCustomerContact(contactId, customerId) {
        const target = customerContacts.find((contact) => contact.id === contactId);
        setCustomerContacts((current) => current.map((contact) => contact.customerId === customerId ? { ...contact, isPrimary: contact.id === contactId } : contact));
        if (target) {
            setSalesDeals((current) => current.map((deal) => deal.customerId === customerId ? {
                ...deal,
                primaryContactId: contactId,
                customerContactName: target.name,
                customerContactPhone: target.phone,
                customerContactEmail: target.email,
            } : deal));
            setExistingCustomers((current) => current.map((customer) => customer.customerId === customerId ? { ...customer, primaryContactId: contactId } : customer));
        }
    }
    function saveCustomerNotes(customerId, note) {
        setCustomerNotes((current) => [note, ...current.filter((item) => item.customerId !== customerId)]);
    }
    function addCustomerOpportunity(existingCustomer, form) {
        const opportunity = {
            id: `opp-new-${Date.now()}`,
            existingCustomerId: existingCustomer.id,
            customerId: existingCustomer.customerId,
            customerName: existingCustomer.customerName,
            opportunityType: form.opportunityType,
            title: form.title.trim(),
            expectedRevenue: Number(form.expectedRevenue),
            expectedDate: form.expectedDate,
            status: "진행 중",
            owner: form.owner.trim(),
            nextAction: form.nextAction.trim(),
            nextActionDueDate: form.nextActionDueDate,
            activeInSalesPipeline: form.activeInSalesPipeline,
            productModules: form.productModules.split(",").map((item) => item.trim()).filter(Boolean),
            expectedUserCount: form.expectedUserCount ? Number(form.expectedUserCount) : existingCustomer.licenseCount,
            memo: form.memo,
        };
        setCustomerOpportunities((current) => [opportunity, ...current]);
        setSalesTasks((current) => [
            {
                id: `task-${opportunity.id}`,
                dealId: `opp-${opportunity.id}`,
                customerName: opportunity.customerName,
                title: opportunity.nextAction,
                dueDate: opportunity.nextActionDueDate,
                priority: "medium",
                owner: opportunity.owner,
                status: "todo",
            },
            ...current,
        ]);
        if (form.activeInSalesPipeline)
            setActiveView("salesStatus");
    }
    const evidenceCases = industryCases.slice(0, 3);
    return (<div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">KICA</div>
          <div>
            <strong>Sales CRM</strong>
            <span>B2B 영업 업무 공간</span>
          </div>
        </div>

        <nav className="navList" aria-label="주요 메뉴">
          <NavButton icon={<LayoutDashboard size={18}/>} label="영업 현황" view="salesStatus" activeView={activeView} onClick={setActiveView}/>
          <NavButton icon={<BriefcaseBusiness size={18}/>} label="기존 고객 관리" view="existingCustomers" activeView={activeView} onClick={setActiveView}/>
          <NavButton icon={<ClipboardList size={18}/>} label="유지보수 계약관리" view="maintenanceContracts" activeView={activeView} onClick={setActiveView}/>
          <NavButton icon={<FileText size={18}/>} label="문서 생성" view="documents" activeView={activeView} onClick={setActiveView}/>
          <NavButton icon={<BadgePercent size={18}/>} label="가격 가이드" view="pricing" activeView={activeView} onClick={setActiveView}/>
        </nav>

        <div className="sideSummary">
          <span>전체 영업 상태</span>
          <strong>{salesOverview.activeDealCount}건</strong>
          <p>위험/지연 {salesOverview.riskDealCount}건 · 이번 주 액션 {salesOverview.weeklyTaskCount}건</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{currentHeader.title}</h1>
            <p className="topbarDescription">{currentHeader.description}</p>
          </div>
          <div className="userMenu">
            <div>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
            <button className="secondaryButton compactButton" onClick={onLogout}>로그아웃</button>
          </div>
        </header>

        <div className="workGrid">
          <section className="mainPanel">
            {activeView === "documents" && (<DocumentsView customer={documentCustomer} deal={documentDeal} salesDeals={salesOverview.dealsWithStatus} selectedDealId={documentSalesDeal?.id ?? ""} documentType={documentType} tone={tone} inquiry={inquiry} activities={documentActivities} contacts={customerContacts.filter((contact) => contact.customerId === documentCustomer.id)} pricingGuide={documentPricingGuide} evidenceCases={documentIndustryCases.slice(0, 3)} draft={draft} onDocumentDealChange={(dealId) => {
                setDocumentDealId(dealId);
                setDraft(null);
            }} onAddDocumentDeal={addDocumentDeal} onDocumentTypeChange={setDocumentType} onToneChange={setTone} onInquiryChange={setInquiry} onGenerate={createDraft} onSaveDocument={saveDocument} onDownloadDocument={updateDocumentDownload} onSaveAsActivity={(activity) => setSalesActivities((current) => [activity, ...current])}/>)}
            {activeView === "salesStatus" && (<SalesOverviewView overview={salesOverview} activities={salesActivities} contacts={customerContacts} notes={customerNotes} salesTarget={crmData.salesTarget} settings={statusSettings} onSettingsChange={setStatusSettings} onAddDeal={addSalesDeal} onAddActivity={addActivity} onNavigate={setActiveView} onOpenDeal={(dealId) => setDrawerDealId(dealId)}/>)}
            {activeView === "existingCustomers" && (<ExistingCustomersView customers={existingCustomers} opportunities={customerOpportunities} activities={salesActivities} documents={savedDocuments} contacts={customerContacts} notes={customerNotes} onSaveContact={saveCustomerContact} onDeleteContact={deleteCustomerContact} onSetPrimaryContact={setPrimaryCustomerContact} onSaveNotes={saveCustomerNotes} onCreateOpportunity={addCustomerOpportunity} onNavigate={setActiveView}/>)}
            {activeView === "maintenanceContracts" && (<MaintenanceContractsView />)}
            {activeView === "recommendedActions" && (<RecommendedActionsView tasks={salesOverview.upcomingTasks} riskDeals={salesOverview.riskDeals} deals={salesOverview.dealsWithStatus} selectedCustomerName={customerDisplayName(customer)} selectedCustomerDealCount={salesOverview.dealsWithStatus.filter((item) => item.customerId === customer.id).length} selectedCustomerTaskCount={salesTasks.filter((task) => salesOverview.dealsWithStatus.some((selectedDeal) => selectedDeal.customerId === customer.id && selectedDeal.id === task.dealId)).length} onNavigate={setActiveView} onOpenDeal={(dealId) => setDrawerDealId(dealId)}/>)}
            {activeView === "pricing" && (<PricingView customer={customer} deal={deal} customers={crmData.customers} input={pricingInput} guide={pricingGuide} settings={pricingSettings} onCustomerChange={handleCustomerChange} onChange={(nextInput) => setPricingInput((current) => ({ ...current, ...nextInput }))} onSettingsChange={savePricingSettings} onSaveGuide={savePricingGuideResult}/>)}
          </section>
        </div>
        {drawerDeal && (<DetailDrawerShell label={`${drawerDeal.customerName} 영업 상세`} onClose={() => setDrawerDealId(null)}>
            <DealDetailPanel deal={drawerDeal} activities={salesActivities.filter((activity) => activity.dealId === drawerDeal.id)} documents={savedDocuments.filter((document) => document.dealId === drawerDeal.id || document.customerId === drawerDeal.customerId)} pricingGuides={savedPricingGuides.filter((item) => item.dealId === drawerDeal.id || item.customerId === drawerDeal.customerId)} contacts={customerContacts.filter((contact) => contact.customerId === drawerDeal.customerId)} customerNote={getCustomerNote(customerNotes, drawerDeal.customerId)} onClose={() => setDrawerDealId(null)} onAddActivity={addActivity} onUpdateActivity={updateActivity} onDeleteActivity={deleteActivity} onSaveContact={(form) => saveCustomerContact(drawerDeal.customerId, form)} onDeleteContact={(contactId) => deleteCustomerContact(contactId, drawerDeal.customerId)} onSetPrimaryContact={(contactId) => setPrimaryCustomerContact(contactId, drawerDeal.customerId)} onSaveNotes={(note) => saveCustomerNotes(drawerDeal.customerId, note)} onUpdateNextAction={updateDealNextAction} onNavigate={setActiveView}/>
          </DetailDrawerShell>)}
      </main>
    </div>);
}

function MaintenanceContractsView() {
    const referenceDate = "2026-06-07";
    const currentMonth = referenceDate.slice(0, 7);
    const currentBillingMonthIndex = Number(currentMonth.slice(5, 7)) - 1;
    const nextMonthDate = new Date(`${currentMonth}-01T00:00:00`);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const [activeFilter, setActiveFilter] = useState("all");
    const [selectedId, setSelectedId] = useState(maintenanceContracts[0]?.id ?? "");
    const [detailTab, setDetailTab] = useState("basic");
    const getMonth = (value) => value?.slice(0, 7);
    const monthLabel = (value) => value ? `${Number(value.slice(5, 7))}월` : "미확인";
    const isCurrentBillingTarget = (contract) => Number(contract.monthlyRevenue?.[currentBillingMonthIndex] || 0) > 0 || getMonth(contract.endDate) === currentMonth;
    const partnerDefinitions = [
        { key: "partnerEmro", label: "엠로", match: (contract) => contract.contractCompany === "엠로" || contract.contractCompanyRaw === "엠로" },
        { key: "partnerLg", label: "LG CNS", match: (contract) => contract.contractCompany === "LG CNS" || contract.contractCompanyRaw === "LG CNS" },
        { key: "partnerHyundai", label: "현대오토에버", match: (contract) => [contract.contractCompany, contract.contractCompanyRaw, contract.endUser, contract.contractName].join(" ").includes("현대오토에버") },
        { key: "partnerDaou", label: "다우기술", match: (contract) => [contract.contractCompany, contract.contractCompanyRaw, contract.endUser, contract.contractName].join(" ").includes("다우기술") },
        { key: "partnerForcs", label: "포시에스", match: (contract) => [contract.contractCompany, contract.contractCompanyRaw, contract.endUser, contract.contractName].join(" ").includes("포시에스") },
        { key: "partnerSk", label: "SK그룹사", match: (contract) => [contract.contractCompany, contract.contractCompanyRaw, contract.endUser, contract.contractName].join(" ").toUpperCase().includes("SK") },
    ];
    const partnerSummaries = useMemo(() => partnerDefinitions.map((definition) => {
        const contracts = maintenanceContracts.filter(definition.match);
        const endUsers = new Set(contracts.map((contract) => contract.endUser));
        const products = new Set();
        contracts.forEach((contract) => contract.products.forEach((product) => products.add(product.productName)));
        return {
            ...definition,
            count: contracts.length,
            amount: contracts.reduce((sum, contract) => sum + (contract.totalAmount || 0), 0),
            endUserCount: endUsers.size,
            productNames: Array.from(products).slice(0, 3).join(", ") || "미확인",
        };
    }).filter((partner) => partner.count > 0), []);
    const currentMonthContracts = useMemo(() => maintenanceContracts.filter((contract) => getMonth(contract.endDate) === currentMonth), [currentMonth]);
    const nextMonthContracts = useMemo(() => maintenanceContracts.filter((contract) => getMonth(contract.endDate) === nextMonth), [nextMonth]);
    const billingContracts = useMemo(() => maintenanceContracts.filter(isCurrentBillingTarget), [currentMonth]);
    const xmlContracts = useMemo(() => billingContracts.filter((contract) => contract.xmlUploadRequired), [billingContracts]);
    const reverseContracts = useMemo(() => billingContracts.filter((contract) => contract.billingMethod === "역발행"), [billingContracts]);
    const documentContracts = useMemo(() => billingContracts.filter((contract) => contract.requiredDocuments.length > 0), [billingContracts]);
    const inspectionContracts = useMemo(() => maintenanceContracts.filter((contract) => contract.inspectionIncluded), []);
    const filterMeta = {
        all: { title: "전체 유지보수 계약", description: "등록된 2026년 이후 유효 계약 전체" },
        current: { title: `${monthLabel(currentMonth)} 만료 예정`, description: "이번 달 재계약·갱신 확인이 필요한 계약" },
        next: { title: `${monthLabel(nextMonth)} 만료 예정`, description: "다음 달 만료 전 견적 준비가 필요한 계약" },
        billing: { title: "6월 청구 처리", description: "1~5월 처리 완료 기준, 6월 청구 확인 대상" },
        xml: { title: "XML 업로드 필요", description: "정발행 후 고객사 시스템 업로드가 필요한 6월 청구 대상" },
        reverse: { title: "역발행 대상", description: "고객사 역발행 또는 포털 확인이 필요한 6월 청구 대상" },
        documents: { title: "서류 제출 필요", description: "검수확인서, 거래명세서, 포털 확인 등 선행 작업이 필요한 6월 청구 대상" },
        inspection: { title: "정기점검 포함", description: "정기점검이 계약 조건에 포함된 계약" },
        ...Object.fromEntries(partnerDefinitions.map((partner) => [partner.key, { title: `파트너사: ${partner.label}`, description: `${partner.label} 기준으로 묶은 유지보수 계약` }]))
    };
    function getFilteredContracts(filter) {
        if (filter === "current") return currentMonthContracts;
        if (filter === "next") return nextMonthContracts;
        if (filter === "billing") return billingContracts;
        if (filter === "xml") return xmlContracts;
        if (filter === "reverse") return reverseContracts;
        if (filter === "documents") return documentContracts;
        if (filter === "inspection") return inspectionContracts;
        const partner = partnerDefinitions.find((item) => item.key === filter);
        if (partner) return maintenanceContracts.filter(partner.match);
        return maintenanceContracts;
    }
    const filteredContracts = useMemo(() => getFilteredContracts(activeFilter).slice().sort((a, b) => (a.endDate || "").localeCompare(b.endDate || "") || b.totalAmount - a.totalAmount), [activeFilter, currentMonth, nextMonth]);
    const selectedContract = useMemo(() => maintenanceContracts.find((contract) => contract.id === selectedId) ?? filteredContracts[0] ?? maintenanceContracts[0], [selectedId, filteredContracts]);
    useEffect(() => {
        if (filteredContracts.length && !filteredContracts.some((contract) => contract.id === selectedId)) {
            setSelectedId(filteredContracts[0].id);
        }
    }, [activeFilter, filteredContracts, selectedId]);
    function activateFilter(filter) {
        setActiveFilter(filter);
        const first = getFilteredContracts(filter).slice().sort((a, b) => (a.endDate || "").localeCompare(b.endDate || ""))[0];
        if (first) setSelectedId(first.id);
    }
    const kpiCards = [
        { key: "all", label: "전체 계약", value: `${maintenanceContracts.length}건`, names: partnerSummaries.slice(0, 3).map((item) => `${item.label} ${item.count}건`) },
        { key: "current", label: "당월 만료 예정", value: `${currentMonthContracts.length}건`, names: currentMonthContracts.slice(0, 4).map((item) => item.endUser) },
        { key: "next", label: "익월 만료 예정", value: `${nextMonthContracts.length}건`, names: nextMonthContracts.slice(0, 4).map((item) => item.endUser) },
        { key: "billing", label: "6월 청구 처리", value: `${billingContracts.length}건`, names: [`5월까지 완료`, `정발행 ${billingContracts.filter((item) => item.billingMethod.includes("정발행")).length}건`, `역발행 ${reverseContracts.length}건`] },
    ];
    const productSummary = useMemo(() => {
        const map = new Map();
        maintenanceContracts.forEach((contract) => contract.products.forEach((product) => {
            const current = map.get(product.productName) ?? { productName: product.productName, count: 0, quantity: 0, customers: new Set() };
            current.count += 1;
            current.quantity += Number(product.quantity || 0);
            current.customers.add(contract.endUser);
            map.set(product.productName, current);
        }));
        return Array.from(map.values()).map((item) => ({ ...item, customerCount: item.customers.size })).sort((a, b) => b.count - a.count);
    }, []);
    const activeInfo = filterMeta[activeFilter] ?? filterMeta.all;
    return (<div className="maintenancePage">
      <section className="maintenanceHero">
        <div>
          <p className="eyebrow">유지보수 계약 데이터 · 기준일 {maintenanceGeneratedAt}</p>
          <h2>유지보수 계약관리</h2>
          <p>계약 만료, 6월 청구 처리, 제품/수량, 주요 파트너사 현황을 한 화면에서 확인합니다.</p>
        </div>
        <div className="maintenanceHeroBadge">
          <strong>{formatCurrency(maintenanceContracts.reduce((sum, item) => sum + item.totalAmount, 0))}</strong>
          <span>총 유지보수 매출</span>
        </div>
      </section>

      <section className="maintenanceKpiGrid">
        {kpiCards.map((card) => (<button key={card.key} className={`maintenanceKpiCard ${activeFilter === card.key ? "active" : ""}`} onClick={() => activateFilter(card.key)}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <ul>{card.names.length ? card.names.map((name) => <li key={name}>{name}</li>) : <li>대상 없음</li>}</ul>
        </button>))}
      </section>

      <section className="maintenanceQuickFilters">
        <button className={activeFilter === "xml" ? "active" : ""} onClick={() => activateFilter("xml")}>XML 업로드 필요 {xmlContracts.length}건</button>
        <button className={activeFilter === "reverse" ? "active" : ""} onClick={() => activateFilter("reverse")}>역발행 {reverseContracts.length}건</button>
        <button className={activeFilter === "documents" ? "active" : ""} onClick={() => activateFilter("documents")}>서류 제출 {documentContracts.length}건</button>
        <button className={activeFilter === "inspection" ? "active" : ""} onClick={() => activateFilter("inspection")}>정기점검 {inspectionContracts.length}건</button>
        {partnerSummaries.map((partner) => <button key={partner.key} className={activeFilter === partner.key ? "active" : ""} onClick={() => activateFilter(partner.key)}>{partner.label} {partner.count}건</button>)}
      </section>

      <div className="maintenanceLayout">
        <section className="maintenancePanel maintenanceListPanel">
          <div className="maintenancePanelHeader">
            <div>
              <h3>{activeInfo.title}</h3>
              <p>{activeInfo.description}</p>
            </div>
            <span>{filteredContracts.length}건</span>
          </div>
          <div className="maintenanceTableWrap">
            <table className="maintenanceTable">
              <thead><tr><th>계약명</th><th>End-User</th><th>계약사</th><th>만료일</th><th>계약금액</th><th>청구방식</th><th>상태</th></tr></thead>
              <tbody>{filteredContracts.map((contract) => (<tr key={contract.id} className={selectedContract?.id === contract.id ? "selected" : ""} onClick={() => setSelectedId(contract.id)}>
                <td><strong>{contract.contractName}</strong><small>{contract.contractPeriodText}</small></td>
                <td>{contract.endUser}</td><td>{contract.contractCompany}</td><td>{contract.endDate}</td><td>{formatCurrency(contract.totalAmount)}</td><td>{contract.billingMethod}</td><td><span className={`maintenanceStatus ${contract.renewalStatus.includes("경과") ? "danger" : contract.renewalStatus.includes("준비") || contract.renewalStatus.includes("필요") ? "warn" : "ok"}`}>{contract.renewalStatus}</span></td>
              </tr>))}</tbody>
            </table>
          </div>
        </section>

        <aside className="maintenancePanel maintenanceSidePanel">
          <h3>주요 파트너사</h3>
          <div className="partnerList">
            {partnerSummaries.map((partner) => (<button key={partner.key} onClick={() => activateFilter(partner.key)} className={activeFilter === partner.key ? "active" : ""}>
              <span>{partner.label}</span><strong>{partner.count}건</strong><small>{formatCurrency(partner.amount)} · End-User {partner.endUserCount}곳</small>
            </button>))}
          </div>
          <h3>제품별 고객관리</h3>
          <div className="productSummaryList">
            {productSummary.slice(0, 5).map((product) => (<div key={product.productName}><span>{product.productName}</span><strong>{product.count}건</strong><small>고객 {product.customerCount}곳 · 수량 {formatNumber(product.quantity)}</small></div>))}
          </div>
        </aside>
      </div>

      {selectedContract && (<section className="maintenancePanel maintenanceDetailPanel">
        <div className="maintenancePanelHeader">
          <div><h3>계약 상세</h3><p>{selectedContract.contractName}</p></div>
          <span>{selectedContract.endUser}</span>
        </div>
        <div className="maintenanceTabs">
          {[["basic","기본정보"], ["billing","청구정보"], ["contacts","담당자"], ["memo","메모"]].map(([key, label]) => <button key={key} className={detailTab === key ? "active" : ""} onClick={() => setDetailTab(key)}>{label}</button>)}
        </div>
        {detailTab === "basic" && (<div className="maintenanceDetailGrid">
          <div className="detailBlock wide"><h4>계약 기본정보</h4><dl><DetailTerm label="계약명" value={selectedContract.contractName}/><DetailTerm label="End-User" value={selectedContract.endUser}/><DetailTerm label="계약사" value={selectedContract.contractCompany}/><DetailTerm label="사업자번호" value={selectedContract.businessNumber}/><DetailTerm label="계약기간" value={`${selectedContract.startDate} ~ ${selectedContract.endDate}`}/><DetailTerm label="계약예정월" value={selectedContract.expectedMonth}/><DetailTerm label="정기점검" value={`${selectedContract.inspectionIncluded ? "포함" : "미포함"} / ${selectedContract.inspectionCount}`}/></dl></div>
          <div className="detailBlock wide"><h4>계약 제품 및 수량</h4><table className="miniTable"><thead><tr><th>제품명</th><th>제품구분</th><th>수량</th><th>라이선스 기준</th><th>정기점검</th><th>유지보수 범위</th></tr></thead><tbody>{selectedContract.products.map((product) => <tr key={product.productName}><td>{product.productName}</td><td>{product.productCategory}</td><td>{product.quantity}</td><td>{product.licenseType}</td><td>{product.inspection}</td><td>{product.maintenanceScope}</td></tr>)}</tbody></table></div>
          <div className="detailBlock wide"><h4>계약 금액</h4><div className="amountCards"><div><span>연간 계약금액</span><strong>{formatCurrency(selectedContract.totalAmount)}</strong></div><div><span>월 평균 매출</span><strong>{formatCurrency(Math.round(selectedContract.totalAmount / 12))}</strong></div><div><span>청구 주기</span><strong>{selectedContract.billingCycle}</strong></div><div><span>청구 방식</span><strong>{selectedContract.billingMethod}</strong></div></div><div className="monthRevenueStrip">{selectedContract.monthlyRevenue.map((amount, index) => <span key={index} className={index < currentBillingMonthIndex ? "completed" : index === currentBillingMonthIndex ? "current" : ""}><b>{index + 1}월</b>{amount ? formatCurrency(amount) : '-'}</span>)}</div></div>
        </div>)}
        {detailTab === "billing" && (<div className="maintenanceDetailGrid"><div className="detailBlock"><h4>청구 방식</h4><dl><DetailTerm label="발행 방식" value={selectedContract.billingMethod}/><DetailTerm label="발행 주기" value={selectedContract.billingCycle}/><DetailTerm label="발행일" value={selectedContract.billingDueRule}/><DetailTerm label="처리 상태" value={selectedContract.billingStatus}/><DetailTerm label="처리 기준" value={selectedContract.billingProgress}/><DetailTerm label="XML 업로드" value={selectedContract.xmlUploadRequired ? "필요" : "불필요"}/><DetailTerm label="필요 서류" value={selectedContract.requiredDocuments.join(', ') || '없음'}/></dl></div><div className="detailBlock"><h4>처리 주의사항</h4><p>{selectedContract.billingMethod === "정발행 후 XML 업로드" ? "5월까지 청구 처리는 완료된 것으로 보고, 6월 정발행 완료 후 XML 파일을 고객사 시스템에 업로드해야 합니다." : selectedContract.billingMethod === "역발행" ? "5월까지 청구 처리는 완료된 것으로 보고, 6월 고객사 포털의 역발행 요청 여부를 먼저 확인해야 합니다." : "5월까지 청구 처리는 완료된 것으로 보고, 6월분 일반 정발행 기준으로 처리합니다."}</p></div></div>)}
        {detailTab === "contacts" && (<div className="contactCards">{selectedContract.contacts.map((contact) => <article key={`${contact.email}-${contact.contactType}`}><strong>{contact.contactName}</strong><span>{contact.companyName} · {contact.contactType}</span><p>{contact.department} / {contact.position}</p><p>{contact.email} · {contact.phone}</p></article>)}</div>)}
        {detailTab === "memo" && (<div className="detailBlock wide"><h4>메모</h4><p>{selectedContract.memo}</p></div>)}
      </section>)}
    </div>);
}
function DetailTerm({ label, value }) {
    return <><dt>{label}</dt><dd>{value || "미등록"}</dd></>;
}

function LoginView({ onLogin }) {
    const [email, setEmail] = useState("demo@salesops.ai");
    const [password, setPassword] = useState("demo1234");
    const [error, setError] = useState("");
    function submit(event) {
        event.preventDefault();
        const ok = onLogin(email.trim(), password);
        if (!ok)
            setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    return (<main className="loginPage">
      <section className="loginPanel" aria-label="Sales CRM 로그인">
        <div className="loginIntro">
          <div className="brand loginBrand">
            <div className="brandMark">KICA</div>
            <div>
              <strong>Sales CRM</strong>
              <span>B2B 영업 실무를 위한 CRM 업무 공간</span>
            </div>
          </div>
          <div className="loginIntroCopy">
            <h1>영업 현황부터 고객 이력까지 한곳에서 관리하세요.</h1>
            <p>B2B 영업 담당자를 위한 CRM 업무 공간입니다. 고객 대응, 문서 생성, 가격 가이드, 다음 액션을 로그인 후 안전하게 확인할 수 있습니다.</p>
          </div>
          <div className="loginFeatureGrid" aria-label="핵심 기능">
            <div className="loginFeatureItem">
              <span>01</span>
              <strong>영업 현황판</strong>
              <p>진행 중인 딜, 위험 고객, 다음 액션을 한눈에 확인</p>
            </div>
            <div className="loginFeatureItem">
              <span>02</span>
              <strong>고객 이력 관리</strong>
              <p>미팅, 견적, 자료 송부, 계약 협의 이력을 고객사별로 누적</p>
            </div>
            <div className="loginFeatureItem">
              <span>03</span>
              <strong>AI 문서/가격 지원</strong>
              <p>제안서 초안과 할인율 판단 기준을 CRM 데이터 기반으로 지원</p>
            </div>
          </div>
          <div className="loginPreviewPanel" aria-label="CRM 업무 예시">
            <div className="panelTitle">
              <ClipboardList size={17}/>
              <h2>오늘의 업무 예시</h2>
            </div>
            <div className="previewTaskGrid">
              <span>후속 연락 필요</span>
              <span>견적 검토 대기</span>
              <span>기술 답변서 작성</span>
              <span>계약 조건 확인</span>
            </div>
          </div>
          <p className="loginSecurityNote">로그인 전에는 고객사명, 매출, 영업 이력 데이터가 표시되지 않습니다.</p>
        </div>
        <div className="loginCard">
          <div>
            <h2>로그인</h2>
            <p>계정으로 접속해 CRM 업무 화면을 확인하세요.</p>
          </div>
          <form className="loginForm" onSubmit={submit}>
            <label>
              이메일
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email"/>
            </label>
            <label>
              비밀번호
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password"/>
            </label>
            {error && <div className="formError">{error}</div>}
            <button className="primaryButton fullButton" type="submit">로그인</button>
          </form>
          <div className="demoAccountBox">
            <strong>데모 계정</strong>
            <span>demo@salesops.ai / demo1234</span>
          </div>
          <p className="securityNotice">로그인 전에는 CRM 데이터가 표시되지 않습니다.</p>
        </div>
      </section>
    </main>);
}
function RecommendedActionsView({ tasks, riskDeals, deals, selectedCustomerName, selectedCustomerDealCount, selectedCustomerTaskCount, onNavigate, onOpenDeal, }) {
    const todayText = formatDate(today);
    const overdueTasks = tasks.filter((task) => task.status === "overdue" || task.dueDate < todayText);
    const todayTasks = tasks.filter((task) => task.dueDate === todayText);
    const weekTasks = tasks.filter((task) => task.dueDate >= todayText).slice(0, 5);
    const priorityItems = [
        ...overdueTasks.map((task) => ({
            id: `task-${task.id}`,
            customerName: task.customerName,
            dealTitle: "등록된 후속 업무",
            action: task.title,
            due: task.dueDate < todayText ? "기한 초과" : "오늘",
            priority: task.priority === "high" ? "높음" : task.priority === "medium" ? "중간" : "낮음",
            reason: task.dueDate < todayText ? "다음 액션 기한이 지났습니다." : "오늘 처리해야 하는 업무입니다.",
            cta: "상세 보기",
            target: "salesStatus",
            dealId: task.dealId,
        })),
        ...riskDeals.slice(0, 3).map((deal) => ({
            id: `risk-${deal.id}`,
            customerName: deal.customerName,
            dealTitle: deal.title,
            action: deal.nextAction || "고객 재접촉 필요",
            due: deal.nextActionDueDate || "기한 미등록",
            priority: deal.computedStatus === "위험" ? "높음" : "중간",
            reason: deal.computedStatusReason,
            cta: deal.requestedDiscountRate && deal.requestedDiscountRate >= 15 ? "가격 가이드" : "문서 생성",
            target: deal.requestedDiscountRate && deal.requestedDiscountRate >= 15 ? "pricing" : "documents",
            dealId: deal.id,
        })),
        ...weekTasks.map((task) => ({
            id: `week-${task.id}`,
            customerName: task.customerName,
            dealTitle: "이번 주 액션",
            action: task.title,
            due: task.dueDate,
            priority: task.priority === "high" ? "높음" : task.priority === "medium" ? "중간" : "낮음",
            reason: "이번 주 처리 예정 업무입니다.",
            cta: "상세 보기",
            target: "salesStatus",
            dealId: task.dealId,
        })),
    ].slice(0, 6);
    return (<div className="featureStack">
      <SectionTitle eyebrow="Action" title="추천 액션"/>
      <section className="actionRail" aria-label="추천 액션">
        <div className="railHeader">
          <ClipboardList size={18}/>
          <strong>우선 처리 업무</strong>
        </div>
        <div className="actionSummary">
          <span>오늘 {todayTasks.length}건</span>
          <span>기한 초과 {overdueTasks.length}건</span>
          <span>{selectedCustomerName} 관련 딜 {selectedCustomerDealCount}건</span>
          <span>{selectedCustomerName} 액션 {selectedCustomerTaskCount}건</span>
        </div>
        <div className="actionCardStack">
          {priorityItems.map((item) => (<article className="actionCard clickableCard" key={item.id} onClick={() => onOpenDeal(item.dealId)}>
              <strong>{item.customerName}</strong>
              <span>{deals.find((deal) => deal.id === item.dealId)?.title ?? item.dealTitle}</span>
              <b>{item.action}</b>
              <small>기한: {item.due} · 우선순위 {item.priority}</small>
              <p>{item.reason}</p>
              <button className="secondaryButton compactButton" onClick={(event) => {
                event.stopPropagation();
                onNavigate(item.target);
            }}>
                {item.cta}
              </button>
            </article>))}
        </div>
      </section>
    </div>);
}
function NextActionPanel({ tasks, riskDeals, deals, onOpenDeal, onNavigate, }) {
    const todayText = formatDate(today);
    const overdueTasks = tasks.filter((task) => task.status === "overdue" || task.dueDate < todayText);
    const todayTasks = tasks.filter((task) => task.dueDate === todayText);
    const weekTasks = tasks.filter((task) => task.dueDate >= todayText);
    const priorityItems = [
        ...overdueTasks.map((task) => ({
            id: `overdue-${task.id}`,
            customerName: task.customerName,
            dealTitle: deals.find((deal) => deal.id === task.dealId)?.title ?? "등록된 후속 업무",
            action: task.title,
            due: task.dueDate < todayText ? "기한 초과" : "오늘",
            priority: task.priority === "high" ? "높음" : task.priority === "medium" ? "중간" : "낮음",
            reason: task.dueDate < todayText ? "다음 액션 기한이 지났습니다." : "오늘 처리해야 하는 업무입니다.",
            dealId: task.dealId,
        })),
        ...riskDeals.slice(0, 4).map((deal) => ({
            id: `risk-${deal.id}`,
            customerName: deal.customerName,
            dealTitle: deal.title,
            action: deal.nextAction || "고객 재접촉",
            due: deal.nextActionDueDate || "미등록",
            priority: deal.computedStatus === "위험" ? "높음" : "중간",
            reason: deal.computedStatusReason,
            dealId: deal.id,
        })),
        ...weekTasks.map((task) => ({
            id: `week-${task.id}`,
            customerName: task.customerName,
            dealTitle: deals.find((deal) => deal.id === task.dealId)?.title ?? "이번 주 액션",
            action: task.title,
            due: task.dueDate,
            priority: task.priority === "high" ? "높음" : task.priority === "medium" ? "중간" : "낮음",
            reason: "이번 주 처리 예정 업무입니다.",
            dealId: task.dealId,
        })),
    ].filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
    const visiblePriorityItems = priorityItems.slice(0, 5);
    return (<aside className="nextActionPanel" aria-label="다음 액션">
      <div className="railHeader">
        <ClipboardList size={18}/>
        <strong>다음 액션</strong>
      </div>
      <div className="actionSummary">
        <span>오늘 {todayTasks.length}건</span>
        <span>기한 초과 {overdueTasks.length}건</span>
        <span>이번 주 {weekTasks.length}건</span>
        <span>위험 딜 {riskDeals.length}건</span>
      </div>
      <div className="actionCardStack">
        {visiblePriorityItems.map((item) => (<article className="actionCard" key={item.id}>
            <strong>{item.customerName}</strong>
            <span className="truncateCell" title={item.dealTitle}>{item.dealTitle}</span>
            <b>{item.action}</b>
            <small>기한: {item.due} · 우선순위 {item.priority}</small>
            <p>{item.reason}</p>
            <div className="quickActionRow">
              <button className="secondaryButton compactButton" onClick={() => onOpenDeal(item.dealId)}>상세 보기</button>
              <button className="secondaryButton compactButton" onClick={() => onNavigate("documents")}>문서 생성</button>
              <button className="secondaryButton compactButton" onClick={() => onNavigate("pricing")}>가격 가이드</button>
            </div>
          </article>))}
        {priorityItems.length > visiblePriorityItems.length && (<button className="secondaryButton fullButton" type="button" onClick={() => onNavigate("recommendedActions")}>
            더보기 {priorityItems.length - visiblePriorityItems.length}건
          </button>)}
      </div>
    </aside>);
}
function NavButton({ icon, label, view, activeView, onClick, }) {
    return (<button className={`navItem ${activeView === view ? "active" : ""}`} onClick={() => onClick(view)}>
      {icon}
      {label}
    </button>);
}
function ReadonlyField({ label, value }) {
    return (<label>
      {label}
      <input value={value} readOnly/>
    </label>);
}
function ExistingCustomersView({ customers, opportunities, activities, documents, contacts, notes, onSaveContact, onDeleteContact, onSetPrimaryContact, onSaveNotes, onCreateOpportunity, onNavigate, }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const customersWithStatus = customers.map((customer) => ({
        ...customer,
        computedStatus: calculateExistingCustomerStatus(customer, activities),
        computedStatusReason: getExistingCustomerStatusReason(customer, activities),
    }));
    const summary = getExistingCustomerSummary(customers, opportunities, activities);
    const filteredCustomers = customersWithStatus
        .filter((customer) => statusFilter === "all" || customer.computedStatus === statusFilter)
        .filter((customer) => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword)
            return true;
        return [customer.customerName, customer.industry, customer.owner, customer.nextAction].some((value) => value.toLowerCase().includes(keyword));
    });
    const selectedCustomer = customersWithStatus.find((customer) => customer.id === selectedCustomerId) ?? null;
    return (<div className="featureStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Customer Success</p>
          <h2>기존 고객 관리</h2>
        </div>
        <span className="statusPill">수주 이후 매출 기회 관리</span>
      </div>
      <div className="overviewGrid summaryGrid">
        <MetricCard label="전체 기존 고객" value={`${summary.totalCustomers}곳`} description="계약/라이선스 관리 대상" icon={<BriefcaseBusiness size={20}/>}/>
        <MetricCard label="올해 갱신 예정" value={`${summary.renewalThisYearCount}곳`} description="계약 또는 유지보수 종료 기준" icon={<ClipboardList size={20}/>}/>
        <MetricCard label="90일 이내 만료" value={`${summary.expiresIn90DaysCount}곳`} description="우선 갱신 대응 필요" icon={<AlertTriangle size={20}/>}/>
        <MetricCard label="증설/고도화 기회" value={`${summary.expansionOpportunityCount}건`} description="활성 추가 영업 기회" icon={<Layers3 size={20}/>}/>
        <MetricCard label="위험 고객" value={`${summary.riskCustomerCount}곳`} description="이탈/만료 위험" icon={<ShieldCheck size={20}/>}/>
        <MetricCard label="예상 추가 매출" value={formatCurrency(summary.expectedAdditionalRevenue)} description="액티브 기회 합계" icon={<BadgePercent size={20}/>}/>
      </div>
      <section className="panel salesControlPanel">
        <div className="formGrid denseForm">
          <label>검색<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="고객사, 담당자, 다음 액션 검색"/></label>
          <label>
            고객 상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">전체</option>
              {["정상", "갱신 예정", "만료 임박", "증설 기회", "고도화 제안 필요", "이탈 위험", "보류"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle"><BriefcaseBusiness size={18}/><h2>기존 고객 리스트</h2></div>
          <span className="statusPill">{filteredCustomers.length}곳</span>
        </div>
        <div className="existingCustomerTable">
          <div className="existingCustomerHead">
            <span>고객사</span><span>산업군</span><span>도입 제품/모듈</span><span>라이선스</span><span>계약 시작</span><span>계약 종료</span><span>유지보수 종료</span><span>사용률</span><span>고객 상태</span><span>대표 담당자</span><span>연락처</span><span>다음 관리 액션</span><span>담당자</span>
          </div>
          {filteredCustomers.map((customer) => {
            const primaryContact = getPrimaryContact(contacts, customer.customerId, customer.primaryContactId);
            return (<button className={`existingCustomerRow ${selectedCustomerId === customer.id ? "selectedRow" : ""}`} key={customer.id} onClick={() => setSelectedCustomerId(customer.id)}>
                <b className="truncateCell" title={customer.customerName}>{customer.customerName}</b>
                <span>{customer.industry}</span>
                <span className="truncateCell" title={customer.installedProducts.join(", ")}>{customer.installedProducts.join(", ")}</span>
                <span>{formatNumber(customer.licenseCount)}</span>
                <span>{customer.contractStartDate}</span>
                <span>{customer.contractEndDate}</span>
                <span>{customer.maintenanceEndDate}</span>
                <span>{customer.usageRate}%</span>
                <span className={`statusTag ${existingCustomerStatusClass(customer.computedStatus)}`} title={customer.computedStatusReason}>{customer.computedStatus}</span>
                <span className="truncateCell" title={contactDetail(primaryContact)}>{contactSummary(primaryContact)}</span>
                <span>{primaryContact?.phone || "미등록"}</span>
                <span className="truncateCell" title={customer.nextAction}>{customer.nextAction}</span>
                <span>{customer.owner}</span>
              </button>);
        })}
          {filteredCustomers.length === 0 && <div className="tableEmptyState"><strong>검색 결과가 없습니다.</strong><span>조건을 변경하거나 상태 필터를 전체로 바꿔 보세요.</span></div>}
        </div>
      </section>
      {selectedCustomer && (<DetailDrawerShell label={`${selectedCustomer.customerName} 기존 고객 상세`} onClose={() => setSelectedCustomerId(null)}>
          <ExistingCustomerDetailPanel customer={selectedCustomer} opportunities={opportunities.filter((opportunity) => opportunity.existingCustomerId === selectedCustomer.id)} activities={activities.filter((activity) => activity.customerId === selectedCustomer.customerId)} documents={documents.filter((document) => document.customerId === selectedCustomer.customerId)} contacts={contacts.filter((contact) => contact.customerId === selectedCustomer.customerId)} customerNote={getCustomerNote(notes, selectedCustomer.customerId)} onSaveContact={(form) => onSaveContact(selectedCustomer.customerId, form)} onDeleteContact={(contactId) => onDeleteContact(contactId, selectedCustomer.customerId)} onSetPrimaryContact={(contactId) => onSetPrimaryContact(contactId, selectedCustomer.customerId)} onSaveNotes={(note) => onSaveNotes(selectedCustomer.customerId, note)} onCreateOpportunity={onCreateOpportunity} onNavigate={onNavigate} onClose={() => setSelectedCustomerId(null)}/>
        </DetailDrawerShell>)}
    </div>);
}
function ExistingCustomerDetailPanel({ customer, opportunities, activities, documents, contacts, customerNote, onSaveContact, onDeleteContact, onSetPrimaryContact, onSaveNotes, onCreateOpportunity, onNavigate, onClose, }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [showOpportunityForm, setShowOpportunityForm] = useState(false);
    const [feedback, setFeedback] = useState("");
    const status = customer.computedStatus ?? customer.status;
    const statusReason = customer.computedStatusReason ?? customer.statusReason;
    const recentActivities = [...activities].filter((activity) => !activity.deletedAt).sort((a, b) => b.activityDate.localeCompare(a.activityDate));
    return (<section className="detailPanel">
      <div className="drawerHeader">
        <span className={`statusTag ${existingCustomerStatusClass(status)}`}>{status}</span>
        <button className="iconTextButton" onClick={onClose} aria-label="상세 패널 닫기"><X size={16}/>닫기</button>
      </div>
      <div className="detailHero">
        <h2>{customer.customerName}</h2>
        <p>{customer.industry} · {customer.owner}</p>
        <div className="detailHeroMeta">
          <span>도입 제품: {customer.installedProducts.join(", ")}</span>
          <span>라이선스: {formatNumber(customer.licenseCount)}</span>
          <span>사용률: {customer.usageRate}%</span>
        </div>
        <div className="heroNextAction"><strong>다음 관리 액션</strong><span>{customer.nextAction} · {customer.nextActionDueDate}</span></div>
      </div>
      <div className="statusExplanationBox"><strong>상태 사유</strong><span>{statusReason}</span></div>
      <div className="drawerActionBar">
        <button className="primaryButton" onClick={() => { setActiveTab("opportunities"); setShowOpportunityForm(true); }}>새 영업 기회 생성</button>
        <button className="secondaryButton" onClick={() => { onNavigate("documents"); onClose(); }}>문서 생성</button>
        <button className="secondaryButton" onClick={() => { onNavigate("pricing"); onClose(); }}>가격 가이드</button>
      </div>
      {feedback && <div className="saveFeedback">{feedback}</div>}
      <div className="drawerTabs" role="tablist" aria-label="기존 고객 상세 탭">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>개요</button>
        <button className={activeTab === "contacts" ? "active" : ""} onClick={() => setActiveTab("contacts")}>고객 담당자</button>
        <button className={activeTab === "license" ? "active" : ""} onClick={() => setActiveTab("license")}>계약/라이선스</button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>이력</button>
        <button className={activeTab === "opportunities" ? "active" : ""} onClick={() => setActiveTab("opportunities")}>추가 영업 기회</button>
        <button className={activeTab === "documents" ? "active" : ""} onClick={() => setActiveTab("documents")}>문서</button>
        <button className={activeTab === "memo" ? "active" : ""} onClick={() => setActiveTab("memo")}>메모</button>
      </div>
      {activeTab === "overview" && <div className="drawerTabPanel"><div className="detailGrid compactDetailGrid">
        <DetailItem label="고객 상태" value={status}/><DetailItem label="대표 담당자" value={contactSummary(getPrimaryContact(contacts, customer.customerId, customer.primaryContactId))}/><DetailItem label="현재 도입 제품" value={customer.installedProducts.join(", ")}/><DetailItem label="총 라이선스 수량" value={`${formatNumber(customer.licenseCount)} User`}/><DetailItem label="사용률" value={`${customer.usageRate}%`}/><DetailItem label="다음 관리 액션" value={customer.nextAction}/><DetailItem label="다음 액션 기한" value={customer.nextActionDueDate}/>
      </div><CustomerNotesPanel note={customerNote} editable onSave={onSaveNotes}/></div>}
      {activeTab === "contacts" && <div className="drawerTabPanel"><ContactManager contacts={contacts} customerId={customer.customerId} onSave={onSaveContact} onDelete={onDeleteContact} onSetPrimary={onSetPrimaryContact}/></div>}
      {activeTab === "license" && <div className="drawerTabPanel"><div className="detailGrid compactDetailGrid">
        <DetailItem label="계약 번호" value={valueOrMissing(customer.contractNo)}/><DetailItem label="계약 시작일" value={customer.contractStartDate}/><DetailItem label="계약 종료일" value={customer.contractEndDate}/><DetailItem label="유지보수 종료일" value={customer.maintenanceEndDate}/><DetailItem label="계약 금액" value={formatCurrency(customer.contractAmount)}/><DetailItem label="유지보수 금액" value={formatCurrency(customer.maintenanceAmount)}/><DetailItem label="결제 주기" value={customer.paymentCycle}/><DetailItem label="갱신 조건" value={valueOrMissing(customer.renewalTerms)}/><DetailItem label="계약 문서명" value={valueOrMissing(customer.contractDocumentName)}/>
      </div></div>}
      {activeTab === "history" && <div className="drawerTabPanel"><div className="detailTimeline">{recentActivities.length ? recentActivities.map((activity) => <ActivityTimelineCard activity={activity} contacts={contacts} key={activity.id} onEdit={() => undefined} onDelete={() => undefined}/>) : <EmptyState text="아직 등록된 관리 이력이 없습니다."/>}</div></div>}
      {activeTab === "opportunities" && <div className="drawerTabPanel">
        <div className="panelHeader subsectionHeader"><div className="panelTitle"><Layers3 size={18}/><h2>추가 영업 기회</h2></div><button className="primaryButton" onClick={() => setShowOpportunityForm((current) => !current)}>새 영업 기회 생성</button></div>
        {showOpportunityForm && <CustomerOpportunityFormPanel customer={customer} onSubmit={(form) => { onCreateOpportunity(customer, form); setShowOpportunityForm(false); setFeedback(`${customer.customerName} 추가 영업 기회가 생성되었습니다.`); }}/>}
        <div className="opportunityList">{opportunities.length ? opportunities.map((opportunity) => <article className="opportunityCard" key={opportunity.id}><div><strong>{opportunity.title}</strong><span>{opportunity.opportunityType} · {opportunity.status} · {opportunity.owner}</span></div><b>{formatCurrency(opportunity.expectedRevenue)}</b><span>{opportunity.expectedDate} · {opportunity.nextActionDueDate}</span><p>{opportunity.nextAction}</p><span className={opportunity.activeInSalesPipeline ? "statusTag won" : "statusTag hold"}>{opportunity.activeInSalesPipeline ? "영업 현황 반영" : "관리 대상"}</span></article>) : <EmptyState text="등록된 추가 영업 기회가 없습니다."/>}</div>
      </div>}
      {activeTab === "documents" && <div className="drawerTabPanel"><div className="documentHistoryList">{documents.length ? documents.map((document) => <article className="documentHistoryCard" key={document.id}><strong>{document.title}</strong><span>{document.documentType} · {document.templateName} · {document.createdAt}</span></article>) : <EmptyState text="아직 생성된 문서가 없습니다."/>}</div></div>}
      {activeTab === "memo" && <div className="drawerTabPanel"><DetailItem label="메모" value={valueOrMissing(customer.memo)}/><CustomerNotesPanel note={customerNote} editable onSave={onSaveNotes}/></div>}
    </section>);
}
function ContactManager({ contacts, customerId, onSave, onDelete, onSetPrimary, }) {
    const emptyContactForm = {
        name: "",
        department: "",
        position: "",
        role: "실무 담당자",
        phone: "",
        email: "",
        preferredContactMethod: "미확인",
        influenceLevel: "보통",
        isPrimary: contacts.length === 0,
        note: "",
    };
    const [form, setForm] = useState(emptyContactForm);
    const [editingId, setEditingId] = useState(null);
    const [feedback, setFeedback] = useState("");
    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }
    async function copy(value, label) {
        if (!value) {
            setFeedback(`${label} 정보가 없습니다.`);
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            setFeedback(`${label}가 복사되었습니다.`);
        }
        catch {
            setFeedback(`${label} 복사에 실패했습니다.`);
        }
    }
    function edit(contact) {
        setEditingId(contact.id);
        setForm({
            id: contact.id,
            name: contact.name,
            department: contact.department ?? "",
            position: contact.position ?? "",
            role: contact.role,
            phone: contact.phone ?? "",
            email: contact.email ?? "",
            preferredContactMethod: contact.preferredContactMethod ?? "미확인",
            influenceLevel: contact.influenceLevel ?? "보통",
            isPrimary: contact.isPrimary,
            note: contact.note ?? "",
        });
    }
    function submit() {
        if (!form.name.trim()) {
            setFeedback("고객 담당자명을 입력해 주세요.");
            return;
        }
        onSave(form);
        setFeedback(editingId ? "고객 담당자가 수정되었습니다." : "고객 담당자가 추가되었습니다.");
        setEditingId(null);
        setForm({ ...emptyContactForm, isPrimary: contacts.length === 0 });
    }
    return (<section className="drawerSection contactManager">
      <div className="panelHeader subsectionHeader">
        <div className="panelTitle"><BriefcaseBusiness size={18}/><h2>고객 담당자</h2></div>
        <span className="statusPill">{contacts.length}명</span>
      </div>
      {feedback && <div className={feedback.includes("입력") || feedback.includes("실패") ? "formError" : "saveFeedback"}>{feedback}</div>}
      <div className="contactList">
        {contacts.length ? contacts.map((contact) => (<article className={`contactCard ${contact.isPrimary ? "primaryContact" : ""}`} key={contact.id}>
            <div>
              <strong>{contact.name}{contact.isPrimary ? " · 대표" : ""}</strong>
              <span>{[contact.department, contact.position, contact.role].filter(Boolean).join(" / ")}</span>
              <span>{contact.phone || "연락처 미등록"} · {contact.email || "이메일 미등록"}</span>
              <span>선호 {contact.preferredContactMethod || "미확인"} · 영향도 {contact.influenceLevel || "보통"}</span>
              {contact.note && <p>{contact.note}</p>}
            </div>
            <div className="contactActions">
              {!contact.isPrimary && <button className="secondaryButton compactButton" onClick={() => { onSetPrimary(contact.id); setFeedback(`${contact.name} 담당자를 대표로 지정했습니다.`); }}>대표 지정</button>}
              <button className="secondaryButton compactButton" onClick={() => copy(contact.phone, "전화번호")}>전화 복사</button>
              <button className="secondaryButton compactButton" onClick={() => copy(contact.email, "이메일")}>이메일 복사</button>
              <button className="secondaryButton compactButton" onClick={() => edit(contact)}>수정</button>
              <button className="secondaryButton compactButton dangerButton" onClick={() => { if (window.confirm("고객 담당자를 삭제하시겠습니까?")) {
            onDelete(contact.id);
            setFeedback("고객 담당자가 삭제되었습니다.");
        } }}>삭제</button>
            </div>
          </article>)) : <EmptyState text="등록된 고객 담당자가 없습니다. 담당자 추가로 첫 연락처를 기록하세요."/>}
      </div>
      <div className="activityForm">
        <div className="activityTarget"><strong>{editingId ? "담당자 수정" : "담당자 추가"}</strong><span>고객 ID: {customerId}</span></div>
        <div className="formGrid denseForm">
          <FieldLabel label="고객 담당자명" required><input value={form.name} onChange={(event) => update("name", event.target.value)}/></FieldLabel>
          <FieldLabel label="부서"><input value={form.department} onChange={(event) => update("department", event.target.value)}/></FieldLabel>
          <FieldLabel label="직책"><input value={form.position} onChange={(event) => update("position", event.target.value)}/></FieldLabel>
          <FieldLabel label="역할"><select value={form.role} onChange={(event) => update("role", event.target.value)}>{contactRoles.map((role) => <option key={role}>{role}</option>)}</select></FieldLabel>
          <FieldLabel label="연락처"><input value={form.phone} onChange={(event) => update("phone", event.target.value)}/></FieldLabel>
          <FieldLabel label="이메일"><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)}/></FieldLabel>
          <FieldLabel label="선호 연락 방식"><select value={form.preferredContactMethod} onChange={(event) => update("preferredContactMethod", event.target.value)}>{contactMethods.map((method) => <option key={method}>{method}</option>)}</select></FieldLabel>
          <FieldLabel label="의사결정 영향도"><select value={form.influenceLevel} onChange={(event) => update("influenceLevel", event.target.value)}>{influenceLevels.map((level) => <option key={level}>{level}</option>)}</select></FieldLabel>
        </div>
        <label className="checkboxRow stackedLabel"><input type="checkbox" checked={form.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)}/>대표 담당자로 지정</label>
        <FieldLabel label="비고" className="stackedLabel"><textarea rows={3} value={form.note} onChange={(event) => update("note", event.target.value)}/></FieldLabel>
        <div className="buttonRow">
          <button className="primaryButton" onClick={submit}>{editingId ? "담당자 수정" : "담당자 추가"}</button>
          {editingId && <button className="secondaryButton" onClick={() => { setEditingId(null); setForm(emptyContactForm); }}>취소</button>}
        </div>
      </div>
    </section>);
}
function CustomerNotesPanel({ note, editable = false, onSave }) {
    const [draft, setDraft] = useState(note);
    const [feedback, setFeedback] = useState("");
    useEffect(() => {
        setDraft(note);
        setFeedback("");
    }, [note.customerId, note.customerNote, note.salesNote, note.technicalNote, note.contractNote, note.relationshipNote, note.internalNote]);
    function update(key, value) {
        setDraft((current) => ({ ...current, [key]: value }));
    }
    const rows = [
        ["customerNote", "고객 특이사항"],
        ["salesNote", "영업 주의사항"],
        ["technicalNote", "기술 특이사항"],
        ["contractNote", "계약/결제 특이사항"],
        ["relationshipNote", "관계 메모"],
        ["internalNote", "내부 공유 메모"],
    ];
    return (<section className="drawerSection notesPanel">
      <div className="panelHeader subsectionHeader">
        <div className="panelTitle"><AlertTriangle size={18}/><h2>특이사항</h2></div>
        {hasCustomerNotes(draft) && <span className="statusPill">관리 메모 있음</span>}
      </div>
      {feedback && <div className="saveFeedback">{feedback}</div>}
      {editable ? (<>
          <div className="formGrid denseForm">
            {rows.map(([key, label]) => (<FieldLabel label={label} key={key}>
                <textarea rows={3} value={String(draft[key] ?? "")} onChange={(event) => update(key, event.target.value)}/>
              </FieldLabel>))}
          </div>
          <button className="primaryButton fullButton" onClick={() => { onSave?.(draft); setFeedback("특이사항이 저장되었습니다."); }}>특이사항 저장</button>
        </>) : (<div className="notesGrid">
          {rows.map(([key, label]) => <DetailItem label={label} value={valueOrMissing(String(draft[key] ?? ""))} key={key}/>)}
        </div>)}
    </section>);
}
function CustomerOpportunityFormPanel({ customer, onSubmit }) {
    const [form, setForm] = useState({
        opportunityType: "라이선스 증설",
        title: "",
        expectedRevenue: "",
        expectedDate: "2026-06-30",
        owner: customer.owner,
        nextAction: "",
        nextActionDueDate: "2026-06-10",
        productModules: customer.installedProducts.join(", "),
        expectedUserCount: String(customer.licenseCount),
        memo: "",
        activeInSalesPipeline: true,
    });
    const [errors, setErrors] = useState([]);
    const required = [["opportunityType", "기회 유형"], ["title", "기회명"], ["expectedRevenue", "예상 매출"], ["expectedDate", "예상 시점"], ["owner", "담당자"], ["nextAction", "다음 액션"], ["nextActionDueDate", "다음 액션 기한"]];
    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }
    function submit() {
        const missing = required.filter(([key]) => !String(form[key] ?? "").trim()).map(([, label]) => label);
        setErrors(missing);
        if (missing.length)
            return;
        onSubmit(form);
    }
    return (<div className="activityForm">
      <div className="activityTarget"><strong>기회 생성 대상</strong><span>{customer.customerName}</span></div>
      {errors.length > 0 && <div className="formError">필수 항목을 입력해 주세요: {errors.join(", ")}</div>}
      <div className="formGrid denseForm">
        <FieldLabel label="기회 유형" required><select value={form.opportunityType} onChange={(event) => update("opportunityType", event.target.value)}>{["재결제", "라이선스 연장", "라이선스 증설", "유지보수 갱신", "고도화 영업", "추가 모듈 제안", "기타"].map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
        <FieldLabel label="기회명" required><input value={form.title} onChange={(event) => update("title", event.target.value)}/></FieldLabel>
        <FieldLabel label="예상 매출" required><input type="number" value={form.expectedRevenue} onChange={(event) => update("expectedRevenue", event.target.value)}/></FieldLabel>
        <FieldLabel label="예상 시점" required><input type="date" value={form.expectedDate} onChange={(event) => update("expectedDate", event.target.value)}/></FieldLabel>
        <FieldLabel label="담당자" required><input value={form.owner} onChange={(event) => update("owner", event.target.value)}/></FieldLabel>
        <FieldLabel label="다음 액션" required><input value={form.nextAction} onChange={(event) => update("nextAction", event.target.value)}/></FieldLabel>
        <FieldLabel label="다음 액션 기한" required><input type="date" value={form.nextActionDueDate} onChange={(event) => update("nextActionDueDate", event.target.value)}/></FieldLabel>
        <FieldLabel label="제안 제품/모듈"><input value={form.productModules} onChange={(event) => update("productModules", event.target.value)}/></FieldLabel>
        <FieldLabel label="예상 사용자 수"><input type="number" value={form.expectedUserCount} onChange={(event) => update("expectedUserCount", event.target.value)}/></FieldLabel>
      </div>
      <label className="checkboxRow stackedLabel"><input type="checkbox" checked={form.activeInSalesPipeline} onChange={(event) => update("activeInSalesPipeline", event.target.checked)}/>액티브 상태로 영업 현황에 반영</label>
      <label className="stackedLabel">메모<textarea rows={3} value={form.memo} onChange={(event) => update("memo", event.target.value)}/></label>
      <button className="primaryButton fullButton" onClick={submit}>새 영업 기회 생성</button>
    </div>);
}
function DocumentsView({ customer, deal, salesDeals, selectedDealId, documentType, tone, inquiry, activities, contacts, pricingGuide, evidenceCases, draft, onDocumentDealChange, onAddDocumentDeal, onDocumentTypeChange, onToneChange, onInquiryChange, onGenerate, onSaveDocument, onDownloadDocument, onSaveAsActivity, }) {
    const [feedback, setFeedback] = useState(null);
    const [showAddDocumentDeal, setShowAddDocumentDeal] = useState(false);
    const [documentStep, setDocumentStep] = useState(1);
    const [newDocumentDeal, setNewDocumentDeal] = useState({
        customerName: "",
        title: "",
        industry: "",
        expectedRevenue: "",
        userCount: "",
        owner: "홍길동",
        productModules: "OTP",
    });
    const recentActivities = [...activities].filter((activity) => !activity.deletedAt).sort((a, b) => b.activityDate.localeCompare(a.activityDate)).slice(0, 8);
    const [selectedActivityIds, setSelectedActivityIds] = useState([]);
    const [audience, setAudience] = useState("고객 전달용");
    const [templateName, setTemplateName] = useState(documentTemplates[documentType][0]);
    const [includePricingGuide, setIncludePricingGuide] = useState(["견적서", "제안서"].includes(documentType));
    const [editedContent, setEditedContent] = useState("");
    const [sendOption, setSendOption] = useState("초안만 저장");
    const [exportFormat, setExportFormat] = useState(recommendedExportFormat(documentType));
    const [documentLength, setDocumentLength] = useState("보통");
    const [outputDetail, setOutputDetail] = useState("표준형");
    const [styleStrength, setStyleStrength] = useState("일반 공식");
    const [includeItems, setIncludeItems] = useState(["고객 요구사항 요약", "최근 영업 이력", "제품/모듈 구성", "다음 액션", "첨부 안내"]);
    const [excludeItems, setExcludeItems] = useState(["내부 메모 제외", "마진 정보 제외", "가격 방어 논리 제외", "담당자 개인 메모 제외"]);
    const [form, setForm] = useState({
        recipient: "고객 담당자",
        purpose: "고객 요청사항에 대한 후속 안내",
        keyPoints: "",
        extraRequest: "",
        emailPurpose: "후속 연락",
        recipientName: "",
        recipientTitle: "",
        ccRecipient: "",
        senderName: "홍길동",
        subjectDirection: "",
        attachmentName: "",
        quoteLicensePeriod: "1년",
        quoteMaintenancePeriod: "1년",
        quoteBuildSupportIncluded: true,
        quoteAppliedDiscountRate: deal.requestedDiscountRate,
        quoteValidUntil: "발행 후 30일",
        quoteSpecialTerms: "",
        officialPurpose: "기술 질의 답변",
        officialRecipient: customerDisplayName(customer),
        officialReferenceDept: "",
        officialSenderDept: "KICA 영업팀",
        officialTitle: "",
        officialSummary: "",
        officialTechConditions: customer.environment.join(", "),
        officialLimitations: "",
        officialDocumentNo: "KICA-CRM-2026-001",
        officialDate: "2026-05-28",
    });
    const customerOptions = [...new Map(salesDeals.map((item) => [item.customerId, item])).values()];
    const dealOptions = salesDeals.filter((item) => item.customerId === customer.id);
    const primaryDocumentContact = getPrimaryContact(contacts, customer.id);
    useEffect(() => {
        const defaults = recentActivities.slice(0, 3).map((activity) => activity.id);
        setSelectedActivityIds(defaults);
    }, [customer.id, selectedDealId]);
    useEffect(() => {
        setTemplateName(documentTemplates[documentType][0]);
        setIncludePricingGuide(["견적서", "제안서"].includes(documentType));
        setExportFormat(recommendedExportFormat(documentType));
    }, [documentType]);
    useEffect(() => {
        setEditedContent(draft?.body ?? "");
    }, [draft?.id]);
    useEffect(() => {
        if (!primaryDocumentContact)
            return;
        setForm((current) => ({
            ...current,
            recipient: current.recipient && current.recipient !== "고객 담당자" ? current.recipient : primaryDocumentContact.email || primaryDocumentContact.name,
            recipientName: current.recipientName || primaryDocumentContact.name,
            recipientTitle: current.recipientTitle || primaryDocumentContact.position || "",
            ccRecipient: current.ccRecipient || primaryDocumentContact.email || "",
            officialReferenceDept: current.officialReferenceDept || primaryDocumentContact.department || "",
        }));
    }, [primaryDocumentContact?.id]);
    function documentInput() {
        return {
            ...form,
            documentType,
            templateName,
            audience,
            recipient: form.recipient || primaryDocumentContact?.email || primaryDocumentContact?.name || "고객 담당자",
            purpose: form.purpose,
            tone,
            keyPoints: form.keyPoints || inquiry,
            extraRequest: form.extraRequest,
            selectedActivityIds,
            includePricingGuide,
            documentLength,
            outputDetail,
            styleStrength,
            includeItems,
            excludeItems,
            recipientName: form.recipientName || primaryDocumentContact?.name || "",
            recipientTitle: form.recipientTitle || primaryDocumentContact?.position || "",
            ccRecipient: form.ccRecipient || primaryDocumentContact?.email || "",
        };
    }
    function handleGenerate() {
        if (!form.purpose.trim() || !form.recipient.trim()) {
            setFeedback({ type: "error", message: "수신 대상과 작성 목적을 입력해 주세요." });
            return;
        }
        onGenerate(documentInput());
        setDocumentStep(4);
        setFeedback({ type: "success", message: "초안이 생성되었습니다." });
    }
    function handleAddDocumentDeal() {
        if (!newDocumentDeal.customerName.trim() || !newDocumentDeal.title.trim()) {
            setFeedback({ type: "error", message: "고객사명과 영업 건명을 입력해 주세요." });
            return;
        }
        onAddDocumentDeal(newDocumentDeal);
        setShowAddDocumentDeal(false);
        setNewDocumentDeal({
            customerName: "",
            title: "",
            industry: "",
            expectedRevenue: "",
            userCount: "",
            owner: "홍길동",
            productModules: "OTP",
        });
        setFeedback({ type: "success", message: "문서용 고객/영업 건이 영업 현황 데이터에 추가되었습니다." });
    }
    function handleSaveDraft() {
        if (!draft) {
            setFeedback({ type: "error", message: "먼저 초안을 생성해 주세요." });
            return;
        }
        localStorage.setItem("sales-crm-last-draft", JSON.stringify({ customerId: customer.id, dealId: deal.id, draft: { ...draft, body: editedContent } }));
        setFeedback({ type: "success", message: "초안이 임시 저장되었습니다." });
    }
    function handleSaveDocumentHistory() {
        if (!draft) {
            setFeedback({ type: "error", message: "먼저 초안을 생성해 주세요." });
            return;
        }
        onSaveDocument({
            ...draft,
            body: editedContent,
            customerId: customer.id,
            dealId: deal.id,
            savedStatus: sendOption === "고객 발송 완료로 저장" ? "고객 발송 완료" : sendOption === "내부 검토 중으로 저장" ? "내부 검토 중" : "초안 저장",
            supportedFormats: getSupportedExportFormats(draft.documentType),
        });
        setFeedback({ type: "success", message: "문서 이력에 저장되었습니다." });
    }
    async function handleDownload() {
        if (!draft) {
            setFeedback({ type: "error", message: "먼저 초안을 생성해 주세요." });
            return;
        }
        try {
            const fileName = await exportDocument({ ...draft, body: editedContent }, exportFormat, customer, deal);
            onDownloadDocument(draft.id);
            setFeedback({ type: "success", message: `${fileName} 다운로드를 시작했습니다.` });
        }
        catch (error) {
            setFeedback({ type: "error", message: error instanceof Error ? error.message : "다운로드에 실패했습니다." });
        }
    }
    function handleSaveAsActivity() {
        if (!draft) {
            setFeedback({ type: "error", message: "먼저 초안을 생성해 주세요." });
            return;
        }
        const activityType = documentType === "견적서" ? "견적서 발송" :
            documentType === "공문" ? "공문 발송" :
                "이메일";
        onSaveAsActivity({
            id: `act-doc-${Date.now()}`,
            dealId: deal.id,
            customerId: customer.id,
            customerName: customerDisplayName(customer),
            activityDate: "2026-05-28",
            activityType,
            title: `${draft.documentType} ${sendOption}`,
            description: draft.title,
            owner: "홍길동",
            relatedDocumentName: draft.title,
            memo: sendOption,
            createdAt: "2026-05-28",
        });
        setFeedback({ type: "success", "message": "문서를 영업 이력으로 저장했습니다." });
    }
    async function handleCopyDraft() {
        if (!draft) {
            setFeedback({ type: "error", message: "복사할 초안이 없습니다. 먼저 초안을 생성해 주세요." });
            return;
        }
        try {
            await navigator.clipboard.writeText(draftToText(draft));
            setFeedback({ type: "success", message: "초안이 복사되었습니다." });
        }
        catch {
            setFeedback({ type: "error", message: "브라우저 권한 문제로 복사하지 못했습니다. 미리보기 내용을 직접 선택해 주세요." });
        }
    }
    return (<div className="featureStack">
      <SectionTitle eyebrow="Document" title="문서 만들기 조건"/>
      <div className="stepper" aria-label="문서 만들기 단계">
        {[
            [1, "1. 문서 유형 선택", "메일, 견적서, 공문, 제안서"],
            [2, "2. 고객/영업 정보", "문서에 반영할 CRM 데이터"],
            [3, "3. 내용 설정", "톤, 분량, 포함/제외 항목"],
            [4, "4. 미리보기/저장", "편집, 저장, 다운로드"],
        ].map(([step, title, desc]) => (<button key={step} className={documentStep === step ? "active" : ""} type="button" onClick={() => setDocumentStep(step)}>
            <strong>{title}</strong>
            <span>{desc}</span>
          </button>))}
      </div>
      {documentStep === 1 && (<section className="documentTypeGrid" aria-label="문서 유형 선택 카드">
          {documentTypes.map((type) => (<button className={`documentTypeCard ${documentType === type ? "active" : ""}`} key={type} type="button" onClick={() => {
                    onDocumentTypeChange(type);
                    setDocumentStep(2);
                }}>
              <strong>{type}</strong>
              <span>{documentTypeCards[type].description}</span>
              <small>대표 템플릿: {documentTypeCards[type].examples}</small>
              <small>권장 형식: {documentTypeCards[type].recommended}</small>
            </button>))}
        </section>)}
      <div className="splitGrid">
        <section className="panel">
          <div className="panelTitle">
            <Layers3 size={18}/>
            <h2>문서 요청</h2>
          </div>
          <section className={documentStep === 2 ? "documentContextSummary" : "stepHidden"}>
            <strong>문서에 반영될 정보 요약</strong>
            <div>
              <span>고객사: {customerDisplayName(customer)}</span>
              <span>영업 건: {deal.name}</span>
              <span>현재 단계: {salesDeals.find((item) => item.id === selectedDealId)?.salesStage || deal.stage} &gt; {salesDeals.find((item) => item.id === selectedDealId)?.detailStage || "상세 미등록"}</span>
              <span>제품/모듈: {customer.installedModules.join(", ")}</span>
              <span>대표 담당자: {contactDetail(primaryDocumentContact)}</span>
              <span>최근 이력: {recentActivities.length}건</span>
              <span>가격 가이드: 권장 {pricingGuide.recommendedDiscountRate}% / 마지노선 {pricingGuide.maxAllowedDiscountRate}%</span>
            </div>
          </section>
          <div className="formGrid">
            <label>
              고객사
              <select value={customer.id} onChange={(event) => {
            const firstDeal = salesDeals.find((item) => item.customerId === event.target.value);
            if (firstDeal)
                onDocumentDealChange(firstDeal.id);
        }}>
                {customerOptions.map((item) => (<option value={item.customerId} key={item.customerId}>
                    {item.customerName}
                  </option>))}
              </select>
            </label>
            <label>
              영업 건
              <select value={selectedDealId} onChange={(event) => onDocumentDealChange(event.target.value)}>
                {dealOptions.map((item) => (<option value={item.id} key={item.id}>{item.title}</option>))}
              </select>
            </label>
            <label>
              문서 유형
              <select value={documentType} onChange={(event) => {
            onDocumentTypeChange(event.target.value);
            setDocumentStep(2);
        }}>
                {documentTypes.map((type) => (<option key={type}>{type}</option>))}
              </select>
            </label>
            <label>
              제출 톤
              <select value={tone} onChange={(event) => onToneChange(event.target.value)}>
                {documentTones.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              템플릿
              <select value={templateName} onChange={(event) => setTemplateName(event.target.value)}>
                {documentTemplates[documentType].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              문서 구분
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                <option>고객 전달용</option>
                <option>내부용</option>
              </select>
            </label>
            <label>
              수신 대상
              <input value={form.recipient} onChange={(event) => setForm((current) => ({ ...current, recipient: event.target.value }))}/>
            </label>
            <label>
              작성 목적
              <input value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}/>
            </label>
          </div>
          <div className="buttonRow">
            <button className="secondaryButton" type="button" onClick={() => setShowAddDocumentDeal((current) => !current)}>
              문서용 고객/영업 건 추가
            </button>
          </div>
          {documentType === "견적서" && (<div className="documentTypeHint">
              최종 제안 금액은 적용 할인율과 예상 매출을 기준으로 자동 계산되어 견적서 표와 Excel 다운로드에 반영됩니다.
            </div>)}
          {documentStep === 1 && showAddDocumentDeal && (<section className="inlinePanel">
              <div className="panelTitle">
                <Plus size={18}/>
                <h2>목록에 없는 고객/영업 건 추가</h2>
              </div>
              <div className="formGrid denseForm">
                <label>고객사명<input value={newDocumentDeal.customerName} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, customerName: event.target.value }))}/></label>
                <label>영업 건명<input value={newDocumentDeal.title} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, title: event.target.value }))}/></label>
                <label>산업군<input value={newDocumentDeal.industry} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, industry: event.target.value }))}/></label>
                <label>예상 매출<input type="number" value={newDocumentDeal.expectedRevenue} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, expectedRevenue: event.target.value }))}/></label>
                <label>사용자 수<input type="number" value={newDocumentDeal.userCount} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, userCount: event.target.value }))}/></label>
                <label>담당자<input value={newDocumentDeal.owner} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, owner: event.target.value }))}/></label>
                <label>제품/모듈<input value={newDocumentDeal.productModules} onChange={(event) => setNewDocumentDeal((current) => ({ ...current, productModules: event.target.value }))}/></label>
              </div>
              <div className="buttonRow">
                <button className="primaryButton" type="button" onClick={handleAddDocumentDeal}>추가</button>
                <button className="secondaryButton" type="button" onClick={() => setShowAddDocumentDeal(false)}>취소</button>
              </div>
            </section>)}
          <label className={documentStep === 3 ? "stackedLabel" : "stepHidden"}>
            포함할 핵심 내용
            <textarea rows={4} value={form.keyPoints || inquiry} onChange={(event) => {
            setForm((current) => ({ ...current, keyPoints: event.target.value }));
            onInquiryChange(event.target.value);
        }}/>
          </label>

          <div className={documentStep === 3 ? "" : "stepHidden"}>
            <DocumentTypeFields documentType={documentType} form={form} onChange={(next) => setForm((current) => ({ ...current, ...next }))} deal={deal} pricingGuide={pricingGuide}/>
          </div>

          <section className={documentStep === 3 ? "inlinePanel documentHistorySelector" : "stepHidden"}>
            <div className="panelTitle">
              <History size={18}/>
              <h2>참고할 영업 이력</h2>
            </div>
            {recentActivities.length ? recentActivities.map((activity) => (<label className="checkboxRow" key={activity.id}>
                <input type="checkbox" checked={selectedActivityIds.includes(activity.id)} onChange={(event) => setSelectedActivityIds((current) => event.target.checked ? [...current, activity.id] : current.filter((id) => id !== activity.id))}/>
                <span>{activity.activityDate} {activity.activityType}: {activity.title}</span>
              </label>)) : <EmptyState text="선택 가능한 영업 이력이 없습니다."/>}
          </section>

          <section className={documentStep === 3 ? "inlinePanel documentHistorySelector" : "stepHidden"}>
            <div className="panelTitle">
              <Settings2 size={18}/>
              <h2>결과물 제어 옵션</h2>
            </div>
            <div className="formGrid denseForm">
              <label>문서 분량<select value={documentLength} onChange={(event) => setDocumentLength(event.target.value)}>{["짧게", "보통", "자세히"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>출력 상세도<select value={outputDetail} onChange={(event) => setOutputDetail(event.target.value)}>{["요약형", "표준형", "상세형"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>문체 강도<select value={styleStrength} onChange={(event) => setStyleStrength(event.target.value)}>{["매우 공식적", "일반 공식", "실무형", "친근한 영업형"].map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <div className="optionChecklist">
              <strong>포함할 내용</strong>
              {documentIncludeOptions.map((item) => (<label className="checkboxRow" key={item}>
                  <input type="checkbox" checked={includeItems.includes(item)} onChange={(event) => setIncludeItems((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))}/>
                  {item}
                </label>))}
            </div>
            <div className="optionChecklist">
              <strong>제외할 내용</strong>
              {documentExcludeOptions.map((item) => (<label className="checkboxRow" key={item}>
                  <input type="checkbox" checked={excludeItems.includes(item)} onChange={(event) => setExcludeItems((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))}/>
                  {item}
                </label>))}
            </div>
          </section>

          <label className={documentStep === 3 ? "checkboxRow" : "stepHidden"}>
            <input type="checkbox" checked={includePricingGuide} onChange={(event) => setIncludePricingGuide(event.target.checked)}/>
            참고할 가격 가이드 결과 포함
          </label>
          {documentStep === 3 && includePricingGuide && (<div className="documentPricingBox">
              권장 할인율 {pricingGuide.recommendedDiscountRate}% · 최대 허용 {pricingGuide.maxAllowedDiscountRate}% · 수주 확률 {pricingGuide.winProbability}% · 마진 위험도 {pricingGuide.marginRiskLevel}
            </div>)}

          <button className="primaryButton fullButton" onClick={handleGenerate}>
            <FileText size={17}/>
            문서 초안 생성
          </button>
          <div className="buttonRow stepNav">
            {documentStep > 1 && <button className="secondaryButton" type="button" onClick={() => setDocumentStep((documentStep - 1))}>이전</button>}
            {documentStep < 4 && <button className="secondaryButton" type="button" onClick={() => setDocumentStep((documentStep + 1))}>다음</button>}
            <button className="secondaryButton" type="button" aria-label="초안 저장" onClick={handleSaveDraft}>CRM에 저장</button>
            <button className="secondaryButton" type="button" onClick={handleCopyDraft}>복사</button>
            <button className="secondaryButton" type="button" onClick={handleGenerate}>다시 생성</button>
          </div>
          {feedback && <div className={feedback.type === "error" ? "formError" : "saveFeedback"}>{feedback.message}</div>}
          <CaseList title="참고되는 CRM 근거/유사 사례" cases={evidenceCases}/>
        </section>

        <section className={documentStep === 4 ? "panel" : "panel quietPanel"}>
          <div className="panelHeader">
            <div className="panelTitle">
              <ShieldCheck size={18}/>
              <h2>생성 결과 미리보기</h2>
            </div>
            <span className="statusPill">규칙 기반 MVP</span>
          </div>
          {draft ? (<>
              <DraftPreview draft={{ ...draft, body: editedContent }}/>
              <label className="stackedLabel editorLabel">
                편집 가능 초안
                <textarea rows={12} value={editedContent} onChange={(event) => setEditedContent(event.target.value)}/>
              </label>
              <div className="buttonRow">
                <button className="secondaryButton" type="button" onClick={handleCopyDraft}>복사</button>
                <button className="secondaryButton" type="button" onClick={handleSaveDocumentHistory}>문서 이력 저장</button>
                <select value={sendOption} onChange={(event) => setSendOption(event.target.value)}>
                  <option>초안만 저장</option>
                  <option>고객 발송 완료로 저장</option>
                  <option>내부 검토 중으로 저장</option>
                </select>
                <button className="primaryButton" type="button" onClick={handleSaveAsActivity}>이력에 저장</button>
              </div>
              <div className="downloadBox">
                <div>
                  <strong>다운로드</strong>
                  <span>{buildExportFileName(customer, deal, draft.documentType, exportFormat, new Date(), draft.templateName)}</span>
                </div>
                <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                  {["PDF", "Word", "Excel"].map((format) => (<option key={format} value={format} disabled={!getSupportedExportFormats(draft.documentType).includes(format)}>
                      {format}{!getSupportedExportFormats(draft.documentType).includes(format) ? " - 미지원" : ""}
                    </option>))}
                </select>
                <button className="primaryButton" type="button" onClick={handleDownload}>다운로드</button>
              </div>
            </>) : <EmptyState text="초안 생성 버튼을 누르면 CRM 데이터, 이력, 가격 기준 기반 초안이 표시됩니다."/>}
        </section>
      </div>
    </div>);
}
function DocumentTypeFields({ documentType, form, onChange, deal, pricingGuide, }) {
    if (documentType === "메일") {
        return (<div className="formGrid denseForm">
        <label>메일 목적<select value={String(form.emailPurpose)} onChange={(event) => onChange({ emailPurpose: event.target.value })}>{["첫 접촉", "미팅 일정 제안", "견적서 송부", "제안서 송부", "후속 연락", "자료 요청", "자료 송부", "계약 조건 확인", "장기 미응답 재접촉"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>수신자명<input value={String(form.recipientName)} onChange={(event) => onChange({ recipientName: event.target.value })}/></label>
        <label>수신자 직책<input value={String(form.recipientTitle)} onChange={(event) => onChange({ recipientTitle: event.target.value })}/></label>
        <label>참조자<input value={String(form.ccRecipient || "")} onChange={(event) => onChange({ ccRecipient: event.target.value })}/></label>
        <label>발신자명<input value={String(form.senderName)} onChange={(event) => onChange({ senderName: event.target.value })}/></label>
        <label>제목 방향<input value={String(form.subjectDirection)} onChange={(event) => onChange({ subjectDirection: event.target.value })}/></label>
        <label>첨부 자료명<input value={String(form.attachmentName)} onChange={(event) => onChange({ attachmentName: event.target.value })}/></label>
      </div>);
    }
    if (documentType === "견적서") {
        const initialPrice = Math.round(deal.expectedRevenue / Math.max(0.01, 1 - deal.requestedDiscountRate / 100));
        const appliedDiscount = Number(form.quoteAppliedDiscountRate || deal.requestedDiscountRate);
        return (<div className="formGrid denseForm">
        <ReadonlyField label="최초 제안가" value={formatCurrency(initialPrice)}/>
        <label>적용 할인율<input type="number" value={appliedDiscount} onChange={(event) => onChange({ quoteAppliedDiscountRate: Number(event.target.value) })}/></label>
        <ReadonlyField label="최종 제안 금액" value={formatCurrency(Math.round(initialPrice * (1 - appliedDiscount / 100)))}/>
        <label>라이선스 기간<input value={String(form.quoteLicensePeriod)} onChange={(event) => onChange({ quoteLicensePeriod: event.target.value })}/></label>
        <label>유지보수 기간<input value={String(form.quoteMaintenancePeriod)} onChange={(event) => onChange({ quoteMaintenancePeriod: event.target.value })}/></label>
        <label>구축 지원 포함<select value={form.quoteBuildSupportIncluded ? "yes" : "no"} onChange={(event) => onChange({ quoteBuildSupportIncluded: event.target.value === "yes" })}><option value="yes">포함</option><option value="no">미포함</option></select></label>
        <ReadonlyField label="가격 가이드 권장" value={`${pricingGuide.recommendedDiscountRate}% / 최대 ${pricingGuide.maxAllowedDiscountRate}%`}/>
        <label>견적 유효기간<input value={String(form.quoteValidUntil)} onChange={(event) => onChange({ quoteValidUntil: event.target.value })}/></label>
        <label>특이 조건<input value={String(form.quoteSpecialTerms)} onChange={(event) => onChange({ quoteSpecialTerms: event.target.value })}/></label>
      </div>);
    }
    if (documentType === "공문") {
        return (<div className="formGrid denseForm">
        <label>공문 목적<select value={String(form.officialPurpose)} onChange={(event) => onChange({ officialPurpose: event.target.value })}>{["기술 질의 답변", "제품 공급 확인", "호환성 확인", "구축 가능 여부", "가격/견적 제출", "계약/납품 관련 안내", "자료 제출"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>수신 기관/회사<input value={String(form.officialRecipient)} onChange={(event) => onChange({ officialRecipient: event.target.value })}/></label>
        <label>참조 부서<input value={String(form.officialReferenceDept)} onChange={(event) => onChange({ officialReferenceDept: event.target.value })}/></label>
        <label>발신 회사/부서<input value={String(form.officialSenderDept)} onChange={(event) => onChange({ officialSenderDept: event.target.value })}/></label>
        <label>공문 제목<input value={String(form.officialTitle)} onChange={(event) => onChange({ officialTitle: event.target.value })}/></label>
        <label>문서 번호<input value={String(form.officialDocumentNo)} onChange={(event) => onChange({ officialDocumentNo: event.target.value })}/></label>
        <label>시행일<input type="date" value={String(form.officialDate)} onChange={(event) => onChange({ officialDate: event.target.value })}/></label>
        <label>첨부 문서명<input value={String(form.attachmentName)} onChange={(event) => onChange({ attachmentName: event.target.value })}/></label>
      </div>);
    }
    return (<div className="formGrid denseForm">
      <label>제안서 목적<select value={String(form.emailPurpose)} onChange={(event) => onChange({ emailPurpose: event.target.value })}>{["신규 도입 제안", "추가 모듈 제안", "갱신 제안", "SSO 확장 제안", "OTP 도입 제안"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>첨부 자료명<input value={String(form.attachmentName)} onChange={(event) => onChange({ attachmentName: event.target.value })}/></label>
      <label>제안 일정<input value={String(form.quoteValidUntil)} onChange={(event) => onChange({ quoteValidUntil: event.target.value })}/></label>
    </div>);
}
function SalesOverviewView({ overview, activities, contacts, notes, salesTarget, settings, onSettingsChange, onAddDeal, onAddActivity, onNavigate, onOpenDeal, }) {
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ownerFilter, setOwnerFilter] = useState("all");
    const [showAddForm, setShowAddForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDetailedFilters, setShowDetailedFilters] = useState(false);
    const [statusDetail, setStatusDetail] = useState(null);
    const [selectedDealId, setSelectedDealId] = useState(null);
    const [selectedStage, setSelectedStage] = useState(null);
    const [summaryPeriod, setSummaryPeriod] = useState("month");
    const [tableViewMode, setTableViewMode] = useState(loadSalesTableViewMode);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState(loadSalesTableColumns);
    const [sortState, setSortState] = useState(loadSalesSortState);
    const selectedDeal = overview.dealsWithStatus.find((deal) => deal.id === selectedDealId) ?? null;
    const selectedDealIds = selectedDeal ? [selectedDeal.id] : [];
    const selectedActivities = overview.recentActivities.filter((activity) => selectedDealIds.includes(activity.dealId));
    const ownerOptions = [...new Set(overview.dealsWithStatus.map((deal) => deal.owner))].sort();
    const periodSummary = getSalesPeriodSummary(overview.dealsWithStatus, overview.upcomingTasks, salesTarget, summaryPeriod);
    const orderedSalesColumns = useMemo(() => {
        const displayOrder = [...defaultSalesColumnKeys, ...optionalSalesColumnKeys];
        const visible = new Set(visibleColumnKeys);
        return displayOrder.filter((column) => visible.has(column));
    }, [visibleColumnKeys]);
    const tableDensity = orderedSalesColumns.length >= 10 ? "dense" : orderedSalesColumns.length <= 6 ? "compact" : "balanced";
    const salesGridTemplate = orderedSalesColumns.map((column) => {
        const width = salesColumnMeta[column].width;
        if (tableDensity === "dense")
            return `${width}px`;
        if (column === "customer")
            return `${width}px`;
        if (tableDensity === "compact" && column === "deal")
            return `minmax(${width}px, 1.5fr)`;
        if (column === "deal")
            return `${width}px`;
        const minWidth = Math.max(86, width - 28);
        const grow = column === "nextAction" || column === "memo" ? 1.6 : column === "notes" || column === "products" ? 1.3 : 1;
        return `minmax(${minWidth}px, ${grow}fr)`;
    }).join(" ");
    const salesTableMinWidth = tableDensity === "dense"
        ? orderedSalesColumns.reduce((sum, column) => sum + salesColumnMeta[column].width, 0) + ((orderedSalesColumns.length - 1) * 10) + 24
        : undefined;
    const filteredDeals = overview.dealsWithStatus
        .filter((deal) => matchesSalesFilter(deal, filter))
        .filter((deal) => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword)
            return true;
        return [deal.customerName, deal.title, deal.industry, deal.owner, deal.nextAction].some((value) => value.toLowerCase().includes(keyword));
    })
        .filter((deal) => stageFilter === "all" || deal.salesStage === stageFilter)
        .filter((deal) => statusFilter === "all" || deal.computedStatus === statusFilter)
        .filter((deal) => ownerFilter === "all" || deal.owner === ownerFilter);
    const displayedDeals = useMemo(() => sortSalesDeals(filteredDeals, sortState, contacts), [filteredDeals, sortState, contacts]);
    function submitDeal(form) {
        onAddDeal(form);
        setShowAddForm(false);
        setFilter("all");
    }
    useEffect(() => {
        localStorage.setItem(salesTableColumnStorageKey, JSON.stringify(visibleColumnKeys));
    }, [visibleColumnKeys]);
    useEffect(() => {
        localStorage.setItem(salesTableViewStorageKey, tableViewMode);
    }, [tableViewMode]);
    useEffect(() => {
        if (sortState)
            localStorage.setItem(salesTableSortStorageKey, JSON.stringify(sortState));
        else
            localStorage.removeItem(salesTableSortStorageKey);
    }, [sortState]);
    useEffect(() => {
        if (sortState && !visibleColumnKeys.includes(sortState.key))
            setSortState(null);
    }, [sortState, visibleColumnKeys]);
    function toggleSalesColumn(column) {
        if (salesColumnMeta[column].required)
            return;
        setVisibleColumnKeys((current) => {
            if (current.includes(column))
                return current.filter((item) => item !== column);
            return [...current, column];
        });
    }
    function resetSalesColumns() {
        setVisibleColumnKeys(defaultSalesColumnKeys);
    }
    function handleSort(column) {
        if (!salesColumnMeta[column].sortable)
            return;
        setSortState((current) => {
            if (!current || current.key !== column)
                return { key: column, direction: "asc" };
            if (current.direction === "asc")
                return { key: column, direction: "desc" };
            return null;
        });
    }
    function sortIcon(column) {
        if (!salesColumnMeta[column].sortable)
            return "";
        if (sortState?.key !== column)
            return "↕";
        return sortState.direction === "asc" ? "↑" : "↓";
    }
    function salesCellClass(column) {
        return [
            "salesCell",
            column === "customer" ? "stickyCustomerCell salesCellTwoLine" : "",
            column === "deal" ? "stickyDealCell salesCellTwoLine" : "",
        ].filter(Boolean).join(" ");
    }
    function renderSalesCell(deal, column) {
        const primaryContact = getPrimaryContact(contacts, deal.customerId, deal.primaryContactId);
        const note = getCustomerNote(notes, deal.customerId);
        const noteLabels = shortNoteLabels(note);
        const noteTooltip = customerNoteTooltip(note);
        if (column === "customer") {
            return (<span className="customerCell" title={noteTooltip}>
          <b>{deal.customerName}</b>
          <span className="customerMetaLine">
            <small className={`salesTypeTag ${typeClass(deal.salesType)}`}>{deal.salesType}</small>
            {noteLabels.length > 0 && <small className="noteIconBadge">특이사항</small>}
          </span>
        </span>);
        }
        if (column === "deal")
            return <span className="truncateCell" title={deal.title}>{deal.title}</span>;
        if (column === "status") {
            return (<span role="button" tabIndex={0} className={`statusTag ${statusClass(deal.computedStatus)}`} title={deal.computedStatusReason} onClick={(event) => {
                    event.stopPropagation();
                    setStatusDetail({ title: deal.title, status: deal.computedStatus, reason: deal.computedStatusReason });
                }} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.stopPropagation();
                        setStatusDetail({ title: deal.title, status: deal.computedStatus, reason: deal.computedStatusReason });
                    }
                }}>
          {deal.computedStatus}
        </span>);
        }
        if (column === "salesStage")
            return <span className="truncateCell" title={`${deal.salesStage} / ${deal.detailStage}`}>{deal.salesStage}</span>;
        if (column === "nextAction")
            return <span className="truncateCell" title={deal.nextAction || "미등록"}>{deal.nextAction || "미등록"}</span>;
        if (column === "dueDate")
            return <span>{deal.nextActionDueDate || "-"}</span>;
        if (column === "contact")
            return <span className="truncateCell" title={`${contactDetail(primaryContact)} / ${primaryContact?.phone || "연락처 미등록"} / ${primaryContact?.email || "이메일 미등록"}`}>{contactSummary(primaryContact)}</span>;
        if (column === "expectedRevenue")
            return <span>{formatCurrency(deal.expectedRevenue)}</span>;
        if (column === "lastContact")
            return <span>{deal.lastContactDate}</span>;
        if (column === "detailStage")
            return <span className="truncateCell" title={deal.detailStage}>{deal.detailStage}</span>;
        if (column === "phone")
            return <span className="truncateCell" title={primaryContact?.phone || "미등록"}>{primaryContact?.phone || "미등록"}</span>;
        if (column === "notes") {
            return (<span className="noteBadgeGroup" title={noteTooltip}>
          {noteLabels.length ? (<>
              {noteLabels.slice(0, 2).map((label) => <small className="noteBadge" key={label}>{label}</small>)}
              {noteLabels.length > 2 && <small className="noteBadge">+{noteLabels.length - 2}</small>}
            </>) : <small className="mutedText">없음</small>}
        </span>);
        }
        if (column === "owner")
            return <span>{deal.owner}</span>;
        if (column === "industry")
            return <span>{deal.industry}</span>;
        if (column === "products")
            return <span className="truncateCell" title={deal.productModules?.join(", ") || "미등록"}>{deal.productModules?.join(", ") || "미등록"}</span>;
        if (column === "requestedDiscount")
            return <span>{deal.requestedDiscountRate ? `${deal.requestedDiscountRate}%` : "-"}</span>;
        if (column === "competitor")
            return <span>{deal.competitorInvolved ? "참여" : "없음"}</span>;
        if (column === "source")
            return <span className="truncateCell" title={deal.source}>{deal.source}</span>;
        return <span className="truncateCell" title={deal.memo || "미등록"}>{deal.memo || "미등록"}</span>;
    }
    return (<div className="featureStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Status Board</p>
          <h2>전체 영업 데이터</h2>
        </div>
        <div className="titleActions">
          <button className="secondaryButton" onClick={() => setShowSettings((current) => !current)}>
            <Settings2 size={16}/>
            상태 기준 설정
          </button>
          <button className="primaryButton" onClick={() => setShowAddForm((current) => !current)}>
            <Plus size={16}/>
            신규 영업 추가
          </button>
        </div>
      </div>

      {showAddForm && <NewSalesDealForm onSubmit={submitDeal} onCancel={() => setShowAddForm(false)}/>}
      {showSettings && <StatusRuleSettingsPanel settings={settings} onChange={onSettingsChange}/>}

      <div className="salesBoardLayout">
        <div className="salesBoardMain">
      <section className="panel salesControlPanel">
        <div className="formGrid denseForm">
          <label>
            검색
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="고객사, 영업 건, 담당자 검색"/>
          </label>
          <label>
            영업 단계
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="all">전체</option>
              {pipelineStages.map((stage) => (<option key={stage} value={stage}>{stage}</option>))}
            </select>
          </label>
          <label>
            상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">전체</option>
              {Object.keys(statusLabels).map((status) => (<option key={status} value={status}>{status}</option>))}
            </select>
          </label>
          <label>
            담당자
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">전체</option>
              {ownerOptions.map((owner) => (<option key={owner} value={owner}>{owner}</option>))}
            </select>
          </label>
        </div>
        <div className="buttonRow filterActionRow">
          <button className="secondaryButton" type="button" onClick={() => setShowDetailedFilters((current) => !current)}>
            {showDetailedFilters ? "상세 필터 접기" : "상세 필터"}
          </button>
          <button className="secondaryButton" type="button" onClick={() => {
            setSearchTerm("");
            setStageFilter("all");
            setStatusFilter("all");
            setOwnerFilter("all");
            setFilter("all");
        }}>필터 초기화</button>
        </div>
        {showDetailedFilters && (<div className="detailFilterPanel">
            <span>산업군, 영업 유형, 예상 매출 범위, 마지막 컨택일, 경쟁사 참여 여부는 상세 패널에서 확인합니다.</span>
            <span>현재 MVP에서는 기본 필터로 빠르게 찾고, row 클릭 후 상세 정보를 확인하는 흐름으로 정리했습니다.</span>
          </div>)}
      </section>

          <section className="summarySection">
            <div className="periodToggle" aria-label="영업 지표 기간 선택">
              <button className={summaryPeriod === "month" ? "active" : ""} onClick={() => setSummaryPeriod("month")}>이번 달</button>
              <button className={summaryPeriod === "year" ? "active" : ""} onClick={() => setSummaryPeriod("year")}>올해</button>
            </div>
            <div className="overviewGrid summaryGrid">
              {summaryPeriod === "month" ? (<>
                  <MetricCard label="이번 달 예상 매출" value={formatCurrency(periodSummary.expectedRevenue)} description={`월 목표 ${formatCurrency(periodSummary.targetRevenue)}`} icon={<BadgePercent size={20}/>}/>
                  <MetricCard label="이번 달 수주 매출" value={formatCurrency(periodSummary.wonRevenue)} description={`달성률 ${periodSummary.achievementRate}%`} icon={<ShieldCheck size={20}/>}/>
                  <MetricCard label="진행 중 딜" value={`${periodSummary.activeDealCount}건`} description={formatCurrency(periodSummary.activeRevenue)} icon={<BriefcaseBusiness size={20}/>}/>
                  <MetricCard label="지연/위험 딜" value={`${periodSummary.riskDealCount}건`} description="즉시 후속 필요" icon={<AlertTriangle size={20}/>}/>
                  <MetricCard label="이번 주 할 일" value={`${periodSummary.weeklyTaskCount}건`} description="7일 이내 미완료" icon={<ClipboardList size={20}/>}/>
                </>) : (<>
                  <MetricCard label="올해 예상 매출" value={formatCurrency(periodSummary.expectedRevenue)} description={`연 목표 ${formatCurrency(periodSummary.targetRevenue)}`} icon={<BadgePercent size={20}/>}/>
                  <MetricCard label="올해 수주 매출" value={formatCurrency(periodSummary.wonRevenue)} description="계약 완료 기준" icon={<ShieldCheck size={20}/>}/>
                  <MetricCard label="올해 진행 중 매출" value={formatCurrency(periodSummary.activeRevenue)} description={`${periodSummary.activeDealCount}건 진행 중`} icon={<BriefcaseBusiness size={20}/>}/>
                  <MetricCard label="올해 수주 건수" value={`${periodSummary.wonDealCount}건`} description="수주 상태 딜" icon={<ShieldCheck size={20}/>}/>
                  <MetricCard label="올해 실패/보류" value={`${periodSummary.failedOrHoldDealCount}건`} description="종료·보류 포함" icon={<AlertTriangle size={20}/>}/>
                  <MetricCard label="목표 달성률" value={`${periodSummary.achievementRate}%`} description={`${formatCurrency(periodSummary.wonRevenue)} / ${formatCurrency(periodSummary.targetRevenue)}`} icon={<BadgePercent size={20}/>}/>
                </>)}
            </div>
          </section>

      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle">
            <LayoutDashboard size={18}/>
            <h2>영업 현황판</h2>
          </div>
          <span className="statusPill">전체 {overview.dealsWithStatus.length}건</span>
        </div>
        <div className="pipelineGrid">
          {overview.pipeline.map((stage) => (<button className={`pipelineCard ${stage.riskDealCount > 0 ? "hasRisk" : ""}`} key={stage.stage} onClick={() => setSelectedStage(stage.stage)}>
              <div className="pipelineCardTop">
                <strong>{stage.stage}</strong>
                {stage.riskDealCount > 0 && <span className="riskMarker">위험 {stage.riskDealCount}</span>}
              </div>
              <span>{stage.dealCount}건</span>
              <b>{formatCurrency(stage.expectedRevenue)}</b>
              <small>{stage.representativeCustomers.length ? stage.representativeCustomers.join(", ") : "대표 고객 없음"}</small>
              <small className="cardLinkText">상세 보기</small>
            </button>))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle">
            <BriefcaseBusiness size={18}/>
            <h2>고객/딜 현황</h2>
          </div>
          <div className="tableToolbar">
            <SalesFilterTabs value={filter} onChange={setFilter}/>
            <div className="viewToggle" aria-label="고객/딜 보기 방식">
              <button className={tableViewMode === "table" ? "active" : ""} type="button" onClick={() => setTableViewMode("table")}>테이블 보기</button>
              <button className={tableViewMode === "card" ? "active" : ""} type="button" onClick={() => setTableViewMode("card")}>카드 보기</button>
            </div>
            <button className="secondaryButton compactButton" type="button" onClick={() => setShowColumnSettings((current) => !current)}>
              <Settings2 size={15}/>
              컬럼 설정
            </button>
          </div>
        </div>
        {showColumnSettings && (<div className="columnSettingsPanel">
            <div>
              <strong>기본 컬럼</strong>
              <span>고객사와 영업 건은 고객 맥락 유지를 위해 항상 표시됩니다.</span>
            </div>
            <div className="columnOptionGrid">
              {[...defaultSalesColumnKeys, ...optionalSalesColumnKeys].map((column) => (<label className="checkboxLine" key={column}>
                  <input type="checkbox" checked={visibleColumnKeys.includes(column)} disabled={Boolean(salesColumnMeta[column].required)} onChange={() => toggleSalesColumn(column)}/>
                  {salesColumnMeta[column].label}
                </label>))}
            </div>
            <button className="textButton" type="button" onClick={resetSalesColumns}>기본 컬럼으로 복원</button>
          </div>)}
        {statusDetail && (<div className="statusExplanationBox">
            <strong>{statusDetail.title} · {statusLabels[statusDetail.status]}</strong>
            <span>{statusDetail.reason}</span>
          </div>)}
        {tableViewMode === "card" && (<div className="cardSortBar">
            <label>
              카드 정렬
              <select value={cardSortOptionFromState(sortState)} onChange={(event) => setSortState(sortStateFromCardOption(event.target.value))}>
                <option value="default">기본순</option>
                <option value="risk">위험도 높은 순</option>
                <option value="due">기한 빠른 순</option>
                <option value="revenue">예상 매출 높은 순</option>
                <option value="lastContactOld">마지막 컨택 오래된 순</option>
                <option value="customer">고객사 가나다순</option>
              </select>
            </label>
          </div>)}
        {tableViewMode === "table" ? (<div className={`salesTable ${tableDensity === "dense" ? "denseTable" : tableDensity === "compact" ? "compactTable" : "balancedTable"}`} role="region" aria-label="고객/딜 현황 테이블" style={{
                "--customer-sticky-width": `${salesColumnMeta.customer.width}px`,
                "--sales-table-min-width": salesTableMinWidth ? `${salesTableMinWidth}px` : "100%",
            }}>
            <div className="salesHead" style={{ gridTemplateColumns: salesGridTemplate, minWidth: "var(--sales-table-min-width)" }}>
              {orderedSalesColumns.map((column) => (<span className={salesCellClass(column)} key={column}>
                  {salesColumnMeta[column].sortable ? (<button className={`sortHeaderButton ${sortState?.key === column ? "active" : ""}`} type="button" onClick={() => handleSort(column)} title={`${salesColumnMeta[column].label} 기준 정렬`}>
                      {salesColumnMeta[column].label}
                      <span>{sortIcon(column)}</span>
                    </button>) : salesColumnMeta[column].label}
                </span>))}
            </div>
            {displayedDeals.map((deal) => (<button className={`salesRow ${deal.id === selectedDealId ? "selectedRow" : ""}`} key={deal.id} style={{ gridTemplateColumns: salesGridTemplate, minWidth: "var(--sales-table-min-width)" }} onClick={() => {
                    setSelectedDealId(deal.id);
                    onOpenDeal(deal.id);
                }}>
                {orderedSalesColumns.map((column) => (<span className={salesCellClass(column)} key={column}>
                    {renderSalesCell(deal, column)}
                  </span>))}
              </button>))}
            {displayedDeals.length === 0 && (<div className="tableEmptyState">
                <strong>검색 결과가 없습니다.</strong>
                <span>조건을 변경하거나 필터를 초기화해 보세요.</span>
              </div>)}
          </div>) : (<div className="dealCardGrid">
            {displayedDeals.map((deal) => {
                const primaryContact = getPrimaryContact(contacts, deal.customerId, deal.primaryContactId);
                return (<button className={`dealSummaryCard ${deal.id === selectedDealId ? "selectedRow" : ""}`} key={deal.id} onClick={() => {
                        setSelectedDealId(deal.id);
                        onOpenDeal(deal.id);
                    }}>
                  <div className="dealCardTop">
                    <strong>{deal.customerName}</strong>
                    <span className={`statusTag ${statusClass(deal.computedStatus)}`}>{deal.computedStatus}</span>
                  </div>
                  <b>{deal.title}</b>
                  <div className="dealCardMeta">
                    <span>{deal.salesStage}</span>
                    <span>{formatCurrency(deal.expectedRevenue)}</span>
                    <span>{contactSummary(primaryContact)}</span>
                  </div>
                  <p>{deal.nextAction || "다음 액션 미등록"}</p>
                  <small>기한 {deal.nextActionDueDate || "-"} · 마지막 컨택 {deal.lastContactDate}</small>
                </button>);
            })}
            {displayedDeals.length === 0 && (<div className="emptyCardState">
                <strong>검색 결과가 없습니다.</strong>
                <span>조건을 변경하거나 필터를 초기화해 보세요.</span>
              </div>)}
            </div>)}
      </section>

      <div className="splitGrid">
        <RiskPanel riskDeals={overview.riskDeals} selectedCustomerId={selectedDeal?.customerId ?? ""} onOpenDeal={(dealId) => {
            setSelectedDealId(dealId);
            onOpenDeal(dealId);
        }}/>
        <ActivityTimeline activities={overview.recentActivities} selectedActivities={selectedActivities} selectedCustomerName={selectedDeal?.customerName ?? "선택 딜"}/>
      </div>
        </div>

        <NextActionPanel tasks={overview.upcomingTasks} riskDeals={overview.riskDeals} deals={overview.dealsWithStatus} onOpenDeal={(dealId) => {
            setSelectedDealId(dealId);
            onOpenDeal(dealId);
        }} onNavigate={onNavigate}/>
      </div>

      {selectedStage && (<ModalShell label={`${selectedStage} 상세`} onClose={() => setSelectedStage(null)}>
          <StageDetailPanel stage={selectedStage} summary={overview.pipeline.find((item) => item.stage === selectedStage)} deals={overview.dealsWithStatus.filter((deal) => deal.salesStage === selectedStage)} selectedDealId={selectedDealId} onSelectDeal={(dealId) => {
                setSelectedDealId(dealId);
                setSelectedStage(null);
                onOpenDeal(dealId);
            }} onNavigate={(view) => {
                setSelectedStage(null);
                onNavigate(view);
            }}/>
        </ModalShell>)}
    </div>);
}
function ModalShell({ label, onClose, children }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);
    return (<div className="modalLayer" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modalPanel">
        <button className="modalClose iconTextButton" onClick={onClose}>
          <X size={16}/>
          닫기
        </button>
        {children}
      </div>
    </div>);
}
function DetailDrawerShell({ label, onClose, children }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);
    return (<div className="drawerLayer" role="dialog" aria-modal="true" aria-label={label}>
      <aside className="drawerPanel">
        {children}
      </aside>
    </div>);
}
function StageDetailPanel({ stage, summary, deals, selectedDealId, onSelectDeal, onNavigate, }) {
    return (<section className="stageDetail">
      <div className="detailHero">
        <span className="statusPill">영업 현황판 상세</span>
        <h2>{stage} 상세</h2>
        <p>{summary?.dealCount ?? 0}건 / 예상 {formatCurrency(summary?.expectedRevenue ?? 0)} / 위험·지연 {summary?.riskDealCount ?? 0}건</p>
      </div>
      <div className="overviewGrid stageMetricGrid">
        <MetricCard label="해당 단계 딜" value={`${summary?.dealCount ?? 0}건`}/>
        <MetricCard label="예상 매출" value={formatCurrency(summary?.expectedRevenue ?? 0)}/>
        <MetricCard label="위험/지연" value={`${summary?.riskDealCount ?? 0}건`}/>
        <MetricCard label="평균 체류일" value={`${summary?.averageStayDays ?? 0}일`}/>
      </div>
      <section className="panel inlinePanel">
        <div className="panelTitle">
          <LayoutDashboard size={18}/>
          <h2>상세 상태별 분포</h2>
        </div>
        <div className="distributionGrid">
          {(summary?.detailDistribution.length ? summary.detailDistribution : detailStagesBySalesStage[stage].map((detailStage) => ({ detailStage, dealCount: 0 }))).map((item) => (<span key={item.detailStage}>{item.detailStage} {item.dealCount}건</span>))}
        </div>
      </section>
      <section className="panel inlinePanel">
        <div className="panelTitle">
          <BriefcaseBusiness size={18}/>
          <h2>고객/딜 리스트</h2>
        </div>
        <div className="stageDealTable">
          <div className="stageDealHead">
            <span>고객사</span>
            <span>영업 건</span>
            <span>상세 상태</span>
            <span>예상 매출</span>
            <span>담당자</span>
            <span>마지막 컨택</span>
            <span>다음 액션</span>
            <span>상태</span>
            <span>액션</span>
          </div>
          {deals.map((deal) => (<div className={`stageDealRow ${deal.id === selectedDealId ? "selectedRow" : ""}`} key={deal.id}>
              <button className="linkCell" onClick={() => onSelectDeal(deal.id)}>{deal.customerName}</button>
              <button className="linkCell" onClick={() => onSelectDeal(deal.id)}>{deal.title}</button>
              <span>{deal.detailStage}</span>
              <span>{formatCurrency(deal.expectedRevenue)}</span>
              <span>{deal.owner}</span>
              <span>{deal.lastContactDate}</span>
              <span>{deal.nextAction}</span>
              <span className={`statusTag ${statusClass(deal.computedStatus)}`}>{deal.computedStatus}</span>
              <span className="rowActions">
                <button className="secondaryButton compactButton" onClick={() => onSelectDeal(deal.id)}>상세 보기</button>
                <button className="secondaryButton compactButton" onClick={() => onNavigate("documents")}>문서 생성</button>
                <button className="secondaryButton compactButton" onClick={() => onNavigate("pricing")}>가격 가이드</button>
              </span>
            </div>))}
        </div>
      </section>
    </section>);
}
function NewSalesDealForm({ onSubmit, onCancel }) {
    const [form, setForm] = useState(emptySalesForm);
    const [errors, setErrors] = useState([]);
    function update(key, value) {
        setForm((current) => ({
            ...current,
            [key]: value,
            ...(key === "salesType" && value === "신규 제안" ? { salesStage: "신규 OI 발굴", detailStage: "신규 제안" } : {}),
            ...(key === "salesType" && value === "신규 인입" ? { salesStage: "신규 OI 발굴", detailStage: "신규 인입" } : {}),
            ...(key === "salesStage" ? { detailStage: detailStagesBySalesStage[value][0] } : {}),
        }));
    }
    function submit() {
        const missing = getMissingSalesFields(form);
        setErrors(missing);
        if (missing.length)
            return;
        onSubmit(form);
        setForm(emptySalesForm);
    }
    return (<section className="panel">
      <div className="panelTitle">
        <Plus size={18}/>
        <h2>신규 영업 사이트 추가</h2>
      </div>
      {errors.length > 0 && <div className="formError">필수 항목을 입력해 주세요: {errors.join(", ")}</div>}
      <div className="formSectionStack">
        <section className="formSection">
          <h3>기본 정보</h3>
          <div className="formGrid denseForm">
            <FieldLabel label="영업 유형" required>
              <select value={form.salesType} onChange={(event) => update("salesType", event.target.value)}>
                <option value="신규 인입">신규 인입</option>
                <option value="신규 제안">신규 제안</option>
              </select>
            </FieldLabel>
            <FieldLabel label="고객사명" required>
              <input value={form.customerName} onChange={(event) => update("customerName", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="영업 건명" required>
              <input value={form.title} onChange={(event) => update("title", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="산업군" required>
              <input value={form.industry} onChange={(event) => update("industry", event.target.value)}/>
            </FieldLabel>
          </div>
        </section>

        <section className="formSection">
          <h3>영업 정보</h3>
          <div className="formGrid denseForm">
            <FieldLabel label="상위 영업 단계" required>
              <select value={form.salesStage} onChange={(event) => update("salesStage", event.target.value)}>
                {pipelineStages.map((stage) => (<option key={stage}>{stage}</option>))}
              </select>
            </FieldLabel>
            <FieldLabel label="상세 상태" required>
              <select value={form.detailStage} onChange={(event) => update("detailStage", event.target.value)}>
                {detailStagesBySalesStage[form.salesStage].map((stage) => (<option key={stage}>{stage}</option>))}
              </select>
            </FieldLabel>
            <FieldLabel label="담당자" required>
              <input value={form.owner} onChange={(event) => update("owner", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="예상 매출" required>
              <input type="number" value={form.expectedRevenue} onChange={(event) => update("expectedRevenue", event.target.value)}/>
            </FieldLabel>
          </div>
          {form.expectedRevenue && <p className="fieldHelper">예상 매출: {formatCurrency(Number(form.expectedRevenue))}</p>}
        </section>

        <section className="formSection">
          <h3>일정/액션</h3>
          <div className="formGrid denseForm">
            <FieldLabel label="최초 접촉일" required>
              <input type="date" value={form.firstContactDate} onChange={(event) => update("firstContactDate", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="마지막 컨택일" required>
              <input type="date" value={form.lastContactDate} onChange={(event) => update("lastContactDate", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="다음 액션" required>
              <input value={form.nextAction} onChange={(event) => update("nextAction", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="다음 액션 기한" required>
              <input type="date" value={form.nextActionDueDate} onChange={(event) => update("nextActionDueDate", event.target.value)}/>
            </FieldLabel>
          </div>
        </section>

        <section className="formSection">
          <h3>선택 정보</h3>
          <div className="formGrid denseForm">
            <FieldLabel label="고객 담당자명">
              <input value={form.contactName} onChange={(event) => update("contactName", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="부서">
              <input value={form.contactDepartment} onChange={(event) => update("contactDepartment", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="직책">
              <input value={form.contactPosition} onChange={(event) => update("contactPosition", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="역할">
              <select value={form.contactRole} onChange={(event) => update("contactRole", event.target.value)}>
                {contactRoles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="고객 연락처">
              <input value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="고객 이메일">
              <input value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="제안 제품/모듈">
              <input value={form.proposedModules} onChange={(event) => update("proposedModules", event.target.value)} placeholder="OTP, SSO, VPN 인증"/>
            </FieldLabel>
            <FieldLabel label="예상 사용자 수">
              <input type="number" value={form.estimatedUserCount} onChange={(event) => update("estimatedUserCount", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="유입 경로">
              <input value={form.source} onChange={(event) => update("source", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="경쟁사 참여 여부">
              <select value={form.competitorInvolved} onChange={(event) => update("competitorInvolved", event.target.value)}>
                <option value="no">없음</option>
                <option value="yes">있음</option>
              </select>
            </FieldLabel>
            <FieldLabel label="요청 할인율">
              <input type="number" value={form.requestedDiscountRate} onChange={(event) => update("requestedDiscountRate", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="첨부자료명">
              <input value={form.attachmentName} onChange={(event) => update("attachmentName", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="고객 특이사항">
              <input value={form.customerNote} onChange={(event) => update("customerNote", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="영업 주의사항">
              <input value={form.salesNote} onChange={(event) => update("salesNote", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="기술 특이사항">
              <input value={form.technicalNote} onChange={(event) => update("technicalNote", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="계약/결제 특이사항">
              <input value={form.contractNote} onChange={(event) => update("contractNote", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="관계 메모">
              <input value={form.relationshipNote} onChange={(event) => update("relationshipNote", event.target.value)}/>
            </FieldLabel>
            <FieldLabel label="내부 참고사항">
              <input value={form.internalNote} onChange={(event) => update("internalNote", event.target.value)}/>
            </FieldLabel>
          </div>
          <FieldLabel label="메모" className="stackedLabel">
            <textarea rows={3} value={form.memo} onChange={(event) => update("memo", event.target.value)}/>
          </FieldLabel>
        </section>
      </div>
      <div className="buttonRow">
        <button className="primaryButton" onClick={submit}>
          <Plus size={16}/>
          영업 사이트 추가
        </button>
        <button className="secondaryButton" onClick={onCancel}>취소</button>
      </div>
    </section>);
}
function FieldLabel({ label, required = false, className, children, }) {
    return (<label className={`${required ? "requiredField" : ""} ${className ?? ""}`}>
      <span className="labelRow">
        {label}
        <span className={`fieldBadge ${required ? "required" : "optional"}`}>{required ? "필수" : "선택"}</span>
      </span>
      {children}
    </label>);
}
function StatusRuleSettingsPanel({ settings, onChange, }) {
    const fields = [
        ["cautionAfterNoContactDays", "마지막 컨택 후 주의 전환 일수"],
        ["riskAfterNoContactDays", "마지막 컨택 후 위험 전환 일수"],
        ["delayedAfterActionDueDays", "다음 액션 기한 초과 시 지연 전환 일수"],
        ["quoteNoResponseCautionDays", "견적 제출 후 무응답 주의 전환 일수"],
        ["quoteNoResponseRiskDays", "견적 제출 후 무응답 위험 전환 일수"],
        ["technicalReviewCautionDays", "기술 검토 단계 체류 주의 전환 일수"],
        ["technicalReviewRiskDays", "기술 검토 단계 체류 위험 전환 일수"],
        ["negotiationRiskDays", "협상 단계 체류 위험 전환 일수"],
    ];
    return (<section className="panel">
      <div className="panelTitle">
        <Settings2 size={18}/>
        <h2>상태 기준 설정</h2>
      </div>
      <div className="settingsGrid">
        {fields.map(([key, label]) => (<label key={key}>
            {label}
            <input type="number" min={0} value={settings[key]} onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}/>
          </label>))}
      </div>
    </section>);
}
function SalesFilterTabs({ value, onChange }) {
    const filters = [
        ["all", "전체"],
        ["신규 인입", "신규 인입"],
        ["신규 제안", "신규 제안"],
        ["active", "진행 중"],
        ["지연", "지연"],
        ["위험", "위험"],
        ["보류", "보류"],
        ["수주", "수주"],
        ["실패", "실패"],
    ];
    return (<div className="filterTabs" aria-label="영업 현황 필터">
      {filters.map(([key, label]) => (<button className={value === key ? "active" : ""} key={key} onClick={() => onChange(key)}>
          {label}
        </button>))}
    </div>);
}
function DealDetailPanel({ deal, activities, documents, pricingGuides, contacts, customerNote, onClose, onAddActivity, onUpdateActivity, onDeleteActivity, onSaveContact, onDeleteContact, onSetPrimaryContact, onSaveNotes, onUpdateNextAction, onNavigate, }) {
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showNextActionEdit, setShowNextActionEdit] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [feedback, setFeedback] = useState(null);
    const [nextActionDraft, setNextActionDraft] = useState({
        nextAction: deal.nextAction,
        nextActionDueDate: deal.nextActionDueDate,
    });
    useEffect(() => {
        setNextActionDraft({
            nextAction: deal.nextAction,
            nextActionDueDate: deal.nextActionDueDate,
        });
        setFeedback(null);
        setShowNextActionEdit(false);
        setShowActivityForm(false);
        setEditingActivity(null);
    }, [deal.id]);
    const recentActivities = [...activities]
        .filter((activity) => !activity.deletedAt)
        .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
        .slice(0, 8);
    const documentActivities = recentActivities.filter((activity) => ["견적서 발송", "제안서 발송", "공문 발송", "추가 자료 송부"].includes(activity.activityType));
    const primaryDealContact = getPrimaryContact(contacts, deal.customerId, deal.primaryContactId);
    return (<section className="detailPanel">
      <div className="drawerHeader">
        <span className={`salesTypeTag ${typeClass(deal.salesType)}`}>{deal.salesType}</span>
        <button className="iconTextButton" onClick={onClose} aria-label="상세 패널 닫기">
          <X size={16}/>
          닫기
        </button>
      </div>
      <div className="detailHero">
        <h2>{deal.customerName}</h2>
        <p>{deal.title}</p>
        <div className="detailHeroMeta">
          <span>영업 유형: {deal.salesType}</span>
          <span>단계: {deal.salesStage} &gt; {deal.detailStage}</span>
          <span className={`statusTag ${statusClass(deal.computedStatus)}`}>{deal.computedStatus}</span>
          <span>담당자: {deal.owner}</span>
        </div>
        <div className="heroNextAction">
          <strong>다음 액션</strong>
          <span>{deal.nextAction || "미등록"} · {deal.nextActionDueDate || "기한 미등록"}</span>
        </div>
      </div>
      <div className="statusExplanationBox">
        <strong>상태 사유</strong>
        <span>{deal.computedStatusReason || deal.statusReason || "미등록"}</span>
      </div>

      <div className="drawerActionBar">
        <button className="secondaryButton" onClick={() => {
            onNavigate("documents");
            onClose();
        }}>문서 생성</button>
        <button className="secondaryButton" onClick={() => {
            onNavigate("pricing");
            onClose();
        }}>가격 가이드</button>
        <button className="secondaryButton" onClick={() => setShowNextActionEdit((current) => !current)}>다음 액션 수정</button>
      </div>

      {showNextActionEdit && (<div className="inlineEditBox">
          <label>
            다음 액션
            <input value={nextActionDraft.nextAction} onChange={(event) => setNextActionDraft((current) => ({ ...current, nextAction: event.target.value }))}/>
          </label>
          <label>
            다음 액션 기한
            <input type="date" value={nextActionDraft.nextActionDueDate} onChange={(event) => setNextActionDraft((current) => ({ ...current, nextActionDueDate: event.target.value }))}/>
          </label>
          <div className="inlineEditActions">
            <button className="primaryButton compactButton" onClick={() => {
                if (!nextActionDraft.nextAction.trim() || !nextActionDraft.nextActionDueDate) {
                    setFeedback("다음 액션과 기한을 입력해 주세요.");
                    return;
                }
                onUpdateNextAction(deal, nextActionDraft.nextAction.trim(), nextActionDraft.nextActionDueDate);
                setShowNextActionEdit(false);
                setFeedback("다음 액션이 수정되었습니다.");
            }}>
              저장
            </button>
            <button className="secondaryButton compactButton" onClick={() => {
                setNextActionDraft({ nextAction: deal.nextAction, nextActionDueDate: deal.nextActionDueDate });
                setShowNextActionEdit(false);
            }}>
              취소
            </button>
          </div>
        </div>)}

      {feedback && <div className={feedback.includes("입력") ? "formError" : "saveFeedback"}>{feedback}</div>}

      <div className="drawerTabs" role="tablist" aria-label="고객사 상세 탭">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>개요</button>
        <button className={activeTab === "contacts" ? "active" : ""} onClick={() => setActiveTab("contacts")}>고객 담당자</button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>이력</button>
        <button className={activeTab === "documents" ? "active" : ""} onClick={() => setActiveTab("documents")}>문서</button>
        <button className={activeTab === "pricing" ? "active" : ""} onClick={() => setActiveTab("pricing")}>가격</button>
        <button className={activeTab === "memo" ? "active" : ""} onClick={() => setActiveTab("memo")}>메모</button>
      </div>

      {activeTab === "overview" && (<div className="drawerTabPanel">
          <div className="detailGrid compactDetailGrid">
            <DetailItem label="현재 단계" value={`${deal.salesStage} > ${deal.detailStage}`}/>
            <DetailItem label="예상 매출" value={formatCurrency(deal.expectedRevenue)}/>
            <DetailItem label="마지막 컨택일" value={deal.lastContactDate}/>
            <DetailItem label="다음 액션 기한" value={deal.nextActionDueDate || "-"}/>
            <DetailItem label="대표 담당자" value={contactSummary(getPrimaryContact(contacts, deal.customerId, deal.primaryContactId))}/>
            <DetailItem label="제품/모듈" value={deal.productModules.length ? deal.productModules.join(", ") : "미등록"}/>
            <DetailItem label="예상 사용자 수" value={`${formatNumber(deal.expectedUserCount)} User`}/>
            <DetailItem label="메모" value={valueOrMissing(deal.memo)}/>
          </div>
          <section className="drawerSection">
            <h3>고객 기본 정보</h3>
            <div className="detailGrid compactDetailGrid">
              <DetailItem label="산업군" value={valueOrMissing(deal.industry)}/>
              <DetailItem label="유입 경로" value={valueOrMissing(deal.source)}/>
              <DetailItem label="고객 연락처" value={valueOrMissing(primaryDealContact?.phone || deal.customerContactPhone)}/>
              <DetailItem label="고객 이메일" value={valueOrMissing(primaryDealContact?.email || deal.customerContactEmail)}/>
            </div>
          </section>
          <CustomerNotesPanel note={customerNote} editable onSave={onSaveNotes}/>
        </div>)}

      {activeTab === "contacts" && (<div className="drawerTabPanel">
          <ContactManager contacts={contacts} customerId={deal.customerId} onSave={onSaveContact} onDelete={onDeleteContact} onSetPrimary={onSetPrimaryContact}/>
        </div>)}

      {activeTab === "history" && (<div className="drawerTabPanel">
          <div className="panelHeader subsectionHeader">
            <div className="panelTitle">
              <History size={18}/>
              <h2>영업 이력 타임라인</h2>
            </div>
            <button className="primaryButton" onClick={() => {
                setEditingActivity(null);
                setShowActivityForm((current) => !current);
            }}>이력 추가</button>
          </div>
          {showActivityForm && (<ActivityFormPanel deal={deal} defaultOwner={deal.owner} contacts={contacts} onSubmit={(form) => {
                    onAddActivity(deal, form);
                    setShowActivityForm(false);
                    setFeedback(`${deal.customerName} / ${deal.title} 이력이 추가되었습니다.`);
                }}/>)}
          {editingActivity && (<ActivityFormPanel deal={deal} defaultOwner={editingActivity.owner} contacts={contacts} initialActivity={editingActivity} submitLabel="이력 수정" onSubmit={(form) => {
                    onUpdateActivity(deal, form);
                    setEditingActivity(null);
                    setFeedback(`${deal.customerName} / ${deal.title} 이력이 수정되었습니다.`);
                }}/>)}
          <div className="detailTimeline">
            {recentActivities.length === 0 ? (<EmptyState text="등록된 영업 이력이 없습니다."/>) : (recentActivities.map((activity) => (<ActivityTimelineCard activity={activity} contacts={contacts} key={activity.id} onEdit={() => {
                    setShowActivityForm(false);
                    setEditingActivity(activity);
                }} onDelete={() => {
                    if (window.confirm("이 영업 이력을 삭제하시겠습니까?")) {
                        onDeleteActivity(deal, activity.id);
                        setFeedback(`${deal.customerName} / ${deal.title} 이력이 삭제되었습니다.`);
                    }
                }}/>)))}
          </div>
        </div>)}

      {activeTab === "documents" && (<div className="drawerTabPanel">
          <section className="drawerSection">
            <h3>문서 이력</h3>
            {documents.length > 0 && (<div className="documentHistoryList">
                {documents.map((document) => (<article className="documentHistoryCard" key={document.id}>
                    <strong>{document.title}</strong>
                    <span>{document.documentType} · {document.templateName} · {document.createdAt} · {document.createdBy}</span>
                    <span>상태 {document.savedStatus} · 가능 형식 {document.supportedFormats.join(", ")} · 마지막 다운로드 {document.lastDownloadedAt || "없음"}</span>
                    <p>{document.body.slice(0, 140)}...</p>
                  </article>))}
              </div>)}
            <div className="detailTimeline">
              {documentActivities.length === 0 && documents.length === 0 ? (<EmptyState text="등록된 문서 이력이 없습니다."/>) : (documentActivities.map((activity) => (<ActivityTimelineCard activity={activity} contacts={contacts} key={activity.id} onEdit={() => {
                    setActiveTab("history");
                    setEditingActivity(activity);
                }} onDelete={() => {
                    if (window.confirm("이 영업 이력을 삭제하시겠습니까?"))
                        onDeleteActivity(deal, activity.id);
                }}/>)))}
            </div>
          </section>
        </div>)}

      {activeTab === "pricing" && (<div className="drawerTabPanel">
          <div className="detailGrid compactDetailGrid">
            <DetailItem label="요청 할인율" value={deal.requestedDiscountRate !== undefined ? `${deal.requestedDiscountRate}%` : "미등록"}/>
            <DetailItem label="경쟁사 참여" value={deal.competitorInvolved ? "있음" : "없음"}/>
            <DetailItem label="권장 확인" value="가격 가이드에서 Win/Loss 기준 계산"/>
            <DetailItem label="관련 사례" value="가격 가이드 메뉴에서 산업군 기준 표시"/>
          </div>
          <section className="drawerSection">
            <h3>저장된 가격 가이드</h3>
            <div className="documentHistoryList">
              {pricingGuides.length ? pricingGuides.map((item) => (<article className="documentHistoryCard" key={item.id}>
                  <strong>{item.calculatedAt} 가격 전략 결과</strong>
                  <span>요청 {item.requestedDiscountRate}% · 권장 {item.recommendedDiscountRate}% · 마지노선 {item.maxAllowedDiscountRate}% · 수주 확률 {item.winProbability}%</span>
                  <span>마진 {item.expectedMarginRate}% · 위험도 {item.marginRiskLevel} · 계산자 {item.calculatedBy}</span>
                  <p>{item.strategySummary}</p>
                </article>)) : <EmptyState text="저장된 가격 가이드 결과가 없습니다."/>}
            </div>
          </section>
        </div>)}

      {activeTab === "memo" && (<div className="drawerTabPanel">
          <section className="drawerSection">
            <h3>메모</h3>
            <div className="detailItem">
              <span>고객/딜 메모</span>
              <strong>{valueOrMissing(deal.memo)}</strong>
            </div>
            <CustomerNotesPanel note={customerNote} editable onSave={onSaveNotes}/>
          </section>
        </div>)}
    </section>);
}
function ActivityFormPanel({ deal, defaultOwner, contacts = [], initialActivity, submitLabel = "이력 추가", onSubmit, }) {
    const [form, setForm] = useState(initialActivity
        ? {
            id: initialActivity.id,
            activityDate: initialActivity.activityDate,
            activityType: initialActivity.activityType,
            customerContactId: initialActivity.customerContactId ?? "",
            title: initialActivity.title,
            description: initialActivity.description ?? "",
            owner: initialActivity.owner,
            nextAction: initialActivity.nextAction ?? "",
            nextActionDueDate: initialActivity.nextActionDueDate ?? "",
            relatedDocumentName: initialActivity.relatedDocumentName ?? "",
            memo: initialActivity.memo ?? "",
        }
        : { ...emptyActivityForm, owner: defaultOwner });
    const [errors, setErrors] = useState([]);
    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }
    function submit() {
        const missing = getMissingActivityFields(form);
        setErrors(missing);
        if (missing.length)
            return;
        onSubmit(form);
        setForm({ ...emptyActivityForm, owner: defaultOwner });
    }
    return (<div className="activityForm">
      <div className="activityTarget">
        <strong>{initialActivity ? "이력 수정 대상" : "이력 추가 대상"}</strong>
        <span>고객사: {deal.customerName}</span>
        <span>영업 건: {deal.title}</span>
      </div>
      {errors.length > 0 && <div className="formError">필수 항목을 입력해 주세요: {errors.join(", ")}</div>}
      <div className="formGrid denseForm">
        <FieldLabel label="활동일" required>
          <input type="date" value={form.activityDate} onChange={(event) => update("activityDate", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="활동 유형" required>
          <select value={form.activityType} onChange={(event) => update("activityType", event.target.value)}>
            {activityTypes.map((type) => (<option key={type}>{type}</option>))}
          </select>
        </FieldLabel>
        <FieldLabel label="연락 대상">
          <select value={form.customerContactId} onChange={(event) => update("customerContactId", event.target.value)}>
            <option value="">미선택</option>
            {contacts.map((contact) => (<option value={contact.id} key={contact.id}>{contact.name} / {contact.department || "부서 미등록"} / {contact.role}</option>))}
          </select>
        </FieldLabel>
        <FieldLabel label="제목" required>
          <input value={form.title} onChange={(event) => update("title", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="담당자" required>
          <input value={form.owner} onChange={(event) => update("owner", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="다음 액션">
          <input value={form.nextAction} onChange={(event) => update("nextAction", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="다음 액션 기한">
          <input type="date" value={form.nextActionDueDate} onChange={(event) => update("nextActionDueDate", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="관련 문서명">
          <input value={form.relatedDocumentName} onChange={(event) => update("relatedDocumentName", event.target.value)}/>
        </FieldLabel>
        <FieldLabel label="메모">
          <input value={form.memo} onChange={(event) => update("memo", event.target.value)}/>
        </FieldLabel>
      </div>
      <FieldLabel label="상세 내용" className="stackedLabel">
        <textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)}/>
      </FieldLabel>
      <button className="primaryButton fullButton" onClick={submit}>
        <Plus size={16}/>
        {submitLabel}
      </button>
    </div>);
}
function ActivityTimelineCard({ activity, contacts = [], onEdit, onDelete, }) {
    const contact = contacts.find((item) => item.id === activity.customerContactId);
    return (<div className="detailTimelineItem">
      <time>{activity.activityDate}</time>
      <strong>
        <span className={`activityTypeDot ${activityTypeClass(activity.activityType)}`}/>
        {activity.activityType} · {activity.title}
      </strong>
      <span>{activity.description || "상세 내용 없음"}</span>
      <small>
        담당 {activity.owner}
        {contact ? ` · 고객 담당자 ${contact.name} ${contact.position || ""}` : ""}
        {activity.nextAction ? ` · 다음 액션 ${activity.nextAction}` : ""}
        {activity.nextActionDueDate ? ` · 기한 ${activity.nextActionDueDate}` : ""}
        {activity.relatedDocumentName ? ` · 문서 ${activity.relatedDocumentName}` : ""}
        {activity.memo ? ` · 메모 ${activity.memo}` : ""}
        {activity.createdAt ? ` · 등록일 ${activity.createdAt}` : ""}
        {activity.updatedAt ? ` · 수정일 ${activity.updatedAt}` : ""}
      </small>
      <div className="timelineActions">
        <button className="secondaryButton compactButton" onClick={onEdit}>수정</button>
        <button className="secondaryButton compactButton dangerButton" onClick={onDelete}>삭제</button>
      </div>
    </div>);
}
function DetailItem({ label, value }) {
    return (<div className="detailItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>);
}
function TaskPanel({ tasks, selectedTasks, selectedCustomerName, }) {
    return (<section className="panel">
      <div className="panelTitle">
        <ClipboardList size={18}/>
        <h2>다음 액션 목록</h2>
      </div>
      <p className="panelHint">{selectedCustomerName} 관련 액션 {selectedTasks.length}건이 함께 강조됩니다.</p>
      <div className="taskStack">
        {tasks.map((task) => (<div className={`taskItem ${selectedTasks.some((selectedTask) => selectedTask.id === task.id) ? "highlight" : ""}`} key={task.id}>
            <strong>{task.title}</strong>
            <span>{task.customerName} · {task.owner}</span>
            <small>{task.dueDate} · 우선순위 {priorityLabels[task.priority]} · {task.status === "overdue" ? "기한 초과" : "대기"}</small>
          </div>))}
      </div>
    </section>);
}
function RiskPanel({ riskDeals, selectedCustomerId, onOpenDeal, }) {
    return (<section className="panel">
      <div className="panelTitle">
        <AlertTriangle size={18}/>
        <h2>위험/지연 딜</h2>
      </div>
      <div className="riskStack">
        {riskDeals.map((deal) => (<button className={`riskItem ${deal.customerId === selectedCustomerId ? "highlight" : ""}`} key={deal.id} onClick={() => onOpenDeal(deal.id)}>
            <strong>{deal.customerName} {deal.title}</strong>
            <span>{deal.computedStatusReason}</span>
            <small>{deal.salesStage} · {deal.detailStage} · 담당 {deal.owner}</small>
          </button>))}
      </div>
    </section>);
}
function ActivityTimeline({ activities, selectedActivities, selectedCustomerName, }) {
    return (<section className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <History size={18}/>
          <h2>최근 대응 이력</h2>
        </div>
        <span className="statusPill">{selectedCustomerName} 이력 {selectedActivities.length}건</span>
      </div>
      <div className="timeline">
        {activities.map((activity) => (<div className={`timelineItem ${selectedActivities.some((item) => item.id === activity.id) ? "highlight" : ""}`} key={activity.id}>
            <time>{activity.activityDate}</time>
            <strong>{activity.customerName} · {activity.activityType}</strong>
            <span>{activity.title}</span>
            <small>{activity.owner}</small>
          </div>))}
      </div>
    </section>);
}
function PricingView({ customer, deal, customers, input, guide, settings, onCustomerChange, onChange, onSettingsChange, onSaveGuide, }) {
    const [feedback, setFeedback] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showAdvancedPricing, setShowAdvancedPricing] = useState(false);
    const priceStatus = getPriceStatus(input, guide, settings);
    const warnings = getPricingWarnings(input, guide, settings);
    function savePricingCondition() {
        localStorage.setItem("sales-crm-pricing-condition", JSON.stringify({
            customerId: customer.id,
            dealId: deal.id,
            input,
            guide,
            savedAt: formatDate(today),
        }));
        setFeedback("견적 조건이 임시 저장되었습니다.");
    }
    function saveGuide() {
        onSaveGuide({
            id: `pricing-${Date.now()}`,
            customerId: customer.id,
            dealId: deal.id,
            customerName: customerDisplayName(customer),
            dealName: deal.name,
            calculatedAt: formatDate(today),
            calculatedBy: currentUser.name,
            requestedDiscountRate: input.requestedDiscountRate,
            recommendedDiscountRate: guide.recommendedDiscountRate,
            maxAllowedDiscountRate: guide.maxAllowedDiscountRate,
            winProbability: guide.winProbability,
            expectedMarginRate: guide.expectedMarginRate,
            marginRiskLevel: guide.marginRiskLevel,
            strategySummary: buildPricingSummary(input, guide),
            references: guide.similarCases.slice(0, 3).map((item) => `${item.customerName} ${item.result === "win" ? "수주" : "실패"} ${item.discountRate}%`),
        });
        setFeedback("가격 가이드 결과가 저장되었습니다.");
    }
    return (<div className="featureStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>가격 전략 결과</h2>
        </div>
        <div className="titleActions">
          <button className="secondaryButton" type="button" onClick={() => setShowSettings(true)}><Settings2 size={16}/>가격 기준 설정</button>
          <button className="primaryButton" type="button" onClick={saveGuide}>CRM에 가격 가이드 저장</button>
        </div>
      </div>

      <section className="panel pricingContextPanel">
        <div className="contextPillGrid">
          <span>고객사: {customerDisplayName(customer)}</span>
          <span>영업 건: {deal.name}</span>
          <span>산업군: {customer.industry}</span>
          <span>사용자 수: {formatNumber(input.userCount)} User</span>
          <span>제품: {input.productModules.join(", ")}</span>
          <span>현재 단계: {deal.stage}</span>
        </div>
      </section>

      <section className="panel pricingResultPanel">
        <div className="panelTitle"><BadgePercent size={18}/><h2>가격 전략 결과</h2></div>
        <div className="priceDecisionCards">
          <article className="priceDecisionCard metricCard">
            <span>권장 할인율</span>
            <strong>{guide.recommendedDiscountRate}%</strong>
            <small>권장 범위 {Math.max(0, guide.recommendedDiscountRate - 2)}~{guide.recommendedDiscountRate + 2}%</small>
            <p>{customer.industry} 유사 수주 평균과 현재 조건 기준</p>
          </article>
          <article className={`priceDecisionCard metricCard ${input.requestedDiscountRate > guide.maxAllowedDiscountRate ? "danger" : ""}`}>
            <span>마지노선</span>
            <strong>{guide.maxAllowedDiscountRate}%</strong>
            <small>현재 요청 {input.requestedDiscountRate}%</small>
            <p>{input.requestedDiscountRate > guide.maxAllowedDiscountRate ? "마지노선 초과" : "허용 범위 내"}</p>
          </article>
          <article className="priceDecisionCard metricCard">
            <span>예상 수주 확률</span>
            <strong>{guide.winProbability}%</strong>
            <small>위험도 {priceStatus}</small>
            <p>{[input.competitorInvolved && "경쟁사 참여", input.budgetStatus !== "미확인" ? `예산 ${input.budgetStatus}` : "예산 미확인"].filter(Boolean).join(" · ")}</p>
          </article>
          <article className={`priceDecisionCard metricCard ${guide.marginRiskLevel === "위험" ? "danger" : guide.marginRiskLevel === "주의" ? "caution" : ""}`}>
            <span>마진 위험도</span>
            <strong>{guide.marginRiskLevel}</strong>
            <small>예상 마진 {guide.expectedMarginRate}%</small>
            <p>내부 승인 {guide.approvalRequired ? "필요" : "불필요"}</p>
          </article>
        </div>
        <div className={`pricingSummarySentence ${priceStatus === "위험" ? "danger" : priceStatus === "주의" ? "caution" : ""}`}>
          {buildPricingSummary(input, guide)}
        </div>
        <DiscountVisualization input={input} guide={guide}/>
        {warnings.length > 0 && (<div className="pricingWarningBox">
            <strong>위험 경고</strong>
            {warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>)}
      </section>

      <div className="pricingLayout">
        <section className="panel">
          <div className="panelTitle">
            <BriefcaseBusiness size={18}/>
            <h2>견적 조건 입력</h2>
          </div>
          <div className="formGrid">
            <label>
              고객사
              <select value={customer.id} onChange={(event) => onCustomerChange(event.target.value)}>
                {customers.map((item) => (<option value={item.id} key={item.id}>
                  {customerDisplayName(item)}
                  </option>))}
              </select>
            </label>
            <label>
              영업 건
              <select value={deal.id} aria-readonly="true" onChange={() => undefined}>
                <option value={deal.id}>{deal.name}</option>
              </select>
            </label>
            <ReadonlyField label="산업군" value={customer.industry}/>
            <ReadonlyField label="제품/모듈" value={input.productModules.join(", ")}/>
            <ReadonlyField label="예상 매출" value={formatCurrency(input.expectedRevenue)}/>
            <label>
              최초 제안가
              <input type="number" min={0} step={1000000} value={input.initialOfferPrice} onChange={(event) => onChange({ initialOfferPrice: Number(event.target.value) })}/>
            </label>
            <label>
              사용자 수
              <input type="number" min={100} step={100} value={input.userCount} onChange={(event) => onChange({ userCount: Number(event.target.value) })}/>
            </label>
            <label>
              요청 할인율
              <input type="number" min={0} max={45} value={input.requestedDiscountRate} onChange={(event) => onChange({ requestedDiscountRate: Number(event.target.value) })}/>
            </label>
            <label>
              경쟁사 참여 여부
              <select value={input.competitorInvolved ? "yes" : "no"} onChange={(event) => onChange({ competitorInvolved: event.target.value === "yes" })}>
                <option value="yes">있음</option>
                <option value="no">없음</option>
              </select>
            </label>
            <label>
              예산 확보 여부
              <select value={input.budgetStatus} onChange={(event) => onChange({ budgetStatus: event.target.value })}>
                {["확보됨", "일부 확보", "미확인", "미확보"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              구매 예정 시점
              <select value={input.purchaseTiming} onChange={(event) => onChange({ purchaseTiming: event.target.value })}>
                {["이번 달", "이번 분기", "반기 내", "연내", "미정"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="buttonRow pricingPrimaryActions">
            <button className="primaryButton" type="button" onClick={() => setFeedback("가격 전략이 최신 조건으로 계산되었습니다.")}>가격 전략 계산</button>
            <button className="secondaryButton" type="button" onClick={savePricingCondition}>견적 조건 저장</button>
            <button className="secondaryButton" type="button" onClick={() => setShowAdvancedPricing((current) => !current)}>
              {showAdvancedPricing ? "고급 변수 접기" : "고급 변수 보기"}
            </button>
          </div>
          {feedback && <div className="saveFeedback">{feedback}</div>}
        </section>

        <section className={showAdvancedPricing ? "panel" : "panel collapsedPanel"}>
          <div className="panelTitle">
            <Layers3 size={18}/>
            <h2>고급 변수</h2>
          </div>
          {!showAdvancedPricing && <p className="panelHint">경쟁 강도, 구축 난이도, 파트너 마진 같은 세부 조건은 필요할 때만 펼쳐서 조정합니다.</p>}
          {showAdvancedPricing && (<>
          <div className="formGrid">
            <label>
              제품군
              <select value={input.productFamily} onChange={(event) => onChange({ productFamily: event.target.value })}>
                {["OTP", "SSO", "MFA", "인증서", "접근제어", "통합 인증 패키지"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              모듈 수
              <input type="number" min={1} value={input.moduleCount} onChange={(event) => onChange({ moduleCount: Number(event.target.value) })}/>
            </label>
            <label>
              고객 유형
              <select value={input.customerType} onChange={(event) => onChange({ customerType: event.target.value, industry: event.target.value })}>
                {["공공기관", "금융", "제조", "교육", "의료", "IT", "유통", "엔터프라이즈"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              고객 중요도
              <select value={input.customerImportance} onChange={(event) => onChange({ customerImportance: event.target.value })}>
                {["전략 고객", "일반 고객", "레퍼런스 고객", "단기 매출 고객"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              구매 가능성
              <select value={input.purchaseLikelihood} onChange={(event) => onChange({ purchaseLikelihood: event.target.value })}>
                {["높음", "보통", "낮음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              의사결정 단계
              <select value={input.decisionStage} onChange={(event) => onChange({ decisionStage: event.target.value })}>
                {["실무 검토", "팀장 검토", "임원 검토", "구매부서 검토", "최종 승인 대기"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              경쟁사명
              <input value={input.competitorName} onChange={(event) => onChange({ competitorName: event.target.value })}/>
            </label>
            <label>
              경쟁사 가격 수준
              <select value={input.competitorPriceLevel} onChange={(event) => onChange({ competitorPriceLevel: event.target.value })}>
                {["당사보다 낮음", "유사", "당사보다 높음", "미확인"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              경쟁 강도
              <select value={input.competitionIntensity} onChange={(event) => onChange({ competitionIntensity: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              기존 사용 솔루션
              <select value={input.existingSolution} onChange={(event) => onChange({ existingSolution: event.target.value })}>
                {["당사 제품", "경쟁사 제품", "자체 개발", "없음", "미확인"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              서버 이중화 포함 여부
              <select value={input.serverRedundancyIncluded ? "yes" : "no"} onChange={(event) => onChange({ serverRedundancyIncluded: event.target.value === "yes" })}>
                <option value="yes">포함</option>
                <option value="no">미포함</option>
              </select>
            </label>
            <label>
              DR 구성 포함 여부
              <select value={input.drIncluded ? "yes" : "no"} onChange={(event) => onChange({ drIncluded: event.target.value === "yes" })}>
                <option value="yes">포함</option>
                <option value="no">미포함</option>
              </select>
            </label>
            <label>
              커스터마이징 필요 여부
              <select value={input.customizationRequired ? "yes" : "no"} onChange={(event) => onChange({ customizationRequired: event.target.value === "yes" })}>
                <option value="yes">필요</option>
                <option value="no">불필요</option>
              </select>
            </label>
            <label>
              구축 난이도
              <select value={input.implementationDifficulty} onChange={(event) => onChange({ implementationDifficulty: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              기술 검토 리스크
              <select value={input.technicalRisk} onChange={(event) => onChange({ technicalRisk: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              결제 조건
              <select value={input.paymentTerms} onChange={(event) => onChange({ paymentTerms: event.target.value })}>
                {["선불", "분할", "검수 후", "발주 후"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              파트너/총판 참여
              <select value={input.partnerInvolved ? "yes" : "no"} onChange={(event) => onChange({ partnerInvolved: event.target.value === "yes" })}>
                <option value="yes">있음</option>
                <option value="no">없음</option>
              </select>
            </label>
            <label>
              파트너 마진율
              <input type="number" min={0} max={40} value={input.partnerMarginRate} onChange={(event) => onChange({ partnerMarginRate: Number(event.target.value) })}/>
            </label>
            <label>
              내부 마진 하한선
              <input type="number" min={0} max={70} value={input.marginFloorRate} onChange={(event) => onChange({ marginFloorRate: Number(event.target.value) })}/>
            </label>
            <label>
              목표 마진율
              <input type="number" min={0} max={80} value={input.targetMarginRate} onChange={(event) => onChange({ targetMarginRate: Number(event.target.value) })}/>
            </label>
            <label>
              특별 프로모션
              <select value={input.promotionApplied ? "yes" : "no"} onChange={(event) => onChange({ promotionApplied: event.target.value === "yes" })}>
                <option value="yes">적용</option>
                <option value="no">미적용</option>
              </select>
            </label>
            <label>
              프로모션 할인율
              <input type="number" min={0} max={20} value={input.promotionDiscountRate} onChange={(event) => onChange({ promotionDiscountRate: Number(event.target.value) })}/>
            </label>
            <label>
              레퍼런스 확보 가치
              <select value={input.referenceValue} onChange={(event) => onChange({ referenceValue: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              향후 확장 가능성
              <select value={input.expansionPotential} onChange={(event) => onChange({ expansionPotential: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              장기 고객 가능성
              <select value={input.longTermPotential} onChange={(event) => onChange({ longTermPotential: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              매출 목표 기여도
              <select value={input.revenueTargetContribution} onChange={(event) => onChange({ revenueTargetContribution: event.target.value })}>
                {["낮음", "보통", "높음"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              내부 승인 필요 여부
              <select value={input.internalApprovalRequired ? "yes" : "no"} onChange={(event) => onChange({ internalApprovalRequired: event.target.value === "yes" })}>
                <option value="yes">필요</option>
                <option value="no">불필요</option>
              </select>
            </label>
          </div>
          <div className="buttonRow">
            <button className="primaryButton" type="button" onClick={() => setFeedback("가격 전략이 최신 조건으로 계산되었습니다.")}>가격 전략 계산</button>
            <button className="secondaryButton" type="button" onClick={savePricingCondition}>견적 조건 저장</button>
          </div>
          </>)}
        </section>
      </div>

      <section className="panel negotiationPanel">
        <div className="panelTitle">
          <ShieldCheck size={18}/>
          <h2>협상 전략</h2>
        </div>
        <div className="strategyCopyGrid">
          <div><strong>추천 협상 방향</strong><p>{guide.strategySummary}</p></div>
          <div><strong>추가 할인 가능 여부</strong><p>{input.requestedDiscountRate >= guide.maxAllowedDiscountRate ? "추가 할인은 내부 승인 전 권장하지 않습니다." : "마지노선 이내에서 조건부 검토가 가능합니다."}</p></div>
          <div><strong>고객 설득 문구</strong><p>{guide.customerMessage}</p></div>
          <div><strong>내부 승인 문구</strong><p>{guide.internalApprovalMessage}</p></div>
        </div>
        <h3>할인 대신 제안할 대안 조건</h3>
        <div className="defenseGrid">
          {[...guide.defenseLogic, ...guide.alternativeTerms].map((item) => (<div className="defenseItem" key={item}>
              <ChevronRight size={16}/>
              {item}
            </div>))}
        </div>
      </section>
      <PricingReferenceList references={guide.similarCases} input={input}/>
      {showSettings && (<ModalShell label="가격 기준 설정" onClose={() => setShowSettings(false)}>
          <PricingSettingsPanel settings={settings} onSave={(nextSettings) => {
                onSettingsChange(nextSettings);
                setFeedback("가격 기준 설정이 저장되었습니다.");
                setShowSettings(false);
            }} onReset={() => {
                onSettingsChange(defaultPricingGuideSettings);
                localStorage.removeItem(pricingSettingsStorageKey);
                setFeedback("가격 기준 설정을 기본값으로 복원했습니다.");
                setShowSettings(false);
            }}/>
        </ModalShell>)}
    </div>);
}
function PricingReferenceList({ references, input }) {
    const [filter, setFilter] = useState("all");
    const filteredReferences = references.filter((reference) => {
        if (filter === "win")
            return reference.result === "win";
        if (filter === "loss")
            return reference.result === "loss";
        if (filter === "industry")
            return reference.industry === input.industry;
        if (filter === "scale")
            return Math.abs(reference.userCount - input.userCount) <= Math.max(500, input.userCount * 0.35);
        return true;
    });
    return (<section className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <History size={18}/>
          <h2>유사 레퍼런스</h2>
        </div>
        <div className="filterTabs">
          {[
            ["all", "전체"],
            ["win", "수주 사례"],
            ["loss", "실패 사례"],
            ["industry", "동일 산업군"],
            ["scale", "유사 규모"],
        ].map(([key, label]) => (<button className={filter === key ? "active" : ""} key={key} onClick={() => setFilter(key)}>{label}</button>))}
        </div>
      </div>
      <div className="referenceGrid">
        {filteredReferences.map((reference) => (<article className="referenceCard" key={reference.id}>
            <div className="referenceCardHeader">
              <strong>{reference.customerName}</strong>
              <span className={`statusTag ${reference.result === "win" ? "won" : "lost"}`}>{reference.result === "win" ? "수주" : "실패"}</span>
            </div>
            <p>{reference.industry} / {formatNumber(reference.userCount)} User / {reference.productName}</p>
            <div className="referenceMeta">
              <span>계약 {reference.contractPeriod}</span>
              <span>경쟁 {reference.competitorInvolved ? "있음" : "없음"}</span>
              <span>최종 할인 {reference.discountRate}%</span>
              <span>최종 금액 {formatCurrency(reference.finalAmount)}</span>
              <span>유사도 {reference.similarityScore}점</span>
            </div>
            <p className="referencePoint">{reference.referencePoint}</p>
          </article>))}
        {filteredReferences.length === 0 && <EmptyState text="조건에 맞는 레퍼런스가 없습니다."/>}
      </div>
    </section>);
}
function DiscountVisualization({ input, guide }) {
    const max = Math.max(30, guide.maxAllowedDiscountRate + 8, input.requestedDiscountRate + 5);
    const recommendedLeft = Math.min(100, (guide.recommendedDiscountRate / max) * 100);
    const requestedLeft = Math.min(100, (input.requestedDiscountRate / max) * 100);
    const maxAllowedLeft = Math.min(100, (guide.maxAllowedDiscountRate / max) * 100);
    return (<div className="discountBarBox">
      <div className="discountBar">
        <div className="recommendedRange" style={{ left: `${Math.max(0, recommendedLeft - 7)}%`, width: "14%" }}/>
        <div className="dangerRange" style={{ left: `${maxAllowedLeft}%`, width: `${100 - maxAllowedLeft}%` }}/>
        <span className="barMarker recommended" style={{ left: `${recommendedLeft}%` }}>권장 {guide.recommendedDiscountRate}%</span>
        <span className="barMarker requested" style={{ left: `${requestedLeft}%` }}>현재 {input.requestedDiscountRate}%</span>
        <span className="barMarker limit" style={{ left: `${maxAllowedLeft}%` }}>마지노선 {guide.maxAllowedDiscountRate}%</span>
      </div>
      <div className="discountBarLabels"><span>0%</span><span>위험 구간</span><span>{max}%</span></div>
    </div>);
}
function getPriceStatus(input, guide, settings) {
    if (input.requestedDiscountRate > guide.maxAllowedDiscountRate || guide.expectedMarginRate < settings.marginFloorRate)
        return "위험";
    if (input.requestedDiscountRate > guide.recommendedDiscountRate + 2 || guide.marginRiskLevel === "주의")
        return "주의";
    return "정상";
}
function buildPricingSummary(input, guide) {
    if (input.requestedDiscountRate > guide.maxAllowedDiscountRate) {
        return `현재 요청 할인율 ${input.requestedDiscountRate}%는 마지노선 ${guide.maxAllowedDiscountRate}%를 초과했습니다. 내부 승인 없이 추가 할인 제안은 권장하지 않으며, 유지보수 조건 또는 구축 범위 조정으로 협상하는 것이 적절합니다.`;
    }
    if (input.requestedDiscountRate > guide.recommendedDiscountRate + 2) {
        return `현재 요청 할인율 ${input.requestedDiscountRate}%는 권장 범위보다 다소 높지만 마지노선 ${guide.maxAllowedDiscountRate}% 이내입니다. 추가 할인보다는 유지보수 3개월 무상 제공 또는 구축 지원 범위 조정으로 협상하는 것을 권장합니다.`;
    }
    return `현재 할인율은 권장 범위 내이며, 유사 사례 기준 수주 가능성이 높습니다. 가격 인하보다 구매 시점과 기술 검토 조건을 명확히 하는 방향이 좋습니다.`;
}
function getPricingWarnings(input, guide, settings) {
    return [
        input.requestedDiscountRate > guide.maxAllowedDiscountRate ? `요청 할인율이 마지노선을 ${input.requestedDiscountRate - guide.maxAllowedDiscountRate}% 초과했습니다.` : "",
        guide.expectedMarginRate < settings.marginFloorRate ? "예상 마진율이 내부 하한선보다 낮습니다." : "",
        input.competitionIntensity === "높음" && input.budgetStatus === "미확인" ? "경쟁 강도 높음 + 예산 미확인 조건입니다." : "",
        input.competitorPriceLevel === "당사보다 낮음" ? "경쟁사 저가 제안 가능성이 높아 가격 외 조건 방어가 필요합니다." : "",
        input.technicalRisk === "높음" ? "기술 리스크가 높아 구축 범위와 책임 조건을 명확히 해야 합니다." : "",
        input.purchaseTiming === "미정" ? "구매 시점이 미정이므로 과도한 선할인은 피하는 것이 좋습니다." : "",
    ].filter(Boolean);
}
function PricingSettingsPanel({ settings, onSave, onReset, }) {
    const [draft, setDraft] = useState(settings);
    const [activeTab, setActiveTab] = useState("discount");
    const [error, setError] = useState("");
    function update(key, value) {
        setDraft((current) => ({ ...current, [key]: value }));
    }
    function updateNested(group, key, value) {
        setDraft((current) => ({
            ...current,
            [group]: {
                ...current[group],
                [key]: value,
            },
        }));
    }
    function save() {
        const values = [
            draft.baseRecommendedDiscount,
            draft.maxAllowedDiscount,
            draft.marginFloorRate,
            draft.targetMarginRate,
            ...Object.values(draft.industryDiscountWeight),
            ...Object.values(draft.winProbability),
            ...Object.values(draft.referenceWeights),
        ];
        if (values.some((value) => Number.isNaN(value) || value < 0 || value > 100)) {
            setError("0~100 사이의 숫자만 저장할 수 있습니다.");
            return;
        }
        if (draft.baseRecommendedDiscount > draft.maxAllowedDiscount) {
            setError("기본 권장 할인율은 최대 허용 할인율보다 클 수 없습니다.");
            return;
        }
        onSave(draft);
    }
    return (<section className="settingsPanel">
      <div className="detailHero">
        <span className="statusPill">Pricing Rule</span>
        <h2>가격 기준 설정</h2>
        <p>할인율, 마진, 수주 확률, 레퍼런스 매칭에 사용하는 기준값과 가중치를 조정합니다.</p>
      </div>
      <div className="drawerTabs" role="tablist" aria-label="가격 기준 설정 탭">
        <button className={activeTab === "discount" ? "active" : ""} onClick={() => setActiveTab("discount")}>할인율 기준</button>
        <button className={activeTab === "margin" ? "active" : ""} onClick={() => setActiveTab("margin")}>마진 기준</button>
        <button className={activeTab === "probability" ? "active" : ""} onClick={() => setActiveTab("probability")}>수주 확률</button>
        <button className={activeTab === "reference" ? "active" : ""} onClick={() => setActiveTab("reference")}>레퍼런스 매칭</button>
      </div>

      {activeTab === "discount" && (<div className="formGrid">
          <NumberSetting label="기본 권장 할인율" value={draft.baseRecommendedDiscount} onChange={(value) => update("baseRecommendedDiscount", value)}/>
          <NumberSetting label="최대 허용 할인율" value={draft.maxAllowedDiscount} onChange={(value) => update("maxAllowedDiscount", value)}/>
          <NumberSetting label="공공기관 기본 할인 가중치" value={draft.industryDiscountWeight.public} onChange={(value) => updateNested("industryDiscountWeight", "public", value)}/>
          <NumberSetting label="금융권 기본 할인 가중치" value={draft.industryDiscountWeight.finance} onChange={(value) => updateNested("industryDiscountWeight", "finance", value)}/>
          <NumberSetting label="제조업 기본 할인 가중치" value={draft.industryDiscountWeight.manufacturing} onChange={(value) => updateNested("industryDiscountWeight", "manufacturing", value)}/>
          <NumberSetting label="경쟁사 참여 시 추가 할인 가중치" value={draft.competitorDiscountWeight} onChange={(value) => update("competitorDiscountWeight", value)}/>
          <NumberSetting label="전략 고객 할인 허용 가중치" value={draft.strategicCustomerDiscountWeight} onChange={(value) => update("strategicCustomerDiscountWeight", value)}/>
          <NumberSetting label="레퍼런스 고객 할인 허용 가중치" value={draft.referenceCustomerDiscountWeight} onChange={(value) => update("referenceCustomerDiscountWeight", value)}/>
          <NumberSetting label="장기 계약 할인 가중치" value={draft.longTermContractDiscountWeight} onChange={(value) => update("longTermContractDiscountWeight", value)}/>
          <NumberSetting label="파트너 참여 시 마진 보정값" value={draft.partnerMarginAdjustment} onChange={(value) => update("partnerMarginAdjustment", value)}/>
        </div>)}

      {activeTab === "margin" && (<div className="formGrid">
          <NumberSetting label="내부 마진 하한선" value={draft.marginFloorRate} onChange={(value) => update("marginFloorRate", value)}/>
          <NumberSetting label="목표 마진율" value={draft.targetMarginRate} onChange={(value) => update("targetMarginRate", value)}/>
          <NumberSetting label="파트너 마진 기본값" value={draft.defaultPartnerMarginRate} onChange={(value) => update("defaultPartnerMarginRate", value)}/>
          <NumberSetting label="구축비 최소 마진율" value={draft.implementationMarginFloorRate} onChange={(value) => update("implementationMarginFloorRate", value)}/>
          <NumberSetting label="유지보수 마진율" value={draft.maintenanceMarginRate} onChange={(value) => update("maintenanceMarginRate", value)}/>
          <NumberSetting label="내부 승인 필요 마진율" value={draft.approvalRequiredMarginRate} onChange={(value) => update("approvalRequiredMarginRate", value)}/>
        </div>)}

      {activeTab === "probability" && (<div className="formGrid">
          {Object.entries(draft.winProbability).map(([key, value]) => (<NumberSetting key={key} label={probabilitySettingLabels[key] ?? key} value={value} onChange={(nextValue) => updateNested("winProbability", key, nextValue)}/>))}
        </div>)}

      {activeTab === "reference" && (<div className="formGrid">
          {Object.entries(draft.referenceWeights).map(([key, value]) => (<NumberSetting key={key} label={referenceSettingLabels[key] ?? key} value={value} onChange={(nextValue) => updateNested("referenceWeights", key, nextValue)}/>))}
        </div>)}

      {error && <div className="formError">{error}</div>}
      <div className="buttonRow">
        <button className="primaryButton" onClick={save}>저장</button>
        <button className="secondaryButton" onClick={onReset}>기본값 복원</button>
      </div>
    </section>);
}
function NumberSetting({ label, value, onChange }) {
    return (<label>
      {label}
      <input type="number" min={0} max={100} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))}/>
    </label>);
}
const probabilitySettingLabels = {
    baseRate: "기본 수주 확률",
    budgetConfirmedBonus: "예산 확보 시 가산점",
    budgetUnknownPenalty: "예산 미확인 시 감점",
    highCompetitionPenalty: "경쟁 강도 높음 감점",
    finalApprovalBonus: "최종 승인 대기 가산점",
    thisMonthPurchaseBonus: "이번 달 구매 가산점",
    highTechnicalRiskPenalty: "기술 리스크 높음 감점",
    recommendedDiscountRangeBonus: "권장 범위 할인 가산점",
    overMaxDiscountPenalty: "최대 허용 초과 감점",
};
const referenceSettingLabels = {
    industryMatch: "산업군 일치 가중치",
    userCountSimilarity: "사용자 수 유사도 가중치",
    productMatch: "제품군 일치 가중치",
    competitorMatch: "경쟁사 참여 일치 가중치",
    contractPeriodSimilarity: "계약 기간 유사도 가중치",
    discountSimilarity: "할인율 유사도 가중치",
    resultWeight: "수주/실패 결과 가중치",
    implementationDifficultyMatch: "구축 난이도 일치 가중치",
};
function SectionTitle({ eyebrow, title }) {
    return (<div className="sectionTitle">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>);
}
function MetricCard({ label, value, icon, description }) {
    return (<div className="metricCard">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      {description && <small>{description}</small>}
    </div>);
}
function InsightBlock({ title, items }) {
    return (<div className="insightBlock">
      <strong>{title}</strong>
      {items.map((item) => (<span key={item}>{item}</span>))}
    </div>);
}
function CaseList({ title, cases, table = false }) {
    return (<section className={table ? "panel" : "caseSection"}>
      <div className="panelTitle">
        <BriefcaseBusiness size={18}/>
        <h2>{title}</h2>
      </div>
      {table ? (<div className="caseTable">
          <div className="caseHead">
            <span>고객</span>
            <span>산업군</span>
            <span>User</span>
            <span>할인</span>
            <span>결과</span>
            <span>사유</span>
          </div>
          {cases.map((item) => (<div className="caseRow" key={item.id}>
              <span>{item.customerName}</span>
              <span>{item.industry}</span>
              <span>{formatNumber(item.userCount)}</span>
              <span>{item.discountRate}%</span>
              <span className={`resultTag ${item.result}`}>{item.result === "win" ? "Win" : "Loss"}</span>
              <span>{item.reason}</span>
            </div>))}
        </div>) : (<div className="itemStack">
          {cases.map((item) => (<div className="evidenceItem" key={item.id}>
              <strong>
                {item.customerName} · {item.result === "win" ? "수주" : "실패"} · 할인 {item.discountRate}%
              </strong>
              <span>{item.notes}</span>
            </div>))}
        </div>)}
    </section>);
}
function DraftPreview({ draft }) {
    if (draft.documentType === "공문")
        return <OfficialLetterPreview draft={draft}/>;
    if (draft.documentType === "메일")
        return <EmailDraftPreview draft={draft}/>;
    if (draft.documentType === "견적서")
        return <QuoteDraftPreview draft={draft}/>;
    if (draft.documentType === "제안서")
        return <ProposalDraftPreview draft={draft}/>;
    return (<article className="draftPaper">
      <h3>{draft.title}</h3>
      <div className="draftMeta">
        <span>{draft.documentType}</span>
        <span>{draft.templateName}</span>
        <span>{draft.audience}</span>
        <span>{draft.includesPricingGuide ? "가격 가이드 포함" : "가격 가이드 미포함"}</span>
      </div>
      {draft.sections.map((section) => (<DraftSection key={section.label} label={section.label} value={section.value}/>))}
    </article>);
}
function EmailDraftPreview({ draft }) {
    const pick = (label) => draft.sections.find((section) => section.label === label)?.value || "";
    return (<article className="draftPaper emailPreview">
      <div className="draftMeta">
        <span>{draft.documentType}</span>
        <span>{draft.templateName}</span>
        <span>{draft.audience}</span>
      </div>
      <h3>{pick("메일 제목") || draft.title}</h3>
      <div className="emailPreviewHeader">
        <p><strong>To</strong><span>{pick("받는 사람") || pick("인사말")}</span></p>
        <p><strong>Cc</strong><span>{pick("참조") || "미등록"}</span></p>
        <p><strong>Subject</strong><span>{pick("메일 제목") || draft.title}</span></p>
      </div>
      <div className="emailPreviewBody">
        {(pick("본문") || draft.body).split("\n").map((line, index) => <p key={`${line}-${index}`}>{line || "\u00A0"}</p>)}
      </div>
    </article>);
}
function QuoteDraftPreview({ draft }) {
    const pick = (label) => draft.sections.find((section) => section.label === label)?.value || "";
    return (<article className="draftPaper quotePreview">
      <div className="draftMeta">
        <span>{draft.documentType}</span>
        <span>{draft.templateName}</span>
        <span>{draft.audience}</span>
      </div>
      <h3>{pick("견적 제목") || draft.title}</h3>
      <div className="quotePreviewInfo">
        <span>견적 번호: {pick("견적 번호") || "미등록"}</span>
        <span>견적일: {pick("견적일") || draft.createdAt}</span>
        <span>고객사: {pick("고객 정보")}</span>
        <span>유효기간: {pick("견적 유효기간")}</span>
      </div>
      <div className="quotePreviewTable">
        <div className="quotePreviewHead"><span>No</span><span>품목</span><span>수량</span><span>단가</span><span>공급가</span><span>할인율</span><span>금액</span><span>비고</span></div>
        <div className="quotePreviewRow"><span>1</span><span>{pick("제품/라이선스 구성")}</span><span>{pick("수량")}</span><span>{pick("단가")}</span><span>{pick("공급가")}</span><span>{pick("할인율")}</span><span>{pick("최종 금액")}</span><span>{pick("비고")}</span></div>
      </div>
      <div className="quotePreviewTotals">
        <strong>최종 제안 금액 {pick("최종 금액")}</strong>
        <span>할인 금액 {pick("할인 금액")} · 유지보수 {pick("유지보수 조건")} · 결제 조건 {pick("결제 조건")}</span>
      </div>
    </article>);
}
function ProposalDraftPreview({ draft }) {
    return (<article className="draftPaper proposalPreview">
      <div className="draftMeta">
        <span>{draft.documentType}</span>
        <span>{draft.templateName}</span>
        <span>{draft.audience}</span>
      </div>
      <section className="proposalCover">
        <strong>{draft.sections.find((section) => section.label === "표지")?.value || draft.title}</strong>
        <span>{draft.createdAt} · KICA Sales CRM</span>
      </section>
      <div className="proposalToc">
        {draft.sections.map((section, index) => <span key={section.label}>{index + 1}. {section.label}</span>)}
      </div>
      {draft.sections.map((section) => <DraftSection key={section.label} label={section.label} value={section.value}/>)}
    </article>);
}
function OfficialLetterPreview({ draft }) {
    const sectionValue = (labels) => draft.sections.find((section) => labels.includes(section.label))?.value || "";
    const officialBodyText = sectionValue(["본문", "蹂몃Ц"]) || draft.body;
    const officialBodyLines = officialBodyText.split("\n");
    const officialMetaLines = officialBodyLines.filter((line) => ["문서번호", "시행일자", "수    신", "참    조", "제    목"].some((label) => line.startsWith(label)));
    const officialFooterLine = officialBodyLines.find((line) => line.includes("대표이사")) || "CRM 주식회사 대표이사";
    const officialContentLines = officialBodyLines.filter((line) => !line.startsWith("(http") &&
        !line.startsWith("(12345)") &&
        !line.startsWith("담당자") &&
        !officialMetaLines.includes(line) &&
        !line.includes("대표이사") &&
        line.trim());
    return (<article className="officialLetterPaper">
      <div className="officialTop">
        <div className="officialLogo" aria-label="KICA CRM 로고">
          <strong>KICA</strong>
          <span>CRM</span>
        </div>
        <div className="officialUrl">(http://www.sales_crm.co.kr)</div>
      </div>
      <div className="officialInfo">
        <p>{sectionValue(["주소", "二쇱냼"]) || "(12345) 경기도 성남시 수정구 금토로 123, 1층"}</p>
        <p>담당자&nbsp;&nbsp;{sectionValue(["담당자", "?대떦??"]) || "OO사업팀 홍길동 과장 / 010-1234-5678 / salescrm@google.com"}</p>
      </div>
      <div className="officialMeta">
        {officialMetaLines.map((line) => (<p key={line}>{line}</p>))}
      </div>
      <div className="officialBody">
        {officialContentLines.map((line) => {
            if (line.includes("아 래"))
                return <strong className="officialCenter" key={line}>{line}</strong>;
            if (/^[가-라]\./.test(line.trim()))
                return <p className="officialBelowItem" key={line}>{line}</p>;
            return <p key={line}>{line}</p>;
        })}
      </div>
      <div className="officialFooter">
        <strong>{officialFooterLine}</strong>
      </div>
      <div className="officialFooterLogo" aria-label="KICA CRM 로고">
        <strong>KICA</strong>
        <span>CRM</span>
      </div>
    </article>);
}
function DraftSection({ label, value }) {
    return (<div className="draftSection">
      <strong>{label}</strong>
      <p>{value}</p>
    </div>);
}
function EmptyState({ text }) {
    return (<div className="emptyState">
      <FileText size={28}/>
      <p>{text}</p>
    </div>);
}
function matchesSalesFilter(deal, filter) {
    if (filter === "all")
        return true;
    if (filter === "신규 인입" || filter === "신규 제안")
        return deal.salesType === filter || deal.detailStage === filter;
    if (filter === "active")
        return !["수주", "실패", "보류"].includes(deal.computedStatus);
    return deal.computedStatus === filter;
}
function typeClass(type) {
    return {
        "신규 인입": "inbound",
        "신규 제안": "new_proposal",
        "기존 고객 확장": "existing_expansion",
        "갱신 대응": "renewal",
        재결제: "renewal",
        "라이선스 연장": "renewal",
        "라이선스 증설": "existing_expansion",
        "유지보수 갱신": "renewal",
        "고도화 영업": "existing_expansion",
    }[type];
}
function statusClass(status) {
    return {
        정상: "normal",
        주의: "caution",
        지연: "delayed",
        위험: "risk",
        보류: "hold",
        수주: "won",
        실패: "lost",
    }[status];
}
function existingCustomerStatusClass(status) {
    return {
        정상: "normal",
        "갱신 예정": "caution",
        "만료 임박": "delayed",
        "증설 기회": "won",
        "고도화 제안 필요": "caution",
        "이탈 위험": "risk",
        보류: "hold",
    }[status];
}
function createExistingCustomerFromWonDeal(deal, activity) {
    const startDate = activity.activityDate;
    const endDate = addOneYear(startDate);
    return {
        id: `ec-${deal.id}`,
        customerId: deal.customerId,
        customerName: deal.customerName,
        industry: deal.industry,
        owner: deal.owner,
        status: "정상",
        statusReason: "수주 이력이 등록되어 기존 고객 관리 대상으로 전환되었습니다.",
        installedProducts: deal.productModules,
        licenseCount: deal.expectedUserCount,
        usageRate: 35,
        contractStartDate: startDate,
        contractEndDate: endDate,
        maintenanceEndDate: endDate,
        contractAmount: deal.expectedRevenue,
        maintenanceAmount: Math.round(deal.expectedRevenue * 0.15),
        paymentCycle: "연간",
        nextAction: "온보딩 및 정기 점검 일정 안내",
        nextActionDueDate: addDays(startDate, 14),
        contractNo: `AUTO-${deal.id}`,
        renewalTerms: "최초 계약 기준 1년 유지보수 포함",
        contractDocumentName: activity.relatedDocumentName,
        memo: "영업 현황에서 수주 처리되어 자동 전환된 고객입니다.",
    };
}
function addOneYear(dateText) {
    const date = new Date(dateText);
    date.setFullYear(date.getFullYear() + 1);
    date.setDate(date.getDate() - 1);
    return formatDate(date);
}
function addDays(dateText, days) {
    const date = new Date(dateText);
    date.setDate(date.getDate() + days);
    return formatDate(date);
}
function activityTypeClass(type) {
    if (["수주", "계약 완료", "발주 완료"].includes(type))
        return "win";
    if (["실패", "보류"].includes(type))
        return "closed";
    if (["견적서 발송", "제안서 발송", "공문 발송"].includes(type))
        return "document";
    if (["전화", "이메일", "미팅"].includes(type))
        return "contact";
    if (["기술 검토", "보안 검토", "내부 검토", "계약 협의"].includes(type))
        return "review";
    return "default";
}
function getMissingSalesFields(form) {
    const checks = [
        ["salesType", "영업 유형"],
        ["customerName", "고객사명"],
        ["title", "영업 건명"],
        ["industry", "산업군"],
        ["salesStage", "상위 영업 단계"],
        ["detailStage", "상세 상태"],
        ["owner", "담당자"],
        ["firstContactDate", "최초 접촉일"],
        ["lastContactDate", "마지막 컨택일"],
        ["nextAction", "다음 액션"],
        ["nextActionDueDate", "다음 액션 기한"],
        ["expectedRevenue", "예상 매출"],
    ];
    return checks.filter(([key]) => !String(form[key] ?? "").trim()).map(([, label]) => label);
}
function getMissingActivityFields(form) {
    const checks = [
        ["activityDate", "활동일"],
        ["activityType", "활동 유형"],
        ["title", "제목"],
        ["owner", "담당자"],
    ];
    return checks.filter(([key]) => !String(form[key] ?? "").trim()).map(([, label]) => label);
}
function valueOrMissing(value) {
    if (value === undefined || value === null)
        return "미등록";
    const text = String(value).trim();
    return text.length ? text : "미등록";
}
function addTaskFromDeal(tasks, deal) {
    if (!deal.nextAction || !deal.nextActionDueDate)
        return tasks;
    return [
        {
            id: `task-${deal.id}`,
            dealId: deal.id,
            customerName: deal.customerName,
            title: deal.nextAction,
            dueDate: deal.nextActionDueDate,
            priority: "medium",
            owner: deal.owner,
            status: "todo",
        },
        ...tasks,
    ];
}
function formatDate(date) {
    return date.toISOString().slice(0, 10);
}
export default App;
