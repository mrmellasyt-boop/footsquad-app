import { useState } from "react";
import { FlatList, Text, View, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { useT } from "@/lib/i18n/LanguageContext";

export default function DirectMessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = Number(id);
  const router = useRouter();
  const t = useT();
  const [message, setMessage] = useState("");

  const { data: partner } = trpc.player.getById.useQuery({ id: partnerId });
  const { data: myPlayer } = trpc.player.me.useQuery();
  const { data: messages, isLoading, refetch } = trpc.chat.directMessages.useQuery({ partnerId });
  const sendMutation = trpc.chat.sendDirect.useMutation({
    onSuccess: () => { setMessage(""); refetch(); },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ recipientId: partnerId, content: message.trim() });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          {partner?.photoUrl ? (
            <Image source={{ uri: partner.photoUrl }} style={styles.headerAvatarImg} contentFit="cover" />
          ) : (
            <IconSymbol name="person.fill" size={16} color="#8A8A8A" />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{partner?.fullName ?? "..."}</Text>
          <Text style={styles.headerMeta}>{partner?.position} • {partner?.city}</Text>
        </View>
      </View>

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
            contentContainerStyle={{ padding: 16, gap: 6 }}
            renderItem={({ item }) => {
              const isMe = item.senderId === myPlayer?.id;
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  <View style={[styles.msgBubble, isMe && styles.msgBubbleMe]}>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  headerInfo: { flex: 1 },
  headerName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  headerMeta: { color: "#8A8A8A", fontSize: 12 },
  chatContainer: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  msgRow: { flexDirection: "row", marginBottom: 2 },
  msgRowMe: { flexDirection: "row-reverse" },
  msgBubble: { backgroundColor: "#1A1A1A", borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, maxWidth: "75%" },
  msgBubbleMe: { backgroundColor: "#39FF14", borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  msgText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: "#0A0A0A" },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#2A2A2A", gap: 8 },
  input: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: "#FFFFFF", fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#39FF14", justifyContent: "center", alignItems: "center" },
});
