import React, { useState } from 'react';
import { LIC_POLICIES } from './data/policyData';
import Navbar from './components/Navbar';
import PolicySummaryCard from './components/PolicySummaryCard';
import YearTable from './components/YearTable';
import YearDetailModal from './components/YearDetailModal';
import GuideModal from './components/GuideModal';

export default function App() {
  const [policies, setPolicies] = useState(LIC_POLICIES);
  const [selectedPolicy, setSelectedPolicy] = useState(LIC_POLICIES[0]);
  const [activeYearModal, setActiveYearModal] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState('premium');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Handler to open year modal with specific action tab
  const handleOpenYearDetail = (yearRow, tab = 'premium') => {
    setActiveYearModal(yearRow);
    setModalInitialTab(tab);
  };

  const handleCloseModal = () => {
    setActiveYearModal(null);
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar 
        policy={selectedPolicy} 
        policies={policies}
        onSelectPolicy={setSelectedPolicy}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Dashboard Summary Cards */}
          <PolicySummaryCard policy={selectedPolicy} />

          {/* All Year Data Table & 3-Action Launcher */}
          <YearTable 
            policy={selectedPolicy} 
            selectedYear={activeYearModal}
            onSelectYear={handleOpenYearDetail}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>
            LIC Policy Surrender Value Calculator • Reference Sheet: <code>surrender_value_sheet-117130147-v5(2).xlsx</code>
          </p>
          <p className="footer-subtext">
            For illustrative and calculation purposes based on LIC Plan 815 rules and IRDAI regulations. Always consult official LIC branch records for final settlement.
          </p>
        </div>
      </footer>

      {/* Detail Modal with 3 Actions (Premium Detail, GSV, SSV) */}
      {activeYearModal && (
        <YearDetailModal 
          policy={selectedPolicy}
          yearData={activeYearModal}
          initialTab={modalInitialTab}
          onClose={handleCloseModal}
        />
      )}

      {/* Guide & Rules Modal */}
      {isGuideOpen && (
        <GuideModal onClose={() => setIsGuideOpen(false)} />
      )}
    </div>
  );
}

