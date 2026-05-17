# MarkerDetector

Android app for custom marker detection built with React Native.

## Setup Instructions

1. Clone the repo
2. Run `npm install --legacy-peer-deps`
3. Run `npx react-native run-android`

## How it works

1. Open the app
2. Point camera at Marker 1
3. Press Capture button
4. Crop the marker tightly in the cropper
5. Repeat 20 times
6. View all 20 captured markers at 300x300px

## Tech Stack

- React Native 0.76
- react-native-vision-camera
- react-native-image-crop-picker
- react-native-fs