export type Customer = {
  id: string;
  name: string;
  baseName: string;
  displayName: string;
  department?: string;
  projectName?: string;
  industry: string;
  companySize: string;
  healthScore: number;
  environment: string[];
  installedModules: string[];
  recentIssues?: string[];
};

export type Deal = {
  id: string;
  customerId: string;
  name: string;
  stage: string;
  userCount: number;
  expectedRevenue: number;
  competitorInvolved: boolean;
  requestedDiscountRate: number;
};

export type License = {
  id: string;
  customerId: string;
  productName: string;
  licenseCount: number;
  usageRate: number;
  startDate: string;
  endDate: string;
  maintenanceEndDate?: string;
};

export type WinLossCase = {
  id: string;
  customerName: string;
  industry: string;
  userCount: number;
  productName: string;
  competitorInvolved: boolean;
  discountRate: number;
  result: "win" | "loss";
  reason: string;
  notes: string;
};

export type SalesStage =
  | "신규 OI 발굴"
  | "요구사항 확인"
  | "제안/견적"
  | "검토/협상"
  | "계약 진행"
  | "계약 완료(수주)"
  | "종료";

export type SalesDetailStage =
  | "신규 인입"
  | "신규 제안"
  | "기존 고객 확장"
  | "파트너 소개"
  | "재접촉 대상"
  | "타깃 고객 발굴"
  | "요구사항 확인"
  | "고객 담당자 확인"
  | "의사결정자 확인"
  | "예산 확인"
  | "도입 범위 확인"
  | "기술 환경 확인"
  | "일정 확인"
  | "제안서 준비"
  | "제안 완료"
  | "견적 준비"
  | "견적 발송"
  | "추가 자료 송부"
  | "공문 송부"
  | "기술 검토"
  | "보안 검토"
  | "가격 협상"
  | "경쟁사 비교"
  | "내부 승인 대기"
  | "조건 조율"
  | "계약 조건 확인"
  | "계약서 검토"
  | "발주 대기"
  | "구축 일정 협의"
  | "세금계산/발주 처리"
  | "구매 프로세스 진행"
  | "수주"
  | "계약 완료"
  | "발주 완료"
  | "구축 착수 대기"
  | "납품/라이선스 발급 대기"
  | "실패"
  | "보류"
  | "장기 미응답"
  | "예산 취소"
  | "경쟁사 수주"
  | "고객사 내부 중단";

export type SalesActivityType =
  | "신규 인입"
  | "신규 제안"
  | "전화"
  | "이메일"
  | "미팅"
  | "견적서 발송"
  | "제안서 발송"
  | "기술 검토"
  | "보안 검토"
  | "추가 자료 송부"
  | "공문 발송"
  | "내부 검토"
  | "계약 협의"
  | "계약 완료"
  | "발주 완료"
  | "보류"
  | "수주"
  | "실패"
  | "기타";

export type SalesStatus = "정상" | "주의" | "지연" | "위험" | "보류" | "수주" | "실패";

export type CustomerContact = {
  id: string;
  customerId: string;
  name: string;
  department?: string;
  position?: string;
  role:
    | "실무 담당자"
    | "기술 담당자"
    | "구매 담당자"
    | "의사결정자"
    | "최종 승인권자"
    | "파트너 담당자"
    | "기타";
  phone?: string;
  email?: string;
  preferredContactMethod?: "전화" | "이메일" | "문자" | "메신저" | "방문 미팅" | "미확인";
  influenceLevel?: "낮음" | "보통" | "높음" | "핵심";
  isPrimary: boolean;
  note?: string;
};

export type CustomerNotes = {
  customerId: string;
  customerNote?: string;
  salesNote?: string;
  technicalNote?: string;
  contractNote?: string;
  relationshipNote?: string;
  internalNote?: string;
};

export type SalesDeal = {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  salesType:
    | "신규 인입"
    | "신규 제안"
    | "기존 고객 확장"
    | "갱신 대응"
    | "재결제"
    | "라이선스 연장"
    | "라이선스 증설"
    | "유지보수 갱신"
    | "고도화 영업";
  salesStage: SalesStage;
  detailStage: SalesDetailStage;
  industry: string;
  expectedRevenue: number;
  owner: string;
  firstContactDate: string;
  lastContactDate: string;
  lastUpdatedAt: string;
  nextAction: string;
  nextActionDueDate: string;
  status: SalesStatus;
  statusReason: string;
  source: string;
  productModules: string[];
  expectedUserCount: number;
  competitorInvolved: boolean;
  requestedDiscountRate?: number;
  customerContactName?: string;
  customerContactPhone?: string;
  customerContactEmail?: string;
  primaryContactId?: string;
  memo?: string;
  expectedCloseDate?: string;
};

export type SalesTask = {
  id: string;
  dealId: string;
  customerName: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  owner: string;
  status: "todo" | "done" | "overdue";
};

export type SalesActivity = {
  id: string;
  dealId: string;
  customerId: string;
  customerName: string;
  activityDate: string;
  activityType: SalesActivityType;
  title: string;
  description?: string;
  owner: string;
  nextAction?: string;
  nextActionDueDate?: string;
  relatedDocumentName?: string;
  customerContactId?: string;
  memo?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
};

export type SalesStatusRuleSettings = {
  cautionAfterNoContactDays: number;
  riskAfterNoContactDays: number;
  delayedAfterActionDueDays: number;
  quoteNoResponseCautionDays: number;
  quoteNoResponseRiskDays: number;
  technicalReviewCautionDays: number;
  technicalReviewRiskDays: number;
  negotiationRiskDays: number;
};

export type SalesTarget = {
  year: number;
  annualRevenueTarget: number;
  monthlyRevenueTarget: number;
};

export type ExistingCustomerStatus =
  | "정상"
  | "갱신 예정"
  | "만료 임박"
  | "증설 기회"
  | "고도화 제안 필요"
  | "이탈 위험"
  | "보류";

export type ExistingCustomer = {
  id: string;
  customerId: string;
  customerName: string;
  industry: string;
  owner: string;
  status: ExistingCustomerStatus;
  statusReason: string;
  installedProducts: string[];
  licenseCount: number;
  usageRate: number;
  contractStartDate: string;
  contractEndDate: string;
  maintenanceEndDate: string;
  contractAmount: number;
  maintenanceAmount: number;
  paymentCycle: "월간" | "분기" | "연간" | "일시납";
  nextAction: string;
  nextActionDueDate: string;
  memo?: string;
  contractNo?: string;
  renewalTerms?: string;
  contractDocumentName?: string;
  primaryContactId?: string;
};

export type CustomerOpportunity = {
  id: string;
  existingCustomerId: string;
  customerId: string;
  customerName: string;
  opportunityType:
    | "재결제"
    | "라이선스 연장"
    | "라이선스 증설"
    | "유지보수 갱신"
    | "고도화 영업"
    | "추가 모듈 제안"
    | "기타";
  title: string;
  expectedRevenue: number;
  expectedDate: string;
  status: "대기" | "진행 중" | "제안 완료" | "협상" | "완료" | "보류";
  owner: string;
  nextAction: string;
  nextActionDueDate: string;
  activeInSalesPipeline: boolean;
  productModules?: string[];
  expectedUserCount?: number;
  memo?: string;
};

export type CrmDataset = {
  salesTarget: SalesTarget;
  customers: Customer[];
  deals: Deal[];
  licenses: License[];
  winLossCases: WinLossCase[];
  salesDeals: SalesDeal[];
  salesTasks: SalesTask[];
  salesActivities: SalesActivity[];
  existingCustomers: ExistingCustomer[];
  customerOpportunities: CustomerOpportunity[];
  customerContacts: CustomerContact[];
  customerNotes: CustomerNotes[];
};
