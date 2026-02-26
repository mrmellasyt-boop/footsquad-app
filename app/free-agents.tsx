import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

export default function FreeAgentsScreen() {
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const router = useRouter();

  const { data: cities } = trpc.ref.cities.useQuery();
  const { data: agents, isLoading } = trpc.player.freeAgents.useQuery({ city: selectedCity });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
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

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      ) : !agents || agents.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="person.2.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>No free agents found</Text>
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
              onPress={() => router.push(`/player/${item.id}` as any)}
            >
              <View style={styles.agentAvatar}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.agentAvatarImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="person.fill" size={24} color="#8A8A8A" />
                )}
              </View>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{item.fullName}</Text>
                <Text style={styles.agentMeta}>{item.position} • {item.city}</Text>
                {item.availableTime && <Text style={styles.agentAvail}>Available: {item.availableTime}</Text>}
                {item.preferredFormat && <Text style={styles.agentFormat}>Prefers: {item.preferredFormat}</Text>}
              </View>
              <View style={styles.agentStats}>
                <Text style={styles.agentPoints}>{item.totalPoints}</Text>
                <Text style={styles.agentPtsLabel}>pts</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

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
              <TouchableOpacity style={styles.cityItem} onPress={() => { setSelectedCity(undefined); setShowCityPicker(false); }}>
                <Text style={[styles.cityText, !selectedCity && styles.cityTextActive]}>All Cities</Text>
              </TouchableOpacity>
              {(cities ?? []).map((c) => (
                <TouchableOpacity key={c} style={styles.cityItem} onPress={() => { setSelectedCity(c); setShowCityPicker(false); }}>
                  <Text style={[styles.cityText, selectedCity === c && styles.cityTextActive]}>{c}</Text>
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
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", flex: 1 },
  filterBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: "#2A2A2A" },
  filterText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  agentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#FFD700",
  },
  agentAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden", marginRight: 14 },
  agentAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  agentInfo: { flex: 1 },
  agentName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  agentMeta: { color: "#8A8A8A", fontSize: 13, marginTop: 2 },
  agentAvail: { color: "#39FF14", fontSize: 12, marginTop: 4 },
  agentFormat: { color: "#8A8A8A", fontSize: 12 },
  agentStats: { alignItems: "center" },
  agentPoints: { color: "#39FF14", fontSize: 20, fontWeight: "800" },
  agentPtsLabel: { color: "#8A8A8A", fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  cityItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  cityText: { color: "#FFFFFF", fontSize: 16 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
});
