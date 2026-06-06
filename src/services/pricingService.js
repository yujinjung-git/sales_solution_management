import { average, formatCurrency } from "./format";
export const defaultPricingGuideSettings = {
    baseRecommendedDiscount: 12,
    maxAllowedDiscount: 25,
    industryDiscountWeight: {
        public: 3,
        finance: 2,
        manufacturing: 1,
        education: 2,
        medical: 2,
        it: 1,
        retail: 1,
        enterprise: 2,
    },
    competitorDiscountWeight: 2,
    strategicCustomerDiscountWeight: 2,
    referenceCustomerDiscountWeight: 1,
    longTermContractDiscountWeight: 2,
    partnerMarginAdjustment: 2,
    marginFloorRate: 28,
    targetMarginRate: 38,
    defaultPartnerMarginRate: 8,
    implementationMarginFloorRate: 18,
    maintenanceMarginRate: 55,
    approvalRequiredMarginRate: 30,
    winProbability: {
        baseRate: 70,
        budgetConfirmedBonus: 8,
        budgetUnknownPenalty: 8,
        highCompetitionPenalty: 9,
        finalApprovalBonus: 7,
        thisMonthPurchaseBonus: 6,
        highTechnicalRiskPenalty: 8,
        recommendedDiscountRangeBonus: 7,
        overMaxDiscountPenalty: 25,
    },
    referenceWeights: {
        industryMatch: 22,
        userCountSimilarity: 18,
        productMatch: 18,
        competitorMatch: 10,
        contractPeriodSimilarity: 8,
        discountSimilarity: 10,
        resultWeight: 7,
        implementationDifficultyMatch: 7,
    },
};
export function createDefaultPricingInput(deal, industry, productModules) {
    const productFamily = detectProductFamily(productModules);
    return {
        industry,
        userCount: deal.userCount,
        productModules,
        expectedRevenue: deal.expectedRevenue,
        initialOfferPrice: Math.round(deal.expectedRevenue / Math.max(0.01, 1 - deal.requestedDiscountRate / 100)),
        requestedDiscountRate: deal.requestedDiscountRate,
        competitorInvolved: deal.competitorInvolved,
        serverRedundancyIncluded: productModules.some((item) => item.includes("이중화")),
        maintenanceIncluded: true,
        customerType: industry,
        customerImportance: industry === "공공기관" || industry === "금융" ? "전략 고객" : "일반 고객",
        purchaseLikelihood: "보통",
        budgetStatus: "미확인",
        decisionStage: "팀장 검토",
        purchaseTiming: "이번 분기",
        competitorName: deal.competitorInvolved ? "경쟁사 미확인" : "",
        competitorPriceLevel: deal.competitorInvolved ? "미확인" : "당사보다 높음",
        competitionIntensity: deal.competitorInvolved ? "높음" : "보통",
        existingSolution: "미확인",
        productFamily,
        moduleCount: Math.max(1, productModules.length),
        drIncluded: productModules.some((item) => item.includes("DR")),
        customizationRequired: false,
        implementationDifficulty: deal.userCount >= 3000 ? "높음" : "보통",
        technicalRisk: deal.userCount >= 3000 ? "보통" : "낮음",
        contractPeriod: "1년",
        maintenancePeriod: "1년",
        paymentTerms: "발주 후",
        partnerInvolved: false,
        partnerMarginRate: defaultPricingGuideSettings.defaultPartnerMarginRate,
        marginFloorRate: defaultPricingGuideSettings.marginFloorRate,
        targetMarginRate: defaultPricingGuideSettings.targetMarginRate,
        promotionApplied: false,
        promotionDiscountRate: 0,
        referenceValue: industry === "공공기관" || industry === "금융" ? "높음" : "보통",
        expansionPotential: "보통",
        longTermPotential: "보통",
        revenueTargetContribution: deal.expectedRevenue >= 150000000 ? "높음" : "보통",
        internalApprovalRequired: false,
    };
}
export function calculatePricingGuide(deal, cases, input, settings = defaultPricingGuideSettings) {
    const recommendedDiscountRate = calculateRecommendedDiscount(input, settings);
    const maxAllowedDiscountRate = calculateMaxAllowedDiscount(input, settings, recommendedDiscountRate);
    const expectedMarginRate = calculateExpectedMarginRate(input, settings);
    const approvalRequired = input.internalApprovalRequired ||
        input.requestedDiscountRate > maxAllowedDiscountRate ||
        expectedMarginRate < settings.approvalRequiredMarginRate;
    const winProbability = calculateWinProbability(input, settings, recommendedDiscountRate, maxAllowedDiscountRate);
    const similarCases = matchPricingReferences(input, cases, settings);
    const { defenseLogic, alternativeTerms, customerMessage, internalApprovalMessage, strategySummary } = generatePricingDefense(input, recommendedDiscountRate, maxAllowedDiscountRate, expectedMarginRate, approvalRequired, similarCases);
    const marginRiskLevel = expectedMarginRate < settings.marginFloorRate ? "위험" : expectedMarginRate < settings.targetMarginRate ? "주의" : "정상";
    return {
        recommendedDiscountRate,
        maxAllowedDiscountRate,
        requestedDiscountEvaluation: evaluateRequestedDiscount(input.requestedDiscountRate, recommendedDiscountRate, maxAllowedDiscountRate),
        winProbability,
        expectedMarginRate,
        marginRiskLevel,
        approvalRequired,
        marginWarning: marginRiskLevel === "위험"
            ? "예상 마진율이 내부 하한선보다 낮습니다. 추가 할인은 내부 승인 없이 진행하기 어렵습니다."
            : marginRiskLevel === "주의"
                ? "예상 마진율이 목표 마진율보다 낮습니다. 할인 대신 대안 조건을 우선 제시하세요."
                : "현재 조건은 목표 마진 범위에서 관리 가능합니다.",
        defenseLogic,
        alternativeTerms,
        customerMessage,
        internalApprovalMessage,
        strategySummary,
        basis: `${deal.name} 조건, ${input.industry} 산업군 유사 사례 ${cases.length}건, 설정된 가격 기준을 함께 반영했습니다.`,
        similarCases,
    };
}
export function calculateRecommendedDiscount(input, settings) {
    let discount = settings.baseRecommendedDiscount + industryWeight(input.industry, settings);
    if (input.competitorInvolved)
        discount += settings.competitorDiscountWeight;
    if (input.customerImportance === "전략 고객")
        discount += settings.strategicCustomerDiscountWeight;
    if (input.customerImportance === "레퍼런스 고객")
        discount += settings.referenceCustomerDiscountWeight;
    if (input.contractPeriod === "3년" || input.contractPeriod === "5년")
        discount += settings.longTermContractDiscountWeight;
    if (input.referenceValue === "높음")
        discount += 1;
    if (input.expansionPotential === "높음")
        discount += 1;
    if (input.technicalRisk === "높음")
        discount -= 1;
    if (input.promotionApplied)
        discount += input.promotionDiscountRate;
    return clamp(Math.round(discount), 0, settings.maxAllowedDiscount);
}
export function calculateMaxAllowedDiscount(input, settings, recommendedDiscountRate = calculateRecommendedDiscount(input, settings)) {
    const marginDrivenLimit = 52 - settings.marginFloorRate - complexityCost(input) - (input.partnerInvolved ? input.partnerMarginRate : 0);
    const strategicRoom = input.customerImportance === "전략 고객" || input.referenceValue === "높음" ? 2 : 0;
    return clamp(Math.round(Math.max(recommendedDiscountRate, Math.min(settings.maxAllowedDiscount, marginDrivenLimit + strategicRoom))), recommendedDiscountRate, settings.maxAllowedDiscount);
}
export function calculateWinProbability(input, settings, recommendedDiscountRate = calculateRecommendedDiscount(input, settings), maxAllowedDiscountRate = calculateMaxAllowedDiscount(input, settings, recommendedDiscountRate)) {
    let probability = settings.winProbability.baseRate;
    if (input.purchaseLikelihood === "높음")
        probability += 6;
    if (input.purchaseLikelihood === "낮음")
        probability -= 8;
    if (input.budgetStatus === "확보됨")
        probability += settings.winProbability.budgetConfirmedBonus;
    if (input.budgetStatus === "일부 확보")
        probability += 3;
    if (input.budgetStatus === "미확인")
        probability -= settings.winProbability.budgetUnknownPenalty;
    if (input.budgetStatus === "미확보")
        probability -= 18;
    if (input.competitionIntensity === "높음")
        probability -= settings.winProbability.highCompetitionPenalty;
    if (input.competitionIntensity === "낮음")
        probability += 4;
    if (input.decisionStage === "최종 승인 대기")
        probability += settings.winProbability.finalApprovalBonus;
    if (input.purchaseTiming === "이번 달")
        probability += settings.winProbability.thisMonthPurchaseBonus;
    if (input.technicalRisk === "높음")
        probability -= settings.winProbability.highTechnicalRiskPenalty;
    if (Math.abs(input.requestedDiscountRate - recommendedDiscountRate) <= 2)
        probability += settings.winProbability.recommendedDiscountRangeBonus;
    if (input.requestedDiscountRate > maxAllowedDiscountRate)
        probability -= settings.winProbability.overMaxDiscountPenalty;
    return clamp(Math.round(probability), 15, 95);
}
export function matchPricingReferences(input, references, settings) {
    const enriched = references.map((reference) => {
        const contractPeriod = inferContractPeriod(reference);
        const implementationDifficulty = inferImplementationDifficulty(reference);
        const finalAmount = Math.round(reference.userCount * 52000 * (1 - reference.discountRate / 100));
        const productMatch = input.productModules.some((moduleName) => reference.productName.includes(moduleName)) || reference.productName.includes(input.productFamily);
        const userSimilarity = Math.max(0, 1 - Math.abs(reference.userCount - input.userCount) / Math.max(input.userCount, reference.userCount, 1));
        const discountSimilarity = Math.max(0, 1 - Math.abs(reference.discountRate - input.requestedDiscountRate) / 30);
        const score = (reference.industry === input.industry ? settings.referenceWeights.industryMatch : 0) +
            userSimilarity * settings.referenceWeights.userCountSimilarity +
            (productMatch ? settings.referenceWeights.productMatch : 0) +
            (reference.competitorInvolved === input.competitorInvolved ? settings.referenceWeights.competitorMatch : 0) +
            (contractPeriod === input.contractPeriod ? settings.referenceWeights.contractPeriodSimilarity : settings.referenceWeights.contractPeriodSimilarity / 2) +
            discountSimilarity * settings.referenceWeights.discountSimilarity +
            (reference.result === "win" ? settings.referenceWeights.resultWeight : settings.referenceWeights.resultWeight / 2) +
            (implementationDifficulty === input.implementationDifficulty ? settings.referenceWeights.implementationDifficultyMatch : 0);
        return {
            ...reference,
            contractPeriod,
            finalAmount,
            implementationDifficulty,
            partnerInvolved: reference.notes.includes("파트너") || reference.notes.includes("총판"),
            similarityScore: Math.round(score),
            referencePoint: reference.result === "win"
                ? `${reference.notes} ${reference.discountRate}% 선에서 조건 조정으로 수주한 사례입니다.`
                : `${reference.reason} 유사 조건에서 가격 방어 실패 리스크를 확인할 수 있습니다.`,
        };
    });
    return enriched.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);
}
export function generatePricingDefense(input, recommendedDiscountRate, maxAllowedDiscountRate, expectedMarginRate, approvalRequired, references) {
    const averageWinDiscount = Math.round(average(references.filter((item) => item.result === "win").map((item) => item.discountRate)));
    const alternativeTerms = [
        "추가 할인 대신 유지보수 3개월 무상 제공",
        "구축 지원 범위 조정 후 기본가 유지",
        "서버 이중화 옵션 별도 견적",
        "단계적 사용자 증설 계약",
    ];
    if (input.contractPeriod === "1년")
        alternativeTerms.push("2년 이상 계약 시 할인율 일부 확대");
    if (input.referenceValue === "높음")
        alternativeTerms.push("레퍼런스 공개 조건으로 특별 할인");
    if (input.partnerInvolved)
        alternativeTerms.push("파트너 마진 조정 후 재견적");
    if (input.technicalRisk !== "낮음")
        alternativeTerms.push("무상 기술 점검 1회 제공");
    const defenseLogic = [
        `권장 할인율은 ${recommendedDiscountRate}%이며 최대 허용 할인율은 ${maxAllowedDiscountRate}%입니다.`,
        averageWinDiscount ? `상위 유사 Win 사례 평균 할인율은 ${averageWinDiscount}%입니다.` : "동일 조건 Win 사례가 적어 보수적인 승인 기준이 필요합니다.",
        `현재 조건의 예상 마진율은 ${expectedMarginRate}%입니다.`,
        approvalRequired ? "현재 조건은 내부 승인 검토가 필요합니다." : "현재 조건은 영업 재량 범위에서 검토 가능합니다.",
    ];
    return {
        defenseLogic,
        alternativeTerms,
        customerMessage: input.requestedDiscountRate > maxAllowedDiscountRate
            ? "요청 할인율은 내부 허용 범위를 초과합니다. 단가 인하보다 유지보수 무상 제공 또는 구축 범위 조정안을 함께 제안하는 것이 적절합니다."
            : "요청 할인율은 협상 가능 범위에 있습니다. 유사 수주 사례와 기술 지원 범위를 근거로 조건부 제안을 진행하세요.",
        internalApprovalMessage: `${formatCurrency(input.expectedRevenue)} 규모, 요청 할인율 ${input.requestedDiscountRate}%, 예상 마진율 ${expectedMarginRate}% 조건입니다. ${approvalRequired ? "최대 허용 할인율 또는 승인 마진 기준에 근접해 승인 검토가 필요합니다." : "현 기준에서는 승인 리스크가 낮습니다."}`,
        strategySummary: `추천 전략: ${recommendedDiscountRate}% 안팎을 기준으로 제안하고, ${input.requestedDiscountRate > maxAllowedDiscountRate ? "추가 할인 대신 대안 조건을 우선 제시" : "고객 구매 시점과 예산 확보 여부를 근거로 조건부 양보"}하세요.`,
    };
}
function evaluateRequestedDiscount(requested, recommended, maxAllowed) {
    if (requested > maxAllowed)
        return "최대 허용 할인율 초과, 내부 승인 필요";
    if (requested > recommended)
        return "권장 할인율보다 높음, 대안 조건 병행 필요";
    if (Math.abs(requested - recommended) <= 2)
        return "권장 범위 내 협상 가능";
    return "보수적인 할인 요청으로 마진 여유 있음";
}
function calculateExpectedMarginRate(input, settings) {
    const baseGrossMargin = input.maintenanceIncluded ? 54 : 50;
    const partnerCost = input.partnerInvolved ? input.partnerMarginRate || settings.defaultPartnerMarginRate : 0;
    const promotionCost = input.promotionApplied ? input.promotionDiscountRate : 0;
    return clamp(Math.round(baseGrossMargin - input.requestedDiscountRate - partnerCost - promotionCost - complexityCost(input)), 0, 80);
}
function complexityCost(input) {
    return ((input.serverRedundancyIncluded ? 2 : 0) +
        (input.drIncluded ? 3 : 0) +
        (input.customizationRequired ? 3 : 0) +
        (input.implementationDifficulty === "높음" ? 4 : input.implementationDifficulty === "보통" ? 2 : 0) +
        (input.technicalRisk === "높음" ? 3 : input.technicalRisk === "보통" ? 1 : 0));
}
function industryWeight(industry, settings) {
    if (industry.includes("공공"))
        return settings.industryDiscountWeight.public;
    if (industry.includes("금융"))
        return settings.industryDiscountWeight.finance;
    if (industry.includes("제조"))
        return settings.industryDiscountWeight.manufacturing;
    if (industry.includes("교육"))
        return settings.industryDiscountWeight.education;
    if (industry.includes("의료"))
        return settings.industryDiscountWeight.medical;
    if (industry.includes("IT"))
        return settings.industryDiscountWeight.it;
    if (industry.includes("유통"))
        return settings.industryDiscountWeight.retail;
    return settings.industryDiscountWeight.enterprise;
}
function detectProductFamily(productModules) {
    const text = productModules.join(" ");
    if (text.includes("SSO"))
        return "SSO";
    if (text.includes("MFA"))
        return "MFA";
    if (text.includes("인증서"))
        return "인증서";
    if (text.includes("접근"))
        return "접근제어";
    if (productModules.length >= 3)
        return "통합 인증 패키지";
    return "OTP";
}
function inferContractPeriod(reference) {
    if (reference.notes.includes("3년"))
        return "3년";
    if (reference.notes.includes("2년"))
        return "2년";
    if (reference.notes.includes("5년"))
        return "5년";
    return reference.userCount >= 3000 ? "3년" : "1년";
}
function inferImplementationDifficulty(reference) {
    const text = `${reference.productName} ${reference.notes} ${reference.reason}`;
    if (text.includes("망분리") || text.includes("DR") || text.includes("이중화") || reference.userCount >= 3500)
        return "높음";
    if (reference.userCount >= 1500 || text.includes("SSO"))
        return "보통";
    return "낮음";
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
