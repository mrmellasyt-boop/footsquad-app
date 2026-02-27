import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

function RatingModal({ matchId, players, onClose }: { matchId: number; players: any[]; onClose: () => void }) {
  const [playerRatings, setPlayerRatings] = useState<Record<number, number>>({});
  const submitMutation = trpc.rating.submit.useMutation({ onSuccess: onClose });

  const handleSubmit = () => {
    const ratingsArr = Object.entries(playerRatings).map(([pid, score]) => ({ playerId: Number(pid), score }));
    if (ratingsArr.length === 0) return;
    submitMutation.mutate({ matchId, ratings: ratingsArr });
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Opponents</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Rate opposing team players (1-5 stars)</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {players.map((p) => (
              <View key={p.id} style={styles.rateRow}>
                <Text style={styles.rateName}>{p.fullName}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setPlayerRatings(prev => ({ ...prev, [p.id]: star }))}>
                      <IconSymbol name="star.fill" size={28} color={(playerRatings[p.id] ?? 0) >= star ? "#FFD700" : "#2A2A2A"} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitMutation.isPending}>
            <Text style={styles.submitBtnText}>{submitMutation.isPending ? "Submitting..." : "Submit Ratings"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MotmModal({ matchId, players, onClose }: { matchId: number; players: any[]; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const voteMutation = trpc.motm.vote.useMutation({ onSuccess: onClose });

  const handleVote = () => {
    if (selected === null) return;
    voteMutation.mutate({ matchId, votedPlayerId: selected });
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Man of the Match</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={24} color="#8A8A8A" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Vote for the best player (cannot vote for yourself)</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.motmRow, selected === p.id && styles.motmRowSelected]}
                onPress={() => setSelected(p.id)}
              >
                <View style={styles.motmAvatar}>
                  {p.photoUrl ? (
                    <Image source={{ uri: p.photoUrl }} style={styles.motmAvatarImg} contentFit="cover" />
                  ) : (
                    <IconSymbol name="person.fill" size={18} color="#8A8A8A" />
                  )}
                </View>
                <Text style={styles.motmName}>{p.fullName}</Text>
                <Text style={styles.motmPos}>{p.position}</Text>
                {selected === p.id && <IconSymbol name="checkmark.circle.fill" size={22} color="#39FF14" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.submitBtn, !selected && styles.btnDisabled]} onPress={handleVote} disabled={!selected || voteMutation.isPending}>
            <Text style={styles.submitBtnText}>{voteMutation.isPending ? "Voting..." : "Submit Vote"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: match, isLoading } = trpc.match.getById.useQuery({ id: matchId });
  const { data: player } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: hasRated } = trpc.rating.hasRated.useQuery({ matchId }, { enabled: isAuthenticated && !!match && match.status === "completed" });
  const { data: hasVotedMotm } = trpc.motm.hasVoted.useQuery({ matchId }, { enabled: isAuthenticated && !!match && match.status === "completed" });
  const { data: motmResults } = trpc.motm.getResults.useQuery({ matchId }, { enabled: !!match && match.status === "completed" });
  const { data: ratingResults } = trpc.rating.getResults.useQuery({ matchId }, { enabled: !!match && match.status === "completed" });

  const [showRating, setShowRating] = useState(false);
  const [showMotm, setShowMotm] = useState(false);

  const joinMutation = trpc.match.join.useMutation();
  const utils = trpc.useUtils();

  // Friendly match requests
  const { data: matchRequests } = trpc.match.getRequests.useQuery({ matchId }, { enabled: isAuthenticated && !!match });
  const acceptMutation = trpc.match.acceptRequest.useMutation({ onSuccess: () => utils.match.getById.invalidate({ id: matchId }) });
  const declineMutation = trpc.match.declineRequest.useMutation({ onSuccess: () => utils.match.getById.invalidate({ id: matchId }) });

  // Check if current player is captain of invited team
  const pendingRequest = (matchRequests ?? []).find((r: any) => r.status === "pending" && player?.teamId === r.teamId && player?.isCaptain);

  if (isLoading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View></ScreenContainer>;
  }

  if (!match) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.emptyText}>Match not found</Text></View></ScreenContainer>;
  }

  const teamAPlayers = (match.players ?? []).filter((p: any) => p.teamId === match.teamAId).map((p: any) => p.player).filter(Boolean);
  const teamBPlayers = (match.players ?? []).filter((p: any) => p.teamId === match.teamBId).map((p: any) => p.player).filter(Boolean);
  const allPlayers = [...teamAPlayers, ...teamBPlayers];
  const opponentPlayers = player?.teamId === match.teamAId ? teamBPlayers : teamAPlayers;
  const votablePlayers = allPlayers.filter((p: any) => p.id !== player?.id);

  const playerCount = (match.players ?? []).length;
  const canJoin = isAuthenticated && player && playerCount < match.maxPlayers && match.status !== "completed" && match.status !== "cancelled";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "detail"}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={() => (
          <View>
            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Match Header */}
            <View style={styles.matchHeader}>
              <View style={styles.matchTeams}>
                <View style={styles.teamCol}>
                  {match.teamA?.logoUrl ? (
                    <Image source={{ uri: match.teamA.logoUrl }} style={styles.teamLogo} contentFit="cover" />
                  ) : (
                    <View style={styles.teamLogoPlaceholder}><IconSymbol name="shield.fill" size={32} color="#39FF14" /></View>
                  )}
                  <Text style={styles.teamName}>{match.teamA?.name ?? "TBD"}</Text>
                </View>
                <View style={styles.scoreCenter}>
                  {match.status === "completed" ? (
                    <Text style={styles.scoreText}>{match.scoreA} - {match.scoreB}</Text>
                  ) : (
                    <Text style={styles.vsText}>VS</Text>
                  )}
                  <View style={[styles.statusBadge, match.status === "completed" && styles.statusCompleted, match.status === "confirmed" && styles.statusConfirmed]}>
                    <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.teamCol}>
                  {match.teamB?.logoUrl ? (
                    <Image source={{ uri: match.teamB.logoUrl }} style={styles.teamLogo} contentFit="cover" />
                  ) : (
                    <View style={styles.teamLogoPlaceholder}><Text style={styles.tbd}>?</Text></View>
                  )}
                  <Text style={styles.teamName}>{match.teamB?.name ?? "Waiting..."}</Text>
                </View>
              </View>
            </View>

            {/* Match Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol name="location.fill" size={16} color="#39FF14" />
                <Text style={styles.infoText}>{match.city} • {match.pitchName}</Text>
              </View>
              <View style={styles.infoRow}>
                <IconSymbol name="calendar" size={16} color="#39FF14" />
                <Text style={styles.infoText}>
                  {new Date(match.matchDate).toLocaleDateString()} • {new Date(match.matchDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <IconSymbol name="person.2.fill" size={16} color="#39FF14" />
                <Text style={styles.infoText}>{match.format} • {playerCount}/{match.maxPlayers} players</Text>
              </View>
            </View>

            {/* Friendly Match Invitation */}
            {pendingRequest && (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteTitle}>Match Invitation</Text>
                <Text style={styles.inviteDesc}>Your team has been invited to this friendly match</Text>
                <View style={styles.inviteBtns}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => acceptMutation.mutate({ requestId: pendingRequest.id, matchId })}
                    disabled={acceptMutation.isPending}
                  >
                    <Text style={styles.acceptBtnText}>{acceptMutation.isPending ? "..." : "Accept"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => declineMutation.mutate({ requestId: pendingRequest.id })}
                    disabled={declineMutation.isPending}
                  >
                    <Text style={styles.declineBtnText}>{declineMutation.isPending ? "..." : "Decline"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Join Button */}
            {canJoin && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => {
                  if (player.teamId) joinMutation.mutate({ matchId, teamId: player.teamId });
                }}
              >
                <Text style={styles.joinBtnText}>{joinMutation.isPending ? "Joining..." : "Join Match"}</Text>
              </TouchableOpacity>
            )}

            {/* Rosters */}
            <View style={styles.rosterSection}>
              <Text style={styles.sectionTitle}>Team A Roster</Text>
              {teamAPlayers.length === 0 ? (
                <Text style={styles.noPlayers}>No players yet</Text>
              ) : (
                teamAPlayers.map((p: any) => (
                  <TouchableOpacity key={p.id} style={styles.rosterRow} onPress={() => router.push(`/player/${p.id}` as any)}>
                    <View style={styles.rosterAvatar}>
                      {p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={styles.rosterAvatarImg} contentFit="cover" /> : <IconSymbol name="person.fill" size={16} color="#8A8A8A" />}
                    </View>
                    <Text style={styles.rosterName}>{p.fullName}</Text>
                    <Text style={styles.rosterPos}>{p.position}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.rosterSection}>
              <Text style={styles.sectionTitle}>Team B Roster</Text>
              {teamBPlayers.length === 0 ? (
                <Text style={styles.noPlayers}>No players yet</Text>
              ) : (
                teamBPlayers.map((p: any) => (
                  <TouchableOpacity key={p.id} style={styles.rosterRow} onPress={() => router.push(`/player/${p.id}` as any)}>
                    <View style={styles.rosterAvatar}>
                      {p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={styles.rosterAvatarImg} contentFit="cover" /> : <IconSymbol name="person.fill" size={16} color="#8A8A8A" />}
                    </View>
                    <Text style={styles.rosterName}>{p.fullName}</Text>
                    <Text style={styles.rosterPos}>{p.position}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Post-match actions */}
            {match.status === "completed" && isAuthenticated && (
              <View style={styles.postMatchSection}>
                <Text style={styles.sectionTitle}>Post-Match</Text>
                {!hasRated && opponentPlayers.length > 0 && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowRating(true)}>
                    <IconSymbol name="star.fill" size={20} color="#FFD700" />
                    <Text style={styles.actionBtnText}>Rate Opponents</Text>
                  </TouchableOpacity>
                )}
                {hasRated && <Text style={styles.completedAction}>Ratings submitted</Text>}

                {!hasVotedMotm && votablePlayers.length > 0 && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowMotm(true)}>
                    <IconSymbol name="trophy.fill" size={20} color="#FFD700" />
                    <Text style={styles.actionBtnText}>Vote Man of the Match</Text>
                  </TouchableOpacity>
                )}
                {hasVotedMotm && <Text style={styles.completedAction}>MOTM vote submitted</Text>}

                {/* MOTM Results */}
                {motmResults && motmResults.totalVotes > 0 && (
                  <View style={styles.resultsCard}>
                    <Text style={styles.resultsTitle}>MOTM Winners</Text>
                    {motmResults.winners.map((winnerId: number) => {
                      const winner = allPlayers.find((p: any) => p.id === winnerId);
                      return winner ? (
                        <Text key={winnerId} style={styles.winnerText}>{winner.fullName} 🏆</Text>
                      ) : null;
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      />

      {showRating && <RatingModal matchId={matchId} players={opponentPlayers} onClose={() => setShowRating(false)} />}
      {showMotm && <MotmModal matchId={matchId} players={votablePlayers} onClose={() => setShowMotm(false)} />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8, marginBottom: 8,
  },
  matchHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  matchTeams: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  teamCol: { alignItems: "center", flex: 1 },
  teamLogo: { width: 64, height: 64, borderRadius: 32 },
  teamLogoPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  tbd: { color: "#8A8A8A", fontSize: 24, fontWeight: "700" },
  teamName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginTop: 8, textAlign: "center" },
  scoreCenter: { alignItems: "center", paddingHorizontal: 12 },
  vsText: { color: "#39FF14", fontSize: 28, fontWeight: "900" },
  scoreText: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  statusBadge: { backgroundColor: "#FFD700", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  statusConfirmed: { backgroundColor: "#39FF14" },
  statusCompleted: { backgroundColor: "#8A8A8A" },
  statusText: { color: "#0A0A0A", fontSize: 11, fontWeight: "800" },
  infoCard: {
    marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#2A2A2A", gap: 10, marginBottom: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { color: "#FFFFFF", fontSize: 14 },
  joinBtn: {
    marginHorizontal: 20, backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", marginBottom: 16,
  },
  joinBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  rosterSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  noPlayers: { color: "#8A8A8A", fontSize: 14, paddingVertical: 8 },
  rosterRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: "#2A2A2A", gap: 10,
  },
  rosterAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  rosterAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  rosterName: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1 },
  rosterPos: { color: "#39FF14", fontSize: 12, fontWeight: "700" },
  postMatchSection: { paddingHorizontal: 20, marginBottom: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12,
    padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#FFD700", gap: 12,
  },
  actionBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  completedAction: { color: "#39FF14", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  resultsCard: {
    backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: "#39FF14",
  },
  resultsTitle: { color: "#FFD700", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  winnerText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#8A8A8A", fontSize: 13, marginBottom: 16 },
  rateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  rateName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", flex: 1 },
  starsRow: { flexDirection: "row", gap: 4 },
  submitBtn: { backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  submitBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  motmRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0A0A0A", borderRadius: 12,
    padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#2A2A2A", gap: 10,
  },
  motmRowSelected: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.1)" },
  motmAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  motmAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  motmName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", flex: 1 },
  motmPos: { color: "#39FF14", fontSize: 12, fontWeight: "700" },
  inviteCard: {
    marginHorizontal: 20, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#FFD700", marginBottom: 16,
  },
  inviteTitle: { color: "#FFD700", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  inviteDesc: { color: "#8A8A8A", fontSize: 13, marginBottom: 12 },
  inviteBtns: { flexDirection: "row", gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: "#39FF14", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  acceptBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  declineBtn: { flex: 1, backgroundColor: "#2A2A2A", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#FF4444" },
  declineBtnText: { color: "#FF4444", fontWeight: "800", fontSize: 15 },
});
