import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = Number(id);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: team, isLoading } = trpc.team.getById.useQuery({ id: teamId });
  const { data: myPlayer } = trpc.player.me.useQuery(undefined, { enabled: isAuthenticated });
  const joinMutation = trpc.team.join.useMutation();

  if (isLoading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View></ScreenContainer>;
  }

  if (!team) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.emptyText}>Team not found</Text></View></ScreenContainer>;
  }

  const canJoin = isAuthenticated && myPlayer && !myPlayer.teamId && myPlayer.isFreeAgent;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "team"}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={() => (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.teamHeader}>
              <View style={styles.teamLogo}>
                {team.logoUrl ? (
                  <Image source={{ uri: team.logoUrl }} style={styles.teamLogoImg} contentFit="cover" />
                ) : (
                  <IconSymbol name="shield.fill" size={48} color="#39FF14" />
                )}
              </View>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamCity}>{team.city}</Text>
            </View>

            {canJoin && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => joinMutation.mutate({ teamId })}
                disabled={joinMutation.isPending}
              >
                <Text style={styles.joinBtnText}>{joinMutation.isPending ? "Joining..." : "Join Team"}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Members ({team.members?.length ?? 0})</Text>
              {(team.members ?? []).map((member: any) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberRow}
                  onPress={() => router.push(`/player/${member.id}` as any)}
                >
                  <View style={styles.memberAvatar}>
                    {member.photoUrl ? (
                      <Image source={{ uri: member.photoUrl }} style={styles.memberAvatarImg} contentFit="cover" />
                    ) : (
                      <IconSymbol name="person.fill" size={18} color="#8A8A8A" />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberMeta}>{member.position}</Text>
                  </View>
                  {member.isCaptain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>Captain</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8, marginBottom: 8 },
  teamHeader: { alignItems: "center", paddingVertical: 20 },
  teamLogo: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", overflow: "hidden", borderWidth: 3, borderColor: "#39FF14", marginBottom: 12 },
  teamLogoImg: { width: 96, height: 96, borderRadius: 48 },
  teamName: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  teamCity: { color: "#8A8A8A", fontSize: 14, marginTop: 4 },
  joinBtn: { marginHorizontal: 20, backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 20 },
  joinBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#2A2A2A", gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  memberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  memberInfo: { flex: 1 },
  memberName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  memberMeta: { color: "#39FF14", fontSize: 12, marginTop: 2 },
  captainBadge: { backgroundColor: "#FFD700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  captainText: { color: "#0A0A0A", fontSize: 11, fontWeight: "800" },
});
