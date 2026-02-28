import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, TextInput, ScrollView, Modal, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useT } from "@/lib/i18n/LanguageContext";

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function CreateMatchScreen() {
  const router = useRouter();
  const t = useT();
  const [type, setType] = useState<"friendly">("friendly");
  const [city, setCity] = useState("");
  const [pitchName, setPitchName] = useState("");
  const [format, setFormat] = useState<"5v5" | "8v8" | "11v11">("5v5");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Date/time state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // For Android two-step flow
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Friendly match: team search
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string; city: string } | null>(null);

  const { data: cities } = trpc.ref.cities.useQuery();
  const { data: searchResults, isFetching: isSearching } = trpc.team.search.useQuery(
    { query: teamSearchQuery },
    { enabled: teamSearchQuery.length >= 2 }
  );

  const createMutation = trpc.match.create.useMutation({
    onSuccess: (data) => {
      if (type === "friendly" && selectedTeam) {
        inviteMutation.mutate({ matchId: data.id, teamId: selectedTeam.id });
      } else {
        router.replace(`/match/${data.id}` as any);
      }
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const inviteMutation = trpc.match.inviteTeam.useMutation({
    onSuccess: (_, vars) => {
      Alert.alert("Invitation Sent", `Invitation sent to ${selectedTeam?.name}. They will be notified.`);
      router.replace(`/match/${vars.matchId}` as any);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleCreate = () => {
    if (!city) {
      Alert.alert("Required", "Please select a city.");
      return;
    }
    if (!pitchName.trim()) {
      Alert.alert("Required", "Please enter a pitch or location name.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Required", "Please select a date and time for the match.");
      return;
    }
    if (selectedDate <= new Date()) {
      Alert.alert("Invalid Date", "Match date must be in the future.");
      return;
    }
    if (type === "friendly" && !selectedTeam) {
      Alert.alert("Select Opponent", "Please search and select an opponent team for the friendly match.");
      return;
    }
    createMutation.mutate({
      type,
      city,
      pitchName: pitchName.trim(),
      matchDate: selectedDate.toISOString(),
      format,
      maxPlayers: Number(maxPlayers),
    });
  };

  // ── Date picker handlers ──────────────────────────────────────────────────
  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && date) {
        setTempDate(date);
        setShowTimePicker(true); // chain to time picker on Android
      }
    } else {
      if (date) setTempDate(date);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "set" && time) {
        const combined = new Date(tempDate);
        combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
        setSelectedDate(combined);
      }
    } else {
      if (time) {
        const combined = new Date(tempDate);
        combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
        setSelectedDate(combined);
      }
    }
  };

  const confirmIOSDateTime = () => {
    setSelectedDate(tempDate);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const isLoading = createMutation.isPending || inviteMutation.isPending;
  const isFormValid = !!city && !!pitchName.trim() && !!selectedDate && (type !== "friendly" || !!selectedTeam);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Match</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Match Type - Friendly only (Public challenges use the Challenges tab) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, styles.typeBtnActive]}
            >
              <Text style={[styles.typeText, styles.typeTextActive]}>Friendly</Text>
              <Text style={styles.typeDesc}>Invite a specific team</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.typeHint}>💡 Want a public challenge? Use the <Text style={{ color: "#39FF14", fontWeight: "700" }}>Challenges</Text> tab to find opponents.</Text>
        </View>

        {/* Opponent Team (Friendly only) */}
        {type === "friendly" && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Opponent Team <Text style={styles.required}>*</Text></Text>
            {selectedTeam ? (
              <View style={styles.selectedTeamCard}>
                <IconSymbol name="shield.fill" size={24} color="#39FF14" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTeamName}>{selectedTeam.name}</Text>
                  <Text style={styles.selectedTeamCity}>{selectedTeam.city}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTeam(null)}>
                  <IconSymbol name="xmark.circle.fill" size={22} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.searchTeamBtn} onPress={() => setShowTeamSearch(true)}>
                <IconSymbol name="magnifyingglass" size={18} color="#8A8A8A" />
                <Text style={styles.searchTeamText}>Search team by name...</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* City */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCityPicker(true)}>
            <Text style={city ? styles.selectText : styles.selectPlaceholder}>{city || "Select city"}</Text>
            <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
          </TouchableOpacity>
        </View>

        {/* Pitch Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Pitch / Location <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Terrain Hay Riad"
            placeholderTextColor="#555"
            value={pitchName}
            onChangeText={setPitchName}
          />
        </View>

        {/* Date & Time — native picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date & Time <Text style={styles.required}>*</Text></Text>

          <View style={styles.dateTimeRow}>
            {/* Date button */}
            <TouchableOpacity
              style={[styles.dateBtn, !selectedDate && styles.dateBtnEmpty]}
              onPress={() => {
                setTempDate(selectedDate ?? new Date());
                setShowDatePicker(true);
              }}
            >
              <IconSymbol name="calendar" size={18} color={selectedDate ? "#39FF14" : "#8A8A8A"} />
              <Text style={selectedDate ? styles.dateText : styles.datePlaceholder}>
                {selectedDate ? formatDate(selectedDate) : "Pick date"}
              </Text>
            </TouchableOpacity>

            {/* Time button */}
            <TouchableOpacity
              style={[styles.timeBtn, !selectedDate && styles.dateBtnEmpty]}
              onPress={() => {
                setTempDate(selectedDate ?? new Date());
                if (Platform.OS === "android") {
                  setShowTimePicker(true);
                } else {
                  setShowTimePicker(true);
                }
              }}
            >
              <IconSymbol name="clock.fill" size={18} color={selectedDate ? "#39FF14" : "#8A8A8A"} />
              <Text style={selectedDate ? styles.dateText : styles.datePlaceholder}>
                {selectedDate ? formatTime(selectedDate) : "Pick time"}
              </Text>
            </TouchableOpacity>
          </View>

          {!selectedDate && (
            <Text style={styles.requiredHint}>Date and time are required</Text>
          )}
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
          <Text style={styles.label}>Max Players per Team</Text>
          <TextInput
            style={styles.textInput}
            placeholder="5"
            placeholderTextColor="#555"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
          />
          <Text style={styles.fieldHint}>👥 Ce nombre s'applique par équipe (ex: 5 = 5 vs 5)</Text>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, !isFormValid && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <Text style={styles.createBtnText}>
              {type === "friendly" ? "Create & Send Invitation" : "Create Match"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date Picker (iOS inline / Android modal) ── */}
      {showDatePicker && (
        Platform.OS === "ios" ? (
          <Modal visible transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(e, d) => { if (d) setTempDate(d); }}
                  textColor="#FFFFFF"
                  style={{ backgroundColor: "#1A1A1A" }}
                />
                <TouchableOpacity style={styles.confirmBtn} onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}>
                  <Text style={styles.confirmBtnText}>Next: Pick Time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )
      )}

      {/* ── Time Picker ── */}
      {showTimePicker && (
        Platform.OS === "ios" ? (
          <Modal visible transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={(e, d) => { if (d) setTempDate(d); }}
                  textColor="#FFFFFF"
                  style={{ backgroundColor: "#1A1A1A" }}
                />
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmIOSDateTime}>
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )
      )}

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

      {/* Team Search Modal */}
      <Modal visible={showTeamSearch} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Team</Text>
              <TouchableOpacity onPress={() => { setShowTeamSearch(false); setTeamSearchQuery(""); }}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search team name..."
              placeholderTextColor="#555"
              value={teamSearchQuery}
              onChangeText={setTeamSearchQuery}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 350 }}>
              {isSearching && <ActivityIndicator color="#39FF14" style={{ marginTop: 20 }} />}
              {teamSearchQuery.length >= 2 && !isSearching && (!searchResults || searchResults.length === 0) && (
                <Text style={styles.noResults}>No teams found</Text>
              )}
              {(searchResults ?? []).map((team: any) => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamResultRow}
                  onPress={() => {
                    setSelectedTeam({ id: team.id, name: team.name, city: team.city });
                    setShowTeamSearch(false);
                    setTeamSearchQuery("");
                  }}
                >
                  <IconSymbol name="shield.fill" size={20} color="#39FF14" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamResultName}>{team.name}</Text>
                    <Text style={styles.teamResultCity}>{team.city}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color="#8A8A8A" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
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
  required: { color: "#FF4444" },
  requiredHint: { color: "#FF4444", fontSize: 12, marginTop: 6 },
  textInput: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#2A2A2A" },
  selectBtn: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2A2A2A" },
  selectText: { color: "#FFFFFF", fontSize: 16 },
  selectPlaceholder: { color: "#555", fontSize: 16 },
  // Date/time
  dateTimeRow: { flexDirection: "row", gap: 10 },
  dateBtn: { flex: 2, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#39FF14" },
  timeBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#39FF14" },
  dateBtnEmpty: { borderColor: "#2A2A2A" },
  dateText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flexShrink: 1 },
  datePlaceholder: { color: "#555", fontSize: 14 },
  confirmBtn: { backgroundColor: "#39FF14", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  confirmBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  // Type
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
  // Team search
  searchTeamBtn: { backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#2A2A2A" },
  searchTeamText: { color: "#555", fontSize: 15 },
  selectedTeamCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#39FF14", gap: 12 },
  selectedTeamName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  selectedTeamCity: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  searchInput: { backgroundColor: "#0A0A0A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 12 },
  noResults: { color: "#8A8A8A", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  teamResultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#2A2A2A", gap: 12 },
  teamResultName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  teamResultCity: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  cityItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  cityText: { color: "#FFFFFF", fontSize: 16 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
  typeHint: { color: "#8A8A8A", fontSize: 12, marginTop: 8, lineHeight: 18 },
  fieldHint: { color: "#8A8A8A", fontSize: 12, marginTop: 6, lineHeight: 18 },
});
