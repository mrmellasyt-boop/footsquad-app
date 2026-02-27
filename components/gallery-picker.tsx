/**
 * GalleryPicker — remplace expo-image-picker sans rebuild APK.
 * Utilise expo-media-library pour accéder à la galerie photo/vidéo.
 */
import { useState, useCallback } from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 4) / 3;

export type PickedAsset = {
  uri: string;
  mimeType: string;
  type: "photo" | "video";
  duration?: number;
};

type GalleryPickerProps = {
  visible: boolean;
  mediaType: "photo" | "video" | "both";
  onPick: (asset: PickedAsset) => void;
  onClose: () => void;
  /** Max video duration in seconds (only for video) */
  maxVideoDuration?: number;
};

export function GalleryPicker({
  visible,
  mediaType,
  onPick,
  onClose,
  maxVideoDuration = 30,
}: GalleryPickerProps) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

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
        Alert.alert("Erreur", err.message || "Impossible d'accéder à la galerie");
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
      // Validate video duration
      if (asset.mediaType === "video" && asset.duration > maxVideoDuration) {
        Alert.alert(
          "Vidéo trop longue",
          `La vidéo doit faire moins de ${maxVideoDuration} secondes. Cette vidéo dure ${Math.round(asset.duration)}s.`,
        );
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

      onPick({ uri, mimeType, type, duration: asset.duration });
      onClose();
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de sélectionner ce fichier");
    }
  };

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
          <Text style={styles.title}>Galerie</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Permission denied */}
        {permissionGranted === false && (
          <View style={styles.center}>
            <Text style={styles.permText}>
              Accès à la galerie refusé. Active les permissions dans les Paramètres.
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
                  <Text style={styles.permText}>Aucune photo trouvée</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
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
});
