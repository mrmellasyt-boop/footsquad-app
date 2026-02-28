import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useT } from "@/lib/i18n/LanguageContext";

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError(t.auth.emailPasswordRequired);
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError(t.auth.nameRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    setLoading(true);
    try {
      let result: { sessionToken: string; user: any };
      if (mode === "signup") {
        result = await Api.signup(email.trim(), password, name.trim());
      } else {
        result = await Api.login(email.trim(), password);
      }

      if (result.sessionToken) {
        await Auth.setSessionToken(result.sessionToken);
      }
      if (result.user) {
        await Auth.setUserInfo({
          id: result.user.id,
          openId: result.user.openId,
          name: result.user.name,
          email: result.user.email,
          loginMethod: result.user.loginMethod,
          lastSignedIn: new Date(result.user.lastSignedIn),
        });
      }

      if (Platform.OS === "web" && result.sessionToken) {
        await Api.establishSession(result.sessionToken);
      }

      router.replace("/(tabs)/profile");
    } catch (err: any) {
      setError(err.message || t.auth.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.logoWrap}>
              <IconSymbol name="sportscourt.fill" size={64} color="#39FF14" />
            </View>
            <Text style={styles.title}>FOOTSQUAD</Text>
            <Text style={styles.subtitle}>
              {mode === "login" ? t.auth.welcomeBack : t.auth.createAccount}
            </Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
                onPress={() => { setMode("login"); setError(""); }}
              >
                <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>{t.auth.login}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
                onPress={() => { setMode("signup"); setError(""); }}
              >
                <Text style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}>{t.auth.signUp}</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {mode === "signup" && (
                <TextInput
                  style={styles.input}
                  placeholder={t.profile.fullName}
                  placeholderTextColor="#555"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder={t.auth.email}
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder={t.auth.password}
                placeholderTextColor="#555"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === "login" ? t.auth.login : t.auth.createAccountBtn}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", marginLeft: 20, marginTop: 8,
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logoWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#1A1A1A",
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#39FF14", marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: "900", color: "#39FF14", letterSpacing: 4 },
  subtitle: { fontSize: 15, color: "#8A8A8A", marginTop: 4, marginBottom: 24 },
  toggleRow: {
    flexDirection: "row", backgroundColor: "#1A1A1A", borderRadius: 12,
    padding: 4, marginBottom: 24, width: "100%", maxWidth: 320,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#39FF14" },
  toggleText: { color: "#8A8A8A", fontWeight: "700", fontSize: 15 },
  toggleTextActive: { color: "#0A0A0A" },
  form: { width: "100%", maxWidth: 320, gap: 12 },
  input: {
    backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#2A2A2A",
  },
  errorText: { color: "#FF4444", fontSize: 13, textAlign: "center" },
  submitBtn: {
    backgroundColor: "#39FF14", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 17 },
});
