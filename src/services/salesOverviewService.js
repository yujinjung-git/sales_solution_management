import { today } from "./format";
export const defaultSalesStatusSettings = {
    cautionAfterNoContactDays: 14,
    riskAfterNoContactDays: 30,
    delayedAfterActionDueDays: 1,
    quoteNoResponseCautionDays: 7,
    quoteNoResponseRiskDays: 14,
    technicalReviewCautionDays: 7,
    technicalReviewRiskDays: 14,
    negotiationRiskDays: 21,
};
export const pipelineStages = [
    "신규 OI 발굴",
    "요구사항 확인",
    "제안/견적",
    "검토/협상",
    "계약 진행",
    "계약 완료(수주)",
    "종료",
];
export const detailStagesBySalesStage = {
    "신규 OI 발굴": ["신규 인입", "신규 제안", "기존 고객 확장", "파트너 소개", "재접촉 대상", "타깃 고객 발굴"],
    "요구사항 확인": ["요구사항 확인", "고객 담당자 확인", "의사결정자 확인", "예산 확인", "도입 범위 확인", "기술 환경 확인", "일정 확인"],
    "제안/견적": ["제안서 준비", "제안 완료", "견적 준비", "견적 발송", "추가 자료 송부", "공문 송부"],
    "검토/협상": ["기술 검토", "보안 검토", "가격 협상", "경쟁사 비교", "내부 승인 대기", "조건 조율"],
    "계약 진행": ["계약 조건 확인", "계약서 검토", "발주 대기", "구축 일정 협의", "세금계산/발주 처리", "구매 프로세스 진행"],
    "계약 완료(수주)": ["수주", "계약 완료", "발주 완료", "구축 착수 대기", "납품/라이선스 발급 대기"],
    종료: ["실패", "보류", "장기 미응답", "예산 취소", "경쟁사 수주", "고객사 내부 중단"],
};
const closedStatuses = new Set(["수주", "실패"]);
const contactActivityTypes = new Set([
    "신규 인입",
    "신규 제안",
    "전화",
    "이메일",
    "미팅",
    "견적서 발송",
    "제안서 발송",
    "추가 자료 송부",
    "공문 발송",
    "계약 협의",
]);
export function getSalesOverview(deals, tasks, activities, settings = defaultSalesStatusSettings) {
    const dealsWithStatus = deals.map((deal) => ({
        ...deal,
        computedStatus: calculateDealStatus(deal, activities, tasks, settings, today),
        computedStatusReason: getDealStatusReason(deal, activities, tasks, settings, today),
    }));
    const riskDeals = getRiskDeals(dealsWithStatus);
    return {
        activeDealCount: dealsWithStatus.filter((deal) => !closedStatuses.has(deal.computedStatus)).length,
        expectedRevenue: dealsWithStatus
            .filter((deal) => !closedStatuses.has(deal.computedStatus))
            .reduce((sum, deal) => sum + deal.expectedRevenue, 0),
        weeklyTaskCount: getUpcomingTasks(tasks, today).length,
        riskDealCount: riskDeals.length,
        pipeline: getPipelineSummary(dealsWithStatus),
        riskDeals,
        upcomingTasks: getUpcomingTasks(tasks, today),
        recentActivities: getRecentActivities(activities),
        dealsWithStatus,
    };
}
export function getSalesPeriodSummary(deals, tasks, target, period, baseDate = today) {
    const scopedDeals = deals.filter((deal) => isDealInPeriod(deal, period, baseDate));
    const qualifiedExpectedDeals = scopedDeals.filter((deal) => !isExcludedFromExpectedRevenue(deal));
    const wonDeals = scopedDeals.filter((deal) => isWonDeal(deal));
    const activeDeals = scopedDeals.filter((deal) => isActiveDeal(deal));
    const failedOrHoldDeals = scopedDeals.filter((deal) => isFailedOrHoldDeal(deal));
    const targetRevenue = period === "year" ? target.annualRevenueTarget : target.monthlyRevenueTarget;
    const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.expectedRevenue, 0);
    return {
        period,
        expectedRevenue: qualifiedExpectedDeals.reduce((sum, deal) => sum + deal.expectedRevenue, 0),
        wonRevenue,
        activeRevenue: activeDeals.reduce((sum, deal) => sum + deal.expectedRevenue, 0),
        activeDealCount: activeDeals.length,
        riskDealCount: scopedDeals.filter((deal) => deal.computedStatus === "위험" || deal.computedStatus === "지연").length,
        weeklyTaskCount: getUpcomingTasks(tasks, baseDate).length,
        wonDealCount: wonDeals.length,
        failedOrHoldDealCount: failedOrHoldDeals.length,
        targetRevenue,
        achievementRate: targetRevenue > 0 ? Math.round((wonRevenue / targetRevenue) * 100) : 0,
    };
}
export function calculateDealStatus(deal, activities, tasks, settings, baseDate = today) {
    return evaluateStatus(deal, activities, tasks, settings, baseDate).status;
}
export function getDealStatusReason(deal, activities, tasks, settings, baseDate = today) {
    return evaluateStatus(deal, activities, tasks, settings, baseDate).reason;
}
export function deriveDealFromActivity(deal, activity) {
    const isContact = contactActivityTypes.has(activity.activityType);
    const nextStage = stageFromActivity(activity.activityType, deal.salesStage, deal.detailStage);
    const terminalStatus = activity.activityType === "수주" || activity.activityType === "계약 완료" || activity.activityType === "발주 완료"
        ? "수주"
        : activity.activityType === "실패"
            ? "실패"
            : activity.activityType === "보류"
                ? "보류"
                : deal.status;
    return {
        ...deal,
        salesStage: nextStage.salesStage,
        detailStage: nextStage.detailStage,
        status: terminalStatus,
        statusReason: terminalStatus !== deal.status ? statusReasonForTerminal(terminalStatus) : deal.statusReason,
        lastUpdatedAt: activity.activityDate,
        lastContactDate: isContact ? activity.activityDate : deal.lastContactDate,
        nextAction: activity.nextAction ?? deal.nextAction,
        nextActionDueDate: activity.nextActionDueDate ?? deal.nextActionDueDate,
    };
}
export function getPipelineSummary(deals) {
    return pipelineStages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.salesStage === stage);
        const detailDistribution = detailStagesBySalesStage[stage]
            .map((detailStage) => ({
            detailStage,
            dealCount: stageDeals.filter((deal) => deal.detailStage === detailStage).length,
        }))
            .filter((item) => item.dealCount > 0);
        return {
            stage,
            dealCount: stageDeals.length,
            expectedRevenue: stageDeals.reduce((sum, deal) => sum + deal.expectedRevenue, 0),
            riskDealCount: stageDeals.filter((deal) => {
                const status = "computedStatus" in deal ? deal.computedStatus : deal.status;
                return status === "위험" || status === "지연";
            }).length,
            averageStayDays: stageDeals.length
                ? Math.round(stageDeals.reduce((sum, deal) => sum + daysSince(deal.lastUpdatedAt, today), 0) / stageDeals.length)
                : 0,
            detailDistribution,
            representativeCustomers: [...new Set(stageDeals.map((deal) => deal.customerName))].slice(0, 3),
        };
    });
}
export function getRiskDeals(deals) {
    return deals
        .filter((deal) => deal.computedStatus === "지연" || deal.computedStatus === "위험")
        .map((deal) => ({
        ...deal,
        riskReasons: [deal.computedStatusReason],
    }));
}
export function getUpcomingTasks(tasks, baseDate = today) {
    return tasks
        .filter((task) => task.status !== "done")
        .filter((task) => daysBetween(baseDate, task.dueDate) <= 7)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}
export function getRecentActivities(activities) {
    return [...activities]
        .filter((activity) => !activity.deletedAt)
        .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
        .slice(0, 8);
}
export function getDealActivities(dealId, activities) {
    return activities
        .filter((activity) => activity.dealId === dealId)
        .filter((activity) => !activity.deletedAt)
        .sort((a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime());
}
function evaluateStatus(deal, activities, tasks, settings, baseDate) {
    const dealActivities = getDealActivities(deal.id, activities);
    const latestContact = getLatestContactDate(deal, dealActivities);
    const latestQuote = latestActivityDate(dealActivities, ["견적서 발송", "제안서 발송"]);
    const latestTechnicalReview = latestActivityDate(dealActivities, ["기술 검토"]);
    const daysFromLastContact = daysSince(latestContact, baseDate);
    const daysFromLastUpdate = daysSince(deal.lastUpdatedAt, baseDate);
    const nextActionDiff = deal.nextActionDueDate ? daysBetween(baseDate, deal.nextActionDueDate) : undefined;
    const daysFromQuote = latestQuote ? daysSince(latestQuote, baseDate) : undefined;
    const daysFromTechnicalReview = latestTechnicalReview ? daysSince(latestTechnicalReview, baseDate) : daysFromLastUpdate;
    const relatedOpenTasks = tasks.filter((task) => task.dealId === deal.id && task.status !== "done");
    if (deal.salesStage === "계약 완료(수주)" || deal.status === "수주") {
        return { status: "수주", reason: "계약 또는 발주가 완료된 상태입니다." };
    }
    if (deal.detailStage === "실패" || deal.status === "실패") {
        return { status: "실패", reason: "경쟁사 수주, 예산 취소, 기술 부적합 등으로 종료된 상태입니다." };
    }
    if (deal.detailStage === "보류" || deal.status === "보류") {
        return { status: "보류", reason: deal.statusReason ?? "고객 또는 내부 사유로 진행이 일시 중단된 상태입니다." };
    }
    if (daysFromLastContact >= settings.riskAfterNoContactDays) {
        return { status: "위험", reason: `마지막 컨택 이후 ${daysFromLastContact}일 이상 업데이트가 없습니다.` };
    }
    if (daysFromQuote !== undefined && daysFromQuote >= settings.quoteNoResponseRiskDays) {
        return { status: "위험", reason: `견적서 발송 이후 ${daysFromQuote}일 이상 고객 응답 이력이 없습니다.` };
    }
    if (deal.salesStage === "검토/협상" && daysFromLastUpdate >= settings.negotiationRiskDays) {
        return { status: "위험", reason: `검토/협상 단계에서 ${daysFromLastUpdate}일 이상 진척 이력이 없습니다.` };
    }
    if ((deal.requestedDiscountRate ?? 0) >= 22) {
        return { status: "위험", reason: `요청 할인율 ${deal.requestedDiscountRate}%가 가격 가이드의 최대 허용 할인율에 근접했습니다.` };
    }
    if (deal.expectedCloseDate && daysBetween(baseDate, deal.expectedCloseDate) < 0) {
        return { status: "위험", reason: "계약 예정일이 지났지만 상태 업데이트가 없습니다." };
    }
    if (nextActionDiff !== undefined && nextActionDiff < 0 && Math.abs(nextActionDiff) >= settings.delayedAfterActionDueDays) {
        return { status: "지연", reason: `다음 액션 기한이 ${Math.abs(nextActionDiff)}일 초과되었습니다.` };
    }
    if (relatedOpenTasks.some((task) => task.status === "overdue")) {
        return { status: "지연", reason: "등록된 후속 업무 중 기한이 지난 항목이 있습니다." };
    }
    if (daysFromLastContact >= settings.cautionAfterNoContactDays) {
        return { status: "주의", reason: `마지막 컨택 이후 ${daysFromLastContact}일 이상 업데이트가 없습니다.` };
    }
    if (nextActionDiff !== undefined && nextActionDiff >= 0 && nextActionDiff <= 2) {
        return { status: "주의", reason: `다음 액션 기한이 ${nextActionDiff}일 남아 있습니다.` };
    }
    if (daysFromQuote !== undefined && daysFromQuote >= settings.quoteNoResponseCautionDays) {
        return { status: "주의", reason: `견적서 발송 이후 ${daysFromQuote}일 동안 고객 응답 이력이 없습니다.` };
    }
    if (deal.detailStage === "기술 검토" && daysFromTechnicalReview >= settings.technicalReviewCautionDays) {
        return { status: "주의", reason: `기술 검토 단계에서 ${daysFromTechnicalReview}일 이상 머물러 있습니다.` };
    }
    return {
        status: "정상",
        reason: `최근 ${daysFromLastContact}일 이내 고객 대응 이력이 있고 다음 액션 기한이 관리 가능한 상태입니다.`,
    };
}
function stageFromActivity(activityType, currentStage, currentDetailStage) {
    if (activityType === "신규 인입")
        return { salesStage: "신규 OI 발굴", detailStage: "신규 인입" };
    if (activityType === "신규 제안")
        return { salesStage: "신규 OI 발굴", detailStage: "신규 제안" };
    if (activityType === "기술 검토")
        return { salesStage: "검토/협상", detailStage: "기술 검토" };
    if (activityType === "보안 검토")
        return { salesStage: "검토/협상", detailStage: "보안 검토" };
    if (activityType === "견적서 발송")
        return { salesStage: "제안/견적", detailStage: "견적 발송" };
    if (activityType === "제안서 발송")
        return { salesStage: "제안/견적", detailStage: "제안 완료" };
    if (activityType === "추가 자료 송부")
        return { salesStage: "제안/견적", detailStage: "추가 자료 송부" };
    if (activityType === "공문 발송")
        return { salesStage: "제안/견적", detailStage: "공문 송부" };
    if (activityType === "계약 협의")
        return { salesStage: "계약 진행", detailStage: "계약 조건 확인" };
    if (activityType === "계약 완료")
        return { salesStage: "계약 완료(수주)", detailStage: "계약 완료" };
    if (activityType === "발주 완료")
        return { salesStage: "계약 완료(수주)", detailStage: "발주 완료" };
    if (activityType === "수주")
        return { salesStage: "계약 완료(수주)", detailStage: "수주" };
    if (activityType === "실패")
        return { salesStage: "종료", detailStage: "실패" };
    if (activityType === "보류")
        return { salesStage: "종료", detailStage: "보류" };
    return { salesStage: currentStage, detailStage: currentDetailStage };
}
function isDealInPeriod(deal, period, baseDate) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstContact = new Date(`${deal.firstContactDate}T00:00:00+09:00`);
    const expectedClose = deal.expectedCloseDate ? new Date(`${deal.expectedCloseDate}T00:00:00+09:00`) : undefined;
    const matchesYear = firstContact.getFullYear() === year || expectedClose?.getFullYear() === year;
    if (period === "year")
        return matchesYear;
    return ((firstContact.getFullYear() === year && firstContact.getMonth() === month) ||
        (expectedClose?.getFullYear() === year && expectedClose.getMonth() === month));
}
function isWonDeal(deal) {
    return deal.computedStatus === "수주" || deal.salesStage === "계약 완료(수주)";
}
function isFailedOrHoldDeal(deal) {
    return deal.computedStatus === "실패" || deal.computedStatus === "보류" || deal.salesStage === "종료";
}
function isActiveDeal(deal) {
    return !isWonDeal(deal) && !isFailedOrHoldDeal(deal);
}
function isExcludedFromExpectedRevenue(deal) {
    return isFailedOrHoldDeal(deal) || ["장기 미응답", "예산 취소", "경쟁사 수주", "고객사 내부 중단"].includes(deal.detailStage);
}
function statusReasonForTerminal(status) {
    if (status === "수주")
        return "계약 또는 발주가 완료된 상태입니다.";
    if (status === "실패")
        return "영업 기회가 실패 처리되었습니다.";
    if (status === "보류")
        return "고객 또는 내부 사유로 진행이 일시 중단된 상태입니다.";
    return "";
}
function getLatestContactDate(deal, activities) {
    const latestContact = latestActivityDate(activities.filter((activity) => contactActivityTypes.has(activity.activityType)));
    return latestContact ?? deal.lastContactDate;
}
function latestActivityDate(activities, types) {
    const filtered = types ? activities.filter((activity) => types.includes(activity.activityType)) : activities;
    return filtered
        .map((activity) => activity.activityDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}
function daysSince(dateText, baseDate) {
    return Math.max(0, Math.floor((baseDate.getTime() - new Date(`${dateText}T00:00:00+09:00`).getTime()) / 86400000));
}
function daysBetween(baseDate, dateText) {
    return Math.ceil((new Date(`${dateText}T00:00:00+09:00`).getTime() - baseDate.getTime()) / 86400000);
}
