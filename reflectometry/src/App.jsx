import React, { useState, useEffect } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useReflectometryAnalysis } from './hooks/useReflectometryAnalysis';
import CalibrationPanel from './components/CalibrationPanel';
import TestPanel from './components/TestPanel';
import ResultsPanel from './components/ResultsPanel';

const STEPS = [
  { key: 'calibrate', label: 'Calibrate' },
  { key: 'test', label: 'Test' },
  { key: 'results', label: 'Results' },
];

export default function App() {
  const [step, setStep] = useState('calibrate');
  const audioEngine = useAudioEngine();
  const analysis = useReflectometryAnalysis();

  // Clean up audio on unmount
  useEffect(() => {
    return () => audioEngine.cleanup();
  }, []);

  const handleCalibrationComplete = () => {
    setStep('test');
  };

  const handleTestComplete = () => {
    setStep('results');
  };

  const handleTestAgain = () => {
    analysis.clearTest();
    setStep('test');
  };

  const handleTestOtherEar = () => {
    analysis.clearTest();
    setStep('test');
  };

  const handleRecalibrate = () => {
    analysis.reset();
    setStep('calibrate');
  };

  return (
    <div className="min-h-dvh bg-clinical-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-clinical-bg/80 backdrop-blur-lg border-b border-clinical-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-clinical-accent" />
            <h1 className="text-base font-bold text-clinical-heading">Otto</h1>
          </div>
          <span className="text-xs text-clinical-muted">Acoustic Reflectometry</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => {
            const stepIndex = STEPS.findIndex((st) => st.key === step);
            const isActive = s.key === step;
            const isCompleted = i < stepIndex;

            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <ChevronRight className={`w-3.5 h-3.5 ${
                    isCompleted ? 'text-clinical-accent' : 'text-clinical-border'
                  }`} />
                )}
                <span
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    isActive
                      ? 'bg-clinical-accent/15 text-clinical-accent'
                      : isCompleted
                        ? 'text-clinical-accent'
                        : 'text-clinical-muted'
                  }`}
                >
                  {s.label}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {step === 'calibrate' && (
          <CalibrationPanel
            audioEngine={audioEngine}
            analysis={analysis}
            onComplete={handleCalibrationComplete}
          />
        )}

        {step === 'test' && (
          <TestPanel
            audioEngine={audioEngine}
            analysis={analysis}
            onComplete={handleTestComplete}
            onRecalibrate={handleRecalibrate}
          />
        )}

        {step === 'results' && (
          <ResultsPanel
            results={analysis.testResults}
            sessionHistory={analysis.sessionHistory}
            onTestAgain={handleTestAgain}
            onTestOtherEar={handleTestOtherEar}
            onRecalibrate={handleRecalibrate}
          />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 pb-8 pt-4" />
    </div>
  );
}
