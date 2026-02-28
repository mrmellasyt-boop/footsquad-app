/**
 * VideoTrimEditor — cross-platform video trim editor.
 *
 * Props:
 *  - uri: source video URI
 *  - maxDuration: max allowed duration in seconds (default: 30)
 *  - onTrim: callback with { uri, startTime, endTime }
 *  - onCancel: callback to dismiss without trimming
 *
 * Web: uses HTML5 video element + MediaRecorder to extract the trimmed segment.
 * Mobile: uses expo-video for preview + slider handles for start/end selection.
 *         The trim is applied server-side via startTime/endTime params.
 *         If video is already within maxDuration, it passes through directly.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  PanResponder,
  Dimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const SCREEN = Dimensions.get("window");
const TRIM_BAR_WIDTH = Math.min(SCREEN.width - 64, 400);

export type TrimResult = {
  uri: string;
  startTime: number;
  endTime: number;
  trimmed: boolean; // true if actual trim was applied
};

type Props = {
  visible: boolean;
  uri: string;
  maxDuration?: number;
  onTrim: (result: TrimResult) => void;
  onCancel: () => void;
};

// ─── Web Trim Editor ──────────────────────────────────────────────────────────
function WebTrimEditor({ visible, uri, maxDuration = 30, onTrim, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const trimDuration = endTime - startTime;

  useEffect(() => {
    if (!visible) {
      setLoaded(false);
      setStartTime(0);
      setEndTime(0);
      setDuration(0);
      setError(null);
    }
  }, [visible]);

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const d = vid.duration;
    setDuration(d);
    setStartTime(0);
    setEndTime(Math.min(d, maxDuration));
    setLoaded(true);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    // Loop within trim range
    if (vid.currentTime >= endTime) {
      vid.currentTime = startTime;
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newStart = Math.min(val, endTime - 1);
    setStartTime(newStart);
    if (videoRef.current) videoRef.current.currentTime = newStart;
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newEnd = Math.max(val, startTime + 1);
    // Enforce max duration
    const clampedEnd = Math.min(newEnd, startTime + maxDuration);
    setEndTime(clampedEnd);
  };

  const handleTrim = async () => {
    if (trimDuration > maxDuration) {
      setError(`Selection is ${Math.round(trimDuration)}s. Max allowed: ${maxDuration}s.`);
      return;
    }

    // If no trim needed (full video is within limit)
    if (Math.abs(startTime) < 0.1 && Math.abs(endTime - duration) < 0.1 && duration <= maxDuration) {
      onTrim({ uri, startTime: 0, endTime: duration, trimmed: false });
      return;
    }

    // Web trim via MediaRecorder
    setProcessing(true);
    setError(null);
    try {
      const trimmedUri = await trimVideoWeb(uri, startTime, endTime);
      onTrim({ uri: trimmedUri, startTime, endTime, trimmed: true });
    } catch (e: any) {
      // Fallback: pass original with time markers (server will trim)
      onTrim({ uri, startTime, endTime, trimmed: false });
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Trim Video</Text>
            <Text style={styles.subtitle}>Max {maxDuration}s · Select start and end points</Text>
          </View>

          {/* Video preview */}
          {/* @ts-ignore web-only */}
          <video
            ref={videoRef}
            src={uri}
            style={{ width: "100%", maxHeight: 280, backgroundColor: "#000", display: "block" }}
            controls={false}
            autoPlay
            muted
            loop={false}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          />

          {loaded && (
            <View style={styles.trimSection}>
              {/* Duration info */}
              <View style={styles.durationRow}>
                <Text style={styles.durationText}>
                  Start: {startTime.toFixed(1)}s
                </Text>
                <Text style={[styles.durationText, trimDuration > maxDuration && styles.durationError]}>
                  Duration: {trimDuration.toFixed(1)}s / {maxDuration}s
                </Text>
                <Text style={styles.durationText}>
                  End: {endTime.toFixed(1)}s
                </Text>
              </View>

              {/* Start slider */}
              <Text style={styles.sliderLabel}>Start point</Text>
              {/* @ts-ignore web-only */}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={startTime}
                onChange={handleStartChange}
                style={webSliderStyle}
              />

              {/* End slider */}
              <Text style={styles.sliderLabel}>End point</Text>
              {/* @ts-ignore web-only */}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={endTime}
                onChange={handleEndChange}
                style={webSliderStyle}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {!loaded && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#39FF14" size="large" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trimBtn, (!loaded || processing || trimDuration > maxDuration) && styles.btnDisabled]}
              onPress={handleTrim}
              disabled={!loaded || processing || trimDuration > maxDuration}
            >
              {processing ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text style={styles.trimBtnText}>
                  {duration <= maxDuration && Math.abs(startTime) < 0.1 ? "Use Video" : "Trim & Use"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Trim a video on web using MediaRecorder + HTMLVideoElement.
 * Records the video segment from startTime to endTime.
 */
async function trimVideoWeb(uri: string, startTime: number, endTime: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = uri;
    video.muted = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      video.currentTime = startTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const stream = (canvas as any).captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
      recorder.onerror = reject;

      recorder.start();

      const ctx = canvas.getContext("2d");
      let lastTime = -1;

      const drawFrame = () => {
        if (video.currentTime >= endTime || video.ended) {
          recorder.stop();
          return;
        }
        if (video.currentTime !== lastTime) {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          lastTime = video.currentTime;
        }
        requestAnimationFrame(drawFrame);
      };

      video.play().then(() => {
        drawFrame();
      }).catch(reject);
    };

    video.onerror = reject;
  });
}

// ─── Mobile Trim Editor ───────────────────────────────────────────────────────
function MobileTrimEditor({ visible, uri, maxDuration = 30, onTrim, onCancel }: Props) {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (!visible) {
      setLoaded(false);
      setStartTime(0);
      setEndTime(0);
      setDuration(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay" && !loaded) {
        const d = player.duration ?? 0;
        setDuration(d);
        setEndTime(Math.min(d, maxDuration));
        setLoaded(true);
      }
    });
    return () => sub.remove();
  }, [player, loaded, maxDuration]);

  const trimDuration = endTime - startTime;
  const barWidth = TRIM_BAR_WIDTH;

  // Start handle pan responder
  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (duration <= 0) return;
        const delta = (gs.dx / barWidth) * duration;
        setStartTime(prev => {
          const newVal = Math.max(0, Math.min(prev + delta, endTime - 1));
          return newVal;
        });
      },
    })
  ).current;

  // End handle pan responder
  const endPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (duration <= 0) return;
        const delta = (gs.dx / barWidth) * duration;
        setEndTime(prev => {
          const newVal = Math.max(startTime + 1, Math.min(prev + delta, duration, startTime + maxDuration));
          return newVal;
        });
      },
    })
  ).current;

  const handleUse = () => {
    // On mobile, pass start/end time — server applies the actual trim
    onTrim({ uri, startTime, endTime, trimmed: false });
  };

  const startPct = duration > 0 ? (startTime / duration) : 0;
  const endPct = duration > 0 ? (endTime / duration) : 1;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Trim Video</Text>
            <Text style={styles.subtitle}>Max {maxDuration}s · Drag handles to trim</Text>
          </View>

          {/* Video preview */}
          <VideoView
            player={player}
            style={styles.videoPreview}
            contentFit="contain"
            nativeControls={false}
          />

          {loaded ? (
            <View style={styles.trimSection}>
              <View style={styles.durationRow}>
                <Text style={styles.durationText}>Start: {startTime.toFixed(1)}s</Text>
                <Text style={[styles.durationText, trimDuration > maxDuration && styles.durationError]}>
                  {trimDuration.toFixed(1)}s / {maxDuration}s
                </Text>
                <Text style={styles.durationText}>End: {endTime.toFixed(1)}s</Text>
              </View>

              {/* Trim bar */}
              <View style={[styles.trimBar, { width: barWidth }]}>
                {/* Background track */}
                <View style={styles.trimTrack} />
                {/* Selected range */}
                <View
                  style={[
                    styles.trimSelected,
                    {
                      left: startPct * barWidth,
                      width: (endPct - startPct) * barWidth,
                      backgroundColor: trimDuration > maxDuration ? "#FF4444" : "#39FF14",
                    },
                  ]}
                />
                {/* Start handle */}
                <View
                  style={[styles.trimHandle, { left: startPct * barWidth - 10 }]}
                  {...startPan.panHandlers}
                >
                  <View style={styles.handleInner} />
                </View>
                {/* End handle */}
                <View
                  style={[styles.trimHandle, { left: endPct * barWidth - 10 }]}
                  {...endPan.panHandlers}
                >
                  <View style={styles.handleInner} />
                </View>
              </View>

              {trimDuration > maxDuration && (
                <Text style={styles.errorText}>
                  Selection too long ({Math.round(trimDuration)}s). Max: {maxDuration}s.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#39FF14" size="large" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trimBtn, (!loaded || trimDuration > maxDuration) && styles.btnDisabled]}
              onPress={handleUse}
              disabled={!loaded || trimDuration > maxDuration}
            >
              <Text style={styles.trimBtnText}>
                {duration <= maxDuration ? "Use Video" : "Trim & Use"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────
export function VideoTrimEditor(props: Props) {
  if (Platform.OS === "web") {
    return <WebTrimEditor {...props} />;
  }
  return <MobileTrimEditor {...props} />;
}

const webSliderStyle = {
  width: "100%",
  accentColor: "#39FF14",
  marginBottom: 8,
} as any;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    width: "100%",
    maxWidth: 520,
    overflow: "hidden",
    paddingBottom: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#8A8A8A", fontSize: 13, marginTop: 4 },
  videoPreview: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },
  trimSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: "center",
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  durationText: { color: "#8A8A8A", fontSize: 12 },
  durationError: { color: "#FF4444" },
  sliderLabel: { color: "#8A8A8A", fontSize: 12, alignSelf: "flex-start", marginBottom: 4 },
  trimBar: {
    height: 40,
    position: "relative",
    justifyContent: "center",
    marginBottom: 8,
  },
  trimTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "#2A2A2A",
    borderRadius: 3,
  },
  trimSelected: {
    position: "absolute",
    height: 6,
    borderRadius: 3,
  },
  trimHandle: {
    position: "absolute",
    width: 20,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  handleInner: {
    width: 4,
    height: 32,
    backgroundColor: "#39FF14",
    borderRadius: 2,
  },
  loadingBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#8A8A8A", fontSize: 14 },
  errorText: { color: "#FF4444", fontSize: 13, textAlign: "center", marginTop: 8 },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  cancelBtnText: { color: "#8A8A8A", fontSize: 15, fontWeight: "600" },
  trimBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#39FF14",
    alignItems: "center",
  },
  trimBtnText: { color: "#0A0A0A", fontSize: 15, fontWeight: "800" },
  btnDisabled: { opacity: 0.4 },
});
