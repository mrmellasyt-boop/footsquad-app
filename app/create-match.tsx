import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, TextInput, ScrollView, Modal, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function CreateMatchScreen() {
  const router = useRouter();
  const [type, setType] = useState<"public" | "friendly">("public");
  const [city, setCity] = useState("");
  const [pitchName, setPitchName] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [format, setFormat] = useState<"5v5" | "8v8" | "11v11">("5v5");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();
  const createMutation = trpc.match.create.useMutation({
    onSuccess: (data) => {
      router.replace(`/match/${data.id}` as any);
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleCreate = () => {
    if (!city || !pitchName.trim() || !matchDate) return;
    createMutation.mutate({
      type,
      city,
      pitchName: pitchName.trim(),
      matchDate,
      format,
      maxPlayers: Number(maxPlayers),
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Match</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* Match Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === "public" && styles.typeBtnActive]}
              onPress={() => setType("public")}
            >
              <Text style={[styles.typeText, type === "public" && styles.typeTextActive]}>Public</Text>
              <Text style={styles.typeDesc}>Anyone can request</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === "friendly" && styles.typeBtnActive]}
              onPress={() => setType("friendly")}
            >
              <Text style={[styles.typeText, type === "friendly" && styles.typeTextActive]}>Friendly</Text>
              <Text style={styles.typeDesc}>Invite specific team</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* City */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>City</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
            <Text style={city ? styles.selectText : styles.selectPlaceholder}>{city || "Select city"}</Text>
            <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
          </TouchableOpacity>
        </View>

        {/* Pitch Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Pitch / Location</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Terrain Hay Riad" placeholderTextColor="#555" value={pitchName} onChangeText={setPitchName} />
        </View>

        {/* Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date & Time</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="#555"
            value={matchDate}
            onChangeText={setMatchDate}
          />
        </View>

        {/* Format */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Format</Text>
          <View style={styles.formatRow}>
            {(["5v5", "8v8", "11v11"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.formatBtn, format === f && styles.formatBtnActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.formatText, format === f && styles.formatTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Max Players */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Max Players</Text>
          <TextInput
            style={styles.textInput}
            placeholder="10"
            placeholderTextColor="#555"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (!city || !pitchName.trim() || !matchDate) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!city || !pitchName.trim() || !matchDate || createMutation.isPending}
        >
          <Text style={styles.createBtnText}>{createMutation.isPending ? "Creating..." : "Create Match"}</Text>
        </TouchableOpacity>
      </ScrollView>

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
                <TouchableOpacity key={c} style={styles.cityItem} onPress={() => { setCity(c); setShowCityPicker(false); }}>
                  <Text style={[styles.cityText, city === c && styles.cityTextActive]}>{c}</Text>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
  form: { padding: 20, paddingBottom: 40 },
  formGroup: { marginBottom: 20 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  textInput: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#2A2A2A" },
  selectBtn: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  selectText: { color: "#FFFFFF", fontSize: 16 },
  selectPlaceholder: { color: "#555", fontSize: 16 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  typeBtnActive: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.1)" },
  typeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  typeTextActive: { color: "#39FF14" },
  typeDesc: { color: "#8A8A8A", fontSize: 11, marginTop: 4 },
  formatRow: { flexDirection: "row", gap: 8 },
  formatBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1A1A1A", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  formatBtnActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  formatText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  formatTextActive: { color: "#0A0A0A" },
  createBtn: { backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  btnDisabled: { opacity: 0.4 },
  createBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  cityItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  cityText: { color: "#FFFFFF", fontSize: 16 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
});
