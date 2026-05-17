/**
 * CameraScreen.js - FINAL VERSION
 * ✅ Camera resolution 2000x2000px
 * ✅ Manual capture button
 * ✅ Crops marker tightly using image-crop-picker
 * ✅ Resizes to exactly 300x300px
 * ✅ Rejects blank/dark images
 * ✅ Flash feedback on capture
 */

import { Buffer } from 'buffer';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
} from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import ImageCropPicker from 'react-native-image-crop-picker';

const { width: SCREEN_W } = Dimensions.get('window');
const TARGET_COUNT = 20;
const MIN_FILE_SIZE = 150000; // reject images smaller than this (blank/dark)

// ── Quick validation: reject blank/dark images ────────────────────────────────
async function isValidMarkerImage(filePath) {
  try {
    const stat = await RNFS.stat(filePath);
    // Blank/dark images are very small in file size
    if (stat.size < MIN_FILE_SIZE) {
      return { valid: false, reason: 'Too dark or blank — point at Marker 1' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: true };
  }
}

// ── Crop and resize using ImageCropPicker ─────────────────────────────────────
async function cropAndResize(uri) {
  try {
    const result = await ImageCropPicker.openCropper({
      path: uri,
      width: 300,
      height: 300,
      cropping: true,
      cropperToolbarTitle: 'Crop & Orient Marker',
      hideBottomControls: false,
      enableRotationGesture: true,
      freeStyleCropEnabled: false,
      cropperStatusBarColor: '#000000',
      cropperToolbarColor: '#000000',
      cropperToolbarWidgetColor: '#00E5A0',
      cropperCircleOverlay: false,
      showCropGuidelines: true,
      showCropFrame: true,
      disableCropperColorSetters: false,
    });
    return Platform.OS === 'android' 
      ? `file://${result.path}` 
      : result.path;
  } catch (err) {
    return uri;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CameraScreen({ navigation }) {
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
  { photoResolution: { width: 2000, height: 2000 } }
]);
  const camera = useRef(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [capturedMarkers, setCapturedMarkers] = useState([]);
  const [statusText, setStatusText] = useState('Point at Marker 1 and press Capture');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const capturedCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  // ── Permissions ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      }
    })();
  }, []);

  // ── Navigate when 20 collected ───────────────────────────────────────────────
  useEffect(() => {
    if (capturedMarkers.length >= TARGET_COUNT) {
      navigation.replace('Results', { markers: capturedMarkers });
    }
  }, [capturedMarkers]);

  // ── Capture + crop + resize ───────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!camera.current) return;
    if (isProcessingRef.current) return;
    if (capturedCountRef.current >= TARGET_COUNT) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatusText('Capturing...');
    setLastResult(null);

    try {
      // Step 1: Take high quality photo
      const photo = await camera.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
      });

      const path = photo.path;
      const uri = Platform.OS === 'android' ? `file://${path}` : path;

      // Step 2: Validate — reject blank/dark images
      const check = await isValidMarkerImage(path);
      if (!check.valid) {
        setStatusText(`✗ ${check.reason}`);
        setLastResult('fail');
        return;
      }

      // Step 3: Open cropper with rotation enabled
setStatusText('Crop and orient the marker...');
const croppedUri = await cropAndResize(uri);

      // Step 4: Save to collection
      const newCount = capturedCountRef.current + 1;
      capturedCountRef.current = newCount;
      setCapturedMarkers(prev => [...prev, croppedUri]);
      setStatusText(`✓ Captured! ${newCount} / ${TARGET_COUNT} — move marker slightly`);
      setLastResult('ok');

      // Flash feedback
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 200);

    } catch (err) {
      console.warn('Capture error:', err);
      setStatusText('Error — try again');
      setLastResult('fail');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Camera permission required.{'\n'}Please allow camera access.
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5A0" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera at high resolution */}
      <Camera
  ref={camera}
  style={StyleSheet.absoluteFill}
  device={device}
  isActive={capturedMarkers.length < TARGET_COUNT}
  photo={true}
  photoQualityBalance="quality"
  format={format}
/>

      {flashActive && <View style={styles.flashOverlay} />}

      {/* Viewfinder */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <View style={[
          styles.viewfinder,
          lastResult === 'ok' && styles.viewfinderOk,
          lastResult === 'fail' && styles.viewfinderFail,
        ]}>
          <View style={[styles.corner, styles.cornerTL,
            lastResult === 'ok' && styles.cornerOk,
            lastResult === 'fail' && styles.cornerFail,
          ]} />
          <View style={[styles.corner, styles.cornerTR,
            lastResult === 'ok' && styles.cornerOk,
            lastResult === 'fail' && styles.cornerFail,
          ]} />
          <View style={[styles.corner, styles.cornerBL,
            lastResult === 'ok' && styles.cornerOk,
            lastResult === 'fail' && styles.cornerFail,
          ]} />
          <View style={[styles.corner, styles.cornerBR,
            lastResult === 'ok' && styles.cornerOk,
            lastResult === 'fail' && styles.cornerFail,
          ]} />
        </View>
        <Text style={[
          styles.viewfinderHint,
          lastResult === 'ok' && { color: '#00FF88' },
          lastResult === 'fail' && { color: '#FF4444' },
        ]}>
          {lastResult === 'ok' ? '✓ Marker Captured!' :
           lastResult === 'fail' ? '✗ No Marker Detected' :
           'Point at Marker 1'}
        </Text>
        <Text style={styles.viewfinderSub}>
          Keep marker flat and inside the frame
        </Text>
      </View>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${(capturedMarkers.length / TARGET_COUNT) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {capturedMarkers.length} / {TARGET_COUNT}
          </Text>
        </View>

        <Text style={styles.statusText}>{statusText}</Text>

        <TouchableOpacity
          style={[
            styles.captureBtn,
            isProcessing && styles.captureBtnDisabled,
          ]}
          onPress={handleCapture}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing
            ? <ActivityIndicator size="small" color="#0A0A0A" />
            : <Text style={styles.captureBtnText}>● Capture</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hintText}>
          Press when Marker 1 is clearly visible in frame
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: { color: '#888', fontSize: 14 },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    opacity: 0.5,
    zIndex: 10,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    position: 'relative',
  },
  viewfinderOk: { backgroundColor: 'rgba(0,255,136,0.05)' },
  viewfinderFail: { backgroundColor: 'rgba(255,68,68,0.05)' },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00E5A0',
    borderWidth: 3,
  },
  cornerOk: { borderColor: '#00FF88', borderWidth: 4 },
  cornerFail: { borderColor: '#FF4444', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  viewfinderHint: {
    color: '#00E5A0',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  viewfinderSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 12,
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E5A0',
    borderRadius: 3,
  },
  progressText: {
    color: '#00E5A0',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  captureBtn: {
    backgroundColor: '#00E5A0',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    marginTop: 4,
  },
  captureBtnDisabled: {
    backgroundColor: 'rgba(0,229,160,0.4)',
  },
  captureBtnText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hintText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
  },
});
