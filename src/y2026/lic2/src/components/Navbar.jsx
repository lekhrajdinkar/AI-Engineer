import React from 'react';
import { printPolicyReport } from '../utils/pdfExport';

export default function Navbar({ policy, onSelectPolicy, policies, onOpenGuide }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand-group">
          <div className="brand-emblem">LIC</div>
          <div>
            <h1 className="brand-title">LIC Surrender Value Calculator</h1>
            <p className="brand-subtitle">Plan 815: New Jeevan Anand • Policy Analytics & Quotation</p>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="policy-selector-wrapper">
            <label className="selector-label">Policy No:</label>
            <select 
              value={policy.policyNumber} 
              onChange={(e) => {
                const found = policies.find(p => p.policyNumber === e.target.value);
                if (found) onSelectPolicy(found);
              }}
              className="policy-select"
            >
              {policies.map(p => (
                <option key={p.policyNumber} value={p.policyNumber}>
                  {p.policyNumber} - {p.policyName}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={onOpenGuide}
            className="btn btn-outline"
            title="Surrender Rules & Formula Guide"
          >
            ℹ️ Guide
          </button>

          <button 
            onClick={() => printPolicyReport(policy)}
            className="btn btn-primary"
            title="Download or Print full policy statement as PDF"
          >
            📥 Download Statement (PDF)
          </button>
        </div>
      </div>
    </header>
  );
}

