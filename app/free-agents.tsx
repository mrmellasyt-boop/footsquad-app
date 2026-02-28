import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/LanguageContext";

const POSITIONS = ["GK", "DEF", "MID", "ATT"] as const;
const FORMATS = ["5v5", "8v8", "11v11", "Any"];
const TIMES = ["Weekday mornings", "Weekday evenings", "Weekend mornings", "Weekend afternoons", "Weekend evenings", "Anytime"];

export default function FreeAgentsScreen() {
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const router = useRouter();
  const t = useT();
  const { isAuthenticated } = useAuth();

  const { data: cities } = trpc.ref.cities.useQuery();
  const { data: agents, isLoading, refetch } = trpc.player.freeAgents.useQuery({ city: selectedCity });
  const utils = trpc.useUtils();

  // Form state
  const [formCity, setFormCity] = useState("");
  const [formPosition, setFormPosition] = useState<typeof POSITIONS[number]>("MID");
  const [formAvailTime, setFormAvailTime] = useState(TIMES[1]);
  const [formFormat, setFormFormat] = useState(FORMATS[0]);
  const [formNote, setFormNote] = useState("");
  const [formStep, setFormStep] = useState<"city" | "position" | "time" | "format" | "note" | "confirm">("city");

  const postMutation = trpc.player.postAvailability.useMutation({
    onSuccess: () => {
      setShowCreatePost(false);
      resetForm();
      utils.player.freeAgents.invalidate();
      Alert.alert("Posted!", "Your availability post is now live on the Free Agent Board.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const resetForm = () => {
    setFormCity("");
    setFormPosition("MID");
    setFormAvailTime(TIMES[1]);
    setFormFormat(FORMATS[0]);
    setFormNote("");
    setFormStep("city");
  };

  const handleSubmitPost = () => {
    if (!formCity) { Alert.alert("Required", "Please enter your city"); return; }
    postMutation.mutate({
      city: formCity,
      position: formPosition,
      availableTime: formAvailTime,
      preferredFormat: formFormat,
      note: formNote || undefined,
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Free Agents</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowCityPicker(true)}>
          <IconSymbol name="location.fill" size={14} color="#39FF14" />
          <Text style={styles.filterText}>{selectedCity ?? "All"}</Text>
        </TouchableOpacity>
      </View>

      {/* Create Post Banner */}
      {isAuthenticated && (
        <TouchableOpacity style={styles.createBanner} activeOpacity={0.8} onPress={() => setShowCreatePost(true)}>
          <View style={styles.createBannerLeft}>
            <IconSymbol name="plus.circle.fill" size={22} color="#0A0A0A" />
            <View>
              <Text style={styles.createBannerTitle}>Post Your Availability</Text>
              <Text style={styles.createBannerSub}>Let captains know you're looking for a team</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#0A0A0A" />
        </TouchableOpacity>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      ) : !agents || agents.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="person.2.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>No free agents in this area</Text>
          {isAuthenticated && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreatePost(true)}>
              <Text style={styles.emptyBtnText}>Be the first to post</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.agentCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/free-agent/${item.id}` as any)}
            >
              <View style={styles.agentAvatar}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.agentAvatarImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="person.fill" size={24} color="#8A8A8A" />
                )}
              </View>
              <View style={styles.agentInfo}>
                <View style={styles.agentNameRow}>
                  <Text style={styles.agentName}>{item.fullName}</Text>
                  <View style={styles.posBadge}>
                    <Text style={styles.posBadgeText}>{item.position}</Text>
                  </View>
                </View>
                <Text style={styles.agentMeta}>
                  <IconSymbol name="location.fill" size={11} color="#8A8A8A" /> {item.city}
                </Text>
                {item.availableTime && (
                  <Text style={styles.agentAvail}>⏰ {item.availableTime}</Text>
                )}
                {item.preferredFormat && (
                  <Text style={styles.agentFormat}>⚽ Prefers {item.preferredFormat}</Text>
                )}
                {item.note ? (
                  <Text style={styles.agentNote} numberOfLines={2}>"{item.note}"</Text>
                ) : null}
              </View>
              <View style={styles.agentRight}>
                <Text style={styles.agentPoints}>{item.totalPoints}</Text>
                <Text style={styles.agentPtsLabel}>pts</Text>
                <View style={styles.availDot} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* City Filter Modal */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.cityItem} onPress={() => { setSelectedCity(undefined); setShowCityPicker(false); }}>
                <Text style={[styles.cityText, !selectedCity && styles.cityTextActive]}>All Cities</Text>
                {!selectedCity && <IconSymbol name="checkmark.circle.fill" size={18} color="#39FF14" />}
              </TouchableOpacity>
              {(cities ?? []).map((c) => (
                <TouchableOpacity key={c} style={styles.cityItem} onPress={() => { setSelectedCity(c); setShowCityPicker(false); }}>
                  <Text style={[styles.cityText, selectedCity === c && styles.cityTextActive]}>{c}</Text>
                  {selectedCity === c && <IconSymbol name="checkmark.circle.fill" size={18} color="#39FF14" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Availability Post Modal */}
      <Modal visible={showCreatePost} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Availability</Text>
              <TouchableOpacity onPress={() => { setShowCreatePost(false); resetForm(); }}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Let captains find you on the Free Agent Board</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* City */}
              <Text style={styles.fieldLabel}>Your City *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Casablanca"
                placeholderTextColor="#555"
                value={formCity}
                onChangeText={setFormCity}
                returnKeyType="done"
              />

              {/* Position */}
              <Text style={styles.fieldLabel}>Position *</Text>
              <View style={styles.optionRow}>
                {POSITIONS.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.optionBtn, formPosition === pos && styles.optionBtnActive]}
                    onPress={() => setFormPosition(pos)}
                  >
                    <Text style={[styles.optionText, formPosition === pos && styles.optionTextActive]}>{pos}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Available Time */}
              <Text style={styles.fieldLabel}>Available Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.chipRow}>
                  {TIMES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, formAvailTime === t && styles.chipActive]}
                      onPress={() => setFormAvailTime(t)}
                    >
                      <Text style={[styles.chipText, formAvailTime === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Preferred Format */}
              <Text style={styles.fieldLabel}>Preferred Format *</Text>
              <View style={styles.optionRow}>
                {FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.optionBtn, formFormat === f && styles.optionBtnActive]}
                    onPress={() => setFormFormat(f)}
                  >
                    <Text style={[styles.optionText, formFormat === f && styles.optionTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <Text style={styles.fieldLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tell captains about yourself, your experience, what you're looking for..."
                placeholderTextColor="#555"
                value={formNote}
                onChangeText={setFormNote}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{formNote.length}/500</Text>

              {/* Preview Card */}
              {formCity.length > 0 && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <View style={styles.previewContent}>
                    <View style={styles.previewAvatar}>
                      <IconSymbol name="person.fill" size={20} color="#8A8A8A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.agentNameRow}>
                        <Text style={styles.previewName}>Your Name</Text>
                        <View style={styles.posBadge}>
                          <Text style={styles.posBadgeText}>{formPosition}</Text>
                        </View>
                      </View>
                      <Text style={styles.agentMeta}>{formCity}</Text>
                      <Text style={styles.agentAvail}>⏰ {formAvailTime}</Text>
                      <Text style={styles.agentFormat}>⚽ Prefers {formFormat}</Text>
                      {formNote ? <Text style={styles.agentNote} numberOfLines={2}>"{formNote}"</Text> : null}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, (!formCity || postMutation.isPending) && styles.submitBtnDisabled]}
              onPress={handleSubmitPost}
              disabled={!formCity || postMutation.isPending}
            >
              {postMutation.isPending ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <Text style={styles.submitBtnText}>Post Availability</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", flex: 1 },
  filterBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 4,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  filterText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  createBanner: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: "#39FF14",
    borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  createBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  createBannerTitle: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  createBannerSub: { color: "rgba(0,0,0,0.6)", fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  emptyBtn: {
    backgroundColor: "#39FF14", paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, marginTop: 8,
  },
  emptyBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  agentCard: {
    flexDirection: "row", alignItems: "flex-start", backgroundColor: "#1A1A1A",
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#FFD700",
  },
  agentAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center", overflow: "hidden", marginRight: 14,
    flexShrink: 0,
  },
  agentAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  agentInfo: { flex: 1 },
  agentNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  agentName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  posBadge: {
    backgroundColor: "#39FF14", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8,
  },
  posBadgeText: { color: "#0A0A0A", fontWeight: "800", fontSize: 11 },
  agentMeta: { color: "#8A8A8A", fontSize: 12, marginBottom: 2 },
  agentAvail: { color: "#39FF14", fontSize: 12, marginTop: 2 },
  agentFormat: { color: "#8A8A8A", fontSize: 12 },
  agentNote: {
    color: "#AAAAAA", fontSize: 12, fontStyle: "italic", marginTop: 6,
    borderLeftWidth: 2, borderLeftColor: "#39FF14", paddingLeft: 8,
  },
  agentRight: { alignItems: "center", marginLeft: 8 },
  agentPoints: { color: "#39FF14", fontSize: 20, fontWeight: "800" },
  agentPtsLabel: { color: "#8A8A8A", fontSize: 10 },
  availDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#39FF14",
    marginTop: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "70%", padding: 20,
  },
  createModalContent: {
    backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: "92%", padding: 20, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#8A8A8A", fontSize: 13, marginBottom: 20 },
  fieldLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  textInput: {
    backgroundColor: "#0A0A0A", borderRadius: 12, padding: 14,
    color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#2A2A2A",
    marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  charCount: { color: "#555", fontSize: 11, textAlign: "right", marginTop: -12, marginBottom: 16 },
  optionRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#2A2A2A",
  },
  optionBtnActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  optionText: { color: "#8A8A8A", fontWeight: "700", fontSize: 14 },
  optionTextActive: { color: "#0A0A0A" },
  chipRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#2A2A2A",
  },
  chipActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  chipText: { color: "#8A8A8A", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#0A0A0A", fontWeight: "700" },
  previewCard: {
    backgroundColor: "#0A0A0A", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 16,
  },
  previewLabel: { color: "#8A8A8A", fontSize: 11, fontWeight: "700", marginBottom: 10, textTransform: "uppercase" },
  previewContent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  previewAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center",
  },
  previewName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  submitBtn: {
    backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  cityItem: {
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    marginBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cityText: { color: "#FFFFFF", fontSize: 16 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
});
