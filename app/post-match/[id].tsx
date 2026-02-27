import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function PostMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const router = useRouter();
  const colors = useColors();

  const [step, setStep] = useState<"score" | "motm" | "rating" | "done">("score");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [selectedMotm, setSelectedMotm] = useState<number | null>(null);
  const [playerRatings, setPlayerRatings] = useState<Record<number, number>>({});

  const { data: match } = trpc.match.getById.useQuery({ id: matchId });
  const { data: me } = trpc.player.me.useQuery();
  const { data: hasRated } = trpc.rating.hasRated.useQuery({ matchId });
  const { data: hasVoted } = trpc.motm.hasVoted.useQuery({ matchId });
  const { data: scoreStatus } = trpc.match.getScoreStatus.useQuery({ matchId } as any);

  const submitScore = trpc.match.submitScore.useMutation();
  const submitRating = trpc.rating.submit.useMutation();
  const voteMotm = trpc.motm.vote.useMutation();

  const utils = trpc.useUtils();

  const isCapA = me && match?.teamA?.captainId === me.id;
  const isCapB = me && match?.teamB?.captainId === me.id;
  const isCaptain = isCapA || isCapB;

  // All players in the match (both teams)
  const allPlayers = useMemo(() => {
    if (!match) return [];
    return [...(match.rosterA || []), ...(match.rosterB || [])].filter(mp => mp.joinStatus === "approved");
  }, [match]);

  // Own team players (for rating — captain rates his own team including himself)
  const myTeamPlayers = useMemo(() => {
    if (!match || !me) return [];
    const myTeamId = me.teamId;
    return allPlayers.filter(mp => mp.teamId === myTeamId);
  }, [allPlayers, match, me]);

  const maxBudget = myTeamPlayers.length * 7;
  const currentTotal = Object.values(playerRatings).reduce((a, b) => a + b, 0);
  const budgetLeft = maxBudget - currentTotal;

  const handleSubmitScore = async () => {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      Alert.alert("Invalid Score", "Please enter valid scores (0 or above).");
      return;
    }
    try {
      const result = await submitScore.mutateAsync({ matchId, scoreA: sA, scoreB: sB });
      await utils.match.getById.invalidate({ id: matchId });
      await utils.match.getScoreStatus.invalidate({ matchId } as any);
      if (result.status === "waiting") {
        Alert.alert("Score Submitted ✅", "Waiting for the opponent captain to submit their score.");
        router.back();
      } else if (result.status === "confirmed") {
        Alert.alert("Score Confirmed! ✅", `Final score: ${result.scoreA}-${result.scoreB}. Ratings and MOTM voting are now open!`);
        setStep("motm");
      } else if (result.status === "conflict") {
        Alert.alert("Score Conflict ⚠️", "The scores don't match. Both captains must resubmit. This is your last chance!");
        setScoreA(""); setScoreB("");
      } else if (result.status === "null_result") {
        Alert.alert("Match Result: NULL ❌", "Both captains submitted different scores twice. No points will be awarded.");
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleVoteMotm = async () => {
    if (!selectedMotm) {
      Alert.alert("Select a player", "Please select the Man of the Match.");
      return;
    }
    try {
      const result = await voteMotm.mutateAsync({ matchId, votedPlayerId: selectedMotm });
      await utils.motm.hasVoted.invalidate({ matchId });
      if (result.finalized) {
        Alert.alert("MOTM Finalized! 🏆", "All votes are in. The Man of the Match has been announced!");
      } else {
        Alert.alert("Vote Submitted ✅", "Your MOTM vote has been recorded.");
      }
      setStep("rating");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleSubmitRatings = async () => {
    const ratingsArr = myTeamPlayers.map(mp => ({
      playerId: mp.playerId,
      score: playerRatings[mp.playerId] ?? 5,
    }));
    if (currentTotal > maxBudget) {
      Alert.alert("Budget Exceeded", `You can distribute at most ${maxBudget} points total (max avg 7/10 per player).`);
      return;
    }
    try {
      await submitRating.mutateAsync({ matchId, ratings: ratingsArr });
      await utils.rating.hasRated.invalidate({ matchId });
      Alert.alert("Ratings Submitted ✅", "Your ratings have been recorded.");
      setStep("done");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (!match || !me) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const styles = createStyles(colors);

  // Determine current step based on match status
  const matchStatus = scoreStatus?.status ?? match.status;
  const isCompleted = matchStatus === "completed";
  const isInProgress = matchStatus === "in_progress";
  const isNullResult = matchStatus === "null_result";

  const hasSubmittedScore = isCapA
    ? !!(scoreStatus as any)?.scoreSubmittedByA
    : !!(scoreStatus as any)?.scoreSubmittedByB;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Post-Match</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Match Info */}
        <View style={styles.matchCard}>
          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              {match.teamA?.logoUrl ? (
                <Image source={{ uri: match.teamA.logoUrl }} style={styles.teamLogo} contentFit="cover" />
              ) : (
                <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
                  <Text style={styles.teamLogoText}>{match.teamA?.name?.[0] ?? "A"}</Text>
                </View>
              )}
              <Text style={styles.teamName}>{match.teamA?.name ?? "Team A"}</Text>
            </View>
            <View style={styles.scoreDisplay}>
              {isCompleted ? (
                <Text style={styles.finalScore}>{match.scoreA ?? 0} - {match.scoreB ?? 0}</Text>
              ) : isNullResult ? (
                <Text style={styles.nullScore}>NULL</Text>
              ) : (
                <Text style={styles.pendingScore}>vs</Text>
              )}
            </View>
            <View style={styles.teamCol}>
              {match.teamB?.logoUrl ? (
                <Image source={{ uri: match.teamB.logoUrl }} style={styles.teamLogo} contentFit="cover" />
              ) : (
                <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
                  <Text style={styles.teamLogoText}>{match.teamB?.name?.[0] ?? "B"}</Text>
                </View>
              )}
              <Text style={styles.teamName}>{match.teamB?.name ?? "Team B"}</Text>
            </View>
          </View>
          {isNullResult && (
            <View style={styles.nullBanner}>
              <Text style={styles.nullBannerText}>❌ Match result is NULL — Score conflict not resolved</Text>
            </View>
          )}
          {scoreStatus?.scoreConflict && !isNullResult && (
            <View style={styles.conflictBanner}>
              <Text style={styles.conflictBannerText}>⚠️ Score conflict — Please resubmit the correct score</Text>
            </View>
          )}
        </View>

        {/* STEP 1: Score Submission (Captains only) */}
        {isCaptain && !isCompleted && !isNullResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Submit Score</Text>
            <Text style={styles.sectionSubtitle}>
              {hasSubmittedScore
                ? "✅ You have submitted your score. Waiting for opponent captain."
                : "Enter the final score as you observed it."}
            </Text>
            {!hasSubmittedScore && (
              <>
                <View style={styles.scoreInputRow}>
                  <View style={styles.scoreInputGroup}>
                    <Text style={styles.scoreInputLabel}>{match.teamA?.name ?? "Team A"}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scoreA}
                      onChangeText={setScoreA}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>—</Text>
                  <View style={styles.scoreInputGroup}>
                    <Text style={styles.scoreInputLabel}>{match.teamB?.name ?? "Team B"}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scoreB}
                      onChangeText={setScoreB}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      maxLength={2}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSubmitScore}
                  disabled={submitScore.isPending}
                >
                  {submitScore.isPending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit Score</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* STEP 2: MOTM Vote (all players, when match is completed) */}
        {isCompleted && !hasVoted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Man of the Match</Text>
            <Text style={styles.sectionSubtitle}>Vote for the best player of this match (both teams eligible).</Text>
            <View style={styles.playerGrid}>
              {allPlayers.map((mp) => (
                <TouchableOpacity
                  key={mp.playerId}
                  style={[styles.playerCard, selectedMotm === mp.playerId && styles.playerCardSelected]}
                  onPress={() => setSelectedMotm(mp.playerId)}
                >
                  {mp.player?.photoUrl ? (
                    <Image source={{ uri: mp.player.photoUrl }} style={styles.playerAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.playerAvatar, styles.playerAvatarPlaceholder]}>
                      <Text style={styles.playerAvatarText}>{mp.player?.fullName?.[0] ?? "?"}</Text>
                    </View>
                  )}
                  <Text style={styles.playerCardName} numberOfLines={1}>{mp.player?.fullName ?? "Player"}</Text>
                  <Text style={styles.playerCardTeam}>{mp.teamSide === "A" ? match.teamA?.name : match.teamB?.name}</Text>
                  {selectedMotm === mp.playerId && <Text style={styles.selectedBadge}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedMotm && styles.primaryBtnDisabled]}
              onPress={handleVoteMotm}
              disabled={!selectedMotm || voteMotm.isPending}
            >
              {voteMotm.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit MOTM Vote</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && hasVoted && (
          <View style={styles.votedBanner}>
            <Text style={styles.votedBannerText}>✅ MOTM vote submitted</Text>
          </View>
        )}

        {/* STEP 3: Rate Own Team Players (when match is completed) */}
        {isCompleted && !hasRated && myTeamPlayers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Rate Your Team</Text>
            <View style={styles.budgetBar}>
              <Text style={styles.budgetText}>
                Budget: {currentTotal}/{maxBudget} pts used
              </Text>
              <View style={styles.budgetTrack}>
                <View style={[styles.budgetFill, {
                  width: `${Math.min((currentTotal / maxBudget) * 100, 100)}%`,
                  backgroundColor: currentTotal > maxBudget ? colors.error : colors.primary,
                }]} />
              </View>
              <Text style={[styles.budgetLeft, currentTotal > maxBudget && { color: colors.error }]}>
                {budgetLeft >= 0 ? `${budgetLeft} pts left` : `${Math.abs(budgetLeft)} pts over budget!`}
              </Text>
            </View>
            <Text style={styles.budgetHint}>
              Max avg 7/10 per player — prevents fake ratings
            </Text>
            {myTeamPlayers.map((mp) => (
              <View key={mp.playerId} style={styles.ratingRow}>
                <View style={styles.ratingPlayerInfo}>
                  {mp.player?.photoUrl ? (
                    <Image source={{ uri: mp.player.photoUrl }} style={styles.ratingAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.ratingAvatar, styles.ratingAvatarPlaceholder]}>
                      <Text style={styles.ratingAvatarText}>{mp.player?.fullName?.[0] ?? "?"}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.ratingPlayerName}>{mp.player?.fullName ?? "Player"}</Text>
                    <Text style={styles.ratingPlayerPos}>{mp.player?.position ?? ""}</Text>
                  </View>
                </View>
                <View style={styles.ratingControls}>
                  <TouchableOpacity
                    style={styles.ratingBtn}
                    onPress={() => setPlayerRatings(prev => ({
                      ...prev,
                      [mp.playerId]: Math.max(1, (prev[mp.playerId] ?? 5) - 1)
                    }))}
                  >
                    <Text style={styles.ratingBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.ratingScore}>{playerRatings[mp.playerId] ?? 5}</Text>
                  <TouchableOpacity
                    style={styles.ratingBtn}
                    onPress={() => setPlayerRatings(prev => ({
                      ...prev,
                      [mp.playerId]: Math.min(10, (prev[mp.playerId] ?? 5) + 1)
                    }))}
                  >
                    <Text style={styles.ratingBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.primaryBtn, currentTotal > maxBudget && styles.primaryBtnDisabled]}
              onPress={handleSubmitRatings}
              disabled={submitRating.isPending || currentTotal > maxBudget}
            >
              {submitRating.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Ratings</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && hasRated && (
          <View style={styles.votedBanner}>
            <Text style={styles.votedBannerText}>✅ Ratings submitted</Text>
          </View>
        )}

        {/* Done state */}
        {isCompleted && hasVoted && hasRated && (
          <View style={styles.doneSection}>
            <Text style={styles.doneTitle}>🎉 All done!</Text>
            <Text style={styles.doneSubtitle}>You've submitted your score, MOTM vote, and ratings.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
              <Text style={styles.primaryBtnText}>Back to Match</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    backBtn: { padding: 8 },
    backBtnText: { color: colors.primary, fontSize: 15 },
    title: { fontSize: 20, fontWeight: "700", color: colors.foreground },
    matchCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    teamsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    teamCol: { alignItems: "center", flex: 1 },
    teamLogo: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", marginBottom: 8 },
    teamLogoPlaceholder: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
    teamLogoText: { fontSize: 22, fontWeight: "700", color: colors.foreground },
    teamName: { fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "center" },
    scoreDisplay: { flex: 1, alignItems: "center" },
    finalScore: { fontSize: 32, fontWeight: "800", color: colors.primary },
    nullScore: { fontSize: 20, fontWeight: "700", color: colors.error },
    pendingScore: { fontSize: 24, fontWeight: "700", color: colors.muted },
    nullBanner: { marginTop: 12, backgroundColor: colors.error + "22", borderRadius: 8, padding: 10 },
    nullBannerText: { color: colors.error, fontSize: 13, textAlign: "center", fontWeight: "600" },
    conflictBanner: { marginTop: 12, backgroundColor: colors.warning + "22", borderRadius: 8, padding: 10 },
    conflictBannerText: { color: colors.warning, fontSize: 13, textAlign: "center", fontWeight: "600" },
    section: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, marginBottom: 6 },
    sectionSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 18 },
    scoreInputRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 },
    scoreInputGroup: { alignItems: "center" },
    scoreInputLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
    scoreInput: { width: 72, height: 64, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, textAlign: "center", fontSize: 28, fontWeight: "800", color: colors.foreground, backgroundColor: colors.background },
    scoreSeparator: { fontSize: 28, fontWeight: "700", color: colors.muted, marginTop: 20 },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
    playerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    playerCard: { width: "30%", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: colors.border },
    playerCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
    playerAvatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", marginBottom: 6 },
    playerAvatarPlaceholder: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
    playerAvatarText: { fontSize: 18, fontWeight: "700", color: colors.foreground },
    playerCardName: { fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" },
    playerCardTeam: { fontSize: 10, color: colors.muted, textAlign: "center" },
    selectedBadge: { fontSize: 14, color: colors.primary, marginTop: 4 },
    votedBanner: { backgroundColor: colors.success + "22", borderRadius: 12, padding: 14, marginBottom: 16, alignItems: "center" },
    votedBannerText: { color: colors.success, fontSize: 14, fontWeight: "600" },
    budgetBar: { marginBottom: 8 },
    budgetText: { fontSize: 13, color: colors.foreground, fontWeight: "600", marginBottom: 6 },
    budgetTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
    budgetFill: { height: "100%", borderRadius: 4 },
    budgetLeft: { fontSize: 12, color: colors.muted },
    budgetHint: { fontSize: 11, color: colors.muted, marginBottom: 16, fontStyle: "italic" },
    ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    ratingPlayerInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    ratingAvatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden" },
    ratingAvatarPlaceholder: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
    ratingAvatarText: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    ratingPlayerName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    ratingPlayerPos: { fontSize: 11, color: colors.muted },
    ratingControls: { flexDirection: "row", alignItems: "center", gap: 12 },
    ratingBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
    ratingBtnText: { fontSize: 18, fontWeight: "700", color: colors.foreground },
    ratingScore: { fontSize: 20, fontWeight: "800", color: colors.primary, width: 28, textAlign: "center" },
    doneSection: { alignItems: "center", padding: 24 },
    doneTitle: { fontSize: 28, fontWeight: "800", color: colors.primary, marginBottom: 8 },
    doneSubtitle: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 24 },
  });
}
