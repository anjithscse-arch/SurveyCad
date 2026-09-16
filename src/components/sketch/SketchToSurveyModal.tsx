import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { SketchViewer } from './SketchViewer';
import { VerificationPanel } from './VerificationPanel';
import { SketchComparison } from './SketchComparison';
import { generateGoldenSampleSketchDataUrl } from '../../sketch/sampleSketch';
import { OfflineSketchAnalyzer } from '../../sketch/SketchAnalyzer';
import { reconstructSurveyFromObservations } from '../../sketch/reconstruction/reconstructSurvey';
import {
  PointCandidate,
  LineCandidate,
  MeasurementCandidate,
  NorthArrowCandidate,
  SurveyObservation,
  ReconstructedSurveyResult,
} from '../../sketch/types';
import { SetPolygonBoundaryCommand } from '../../commands/polygonCommands';
import {
  X,
  Upload,
  FileImage,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface SketchToSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WorkflowStep = 'upload' | 'verify' | 'compare';

export const SketchToSurveyModal: React.FC<SketchToSurveyModalProps> = ({ isOpen, onClose }) => {
  const { project, executeCommand, setProject } = useCAD();

  const [step, setStep] = useState<WorkflowStep>('upload');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number>(800);
  const [imageHeight, setImageHeight] = useState<number>(600);

  // Analysis detection state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [points, setPoints] = useState<PointCandidate[]>([]);
  const [lines, setLines] = useState<LineCandidate[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementCandidate[]>([]);
  const [northArrow, setNorthArrow] = useState<NorthArrowCandidate | undefined>(undefined);
  const [observations, setObservations] = useState<SurveyObservation[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Reconstructed result
  const [reconstructed, setReconstructed] = useState<ReconstructedSurveyResult | null>(null);

  if (!isOpen) return null;

  // Load the Golden Test Case sample sketch
  const handleLoadGoldenSample = () => {
    const sample = generateGoldenSampleSketchDataUrl();
    setImageDataUrl(sample.dataUrl);
    setImageWidth(sample.width);
    setImageHeight(sample.height);

    // Populate initial candidates from sample ground-truth
    setPoints(sample.groundTruthResult.points);
    setLines(sample.groundTruthResult.lines);
    setMeasurements(sample.groundTruthResult.measurements);
    setNorthArrow(sample.groundTruthResult.northArrow);

    // Initial observations
    const initialObs: SurveyObservation[] = [
      {
        id: 'obs_1',
        fromLabel: 'A',
        toLabel: 'B',
        distance: 20.0,
        bearing: 90.0,
        source: 'ocr',
        confidence: 0.96,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'obs_2',
        fromLabel: 'B',
        toLabel: 'C',
        distance: 30.0,
        bearing: 0.0,
        source: 'ocr',
        confidence: 0.96,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'obs_3',
        fromLabel: 'C',
        toLabel: 'D',
        distance: 20.0,
        bearing: 270.0,
        source: 'ocr',
        confidence: 0.96,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'obs_4',
        fromLabel: 'D',
        toLabel: 'A',
        distance: 30.0,
        bearing: 180.0,
        source: 'ocr',
        confidence: 0.96,
        verified: true,
        status: 'accepted',
      },
    ];
    setObservations(initialObs);
    setStep('verify');
  };

  // Handle image upload from user device
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        setImageWidth(img.width || 800);
        setImageHeight(img.height || 600);
        analyzeUploadedImage(img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Analyze uploaded image using the offline analyzer
  const analyzeUploadedImage = async (img: HTMLImageElement) => {
    setIsAnalyzing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const analyzer = new OfflineSketchAnalyzer();
      const result = await analyzer.analyze(canvas);

      setPoints(result.points);
      setLines(result.lines);
      setMeasurements(result.measurements);
      setNorthArrow(result.northArrow);

      // Generate candidate observations from measurements
      const initialObs: SurveyObservation[] = result.measurements
        .filter((m) => m.type === 'distance' && m.suggestedFrom && m.suggestedTo)
        .map((m, idx) => ({
          id: `obs_${idx}`,
          fromLabel: m.suggestedFrom!,
          toLabel: m.suggestedTo!,
          distance: m.value,
          source: 'ocr',
          confidence: m.confidence,
          verified: true,
          status: 'accepted',
        }));

      setObservations(initialObs);
      setStep('verify');
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reconstruct digital survey
  const handleReconstruct = () => {
    const res = reconstructSurveyFromObservations(observations, { x: 0, y: 0 });
    setReconstructed(res);
    setStep('compare');
  };

  // Commit reconstructed survey to the main SurveyCAD project
  const handleCommit = () => {
    if (!reconstructed || reconstructed.points.length === 0) return;

    // Direct injection into SurveyCAD project
    setProject((prev) => ({
      ...prev,
      points: [...reconstructed.points],
      lines: [...reconstructed.lines],
      polygons: reconstructed.polygon ? [reconstructed.polygon] : [],
      metadata: {
        ...prev.metadata,
        notes: `${prev.metadata.notes}\n[Imported from Field Sketch at ${new Date().toLocaleTimeString()}]`,
        updatedAt: new Date().toISOString(),
      },
    }));

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          width: '92vw',
          height: '90vh',
          maxWidth: '1400px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '10px 16px', background: 'var(--bg-panel-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={14} />
            </div>
            <span className="modal-title" style={{ fontSize: 14 }}>
              Sketch-to-Survey (Smart Sketch Import)
            </span>
            <span
              style={{
                fontSize: 10,
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(56,189,248,0.3)',
              }}
            >
              Offline-First & Deterministic
            </span>
          </div>

          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {step === 'upload' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: 40,
              }}
            >
              <div style={{ textAlign: 'center', maxWidth: 520 }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 8 }}>
                  Transform Rough Sketches into Exact CAD Geometry
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Upload a scanned survey field notebook page, hand-drawn sketch, or photograph. SurveyCAD extracts candidate stations and dimensions, and allows you to confirm measurements before reconstructing the digital CAD boundary.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                style={{
                  width: '460px',
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 10,
                  padding: '36px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  background: 'rgba(0,0,0,0.2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                  <Upload size={22} />
                </div>
                <div style={{ fontSize: 13, fontWeight: '600' }}>
                  Choose a sketch file or drag & drop here
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Supports JPG, PNG, WEBP, and PDF files
                </div>

                <label className="btn-primary" style={{ cursor: 'pointer', marginTop: 8 }}>
                  <FileImage size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Select File
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {/* Golden Test Case Quick Loader */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Or test immediately with a pre-configured drawing:</span>
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px' }}
                  onClick={handleLoadGoldenSample}
                >
                  <Sparkles size={14} color="var(--accent-amber)" />
                  Load Golden Test Case Sketch (20m × 30m Boundary)
                </button>
              </div>

              {/* Mandatory User Notice (§40) */}
              <div
                style={{
                  maxWidth: 580,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  color: '#fde68a',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>
                  Extracted measurements and geometry are suggestions generated from the uploaded sketch. Verify all measurements and survey observations before using the resulting drawing for professional or legal purposes.
                </span>
              </div>
            </div>
          )}

          {step === 'verify' && imageDataUrl && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left 60%: Interactive Sketch Viewer */}
              <div style={{ flex: '0 0 60%', height: '100%', position: 'relative', borderRight: '1px solid var(--border-subtle)' }}>
                <SketchViewer
                  imageDataUrl={imageDataUrl}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  points={points}
                  lines={lines}
                  measurements={measurements}
                  northArrow={northArrow}
                  selectedId={selectedOverlayId}
                  onSelect={(id) => setSelectedOverlayId(id)}
                />
              </div>

              {/* Right 40%: Human Verification Panel */}
              <div style={{ flex: '0 0 40%', height: '100%', padding: '14px', background: 'var(--bg-panel-solid)', overflowY: 'auto' }}>
                <VerificationPanel
                  points={points}
                  observations={observations}
                  onUpdateObservation={(updated) => {
                    setObservations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
                  }}
                  onDeleteObservation={(id) => {
                    setObservations((prev) => prev.filter((o) => o.id !== id));
                  }}
                  onAddObservation={(newObs) => {
                    setObservations((prev) => [...prev, newObs]);
                  }}
                  onAcceptAll={() => {
                    setObservations((prev) =>
                      prev.map((o) => ({ ...o, status: 'accepted', verified: true }))
                    );
                  }}
                  onReconstruct={handleReconstruct}
                />
              </div>
            </div>
          )}

          {step === 'compare' && imageDataUrl && reconstructed && (
            <div style={{ flex: 1, padding: 14, overflow: 'hidden' }}>
              <SketchComparison
                imageDataUrl={imageDataUrl}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                reconstructed={reconstructed}
                onCommit={handleCommit}
                onBackToVerification={() => setStep('verify')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
