import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import Slider from "@/components/Slider";
import { OverlaySettings, EffusionType } from "@/types";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

interface ControlPanelProps {
  settings: OverlaySettings;
  onToggleVignette: () => void;
  onVignetteSizeChange: (size: number) => void;
  onTogglePathology: (id: string) => void;
  onEffusionTypeChange: (type: EffusionType | null) => void;
  onEffusionOpacityChange: (opacity: number) => void;
  onToggleAirFluidLevel: () => void;
  onAirFluidLevelPositionChange: (position: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const EFFUSION_OPTIONS: { key: EffusionType | "none"; label: string }[] = [
  { key: "none", label: "None" },
  { key: "serous", label: "Serous" },
  { key: "mucoid", label: "Mucoid" },
  { key: "hemotympanum", label: "Hemo" },
  { key: "glue", label: "Glue" },
];

export function ControlPanel({
  settings,
  onToggleVignette,
  onVignetteSizeChange,
  onTogglePathology,
  onEffusionTypeChange,
  onEffusionOpacityChange,
  onToggleAirFluidLevel,
  onAirFluidLevelPositionChange,
  onReset,
  onClose,
}: ControlPanelProps) {
  const [section, setSection] = useState<"overlays" | "effusion" | "vignette">(
    "overlays"
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Controls</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section tabs */}
      <View style={styles.sectionTabs}>
        {(["overlays", "effusion", "vignette"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sectionTab, section === s && styles.sectionTabActive]}
            onPress={() => setSection(s)}
          >
            <Text
              style={[
                styles.sectionTabText,
                section === s && styles.sectionTabTextActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pathology overlays */}
        {section === "overlays" && (
          <View>
            {settings.pathologies.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.toggleRow}
                onPress={() => onTogglePathology(p.id)}
              >
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: p.color },
                    p.enabled && styles.indicatorActive,
                  ]}
                />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{p.label}</Text>
                  <Text style={styles.toggleDesc} numberOfLines={2}>
                    {p.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    p.enabled && styles.toggleSwitchActive,
                  ]}
                >
                  <Text style={styles.toggleSwitchText}>
                    {p.enabled ? "ON" : "OFF"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Effusion settings */}
        {section === "effusion" && (
          <View>
            <Text style={styles.sectionLabel}>Physical Gel Insert</Text>
            <View style={styles.effusionOptions}>
              {EFFUSION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.effusionOption,
                    (opt.key === "none"
                      ? settings.effusionType === null
                      : settings.effusionType === opt.key) &&
                      styles.effusionOptionActive,
                  ]}
                  onPress={() =>
                    onEffusionTypeChange(opt.key === "none" ? null : opt.key)
                  }
                >
                  <Text
                    style={[
                      styles.effusionOptionText,
                      (opt.key === "none"
                        ? settings.effusionType === null
                        : settings.effusionType === opt.key) &&
                        styles.effusionOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {settings.effusionType && (
              <>
                <Text style={styles.sectionLabel}>Overlay Opacity</Text>
                <Slider
                  value={settings.effusionOpacity}
                  onValueChange={onEffusionOpacityChange}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                />

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={onToggleAirFluidLevel}
                >
                  <Text style={styles.toggleLabel}>Air-Fluid Level</Text>
                  <View
                    style={[
                      styles.toggleSwitch,
                      settings.airFluidLevel && styles.toggleSwitchActive,
                    ]}
                  >
                    <Text style={styles.toggleSwitchText}>
                      {settings.airFluidLevel ? "ON" : "OFF"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {settings.airFluidLevel && (
                  <>
                    <Text style={styles.sectionLabel}>Level Position</Text>
                    <Slider
                      value={settings.airFluidLevelPosition}
                      onValueChange={onAirFluidLevelPositionChange}
                      minimumValue={0.1}
                      maximumValue={0.9}
                      step={0.05}
                    />
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Vignette settings */}
        {section === "vignette" && (
          <View>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={onToggleVignette}
            >
              <Text style={styles.toggleLabel}>Otoscope Vignette</Text>
              <View
                style={[
                  styles.toggleSwitch,
                  settings.vignetteEnabled && styles.toggleSwitchActive,
                ]}
              >
                <Text style={styles.toggleSwitchText}>
                  {settings.vignetteEnabled ? "ON" : "OFF"}
                </Text>
              </View>
            </TouchableOpacity>

            {settings.vignetteEnabled && (
              <>
                <Text style={styles.sectionLabel}>Field of View</Text>
                <Slider
                  value={settings.vignetteSize}
                  onValueChange={onVignetteSizeChange}
                  minimumValue={0.3}
                  maximumValue={1}
                  step={0.05}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "60%",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: "700",
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  resetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  resetText: {
    color: Colors.warning,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  closeText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  sectionTabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  sectionTabActive: {
    backgroundColor: Colors.surfaceLight,
  },
  sectionTabText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  sectionTabTextActive: {
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
    opacity: 0.5,
  },
  indicatorActive: {
    opacity: 1,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  toggleDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  toggleSwitch: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    minWidth: 44,
    alignItems: "center",
  },
  toggleSwitchActive: {
    backgroundColor: Colors.primary,
  },
  toggleSwitchText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  effusionOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  effusionOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  effusionOptionActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  effusionOptionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  effusionOptionTextActive: {
    color: Colors.text,
  },
});
