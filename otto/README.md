# Otto — Otoscopy Training Simulator

A smartphone-based otoscopy training interface built with React Native (Expo). The phone attaches to a physical ear canal model and acts as the otoscope viewer.

## Features

- **Live Camera View** — Fullscreen rear camera feed with circular otoscope vignette overlay
- **Pathology Overlays** — Simulate effusions (serous, mucoid, hemotympanum), TM retraction/bulging, and more
- **Effusion Simulation** — Adjust overlay parameters to complement physical gel inserts in the model
- **Training Mode** — Browse conditions with clinical descriptions and annotations
- **Assessment Mode** — Diagnose cases from the live view with scoring and feedback

## Getting Started

```bash
cd otto
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) to run on your device.

## Tech Stack

- React Native + Expo SDK 52
- TypeScript
- expo-camera for live camera feed
- react-native-svg for vignette and pathology overlays
- expo-router for navigation
