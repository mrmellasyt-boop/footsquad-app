import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

export default function LeaderboardScreen() {
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const router = useRouter();

  const { data: cities } = trpc.ref.cities.useQuery();
  const { data: players, isLoading } = trpc.player.leaderboard.useQuery({ city: selectedCity }, { refetchOnWindowFocus: true });

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowCityPicker(true)}>
          <IconSymbol name="location.fill" size={16} color="#39FF14" />
          <Text style={styles.filterText}>{selectedCity ?? "All Cities"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.minMatchNote}>
        <Text style={styles.noteText}>Minimum 5 matches required to appear</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : !players || players.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="trophy.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>No players qualify yet</Text>
          <Text style={styles.emptySubtext}>Play 5+ matches to appear here</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          renderItem={({ item, index }) => {
            const avgRating = item.ratingCount > 0 ? (item.totalRatings / item.ratingCount).toFixed(1) : "—";
            return (
              <TouchableOpacity
                style={[styles.playerRow, index < 3 && styles.topThreeRow]}
                activeOpacity={0.7}
                onPress={() => router.push(`/player/${item.id}` as any)}
              >
                <View style={[styles.rank, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze]}>
                  <Text style={[styles.rankNum, index < 3 && styles.rankNumTop]}>{index + 1}</Text>
                </View>
                <View style={styles.avatarWrap}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <IconSymbol name="person.fill" size={20} color="#8A8A8A" />
                  )}
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>{item.fullName}</Text>
                  <Text style={styles.playerMeta}>{item.position} • {item.city}</Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={styles.points}>{item.totalPoints}</Text>
                  <Text style={styles.statsLabel}>pts</Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={styles.statsValue}>{item.totalMatches}</Text>
                  <Text style={styles.statsLabel}>games</Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={styles.statsValue}>{avgRating}</Text>
                  <Text style={styles.statsLabel}>rating</Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={styles.motmValue}>{item.motmCount}</Text>
                  <Text style={styles.statsLabel}>MOTM</Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
            <ScrollView style={styles.cityList}>
              <TouchableOpacity
                style={[styles.cityItem, !selectedCity && styles.cityItemActive]}
                onPress={() => { setSelectedCity(undefined); setShowCityPicker(false); }}
              >
                <Text style={[styles.cityText, !selectedCity && styles.cityTextActive]}>All Cities</Text>
              </TouchableOpacity>
              {(cities ?? []).map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityItem, selectedCity === city && styles.cityItemActive]}
                  onPress={() => { setSelectedCity(city); setShowCityPicker(false); }}
                >
                  <Text style={[styles.cityText, selectedCity === city && styles.cityTextActive]}>{city}</Text>
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
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  filterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  minMatchNote: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  noteText: {
    color: "#8A8A8A",
    fontSize: 12,
    fontStyle: "italic",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#8A8A8A",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#555",
    fontSize: 13,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  topThreeRow: {
    borderColor: "#39FF14",
    borderWidth: 1,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rankGold: { backgroundColor: "#FFD700" },
  rankSilver: { backgroundColor: "#C0C0C0" },
  rankBronze: { backgroundColor: "#CD7F32" },
  rankNum: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  rankNumTop: {
    color: "#0A0A0A",
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  playerInfo: {
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  playerMeta: {
    color: "#8A8A8A",
    fontSize: 11,
    marginTop: 1,
  },
  statsCol: {
    alignItems: "center",
    marginLeft: 8,
    minWidth: 32,
  },
  points: {
    color: "#39FF14",
    fontSize: 16,
    fontWeight: "800",
  },
  statsValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  motmValue: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "700",
  },
  statsLabel: {
    color: "#8A8A8A",
    fontSize: 9,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  cityItemActive: {
    backgroundColor: "rgba(57,255,20,0.15)",
  },
  cityText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  cityTextActive: {
    color: "#39FF14",
    fontWeight: "700",
  },
});
