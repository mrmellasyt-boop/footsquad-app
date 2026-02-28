import { useState } from "react";
import {
  Text, View, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, Modal, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { GalleryPicker, type PickedAsset } from "@/components/gallery-picker";
import * as Api from "@/lib/_core/api";
import { compressTeamLogo } from "@/lib/media-compress";
import { useT } from "@/lib/i18n/LanguageContext";

// ─── Stat Card ───
function StatCard({ value, label, color = "#39FF14" }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───
function SectionHeader({ title, icon }: { title: string; icon: any }) {
  return (
    <View style={styles.sectionHeader}>
      <IconSymbol name={icon} size={18} color="#39FF14" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = Number(id);
  const router = useRouter();
  const t = useT();
  const { isAuthenticated } = useAuth();

  const { data: team, isLoading, refetch: refetchTeam } = trpc.team.getById.useQuery(
    { id: teamId },
    { refetchOnWindowFocus: true }
  );
  const { data: stats } = trpc.team.stats.useQuery(
    { teamId },
    { refetchOnWindowFocus: true }
  );
  const { data: topPlayer } = trpc.team.topPlayer.useQuery(
    { teamId },
    { refetchOnWindowFocus: true }
  );
  const { data: openChallenge } = trpc.team.openChallenge.useQuery(
    { teamId },
    { refetchOnWindowFocus: true }
  );
  const { data: myPlayer, refetch: refetchMe } = trpc.player.me.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchOnWindowFocus: true }
  );
  const utils = trpc.useUtils();

  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const joinMutation = trpc.team.join.useMutation({
    onSuccess: () => {
      setJoinRequestSent(true);
      Alert.alert("Request Sent ✅", "Your join request has been sent to the captain. You will be notified when they respond.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const leaveMutation = trpc.team.leave.useMutation({
    onSuccess: () => {
      Alert.alert("Left Team", "You have successfully left the team.");
      refetchTeam();
      refetchMe();
      utils.player.me.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const deleteMutation = trpc.team.deleteTeam.useMutation({
    onSuccess: () => {
      Alert.alert("Team Deleted", "Your team has been deleted.");
      utils.player.me.invalidate();
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const updateLogoMutation = trpc.team.updateLogo.useMutation({
    onSuccess: () => refetchTeam(),
  });

  const addPlayerMutation = trpc.team.addPlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      Alert.alert("Player Added", "Player has been added to the team.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const removePlayerMutation = trpc.team.removePlayer.useMutation({
    onSuccess: () => refetchTeam(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isFetching: isSearching } = trpc.player.search.useQuery(
    { query: searchQuery },
    { enabled: showAddPlayer && searchQuery.length >= 2 }
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showLogoPicker, setShowLogoPicker] = useState(false);

  const isCaptain = myPlayer?.isCaptain && myPlayer?.teamId === teamId;
  const isMember = myPlayer?.teamId === teamId && !myPlayer?.isCaptain;
  const canJoin = isAuthenticated && myPlayer && !myPlayer.teamId && myPlayer.isFreeAgent;

  if (isLoading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View></ScreenContainer>;
  }

  if (!team) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.emptyText}>Team not found</Text></View></ScreenContainer>;
  }

  const handlePickLogo = () => {
    setShowLogoPicker(true);
  };

  const handleLogoPicked = async (asset: PickedAsset) => {
    setUploadingLogo(true);
    try {
      const compressedUri = await compressTeamLogo(asset.uri);
      const url = await Api.uploadFile(compressedUri, asset.mimeType);
      updateLogoMutation.mutate({ teamId, logoUrl: url });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemovePlayer = (playerId: number, playerName: string) => {
    Alert.alert("Remove Player", `Remove ${playerName} from the team?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removePlayerMutation.mutate({ teamId, playerId }) },
    ]);
  };

  const handleLeaveTeam = () => {
    Alert.alert("Leave Team", "Are you sure you want to leave this team?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => leaveMutation.mutate() },
    ]);
  };

  const handleDeleteTeam = () => {
    Alert.alert(
      t.team.deleteTitle,
      t.team.deleteBody,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ teamId }) },
      ]
    );
  };

  const filteredAgents = searchQuery.length >= 2 ? (searchResults ?? []) : [];

  const positionColor: Record<string, string> = {
    GK: "#FFD700",
    DEF: "#4FC3F7",
    MID: "#39FF14",
    ATT: "#FF6B6B",
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "team"}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <View>
            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* ─── TEAM HEADER ─── */}
            <View style={styles.teamHeader}>
              <TouchableOpacity
                style={styles.teamLogo}
                onPress={isCaptain ? handlePickLogo : undefined}
                disabled={!isCaptain}
              >
                {uploadingLogo ? (
                  <ActivityIndicator size="small" color="#39FF14" />
                ) : team.logoUrl ? (
                  <Image source={{ uri: team.logoUrl }} style={styles.teamLogoImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="shield.fill" size={48} color="#39FF14" />
                )}
                {isCaptain && (
                  <View style={styles.cameraOverlay}>
                    <IconSymbol name="camera.fill" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.teamName}>{team.name}</Text>
              <View style={styles.teamMetaRow}>
                <IconSymbol name="location.fill" size={14} color="#8A8A8A" />
                <Text style={styles.teamCity}>{team.city}</Text>
              </View>
              <View style={styles.teamBadgeRow}>
                <View style={styles.memberCountBadge}>
                  <IconSymbol name="person.2.fill" size={13} color="#39FF14" />
                  <Text style={styles.memberCountText}>{team.members?.length ?? 0} players</Text>
                </View>
              </View>
            </View>

            {/* ─── ACTION BUTTONS ─── */}
            {canJoin && (
              joinRequestSent ? (
                <View style={[styles.joinBtn, { backgroundColor: "#1A2A1A", borderWidth: 1, borderColor: "#39FF14" }]}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#39FF14" />
                  <Text style={[styles.joinBtnText, { color: "#39FF14" }]}>Request Sent - Awaiting Captain</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => joinMutation.mutate({ teamId })}
                  disabled={joinMutation.isPending}
                >
                  <IconSymbol name="person.badge.plus" size={18} color="#0A0A0A" />
                  <Text style={styles.joinBtnText}>{joinMutation.isPending ? "Sending Request..." : "Join Team"}</Text>
                </TouchableOpacity>
              )
            )}

            {isCaptain && (
              <View style={styles.captainActions}>
                <TouchableOpacity style={styles.addPlayerBtn} onPress={() => setShowAddPlayer(true)}>
                  <IconSymbol name="person.badge.plus" size={20} color="#0A0A0A" />
                  <Text style={styles.addPlayerBtnText}>Add Player</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteTeamBtn}
                  onPress={handleDeleteTeam}
                  disabled={deleteMutation.isPending}
                >
                  <IconSymbol name="trash.fill" size={18} color="#FF4444" />
                  <Text style={styles.deleteTeamBtnText}>{deleteMutation.isPending ? "Deleting..." : "Delete Team"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {isMember && (
              <TouchableOpacity
                style={styles.leaveBtn}
                onPress={handleLeaveTeam}
                disabled={leaveMutation.isPending}
              >
                <IconSymbol name="arrow.left" size={18} color="#FF4444" />
                <Text style={styles.leaveBtnText}>{leaveMutation.isPending ? "Leaving..." : "Leave Team"}</Text>
              </TouchableOpacity>
            )}

            {/* ─── OPEN CHALLENGE BANNER ─── */}
            {openChallenge && (
              <TouchableOpacity
                style={styles.challengeBanner}
                onPress={() => router.push("/(tabs)/challenges" as any)}
                activeOpacity={0.8}
              >
                <View style={styles.challengeBannerLeft}>
                  <IconSymbol name="bolt.fill" size={18} color="#39FF14" />
                  <View>
                    <Text style={styles.challengeBannerTitle}>Open Challenge</Text>
                    <Text style={styles.challengeBannerSub}>
                      {openChallenge.format} · {openChallenge.city}
                      {openChallenge.preferredDate ? ` · ${openChallenge.preferredDate}` : ""}
                    </Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#39FF14" />
              </TouchableOpacity>
            )}

            {/* ─── PERFORMANCE STATS ─── */}
            <View style={styles.section}>
              <SectionHeader title={t.team.performance} icon="trophy.fill" />
              {stats ? (
                <>
                  {/* Win / Draw / Loss row */}
                  <View style={styles.wdlRow}>
                    <View style={[styles.wdlBox, styles.wdlWin]}>
                      <Text style={styles.wdlValue}>{stats.wins}</Text>
                      <Text style={styles.wdlLabel}>W</Text>
                    </View>
                    <View style={[styles.wdlBox, styles.wdlDraw]}>
                      <Text style={styles.wdlValue}>{stats.draws}</Text>
                      <Text style={styles.wdlLabel}>D</Text>
                    </View>
                    <View style={[styles.wdlBox, styles.wdlLoss]}>
                      <Text style={styles.wdlValue}>{stats.losses}</Text>
                      <Text style={styles.wdlLabel}>L</Text>
                    </View>
                  </View>

                  {/* Stats grid */}
                  <View style={styles.statsGrid}>
                    <StatCard value={stats.totalPlayed} label={t.team.played} />
                    <StatCard value={`${stats.winRate}%`} label="Win Rate" color={stats.winRate >= 50 ? "#39FF14" : "#FF6B6B"} />
                    <StatCard value={stats.goalsScored} label="Goals For" color="#39FF14" />
                    <StatCard value={stats.goalsConceded} label="Goals Ag." color="#FF6B6B" />
                  </View>

                  {/* Goal difference */}
                  {stats.totalPlayed > 0 && (
                    <View style={styles.goalDiffRow}>
                      <Text style={styles.goalDiffLabel}>Goal Difference</Text>
                      <Text style={[
                        styles.goalDiffValue,
                        { color: stats.goalsScored - stats.goalsConceded >= 0 ? "#39FF14" : "#FF4444" }
                      ]}>
                        {stats.goalsScored - stats.goalsConceded >= 0 ? "+" : ""}
                        {stats.goalsScored - stats.goalsConceded}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noStatsBox}>
                  <Text style={styles.noStatsText}>No completed matches yet</Text>
                </View>
              )}
            </View>

            {/* ─── TOP PLAYER ─── */}
            {topPlayer && (
              <View style={styles.section}>
                <SectionHeader title={t.team.bestPlayer} icon="star.fill" />
                <TouchableOpacity
                  style={styles.topPlayerCard}
                  onPress={() => router.push(`/player/${topPlayer.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.topPlayerLeft}>
                    <View style={styles.topPlayerAvatar}>
                      {topPlayer.photoUrl ? (
                        <Image source={{ uri: topPlayer.photoUrl }} style={styles.topPlayerAvatarImg} contentFit="cover" />
                      ) : (
                        <IconSymbol name="person.fill" size={28} color="#8A8A8A" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.topPlayerName}>{topPlayer.fullName}</Text>
                      <View style={styles.topPlayerMeta}>
                        <View style={[styles.positionBadge, { backgroundColor: `${positionColor[topPlayer.position] ?? "#8A8A8A"}22` }]}>
                          <Text style={[styles.positionText, { color: positionColor[topPlayer.position] ?? "#8A8A8A" }]}>
                            {topPlayer.position}
                          </Text>
                        </View>
                        {topPlayer.motmCount > 0 && (
                          <View style={styles.motmBadge}>
                            <IconSymbol name="trophy.fill" size={11} color="#FFD700" />
                            <Text style={styles.motmText}>{topPlayer.motmCount} MOTM</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.topPlayerRight}>
                    {topPlayer.avgRating !== null ? (
                      <>
                        <Text style={styles.topPlayerRating}>{topPlayer.avgRating.toFixed(1)}</Text>
                        <Text style={styles.topPlayerRatingLabel}>Avg Rating</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.topPlayerRating}>{topPlayer.totalMatches}</Text>
                        <Text style={styles.topPlayerRatingLabel}>Matches</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ─── MEMBERS ─── */}
            <View style={styles.section}>
              <SectionHeader title={`Squad (${team.members?.length ?? 0})`} icon="person.2.fill" />
              {(team.members ?? []).map((member: any) => (
                <View key={member.id} style={styles.memberRow}>
                  <TouchableOpacity
                    style={styles.memberTap}
                    onPress={() => router.push(`/player/${member.id}` as any)}
                  >
                    <View style={styles.memberAvatar}>
                      {member.photoUrl ? (
                        <Image source={{ uri: member.photoUrl }} style={styles.memberAvatarImg} contentFit="cover" />
                      ) : (
                        <IconSymbol name="person.fill" size={18} color="#8A8A8A" />
                      )}
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.fullName}</Text>
                        {member.isCaptain && (
                          <View style={styles.captainBadge}>
                            <Text style={styles.captainText}>C</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.memberMetaRow}>
                        <View style={[styles.positionBadge, { backgroundColor: `${positionColor[member.position] ?? "#8A8A8A"}22` }]}>
                          <Text style={[styles.positionText, { color: positionColor[member.position] ?? "#8A8A8A" }]}>
                            {member.position}
                          </Text>
                        </View>
                        <Text style={styles.memberPoints}>{member.totalPoints} pts</Text>
                        {member.ratingCount > 0 && (
                          <Text style={styles.memberRating}>
                            ★ {(member.totalRatings / member.ratingCount).toFixed(1)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {isCaptain && !member.isCaptain && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemovePlayer(member.id, member.fullName)}
                    >
                      <IconSymbol name="person.badge.minus" size={18} color="#FF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* ─── ADD PLAYER MODAL ─── */}
      <Modal visible={showAddPlayer} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Player</Text>
                <TouchableOpacity onPress={() => { setShowAddPlayer(false); setSearchQuery(""); }}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t.team.searchPlayer}
                placeholderTextColor="#555"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length < 2 && (
                <Text style={styles.noResults}>Type at least 2 characters to search</Text>
              )}
              {isSearching && searchQuery.length >= 2 && (
                <ActivityIndicator color="#39FF14" style={{ marginTop: 16 }} />
              )}
              <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
                {searchQuery.length >= 2 && !isSearching && filteredAgents.length === 0 ? (
                  <Text style={styles.noResults}>No players found</Text>
                ) : (
                  filteredAgents.map((agent: any) => (
                    <View key={agent.id} style={styles.agentRow}>
                      <View style={styles.agentInfo}>
                        <Text style={styles.agentName}>{agent.fullName}</Text>
                        <Text style={styles.agentMeta}>{agent.position} · {agent.city}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => {
                          addPlayerMutation.mutate({ teamId, playerId: agent.id });
                          setShowAddPlayer(false);
                          setSearchQuery("");
                        }}
                      >
                        <IconSymbol name="plus.circle.fill" size={24} color="#39FF14" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Logo Picker */}
      <GalleryPicker
        visible={showLogoPicker}
        mediaType="photo"
        onPick={handleLogoPicked}
        onClose={() => setShowLogoPicker(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center",
    marginLeft: 20, marginTop: 8, marginBottom: 8,
  },

  // Team Header
  teamHeader: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 20 },
  teamLogo: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center",
    overflow: "hidden", borderWidth: 3, borderColor: "#39FF14",
    marginBottom: 12,
  },
  teamLogoImg: { width: 96, height: 96, borderRadius: 48 },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "#39FF14", borderRadius: 12, padding: 4,
  },
  teamName: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", textAlign: "center" },
  teamMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  teamCity: { color: "#8A8A8A", fontSize: 14 },
  teamBadgeRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  memberCountBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(57,255,20,0.1)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(57,255,20,0.3)",
  },
  memberCountText: { color: "#39FF14", fontSize: 13, fontWeight: "700" },

  // Action Buttons
  joinBtn: {
    marginHorizontal: 20, backgroundColor: "#39FF14",
    borderRadius: 16, paddingVertical: 14,
    alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: 8, marginBottom: 12,
  },
  joinBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  captainActions: { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  addPlayerBtn: {
    backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 12,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
  },
  addPlayerBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  deleteTeamBtn: {
    backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 16, paddingVertical: 12,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#FF4444",
  },
  deleteTeamBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 15 },
  leaveBtn: {
    marginHorizontal: 20, backgroundColor: "rgba(255,68,68,0.1)",
    borderRadius: 16, paddingVertical: 12,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#FF4444", marginBottom: 20,
  },
  leaveBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 15 },

  // Challenge Banner
  challengeBanner: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(57,255,20,0.3)",
  },
  challengeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  challengeBannerTitle: { color: "#39FF14", fontWeight: "800", fontSize: 14 },
  challengeBannerSub: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },

  // W/D/L
  wdlRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  wdlBox: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  wdlWin: { backgroundColor: "rgba(57,255,20,0.15)", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)" },
  wdlDraw: { backgroundColor: "rgba(255,213,0,0.12)", borderWidth: 1, borderColor: "rgba(255,213,0,0.3)" },
  wdlLoss: { backgroundColor: "rgba(255,68,68,0.12)", borderWidth: 1, borderColor: "rgba(255,68,68,0.3)" },
  wdlValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  wdlLabel: { color: "#8A8A8A", fontSize: 12, fontWeight: "700", marginTop: 2 },

  // Stats Grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: "#1A1A1A", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A",
  },
  statCardValue: { fontSize: 24, fontWeight: "900" },
  statCardLabel: { color: "#8A8A8A", fontSize: 11, marginTop: 4, fontWeight: "600" },

  goalDiffRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1A1A1A", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  goalDiffLabel: { color: "#8A8A8A", fontSize: 14 },
  goalDiffValue: { fontSize: 18, fontWeight: "900" },

  noStatsBox: {
    backgroundColor: "#1A1A1A", borderRadius: 14,
    paddingVertical: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  noStatsText: { color: "#555", fontSize: 14 },

  // Top Player
  topPlayerCard: {
    backgroundColor: "#1A1A1A", borderRadius: 16,
    padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,213,0,0.3)",
  },
  topPlayerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  topPlayerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center",
    overflow: "hidden", borderWidth: 2, borderColor: "#FFD700",
  },
  topPlayerAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  topPlayerName: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  topPlayerMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  topPlayerRight: { alignItems: "center" },
  topPlayerRating: { color: "#FFD700", fontSize: 26, fontWeight: "900" },
  topPlayerRatingLabel: { color: "#8A8A8A", fontSize: 11, marginTop: 2 },

  // Position Badge
  positionBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  positionText: { fontSize: 11, fontWeight: "800" },

  // MOTM Badge
  motmBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(255,213,0,0.15)",
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  motmText: { color: "#FFD700", fontSize: 11, fontWeight: "700" },

  // Members
  memberRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1A1A1A", borderRadius: 14,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  memberTap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center", overflow: "hidden",
  },
  memberAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  captainBadge: {
    backgroundColor: "#FFD700", width: 20, height: 20,
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  captainText: { color: "#0A0A0A", fontSize: 10, fontWeight: "900" },
  memberMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  memberPoints: { color: "#8A8A8A", fontSize: 12 },
  memberRating: { color: "#FFD700", fontSize: 12, fontWeight: "700" },
  removeBtn: { padding: 8, marginLeft: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "75%", padding: 20,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  searchInput: {
    backgroundColor: "#0A0A0A", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    color: "#FFFFFF", fontSize: 15,
    borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 12,
  },
  playerList: { maxHeight: 400 },
  noResults: { color: "#8A8A8A", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  agentRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#2A2A2A",
  },
  agentInfo: { flex: 1 },
  agentName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  agentMeta: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  addBtn: { padding: 4 },
});
