import React, { useState } from 'react';
import { formatINR, formatINRWithDecimals } from '../data/policyData';

export default function YearTable({ policy, onSelectYear, selectedYear }) {
  const [filterTerm, setFilterTerm] = useState('');

  const filteredYears = policy.years.filter(y => {
    if (!filterTerm) return true;
    return (
      y.year.toString().includes(filterTerm) ||
      y.calendarYearIndia.toLowerCase().includes(filterTerm.toLowerCase()) ||
      y.calendarYearUSA.includes(filterTerm) ||
      y.premiumPaidDate.includes(filterTerm)
    );
  });

  return (
    <div className="table-section">
      <div className="table-header-row">
        <div>
          <h3 className="section-heading">Policy Year Progression & Calculations</h3>
          <p className="section-subheading">
            Click on any specific policy year to inspect <strong>Premium Detail</strong>, <strong>Calculate GSV</strong>, and <strong>Calculate SSV</strong>.
          </p>
        </div>

        <div className="table-filter-group">
          <input
            type="text"
            placeholder="Search year or date (e.g. 2020)..."
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="lic-table">
          <thead>
            <tr>
              <th className="text-center">Year (d)</th>
              <th>Financial Year</th>
              <th>Date Paid</th>
              <th className="text-right">Basic Prem. (₹)</th>
              <th className="text-right">Cum. Basic (₹)</th>
              <th className="text-right">Vested Bonus (₹)</th>
              <th className="text-right">Guaranteed SV (GSV)</th>
              <th className="text-right">Special SV (SSV)</th>
              <th className="text-right highlight-col">Payable SV (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredYears.map((row) => {
              const isSelected = selectedYear && selectedYear.year === row.year;
              const payableSV = Math.max(row.totalGSV, row.totalSSV);
              const isEligible = row.year >= 3;

              return (
                <tr 
                  key={row.year} 
                  className={`table-row ${isSelected ? 'active-row' : ''} ${!isEligible ? 'ineligible-row' : ''}`}
                  onClick={() => onSelectYear(row)}
                >
                  <td className="text-center">
                    <span className="year-pill">Year {row.year}</span>
                  </td>
                  <td>
                    <div className="fy-text">{row.calendarYearIndia}</div>
                    <div className="usa-sub">{row.calendarYearUSA} (Jan-Dec)</div>
                  </td>
                  <td>
                    <span className="date-tag">{row.premiumPaidDate}</span>
                  </td>
                  <td className="text-right font-medium">
                    {formatINR(row.basicPremium)}
                  </td>
                  <td className="text-right font-semibold">
                    {formatINR(row.cumulativeBasicPremium)}
                  </td>
                  <td className="text-right font-semibold text-amber">
                    {formatINR(row.cumulativeVestedBonus)}
                  </td>
                  <td className="text-right font-semibold text-blue">
                    {isEligible ? formatINRWithDecimals(row.totalGSV) : 'Nil'}
                  </td>
                  <td className="text-right font-semibold text-emerald">
                    {isEligible ? formatINRWithDecimals(row.totalSSV) : 'Nil'}
                  </td>
                  <td className="text-right font-bold highlight-cell">
                    {isEligible ? formatINRWithDecimals(payableSV) : 'Not Payable'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer-legend">
        <div className="legend-item">
          <span className="legend-dot blue"></span>
          <span><strong>GSV:</strong> Guaranteed Surrender Value = (Cum Basic Prem × Prem SVF%) + (Vested Bonus × Bonus SVF%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot emerald"></span>
          <span><strong>SSV:</strong> Special Surrender Value = SSV1 (Endowment) + SSV2 (Residual Whole Life)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot amber"></span>
          <span><strong>Payable SV:</strong> LIC always pays <em>MAX(GSV, SSV)</em> on policy surrender</span>
        </div>
      </div>
    </div>
  );
}

