import { useState, useCallback } from "react";
import {
  AppMode,
  OverlaySettings,
  PathologyOverlay,
  EffusionType,
  AssessmentResult,
  SessionScore,
  PathologyType,
} from "@/types";
import { PATHOLOGY_OVERLAYS, ASSESSMENT_CASES } from "@/constants/pathologies";

const defaultOverlaySettings: OverlaySettings = {
  vignetteEnabled: true,
  vignetteSize: 0.85,
  pathologies: PATHOLOGY_OVERLAYS.map((p) => ({ ...p })),
  effusionType: null,
  effusionOpacity: 0.35,
  airFluidLevel: false,
  airFluidLevelPosition: 0.5,
};

export function useAppState() {
  const [mode, setMode] = useState<AppMode>("live");
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(
    defaultOverlaySettings
  );
  const [showControls, setShowControls] = useState(false);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [assessmentResults, setAssessmentResults] = useState<
    AssessmentResult[]
  >([]);
  const [sessionHistory, setSessionHistory] = useState<SessionScore[]>([]);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  const toggleVignette = useCallback(() => {
    setOverlaySettings((prev) => ({
      ...prev,
      vignetteEnabled: !prev.vignetteEnabled,
    }));
  }, []);

  const setVignetteSize = useCallback((size: number) => {
    setOverlaySettings((prev) => ({
      ...prev,
      vignetteSize: Math.max(0.3, Math.min(1, size)),
    }));
  }, []);

  const togglePathology = useCallback((id: string) => {
    setOverlaySettings((prev) => ({
      ...prev,
      pathologies: prev.pathologies.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    }));
  }, []);

  const setEffusionType = useCallback((type: EffusionType | null) => {
    setOverlaySettings((prev) => ({
      ...prev,
      effusionType: type,
    }));
  }, []);

  const setEffusionOpacity = useCallback((opacity: number) => {
    setOverlaySettings((prev) => ({
      ...prev,
      effusionOpacity: Math.max(0, Math.min(1, opacity)),
    }));
  }, []);

  const toggleAirFluidLevel = useCallback(() => {
    setOverlaySettings((prev) => ({
      ...prev,
      airFluidLevel: !prev.airFluidLevel,
    }));
  }, []);

  const setAirFluidLevelPosition = useCallback((position: number) => {
    setOverlaySettings((prev) => ({
      ...prev,
      airFluidLevelPosition: Math.max(0, Math.min(1, position)),
    }));
  }, []);

  const startAssessment = useCallback(() => {
    setMode("assessment");
    setCurrentCaseIndex(0);
    setAssessmentResults([]);
    setAssessmentComplete(false);
  }, []);

  const submitAnswer = useCallback(
    (selectedAnswer: PathologyType) => {
      const currentCase = ASSESSMENT_CASES[currentCaseIndex];
      if (!currentCase) return;

      const result: AssessmentResult = {
        caseId: currentCase.id,
        selectedAnswer,
        correctAnswer: currentCase.pathology,
        isCorrect: selectedAnswer === currentCase.pathology,
        timestamp: Date.now(),
      };

      const newResults = [...assessmentResults, result];
      setAssessmentResults(newResults);

      if (currentCaseIndex < ASSESSMENT_CASES.length - 1) {
        setCurrentCaseIndex((prev) => prev + 1);
      } else {
        const session: SessionScore = {
          id: `session_${Date.now()}`,
          date: Date.now(),
          totalCases: ASSESSMENT_CASES.length,
          correctAnswers: newResults.filter((r) => r.isCorrect).length,
          results: newResults,
        };
        setSessionHistory((prev) => [...prev, session]);
        setAssessmentComplete(true);
      }
    },
    [currentCaseIndex, assessmentResults]
  );

  const resetOverlays = useCallback(() => {
    setOverlaySettings(defaultOverlaySettings);
  }, []);

  return {
    mode,
    setMode,
    overlaySettings,
    showControls,
    setShowControls,
    toggleVignette,
    setVignetteSize,
    togglePathology,
    setEffusionType,
    setEffusionOpacity,
    toggleAirFluidLevel,
    setAirFluidLevelPosition,
    resetOverlays,
    currentCaseIndex,
    assessmentResults,
    assessmentComplete,
    sessionHistory,
    startAssessment,
    submitAnswer,
  };
}
