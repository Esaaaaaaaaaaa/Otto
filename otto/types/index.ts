export type EffusionType = "serous" | "mucoid" | "hemotympanum" | "glue";

export type PathologyType =
  | "normal"
  | "serous_effusion"
  | "mucoid_effusion"
  | "hemotympanum"
  | "acute_otitis_media"
  | "tm_retraction"
  | "tm_bulging"
  | "tm_perforation"
  | "cholesteatoma"
  | "tympanostomy_tube";

export interface PathologyOverlay {
  id: PathologyType;
  label: string;
  description: string;
  color: string;
  opacity: number;
  enabled: boolean;
}

export interface OverlaySettings {
  vignetteEnabled: boolean;
  vignetteSize: number; // 0-1, portion of screen
  pathologies: PathologyOverlay[];
  effusionType: EffusionType | null;
  effusionOpacity: number;
  airFluidLevel: boolean;
  airFluidLevelPosition: number; // 0-1, vertical position
}

export interface DiagnosisOption {
  id: PathologyType;
  label: string;
}

export interface AssessmentCase {
  id: string;
  pathology: PathologyType;
  options: DiagnosisOption[];
  description: string;
}

export interface AssessmentResult {
  caseId: string;
  selectedAnswer: PathologyType;
  correctAnswer: PathologyType;
  isCorrect: boolean;
  timestamp: number;
}

export interface SessionScore {
  id: string;
  date: number;
  totalCases: number;
  correctAnswers: number;
  results: AssessmentResult[];
}

export type AppMode = "live" | "training" | "assessment";

export interface ReferenceImage {
  id: string;
  pathology: PathologyType;
  label: string;
  description: string;
  imageUri: string;
}
