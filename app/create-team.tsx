import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, TextInput, ScrollView, Modal, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function CreateTeamScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.team.create.useMutation({
    onSuccess: (data) => {
      utils.player.me.invalidate();
      router.replace(`/team/${data.id}` as any);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleCreate = () => {
    if (!name.trim() || !city) return;
    createMutation.mutate({ name: name.trim(), city });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Team</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.iconCenter}>
          <View style={styles.teamIcon}>
            <IconSymbol name="shield.fill" size={48} color="#39FF14" />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Team Name</Text>
          <TextInput style={styles.textInput} placeholder="e.g. FC Rabat Stars" placeholderTextColor="#555" value={name} onChangeText={setName} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>City</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
            <Text style={city ? styles.selectText : styles.selectPlaceholder}>{city || "Select city"}</Text>
            <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (!name.trim() || !city) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || !city || createMutation.isPending}
        >
          <Text style={styles.createBtnText}>{createMutation.isPending ? "Creating..." : "Create Team"}</Text>
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
  iconCenter: { alignItems: "center", marginBottom: 24 },
  teamIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#39FF14" },
  formGroup: { marginBottom: 20 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  textInput: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#2A2A2A" },
  selectBtn: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  selectText: { color: "#FFFFFF", fontSize: 16 },
  selectPlaceholder: { color: "#555", fontSize: 16 },
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
