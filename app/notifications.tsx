import { useEffect, useRef, useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";

// Map notification types to icons and navigation targets
function getNotifIcon(type: string): string {
  switch (type) {
    case "match_invite": return "envelope.fill";
    case "match_accepted": return "checkmark.circle.fill";
    case "match_declined": return "xmark.circle.fill";
    case "team_join_request": return "person.badge.plus";
    case "team_join_approved": return "checkmark.seal.fill";
    case "team_join_declined": return "xmark.circle.fill";
    case "team_join_pending": return "clock.fill";
    case "join_request": return "person.badge.plus";
    case "join_approved": return "checkmark.seal.fill";
    case "join_declined": return "xmark.circle.fill";
    case "play_request": return "sportscourt.fill";
    case "play_accepted": return "checkmark.circle.fill";
    case "play_declined": return "xmark.circle.fill";
    case "score_request": return "number.circle.fill";
    case "score_confirmed": return "checkmark.circle.fill";
    case "score_conflict": return "exclamationmark.triangle.fill";
    case "score_null": return "xmark.circle.fill";
    case "motm_winner": return "trophy.fill";
    case "rating_open": return "star.fill";
    case "follow": return "person.2.fill";
    case "highlight_like": return "heart.fill";
    case "challenge_accepted": return "bolt.fill";
    case "match_confirmed": return "sportscourt.fill";
    default: return "bell.fill";
  }
}

function getNotifColor(type: string): string {
  switch (type) {
    case "match_accepted":
    case "join_approved":
    case "play_accepted":
    case "score_confirmed":
    case "match_invite":
    case "team_join_request":
    case "team_join_approved":
    case "team_join_pending":
      return "#39FF14";
    case "match_declined":
    case "join_declined":
    case "play_declined":
    case "score_null":
      return "#FF4444";
    case "score_conflict":
      return "#FFD700";
    case "motm_winner":
      return "#FFD700";
    case "highlight_like":
      return "#FF6B6B";
    case "challenge_accepted":
    case "match_confirmed":
      return "#39FF14";
    default:
      return "#39FF14";
  }
}

function navigateFromNotif(router: ReturnType<typeof useRouter>, notif: any) {
  try {
    const data = notif.data ? JSON.parse(notif.data) : {};
    const type = notif.type as string;

    // Match-related notifications
    if (["match_invite", "match_accepted", "match_declined", "match_confirmed", "join_request", "join_approved",
         "join_declined", "play_request", "play_accepted", "play_declined", "play_request_accepted",
         "score_request", "score_confirmed", "score_conflict", "score_null",
         "motm_winner", "rating_open"].includes(type)) {
      if (data.matchId) {
        router.push(`/match/${data.matchId}` as any);
        return;
      }
    }

    // Highlight-related
    if (type === "highlight_like" && data.highlightId) {
      router.push(`/highlight/${data.highlightId}` as any);
      return;
    }

    // Challenge-related
    if (type === "challenge_accepted" && data.matchId) {
      router.push(`/match/${data.matchId}` as any);
      return;
    }

    // Follow-related
    if (type === "follow" && data.followerId) {
      router.push(`/player/${data.followerId}` as any);
      return;
    }

    // Team join-related
    if ((type === "team_join_request" || type === "team_join_approved" || type === "team_join_declined" || type === "team_join_pending") && data.teamId) {
      router.push(`/team/${data.teamId}` as any);
      return;
    }
  } catch {
    // No navigation if data is malformed
  }
}

// Determine which action buttons to show inline for a notification type
function getInlineActions(type: string): { accept: boolean; decline: boolean } {
  switch (type) {
    case "match_invite":       // Friendly match invitation → Accept / Decline
      return { accept: true, decline: true };
    case "play_request":       // Public challenge request → Accept / Decline
      return { accept: true, decline: true };
    case "join_request":       // Player wants to join match roster → Approve / Decline
      return { accept: true, decline: true };
    case "team_join_request":  // Player wants to join team → Approve / Decline
      return { accept: true, decline: true };
    default:
      return { accept: false, decline: false };
  }
}

function NotifCard({
  item,
  onAccept,
  onDecline,
  onPress,
  isActing,
}: {
  item: any;
  onAccept?: (data: { matchId?: number; requestId?: number; playerId?: number; teamId?: number }) => void;
  onDecline?: (data: { matchId?: number; requestId?: number; playerId?: number; teamId?: number }) => void;
  onPress: () => void;
  isActing?: boolean;
}) {
  const iconName = getNotifIcon(item.type) as any;
  const iconColor = getNotifColor(item.type);
  const actions = getInlineActions(item.type);

  let parsedData: any = {};
  try { parsedData = item.data ? JSON.parse(item.data) : {}; } catch { /* ignore */ }

  const matchId: number | undefined = parsedData.matchId ?? undefined;
  const requestId: number | undefined = parsedData.requestId ?? undefined;
  const playerId: number | undefined = parsedData.playerId ?? undefined;
  const teamId: number | undefined = parsedData.teamId ?? undefined;
  const hasNavigation = !!(matchId || teamId || parsedData.highlightId || parsedData.followerId);
  const showActions = (actions.accept || actions.decline) && !isActing;

  return (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.notifUnread]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { borderColor: iconColor + "44" }]}>
        <IconSymbol name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          {!item.isRead && <View style={styles.dot} />}
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>{item.message}</Text>

        {/* Loading state while action is in progress */}
        {isActing && (
          <View style={styles.actingRow}>
            <ActivityIndicator size="small" color="#39FF14" />
            <Text style={styles.actingText}>Processing...</Text>
          </View>
        )}

        {/* Inline Accept / Decline buttons */}
        {showActions && (
          <View style={styles.actionRow}>
            {actions.accept && onAccept && (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAccept({ matchId, requestId, playerId, teamId });
                }}
              >
                <IconSymbol name="checkmark.circle.fill" size={14} color="#0A0A0A" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            )}
            {actions.decline && onDecline && (
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onDecline({ matchId, requestId, playerId, teamId });
                }}
              >
                <IconSymbol name="xmark.circle.fill" size={14} color="#FF4444" />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={onPress}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.notifFooter}>
          <Text style={styles.notifTime}>
            {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {!showActions && hasNavigation && (
            <Text style={styles.tapToView}>Tap to view →</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });
  const markAllMutation = trpc.notification.markAllRead.useMutation({ onSuccess: () => refetch() });
  const markOneMutation = trpc.notification.markRead.useMutation({ onSuccess: () => refetch() });
  const deleteExpiredMutation = trpc.notification.deleteExpired.useMutation();

  // Auto-delete expired notifications (>30 days) when page opens
  useEffect(() => {
    if (isAuthenticated) {
      deleteExpiredMutation.mutate();
    }
  }, [isAuthenticated]);

  // ── Accept mutations ──
  const acceptInvitationMutation = trpc.match.acceptInvitation.useMutation({
    onSuccess: (data) => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      utils.match.myMatches.invalidate();
      utils.match.upcoming.invalidate();
      if (data.matchId) router.push(`/match/${data.matchId}` as any);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const acceptRequestMutation = trpc.match.acceptRequest.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      utils.match.myMatches.invalidate();
      utils.match.publicFeed.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const approveJoinMutation = trpc.match.approveJoin.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const approveTeamJoinMutation = trpc.team.approveTeamJoin.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const declineTeamJoinMutation = trpc.team.declineTeamJoin.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  // ── Decline mutations ──
  const declineInvitationMutation = trpc.match.declineInvitation.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const declineRequestMutation = trpc.match.declineRequest.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const declineJoinMutation = trpc.match.declineJoin.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  // Track which notification is currently being acted upon
  const [actingNotifId, setActingNotifId] = useState<number | null>(null);

  // Sound player for notification (hooks must be called unconditionally)
  const soundPlayer = useAudioPlayer(Platform.OS !== "web" ? require("@/assets/sounds/notification.mp3") : null);

  // Track previous unread count to trigger haptic + sound when new notification arrives
  const prevUnreadCount = useRef(0);
  useEffect(() => {
    if (!notifications) return;
    const unread = notifications.filter((n: any) => !n.isRead).length;
    if (unread > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try { soundPlayer?.play(); } catch (_) {}
      }
    }
    prevUnreadCount.current = unread;
  }, [notifications]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to see notifications</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleNotifPress = (item: any) => {
    if (!item.isRead) markOneMutation.mutate({ id: item.id });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateFromNotif(router, item);
  };

   const handleAccept = (notif: any, data: { matchId?: number; requestId?: number; playerId?: number; teamId?: number }) => {
    setActingNotifId(notif.id);
    const done = () => setActingNotifId(null);
    if (notif.type === "match_invite" && data.matchId) {
      acceptInvitationMutation.mutate({ matchId: data.matchId }, { onSettled: done });
    } else if (notif.type === "play_request" && data.requestId && data.matchId) {
      acceptRequestMutation.mutate({ requestId: data.requestId, matchId: data.matchId }, { onSettled: done });
    } else if (notif.type === "join_request" && data.matchId && data.playerId) {
      approveJoinMutation.mutate({ matchId: data.matchId, playerId: data.playerId }, { onSettled: done });
    } else if (notif.type === "team_join_request" && data.playerId && data.teamId) {
      approveTeamJoinMutation.mutate({ playerId: data.playerId, teamId: data.teamId }, { onSettled: done });
    } else {
      done();
    }
  };
  const handleDecline = (notif: any, data: { matchId?: number; requestId?: number; playerId?: number; teamId?: number }) => {
    setActingNotifId(notif.id);
    const done = () => setActingNotifId(null);
    if (notif.type === "match_invite" && data.matchId) {
      declineInvitationMutation.mutate({ matchId: data.matchId }, { onSettled: done });
    } else if (notif.type === "play_request" && data.requestId) {
      declineRequestMutation.mutate({ requestId: data.requestId }, { onSettled: done });
    } else if (notif.type === "join_request" && data.matchId && data.playerId) {
      declineJoinMutation.mutate({ matchId: data.matchId, playerId: data.playerId }, { onSettled: done });
    } else if (notif.type === "team_join_request" && data.playerId && data.teamId) {
      declineTeamJoinMutation.mutate({ playerId: data.playerId, teamId: data.teamId }, { onSettled: done });
    } else {
      done();
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {notifications && notifications.length > 0 && (
          <TouchableOpacity onPress={() => markAllMutation.mutate()}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      ) : !notifications || notifications.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="bell.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <NotifCard
              item={item}
              onPress={() => handleNotifPress(item)}
              onAccept={(data) => handleAccept(item, data)}
              onDecline={(data) => handleDecline(item, data)}
              isActing={actingNotifId === item.id}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", flex: 1 },
  markAllText: { color: "#39FF14", fontSize: 13, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { color: "#8A8A8A", fontSize: 16 },
  notifCard: {
    flexDirection: "row", backgroundColor: "#1A1A1A", borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#2A2A2A", gap: 12, alignItems: "flex-start",
  },
  notifUnread: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.04)" },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#0A0E27",
    justifyContent: "center", alignItems: "center", borderWidth: 1.5, flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#39FF14", flexShrink: 0 },
  notifTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", flex: 1 },
  notifBody: { color: "#8A8A8A", fontSize: 13, lineHeight: 18 },
  notifFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  notifTime: { color: "#555", fontSize: 11 },
  tapToView: { color: "#39FF14", fontSize: 11, fontWeight: "600" },
  // Loading state
  actingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingVertical: 6 },
  actingText: { color: "#39FF14", fontSize: 13, fontWeight: "600" },
  // Inline action buttons
  actionRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#39FF14", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, flex: 1, justifyContent: "center",
  },
  acceptBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 12 },
  declineBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,68,68,0.12)", borderWidth: 1, borderColor: "#FF4444",
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, flex: 1, justifyContent: "center",
  },
  declineBtnText: { color: "#FF4444", fontWeight: "800", fontSize: 12 },
  viewBtn: {
    borderWidth: 1, borderColor: "#2A2A2A", paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  viewBtnText: { color: "#8A8A8A", fontWeight: "600", fontSize: 12 },
});
