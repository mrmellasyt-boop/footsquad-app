import { useState, useMemo } from "react";
import {
  Text, View, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, TextInput, ActivityIndicator, ScrollView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useT } from "@/lib/i18n/LanguageContext";

const { width: SCREEN_W } = Dimensions.get("window");
// 2-column grid, 9:16 cards
const GRID_GAP = 12;
const CARD_W = (SCREEN_W - 20 * 2 - GRID_GAP) / 2;
const CARD_H = Math.round(CARD_W * (16 / 9));

export default function AllHighlightsScreen() {
  const router = useRouter();
  const t = useT();
  const [cityFilter, setCityFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const { data: highlights, isLoading } = trpc.highlight.list.useQuery();
  const { data: cities } = trpc.ref.cities.useQuery();
  // teams not needed directly - uniqueTeams derived from highlights data

  const filtered = useMemo(() => {
    if (!highlights) return [];
    return highlights.filter((h) => {
      const matchCity = !cityFilter || h.player?.city === cityFilter;
      const matchTeam = !teamFilter || h.team?.name === teamFilter;
      return matchCity && matchTeam;
    });
  }, [highlights, cityFilter, teamFilter]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    (highlights ?? []).forEach((h) => { if (h.player?.city) set.add(h.player.city); });
    return Array.from(set).sort();
  }, [highlights]);

  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    (highlights ?? []).forEach((h) => { if (h.team?.name) set.add(h.team.name); });
    return Array.from(set).sort();
  }, [highlights]);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>All Highlights</Text>
        <View style={styles.badge48h}>
          <Text style={styles.badge48hText}>48H</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {/* City filter */}
        <TouchableOpacity
          style={[styles.filterChip, cityFilter && styles.filterChipActive]}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <IconSymbol name="location.fill" size={13} color={cityFilter ? "#0A0A0A" : "#39FF14"} />
          <Text style={[styles.filterChipText, cityFilter && styles.filterChipTextActive]}>
            {cityFilter || t.highlights.city}
          </Text>
          {cityFilter ? (
            <TouchableOpacity onPress={() => setCityFilter("")}>
              <IconSymbol name="xmark.circle.fill" size={14} color="#0A0A0A" />
            </TouchableOpacity>
          ) : (
            <IconSymbol name="chevron.right" size={12} color="#39FF14" />
          )}
        </TouchableOpacity>

        {/* Team filter */}
        <TouchableOpacity
          style={[styles.filterChip, teamFilter && styles.filterChipActive]}
          onPress={() => setShowTeamPicker(!showTeamPicker)}
        >
          <IconSymbol name="shield.fill" size={13} color={teamFilter ? "#0A0A0A" : "#39FF14"} />
          <Text style={[styles.filterChipText, teamFilter && styles.filterChipTextActive]}>
            {teamFilter || t.highlights.team}
          </Text>
          {teamFilter ? (
            <TouchableOpacity onPress={() => setTeamFilter("")}>
              <IconSymbol name="xmark.circle.fill" size={14} color="#0A0A0A" />
            </TouchableOpacity>
          ) : (
            <IconSymbol name="chevron.right" size={12} color="#39FF14" />
          )}
        </TouchableOpacity>

        {/* Clear all */}
        {(cityFilter || teamFilter) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setCityFilter(""); setTeamFilter(""); }}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* City picker dropdown */}
      {showCityPicker && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {uniqueCities.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.dropdownItem, cityFilter === c && styles.dropdownItemActive]}
                onPress={() => { setCityFilter(c); setShowCityPicker(false); }}
              >
                <Text style={[styles.dropdownText, cityFilter === c && styles.dropdownTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
            {uniqueCities.length === 0 && (
              <Text style={styles.dropdownEmpty}>No cities available</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Team picker dropdown */}
      {showTeamPicker && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {uniqueTeams.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.dropdownItem, teamFilter === t && styles.dropdownItemActive]}
                onPress={() => { setTeamFilter(t); setShowTeamPicker(false); }}
              >
                <Text style={[styles.dropdownText, teamFilter === t && styles.dropdownTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
            {uniqueTeams.length === 0 && (
              <Text style={styles.dropdownEmpty}>No teams available</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Count */}
      <Text style={styles.countText}>
        {isLoading ? "Loading..." : `${filtered.length} highlight${filtered.length !== 1 ? "s" : ""}`}
      </Text>

      {/* Grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="bolt.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyTitle}>No Highlights</Text>
          <Text style={styles.emptyDesc}>
            {cityFilter || teamFilter
              ? t.highlights.noHighlights
              : "No active highlights yet. Be the first to post!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GRID_GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridCard, { width: CARD_W, height: CARD_H }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/highlight/${item.id}` as any)}
            >
              {item.mediaUrl ? (
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={styles.gridCardImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.gridCardPlaceholder}>
                  <IconSymbol name="video.fill" size={28} color="#39FF14" />
                </View>
              )}
              {/* Video badge */}
              {item.mediaType === "video" && (
                <View style={styles.videoBadge}>
                  <IconSymbol name="video.fill" size={10} color="#FFFFFF" />
                </View>
              )}
              {/* Bottom overlay */}
              <View style={styles.gridCardOverlay}>
                <Text style={styles.gridPlayerName} numberOfLines={1}>
                  {item.player?.fullName ?? t.highlights.unknown}
                </Text>
                <Text style={styles.gridCity} numberOfLines={1}>
                  {item.player?.city ?? ""}
                </Text>
                <View style={styles.gridLikesRow}>
                  <IconSymbol name="heart.fill" size={11} color="#FF4444" />
                  <Text style={styles.gridLikesCount}>{item.likes}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
  title: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", flex: 1 },
  badge48h: {
    backgroundColor: "#FF4444", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  badge48hText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  filtersRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, gap: 8, marginBottom: 8, flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1A1A1A", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#39FF14",
  },
  filterChipActive: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  filterChipText: { color: "#39FF14", fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#0A0A0A" },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#2A2A2A",
  },
  clearBtnText: { color: "#8A8A8A", fontSize: 13 },
  dropdown: {
    marginHorizontal: 20, backgroundColor: "#1E2022", borderRadius: 12,
    borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 8, overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#2A2A2A",
  },
  dropdownItemActive: { backgroundColor: "rgba(57,255,20,0.1)" },
  dropdownText: { color: "#FFFFFF", fontSize: 14 },
  dropdownTextActive: { color: "#39FF14", fontWeight: "700" },
  dropdownEmpty: { color: "#8A8A8A", fontSize: 13, padding: 16, textAlign: "center" },
  countText: {
    color: "#8A8A8A", fontSize: 12, paddingHorizontal: 20, marginBottom: 12,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40,
  },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 16 },
  emptyDesc: { color: "#8A8A8A", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  grid: { paddingHorizontal: 20, paddingBottom: 100, gap: GRID_GAP },
  gridCard: {
    borderRadius: 14, overflow: "hidden", backgroundColor: "#1A1A1A",
  },
  gridCardImage: { width: "100%", height: "100%" },
  gridCardPlaceholder: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A1A",
  },
  videoBadge: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8,
    padding: 5,
  },
  gridCardOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.75)", padding: 8,
  },
  gridPlayerName: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  gridCity: { color: "#9BA1A6", fontSize: 10, marginTop: 1 },
  gridLikesRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  gridLikesCount: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
});
