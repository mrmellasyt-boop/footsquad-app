import { useState } from "react";
import {
  FlatList, Text, View, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { Image } from "expo-image";

const FORMATS = ["5v5", "8v8", "11v11"] as const;
type Format = (typeof FORMATS)[number];

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ChallengeCard({
  item,
  isMine,
  isCaptain,
  onAccept,
  onCancel,
}: {
  item: any;
  isMine: boolean;
  isCaptain: boolean;
  onAccept: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      {/* Team Info */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.teamRow}
          onPress={() => item.team && router.push(`/team/${item.team.id}` as any)}
          activeOpacity={0.7}
        >
          {item.team?.logoUrl ? (
            <Image source={{ uri: item.team.logoUrl }} style={styles.teamLogo} contentFit="cover" />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <IconSymbol name="shield.fill" size={20} color="#39FF14" />
            </View>
          )}
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.team?.name ?? "Unknown Team"}</Text>
            <Text style={styles.teamCity}>📍 {item.city}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.cardRight}>
          <View style={[styles.formatBadge, item.format === "5v5" && styles.format5v5, item.format === "8v8" && styles.format8v8, item.format === "11v11" && styles.format11v11]}>
            <Text style={styles.formatText}>{item.format}</Text>
          </View>
          {isMine && (
            <View style={styles.myBadge}>
              <Text style={styles.myBadgeText}>MY CHALLENGE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Preferred Date */}
      {item.preferredDate ? (
        <View style={styles.dateRow}>
          <IconSymbol name="calendar" size={14} color="#8A8A8A" />
          <Text style={styles.dateText}>{item.preferredDate}</Text>
        </View>
      ) : null}

      {/* Message */}
      {item.message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
        <View style={styles.actions}>
          {isMine ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onCancel(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : isCaptain ? (
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => onAccept(item.id)}
              activeOpacity={0.7}
            >
              <IconSymbol name="bolt.fill" size={14} color="#0A0A0A" />
              <Text style={styles.acceptBtnText}>Accept Challenge</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PostChallengeModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [city, setCity] = useState("");
  const [format, setFormat] = useState<Format>("5v5");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.challenge.create.useMutation({
    onSuccess: () => {
      utils.challenge.list.invalidate();
      utils.challenge.myTeamChallenge.invalidate();
      onSuccess();
      setCity("");
      setFormat("5v5");
      setPreferredDate("");
      setMessage("");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleSubmit = () => {
    if (!city) {
      Alert.alert("Missing info", "Please select a city.");
      return;
    }
    createMutation.mutate({ city, format, preferredDate: preferredDate || undefined, message: message || undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ Launch a Challenge</Text>
              <TouchableOpacity onPress={onClose}>
                <IconSymbol name="xmark.circle.fill" size={26} color="#8A8A8A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* City */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>City *</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
                  <Text style={city ? styles.selectText : styles.selectPlaceholder}>{city || "Select city"}</Text>
                  <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
                </TouchableOpacity>
              </View>

              {/* Format */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Format *</Text>
                <View style={styles.formatRow}>
                  {FORMATS.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.formatBtn, format === f && styles.formatBtnActive]}
                      onPress={() => setFormat(f)}
                    >
                      <Text style={[styles.formatBtnText, format === f && styles.formatBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preferred Date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Preferred Date / Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Saturday morning, weekends..."
                  placeholderTextColor="#555"
                  value={preferredDate}
                  onChangeText={setPreferredDate}
                  returnKeyType="next"
                />
              </View>

              {/* Message */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Message (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Add a message to your challenge..."
                  placeholderTextColor="#555"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={280}
                  returnKeyType="done"
                />
                <Text style={styles.charCount}>{message.length}/280</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!city || createMutation.isPending) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!city || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <>
                    <IconSymbol name="bolt.fill" size={16} color="#0A0A0A" />
                    <Text style={styles.submitBtnText}>Post Challenge</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* City Picker */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(cities ?? []).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => { setCity(c); setShowCityPicker(false); }}
                >
                  <Text style={[styles.cityText, city === c && styles.cityTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

export default function ChallengesScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [filterCity, setFilterCity] = useState<string | undefined>(undefined);
  const [filterFormat, setFilterFormat] = useState<Format | undefined>(undefined);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCityFilter, setShowCityFilter] = useState(false);

  const { data: challenges, isLoading, refetch } = trpc.challenge.list.useQuery(
    { city: filterCity, format: filterFormat },
    { refetchOnWindowFocus: true }
  );
  const { data: myTeamChallenge } = trpc.challenge.myTeamChallenge.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });
  const { data: player } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: cities } = trpc.ref.cities.useQuery();
  const utils = trpc.useUtils();

  const isCaptain = !!(player?.isCaptain && player?.teamId);
  const myTeamId = player?.teamId;

  const acceptMutation = trpc.challenge.accept.useMutation({
    onSuccess: (data) => {
      utils.challenge.list.invalidate();
      utils.challenge.myTeamChallenge.invalidate();
      Alert.alert(
        "Challenge Accepted! ⚡",
        "A match has been created. Coordinate with the opponent to set the exact date and pitch.",
        [{ text: "View Match", onPress: () => router.push(`/match/${data.matchId}` as any) }, { text: "OK" }]
      );
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const cancelMutation = trpc.challenge.cancel.useMutation({
    onSuccess: () => {
      utils.challenge.list.invalidate();
      utils.challenge.myTeamChallenge.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleAccept = (challengeId: number) => {
    Alert.alert(
      "Accept Challenge?",
      "This will create a confirmed match between your teams. You'll need to coordinate the exact date and pitch.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", style: "default", onPress: () => acceptMutation.mutate({ challengeId }) },
      ]
    );
  };

  const handleCancel = (challengeId: number) => {
    Alert.alert(
      "Cancel Challenge?",
      "Your challenge will be removed from the feed.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Cancel Challenge", style: "destructive", onPress: () => cancelMutation.mutate({ challengeId }) },
      ]
    );
  };

  const hasActiveChallenge = !!myTeamChallenge;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Open Challenges</Text>
          <Text style={styles.subtitle}>Find opponents for your team</Text>
        </View>
        {isAuthenticated && isCaptain && !hasActiveChallenge && (
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => setShowPostModal(true)}
            activeOpacity={0.8}
          >
            <IconSymbol name="bolt.fill" size={16} color="#0A0A0A" />
            <Text style={styles.postBtnText}>Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* My Active Challenge Banner */}
      {hasActiveChallenge && myTeamChallenge && (
        <View style={styles.myChallengeBanner}>
          <View style={styles.myChallengeBannerLeft}>
            <IconSymbol name="bolt.fill" size={16} color="#39FF14" />
            <Text style={styles.myChallengeBannerText}>Your challenge is live!</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCancel(myTeamChallenge.id)}
            style={styles.cancelBannerBtn}
          >
            <Text style={styles.cancelBannerText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersInner}>
          {/* City Filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterCity && styles.filterChipActive]}
            onPress={() => setShowCityFilter(true)}
          >
            <IconSymbol name="location.fill" size={12} color={filterCity ? "#0A0A0A" : "#8A8A8A"} />
            <Text style={[styles.filterChipText, filterCity && styles.filterChipTextActive]}>
              {filterCity ?? "All Cities"}
            </Text>
          </TouchableOpacity>

          {/* Format Filters */}
          {FORMATS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filterFormat === f && styles.filterChipActive]}
              onPress={() => setFilterFormat(filterFormat === f ? undefined : f)}
            >
              <Text style={[styles.filterChipText, filterFormat === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}

          {/* Clear filters */}
          {(filterCity || filterFormat) && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setFilterCity(undefined); setFilterFormat(undefined); }}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : !challenges || challenges.length === 0 ? (
        <View style={styles.empty}>
          <IconSymbol name="bolt.fill" size={56} color="#2A2A2A" />
          <Text style={styles.emptyTitle}>No open challenges</Text>
          <Text style={styles.emptySubtitle}>
            {isAuthenticated && isCaptain
              ? "Be the first to post a challenge!"
              : "Check back later or filter by your city."}
          </Text>
          {isAuthenticated && isCaptain && !hasActiveChallenge && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPostModal(true)}>
              <Text style={styles.emptyBtnText}>Post a Challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <ChallengeCard
              item={item}
              isMine={item.teamId === myTeamId}
              isCaptain={isCaptain}
              onAccept={handleAccept}
              onCancel={handleCancel}
            />
          )}
        />
      )}

      {/* Post Challenge Modal */}
      <PostChallengeModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onSuccess={() => setShowPostModal(false)}
      />

      {/* City Filter Modal */}
      <Modal visible={showCityFilter} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by City</Text>
              <TouchableOpacity onPress={() => setShowCityFilter(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={styles.cityItem}
                onPress={() => { setFilterCity(undefined); setShowCityFilter(false); }}
              >
                <Text style={[styles.cityText, !filterCity && styles.cityTextActive]}>All Cities</Text>
              </TouchableOpacity>
              {(cities ?? []).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => { setFilterCity(c); setShowCityFilter(false); }}
                >
                  <Text style={[styles.cityText, filterCity === c && styles.cityTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#8A8A8A", marginTop: 2 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#39FF14",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 14 },

  myChallengeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(57,255,20,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
  },
  myChallengeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  myChallengeBannerText: { color: "#39FF14", fontWeight: "700", fontSize: 14 },
  cancelBannerBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: "#2A2A2A" },
  cancelBannerText: { color: "#FF4444", fontSize: 13, fontWeight: "600" },

  filters: { paddingBottom: 12 },
  filtersInner: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  filterChipActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  filterChipText: { color: "#8A8A8A", fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#0A0A0A" },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#2A2A2A" },
  clearBtnText: { color: "#FF4444", fontSize: 13, fontWeight: "600" },

  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },

  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  teamLogo: { width: 44, height: 44, borderRadius: 22 },
  teamLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#39FF14",
  },
  teamInfo: { flex: 1 },
  teamName: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  teamCity: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  formatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#2A2A2A",
  },
  format5v5: { backgroundColor: "rgba(57,255,20,0.15)", borderWidth: 1, borderColor: "rgba(57,255,20,0.4)" },
  format8v8: { backgroundColor: "rgba(255,165,0,0.15)", borderWidth: 1, borderColor: "rgba(255,165,0,0.4)" },
  format11v11: { backgroundColor: "rgba(100,149,237,0.15)", borderWidth: 1, borderColor: "rgba(100,149,237,0.4)" },
  formatText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  myBadge: {
    backgroundColor: "rgba(57,255,20,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  myBadgeText: { color: "#39FF14", fontSize: 10, fontWeight: "800" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  dateText: { color: "#8A8A8A", fontSize: 13 },

  messageBox: {
    backgroundColor: "#0F0F0F",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#39FF14",
  },
  messageText: { color: "#CCCCCC", fontSize: 13, fontStyle: "italic", lineHeight: 18 },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeAgo: { color: "#555", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#39FF14",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  acceptBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#2A2A2A",
  },
  cancelBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 13 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { color: "#8A8A8A", fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    padding: 24,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  formGroup: { marginBottom: 18 },
  label: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  selectBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  selectText: { color: "#FFFFFF", fontSize: 15 },
  selectPlaceholder: { color: "#555", fontSize: 15 },
  formatRow: { flexDirection: "row", gap: 10 },
  formatBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  formatBtnActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  formatBtnText: { color: "#8A8A8A", fontWeight: "700", fontSize: 14 },
  formatBtnTextActive: { color: "#0A0A0A" },
  textInput: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  textArea: { height: 90, textAlignVertical: "top" },
  charCount: { color: "#555", fontSize: 11, textAlign: "right", marginTop: 4 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#39FF14",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  btnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#0A0A0A", fontWeight: "900", fontSize: 16 },
  cityItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  cityText: { color: "#FFFFFF", fontSize: 15 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
});
