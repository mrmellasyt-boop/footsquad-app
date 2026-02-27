import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { Image } from "expo-image";

const SCREEN_WIDTH = Dimensions.get("window").width;
// 9:16 portrait card: width = 55% of screen, height = width * 16/9
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.55);
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));

function BestMomentSection() {
  const { data: highlights, isLoading } = trpc.highlight.list.useQuery(undefined, { refetchOnWindowFocus: true });
  const router = useRouter();

  if (isLoading) return null;
  const top10 = (highlights ?? []).slice(0, 10);
  if (top10.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>🔥</Text>
        <Text style={styles.sectionTitle}>Best Moments</Text>
        <View style={styles.headerRight}>
          <Text style={styles.badge48h}>48H</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push("/highlights" as any)}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={top10}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/highlight/${item.id}` as any)}
            style={[styles.hlCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
          >
            {item.mediaUrl ? (
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.hlCardImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.hlCardPlaceholder}>
                <IconSymbol name="video.fill" size={36} color="#39FF14" />
              </View>
            )}
            {/* Gradient overlay */}
            <View style={styles.hlCardOverlay}>
              <View style={styles.hlCardTop}>
                {item.mediaType === "video" && (
                  <View style={styles.videoTag}>
                    <IconSymbol name="video.fill" size={12} color="#FFFFFF" />
                    <Text style={styles.videoTagText}>VIDEO</Text>
                  </View>
                )}
              </View>
              <View style={styles.hlCardBottom}>
                <Text style={styles.hlPlayerName} numberOfLines={1}>
                  {item.player?.fullName ?? "Unknown"}
                </Text>
                <Text style={styles.hlTeamCity} numberOfLines={1}>
                  {item.team?.name ?? "Free Agent"} • {item.player?.city}
                </Text>
                <View style={styles.hlLikesRow}>
                  <IconSymbol name="heart.fill" size={14} color="#FF4444" />
                  <Text style={styles.hlLikesCount}>{item.likes}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function TopPlayersSection() {
  const { data: players, isLoading } = trpc.player.leaderboard.useQuery({}, { refetchOnWindowFocus: true });
  const router = useRouter();

  if (isLoading) return null;
  const top10 = (players ?? []).slice(0, 10);
  if (top10.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>🏆</Text>
        <Text style={styles.sectionTitle}>Top 10 Players</Text>
      </View>
      <FlatList
        data={top10}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.playerCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/player/${item.id}` as any)}
          >
            <View style={[styles.rankBadge, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze]}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.playerAvatar}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <IconSymbol name="person.fill" size={28} color="#8A8A8A" />
              )}
            </View>
            <Text style={styles.playerName} numberOfLines={1}>{item.fullName}</Text>
            <Text style={styles.playerPosition}>{item.position}</Text>
            <View style={styles.playerStats}>
              <Text style={styles.statValue}>{item.totalPoints}</Text>
              <Text style={styles.statLabel}>pts</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function UpcomingMatchesSection() {
  const { data: matchList, isLoading } = trpc.match.upcoming.useQuery({}, { refetchOnWindowFocus: true });
  const router = useRouter();

  if (isLoading) return null;
  if (!matchList || matchList.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📅</Text>
          <Text style={styles.sectionTitle}>Upcoming Matches</Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming matches</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>📅</Text>
        <Text style={styles.sectionTitle}>Upcoming Matches</Text>
      </View>
      {matchList.slice(0, 5).map((match) => (
        <TouchableOpacity
          key={match.id}
          style={styles.matchCard}
          activeOpacity={0.7}
          onPress={() => router.push(`/match/${match.id}` as any)}
        >
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
            <View style={styles.matchVs}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.matchFormat}>{match.format}</Text>
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
          <View style={styles.matchInfo}>
            <View style={styles.matchInfoRow}>
              <IconSymbol name="location.fill" size={14} color="#8A8A8A" />
              <Text style={styles.matchInfoText}>{match.city} • {match.pitchName}</Text>
            </View>
            <View style={styles.matchInfoRow}>
              <IconSymbol name="calendar" size={14} color="#8A8A8A" />
              <Text style={styles.matchInfoText}>
                {new Date(match.matchDate).toLocaleDateString()} • {new Date(match.matchDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
          {match.playerCount < match.maxPlayers && (
            <View style={styles.joinBadge}>
              <Text style={styles.joinText}>{match.playerCount}/{match.maxPlayers} players • Join</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <ScreenContainer>
      <FlatList
        data={[1]}
        keyExtractor={() => "home"}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={() => (
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.logoText}>FOOTSQUAD</Text>
                <Text style={styles.tagline}>Play. Compete. Rise.</Text>
              </View>
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => router.push("/notifications" as any)}
              >
                <IconSymbol name="bell.fill" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!isAuthenticated && (
              <View style={styles.loginBanner}>
                <Text style={styles.loginBannerText}>Sign in to join matches and build your reputation</Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => router.push("/login" as any)}
                >
                  <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>
              </View>
            )}

            <BestMomentSection />

            {isAuthenticated && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => router.push("/upload-highlight" as any)}
                >
                  <IconSymbol name="bolt.fill" size={18} color="#0A0A0A" />
                  <Text style={styles.quickActionText}>Post Highlight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtnOutline}
                  onPress={() => router.push("/free-agents" as any)}
                >
                  <IconSymbol name="person.2.fill" size={18} color="#39FF14" />
                  <Text style={styles.quickActionTextOutline}>Free Agents</Text>
                </TouchableOpacity>
              </View>
            )}

            <TopPlayersSection />
            <UpcomingMatchesSection />
          </View>
        )}
      />
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
    paddingBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#39FF14",
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 13,
    color: "#8A8A8A",
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  loginBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#39FF14",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loginBannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  loginBtn: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBtnText: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
  },
  badge48h: {
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  highlightCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    overflow: "hidden",
    height: 200,
  },
  highlightImage: {
    width: "100%",
    height: "100%",
  },
  highlightOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  highlightName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  highlightTeam: {
    color: "#8A8A8A",
    fontSize: 13,
    marginTop: 2,
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  likesCount: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  playerCard: {
    width: 120,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#2A2A2A",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankGold: { backgroundColor: "#FFD700" },
  rankSilver: { backgroundColor: "#C0C0C0" },
  rankBronze: { backgroundColor: "#CD7F32" },
  rankText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  playerPosition: {
    color: "#39FF14",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  playerStats: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
    gap: 2,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "#8A8A8A",
    fontSize: 11,
  },
  matchCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
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
  matchVs: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  vsText: {
    color: "#39FF14",
    fontSize: 20,
    fontWeight: "900",
  },
  matchFormat: {
    color: "#8A8A8A",
    fontSize: 11,
    marginTop: 2,
  },
  matchInfo: {
    marginTop: 12,
    gap: 4,
  },
  matchInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchInfoText: {
    color: "#8A8A8A",
    fontSize: 12,
  },
  joinBadge: {
    marginTop: 12,
    backgroundColor: "rgba(57, 255, 20, 0.15)",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  joinText: {
    color: "#39FF14",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  emptyText: {
    color: "#8A8A8A",
    fontSize: 14,
  },
  // ─── Highlight Carousel ───
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  seeAllBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: "#39FF14" },
  seeAllText: { color: "#39FF14", fontSize: 12, fontWeight: "700" },
  hlCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  hlCardImage: { width: "100%", height: "100%" },
  hlCardPlaceholder: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A1A",
  },
  hlCardOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "space-between",
  },
  hlCardTop: { padding: 10, flexDirection: "row", justifyContent: "flex-end" },
  videoTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  videoTagText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  hlCardBottom: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  hlPlayerName: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  hlTeamCity: { color: "#9BA1A6", fontSize: 11, marginTop: 2 },
  hlLikesRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  hlLikesCount: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#39FF14",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  quickActionText: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 14,
  },
  quickActionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#39FF14",
  },
  quickActionTextOutline: {
    color: "#39FF14",
    fontWeight: "700",
    fontSize: 14,
  },
});
