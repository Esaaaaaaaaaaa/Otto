import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AssessmentCase, AssessmentResult, PathologyType } from "@/types";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

interface AssessmentPanelProps {
  currentCase: AssessmentCase;
  caseNumber: number;
  totalCases: number;
  onSubmit: (answer: PathologyType) => void;
  lastResult: AssessmentResult | null;
}

export function AssessmentPanel({
  currentCase,
  caseNumber,
  totalCases,
  onSubmit,
  lastResult,
}: AssessmentPanelProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<PathologyType | null>(
    null
  );
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    if (!showFeedback) {
      setShowFeedback(true);
      onSubmit(selectedAnswer);
    } else {
      // Move to next case
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const isCorrect = lastResult?.isCorrect;

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(caseNumber / totalCases) * 100}%` },
          ]}
        />
      </View>

      <Text style={styles.caseLabel}>
        Case {caseNumber} of {totalCases}
      </Text>
      <Text style={styles.caseDescription}>{currentCase.description}</Text>

      {/* Options */}
      <View style={styles.options}>
        {currentCase.options.map((option) => {
          let optionStyle = styles.option;
          let textStyle = styles.optionText;

          if (showFeedback) {
            if (option.id === currentCase.pathology) {
              optionStyle = { ...styles.option, ...styles.optionCorrect };
              textStyle = { ...styles.optionText, ...styles.optionTextActive };
            } else if (
              option.id === selectedAnswer &&
              option.id !== currentCase.pathology
            ) {
              optionStyle = { ...styles.option, ...styles.optionIncorrect };
              textStyle = { ...styles.optionText, ...styles.optionTextActive };
            }
          } else if (option.id === selectedAnswer) {
            optionStyle = { ...styles.option, ...styles.optionSelected };
            textStyle = { ...styles.optionText, ...styles.optionTextActive };
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={optionStyle}
              onPress={() => !showFeedback && setSelectedAnswer(option.id)}
              disabled={showFeedback}
            >
              <Text style={textStyle}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feedback */}
      {showFeedback && (
        <View
          style={[
            styles.feedback,
            isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
          ]}
        >
          <Text style={styles.feedbackText}>
            {isCorrect ? "Correct!" : "Incorrect"}
          </Text>
        </View>
      )}

      {/* Submit / Next */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          !selectedAnswer && !showFeedback && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!selectedAnswer && !showFeedback}
      >
        <Text style={styles.submitButtonText}>
          {showFeedback
            ? caseNumber === totalCases
              ? "View Results"
              : "Next Case"
            : "Submit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface AssessmentResultsProps {
  results: AssessmentResult[];
  totalCases: number;
  onRestart: () => void;
  onExit: () => void;
}

export function AssessmentResults({
  results,
  totalCases,
  onRestart,
  onExit,
}: AssessmentResultsProps) {
  const correct = results.filter((r) => r.isCorrect).length;
  const percentage = Math.round((correct / totalCases) * 100);

  return (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTitle}>Assessment Complete</Text>

      <View style={styles.scoreCircle}>
        <Text style={styles.scorePercentage}>{percentage}%</Text>
        <Text style={styles.scoreLabel}>
          {correct}/{totalCases} correct
        </Text>
      </View>

      <Text style={styles.scoreFeedback}>
        {percentage >= 80
          ? "Excellent work!"
          : percentage >= 60
            ? "Good effort — review the conditions you missed."
            : "More practice recommended. Try Training mode first."}
      </Text>

      <View style={styles.resultsButtons}>
        <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
          <Text style={styles.restartButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Back to Live</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  caseLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  caseDescription: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: "500",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(74, 158, 255, 0.15)",
  },
  optionCorrect: {
    borderColor: Colors.correct,
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  optionIncorrect: {
    borderColor: Colors.incorrect,
    backgroundColor: "rgba(255, 74, 74, 0.15)",
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  optionTextActive: {
    color: Colors.text,
  },
  feedback: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: "rgba(0, 212, 170, 0.2)",
  },
  feedbackIncorrect: {
    backgroundColor: "rgba(255, 74, 74, 0.2)",
  },
  feedbackText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  submitButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  resultsContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    zIndex: 200,
  },
  resultsTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.xl,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  scorePercentage: {
    color: Colors.text,
    fontSize: FontSize.title,
    fontWeight: "700",
  },
  scoreLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  scoreFeedback: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  resultsButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  restartButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  restartButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  exitButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
  },
  exitButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
});
