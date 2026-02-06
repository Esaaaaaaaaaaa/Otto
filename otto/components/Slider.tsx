import React, { useRef } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from "react-native";
import { Colors, BorderRadius } from "@/constants/theme";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
}

export default function Slider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 0.01,
}: SliderProps) {
  const widthRef = useRef(0);

  const proportion = (value - minimumValue) / (maximumValue - minimumValue);

  const handleLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  const computeValue = (pageX: number) => {
    const ratio = Math.max(0, Math.min(1, pageX / widthRef.current));
    let raw = minimumValue + ratio * (maximumValue - minimumValue);
    if (step > 0) {
      raw = Math.round(raw / step) * step;
    }
    return Math.max(minimumValue, Math.min(maximumValue, raw));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onValueChange(computeValue(evt.nativeEvent.locationX));
      },
      onPanResponderMove: (evt) => {
        onValueChange(computeValue(evt.nativeEvent.locationX));
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${proportion * 100}%` }]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          { left: `${proportion * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: "center",
    marginVertical: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: -10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});
