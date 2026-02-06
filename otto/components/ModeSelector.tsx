import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AppMode } from "@/types";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const modes: { key: AppMode; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "training", label: "Training" },
  { key: "assessment", label: "Assessment" },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <View style={styles.container}>
      {modes.map((m) => (
        <TouchableOpacity
          key={m.key}
          style={[styles.tab, currentMode === m.key && styles.tabActive]}
          onPress={() => onModeChange(m.key)}
        >
          <Text
            style={[
              styles.tabText,
              currentMode === m.key && styles.tabTextActive,
            ]}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 2,
    marginHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: "700",
  },
});
