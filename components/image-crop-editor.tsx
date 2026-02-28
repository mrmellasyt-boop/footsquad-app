/**
 * ImageCropEditor — cross-platform crop editor.
 *
 * Props:
 *  - uri: source image URI
 *  - aspectRatio: "1:1" (square) or "9:16" (portrait)
 *  - onCrop: callback with the cropped image URI
 *  - onCancel: callback to dismiss without cropping
 *
 * Mobile: uses expo-image-manipulator for actual pixel crop.
 * Web: uses HTML5 Canvas for crop.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  PanResponder,
  Image as RNImage,
} from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

const SCREEN = Dimensions.get("window");

export type CropAspect = "1:1" | "9:16";

type Props = {
  visible: boolean;
  uri: string;
  aspectRatio: CropAspect;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
};

// ─── Web Crop Editor ──────────────────────────────────────────────────────────
function WebCropEditor({ visible, uri, aspectRatio, onCrop, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });

  const [ar_w, ar_h] = aspectRatio === "1:1" ? [1, 1] : [9, 16];

  const initCropBox = useCallback((displayW: number, displayH: number) => {
    // Compute the largest crop box that fits in the display area with the correct aspect ratio
    let bw = displayW;
    let bh = (bw * ar_h) / ar_w;
    if (bh > displayH) {
      bh = displayH;
      bw = (bh * ar_w) / ar_h;
    }
    const bx = (displayW - bw) / 2;
    const by = (displayH - bh) / 2;
    setCropBox({ x: bx, y: by, w: bw, h: bh });
  }, [ar_w, ar_h]);

  useEffect(() => {
    if (!visible || !uri) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Display size
      const maxW = Math.min(SCREEN.width - 32, 480);
      const maxH = Math.min(SCREEN.height * 0.6, 520);
      let dw = maxW;
      let dh = (img.naturalHeight / img.naturalWidth) * dw;
      if (dh > maxH) { dh = maxH; dw = (img.naturalWidth / img.naturalHeight) * dh; }
      initCropBox(dw, dh);
      setLoading(false);
    };
    img.onerror = () => setLoading(false);
    img.src = uri;
  }, [visible, uri, initCropBox]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, bx: cropBox.x, by: cropBox.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const maxX = rect.width - cropBox.w;
    const maxY = rect.height - cropBox.h;
    setCropBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(maxX, dragStart.current.bx + dx)),
      y: Math.max(0, Math.min(maxY, dragStart.current.by + dy)),
    }));
  };
  const handleMouseUp = () => setDragging(false);

  const handleCrop = () => {
    if (!imgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    const originX = Math.round(cropBox.x * scaleX);
    const originY = Math.round(cropBox.y * scaleY);
    const width = Math.round(cropBox.w * scaleX);
    const height = Math.round(cropBox.h * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, originX, originY, width, height, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCrop(dataUrl);
  };

  if (!visible) return null;

  const containerRef2 = containerRef as React.RefObject<HTMLDivElement>;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Crop Photo</Text>
            <Text style={styles.subtitle}>{aspectRatio} · Drag to reposition</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#39FF14" size="large" />
            </View>
          ) : (
            <View style={{ alignItems: "center" }}>
              {/* @ts-ignore web-only */}
              <div
                ref={containerRef2}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  cursor: dragging ? "grabbing" : "crosshair",
                  display: "inline-block",
                  maxWidth: "100%",
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* @ts-ignore web-only */}
                <img
                  src={uri}
                  style={{ display: "block", maxWidth: "100%", maxHeight: "60vh", userSelect: "none" }}
                  draggable={false}
                />
                {/* Dark overlay with crop hole */}
                {/* @ts-ignore web-only */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `
                      linear-gradient(to bottom,
                        rgba(0,0,0,0.6) ${cropBox.y}px,
                        transparent ${cropBox.y}px,
                        transparent ${cropBox.y + cropBox.h}px,
                        rgba(0,0,0,0.6) ${cropBox.y + cropBox.h}px
                      ),
                      linear-gradient(to right,
                        rgba(0,0,0,0.6) ${cropBox.x}px,
                        transparent ${cropBox.x}px,
                        transparent ${cropBox.x + cropBox.w}px,
                        rgba(0,0,0,0.6) ${cropBox.x + cropBox.w}px
                      )
                    `,
                  }}
                />
                {/* Crop handle */}
                {/* @ts-ignore web-only */}
                <div
                  onMouseDown={handleMouseDown}
                  style={{
                    position: "absolute",
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.w,
                    height: cropBox.h,
                    border: "2px solid #39FF14",
                    boxSizing: "border-box",
                    cursor: "grab",
                    borderRadius: aspectRatio === "1:1" ? 4 : 4,
                  }}
                />
              </div>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cropBtn} onPress={handleCrop} disabled={loading}>
              <Text style={styles.cropBtnText}>Crop & Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Mobile Crop Editor ───────────────────────────────────────────────────────
function MobileCropEditor({ visible, uri, aspectRatio, onCrop, onCancel }: Props) {
  const [imgLayout, setImgLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);
  // Store crop position at gesture start to compute absolute delta correctly
  const cropBoxAtGestureStart = useRef({ x: 0, y: 0 });

  const [ar_w, ar_h] = aspectRatio === "1:1" ? [1, 1] : [9, 16];

  const initCrop = useCallback((dw: number, dh: number) => {
    let bw = dw;
    let bh = (bw * ar_h) / ar_w;
    if (bh > dh) { bh = dh; bw = (bh * ar_w) / ar_h; }
    const bx = (dw - bw) / 2;
    const by = (dh - bh) / 2;
    setCropBox({ x: bx, y: by, w: bw, h: bh });
  }, [ar_w, ar_h]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        // Capture the crop position at gesture start
        setCropBox(prev => {
          cropBoxAtGestureStart.current = { x: prev.x, y: prev.y };
          return prev;
        });
      },
      onPanResponderMove: (_, gs) => {
        // gs.dx/gs.dy are cumulative from gesture start — use stored start position
        setCropBox(prev => {
          const maxX = imgLayout.w - prev.w;
          const maxY = imgLayout.h - prev.h;
          return {
            ...prev,
            x: Math.max(0, Math.min(maxX, cropBoxAtGestureStart.current.x + gs.dx)),
            y: Math.max(0, Math.min(maxY, cropBoxAtGestureStart.current.y + gs.dy)),
          };
        });
      },
    })
  ).current;

  const handleImageLoad = (e: any) => {
    const { width, height } = e.nativeEvent.source;
    setNaturalSize({ w: width, h: height });
  };

  const handleImageLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setImgLayout({ x: 0, y: 0, w: width, h: height });
    initCrop(width, height);
    setReady(true);
  };

  const handleCrop = async () => {
    setProcessing(true);
    try {
      const scaleX = naturalSize.w / imgLayout.w;
      const scaleY = naturalSize.h / imgLayout.h;
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{
          crop: {
            originX: Math.round(cropBox.x * scaleX),
            originY: Math.round(cropBox.y * scaleY),
            width: Math.round(cropBox.w * scaleX),
            height: Math.round(cropBox.h * scaleY),
          },
        }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      onCrop(result.uri);
    } catch (e: any) {
      console.warn("Crop failed:", e.message);
      onCrop(uri); // fallback: use original
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingHorizontal: 0 }]}>
          <View style={[styles.header, { paddingHorizontal: 20 }]}>
            <Text style={styles.title}>Crop Photo</Text>
            <Text style={styles.subtitle}>{aspectRatio} · Drag to reposition</Text>
          </View>

          <View style={styles.imageContainer}>
            <RNImage
              source={{ uri }}
              style={styles.previewImage}
              resizeMode="contain"
              onLoad={handleImageLoad}
              onLayout={handleImageLayout}
            />
            {ready && (
              <>
                {/* Dark overlay */}
                <View style={[StyleSheet.absoluteFillObject, styles.overlayDark]} pointerEvents="none" />
                {/* Crop box cutout */}
                <View
                  style={[
                    styles.cropBoxClear,
                    {
                      left: cropBox.x,
                      top: cropBox.y,
                      width: cropBox.w,
                      height: cropBox.h,
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.cropBorder} />
                </View>
              </>
            )}
          </View>

          <View style={[styles.btnRow, { paddingHorizontal: 20 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cropBtn, processing && styles.btnDisabled]}
              onPress={handleCrop}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text style={styles.cropBtnText}>Crop & Use</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────
export function ImageCropEditor(props: Props) {
  if (Platform.OS === "web") {
    return <WebCropEditor {...props} />;
  }
  return <MobileCropEditor {...props} />;
}

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
    alignItems: "center",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#8A8A8A", fontSize: 13, marginTop: 4 },
  loadingBox: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  overlayDark: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  cropBoxClear: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  cropBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#39FF14",
    borderRadius: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
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
  cropBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#39FF14",
    alignItems: "center",
  },
  cropBtnText: { color: "#0A0A0A", fontSize: 15, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },
});
