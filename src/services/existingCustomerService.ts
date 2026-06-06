import type { CustomerOpportunity, ExistingCustomer, ExistingCustomerStatus, SalesActivity, SalesDeal } from "../types";
import { today } from "./format";

export type ExistingCustomerSummary = {
  totalCustomers: number;
  renewalThisYearCount: number;
  expiresIn90DaysCount: number;
  expansionOpportunityCount: number;
  riskCustomerCount: number;
  expectedAdditionalRevenue: number;
};

export function calculateExistingCustomerStatus(customer: ExistingCustomer, activities: SalesActivity[], baseDate: Date = today): ExistingCustomerStatus {
  if (customer.status === "보류") return "보류";
  const daysToContractEnd = daysBetween(baseDate, customer.contractEndDate);
  const daysToMaintenanceEnd = daysBetween(baseDate, customer.maintenanceEndDate);
  const daysToNearestEnd = Math.min(daysToContractEnd, daysToMaintenanceEnd);
  const hasRecentIssue = activities.some((activity) =>
    activity.customerId === customer.customerId && /불만|장애|이슈|지연|실패/.test(`${activity.title} ${activity.description ?? ""}`),
  );
  const daysSinceLastContact = getDaysSinceLastActivity(customer.customerId, activities, baseDate);

  if ((daysToNearestEnd <= 60 && (!customer.nextAction || daysSinceLastContact > 30)) || hasRecentIssue) return "이탈 위험";
  if (daysToNearestEnd <= 90) return "만료 임박";
  if (customer.usageRate >= 80) return "증설 기회";
  if (!customer.installedProducts.some((item) => ["SSO", "MFA", "DR", "서버 이중화"].some((keyword) => item.includes(keyword)))) return "고도화 제안 필요";
  if (daysToNearestEnd <= 180) return "갱신 예정";
  return "정상";
}

export function getExistingCustomerStatusReason(customer: ExistingCustomer, activities: SalesActivity[], baseDate: Date = today): string {
  const status = calculateExistingCustomerStatus(customer, activities, baseDate);
  const daysToContractEnd = daysBetween(baseDate, customer.contractEndDate);
  const daysToMaintenanceEnd = daysBetween(baseDate, customer.maintenanceEndDate);
  const daysToNearestEnd = Math.min(daysToContractEnd, daysToMaintenanceEnd);
  if (status === "이탈 위험") return "만료가 임박했거나 최근 불만/장애 이력이 있어 우선 관리가 필요합니다.";
  if (status === "만료 임박") return `계약 또는 유지보수 종료까지 ${daysToNearestEnd}일 남았습니다.`;
  if (status === "증설 기회") return `라이선스 사용률이 ${customer.usageRate}%로 증설 제안 대상입니다.`;
  if (status === "고도화 제안 필요") return "SSO, MFA, DR 등 추가 모듈 고도화 제안 여지가 있습니다.";
  if (status === "갱신 예정") return `계약 또는 유지보수 종료가 180일 이내입니다.`;
  if (status === "보류") return customer.statusReason || "고객 또는 내부 사유로 관리가 보류되었습니다.";
  return "계약 종료까지 여유가 있고 사용률 및 이슈가 안정적입니다.";
}

export function getExistingCustomerSummary(customers: ExistingCustomer[], opportunities: CustomerOpportunity[], activities: SalesActivity[], baseDate: Date = today): ExistingCustomerSummary {
  const customersWithStatus = customers.map((customer) => ({
    ...customer,
    computedStatus: calculateExistingCustomerStatus(customer, activities, baseDate),
  }));
  return {
    totalCustomers: customers.length,
    renewalThisYearCount: customers.filter((customer) => new Date(customer.contractEndDate).getFullYear() === baseDate.getFullYear()).length,
    expiresIn90DaysCount: customers.filter((customer) => Math.min(daysBetween(baseDate, customer.contractEndDate), daysBetween(baseDate, customer.maintenanceEndDate)) <= 90).length,
    expansionOpportunityCount: opportunities.filter((opportunity) => !["완료", "보류"].includes(opportunity.status)).length,
    riskCustomerCount: customersWithStatus.filter((customer) => customer.computedStatus === "이탈 위험" || customer.computedStatus === "만료 임박").length,
    expectedAdditionalRevenue: opportunities
      .filter((opportunity) => opportunity.activeInSalesPipeline && !["완료", "보류"].includes(opportunity.status))
      .reduce((sum, opportunity) => sum + opportunity.expectedRevenue, 0),
  };
}

export function opportunityToSalesDeal(opportunity: CustomerOpportunity, customer: ExistingCustomer): SalesDeal {
  const salesType = opportunity.opportunityType === "추가 모듈 제안" || opportunity.opportunityType === "기타"
    ? "기존 고객 확장"
    : opportunity.opportunityType;
  return {
    id: `opp-${opportunity.id}`,
    customerId: opportunity.customerId,
    customerName: opportunity.customerName,
    title: opportunity.title,
    salesType,
    salesStage: stageFromOpportunityStatus(opportunity.status),
    detailStage: opportunity.status === "협상" ? "가격 협상" : opportunity.status === "제안 완료" ? "제안 완료" : "기존 고객 확장",
    industry: customer.industry,
    expectedRevenue: opportunity.expectedRevenue,
    owner: opportunity.owner,
    firstContactDate: opportunity.expectedDate,
    lastContactDate: opportunity.expectedDate,
    lastUpdatedAt: opportunity.expectedDate,
    nextAction: opportunity.nextAction,
    nextActionDueDate: opportunity.nextActionDueDate,
    status: opportunity.status === "완료" ? "수주" : opportunity.status === "보류" ? "보류" : "정상",
    statusReason: "기존 고객 관리에서 생성된 추가 영업 기회입니다.",
    source: "기존 고객 관리",
    productModules: opportunity.productModules?.length ? opportunity.productModules : customer.installedProducts,
    expectedUserCount: opportunity.expectedUserCount ?? customer.licenseCount,
    competitorInvolved: false,
    memo: opportunity.memo,
  };
}

function stageFromOpportunityStatus(status: CustomerOpportunity["status"]): SalesDeal["salesStage"] {
  if (status === "제안 완료") return "제안/견적";
  if (status === "협상") return "검토/협상";
  if (status === "완료") return "계약 완료(수주)";
  if (status === "보류") return "종료";
  return "신규 OI 발굴";
}

function getDaysSinceLastActivity(customerId: string, activities: SalesActivity[], baseDate: Date) {
  const latest = activities
    .filter((activity) => activity.customerId === customerId && !activity.deletedAt)
    .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())[0];
  if (!latest) return 999;
  return Math.floor((baseDate.getTime() - new Date(latest.activityDate).getTime()) / 86400000);
}

function daysBetween(baseDate: Date, targetDate: string) {
  return Math.ceil((new Date(targetDate).getTime() - baseDate.getTime()) / 86400000);
}
