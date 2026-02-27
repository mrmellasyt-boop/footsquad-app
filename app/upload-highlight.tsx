import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Api from "@/lib/_core/api";
import { compressImage } from "@/lib/media-compress";

export default function UploadHighlightScreen() {
  const router = useRouter();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [uploading, setUploading] = useState(false);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");

  const createMutation = trpc.highlight.create.useMutation({
    onSuccess: () => {
      Alert.alert("Highlight Posted!", "Your highlight will be visible for 48 hours.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      setMediaUri(result.assets[0].uri);
      setMediaType("photo");
      setMimeType(result.assets[0].mimeType || "image/jpeg");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick photo");
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        videoMaxDuration: 30,
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      setMediaUri(result.assets[0].uri);
      setMediaType("video");
      setMimeType(result.assets[0].mimeType || "video/mp4");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick video");
    }
  };

  const handleUpload = async () => {
    if (!mediaUri) return;
    setUploading(true);
    try {
      // Compress photos before upload (videos are already limited to 30s + quality 0.7)
      const finalUri = mediaType === "photo" ? await compressImage(mediaUri) : mediaUri;
      const url = await Api.uploadFile(finalUri, mimeType);
      createMutation.mutate({ mediaUrl: url, mediaType });
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const isLoading = uploading || createMutation.isPending;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Post Highlight</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Share your best moment — it will be visible for 48 hours</Text>

        {/* Media Preview */}
        {mediaUri ? (
          <View style={styles.previewContainer}>
            {mediaType === "photo" ? (
              <Image source={{ uri: mediaUri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.videoPreview}>
                <IconSymbol name="video.fill" size={48} color="#39FF14" />
                <Text style={styles.videoLabel}>Video selected</Text>
              </View>
            )}
            <TouchableOpacity style={styles.removeMedia} onPress={() => setMediaUri(null)}>
              <IconSymbol name="xmark.circle.fill" size={28} color="#FF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickSection}>
            <TouchableOpacity style={styles.pickBtn} onPress={pickPhoto}>
              <View style={styles.pickIconWrap}>
                <IconSymbol name="photo.fill" size={32} color="#39FF14" />
              </View>
              <Text style={styles.pickLabel}>Photo</Text>
              <Text style={styles.pickDesc}>Upload a photo highlight</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
              <View style={styles.pickIconWrap}>
                <IconSymbol name="video.fill" size={32} color="#39FF14" />
              </View>
              <Text style={styles.pickLabel}>Video</Text>
              <Text style={styles.pickDesc}>Short video (max 30s)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Button */}
        {mediaUri && (
          <TouchableOpacity
            style={[styles.uploadBtn, isLoading && styles.btnDisabled]}
            onPress={handleUpload}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Text style={styles.uploadBtnText}>Post Highlight</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <IconSymbol name="clock.fill" size={18} color="#FFD700" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>48-Hour Highlights</Text>
            <Text style={styles.infoDesc}>
              Highlights auto-expire after 48 hours. Only your latest highlight is shown. Make it count!
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    color: "#8A8A8A",
    fontSize: 14,
    marginBottom: 24,
  },
  pickSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  pickBtn: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  pickIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(57,255,20,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  pickLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pickDesc: {
    color: "#8A8A8A",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  previewContainer: {
    borderRadius: 16,
    overflow: "hidden",
    height: 220,
    backgroundColor: "#1A1A1A",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  videoPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
  },
  videoLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  removeMedia: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  uploadBtn: {
    backgroundColor: "#39FF14",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: "#0A0A0A",
    fontWeight: "800",
    fontSize: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  infoTitle: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "700",
  },
  infoDesc: {
    color: "#8A8A8A",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
});
