/**
 * GalleryPicker — cross-platform media picker with crop editor.
 * - Web: uses HTML <input type="file"> (no permissions needed)
 * - Mobile: uses expo-media-library gallery grid
 * - After photo selection: shows ImageCropEditor before calling onPick
 * - Videos: duration check only (trim handled separately)
 */
import { useState, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { ImageCropEditor, type CropAspect } from "./image-crop-editor";
import { VideoTrimEditor, type TrimResult } from "./video-trim-editor";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 4) / 3;

export type PickedAsset = {
  uri: string;
  mimeType: string;
  type: "photo" | "video";
  duration?: number;
  /** For video: trim start time in seconds */
  trimStart?: number;
  /** For video: trim end time in seconds */
  trimEnd?: number;
};

type GalleryPickerProps = {
  visible: boolean;
  mediaType: "photo" | "video" | "both";
  onPick: (asset: PickedAsset) => void;
  onClose: () => void;
  /** Max video duration in seconds (only for video) */
  maxVideoDuration?: number;
  /**
   * Crop aspect ratio for photos.
   * "1:1" for profile/team logos, "9:16" for highlights.
   * If not provided, no crop editor is shown.
   */
  cropAspect?: CropAspect;
};

// ─── Web File Picker ───────────────────────────────────────────────────────────
function WebFilePicker({
  visible,
  mediaType,
  onPick,
  onClose,
  maxVideoDuration = 30,
  cropAspect,
}: GalleryPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState<string>("image/jpeg");
  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);
  const [pendingVideoMime, setPendingVideoMime] = useState<string>("video/mp4");

  const accept =
    mediaType === "photo"
      ? "image/*"
      : mediaType === "video"
        ? "video/*"
        : "image/*,video/*";

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }
    setError(null);

    const isVideo = file.type.startsWith("video/");
    const isPhoto = file.type.startsWith("image/");

    if (!isVideo && !isPhoto) {
      setError("Unsupported file type. Please select an image or video.");
      return;
    }

    // Check video duration — show trim editor if too long
    if (isVideo) {
      const uri = URL.createObjectURL(file);
      let videoDuration = 0;
      try { videoDuration = await getVideoDuration(file); } catch { /* pass */ }
      if (videoDuration > maxVideoDuration) {
        setPendingVideoUri(uri);
        setPendingVideoMime(file.type);
        return; // show trim editor
      }
      onPick({ uri, mimeType: file.type, type: "video" });
      onClose();
      return;
    }

    // Photo: show crop editor if cropAspect is set
    if (isPhoto && cropAspect) {
      const uri = URL.createObjectURL(file);
      setPendingPhotoUri(uri);
      setPendingMime(file.type);
      return; // wait for crop
    }

    // Photo without crop
    const uri = URL.createObjectURL(file);
    onPick({ uri, mimeType: file.type, type: "photo" });
    onClose();
  };

  const handleCropDone = (croppedUri: string) => {
    onPick({ uri: croppedUri, mimeType: pendingMime, type: "photo" });
    setPendingPhotoUri(null);
    onClose();
  };

  const handleCropCancel = () => {
    setPendingPhotoUri(null);
  };

  const handleVideoTrimDone = (result: TrimResult) => {
    onPick({ uri: result.uri, mimeType: pendingVideoMime, type: "video", trimStart: result.startTime, trimEnd: result.endTime });
    setPendingVideoUri(null);
    onClose();
  };

  const handleVideoTrimCancel = () => { setPendingVideoUri(null); };

  if (!visible) return null;

  // Show video trim editor if we have a pending video
  if (pendingVideoUri) {
    return (
      <VideoTrimEditor
        visible
        uri={pendingVideoUri}
        maxDuration={maxVideoDuration}
        onTrim={handleVideoTrimDone}
        onCancel={handleVideoTrimCancel}
      />
    );
  }

  // Show crop editor if we have a pending photo
  if (pendingPhotoUri && cropAspect) {
    return (
      <ImageCropEditor
        visible
        uri={pendingPhotoUri}
        aspectRatio={cropAspect}
        onCrop={handleCropDone}
        onCancel={handleCropCancel}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Media</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.webCenter}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Text style={styles.webHint}>
            {mediaType === "video"
              ? `Select a video (max ${maxVideoDuration}s)`
              : mediaType === "photo"
                ? cropAspect
                  ? `Select a photo · You will crop it (${cropAspect})`
                  : "Select a photo"
                : "Select a photo or video"}
          </Text>
          {/* @ts-ignore — web-only label/input */}
          <label style={webStyles.fileLabel}>
            <span style={webStyles.fileLabelText}>
              {mediaType === "video" ? "📹 Choose Video" : mediaType === "photo" ? "📷 Choose Photo" : "📁 Choose File"}
            </span>
            {/* @ts-ignore */}
            <input
              type="file"
              accept={accept}
              style={webStyles.hiddenInput}
              onChange={handleChange}
              ref={inputRef}
            />
          </label>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

// Web-only inline styles
const webStyles = {
  fileLabel: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#39FF14",
    borderRadius: 24,
    padding: "14px 32px",
    cursor: "pointer",
    marginBottom: 16,
  },
  fileLabelText: {
    color: "#0A0A0A",
    fontWeight: "700" as const,
    fontSize: 16,
  },
  hiddenInput: {
    display: "none" as const,
  },
};

// ─── Mobile Gallery Picker ─────────────────────────────────────────────────────
function MobileGalleryPicker({
  visible,
  mediaType,
  onPick,
  onClose,
  maxVideoDuration = 30,
  cropAspect,
}: GalleryPickerProps) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState<string>("image/jpeg");
  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);
  const [pendingVideoMime, setPendingVideoMime] = useState<string>("video/mp4");

  const loadAssets = useCallback(
    async (after?: string) => {
      if (loading) return;
      setLoading(true);
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          setPermissionGranted(false);
          setLoading(false);
          return;
        }
        setPermissionGranted(true);

        const mediaTypeFilter: MediaLibrary.MediaTypeFilter[] =
          mediaType === "photo"
            ? ["photo"]
            : mediaType === "video"
              ? ["video"]
              : ["photo", "video"];

        const result = await MediaLibrary.getAssetsAsync({
          mediaType: mediaTypeFilter,
          first: 30,
          after,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        setAssets((prev) => (after ? [...prev, ...result.assets] : result.assets));
        setHasMore(result.hasNextPage);
        setCursor(result.endCursor);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Could not access gallery");
      } finally {
        setLoading(false);
      }
    },
    [loading, mediaType],
  );

  const handleOpen = useCallback(() => {
    setAssets([]);
    setCursor(undefined);
    setHasMore(true);
    loadAssets(undefined);
  }, [loadAssets]);

  const handleSelect = async (asset: MediaLibrary.Asset) => {
    try {
      // Validate video duration — show trim editor if too long
      if (asset.mediaType === "video" && asset.duration > maxVideoDuration) {
        // Get readable URI first
        let trimUri = asset.uri;
        if (Platform.OS === "ios" && trimUri.startsWith("ph://")) {
          const info = await MediaLibrary.getAssetInfoAsync(asset);
          trimUri = info.localUri || trimUri;
        }
        const trimMime = asset.filename.endsWith(".mov") ? "video/quicktime" : "video/mp4";
        setPendingVideoUri(trimUri);
        setPendingVideoMime(trimMime);
        return;
      }

      // On iOS, ph:// URIs are not directly readable — get localUri
      let uri = asset.uri;
      if (Platform.OS === "ios" && uri.startsWith("ph://")) {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        uri = info.localUri || uri;
      }

      const type: "photo" | "video" = asset.mediaType === "video" ? "video" : "photo";
      const mimeType =
        type === "video"
          ? asset.filename.endsWith(".mov")
            ? "video/quicktime"
            : "video/mp4"
          : asset.filename.toLowerCase().endsWith(".png")
            ? "image/png"
            : "image/jpeg";

      // Photo: show crop editor if cropAspect is set
      if (type === "photo" && cropAspect) {
        setPendingPhotoUri(uri);
        setPendingMime(mimeType);
        return; // wait for crop
      }

      onPick({ uri, mimeType, type, duration: asset.duration });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not select this file");
    }
  };

  const handleCropDone = (croppedUri: string) => {
    onPick({ uri: croppedUri, mimeType: pendingMime, type: "photo" });
    setPendingPhotoUri(null);
    onClose();
  };

  const handleCropCancel = () => {
    setPendingPhotoUri(null);
  };

  const handleVideoTrimDone = (result: TrimResult) => {
    onPick({ uri: result.uri, mimeType: pendingVideoMime, type: "video", trimStart: result.startTime, trimEnd: result.endTime });
    setPendingVideoUri(null);
    onClose();
  };

  const handleVideoTrimCancel = () => { setPendingVideoUri(null); };

  // Show video trim editor if we have a pending video
  if (pendingVideoUri) {
    return (
      <VideoTrimEditor
        visible
        uri={pendingVideoUri}
        maxDuration={maxVideoDuration}
        onTrim={handleVideoTrimDone}
        onCancel={handleVideoTrimCancel}
      />
    );
  }

  // Show crop editor over gallery
  if (pendingPhotoUri && cropAspect) {
    return (
      <ImageCropEditor
        visible
        uri={pendingPhotoUri}
        aspectRatio={cropAspect}
        onCrop={handleCropDone}
        onCancel={handleCropCancel}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gallery</Text>
          {cropAspect && (
            <Text style={styles.cropHint}>Crop {cropAspect} after selection</Text>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Permission denied */}
        {permissionGranted === false && (
          <View style={styles.center}>
            <Text style={styles.permText}>
              Gallery access denied. Please enable permissions in Settings.
            </Text>
          </View>
        )}

        {/* Grid */}
        {permissionGranted !== false && (
          <FlatList
            data={assets}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.thumb}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.thumbImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                {item.mediaType === "video" && (
                  <View style={styles.videoBadge}>
                    <Text style={styles.videoBadgeTxt}>
                      ▶ {Math.round(item.duration)}s
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            onEndReached={() => hasMore && loadAssets(cursor)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading ? <ActivityIndicator color="#39FF14" style={{ margin: 16 }} /> : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.center}>
                  <Text style={styles.permText}>No photos found</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Exported Component ────────────────────────────────────────────────────────
export function GalleryPicker(props: GalleryPickerProps) {
  if (Platform.OS === "web") {
    return <WebFilePicker {...props} />;
  }
  return <MobileGalleryPicker {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  cropHint: { color: "#39FF14", fontSize: 12, fontWeight: "600", flex: 1, marginLeft: 8 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  closeTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 0.5 },
  thumbImg: { width: "100%", height: "100%" },
  videoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  videoBadgeTxt: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  permText: { color: "#8A8A8A", fontSize: 14, textAlign: "center", lineHeight: 22 },
  // Web-specific styles
  webCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  webHint: {
    color: "#8A8A8A",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: "#2A0A0A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FF4444",
    marginBottom: 8,
  },
  errorText: {
    color: "#FF4444",
    fontSize: 13,
    textAlign: "center",
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  cancelBtnText: {
    color: "#8A8A8A",
    fontSize: 14,
    fontWeight: "600",
  },
});
