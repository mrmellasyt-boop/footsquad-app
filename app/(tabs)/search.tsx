import { useState, useCallback } from "react";
import {
  Text, View, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, TextInput, Modal, ScrollView, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

type Tab = "teams" | "players";
type Position = "GK" | "DEF" | "MID" | "ATT";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "ATT"];

const positionColor: Record<Position, string> = {
  GK: "#FFD700",
  DEF: "#4FC3F7",
  MID: "#39FF14",
  ATT: "#FF6B6B",
};

// ─── Team Card ───
function TeamCard({ item, onPress }: { item: any; onPress: () => void }) {
  const winRate = item.totalMatches > 0
    ? Math.round((item.totalWins / item.totalMatches) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.teamLogoWrap}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.teamLogo} contentFit="cover" />
          ) : (
            <IconSymbol name="shield.fill" size={28} color="#39FF14" />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMetaRow}>
            <IconSymbol name="location.fill" size={12} color="#8A8A8A" />
            <Text style={styles.cardMeta}>{item.city}</Text>
          </View>
          <View style={styles.cardStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{item.totalMatches}</Text>
              <Text style={styles.miniStatLabel}>M</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: "#39FF14" }]}>{item.totalWins}</Text>
              <Text style={styles.miniStatLabel}>W</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: winRate >= 50 ? "#39FF14" : "#FF6B6B" }]}>{winRate}%</Text>
              <Text style={styles.miniStatLabel}>WR</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{item.memberCount ?? 0}</Text>
              <Text style={styles.miniStatLabel}>👥</Text>
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.consultBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.consultBtnText}>Consulter</Text>
        <IconSymbol name="chevron.right" size={14} color="#0A0A0A" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Player Card ───
function PlayerCard({ item, onPress }: { item: any; onPress: () => void }) {
  const avgRating = item.ratingCount > 0
    ? (item.totalRatings / item.ratingCount).toFixed(1)
    : null;
  const pos = item.position as Position;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.playerAvatarWrap}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.playerAvatar} contentFit="cover" />
          ) : (
            <IconSymbol name="person.fill" size={26} color="#8A8A8A" />
          )}
          <View style={[styles.posBadgeOverlay, { backgroundColor: positionColor[pos] ?? "#8A8A8A" }]}>
            <Text style={styles.posBadgeText}>{item.position}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
          <View style={styles.cardMetaRow}>
            <IconSymbol name="location.fill" size={12} color="#8A8A8A" />
            <Text style={styles.cardMeta}>{item.city}</Text>
            {item.countryFlag && <Text style={styles.cardMeta}>{item.countryFlag}</Text>}
          </View>
          <View style={styles.cardStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{item.totalMatches}</Text>
              <Text style={styles.miniStatLabel}>M</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: "#39FF14" }]}>{item.totalPoints}</Text>
              <Text style={styles.miniStatLabel}>Pts</Text>
            </View>
            {avgRating && (
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: "#FFD700" }]}>★{avgRating}</Text>
                <Text style={styles.miniStatLabel}>Rat.</Text>
              </View>
            )}
            {item.motmCount > 0 && (
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: "#FFD700" }]}>{item.motmCount}</Text>
                <Text style={styles.miniStatLabel}>MOTM</Text>
              </View>
            )}
            {item.isFreeAgent && (
              <View style={styles.freeAgentBadge}>
                <Text style={styles.freeAgentText}>Free</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.consultBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.consultBtnText}>Consulter</Text>
        <IconSymbol name="chevron.right" size={14} color="#0A0A0A" />
      </TouchableOpacity>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("teams");
  const [query, setQuery] = useState("");
  const [filterCity, setFilterCity] = useState<string | undefined>(undefined);
  const [filterPosition, setFilterPosition] = useState<Position | undefined>(undefined);
  const [showCityModal, setShowCityModal] = useState(false);

  const { data: cities } = trpc.ref.cities.useQuery();

  // Teams query
  const {
    data: teamsData,
    isLoading: teamsLoading,
    refetch: refetchTeams,
  } = trpc.search.teams.useQuery(
    { query, city: filterCity },
    { refetchOnWindowFocus: true }
  );

  // Players query
  const {
    data: playersData,
    isLoading: playersLoading,
    refetch: refetchPlayers,
  } = trpc.search.players.useQuery(
    { query, city: filterCity, position: filterPosition },
    { refetchOnWindowFocus: true }
  );

  const isLoading = activeTab === "teams" ? teamsLoading : playersLoading;
  const results = activeTab === "teams" ? (teamsData ?? []) : (playersData ?? []);

  const handleClearFilters = useCallback(() => {
    setFilterCity(undefined);
    setFilterPosition(undefined);
    setQuery("");
  }, []);

  const hasFilters = !!(filterCity || filterPosition || query);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find teams and players</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <IconSymbol name="magnifyingglass" size={18} color="#8A8A8A" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === "teams" ? "Search teams..." : "Search players..."}
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && Platform.OS !== "ios" && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "teams" && styles.tabActive]}
          onPress={() => setActiveTab("teams")}
        >
          <IconSymbol name="shield.fill" size={16} color={activeTab === "teams" ? "#0A0A0A" : "#8A8A8A"} />
          <Text style={[styles.tabText, activeTab === "teams" && styles.tabTextActive]}>Teams</Text>
          {teamsData && (
            <View style={[styles.countBadge, activeTab === "teams" && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === "teams" && styles.countTextActive]}>
                {teamsData.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "players" && styles.tabActive]}
          onPress={() => setActiveTab("players")}
        >
          <IconSymbol name="person.2.fill" size={16} color={activeTab === "players" ? "#0A0A0A" : "#8A8A8A"} />
          <Text style={[styles.tabText, activeTab === "players" && styles.tabTextActive]}>Players</Text>
          {playersData && (
            <View style={[styles.countBadge, activeTab === "players" && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === "players" && styles.countTextActive]}>
                {playersData.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Row */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersInner}>
          {/* City Filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterCity && styles.filterChipActive]}
            onPress={() => setShowCityModal(true)}
          >
            <IconSymbol name="location.fill" size={12} color={filterCity ? "#0A0A0A" : "#8A8A8A"} />
            <Text style={[styles.filterChipText, filterCity && styles.filterChipTextActive]}>
              {filterCity ?? "All Cities"}
            </Text>
          </TouchableOpacity>

          {/* Position Filters (players only) */}
          {activeTab === "players" && POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[
                styles.filterChip,
                filterPosition === pos && { backgroundColor: positionColor[pos], borderColor: positionColor[pos] },
              ]}
              onPress={() => setFilterPosition(filterPosition === pos ? undefined : pos)}
            >
              <Text style={[
                styles.filterChipText,
                filterPosition === pos && { color: "#0A0A0A" },
              ]}>{pos}</Text>
            </TouchableOpacity>
          ))}

          {/* Clear */}
          {hasFilters && (
            <TouchableOpacity style={styles.clearChip} onPress={handleClearFilters}>
              <IconSymbol name="xmark.circle.fill" size={13} color="#FF4444" />
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <IconSymbol
            name={activeTab === "teams" ? "shield.fill" : "person.2.fill"}
            size={56}
            color="#2A2A2A"
          />
          <Text style={styles.emptyTitle}>
            {hasFilters ? "No results found" : activeTab === "teams" ? "No teams yet" : "No players yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasFilters
              ? "Try adjusting your filters or search term."
              : activeTab === "teams"
              ? "Be the first to create a team!"
              : "Players will appear here once they sign up."}
          </Text>
          {hasFilters && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => activeTab === "teams" ? refetchTeams() : refetchPlayers()}
          refreshing={isLoading}
          renderItem={({ item }: { item: any }) =>
            activeTab === "teams" ? (
              <TeamCard
                item={item}
                onPress={() => router.push(`/team/${item.id}` as any)}
              />
            ) : (
              <PlayerCard
                item={item}
                onPress={() => router.push(`/player/${item.id}` as any)}
              />
            )
          }
        />
      )}

      {/* City Modal */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={styles.cityItem}
                onPress={() => { setFilterCity(undefined); setShowCityModal(false); }}
              >
                <Text style={[styles.cityText, !filterCity && styles.cityTextActive]}>All Cities</Text>
              </TouchableOpacity>
              {(cities ?? []).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => { setFilterCity(c); setShowCityModal(false); }}
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#8A8A8A", marginTop: 2 },

  searchBarWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: "#1A1A1A", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 15 },

  tabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 12,
    backgroundColor: "#1A1A1A", borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: "#39FF14" },
  tabText: { color: "#8A8A8A", fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: "#0A0A0A" },
  countBadge: {
    backgroundColor: "#2A2A2A", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  countBadgeActive: { backgroundColor: "rgba(0,0,0,0.2)" },
  countText: { color: "#8A8A8A", fontSize: 11, fontWeight: "700" },
  countTextActive: { color: "#0A0A0A" },

  filtersRow: { marginBottom: 10 },
  filtersInner: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  filterChipActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  filterChipText: { color: "#8A8A8A", fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#0A0A0A" },
  clearChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#FF4444",
  },
  clearChipText: { color: "#FF4444", fontSize: 13, fontWeight: "600" },

  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },

  card: {
    backgroundColor: "#1A1A1A", borderRadius: 16,
    padding: 14, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  // Team logo
  teamLogoWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center",
    overflow: "hidden", borderWidth: 2, borderColor: "#39FF14",
  },
  teamLogo: { width: 52, height: 52, borderRadius: 26 },

  // Player avatar
  playerAvatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#2A2A2A",
    justifyContent: "center", alignItems: "center",
    overflow: "visible",
  },
  playerAvatar: { width: 52, height: 52, borderRadius: 26 },
  posBadgeOverlay: {
    position: "absolute", bottom: -2, right: -4,
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  posBadgeText: { color: "#0A0A0A", fontSize: 9, fontWeight: "900" },

  cardInfo: { flex: 1 },
  cardName: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  cardMeta: { color: "#8A8A8A", fontSize: 12 },
  cardStatsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  miniStat: { alignItems: "center" },
  miniStatVal: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  miniStatLabel: { color: "#555", fontSize: 9, marginTop: 1 },
  freeAgentBadge: {
    backgroundColor: "rgba(57,255,20,0.15)",
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(57,255,20,0.4)",
  },
  freeAgentText: { color: "#39FF14", fontSize: 10, fontWeight: "700" },

  consultBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#39FF14",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, marginLeft: 8,
  },
  consultBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 12 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { color: "#8A8A8A", fontSize: 14, textAlign: "center", lineHeight: 20 },
  clearBtn: {
    marginTop: 8, backgroundColor: "#1A1A1A",
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: "#FF4444",
  },
  clearBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#111111", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "80%", padding: 24,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  cityItem: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  cityText: { color: "#FFFFFF", fontSize: 15 },
  cityTextActive: { color: "#39FF14", fontWeight: "700" },
});
