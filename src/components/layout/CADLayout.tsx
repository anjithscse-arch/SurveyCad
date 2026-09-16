import React, { useState } from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { CADToolbar } from '../toolbar/CADToolbar';
import { CADCanvas } from '../canvas/CADCanvas';
import { PointTable } from '../panels/PointTable';
import { LineTable } from '../panels/LineTable';
import { AreaResultPanel } from '../panels/AreaResultPanel';
import { ClosurePanel } from '../panels/ClosurePanel';
import { PropertyPanel } from '../panels/PropertyPanel';
import { CoordinateEntryModal } from '../modals/CoordinateEntryModal';
import { TraverseModal } from '../modals/TraverseModal';
import { CSVImportModal } from '../modals/CSVImportModal';
import { NewProjectModal } from '../modals/NewProjectModal';
import { SettingsModal } from '../modals/SettingsModal';
import { SketchToSurveyModal } from '../sketch/SketchToSurveyModal';
import { CurveModal } from '../modals/CurveModal';
import { useCAD } from '../../context/CADContext';

export const CADLayout: React.FC = () => {
  const { project, selectedPointIds, selectedLineIds } = useCAD();

  const [activeDrawerTab, setActiveDrawerTab] = useState<'survey' | 'area' | 'inspector'>('survey');

  // Modals state
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
  const [isTraverseModalOpen, setIsTraverseModalOpen] = useState(false);
  const [isCurveModalOpen, setIsCurveModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);

  // Auto-switch to inspector when selecting something if on survey tab
  React.useEffect(() => {
    if (selectedPointIds.length > 0 || selectedLineIds.length > 0) {
      // Optional: switch to inspector
    }
  }, [selectedPointIds, selectedLineIds]);

  return (
    <div className="cad-app">
      {/* 1. Top Navigation & Action Header */}
      <Header
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenCoordinateModal={() => setIsCoordModalOpen(true)}
        onOpenTraverseModal={() => setIsTraverseModalOpen(true)}
        onOpenCurveModal={() => setIsCurveModalOpen(true)}
        onOpenCSVImportModal={() => setIsCSVModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSketchModal={() => setIsSketchModalOpen(true)}
      />

      {/* 2. Main CAD Workspace (Toolbar + Canvas + Right Drawer) */}
      <main className="cad-workspace">
        {/* Action Toolbar on Left */}
        <CADToolbar
          onOpenCoordinateModal={() => setIsCoordModalOpen(true)}
          onOpenTraverseModal={() => setIsTraverseModalOpen(true)}
          onOpenCurveModal={() => setIsCurveModalOpen(true)}
          onOpenSketchModal={() => setIsSketchModalOpen(true)}
        />

        {/* CAD SVG Canvas in Center */}
        <CADCanvas />

        {/* Survey Data & Calculations Drawer on Right */}
        <aside className="cad-side-drawer">
          {/* Drawer Tab Headers */}
          <div className="drawer-tabs">
            <button
              className={`drawer-tab ${activeDrawerTab === 'survey' ? 'active' : ''}`}
              onClick={() => setActiveDrawerTab('survey')}
            >
              Survey Data ({project.points.length})
            </button>
            <button
              className={`drawer-tab ${activeDrawerTab === 'area' ? 'active' : ''}`}
              onClick={() => setActiveDrawerTab('area')}
            >
              Area & Closure
            </button>
            <button
              className={`drawer-tab ${activeDrawerTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveDrawerTab('inspector')}
            >
              Inspector
            </button>
          </div>

          {/* Drawer Tab Content */}
          <div className="drawer-content">
            {activeDrawerTab === 'survey' && (
              <>
                <PointTable onOpenCoordinateModal={() => setIsCoordModalOpen(true)} />
                <LineTable />
              </>
            )}

            {activeDrawerTab === 'area' && (
              <>
                <AreaResultPanel />
                <ClosurePanel />
              </>
            )}

            {activeDrawerTab === 'inspector' && (
              <PropertyPanel />
            )}
          </div>
        </aside>
      </main>

      {/* 3. Bottom Status Bar */}
      <StatusBar />

      {/* Modals */}
      <CoordinateEntryModal
        isOpen={isCoordModalOpen}
        onClose={() => setIsCoordModalOpen(false)}
      />

      <TraverseModal
        isOpen={isTraverseModalOpen}
        onClose={() => setIsTraverseModalOpen(false)}
      />

      <CurveModal
        isOpen={isCurveModalOpen}
        onClose={() => setIsCurveModalOpen(false)}
      />

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <SketchToSurveyModal
        isOpen={isSketchModalOpen}
        onClose={() => setIsSketchModalOpen(false)}
      />
    </div>
  );
};
