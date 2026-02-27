import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

export default function FreeAgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: player, isLoading } = trpc.player.getById.useQuery({ id: playerId });
  const { data: myPlayer } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: isFollowing } = trpc.follow.isFollowing.useQuery({ playerId }, { enabled: isAuthenticated });
  const followMutation = trpc.follow.toggle.useMutation();

  // Invite to match modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { data: myMatches } = trpc.match.myMatches.useQuery(undefined, {
    enabled: isAuthenticated && showInviteModal,
  });
  const joinMutation = trpc.match.join.useMutation({
    onSuccess: () => {
      setShowInviteModal(false);
      Alert.alert("Invited!", `${player?.fullName} has been added to the match.`);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleMessage = () => {
    router.push(`/dm/${playerId}` as any);
  };

  const handleInviteToMatch = (matchId: number, teamId: number) => {
    Alert.alert(
      "Invite Player",
      `Add ${player?.fullName} to this match?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Invite",
          onPress: () => joinMutation.mutate({ matchId, teamId, teamSide: "A" }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      </ScreenContainer>
    );
  }

  if (!player) {
    return (
      <ScreenContainer>
        <View style={styles.center}><Text style={styles.emptyText}>Player not found</Text></View>
      </ScreenContainer>
    );
  }

  const avgRating = player.ratingCount > 0
    ? (player.totalRatings / player.ratingCount).toFixed(1)
    : "—";

  // Open matches where current user is captain
  const openMatches = (myMatches ?? []).filter(
    (m: any) => m.status !== "completed" && m.status !== "cancelled" && myPlayer?.isCaptain && myPlayer?.teamId === m.teamAId
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {player.photoUrl ? (
              <Image source={{ uri: player.photoUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <IconSymbol name="person.fill" size={40} color="#8A8A8A" />
            )}
          </View>
          {/* Free Agent Badge */}
          <View style={styles.faBadge}>
            <Text style={styles.faBadgeText}>FREE AGENT</Text>
          </View>
          <Text style={styles.name}>{player.fullName}</Text>
          <Text style={styles.location}>
            {player.countryFlag} {player.city}, {player.country}
          </Text>
          <View style={styles.posBadge}>
            <Text style={styles.posBadgeText}>{player.position}</Text>
          </View>
        </View>

        {/* Availability Info */}
        {(player.availableTime || player.preferredFormat) && (
          <View style={styles.availCard}>
            <Text style={styles.availTitle}>Availability</Text>
            {player.availableTime && (
              <View style={styles.availRow}>
                <IconSymbol name="calendar" size={16} color="#39FF14" />
                <Text style={styles.availText}>{player.availableTime}</Text>
              </View>
            )}
            {player.preferredFormat && (
              <View style={styles.availRow}>
                <IconSymbol name="sportscourt.fill" size={16} color="#39FF14" />
                <Text style={styles.availText}>Prefers {player.preferredFormat}</Text>
              </View>
            )}
          </View>
        )}

        {/* Note */}
        {(player as any).note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Player's Note</Text>
            <Text style={styles.noteText}>"{(player as any).note}"</Text>
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

        {/* Action Buttons */}
        {isAuthenticated && (
          <View style={styles.actionSection}>
            {/* Message */}
            <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.8}>
              <IconSymbol name="bubble.left.fill" size={20} color="#0A0A0A" />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>

            {/* Invite to Match */}
            {myPlayer?.isCaptain && (
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.8}
              >
                <IconSymbol name="person.badge.plus" size={20} color="#39FF14" />
                <Text style={styles.inviteBtnText}>Invite to Match</Text>
              </TouchableOpacity>
            )}

            {/* Follow */}
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => followMutation.mutate({ playerId })}
              activeOpacity={0.8}
            >
              <IconSymbol
                name={isFollowing ? "person.fill.checkmark" : "person.badge.plus"}
                size={18}
                color={isFollowing ? "#39FF14" : "#8A8A8A"}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Full Profile */}
        <TouchableOpacity
          style={styles.fullProfileBtn}
          onPress={() => router.push(`/player/${playerId}` as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.fullProfileText}>View Full Profile</Text>
          <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
        </TouchableOpacity>
      </ScrollView>

      {/* Invite to Match Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite to Match</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select one of your upcoming matches to invite {player.fullName}
            </Text>

            {!myMatches ? (
              <ActivityIndicator size="large" color="#39FF14" style={{ marginVertical: 32 }} />
            ) : openMatches.length === 0 ? (
              <View style={styles.noMatchesBox}>
                <IconSymbol name="sportscourt.fill" size={40} color="#2A2A2A" />
                <Text style={styles.noMatchesText}>No open matches available</Text>
                <Text style={styles.noMatchesSub}>Create a match first to invite players</Text>
                <TouchableOpacity
                  style={styles.createMatchBtn}
                  onPress={() => { setShowInviteModal(false); router.push("/create-match" as any); }}
                >
                  <Text style={styles.createMatchBtnText}>Create Match</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={openMatches}
                keyExtractor={(item: any) => item.id.toString()}
                style={{ maxHeight: 400 }}
                renderItem={({ item: match }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.matchRow}
                    onPress={() => handleInviteToMatch(match.id, match.teamAId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.matchRowInfo}>
                      <Text style={styles.matchRowName}>
                        {match.teamA?.name ?? "My Team"} vs {match.teamB?.name ?? "TBD"}
                      </Text>
                      <Text style={styles.matchRowMeta}>
                        {match.city} • {match.format} • {new Date(match.matchDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.inviteArrow}>
                      <IconSymbol name="chevron.right" size={16} color="#39FF14" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center",
    marginLeft: 20, marginTop: 8, marginBottom: 8,
  },
  profileHeader: { alignItems: "center", paddingVertical: 16, paddingHorizontal: 20 },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", overflow: "hidden",
    borderWidth: 3, borderColor: "#FFD700", marginBottom: 10,
  },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  faBadge: {
    backgroundColor: "#FFD700", paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 8,
  },
  faBadgeText: { color: "#0A0A0A", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  name: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", textAlign: "center" },
  location: { color: "#8A8A8A", fontSize: 14, marginTop: 4 },
  posBadge: {
    backgroundColor: "#39FF14", paddingHorizontal: 16, paddingVertical: 4,
    borderRadius: 12, marginTop: 8,
  },
  posBadgeText: { color: "#0A0A0A", fontWeight: "800", fontSize: 14 },
  availCard: {
    marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2A2A2A", gap: 10,
  },
  availTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  availRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  availText: { color: "#FFFFFF", fontSize: 14 },
  noteCard: {
    marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: "#2A2A2A",
    borderLeftColor: "#39FF14",
  },
  noteLabel: { color: "#8A8A8A", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  noteText: { color: "#FFFFFF", fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  statsGrid: {
    flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A",
  },
  statNum: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  statLabel: { color: "#8A8A8A", fontSize: 10, marginTop: 2, fontWeight: "600" },
  actionSection: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  messageBtn: {
    backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  messageBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  inviteBtn: {
    backgroundColor: "#1A1A1A", borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 2, borderColor: "#39FF14",
  },
  inviteBtnText: { color: "#39FF14", fontWeight: "800", fontSize: 16 },
  followBtn: {
    backgroundColor: "#1A1A1A", borderRadius: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  followingBtn: { borderColor: "#39FF14" },
  followBtnText: { color: "#8A8A8A", fontWeight: "700", fontSize: 15 },
  followingBtnText: { color: "#39FF14" },
  fullProfileBtn: {
    marginHorizontal: 20, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 12,
  },
  fullProfileText: { color: "#8A8A8A", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", padding: 20, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#8A8A8A", fontSize: 13, marginBottom: 16 },
  noMatchesBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  noMatchesText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  noMatchesSub: { color: "#8A8A8A", fontSize: 13 },
  createMatchBtn: {
    backgroundColor: "#39FF14", paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, marginTop: 8,
  },
  createMatchBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  matchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0A0A0A",
    borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#2A2A2A",
  },
  matchRowInfo: { flex: 1 },
  matchRowName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  matchRowMeta: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  inviteArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(57,255,20,0.1)",
    justifyContent: "center", alignItems: "center",
  },
});
