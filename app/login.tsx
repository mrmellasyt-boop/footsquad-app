import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <IconSymbol name="sportscourt.fill" size={64} color="#39FF14" />
          </View>
          <Text style={styles.title}>FOOTSQUAD</Text>
          <Text style={styles.subtitle}>Play. Compete. Rise.</Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#39FF14" />
              <Text style={styles.featureText}>Build your player reputation</Text>
            </View>
            <View style={styles.featureRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#39FF14" />
              <Text style={styles.featureText}>Create and join teams</Text>
            </View>
            <View style={styles.featureRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#39FF14" />
              <Text style={styles.featureText}>Organize matches in your city</Text>
            </View>
            <View style={styles.featureRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#39FF14" />
              <Text style={styles.featureText}>Climb the leaderboard</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={() => startOAuthLogin()}>
            <Text style={styles.loginBtnText}>Sign In to Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  logoWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#39FF14", marginBottom: 24 },
  title: { fontSize: 36, fontWeight: "900", color: "#39FF14", letterSpacing: 4 },
  subtitle: { fontSize: 16, color: "#8A8A8A", marginTop: 4, marginBottom: 40 },
  features: { alignSelf: "stretch", gap: 16, marginBottom: 40 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  loginBtn: { backgroundColor: "#39FF14", paddingHorizontal: 40, paddingVertical: 16, borderRadius: 24, width: "100%", alignItems: "center" },
  loginBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 17 },
});
