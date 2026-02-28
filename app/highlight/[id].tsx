import { useState } from "react";
import {
  Text, View, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, Alert, StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { VideoView, useVideoPlayer } from "expo-video";
import { useT } from "@/lib/i18n/LanguageContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function HighlightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const highlightId = Number(id);
  const router = useRouter();
  const t = useT();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [liked, setLiked] = useState(false);

  // Fetch all highlights and find the one we need
  const { data: allHighlights, isLoading } = trpc.highlight.list.useQuery();
  const highlight = allHighlights?.find((h) => h.id === highlightId);

  const likeMutation = trpc.highlight.like.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setLiked(true);
        utils.highlight.list.invalidate();
      } else {
        Alert.alert("Already liked", "You already liked this highlight.");
      }
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign in required", "Please sign in to like highlights.");
      return;
    }
    likeMutation.mutate({ highlightId });
  };

  // Video player (only created if mediaType is video)
  const videoPlayer = useVideoPlayer(
    highlight?.mediaType === "video" && highlight?.mediaUrl
      ? highlight.mediaUrl
      : null,
    (player) => {
      player.loop = true;
      player.play();
    }
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  if (!highlight) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.notFoundText}>Highlight not found or expired.</Text>
        <TouchableOpacity style={styles.backBtnCenter} onPress={() => router.back()}>
          <Text style={styles.backBtnCenterText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const timeLeft = () => {
    const exp = new Date(highlight.expiresAt).getTime();
    const now = Date.now();
    const diff = exp - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Full-screen media */}
      <View style={styles.mediaContainer}>
        {highlight.mediaType === "photo" && highlight.mediaUrl ? (
          <Image
            source={{ uri: highlight.mediaUrl }}
            style={styles.fullMedia}
            contentFit="cover"
          />
        ) : highlight.mediaType === "video" && highlight.mediaUrl ? (
          <VideoView
            player={videoPlayer}
            style={styles.fullMedia}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <View style={[styles.fullMedia, styles.noMediaPlaceholder]}>
            <IconSymbol name="video.fill" size={64} color="#39FF14" />
            <Text style={styles.noMediaText}>No media</Text>
          </View>
        )}
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.timerBadge}>
          <IconSymbol name="clock.fill" size={12} color="#FFD700" />
          <Text style={styles.timerText}>{timeLeft()}</Text>
        </View>
      </View>

      {/* Bottom info overlay */}
      <View style={styles.bottomOverlay}>
        {/* Player info */}
        <TouchableOpacity
          style={styles.playerRow}
          onPress={() => highlight.player?.id && router.push(`/player/${highlight.player.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={styles.playerAvatar}>
            {highlight.player?.photoUrl ? (
              <Image
                source={{ uri: highlight.player.photoUrl }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <IconSymbol name="person.fill" size={24} color="#8A8A8A" />
            )}
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>
              {highlight.player?.fullName ?? "Unknown Player"}
            </Text>
            <View style={styles.playerMeta}>
              {highlight.team && (
                <Text style={styles.teamName}>{highlight.team.name}</Text>
              )}
              {highlight.player?.city && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <IconSymbol name="location.fill" size={11} color="#8A8A8A" />
                  <Text style={styles.cityText}>{highlight.player.city}</Text>
                </>
              )}
              {highlight.player?.position && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.posText}>{highlight.player.position}</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Like button */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.likeBtn, liked && styles.likeBtnActive]}
            onPress={handleLike}
            disabled={likeMutation.isPending}
            activeOpacity={0.8}
          >
            {likeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FF4444" />
            ) : (
              <>
                <IconSymbol
                  name="heart.fill"
                  size={22}
                  color={liked ? "#FF4444" : "#FFFFFF"}
                />
                <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
                  {(highlight.likes ?? 0) + (liked ? 1 : 0)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingContainer: {
    flex: 1, backgroundColor: "#000",
    justifyContent: "center", alignItems: "center",
  },
  notFoundText: { color: "#8A8A8A", fontSize: 16, marginBottom: 16 },
  backBtnCenter: {
    backgroundColor: "#39FF14", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  backBtnCenterText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
  mediaContainer: {
    position: "absolute", top: 0, left: 0,
    width: SCREEN_W, height: SCREEN_H,
  },
  fullMedia: { width: "100%", height: "100%" },
  noMediaPlaceholder: {
    backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center",
  },
  noMediaText: { color: "#8A8A8A", fontSize: 14, marginTop: 8 },
  topBar: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  timerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  timerText: { color: "#FFD700", fontSize: 12, fontWeight: "700" },
  bottomOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 80,
    backgroundColor: "rgba(0,0,0,0)",
    // Simulated gradient via background
    backgroundImage: undefined,
  },
  playerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginBottom: 16,
  },
  playerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center",
    overflow: "hidden",
    borderWidth: 2, borderColor: "#39FF14",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  playerInfo: { flex: 1 },
  playerName: {
    color: "#FFFFFF", fontSize: 16, fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  playerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" },
  teamName: { color: "#39FF14", fontSize: 12, fontWeight: "700" },
  metaDot: { color: "#8A8A8A", fontSize: 12 },
  cityText: { color: "#9BA1A6", fontSize: 12 },
  posText: {
    color: "#0A0A0A", backgroundColor: "#39FF14",
    fontSize: 10, fontWeight: "800",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  actionsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  likeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
  },
  likeBtnActive: { borderColor: "#FF4444", backgroundColor: "rgba(255,68,68,0.15)" },
  likeCount: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  likeCountActive: { color: "#FF4444" },
});
