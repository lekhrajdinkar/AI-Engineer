import React from 'react';

export default function GuideModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container guide-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">Documentation & Reference</span>
            <h3 className="modal-title">LIC Surrender Value Calculation Guide</h3>
            <span className="modal-sub">Rules, Formulas & Actuarial Guidelines for LIC Plan 815 (New Jeevan Anand)</span>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">✕</button>
        </div>

        <div className="modal-body guide-body">
          <section className="guide-section">
            <h4 className="guide-heading">1. Introduction to LIC Plan 815 (New Jeevan Anand)</h4>
            <p>
              LIC's <strong>New Jeevan Anand (Table No. 815)</strong> is a participating non-linked combination of an <strong>Endowment Assurance</strong> and a <strong>Whole Life</strong> plan.
              It offers financial protection against death throughout the lifetime of the policyholder with a provision of payment of lump sum at the end of the selected policy term in case of survival.
            </p>
          </section>

          <section className="guide-section">
            <h4 className="guide-heading">2. Surrender Eligibility Rules</h4>
            <ul>
              <li><strong>Minimum Premium Payment:</strong> The policy can be surrendered for cash after at least <strong>3 consecutive full years</strong> of premiums have been paid (under the older IRDAI framework).</li>
              <li><strong>What is Excluded:</strong> Any extra premiums, accidental death rider premiums, taxes (GST/Service Tax), and late payment interest are excluded from surrender value calculations.</li>
              <li><strong>Payable Value:</strong> LIC pays the <strong>HIGHER</strong> of:
                <ol>
                  <li><strong>Guaranteed Surrender Value (GSV)</strong></li>
                  <li><strong>Special Surrender Value (SSV)</strong></li>
                </ol>
              </li>
            </ul>
          </section>

          <section className="guide-section">
            <h4 className="guide-heading">3. Guaranteed Surrender Value (GSV)</h4>
            <div className="formula-box">
              <strong>GSV Formula:</strong><br />
              <code>GSV = GSV₁ + GSV₂ = (Cumulative Basic Premiums × Premium SVF%) + (Total Vested Bonus × Bonus SVF%)</code>
            </div>
            <ul>
              <li><strong>GSV₁:</strong> Cumulative basic premium paid multiplied by the Guaranteed Surrender Value factor (Premium SVF%). Starts at 30% in Year 3, rises to 50% in Year 4–7, and gradually reaches 63.85%+ by Year 13.</li>
              <li><strong>GSV₂:</strong> Surrender value of total vested bonuses multiplied by Bonus SVF% (ranges between ~15.93% in Year 3 to 19.18%+ in Year 13).</li>
            </ul>
          </section>

          <section className="guide-section">
            <h4 className="guide-heading">4. Special Surrender Value (SSV)</h4>
            <p>Because Plan 815 combines an endowment savings element and a residual whole life element, SSV is computed in two distinct components:</p>
            <div className="formula-box">
              <strong>SSV Formula:</strong><br />
              <code>SSV = SSV₁ (Endowment) + SSV₂ (Residual Whole-Life)</code><br /><br />
              <strong>Component 1 (Endowment Assurance):</strong><br />
              <code>SSV₁ = PUV × (Factor-1 / 100)</code><br />
              where <code>PUV = PUSA + Vested Bonus</code> and <code>PUSA = (Sum Assured × Duration Elapsed) / Policy Term</code><br /><br />
              <strong>Component 2 (Residual Whole Life):</strong><br />
              <code>SSV₂ = PUSA × (1.08)⁻⁽ⁿ⁻ᵈ⁾ × (Factor-2 / 100)</code><br />
              where <code>(1.08)⁻⁽ⁿ⁻ᵈ⁾</code> is the 8% annual present-value discount factor for outstanding term <code>(n - d)</code>.
            </div>
            <ul>
              <li><strong>Factor-1 (F₁ %):</strong> Endowment surrender factor from Table 1A of LIC's Special Surrender Value Master Booklet based on duration elapsed and outstanding term.</li>
              <li><strong>Factor-2 (F₂ %):</strong> Whole life surrender factor from Table 2A based on age and term.</li>
            </ul>
          </section>

          <section className="guide-section">
            <h4 className="guide-heading">5. Reference to Resource Excel Sheet</h4>
            <p>
              All baseline values, dates, premiums, taxes, and factors in this application are directly extracted and verified against:
              <code>src\y2026\lic\resource\surrender_value_sheet-117130147-v5(2).xlsx</code>
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">Understood</button>
        </div>
      </div>
    </div>
  );
}

