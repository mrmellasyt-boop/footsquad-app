import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Api from "@/lib/_core/api";

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = Number(id);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: team, isLoading, refetch: refetchTeam } = trpc.team.getById.useQuery({ id: teamId });
  const { data: myPlayer, refetch: refetchMe } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const joinMutation = trpc.team.join.useMutation({
    onSuccess: () => {
      refetchTeam();
      refetchMe();
      utils.player.me.invalidate();
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

  // Add player modal
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isFetching: isSearching } = trpc.player.search.useQuery(
    { query: searchQuery },
    { enabled: showAddPlayer && searchQuery.length >= 2 }
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isCaptain = myPlayer?.isCaptain && myPlayer?.teamId === teamId;
  const isMember = myPlayer?.teamId === teamId && !myPlayer?.isCaptain;
  const canJoin = isAuthenticated && myPlayer && !myPlayer.teamId && myPlayer.isFreeAgent;

  if (isLoading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View></ScreenContainer>;
  }

  if (!team) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.emptyText}>Team not found</Text></View></ScreenContainer>;
  }

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploadingLogo(true);
      const asset = result.assets[0];
      const url = await Api.uploadFile(asset.uri, asset.mimeType || "image/jpeg");
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
      "Delete Team",
      "Are you sure you want to delete this team? This action cannot be undone. All members will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ teamId }) },
      ]
    );
  };

  const filteredAgents = searchQuery.length >= 2 ? (searchResults ?? []) : [];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "team"}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={() => (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.teamHeader}>
              <TouchableOpacity style={styles.teamLogo} onPress={isCaptain ? handlePickLogo : undefined} disabled={!isCaptain}>
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
              <Text style={styles.teamCity}>{team.city}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{team.totalMatches}</Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{team.totalWins}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{team.members?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Players</Text>
                </View>
              </View>
            </View>

            {/* Join Team */}
            {canJoin && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => joinMutation.mutate({ teamId })}
                disabled={joinMutation.isPending}
              >
                <Text style={styles.joinBtnText}>{joinMutation.isPending ? "Joining..." : "Join Team"}</Text>
              </TouchableOpacity>
            )}

            {/* Captain Actions */}
            {isCaptain && (
              <View style={styles.captainActions}>
                <TouchableOpacity style={styles.addPlayerBtn} onPress={() => setShowAddPlayer(true)}>
                  <IconSymbol name="person.badge.plus" size={20} color="#0A0A0A" />
                  <Text style={styles.addPlayerBtnText}>Add Player</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteTeamBtn} onPress={handleDeleteTeam} disabled={deleteMutation.isPending}>
                  <IconSymbol name="trash.fill" size={18} color="#FF4444" />
                  <Text style={styles.deleteTeamBtnText}>{deleteMutation.isPending ? "Deleting..." : "Delete Team"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Member: Leave Team */}
            {isMember && (
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveTeam} disabled={leaveMutation.isPending}>
                <IconSymbol name="arrow.right.square.fill" size={18} color="#FF4444" />
                <Text style={styles.leaveBtnText}>{leaveMutation.isPending ? "Leaving..." : "Leave Team"}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Members ({team.members?.length ?? 0})</Text>
              {(team.members ?? []).map((member: any) => (
                <View key={member.id} style={styles.memberRow}>
                  <TouchableOpacity style={styles.memberTap} onPress={() => router.push(`/player/${member.id}` as any)}>
                    <View style={styles.memberAvatar}>
                      {member.photoUrl ? (
                        <Image source={{ uri: member.photoUrl }} style={styles.memberAvatarImg} contentFit="cover" />
                      ) : (
                        <IconSymbol name="person.fill" size={18} color="#8A8A8A" />
                      )}
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.fullName}</Text>
                      <Text style={styles.memberMeta}>{member.position}</Text>
                    </View>
                    {member.isCaptain && (
                      <View style={styles.captainBadge}>
                        <Text style={styles.captainText}>Captain</Text>
                      </View>
                    )}
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

      {/* Add Player Modal */}
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
                placeholder="Search player by name or city..."
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
                        <Text style={styles.agentMeta}>{agent.position} - {agent.city}</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8, marginBottom: 8 },
  teamHeader: { alignItems: "center", paddingVertical: 20 },
  teamLogo: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", overflow: "hidden", borderWidth: 3, borderColor: "#39FF14", marginBottom: 12 },
  teamLogoImg: { width: 96, height: 96, borderRadius: 48, overflow: "hidden" },
  cameraOverlay: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#39FF14", borderRadius: 12, padding: 4 },
  teamName: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  teamCity: { color: "#8A8A8A", fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 24, marginTop: 16 },
  statBox: { alignItems: "center" },
  statValue: { color: "#39FF14", fontSize: 22, fontWeight: "900" },
  statLabel: { color: "#8A8A8A", fontSize: 11, marginTop: 2 },
  joinBtn: { marginHorizontal: 20, backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  joinBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  captainActions: { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  addPlayerBtn: { backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  addPlayerBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  deleteTeamBtn: { backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 16, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FF4444" },
  deleteTeamBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 15 },
  leaveBtn: { marginHorizontal: 20, backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 16, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FF4444", marginBottom: 20 },
  leaveBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 15 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#2A2A2A" },
  memberTap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  memberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  memberInfo: { flex: 1 },
  memberName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  memberMeta: { color: "#39FF14", fontSize: 12, marginTop: 2 },
  captainBadge: { backgroundColor: "#FFD700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  captainText: { color: "#0A0A0A", fontSize: 11, fontWeight: "800" },
  removeBtn: { padding: 8, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  searchInput: { backgroundColor: "#0A0A0A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 12 },
  playerList: { maxHeight: 400 },
  noResults: { color: "#8A8A8A", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  agentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  agentInfo: { flex: 1 },
  agentName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  agentMeta: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  addBtn: { padding: 4 },
});
