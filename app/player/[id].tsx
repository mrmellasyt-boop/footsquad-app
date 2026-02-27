import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: player, isLoading } = trpc.player.getById.useQuery({ id: playerId });
  const utils = trpc.useUtils();
  const { data: isFollowing } = trpc.follow.isFollowing.useQuery({ playerId }, { enabled: isAuthenticated });
  const { data: followers } = trpc.follow.followers.useQuery({ playerId });
  const { data: following } = trpc.follow.following.useQuery({ playerId });
  const [optimisticFollowing, setOptimisticFollowing] = React.useState<boolean | null>(null);
  const displayFollowing = optimisticFollowing !== null ? optimisticFollowing : !!isFollowing;
  const followMutation = trpc.follow.toggle.useMutation({
    onMutate: () => {
      // Optimistic update: toggle immediately
      setOptimisticFollowing(!displayFollowing);
    },
    onSuccess: (data) => {
      setOptimisticFollowing(data.following);
      utils.follow.isFollowing.invalidate({ playerId });
      utils.follow.followers.invalidate({ playerId });
    },
    onError: () => {
      // Revert on error
      setOptimisticFollowing(null);
    },
  });

  if (isLoading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View></ScreenContainer>;
  }

  if (!player) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.emptyText}>Player not found</Text></View></ScreenContainer>;
  }

  const avgRating = player.ratingCount > 0 ? (player.totalRatings / player.ratingCount).toFixed(1) : "—";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "player"}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={() => (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                {player.photoUrl ? (
                  <Image source={{ uri: player.photoUrl }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="person.fill" size={40} color="#8A8A8A" />
                )}
              </View>
              <Text style={styles.name}>{player.fullName}</Text>
              <Text style={styles.location}>{player.countryFlag} {player.city}, {player.country}</Text>
              <View style={styles.posBadge}>
                <Text style={styles.posBadgeText}>{player.position}</Text>
              </View>
            </View>

            {/* Follow / Message */}
            {isAuthenticated && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.followBtn, displayFollowing && styles.followingBtn]}
                  onPress={() => followMutation.mutate({ playerId })}
                  disabled={followMutation.isPending}
                >
                  <Text style={[styles.followBtnText, displayFollowing && styles.followingBtnText]}>
                    {displayFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.msgBtn}
                  onPress={() => router.push(`/dm/${playerId}` as any)}
                >
                  <IconSymbol name="bubble.left.fill" size={18} color="#39FF14" />
                  <Text style={styles.msgBtnText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{player.totalMatches}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: "#39FF14" }]}>{player.totalPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{avgRating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: "#FFD700" }]}>{player.motmCount}</Text>
                <Text style={styles.statLabel}>MOTM</Text>
              </View>
            </View>

            {/* Social */}
            <View style={styles.socialRow}>
              <View style={styles.socialItem}>
                <Text style={styles.socialNum}>{followers?.length ?? 0}</Text>
                <Text style={styles.socialLabel}>Followers</Text>
              </View>
              <View style={styles.socialDivider} />
              <View style={styles.socialItem}>
                <Text style={styles.socialNum}>{following?.length ?? 0}</Text>
                <Text style={styles.socialLabel}>Following</Text>
              </View>
            </View>

            {/* Availability */}
            {player.isFreeAgent && (
              <View style={styles.freeAgentBanner}>
                <Text style={styles.freeAgentText}>FREE AGENT</Text>
                <Text style={styles.freeAgentSub}>
                  {player.availableTime ? `Available: ${player.availableTime}` : "Looking for a team"}
                  {player.preferredFormat ? ` • ${player.preferredFormat}` : ""}
                </Text>
              </View>
            )}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8, marginBottom: 8,
  },
  profileHeader: { alignItems: "center", paddingVertical: 16 },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", overflow: "hidden",
    borderWidth: 3, borderColor: "#39FF14", marginBottom: 12,
  },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  name: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  location: { color: "#8A8A8A", fontSize: 14, marginTop: 4 },
  posBadge: { backgroundColor: "#39FF14", paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  posBadgeText: { color: "#0A0A0A", fontWeight: "800", fontSize: 14 },
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  followBtn: { flex: 1, backgroundColor: "#39FF14", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  followingBtn: { backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#39FF14" },
  followBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  followingBtnText: { color: "#39FF14" },
  msgBtn: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#2A2A2A" },
  msgBtnText: { color: "#39FF14", fontWeight: "700", fontSize: 15 },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  statNum: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  statLabel: { color: "#8A8A8A", fontSize: 10, marginTop: 2, fontWeight: "600" },
  socialRow: { flexDirection: "row", marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#2A2A2A", justifyContent: "center", alignItems: "center" },
  socialItem: { flex: 1, alignItems: "center" },
  socialNum: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  socialLabel: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  socialDivider: { width: 1, height: 32, backgroundColor: "#2A2A2A" },
  freeAgentBanner: { marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#FFD700", alignItems: "center" },
  freeAgentText: { color: "#FFD700", fontSize: 16, fontWeight: "800" },
  freeAgentSub: { color: "#8A8A8A", fontSize: 13, marginTop: 4, textAlign: "center" },
});
