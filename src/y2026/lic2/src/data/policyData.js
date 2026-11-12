// LIC Surrender Value Calculator Data
// Extracted from src/y2026/lic/resource/surrender_value_sheet-117130147-v5(2).xlsx

export const LIC_POLICIES = [
  {
    policyNumber: "117130147",
    policyName: "LIC New Jeevan Anand",
    planNumber: "815",
    sumAssured: 500000,
    termYears: 21,
    commencementDate: "2014-07-08",
    premiumFrequency: "Yearly",
    basicPremium: 25602,
    riderPremium: 500, // Accidental Benefit
    status: "In Force",
    docLink: "#",
    years: [
      {
        year: 1,
        calendarYearUSA: "2014",
        calendarYearIndia: "04/2014 - 03/2015",
        sumAssured: 500000,
        premiumPaidDate: "2014-07-08",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 780,
        totalPaidYear: 26882,
        cumulativeBasicPremium: 25602,
        premiumSVFPercent: 0.0, // 0%
        gsv1: 0,
        bonusRate: 0.0,
        fab: 0,
        interimBonusSRB: 0,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 0,
        totalBonus: 0,
        bonusSVFPercent: 0.0,
        gsv2: 0,
        totalGSV: 0,
        outstandingTerms: 20,
        outstandingFactor: 0.214548, // (1.08)^-20
        factor2WholeLife: 0.0,
        pusa: 23809.52, // (1/21)*500000
        ssv2: 0,
        puv: 23809.52, // PUSA + vested bonus
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Surrender value not payable in Year 1 (minimum 3 years of premiums required under older rules)."
      },
      {
        year: 2,
        calendarYearUSA: "2015",
        calendarYearIndia: "04/2015 - 03/2016",
        sumAssured: 500000,
        premiumPaidDate: "2015-07-27",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 413,
        gst: 456,
        totalPaidYear: 26971,
        cumulativeBasicPremium: 51204,
        premiumSVFPercent: 0.0, // 0%
        gsv1: 0,
        bonusRate: 49.0,
        fab: 0,
        interimBonusSRB: 24500, // (500000/1000) * 49
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 24500,
        totalBonus: 24500,
        bonusSVFPercent: 0.0,
        gsv2: 0,
        totalGSV: 0,
        outstandingTerms: 19,
        outstandingFactor: 0.231712, // (1.08)^-19
        factor2WholeLife: 0.0,
        pusa: 47619.05, // (2/21)*500000
        ssv2: 0,
        puv: 72119.05,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Bonus declared at ₹49/thousand. Surrender value not payable yet."
      },
      {
        year: 3,
        calendarYearUSA: "2016",
        calendarYearIndia: "04/2016 - 03/2017",
        sumAssured: 500000,
        premiumPaidDate: "2016-07-07",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 489,
        totalPaidYear: 26591,
        cumulativeBasicPremium: 76806,
        premiumSVFPercent: 30.0, // 0.3000
        gsv1: 23041.8,
        bonusRate: 49.0,
        fab: 0,
        interimBonusSRB: 24500,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 49000,
        totalBonus: 49000,
        bonusSVFPercent: 15.93, // 0.1593
        gsv2: 7805.7,
        totalGSV: 30847.5,
        outstandingTerms: 18,
        outstandingFactor: 0.250249, // (1.08)^-18
        factor2WholeLife: 0.0,
        pusa: 71428.57, // (3/21)*500000
        ssv2: 0,
        puv: 120428.57,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Surrender value is active. Guaranteed SV is 30% of basic premiums + 15.93% of vested bonus."
      },
      {
        year: 4,
        calendarYearUSA: "2017",
        calendarYearIndia: "04/2017 - 03/2018",
        sumAssured: 500000,
        premiumPaidDate: "2017-07-02",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 587,
        totalPaidYear: 26689,
        cumulativeBasicPremium: 102408,
        premiumSVFPercent: 50.0, // 0.5000
        gsv1: 51204.0,
        bonusRate: 49.0,
        fab: 0,
        interimBonusSRB: 24500,
        specialLoyaltyAdditionLA: 2500, // Diamond Jubilee one-time special reversionary bonus ₹5/1000
        cumulativeVestedBonus: 76000,
        totalBonus: 76000,
        bonusSVFPercent: 16.22, // 0.1622
        gsv2: 12327.2,
        totalGSV: 63531.2,
        outstandingTerms: 17,
        outstandingFactor: 0.270269,
        factor2WholeLife: 0.0,
        pusa: 95238.10,
        ssv2: 0,
        puv: 171238.10,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Includes ₹2,500 Diamond Jubilee Special Reversionary Bonus (5 per thousand S.A.)."
      },
      {
        year: 5,
        calendarYearUSA: "2018",
        calendarYearIndia: "04/2018 - 03/2019",
        sumAssured: 500000,
        premiumPaidDate: "2018-07-22",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 587,
        totalPaidYear: 26689,
        cumulativeBasicPremium: 128010,
        premiumSVFPercent: 50.0,
        gsv1: 64005.0,
        bonusRate: 49.0,
        fab: 0,
        interimBonusSRB: 24500,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 100500,
        totalBonus: 100500,
        bonusSVFPercent: 16.58, // 0.1658
        gsv2: 16662.9,
        totalGSV: 80667.9,
        outstandingTerms: 16,
        outstandingFactor: 0.291890,
        factor2WholeLife: 0.0,
        pusa: 119047.62,
        ssv2: 0,
        puv: 219547.62,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Total vested bonus reaches ₹1,00,500. Guaranteed Surrender Value exceeds ₹80,000."
      },
      {
        year: 6,
        calendarYearUSA: "2019",
        calendarYearIndia: "04/2019 - 03/2020",
        sumAssured: 500000,
        premiumPaidDate: "2019-07-19",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 587,
        totalPaidYear: 26689,
        cumulativeBasicPremium: 153612,
        premiumSVFPercent: 50.0,
        gsv1: 76806.0,
        bonusRate: 49.0,
        fab: 0,
        interimBonusSRB: 24500,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 125000,
        totalBonus: 125000,
        bonusSVFPercent: 17.03, // 0.1703
        gsv2: 21287.5,
        totalGSV: 98093.5,
        outstandingTerms: 15,
        outstandingFactor: 0.315242,
        factor2WholeLife: 0.0,
        pusa: 142857.14,
        ssv2: 0,
        puv: 267857.14,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Bonus SVF increases to 17.03%."
      },
      {
        year: 7,
        calendarYearUSA: "2020",
        calendarYearIndia: "04/2020 - 03/2021",
        sumAssured: 500000,
        premiumPaidDate: "2020-07-22",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 587,
        totalPaidYear: 26689,
        cumulativeBasicPremium: 179214,
        premiumSVFPercent: 50.0,
        gsv1: 89607.0,
        bonusRate: 46.0, // Bonus revised to ₹46/thousand
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 148000,
        totalBonus: 148000,
        bonusSVFPercent: 17.58, // 0.1758
        gsv2: 26018.4,
        totalGSV: 115625.4,
        outstandingTerms: 14,
        outstandingFactor: 0.340461,
        factor2WholeLife: 0.0,
        pusa: 166666.67,
        ssv2: 0,
        puv: 314666.67,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Bonus rate revised to ₹46 per ₹1,000 SA as per LIC 2020 valuation report."
      },
      {
        year: 8,
        calendarYearUSA: "2021",
        calendarYearIndia: "04/2021 - 03/2022",
        sumAssured: 500000,
        premiumPaidDate: "2021-07-08",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 587,
        totalPaidYear: 26689,
        cumulativeBasicPremium: 204816,
        premiumSVFPercent: 52.31, // 0.5231
        gsv1: 107139.25,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 171000,
        totalBonus: 171000,
        bonusSVFPercent: 17.58,
        gsv2: 30061.8,
        totalGSV: 137201.05,
        outstandingTerms: 13,
        outstandingFactor: 0.367698,
        factor2WholeLife: 0.0,
        pusa: 190476.19,
        ssv2: 0,
        puv: 361476.19,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Premium SVF rises above 50% for the first time to 52.31%."
      },
      {
        year: 9,
        calendarYearUSA: "2022",
        calendarYearIndia: "04/2022 - 03/2023",
        sumAssured: 500000,
        premiumPaidDate: "2022-09-03",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 310,
        gst: 587,
        totalPaidYear: 26999,
        cumulativeBasicPremium: 230418,
        premiumSVFPercent: 54.62, // 0.5462
        gsv1: 125854.31,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 194000,
        totalBonus: 194000,
        bonusSVFPercent: 17.66, // 0.1766
        gsv2: 34260.4,
        totalGSV: 160114.71,
        outstandingTerms: 12,
        outstandingFactor: 0.397114,
        factor2WholeLife: 0.0,
        pusa: 214285.71,
        ssv2: 0,
        puv: 408285.71,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Premium paid with late fee ₹310. Guaranteed surrender value passes ₹1,60,000."
      },
      {
        year: 10,
        calendarYearUSA: "2023",
        calendarYearIndia: "04/2023 - 03/2024",
        sumAssured: 500000,
        premiumPaidDate: "2023-09-01",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 290,
        gst: 638,
        totalPaidYear: 27030,
        cumulativeBasicPremium: 256020,
        premiumSVFPercent: 56.92, // 0.5692
        gsv1: 145726.58,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 217000,
        totalBonus: 217000,
        bonusSVFPercent: 17.85, // 0.1785
        gsv2: 38734.5,
        totalGSV: 184461.08,
        outstandingTerms: 11,
        outstandingFactor: 0.428883,
        factor2WholeLife: 0.0,
        pusa: 238095.24,
        ssv2: 0,
        puv: 455095.24,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "10 years milestone completed! Cumulative basic premium reached ₹2,56,020."
      },
      {
        year: 11,
        calendarYearUSA: "2024",
        calendarYearIndia: "04/2024 - 03/2025",
        sumAssured: 500000,
        premiumPaidDate: "2024-08-12",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 206,
        gst: 629,
        totalPaidYear: 26937,
        cumulativeBasicPremium: 281622,
        premiumSVFPercent: 59.23, // 0.5923
        gsv1: 166804.71,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 240000,
        totalBonus: 240000,
        bonusSVFPercent: 18.16, // 0.1816
        gsv2: 43584.0,
        totalGSV: 210388.71,
        outstandingTerms: 10,
        outstandingFactor: 0.463193,
        factor2WholeLife: 0.0,
        pusa: 261904.76,
        ssv2: 0,
        puv: 501904.76,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Vested bonus reaches ₹2,40,000. Total GSV crosses ₹2.10 Lakhs."
      },
      {
        year: 12,
        calendarYearUSA: "2025",
        calendarYearIndia: "04/2025 - 03/2026",
        sumAssured: 500000,
        premiumPaidDate: "2025-09-24",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 434,
        gst: 0,
        totalPaidYear: 26536,
        cumulativeBasicPremium: 307224,
        premiumSVFPercent: 61.54, // 0.6154
        gsv1: 189065.65,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 263000,
        totalBonus: 263000,
        bonusSVFPercent: 18.60, // 0.1860
        gsv2: 48918.0,
        totalGSV: 237983.65,
        outstandingTerms: 9,
        outstandingFactor: 0.500249,
        factor2WholeLife: 0.0,
        pusa: 285714.29,
        ssv2: 0,
        puv: 548714.29,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Outstanding term under 10 years."
      },
      {
        year: 13,
        calendarYearUSA: "2026",
        calendarYearIndia: "04/2026 - 03/2027",
        sumAssured: 500000,
        premiumPaidDate: "2026-07-08",
        basicPremium: 25602,
        riderPremium: 500,
        lateFee: 0,
        gst: 0,
        totalPaidYear: 26102,
        cumulativeBasicPremium: 332826,
        premiumSVFPercent: 63.85, // 0.6385
        gsv1: 212509.40,
        bonusRate: 46.0,
        fab: 0,
        interimBonusSRB: 23000,
        specialLoyaltyAdditionLA: 0,
        cumulativeVestedBonus: 286000,
        totalBonus: 286000,
        bonusSVFPercent: 19.18, // 0.1918
        gsv2: 54854.8,
        totalGSV: 267364.20,
        outstandingTerms: 8,
        outstandingFactor: 0.540269,
        factor2WholeLife: 0.0,
        pusa: 309523.81,
        ssv2: 0,
        puv: 595523.81,
        factor1Endowment: 0.0,
        ssv1: 0,
        totalSSV: 0,
        notes: "Current policy year. Total Guaranteed Surrender Value ₹2,67,364.20."
      }
    ]
  }
];

// Helper calculations
export function calculateGSV({ cumulativeBasicPremium, premiumSVFPercent, totalVestedBonus, bonusSVFPercent }) {
  const gsv1 = (cumulativeBasicPremium * (premiumSVFPercent / 100));
  const gsv2 = (totalVestedBonus * (bonusSVFPercent / 100));
  const totalGSV = gsv1 + gsv2;
  return {
    gsv1: Number(gsv1.toFixed(2)),
    gsv2: Number(gsv2.toFixed(2)),
    totalGSV: Number(totalGSV.toFixed(2))
  };
}

export function calculateSSV({ sumAssured, termYears, policyYear, totalVestedBonus, factor1, factor2 }) {
  const outstandingTerms = termYears - policyYear;
  const discountFactor = Math.pow(1.08, -outstandingTerms);
  const pusa = (sumAssured * policyYear) / termYears;
  const puv = pusa + totalVestedBonus;
  
  // SSV1 = (PUV * F1) / 100
  const ssv1 = (puv * factor1) / 100;
  
  // SSV2 = PUSA * (1.08)^-(n-d) * (F2 / 100)
  const ssv2 = (pusa * discountFactor * factor2) / 100;
  
  const totalSSV = ssv1 + ssv2;
  
  return {
    outstandingTerms,
    discountFactor: Number(discountFactor.toFixed(6)),
    pusa: Number(pusa.toFixed(2)),
    puv: Number(puv.toFixed(2)),
    factor1: Number(factor1),
    factor2: Number(factor2),
    ssv1: Number(ssv1.toFixed(2)),
    ssv2: Number(ssv2.toFixed(2)),
    totalSSV: Number(totalSSV.toFixed(2)),
    payableSurrenderValue: (gsv, ssv) => Math.max(gsv, ssv)
  };
}

// Format Indian Currency (INR)
export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export function formatINRWithDecimals(val) {
  if (val === null || val === undefined || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

