 
/**
 * ResultsScreen.js
 * 
 * Displays all 20 captured + processed 300×300 marker images in a grid.
 * Each image is rendered at 300×300px as required by the spec.
 * Includes a share/save option and a rescan button.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Share,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const MARKER_SIZE = 300;     // required: exactly 300×300
const GRID_PADDING = 16;
const GRID_GAP = 12;

export default function ResultsScreen({ route, navigation }) {
  const { markers } = route.params; // array of 20 image URIs
  const [selectedIdx, setSelectedIdx] = useState(null);

  const handleRescan = () => {
    navigation.replace('Camera');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Scanned ${markers.length} markers with MarkerDetector!`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // Tap to fullscreen view
  const handleMarkerPress = (idx) => {
    setSelectedIdx(selectedIdx === idx ? null : idx);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scanned Markers</Text>
          <Text style={styles.headerSub}>{markers.length} captured · 300 × 300 px each</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Text style={styles.iconBtnText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
            <Text style={styles.rescanBtnText}>Rescan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fullscreen preview (when a marker is tapped) */}
      {selectedIdx !== null && (
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          onPress={() => setSelectedIdx(null)}
          activeOpacity={1}
        >
          <View style={styles.fullscreenCard}>
            <Text style={styles.fullscreenLabel}>Marker #{selectedIdx + 1}</Text>
            <Image
              source={{ uri: markers[selectedIdx] }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
            <Text style={styles.fullscreenDims}>300 × 300 px</Text>
            <Text style={styles.fullscreenDismiss}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Scrollable grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {markers.map((uri, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.markerCard}
            onPress={() => handleMarkerPress(idx)}
            activeOpacity={0.85}
          >
            {/* Image rendered at exactly 300×300 */}
            <Image
              source={{ uri }}
              style={styles.markerImage}
              resizeMode="contain"
            />
            <View style={styles.markerBadge}>
              <Text style={styles.markerBadgeText}>#{idx + 1}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer stats */}
      <View style={styles.footer}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{markers.length}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Size</Text>
          <Text style={styles.statValue}>300 × 300</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Format</Text>
          <Text style={styles.statValue}>JPEG</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  rescanBtn: {
    backgroundColor: '#00E5A0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  rescanBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '700',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_PADDING,
    gap: GRID_GAP,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  markerCard: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  markerImage: {
    width: MARKER_SIZE,       // exactly 300
    height: MARKER_SIZE,      // exactly 300
  },
  markerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,229,160,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  markerBadgeText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: '700',
  },

  // Fullscreen overlay
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.3)',
  },
  fullscreenLabel: {
    color: '#00E5A0',
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenImage: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: 4,
  },
  fullscreenDims: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  fullscreenDismiss: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
});
