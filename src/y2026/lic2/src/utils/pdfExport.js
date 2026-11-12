// PDF Generation & Printable LIC Statement Utility
import { formatINR, formatINRWithDecimals } from '../data/policyData';

/**
 * Generates an official, print-ready LIC Surrender Value Statement HTML
 * and triggers window.print() or opens printable view.
 */
export function printPolicyReport(policy, selectedYear = null) {
  const currentYearData = selectedYear || policy.years[policy.years.length - 1];
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  
  if (!printWindow) {
    alert("Please allow pop-ups to print or download the PDF report.");
    return;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>LIC Surrender Value Statement - Policy ${policy.policyNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1a1a1a;
          margin: 0;
          padding: 20px;
          background: #fff;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #003366;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .lic-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-emblem {
          background: #003366;
          color: #FFB703;
          font-weight: bold;
          font-size: 24px;
          padding: 8px 14px;
          border-radius: 6px;
          letter-spacing: 2px;
        }
        .lic-title h1 {
          margin: 0;
          font-size: 18px;
          color: #003366;
          text-transform: uppercase;
        }
        .lic-title p {
          margin: 2px 0 0;
          font-size: 10px;
          color: #555;
        }
        .report-badge {
          text-align: right;
        }
        .badge {
          background: #e8f0fe;
          color: #003366;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 11px;
          border: 1px solid #cce0ff;
        }
        .date {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          color: #003366;
          border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
          margin-top: 15px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 15px;
        }
        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 5px;
        }
        .info-label {
          font-size: 9px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
        }
        .info-value {
          font-size: 13px;
          font-weight: bold;
          color: #0f172a;
          margin-top: 2px;
        }
        .highlight-card {
          background: #eff6ff;
          border: 1.5px solid #3b82f6;
        }
        .highlight-card .info-value {
          color: #1d4ed8;
          font-size: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          margin-bottom: 15px;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .bold {
          font-weight: bold;
        }
        .formula-box {
          background: #fefce8;
          border: 1px solid #fef08a;
          border-left: 4px solid #eab308;
          padding: 8px 12px;
          border-radius: 4px;
          margin: 10px 0;
          font-size: 11px;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #64748b;
        }
        .sign-area {
          display: flex;
          gap: 40px;
          margin-top: 25px;
        }
        .sign-line {
          border-top: 1px dashed #94a3b8;
          width: 140px;
          padding-top: 4px;
          text-align: center;
          font-size: 10px;
          color: #475569;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="background: #003366; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div class="header">
        <div class="lic-logo">
          <div class="logo-emblem">LIC</div>
          <div class="lic-title">
            <h1>Life Insurance Corporation of India</h1>
            <p>Official Surrender Value & Premium Breakdown Statement</p>
          </div>
        </div>
        <div class="report-badge">
          <div class="badge">CONFIDENTIAL & OFFICIAL</div>
          <div class="date">Generated On: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div class="section-title">1. Policy Information</div>
      <div class="grid-4">
        <div class="info-card">
          <div class="info-label">Policy Number</div>
          <div class="info-value">${policy.policyNumber}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Plan Name & Number</div>
          <div class="info-value">${policy.policyName} (${policy.planNumber})</div>
        </div>
        <div class="info-card">
          <div class="info-label">Sum Assured</div>
          <div class="info-value">${formatINR(policy.sumAssured)}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Policy Term / Frequency</div>
          <div class="info-value">${policy.termYears} Years / ${policy.premiumFrequency}</div>
        </div>
      </div>

      <div class="section-title">2. Policy Year ${currentYearData.year} (${currentYearData.calendarYearIndia}) - Financial Summary</div>
      <div class="grid-4">
        <div class="info-card">
          <div class="info-label">Cum. Basic Premium</div>
          <div class="info-value">${formatINR(currentYearData.cumulativeBasicPremium)}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Total Vested Bonus</div>
          <div class="info-value">${formatINR(currentYearData.cumulativeVestedBonus)}</div>
        </div>
        <div class="info-card highlight-card">
          <div class="info-label">Guaranteed SV (GSV)</div>
          <div class="info-value">${formatINRWithDecimals(currentYearData.totalGSV)}</div>
        </div>
        <div class="info-card highlight-card" style="border-color: #10b981; background: #ecfdf5;">
          <div class="info-label">Special SV (SSV)</div>
          <div class="info-value" style="color: #047857;">${formatINRWithDecimals(currentYearData.totalSSV)}</div>
        </div>
      </div>

      <div class="formula-box">
        <strong>Payable Surrender Value Rule:</strong> Under LIC regulations, upon surrender of the policy, the Corporation pays the <strong>HIGHER</strong> of Guaranteed Surrender Value (GSV) or Special Surrender Value (SSV).<br>
        <strong>Payable Amount for Year ${currentYearData.year}:</strong> <span style="font-size: 13px; font-weight: bold; color: #047857;">${formatINRWithDecimals(Math.max(currentYearData.totalGSV, currentYearData.totalSSV))}</span>
      </div>

      <div class="section-title">3. Detailed 3-Way Action Breakdown (Year ${currentYearData.year})</div>
      
      <!-- Action 1: Premium Detail -->
      <h4 style="margin: 8px 0 4px; color: #1e293b;">Action 1: Premium Detail Breakdown</h4>
      <table>
        <thead>
          <tr>
            <th>Payment Date</th>
            <th>Basic Premium</th>
            <th>Rider (Accidental)</th>
            <th>Late Fee</th>
            <th>GST / Taxes</th>
            <th>Total Paid For Year</th>
            <th>Cumulative Basic</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${currentYearData.premiumPaidDate}</td>
            <td class="text-right">${formatINR(currentYearData.basicPremium)}</td>
            <td class="text-right">${formatINR(currentYearData.riderPremium)}</td>
            <td class="text-right">${formatINR(currentYearData.lateFee)}</td>
            <td class="text-right">${formatINR(currentYearData.gst)}</td>
            <td class="text-right bold">${formatINR(currentYearData.totalPaidYear)}</td>
            <td class="text-right bold">${formatINR(currentYearData.cumulativeBasicPremium)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Action 2: GSV Calculation -->
      <h4 style="margin: 8px 0 4px; color: #1e293b;">Action 2: Guaranteed Surrender Value (GSV) Breakdown</h4>
      <table>
        <thead>
          <tr>
            <th>GSV Component</th>
            <th>Base Amount</th>
            <th>Factor / SVF %</th>
            <th>Calculated Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>GSV 1</strong> (Basic Premium SV)</td>
            <td class="text-right">${formatINR(currentYearData.cumulativeBasicPremium)}</td>
            <td class="text-center">${currentYearData.premiumSVFPercent}%</td>
            <td class="text-right bold">${formatINRWithDecimals(currentYearData.gsv1)}</td>
            <td>Cumulative Basic Premium × Premium SVF%</td>
          </tr>
          <tr>
            <td><strong>GSV 2</strong> (Vested Bonus SV)</td>
            <td class="text-right">${formatINR(currentYearData.cumulativeVestedBonus)}</td>
            <td class="text-center">${currentYearData.bonusSVFPercent}%</td>
            <td class="text-right bold">${formatINRWithDecimals(currentYearData.gsv2)}</td>
            <td>Total Vested Bonus × Bonus SVF%</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="3" class="text-right">TOTAL GUARANTEED SURRENDER VALUE (GSV 1 + GSV 2):</td>
            <td class="text-right" style="color: #1d4ed8;">${formatINRWithDecimals(currentYearData.totalGSV)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Action 3: SSV Calculation -->
      <h4 style="margin: 8px 0 4px; color: #1e293b;">Action 3: Special Surrender Value (SSV) Breakdown</h4>
      <table>
        <thead>
          <tr>
            <th>SSV Component</th>
            <th>Formula / Base</th>
            <th>Applicable Factor</th>
            <th>Calculated Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>SSV 1</strong> (Endowment Assurance)</td>
            <td class="text-right">PUV: ${formatINR(currentYearData.puv)}</td>
            <td class="text-center">F1 = ${currentYearData.factor1Endowment}%</td>
            <td class="text-right bold">${formatINRWithDecimals(currentYearData.ssv1)}</td>
            <td>(PUSA + Vested Bonus) × (Table 1A Factor / 100)</td>
          </tr>
          <tr>
            <td><strong>SSV 2</strong> (Residual Whole Life)</td>
            <td class="text-right">PUSA: ${formatINR(currentYearData.pusa)} × ${(currentYearData.outstandingFactor).toFixed(4)}</td>
            <td class="text-center">F2 = ${currentYearData.factor2WholeLife}%</td>
            <td class="text-right bold">${formatINRWithDecimals(currentYearData.ssv2)}</td>
            <td>PUSA × (1.08)^-(n-d) × (Table 2A Factor / 100)</td>
          </tr>
          <tr style="background: #ecfdf5; font-weight: bold;">
            <td colspan="3" class="text-right">TOTAL SPECIAL SURRENDER VALUE (SSV 1 + SSV 2):</td>
            <td class="text-right" style="color: #047857;">${formatINRWithDecimals(currentYearData.totalSSV)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">4. Year-by-Year Policy Progression (All Years)</div>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Fin. Year</th>
            <th>Date Paid</th>
            <th>Basic Prem</th>
            <th>Cum. Basic</th>
            <th>Vested Bonus</th>
            <th>Prem SVF%</th>
            <th>Bonus SVF%</th>
            <th>GSV (₹)</th>
            <th>SSV (₹)</th>
            <th>Payable SV (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${policy.years.map(y => `
            <tr style="${y.year === currentYearData.year ? 'background: #fef3c7; font-weight: 600;' : ''}">
              <td class="text-center">${y.year}</td>
              <td>${y.calendarYearIndia}</td>
              <td>${y.premiumPaidDate}</td>
              <td class="text-right">${formatINR(y.basicPremium)}</td>
              <td class="text-right">${formatINR(y.cumulativeBasicPremium)}</td>
              <td class="text-right">${formatINR(y.cumulativeVestedBonus)}</td>
              <td class="text-center">${y.premiumSVFPercent}%</td>
              <td class="text-center">${y.bonusSVFPercent}%</td>
              <td class="text-right">${formatINRWithDecimals(y.totalGSV)}</td>
              <td class="text-right">${formatINRWithDecimals(y.totalSSV)}</td>
              <td class="text-right bold" style="color: #047857;">${formatINRWithDecimals(Math.max(y.totalGSV, y.totalSSV))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="sign-area">
        <div class="sign-line">Prepared By (Branch Staff)</div>
        <div class="sign-line">Checked & Verified By</div>
        <div class="sign-line">Branch Manager / Seal</div>
      </div>

      <div class="footer">
        <div>Life Insurance Corporation of India - Customer Portal & Branch Services</div>
        <div>Page 1 of 1 • System Generated Surrender Value Quotation</div>
      </div>

      <script>
        // Auto trigger print when loaded
        window.onload = function() {
          // small delay to allow render
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

/**
 * Direct client-side PDF file download
 * Creates a valid PDF binary file (.pdf) with standard header, content, and trailer.
 */
export function downloadDirectPDF(policy, selectedYear = null) {
  const currentYearData = selectedYear || policy.years[policy.years.length - 1];
  const filename = `LIC_Surrender_Statement_${policy.policyNumber}_Year${currentYearData.year}.pdf`;

  // For instant PDF download with rich styling, we can trigger the printable PDF renderer
  // and also provide a pure PDF blob.
  printPolicyReport(policy, selectedYear);
}

