import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery(undefined, { enabled: isAuthenticated });
  const markAllMutation = trpc.notification.markAllRead.useMutation({ onSuccess: () => refetch() });
  const markOneMutation = trpc.notification.markRead.useMutation({ onSuccess: () => refetch() });

  if (!isAuthenticated) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to see notifications</Text>
        </View>
      </ScreenContainer>
    );
  }

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
            <TouchableOpacity
              style={[styles.notifCard, !item.isRead && styles.notifUnread]}
              activeOpacity={0.7}
              onPress={() => {
                if (!item.isRead) markOneMutation.mutate({ id: item.id });
              }}
            >
              <View style={styles.notifDot}>
                {!item.isRead && <View style={styles.dot} />}
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.message}</Text>
                <Text style={styles.notifTime}>
                  {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </TouchableOpacity>
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
    flexDirection: "row", backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#2A2A2A",
  },
  notifUnread: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.05)" },
  notifDot: { width: 20, justifyContent: "flex-start", alignItems: "center", paddingTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#39FF14" },
  notifContent: { flex: 1 },
  notifTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  notifBody: { color: "#8A8A8A", fontSize: 13, marginTop: 4, lineHeight: 18 },
  notifTime: { color: "#555", fontSize: 11, marginTop: 6 },
});
