import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { PATHOLOGY_INFO } from "@/constants/pathologies";
import { PathologyType } from "@/types";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

interface TrainingPanelProps {
  visible: boolean;
}

const pathologyKeys = Object.keys(PATHOLOGY_INFO) as PathologyType[];

export function TrainingPanel({ visible }: TrainingPanelProps) {
  const [selectedPathology, setSelectedPathology] =
    useState<PathologyType>("normal");
  const [showAnnotations, setShowAnnotations] = useState(true);

  if (!visible) return null;

  const info = PATHOLOGY_INFO[selectedPathology];

  return (
    <View style={styles.container}>
      {/* Condition selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.conditionScroll}
        contentContainerStyle={styles.conditionScrollContent}
      >
        {pathologyKeys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.conditionChip,
              selectedPathology === key && styles.conditionChipActive,
            ]}
            onPress={() => setSelectedPathology(key)}
          >
            <Text
              style={[
                styles.conditionChipText,
                selectedPathology === key && styles.conditionChipTextActive,
              ]}
              numberOfLines={1}
            >
              {PATHOLOGY_INFO[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Info card */}
      {showAnnotations && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{info.label}</Text>
          <Text style={styles.infoDescription}>{info.description}</Text>
        </View>
      )}

      {/* Toggle annotations */}
      <TouchableOpacity
        style={styles.annotationToggle}
        onPress={() => setShowAnnotations(!showAnnotations)}
      >
        <Text style={styles.annotationToggleText}>
          {showAnnotations ? "Hide" : "Show"} Annotations
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingBottom: Spacing.xl,
  },
  conditionScroll: {
    maxHeight: 44,
    marginBottom: Spacing.sm,
  },
  conditionScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conditionChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  conditionChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  conditionChipTextActive: {
    color: Colors.text,
  },
  infoCard: {
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  infoDescription: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  annotationToggle: {
    alignSelf: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  annotationToggleText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
