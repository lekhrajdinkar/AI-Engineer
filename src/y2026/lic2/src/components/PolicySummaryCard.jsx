import React from 'react';
import { formatINR, formatINRWithDecimals } from '../data/policyData';

export default function PolicySummaryCard({ policy }) {
  const latestYear = policy.years[policy.years.length - 1];
  const higherSV = Math.max(latestYear.totalGSV, latestYear.totalSSV);
  const isSSVHigher = latestYear.totalSSV > latestYear.totalGSV;
  const diff = Math.abs(latestYear.totalSSV - latestYear.totalGSV);

  return (
    <div className="summary-section">
      <div className="policy-meta-card">
        <div className="meta-left">
          <div className="policy-tag">Plan {policy.planNumber}</div>
          <h2 className="policy-heading">{policy.policyName}</h2>
          <div className="meta-details-grid">
            <div className="meta-item">
              <span className="meta-label">Policy Number</span>
              <span className="meta-value highlight-num">{policy.policyNumber}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Sum Assured</span>
              <span className="meta-value">{formatINR(policy.sumAssured)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Policy Term</span>
              <span className="meta-value">{policy.termYears} Years</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Commencement Date</span>
              <span className="meta-value">{policy.commencementDate}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Premium Mode</span>
              <span className="meta-value">{policy.premiumFrequency}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Basic Premium / Yr</span>
              <span className="meta-value">{formatINR(policy.basicPremium)}</span>
            </div>
          </div>
        </div>

        <div className="meta-right-banner">
          <div className="banner-title">Current Payable Surrender Value</div>
          <div className="banner-amount">{formatINRWithDecimals(higherSV)}</div>
          <div className="banner-badge">
            {isSSVHigher 
              ? 'Special Surrender Value (SSV) Applies' 
              : 'Guaranteed Surrender Value (GSV) Applies'}
          </div>
          <div className="banner-subtext">
            {latestYear.totalSSV === 0
              ? 'LIC pays the higher of GSV or SSV. (Default F1/F2 are 0% as per Excel sheet; enter factors in SSV tab to compute SSV).'
              : `LIC pays the higher of GSV or SSV. (${isSSVHigher ? 'SSV' : 'GSV'} is +${formatINRWithDecimals(diff)} higher).`}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">Cumulative Basic Premium</span>
            <span className="kpi-value">{formatINR(latestYear.cumulativeBasicPremium)}</span>
            <span className="kpi-caption">Paid over {latestYear.year} completed years</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper amber">⭐</div>
          <div className="kpi-content">
            <span className="kpi-label">Total Vested Bonus</span>
            <span className="kpi-value">{formatINR(latestYear.cumulativeVestedBonus)}</span>
            <span className="kpi-caption">Simple Reversionary + Special Bonus</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper indigo">🛡️</div>
          <div className="kpi-content">
            <span className="kpi-label">Guaranteed Surrender Value</span>
            <span className="kpi-value">{formatINRWithDecimals(latestYear.totalGSV)}</span>
            <span className="kpi-caption">GSV1 ({formatINR(latestYear.gsv1)}) + GSV2 ({formatINR(latestYear.gsv2)})</span>
          </div>
        </div>

        <div className="kpi-card highlight-kpi">
          <div className="kpi-icon-wrapper emerald">🏆</div>
          <div className="kpi-content">
            <span className="kpi-label">Special Surrender Value (SSV)</span>
            <span className="kpi-value emerald-text">
              {latestYear.totalSSV > 0 ? formatINRWithDecimals(latestYear.totalSSV) : '₹0.00 (F1/F2: 0%)'}
            </span>
            <span className="kpi-caption">
              {latestYear.totalSSV > 0 ? 'SSV1 Endowment + SSV2 Whole Life' : 'Click year to input Table 1A & 2A factors'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

