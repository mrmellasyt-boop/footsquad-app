import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, ScrollView, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Api from "@/lib/_core/api";

function ProfileSetup() {
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [countryFlag, setCountryFlag] = useState("");
  const [position, setPosition] = useState<"GK" | "DEF" | "MID" | "ATT">("MID");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();
  const { data: countries } = trpc.ref.countries.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.player.create.useMutation({
    onSuccess: () => utils.player.me.invalidate(),
  });

  const positions: ("GK" | "DEF" | "MID" | "ATT")[] = ["GK", "DEF", "MID", "ATT"];

  const handleCreate = () => {
    if (!fullName.trim() || !city || !country) return;
    createMutation.mutate({ fullName: fullName.trim(), city, country, countryFlag, position });
  };

  return (
    <ScrollView contentContainerStyle={styles.setupContainer}>
      <View style={styles.setupHeader}>
        <IconSymbol name="person.fill" size={48} color="#39FF14" />
        <Text style={styles.setupTitle}>Create Your Profile</Text>
        <Text style={styles.setupSubtitle}>Set up your player card to start competing</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.textInput} placeholder="Your name" placeholderTextColor="#555" value={fullName} onChangeText={setFullName} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>City</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
          <Text style={city ? styles.selectText : styles.selectPlaceholder}>{city || "Select city"}</Text>
          <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Country</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCountryPicker(true)}>
          <Text style={country ? styles.selectText : styles.selectPlaceholder}>
            {country ? `${countryFlag} ${country}` : "Select country"}
          </Text>
          <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Position</Text>
        <View style={styles.positionRow}>
          {positions.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[styles.positionBtn, position === pos && styles.positionBtnActive]}
              onPress={() => setPosition(pos)}
            >
              <Text style={[styles.positionText, position === pos && styles.positionTextActive]}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createProfileBtn, (!fullName.trim() || !city || !country) && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={!fullName.trim() || !city || !country || createMutation.isPending}
      >
        <Text style={styles.createProfileBtnText}>
          {createMutation.isPending ? "Creating..." : "Create Profile"}
        </Text>
      </TouchableOpacity>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {(cities ?? []).map((c) => (
                <TouchableOpacity key={c} style={styles.pickerItem} onPress={() => { setCity(c); setShowCityPicker(false); }}>
                  <Text style={[styles.pickerText, city === c && styles.pickerTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {(countries ?? []).map((c) => (
                <TouchableOpacity key={c.name} style={styles.pickerItem} onPress={() => { setCountry(c.name); setCountryFlag(c.flag); setShowCountryPicker(false); }}>
                  <Text style={[styles.pickerText, country === c.name && styles.pickerTextActive]}>{c.flag} {c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ProfileView() {
  const { data: player, isLoading } = trpc.player.me.useQuery();
  const { data: myMatches } = trpc.match.myMatches.useQuery();
  const { data: allHighlights } = trpc.highlight.list.useQuery();
  const { logout } = useAuth();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Edit profile state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPosition, setEditPosition] = useState<"GK" | "DEF" | "MID" | "ATT">("MID");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();
  const updateMutation = trpc.player.update.useMutation({
    onSuccess: () => { utils.player.me.invalidate(); setShowEdit(false); },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>;
  if (!player) return <ProfileSetup />;

  const avgRating = player.ratingCount > 0 ? (player.totalRatings / player.ratingCount).toFixed(1) : "—";

  const openEdit = () => {
    setEditName(player.fullName);
    setEditCity(player.city);
    setEditPosition(player.position as any);
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editCity) return;
    updateMutation.mutate({ fullName: editName.trim(), city: editCity, position: editPosition });
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploadingPhoto(true);
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const url = await Api.uploadFile(asset.uri, mimeType);
      updateMutation.mutate({ photoUrl: url });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError("");
    if (!currentPwd || !newPwd) { setPwdError("Fill both fields"); return; }
    if (newPwd.length < 6) { setPwdError("Min 6 characters"); return; }
    setPwdLoading(true);
    try {
      await Api.changePassword(currentPwd, newPwd);
      Alert.alert("Success", "Password changed");
      setShowPasswordModal(false);
      setCurrentPwd("");
      setNewPwd("");
    } catch (err: any) {
      setPwdError(err.message || "Failed");
    } finally {
      setPwdLoading(false);
    }
  };

  const positions: ("GK" | "DEF" | "MID" | "ATT")[] = ["GK", "DEF", "MID", "ATT"];

  return (
    <>
      <FlatList
        data={[1]}
        keyExtractor={() => "profile"}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={() => (
          <View>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.profileAvatar} onPress={handlePickPhoto}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#39FF14" />
                ) : player.photoUrl ? (
                  <Image source={{ uri: player.photoUrl }} style={styles.profileAvatarImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="person.fill" size={40} color="#8A8A8A" />
                )}
                <View style={styles.cameraOverlay}>
                  <IconSymbol name="camera.fill" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{player.fullName}</Text>
              <Text style={styles.profileLocation}>{player.countryFlag} {player.city}, {player.country}</Text>
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText}>{player.position}</Text>
              </View>
              <TouchableOpacity style={styles.editProfileBtn} onPress={openEdit}>
                <IconSymbol name="pencil" size={14} color="#39FF14" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{player.totalMatches}</Text>
                <Text style={styles.statCardLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: "#39FF14" }]}>{player.totalPoints}</Text>
                <Text style={styles.statCardLabel}>Points</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{avgRating}</Text>
                <Text style={styles.statCardLabel}>Avg Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: "#FFD700" }]}>{player.motmCount}</Text>
                <Text style={styles.statCardLabel}>MOTM</Text>
              </View>
            </View>

            {/* Team */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Team</Text>
              {player.teamId ? (
                <TouchableOpacity style={styles.teamCard} onPress={() => router.push(`/team/${player.teamId}` as any)}>
                  <IconSymbol name="shield.fill" size={24} color="#39FF14" />
                  <Text style={styles.teamCardName}>View Team</Text>
                  <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
                </TouchableOpacity>
              ) : (
                <View style={styles.freeAgentCard}>
                  <Text style={styles.freeAgentBadge}>FREE AGENT</Text>
                  <TouchableOpacity style={styles.createTeamBtn} onPress={() => router.push("/create-team" as any)}>
                    <Text style={styles.createTeamBtnText}>Create Team</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.sectionBlock}>
              <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/free-agents" as any)}>
                <IconSymbol name="person.2.fill" size={20} color="#39FF14" />
                <Text style={styles.actionText}>Free Agent Board</Text>
                <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/notifications" as any)}>
                <IconSymbol name="bell.fill" size={20} color="#39FF14" />
                <Text style={styles.actionText}>Notifications</Text>
                <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={() => setShowPasswordModal(true)}>
                <IconSymbol name="lock.fill" size={20} color="#39FF14" />
                <Text style={styles.actionText}>Change Password</Text>
                <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
              </TouchableOpacity>
            </View>

            {/* My Active Highlights */}
            {(() => {
              const myHighlights = (allHighlights ?? []).filter(
                (h) => h.player?.id === player.id
              );
              if (myHighlights.length === 0) return null;
              return (
                <View style={styles.sectionBlock}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <Text style={styles.sectionTitle}>My Highlights</Text>
                    <View style={{ backgroundColor: "#FF4444", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>48H</Text>
                    </View>
                  </View>
                  <FlatList
                    data={myHighlights}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(h) => h.id.toString()}
                    contentContainerStyle={{ gap: 10 }}
                    renderItem={({ item: h }) => {
                      const cardW = 110;
                      const cardH = Math.round(cardW * (16 / 9));
                      return (
                        <TouchableOpacity
                          style={{ width: cardW, height: cardH, borderRadius: 12, overflow: "hidden", backgroundColor: "#1A1A1A" }}
                          activeOpacity={0.85}
                          onPress={() => router.push(`/highlight/${h.id}` as any)}
                        >
                          {h.mediaUrl ? (
                            <Image source={{ uri: h.mediaUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                          ) : (
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                              <IconSymbol name="video.fill" size={24} color="#39FF14" />
                            </View>
                          )}
                          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.7)", padding: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <IconSymbol name="heart.fill" size={10} color="#FF4444" />
                              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600" }}>{h.likes}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                  <TouchableOpacity
                    style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                    onPress={() => router.push("/upload-highlight" as any)}
                  >
                    <IconSymbol name="plus.circle.fill" size={16} color="#39FF14" />
                    <Text style={{ color: "#39FF14", fontSize: 13, fontWeight: "700" }}>Post New Highlight</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Match History */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Match History</Text>
              {(!myMatches || myMatches.length === 0) ? (
                <Text style={styles.noMatchesText}>No matches played yet</Text>
              ) : (
                myMatches.slice(0, 10).map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.historyRow}
                    onPress={() => router.push(`/match/${match.id}` as any)}
                  >
                    <View style={styles.historyTeams}>
                      <Text style={styles.historyTeamName} numberOfLines={1}>{match.teamA?.name ?? "?"}</Text>
                      <Text style={styles.historyScore}>
                        {match.status === "completed" ? `${match.scoreA} - ${match.scoreB}` : "—"}
                      </Text>
                      <Text style={styles.historyTeamName} numberOfLines={1}>{match.teamB?.name ?? "?"}</Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(match.matchDate).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>City</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
                <Text style={styles.selectText}>{editCity}</Text>
                <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Position</Text>
              <View style={styles.positionRow}>
                {positions.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.positionBtn, editPosition === pos && styles.positionBtnActive]}
                    onPress={() => setEditPosition(pos)}
                  >
                    <Text style={[styles.positionText, editPosition === pos && styles.positionTextActive]}>{pos}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.createProfileBtn} onPress={handleSaveEdit} disabled={updateMutation.isPending}>
              <Text style={styles.createProfileBtnText}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* City Picker for Edit */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {(cities ?? []).map((c) => (
                <TouchableOpacity key={c} style={styles.pickerItem} onPress={() => { setEditCity(c); setShowCityPicker(false); }}>
                  <Text style={[styles.pickerText, editCity === c && styles.pickerTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => { setShowPasswordModal(false); setPwdError(""); setCurrentPwd(""); setNewPwd(""); }}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput style={styles.textInput} secureTextEntry value={currentPwd} onChangeText={setCurrentPwd} placeholder="Enter current password" placeholderTextColor="#555" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput style={styles.textInput} secureTextEntry value={newPwd} onChangeText={setNewPwd} placeholder="Enter new password" placeholderTextColor="#555" />
            </View>
            {pwdError ? <Text style={styles.errorText}>{pwdError}</Text> : null}
            <TouchableOpacity style={styles.createProfileBtn} onPress={handleChangePassword} disabled={pwdLoading}>
              <Text style={styles.createProfileBtnText}>{pwdLoading ? "Changing..." : "Change Password"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function ProfileScreen() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <IconSymbol name="person.fill" size={64} color="#2A2A2A" />
          <Text style={styles.loginTitle}>Join Footsquad</Text>
          <Text style={styles.loginSubtitle}>Sign in to create your profile and start competing</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/login" as any)}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>
      <ProfileView />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  screenTitle: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 40 },
  loginTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  loginSubtitle: { color: "#8A8A8A", fontSize: 14, textAlign: "center" },
  loginBtn: { backgroundColor: "#39FF14", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  loginBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  setupContainer: { padding: 20, paddingBottom: 40 },
  setupHeader: { alignItems: "center", marginBottom: 32, gap: 8 },
  setupTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  setupSubtitle: { color: "#8A8A8A", fontSize: 14 },
  formGroup: { marginBottom: 20 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  textInput: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#2A2A2A" },
  selectBtn: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  selectText: { color: "#FFFFFF", fontSize: 16 },
  selectPlaceholder: { color: "#555", fontSize: 16 },
  positionRow: { flexDirection: "row", gap: 8 },
  positionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1A1A1A", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  positionBtnActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  positionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  positionTextActive: { color: "#0A0A0A" },
  createProfileBtn: { backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  btnDisabled: { opacity: 0.4 },
  createProfileBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  profileHeader: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 20 },
  profileAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", overflow: "hidden", borderWidth: 3, borderColor: "#39FF14", marginBottom: 12 },
  profileAvatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraOverlay: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#39FF14", borderRadius: 12, padding: 4 },
  profileName: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  profileLocation: { color: "#8A8A8A", fontSize: 14, marginTop: 4 },
  positionBadge: { backgroundColor: "#39FF14", paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  positionBadgeText: { color: "#0A0A0A", fontWeight: "800", fontSize: 14 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#39FF14" },
  editProfileText: { color: "#39FF14", fontWeight: "700", fontSize: 13 },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  statNumber: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  statCardLabel: { color: "#8A8A8A", fontSize: 10, marginTop: 2, fontWeight: "600" },
  sectionBlock: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  teamCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#2A2A2A", gap: 12 },
  teamCardName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", flex: 1 },
  freeAgentCard: { backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#FFD700", alignItems: "center", gap: 12 },
  freeAgentBadge: { color: "#FFD700", fontSize: 16, fontWeight: "800" },
  createTeamBtn: { backgroundColor: "#39FF14", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16 },
  createTeamBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  actionRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#2A2A2A", gap: 12 },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", flex: 1 },
  noMatchesText: { color: "#8A8A8A", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  historyRow: { backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#2A2A2A" },
  historyTeams: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyTeamName: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1, textAlign: "center" },
  historyScore: { color: "#39FF14", fontSize: 18, fontWeight: "800", marginHorizontal: 12 },
  historyDate: { color: "#8A8A8A", fontSize: 11, textAlign: "center", marginTop: 6 },
  logoutBtn: { marginHorizontal: 20, marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FF4444", alignItems: "center" },
  logoutText: { color: "#FF4444", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#FF4444", fontSize: 13, textAlign: "center", marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  pickerList: { maxHeight: 400 },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  pickerText: { color: "#FFFFFF", fontSize: 16 },
  pickerTextActive: { color: "#39FF14", fontWeight: "700" },
});
