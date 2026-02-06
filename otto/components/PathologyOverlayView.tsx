import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Ellipse,
  Line,
} from "react-native-svg";
import { OverlaySettings } from "@/types";
import { EFFUSION_COLORS } from "@/constants/pathologies";

interface PathologyOverlayViewProps {
  settings: OverlaySettings;
}

const { width, height } = Dimensions.get("window");
const cx = width / 2;
const cy = height / 2;
const radius = Math.min(width, height) * 0.4;

export function PathologyOverlayView({ settings }: PathologyOverlayViewProps) {
  const activePathologies = settings.pathologies.filter((p) => p.enabled);

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {/* Effusion gradient — fills from bottom up */}
          <LinearGradient id="effusionGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="transparent" stopOpacity="0" />
            <Stop
              offset="0.4"
              stopColor={
                settings.effusionType
                  ? EFFUSION_COLORS[settings.effusionType]
                  : "transparent"
              }
              stopOpacity={settings.effusionOpacity * 0.3}
            />
            <Stop
              offset="1"
              stopColor={
                settings.effusionType
                  ? EFFUSION_COLORS[settings.effusionType]
                  : "transparent"
              }
              stopOpacity={settings.effusionOpacity}
            />
          </LinearGradient>

          {/* Bulging gradient — centre pushes outward */}
          <RadialGradient id="bulgingGrad" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor="rgba(255, 180, 50, 0.3)"
              stopOpacity="0.3"
            />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>

          {/* Retraction — darker centre */}
          <RadialGradient id="retractionGrad" cx="50%" cy="45%" r="40%">
            <Stop
              offset="0"
              stopColor="rgba(0, 0, 0, 0.25)"
              stopOpacity="0.25"
            />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Effusion overlay */}
        {settings.effusionType && (
          <Ellipse
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius}
            fill="url(#effusionGrad)"
          />
        )}

        {/* Air-fluid level line */}
        {settings.airFluidLevel && settings.effusionType && (
          <Line
            x1={cx - radius * 0.7}
            y1={cy + radius * (settings.airFluidLevelPosition - 0.5) * 1.4}
            x2={cx + radius * 0.7}
            y2={cy + radius * (settings.airFluidLevelPosition - 0.5) * 1.4}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
        )}

        {/* Pathology-specific overlays */}
        {activePathologies.map((pathology) => {
          if (pathology.id === "tm_bulging") {
            return (
              <Ellipse
                key={pathology.id}
                cx={cx}
                cy={cy}
                rx={radius * 0.6}
                ry={radius * 0.6}
                fill="url(#bulgingGrad)"
              />
            );
          }
          if (pathology.id === "tm_retraction") {
            return (
              <Ellipse
                key={pathology.id}
                cx={cx}
                cy={cy * 0.95}
                rx={radius * 0.5}
                ry={radius * 0.45}
                fill="url(#retractionGrad)"
              />
            );
          }
          // General colour tint overlay for other pathologies
          return (
            <Ellipse
              key={pathology.id}
              cx={cx}
              cy={cy}
              rx={radius}
              ry={radius}
              fill={pathology.color}
              opacity={pathology.opacity}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});
