import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Modal, TextInput, ScrollView, Alert } from "react-native";
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

  const { data: team, isLoading } = trpc.team.getById.useQuery({ id: teamId });
  const { data: myPlayer } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const joinMutation = trpc.team.join.useMutation({ onSuccess: () => { utils.team.getById.invalidate({ id: teamId }); utils.player.me.invalidate(); } });
  const updateLogoMutation = trpc.team.updateLogo.useMutation({ onSuccess: () => utils.team.getById.invalidate({ id: teamId }) });
  const addPlayerMutation = trpc.team.addPlayer.useMutation({ onSuccess: () => utils.team.getById.invalidate({ id: teamId }) });
  const removePlayerMutation = trpc.team.removePlayer.useMutation({ onSuccess: () => utils.team.getById.invalidate({ id: teamId }) });

  // Add player modal
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: freeAgents } = trpc.player.freeAgents.useQuery({}, { enabled: showAddPlayer });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isCaptain = myPlayer?.isCaptain && myPlayer?.teamId === teamId;
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

  const filteredAgents = (freeAgents ?? []).filter((a: any) =>
    !searchQuery || a.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            </View>

            {canJoin && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => joinMutation.mutate({ teamId })}
                disabled={joinMutation.isPending}
              >
                <Text style={styles.joinBtnText}>{joinMutation.isPending ? "Joining..." : "Join Team"}</Text>
              </TouchableOpacity>
            )}

            {isCaptain && (
              <TouchableOpacity style={styles.addPlayerBtn} onPress={() => setShowAddPlayer(true)}>
                <IconSymbol name="person.badge.plus" size={20} color="#0A0A0A" />
                <Text style={styles.addPlayerBtnText}>Add Player</Text>
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
              placeholder="Search free agents..."
              placeholderTextColor="#555"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView style={styles.playerList}>
              {filteredAgents.length === 0 ? (
                <Text style={styles.noResults}>No free agents found</Text>
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
  joinBtn: { marginHorizontal: 20, backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  joinBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  addPlayerBtn: { marginHorizontal: 20, backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 12, alignItems: "center", marginBottom: 20, flexDirection: "row", justifyContent: "center", gap: 8 },
  addPlayerBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
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
