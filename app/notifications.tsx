import { useEffect, useRef } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

// Map notification types to icons and navigation targets
function getNotifIcon(type: string): string {
  switch (type) {
    case "match_invite": return "envelope.fill";
    case "match_accepted": return "checkmark.circle.fill";
    case "match_declined": return "xmark.circle.fill";
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
    default: return "bell.fill";
  }
}

function getNotifColor(type: string): string {
  switch (type) {
    case "match_accepted":
    case "join_approved":
    case "play_accepted":
    case "score_confirmed":
      return "#39FF14";
    case "match_declined":
    case "join_declined":
    case "play_declined":
    case "score_null":
    case "xmark.circle.fill":
      return "#FF4444";
    case "score_conflict":
      return "#FFD700";
    case "motm_winner":
      return "#FFD700";
    case "highlight_like":
      return "#FF6B6B";
    default:
      return "#39FF14";
  }
}

function navigateFromNotif(router: ReturnType<typeof useRouter>, notif: any) {
  try {
    const data = notif.data ? JSON.parse(notif.data) : {};
    const type = notif.type as string;

    // Match-related notifications
    if (["match_invite", "match_accepted", "match_declined", "join_request", "join_approved",
         "join_declined", "play_request", "play_accepted", "play_declined",
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

    // Follow-related
    if (type === "follow" && data.followerId) {
      router.push(`/player/${data.followerId}` as any);
      return;
    }
  } catch {
    // No navigation if data is malformed
  }
}

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000, // Poll every 15s for new notifications
  });
  const markAllMutation = trpc.notification.markAllRead.useMutation({ onSuccess: () => refetch() });
  const markOneMutation = trpc.notification.markRead.useMutation({ onSuccess: () => refetch() });

  // Track previous unread count to trigger haptic when new notification arrives
  const prevUnreadCount = useRef(0);
  useEffect(() => {
    if (!notifications) return;
    const unread = notifications.filter((n: any) => !n.isRead).length;
    if (unread > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    if (!item.isRead) {
      markOneMutation.mutate({ id: item.id });
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigateFromNotif(router, item);
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
          renderItem={({ item }) => {
            const iconName = getNotifIcon(item.type) as any;
            const iconColor = getNotifColor(item.type);
            const hasNavigation = (() => {
              try {
                const data = item.data ? JSON.parse(item.data) : {};
                return !!(data.matchId || data.highlightId || data.followerId);
              } catch { return false; }
            })();

            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.isRead && styles.notifUnread]}
                activeOpacity={0.7}
                onPress={() => handleNotifPress(item)}
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
                  <View style={styles.notifFooter}>
                    <Text style={styles.notifTime}>
                      {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {hasNavigation && (
                      <Text style={styles.tapToView}>Tap to view →</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
});
