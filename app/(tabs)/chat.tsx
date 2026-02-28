import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { useT } from "@/lib/i18n/LanguageContext";

type Tab = "team" | "direct";

function TeamChatView() {
  const [message, setMessage] = useState("");
  const { data: messages, isLoading, refetch } = trpc.chat.teamMessages.useQuery();
  const { data: player } = trpc.player.me.useQuery();
  const sendMutation = trpc.chat.sendTeam.useMutation({ onSuccess: () => { setMessage(""); refetch(); } });

  if (!player?.teamId) {
    return (
      <View style={styles.center}>
        <IconSymbol name="person.2.fill" size={48} color="#2A2A2A" />
        <Text style={styles.emptyText}>Join a team to access team chat</Text>
      </View>
    );
  }

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>
      ) : (
        <FlatList
          data={[...(messages ?? [])].reverse()}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isMe = item.senderId === player?.id;
            return (
              <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && (
                  <View style={styles.msgAvatar}>
                    {item.sender?.photoUrl ? (
                      <Image source={{ uri: item.sender.photoUrl }} style={styles.msgAvatarImg} contentFit="cover" />
                    ) : (
                      <IconSymbol name="person.fill" size={14} color="#8A8A8A" />
                    )}
                  </View>
                )}
                <View style={[styles.msgBubble, isMe && styles.msgBubbleMe]}>
                  {!isMe && <Text style={styles.msgSender}>{item.sender?.fullName ?? "Unknown"}</Text>}
                  <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#555"
          value={message}
          onChangeText={setMessage}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <IconSymbol name="paperplane.fill" size={20} color="#0A0A0A" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function DirectMessagesView() {
  const { data: conversations, isLoading } = trpc.chat.conversations.useQuery();
  const router = useRouter();
  const t = useT();

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#39FF14" /></View>;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <View style={styles.center}>
        <IconSymbol name="bubble.left.fill" size={48} color="#2A2A2A" />
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>Message a player from their profile</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.convRow}
          activeOpacity={0.7}
          onPress={() => router.push(`/dm/${item.id}` as any)}
        >
          <View style={styles.convAvatar}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.convAvatarImg} contentFit="cover" />
            ) : (
              <IconSymbol name="person.fill" size={22} color="#8A8A8A" />
            )}
          </View>
          <View style={styles.convInfo}>
            <Text style={styles.convName}>{item.fullName}</Text>
            <Text style={styles.convMeta}>{item.position} • {item.city}</Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#8A8A8A" />
        </TouchableOpacity>
      )}
    />
  );
}

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("team");
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <IconSymbol name="bubble.left.fill" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>Sign in to chat</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/login" as any)}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "team" && styles.tabActive]}
          onPress={() => setActiveTab("team")}
        >
          <Text style={[styles.tabText, activeTab === "team" && styles.tabTextActive]}>Team Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "direct" && styles.tabActive]}
          onPress={() => setActiveTab("direct")}
        >
          <Text style={[styles.tabText, activeTab === "direct" && styles.tabTextActive]}>Messages</Text>
        </TouchableOpacity>
      </View>
      {activeTab === "team" ? <TeamChatView /> : <DirectMessagesView />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#39FF14" },
  tabText: { color: "#8A8A8A", fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: "#0A0A0A" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: "#8A8A8A", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#555", fontSize: 13 },
  loginBtn: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loginBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  chatContainer: { flex: 1 },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  msgRowMe: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 8,
  },
  msgAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  msgBubble: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: "75%",
  },
  msgBubbleMe: {
    backgroundColor: "#39FF14",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  msgSender: {
    color: "#39FF14",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  msgText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: "#0A0A0A" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#39FF14",
    justifyContent: "center",
    alignItems: "center",
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  convAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  convInfo: { flex: 1 },
  convName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  convMeta: { color: "#8A8A8A", fontSize: 12, marginTop: 2 },
});
