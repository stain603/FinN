import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import OtpInput from "../components/base/otp-input";
import StaggeredText from "../components/organisms/animated-text";
import ConfirmDialog from "@/components/base/confirm-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading, login, createUser, switchAccount } = useAuth();
  
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinInputKey, setPinInputKey] = useState(0);
  const [confirmPinInputKey, setConfirmPinInputKey] = useState(0);
  
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(first)");
    }
  }, [isAuthenticated]);

  const handlePinChange = (value: string) => {
    setPin(value);
    if (error) {
      setError(false);
    }
  };

  const handleConfirmPinChange = (value: string) => {
    setConfirmPin(value);
    if (error) {
      setError(false);
    }
  };

  const resetPinInput = () => {
    setPin("");
    setError(false);
    setPinInputKey((key) => key + 1);
  };

  const handleFinalizarCadastro = async () => {
    // Validation
    if (!nome.trim()) {
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: t('userNameRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: t('pinInvalid'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    if (pin !== confirmPin) {
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: t('pinMismatch'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(nome.trim(), pin);
      router.replace("/(first)");
    } catch (error: any) {
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: error.message || t('error'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcessoDiretoPin = async () => {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: t('pinInvalid'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(pin);
      if (success) {
        router.replace("/(first)");
      } else {
        resetPinInput();
        setError(true);
      }
    } catch (error: any) {
      resetPinInput();
      setError(true);
      setDialogConfig({
        title: t('error'),
        message: error.message || t('error'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSubmitting(true);
      await switchAccount();
      setNome("");
      setPin("");
      setConfirmPin("");
      setError(false);
      setPinInputKey((key) => key + 1);
      setConfirmPinInputKey((key) => key + 1);
    } catch {
      setDialogConfig({
        title: t('error'),
        message: t('error'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Luzes dinâmicas de fundo */}
      <View style={[styles.blurAmbient, styles.posTop]} />
      <View style={[styles.blurAmbient, styles.posBottom]} />

      <View style={styles.cardContainer}>
        
        {/* MODO 1: CADASTRO INICIAL */}
        {!user ? (
          <View style={styles.premiumCard}>
            <Text style={styles.title}>{t('loginTitle')}</Text>
            <Text style={styles.description}>{t('loginDescription')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>{t('userNameLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('userNamePlaceholder')}
                placeholderTextColor="#4B5563"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>{t('createPinLabel')}</Text>
              <View style={styles.otpWrapper}>
                <OtpInput
                  key={`register-pin-${pinInputKey}`}
                  otpCount={4}
                  onInputChange={handlePinChange}
                  error={error}
                  errorMessage={t('pinInvalid')}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>{t('confirmPinLabel')}</Text>
              <View style={styles.otpWrapper}>
                <OtpInput
                  key={`register-confirm-${confirmPinInputKey}`}
                  otpCount={4}
                  onInputChange={handleConfirmPinChange}
                  error={error}
                  errorMessage={t('pinMismatch')}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleFinalizarCadastro}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? t('creatingAccount') : t('registerButton')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          
          /* MODO 2: USUÁRIO JÁ CADASTRADO */
          <View style={styles.premiumCard}>
            <StaggeredText text={t('welcomeBack')} style={styles.title} />
            <Text style={styles.description}>{t('welcomeMessage', { name: user.nome || t('user') })}</Text>

            <View style={styles.inputGroupCenter}>
              <Text style={styles.tagLabelCenter}>{t('enterSecurityPin')}</Text>
              <View style={styles.otpWrapper}>
                <OtpInput
                  key={`login-pin-${pinInputKey}`}
                  otpCount={4}
                  onInputChange={handlePinChange}
                  error={error}
                  errorMessage={t('pinIncorrect')}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleAcessoDiretoPin}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? t('validatingPin') : t('confirmPinButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleSwitchAccount}
              disabled={isSubmitting}
            >
              <Text style={styles.resetText}>{t('switchAccount')}</Text>
            </TouchableOpacity>

            <Text style={styles.legalWarning}>
              Esta plataforma é destinada exclusivamente ao gerenciamento e organização de informações financeiras. O sistema não realiza empréstimos, não processa pagamentos e não participa de transações entre usuários e terceiros. O usuário é integralmente responsável pelo uso da plataforma e pelo cumprimento das leis aplicáveis.
            </Text>
          </View>
        )}

      </View>

      <ConfirmDialog
        visible={dialogVisible}
        title={dialogConfig?.title || ''}
        message={dialogConfig?.message || ''}
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
    backgroundColor: "#040814", // Fundo profundo vivo
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
  inputGroupCenter: {
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
  },
  tagLabel: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  tagLabelCenter: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 16,
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
  otpWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
});