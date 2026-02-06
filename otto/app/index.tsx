import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { VignetteOverlay } from "@/components/VignetteOverlay";
import { PathologyOverlayView } from "@/components/PathologyOverlayView";
import { ModeSelector } from "@/components/ModeSelector";
import { ControlPanel } from "@/components/ControlPanel";
import { TrainingPanel } from "@/components/TrainingPanel";
import {
  AssessmentPanel,
  AssessmentResults,
} from "@/components/AssessmentPanel";
import { useAppState } from "@/hooks/useAppState";
import { ASSESSMENT_CASES } from "@/constants/pathologies";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

export default function OtoscopeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const {
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
    startAssessment,
    submitAnswer,
  } = useAppState();

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.centred}>
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centred}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Otto uses your rear camera as the otoscope viewer. Grant camera access
          to continue.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCase = ASSESSMENT_CASES[currentCaseIndex];
  const lastResult =
    assessmentResults.length > 0
      ? assessmentResults[assessmentResults.length - 1]
      : null;

  return (
    <View style={styles.container}>
      {/* Camera feed — fullscreen, behind everything */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="picture"
      />

      {/* Pathology overlays */}
      <PathologyOverlayView settings={overlaySettings} />

      {/* Vignette overlay */}
      {overlaySettings.vignetteEnabled && (
        <VignetteOverlay size={overlaySettings.vignetteSize} />
      )}

      {/* Top bar — mode selector + controls toggle */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <ModeSelector currentMode={mode} onModeChange={setMode} />

        {mode === "live" && (
          <TouchableOpacity
            style={styles.controlsToggle}
            onPress={() => setShowControls(!showControls)}
          >
            <Text style={styles.controlsToggleText}>
              {showControls ? "Hide" : "Controls"}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Live mode — control panel */}
      {mode === "live" && showControls && (
        <ControlPanel
          settings={overlaySettings}
          onToggleVignette={toggleVignette}
          onVignetteSizeChange={setVignetteSize}
          onTogglePathology={togglePathology}
          onEffusionTypeChange={setEffusionType}
          onEffusionOpacityChange={setEffusionOpacity}
          onToggleAirFluidLevel={toggleAirFluidLevel}
          onAirFluidLevelPositionChange={setAirFluidLevelPosition}
          onReset={resetOverlays}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* Training mode — info panel */}
      {mode === "training" && <TrainingPanel visible />}

      {/* Assessment mode */}
      {mode === "assessment" && !assessmentComplete && currentCase && (
        <AssessmentPanel
          currentCase={currentCase}
          caseNumber={currentCaseIndex + 1}
          totalCases={ASSESSMENT_CASES.length}
          onSubmit={submitAnswer}
          lastResult={lastResult}
        />
      )}

      {/* Assessment results */}
      {mode === "assessment" && assessmentComplete && (
        <AssessmentResults
          results={assessmentResults}
          totalCases={ASSESSMENT_CASES.length}
          onRestart={startAssessment}
          onExit={() => setMode("live")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: Spacing.sm,
  },
  controlsToggle: {
    alignSelf: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(26, 26, 26, 0.7)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlsToggleText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  centred: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  permissionTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  permissionButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
});
