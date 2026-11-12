import React, { useState, useEffect } from 'react';
import { formatINR, formatINRWithDecimals, calculateGSV, calculateSSV } from '../data/policyData';
import { printPolicyReport } from '../utils/pdfExport';

export default function YearDetailModal({ policy, yearData, initialTab = 'premium', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // SSV Interactive State - Default 0% as per Excel sheet
  const [factor1, setFactor1] = useState(yearData.factor1Endowment ?? 0);
  const [factor2, setFactor2] = useState(yearData.factor2WholeLife ?? 0);

  // GSV Interactive State (allows tweaking to explore scenarios)
  const [premiumSVF, setPremiumSVF] = useState(yearData.premiumSVFPercent);
  const [bonusSVF, setBonusSVF] = useState(yearData.bonusSVFPercent);

  // When selected year changes, sync state
  useEffect(() => {
    setActiveTab(initialTab);
    setFactor1(yearData.factor1Endowment ?? 0);
    setFactor2(yearData.factor2WholeLife ?? 0);
    setPremiumSVF(yearData.premiumSVFPercent);
    setBonusSVF(yearData.bonusSVFPercent);
  }, [yearData, initialTab]);

  // Live Recalculations
  const liveGSV = calculateGSV({
    cumulativeBasicPremium: yearData.cumulativeBasicPremium,
    premiumSVFPercent: premiumSVF,
    totalVestedBonus: yearData.cumulativeVestedBonus,
    bonusSVFPercent: bonusSVF
  });

  const liveSSV = calculateSSV({
    sumAssured: policy.sumAssured,
    termYears: policy.termYears,
    policyYear: yearData.year,
    totalVestedBonus: yearData.cumulativeVestedBonus,
    factor1: factor1,
    factor2: factor2
  });

  const payableAmount = Math.max(liveGSV.totalGSV, liveSSV.totalSSV);
  const isSSVHigher = liveSSV.totalSSV >= liveGSV.totalGSV;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">Policy Year {yearData.year}</span>
            <h3 className="modal-title">
              {policy.policyName} ({policy.policyNumber})
            </h3>
            <span className="modal-sub">
              FY {yearData.calendarYearIndia} • Date Paid: {yearData.premiumPaidDate}
            </span>
          </div>

          <div className="modal-header-actions">
            <button 
              onClick={() => printPolicyReport(policy, {
                ...yearData,
                premiumSVFPercent: premiumSVF,
                bonusSVFPercent: bonusSVF,
                gsv1: liveGSV.gsv1,
                gsv2: liveGSV.gsv2,
                totalGSV: liveGSV.totalGSV,
                factor1Endowment: factor1,
                factor2WholeLife: factor2,
                ssv1: liveSSV.ssv1,
                ssv2: liveSSV.ssv2,
                totalSSV: liveSSV.totalSSV
              })} 
              className="btn btn-sm btn-outline-white"
              title="Download or Print PDF Statement"
            >
              📥 Download Year PDF
            </button>
            <button onClick={onClose} className="modal-close-btn" title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* 3 Action Tabs */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'premium' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('premium')}
          >
            📋 1. Premium Detail
          </button>
          <button 
            className={`tab-btn ${activeTab === 'gsv' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('gsv')}
          >
            🛡️ 2. Calculate GSV
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ssv' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('ssv')}
          >
            ⭐ 3. Calculate SSV
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {/* ACTION 1: PREMIUM DETAIL */}
          {activeTab === 'premium' && (
            <div className="tab-content">
              <div className="info-banner">
                <span className="banner-icon">ℹ️</span>
                <div>
                  <strong>Annual Premium Payment Record (Year {yearData.year})</strong>
                  <p>
                    Receipt recorded on <strong>{yearData.premiumPaidDate}</strong> for Financial Year <strong>{yearData.calendarYearIndia}</strong> (USA: {yearData.calendarYearUSA}).
                  </p>
                </div>
              </div>

              <div className="grid-3 mb-4">
                <div className="detail-stat-card">
                  <span className="stat-label">Basic Premium</span>
                  <span className="stat-value">{formatINR(yearData.basicPremium)}</span>
                  <span className="stat-desc">Base policy coverage cost</span>
                </div>
                <div className="detail-stat-card">
                  <span className="stat-label">Rider Premium (Accidental)</span>
                  <span className="stat-value">{formatINR(yearData.riderPremium)}</span>
                  <span className="stat-desc">Accident Benefit Rider</span>
                </div>
                <div className="detail-stat-card">
                  <span className="stat-label">Taxes & Charges</span>
                  <span className="stat-value">{formatINR(yearData.gst + yearData.lateFee)}</span>
                  <span className="stat-desc">
                    GST: {formatINR(yearData.gst)} {yearData.lateFee > 0 ? `• Late: ${formatINR(yearData.lateFee)}` : ''}
                  </span>
                </div>
              </div>

              <div className="highlight-summary-box mb-4">
                <div className="box-left">
                  <div className="box-label">Total Outflow for Year {yearData.year}</div>
                  <div className="box-amount">{formatINR(yearData.totalPaidYear)}</div>
                  <div className="box-sub">
                    Formula: Basic ({formatINR(yearData.basicPremium)}) + Rider ({formatINR(yearData.riderPremium)}) + Late Fee ({formatINR(yearData.lateFee)}) + GST ({formatINR(yearData.gst)})
                  </div>
                </div>
                <div className="box-right">
                  <div className="box-label">Cumulative Basic Premium</div>
                  <div className="box-amount text-blue">{formatINR(yearData.cumulativeBasicPremium)}</div>
                  <div className="box-sub">
                    Total basic premiums paid from Year 1 through Year {yearData.year} ({yearData.year} annual payments)
                  </div>
                </div>
              </div>

              <div className="breakdown-card">
                <h4 className="card-title">Comprehensive Premium Breakdown</h4>
                <table className="breakdown-table">
                  <tbody>
                    <tr>
                      <td className="font-medium">1. Basic Premium (Eligible for Surrender Calculation)</td>
                      <td className="text-right font-bold text-blue">{formatINR(yearData.basicPremium)}</td>
                    </tr>
                    <tr>
                      <td className="font-medium">2. Accidental Death & Disability Benefit Rider</td>
                      <td className="text-right">{formatINR(yearData.riderPremium)}</td>
                    </tr>
                    <tr>
                      <td className="font-medium">3. Late Fee / Interest on Delayed Payment</td>
                      <td className="text-right">{formatINR(yearData.lateFee)}</td>
                    </tr>
                    <tr>
                      <td className="font-medium">4. Goods and Services Tax (GST) / Service Tax</td>
                      <td className="text-right">{formatINR(yearData.gst)}</td>
                    </tr>
                    <tr className="total-row">
                      <td className="font-bold">Total Annual Premium Paid</td>
                      <td className="text-right font-bold">{formatINR(yearData.totalPaidYear)}</td>
                    </tr>
                    <tr className="cum-row">
                      <td className="font-bold">Cumulative Basic Premium (Years 1 to {yearData.year})</td>
                      <td className="text-right font-bold text-blue">{formatINR(yearData.cumulativeBasicPremium)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {yearData.notes && (
                <div className="notes-box">
                  <strong>Special Note:</strong> {yearData.notes}
                </div>
              )}
            </div>
          )}

          {/* ACTION 2: CALCULATE GSV */}
          {activeTab === 'gsv' && (
            <div className="tab-content">
              <div className="formula-callout mb-4">
                <div className="formula-header">GUARANTEED SURRENDER VALUE (GSV) FORMULA</div>
                <div className="formula-expression">
                  GSV = GSV₁ + GSV₂ = (Cumulative Basic Premiums × Premium SVF%) + (Total Vested Bonus × Bonus SVF%)
                </div>
                <p className="formula-desc">
                  Under IRDAI and LIC terms, taxes, late fees, and rider premiums are excluded from surrender calculation.
                </p>
              </div>

              {yearData.year < 3 ? (
                <div className="alert-warning mb-4">
                  ⚠️ <strong>Surrender Value not payable:</strong> Under this policy's terms, at least 3 full years of premiums must be paid before a surrender value is acquired.
                </div>
              ) : null}

              <div className="grid-2 mb-4">
                {/* Step 1: GSV 1 */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <span className="step-tag">Step 1</span>
                    <h4 className="calc-card-title">GSV₁: Basic Premium Component</h4>
                  </div>
                  <div className="calc-card-body">
                    <div className="calc-row">
                      <span>Cumulative Basic Premium:</span>
                      <strong className="text-blue">{formatINR(yearData.cumulativeBasicPremium)}</strong>
                    </div>
                    <div className="calc-row">
                      <span>Premium Surrender Factor (SVF):</span>
                      <div className="interactive-factor-input">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={premiumSVF}
                          onChange={(e) => setPremiumSVF(parseFloat(e.target.value) || 0)}
                          className="factor-number-input"
                        />
                        <span className="percent-sign">%</span>
                      </div>
                    </div>
                    <div className="calc-subtext">
                      Standard factor for Year {yearData.year}: {yearData.premiumSVFPercent}%
                    </div>
                    <div className="calc-divider"></div>
                    <div className="calc-result-row">
                      <span>GSV₁ Value:</span>
                      <span className="calc-result-val text-blue">{formatINRWithDecimals(liveGSV.gsv1)}</span>
                    </div>
                    <div className="calc-math">
                      {formatINR(yearData.cumulativeBasicPremium)} × {premiumSVF}% = {formatINRWithDecimals(liveGSV.gsv1)}
                    </div>
                  </div>
                </div>

                {/* Step 2: GSV 2 */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <span className="step-tag amber-bg">Step 2</span>
                    <h4 className="calc-card-title">GSV₂: Vested Bonus Component</h4>
                  </div>
                  <div className="calc-card-body">
                    <div className="calc-row">
                      <span>Yearly Bonus Rate:</span>
                      <strong>₹{yearData.bonusRate} / ₹1,000 SA</strong>
                    </div>
                    <div className="calc-row">
                      <span>Interim / SRB Bonus this year:</span>
                      <span>{formatINR(yearData.interimBonusSRB)}</span>
                    </div>
                    {yearData.specialLoyaltyAdditionLA > 0 && (
                      <div className="calc-row text-amber">
                        <span>Special / Loyalty Addition (LA):</span>
                        <span>+{formatINR(yearData.specialLoyaltyAdditionLA)}</span>
                      </div>
                    )}
                    <div className="calc-row">
                      <span>Cumulative Vested Bonus:</span>
                      <strong className="text-amber">{formatINR(yearData.cumulativeVestedBonus)}</strong>
                    </div>
                    <div className="calc-row">
                      <span>Bonus Surrender Factor (SVF):</span>
                      <div className="interactive-factor-input">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={bonusSVF}
                          onChange={(e) => setBonusSVF(parseFloat(e.target.value) || 0)}
                          className="factor-number-input"
                        />
                        <span className="percent-sign">%</span>
                      </div>
                    </div>
                    <div className="calc-subtext">
                      Standard factor for Year {yearData.year}: {yearData.bonusSVFPercent}%
                    </div>
                    <div className="calc-divider"></div>
                    <div className="calc-result-row">
                      <span>GSV₂ Value:</span>
                      <span className="calc-result-val text-amber">{formatINRWithDecimals(liveGSV.gsv2)}</span>
                    </div>
                    <div className="calc-math">
                      {formatINR(yearData.cumulativeVestedBonus)} × {bonusSVF}% = {formatINRWithDecimals(liveGSV.gsv2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total GSV Result Banner */}
              <div className="total-gsv-banner">
                <div className="gsv-banner-left">
                  <span className="banner-title-text">TOTAL GUARANTEED SURRENDER VALUE (GSV)</span>
                  <div className="gsv-banner-breakdown">
                    GSV₁ ({formatINRWithDecimals(liveGSV.gsv1)}) + GSV₂ ({formatINRWithDecimals(liveGSV.gsv2)})
                  </div>
                </div>
                <div className="gsv-banner-right">
                  <div className="total-amount-large text-blue">{formatINRWithDecimals(liveGSV.totalGSV)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION 3: CALCULATE SSV */}
          {activeTab === 'ssv' && (
            <div className="tab-content">
              <div className="formula-callout emerald-callout mb-4">
                <div className="formula-header">SPECIAL SURRENDER VALUE (SSV) FORMULA — PLAN 815</div>
                <div className="formula-expression">
                  SSV = SSV₁ (Endowment) + SSV₂ (Residual Whole-Life Cover)
                </div>
                <div className="formula-sub-expressions">
                  <div>• <strong>Component 1 (Endowment):</strong> SSV₁ = (PUSA + Vested Bonus) × (Factor-1 / 100)</div>
                  <div>• <strong>Component 2 (Whole Life):</strong> SSV₂ = PUSA × (1.08)⁻⁽ⁿ⁻ᵈ⁾ × (Factor-2 / 100)</div>
                </div>
              </div>

              {yearData.year < 3 ? (
                <div className="alert-warning mb-4">
                  ⚠️ <strong>Special Surrender Value:</strong> SSV is only payable after paying at least 3 consecutive years of full premiums.
                </div>
              ) : null}

              {/* Policy Parameters */}
              <div className="grid-4 mb-4">
                <div className="param-pill">
                  <span className="param-label">Outstanding Term (n - d)</span>
                  <span className="param-value">{liveSSV.outstandingTerms} Years</span>
                  <span className="param-hint">21 - {yearData.year}</span>
                </div>
                <div className="param-pill">
                  <span className="param-label">Discount Factor</span>
                  <span className="param-value">{(liveSSV.discountFactor).toFixed(4)}</span>
                  <span className="param-hint">(1.08)⁻⁽ⁿ⁻ᵈ⁾</span>
                </div>
                <div className="param-pill">
                  <span className="param-label">Paid-Up Sum Assured (PUSA)</span>
                  <span className="param-value">{formatINR(liveSSV.pusa)}</span>
                  <span className="param-hint">(SA × {yearData.year}) / 21</span>
                </div>
                <div className="param-pill">
                  <span className="param-label">Paid-Up Value (PUV)</span>
                  <span className="param-value">{formatINR(liveSSV.puv)}</span>
                  <span className="param-hint">PUSA + Vested Bonus</span>
                </div>
              </div>

              <div className="grid-2 mb-4">
                {/* Component 1: SSV 1 */}
                <div className="calc-card emerald-border">
                  <div className="calc-card-header">
                    <span className="step-tag emerald-bg">Component 1</span>
                    <h4 className="calc-card-title">SSV₁: Endowment Assurance</h4>
                  </div>
                  <div className="calc-card-body">
                    <div className="calc-row">
                      <span>Paid-Up Value (PUV):</span>
                      <strong className="text-emerald">{formatINR(liveSSV.puv)}</strong>
                    </div>
                    <div className="calc-row">
                      <span>Table 1A Factor (F₁ %):</span>
                      <div className="interactive-factor-input">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={factor1}
                          onChange={(e) => setFactor1(parseFloat(e.target.value) || 0)}
                          className="factor-number-input"
                        />
                        <span className="percent-sign">%</span>
                      </div>
                    </div>
                    <div className="calc-subtext">
                      From Special Surrender Value Master Booklet (Table 1A). Default: 0%
                    </div>
                    <div className="calc-divider"></div>
                    <div className="calc-result-row">
                      <span>SSV₁ Value:</span>
                      <span className="calc-result-val text-emerald">{formatINRWithDecimals(liveSSV.ssv1)}</span>
                    </div>
                    <div className="calc-math">
                      {formatINR(liveSSV.puv)} × ({factor1} / 100) = {formatINRWithDecimals(liveSSV.ssv1)}
                    </div>
                  </div>
                </div>

                {/* Component 2: SSV 2 */}
                <div className="calc-card emerald-border">
                  <div className="calc-card-header">
                    <span className="step-tag emerald-bg">Component 2</span>
                    <h4 className="calc-card-title">SSV₂: Residual Whole Life Cover</h4>
                  </div>
                  <div className="calc-card-body">
                    <div className="calc-row">
                      <span>PUSA × Discount Factor:</span>
                      <strong>{formatINR(liveSSV.pusa * liveSSV.discountFactor)}</strong>
                    </div>
                    <div className="calc-row">
                      <span>Table 2A Factor (F₂ %):</span>
                      <div className="interactive-factor-input">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={factor2}
                          onChange={(e) => setFactor2(parseFloat(e.target.value) || 0)}
                          className="factor-number-input"
                        />
                        <span className="percent-sign">%</span>
                      </div>
                    </div>
                    <div className="calc-subtext">
                      From Special Surrender Value Master Booklet (Table 2A). Default: 0%
                    </div>
                    <div className="calc-divider"></div>
                    <div className="calc-result-row">
                      <span>SSV₂ Value:</span>
                      <span className="calc-result-val text-emerald">{formatINRWithDecimals(liveSSV.ssv2)}</span>
                    </div>
                    <div className="calc-math">
                      {formatINR(liveSSV.pusa)} × {(liveSSV.discountFactor).toFixed(4)} × ({factor2} / 100) = {formatINRWithDecimals(liveSSV.ssv2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total SSV & Comparison Banner */}
              <div className="total-ssv-comparison-box">
                <div className="comparison-metric">
                  <span className="metric-label">Total Special Surrender Value (SSV)</span>
                  <span className="metric-amount text-emerald">{formatINRWithDecimals(liveSSV.totalSSV)}</span>
                  <span className="metric-formula">SSV₁ ({formatINRWithDecimals(liveSSV.ssv1)}) + SSV₂ ({formatINRWithDecimals(liveSSV.ssv2)})</span>
                </div>

                <div className="comparison-vs">VS</div>

                <div className="comparison-metric">
                  <span className="metric-label">Guaranteed Surrender Value (GSV)</span>
                  <span className="metric-amount text-blue">{formatINRWithDecimals(liveGSV.totalGSV)}</span>
                  <span className="metric-formula">GSV₁ + GSV₂</span>
                </div>

                <div className="comparison-verdict">
                  <div className="verdict-tag">PAYABLE SURRENDER VALUE</div>
                  <div className="verdict-amount">{formatINRWithDecimals(payableAmount)}</div>
                  <div className="verdict-note">
                    {isSSVHigher 
                      ? `SSV is higher by ${formatINRWithDecimals(liveSSV.totalSSV - liveGSV.totalGSV)}. LIC pays SSV.` 
                      : `GSV is higher by ${formatINRWithDecimals(liveGSV.totalGSV - liveSSV.totalSSV)}. LIC pays GSV.`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-left">
            <span className="footer-policy-info">
              LIC Policy #{policy.policyNumber} • Year {yearData.year} ({yearData.calendarYearIndia})
            </span>
          </div>
          <div className="footer-right">
            <button 
              onClick={() => printPolicyReport(policy, {
                ...yearData,
                premiumSVFPercent: premiumSVF,
                bonusSVFPercent: bonusSVF,
                gsv1: liveGSV.gsv1,
                gsv2: liveGSV.gsv2,
                totalGSV: liveGSV.totalGSV,
                factor1Endowment: factor1,
                factor2WholeLife: factor2,
                ssv1: liveSSV.ssv1,
                ssv2: liveSSV.ssv2,
                totalSSV: liveSSV.totalSSV
              })} 
              className="btn btn-primary"
            >
              📥 Download PDF Report
            </button>
            <button onClick={onClose} className="btn btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

