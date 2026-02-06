import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

interface VignetteOverlayProps {
  size: number; // 0–1 ratio of visible area
}

const { width, height } = Dimensions.get("window");

export function VignetteOverlay({ size }: VignetteOverlayProps) {
  // The gradient radius controls how much of the centre is clear
  // A larger `size` = more visible area = larger clear centre
  const gradientRadius = size * 0.5;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient
            id="vignette"
            cx="50%"
            cy="50%"
            r={`${gradientRadius * 100}%`}
            fx="50%"
            fy="50%"
          >
            <Stop offset="0.6" stopColor="black" stopOpacity="0" />
            <Stop offset="0.85" stopColor="black" stopOpacity="0.7" />
            <Stop offset="1" stopColor="black" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#vignette)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
