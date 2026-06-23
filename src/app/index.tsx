import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import StaggeredText from "../components/organisms/animated-text";
import ConfirmDialog from "@/components/base/confirm-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { mapAuthError } from "@/utils/authErrors";

type AuthMode = "login" | "signup";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, login, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/(first)");
    }
  }, [isAuthenticated, isLoading, router]);

  const showError = (message: string) => {
    setDialogConfig({
      title: t("error"),
      message,
      onConfirm: () => setDialogVisible(false),
    });
    setDialogVisible(true);
  };

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSignUp = async () => {
    if (!nome.trim()) {
      showError(t("userNameRequired"));
      return;
    }

    if (!validateEmail(email)) {
      showError(t("invalidEmail"));
      return;
    }

    if (password.length < 6) {
      showError(t("passwordMinLength"));
      return;
    }

    if (password !== confirmPassword) {
      showError(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp(nome.trim(), email.trim(), password);

      if (result === 'email_confirmation_required') {
        showError(t("confirmEmailMessage"));
        setMode("login");
        return;
      }
    } catch (error: any) {
      showError(error?.message || mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      showError(t("invalidEmail"));
      return;
    }

    if (!password) {
      showError(t("passwordRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      showError(error?.message || mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setPassword("");
    setConfirmPassword("");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blurAmbient, styles.posTop]} />
      <View style={[styles.blurAmbient, styles.posBottom]} />

      <View style={styles.cardContainer}>
        <View style={styles.premiumCard}>
          {mode === "signup" ? (
            <>
              <Text style={styles.title}>{t("signupTitle")}</Text>
              <Text style={styles.description}>{t("loginDescription")}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.tagLabel}>{t("userNameLabel")}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t("userNamePlaceholder")}
                  placeholderTextColor="#4B5563"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              </View>
            </>
          ) : (
            <>
              <StaggeredText text={t("welcomeBack")} style={styles.title} />
              <Text style={styles.description}>{t("loginSubtitle")}</Text>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.tagLabel}>{t("emailLabel")}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t("emailPlaceholder")}
              placeholderTextColor="#4B5563"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.tagLabel}>{t("passwordLabel")}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.textInput, styles.passwordInput]}
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor="#4B5563"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "password"}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword((current) => !current)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? t("hidePin") : t("showPin")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {mode === "signup" && (
            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>{t("confirmPasswordLabel")}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("confirmPasswordPlaceholder")}
                placeholderTextColor="#4B5563"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={mode === "signup" ? handleSignUp : handleLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting
                ? mode === "signup"
                  ? t("creatingAccount")
                  : t("signingIn")
                : mode === "signup"
                  ? t("registerButton")
                  : t("signInButton")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={toggleMode} disabled={isSubmitting}>
            <Text style={styles.resetText}>
              {mode === "signup" ? t("alreadyHaveAccount") : t("dontHaveAccount")}
            </Text>
          </TouchableOpacity>

          <Text style={styles.legalWarning}>
            Esta plataforma é destinada exclusivamente ao gerenciamento e organização de informações financeiras. O sistema não realiza empréstimos, não processa pagamentos e não participa de transações entre usuários e terceiros. O usuário é integralmente responsável pelo uso da plataforma e pelo cumprimento das leis aplicáveis.
          </Text>
        </View>
      </View>

      <ConfirmDialog
        visible={dialogVisible}
        title={dialogConfig?.title || ""}
        message={dialogConfig?.message || ""}
        onConfirm={() => {
          dialogConfig?.onConfirm();
          setDialogVisible(false);
        }}
        onCancel={() => setDialogVisible(false)}
        destructive={dialogConfig?.destructive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040814",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  blurAmbient: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#2563EB",
    opacity: 0.05,
  },
  posTop: {
    top: -70,
    right: -70,
  },
  posBottom: {
    bottom: -70,
    left: -70,
  },
  cardContainer: {
    zIndex: 5,
  },
  premiumCard: {
    backgroundColor: "#0B1329",
    padding: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 26,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  tagLabel: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: "#040814",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    fontSize: 15,
  },
  passwordRow: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 72,
  },
  showPasswordButton: {
    position: "absolute",
    right: 12,
    top: 16,
  },
  showPasswordText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    marginTop: 18,
    alignItems: "center",
  },
  resetText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalWarning: {
    marginTop: 24,
    paddingHorizontal: 20,
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 14,
  },
});
