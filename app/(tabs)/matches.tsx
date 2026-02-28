import { useState, useEffect, useMemo } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { Image } from "expo-image";
import { useT } from "@/lib/i18n/LanguageContext";

type Tab = "public" | "mine";

export default function MatchesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("public");
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined);
  const [showCityModal, setShowCityModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useT();

  const { data: publicMatches, isLoading: loadingPublic } = trpc.match.publicFeed.useQuery(
    { city: cityFilter },
    { refetchOnWindowFocus: true }
  );
  const { data: myMatches, isLoading: loadingMine, refetch: refetchMine } = trpc.match.myMatches.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });
  const expireMutation = trpc.match.expirePending.useMutation({
    onSuccess: () => refetchMine(),
  });
  // Auto-expire pending matches older than 24h when screen loads
  useEffect(() => {
    if (isAuthenticated) {
      expireMutation.mutate();
    }
  }, [isAuthenticated]);

  // Extract unique cities from all public matches (unfiltered) for the city picker
  const allCities = useMemo(() => {
    if (!publicMatches) return [];
    const set = new Set<string>();
    publicMatches.forEach((m) => { if (m.city) set.add(m.city); });
    return Array.from(set).sort();
  }, [publicMatches]);

  const currentData = activeTab === "public" ? publicMatches : myMatches;
  const isLoading = activeTab === "public" ? loadingPublic : loadingMine;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{t.matches.title}</Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/create-match" as any)}
          >
            <IconSymbol name="plus.circle.fill" size={20} color="#0A0A0A" />
            <Text style={styles.createBtnText}>{t.matches.createMatch}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "public" && styles.tabActive]}
          onPress={() => setActiveTab("public")}
        >
          <Text style={[styles.tabText, activeTab === "public" && styles.tabTextActive]}>{t.matches.allMatches}</Text>
        </TouchableOpacity>
        {isAuthenticated && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "mine" && styles.tabActive]}
            onPress={() => setActiveTab("mine")}
          >
            <Text style={[styles.tabText, activeTab === "mine" && styles.tabTextActive]}>{t.matches.myMatches}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* City Filter (All Matches tab only) */}
      {activeTab === "public" && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, cityFilter && styles.filterChipActive]}
            onPress={() => setShowCityModal(true)}
          >
            <IconSymbol name="location.fill" size={13} color={cityFilter ? "#0A0A0A" : "#8A8A8A"} />
            <Text style={[styles.filterChipText, cityFilter && styles.filterChipTextActive]}>
              {cityFilter ?? t.common.allCities}
            </Text>
            <IconSymbol name="chevron.right" size={11} color={cityFilter ? "#0A0A0A" : "#8A8A8A"} />
          </TouchableOpacity>
          {cityFilter && (
            <TouchableOpacity style={styles.clearChip} onPress={() => setCityFilter(undefined)}>
              <IconSymbol name="xmark.circle.fill" size={14} color="#FF4444" />
              <Text style={styles.clearChipText}>{t.common.clear}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : !currentData || currentData.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="sportscourt.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>
            {cityFilter ? `No confirmed matches in ${cityFilter}` : t.matches.noMatches}
          </Text>
          {cityFilter && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setCityFilter(undefined)}>
              <Text style={styles.emptyBtnText}>{t.common.clear}</Text>
            </TouchableOpacity>
          )}
          {isAuthenticated && !cityFilter && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/create-match" as any)}
            >
              <Text style={styles.emptyBtnText}>{t.matches.createMatch}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          renderItem={({ item: match }) => (
            <TouchableOpacity
              style={styles.matchCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/match/${match.id}` as any)}
            >
              <View style={styles.matchStatus}>
                <View style={[styles.statusDot, match.status === "confirmed" && styles.statusConfirmed, match.status === "completed" && styles.statusCompleted]} />
                <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
              </View>
              <View style={styles.matchTeams}>
                <View style={styles.matchTeamCol}>
                  {match.teamA?.logoUrl ? (
                    <Image source={{ uri: match.teamA.logoUrl }} style={styles.teamLogo} contentFit="cover" />
                  ) : (
                    <View style={styles.teamLogoPlaceholder}>
                      <IconSymbol name="shield.fill" size={24} color="#39FF14" />
                    </View>
                  )}
                  <Text style={styles.teamName} numberOfLines={1}>{match.teamA?.name ?? "TBD"}</Text>
                </View>
                <View style={styles.matchCenter}>
                  {match.status === "completed" ? (
                    <Text style={styles.scoreText}>{match.scoreA} - {match.scoreB}</Text>
                  ) : (
                    <Text style={styles.vsText}>VS</Text>
                  )}
                  <Text style={styles.formatText}>{match.format}</Text>
                </View>
                <View style={styles.matchTeamCol}>
                  {match.teamB?.logoUrl ? (
                    <Image source={{ uri: match.teamB.logoUrl }} style={styles.teamLogo} contentFit="cover" />
                  ) : (
                    <View style={styles.teamLogoPlaceholder}>
                      <Text style={styles.tbd}>?</Text>
                    </View>
                  )}
                  <Text style={styles.teamName} numberOfLines={1}>{match.teamB?.name ?? "Waiting..."}</Text>
                </View>
              </View>
              <View style={styles.matchMeta}>
                <View style={styles.metaRow}>
                  <IconSymbol name="location.fill" size={13} color="#8A8A8A" />
                  <Text style={styles.metaText}>{match.city} • {match.pitchName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <IconSymbol name="calendar" size={13} color="#8A8A8A" />
                  <Text style={styles.metaText}>
                    {new Date(match.matchDate).toLocaleDateString()} {new Date(match.matchDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* City Filter Modal */}
      <Modal visible={showCityModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.common.allCities}</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={styles.cityItem}
                onPress={() => { setCityFilter(undefined); setShowCityModal(false); }}
              >
                <Text style={[styles.cityText, !cityFilter && styles.cityTextActive]}>{t.common.allCities}</Text>
                {!cityFilter && <IconSymbol name="checkmark.circle.fill" size={18} color="#39FF14" />}
              </TouchableOpacity>
              {allCities.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => { setCityFilter(c); setShowCityModal(false); }}
                >
                  <Text style={[styles.cityText, cityFilter === c && styles.cityTextActive]}>{c}</Text>
                  {cityFilter === c && <IconSymbol name="checkmark.circle.fill" size={18} color="#39FF14" />}
                </TouchableOpacity>
              ))}
              {allCities.length === 0 && (
                <Text style={styles.cityEmpty}>No cities available</Text>
              )}
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#39FF14",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createBtnText: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#39FF14",
  },
  tabText: {
    color: "#8A8A8A",
    fontWeight: "700",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#0A0A0A",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  filterChipActive: {
    backgroundColor: "#39FF14",
    borderColor: "#39FF14",
  },
  filterChipText: {
    color: "#8A8A8A",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#0A0A0A",
  },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  clearChipText: {
    color: "#FF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#8A8A8A",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyBtn: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 14,
  },
  matchCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  matchStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
  },
  statusConfirmed: { backgroundColor: "#39FF14" },
  statusCompleted: { backgroundColor: "#8A8A8A" },
  statusText: {
    color: "#8A8A8A",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  matchTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchTeamCol: {
    alignItems: "center",
    flex: 1,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
  },
  tbd: {
    color: "#8A8A8A",
    fontSize: 20,
    fontWeight: "700",
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  matchCenter: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  vsText: {
    color: "#39FF14",
    fontSize: 20,
    fontWeight: "900",
  },
  scoreText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  formatText: {
    color: "#8A8A8A",
    fontSize: 11,
    marginTop: 2,
  },
  matchMeta: {
    marginTop: 12,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#8A8A8A",
    fontSize: 12,
  },
  // City Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  cityText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  cityTextActive: {
    color: "#39FF14",
    fontWeight: "700",
  },
  cityEmpty: {
    color: "#8A8A8A",
    fontSize: 14,
    textAlign: "center",
    padding: 24,
  },
});
