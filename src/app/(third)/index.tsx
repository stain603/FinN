import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from "@/contexts/LanguageContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import * as storageService from "@/services/storageService";
import ConfirmDialog from "@/components/base/confirm-dialog";
import { formatCurrency } from "@/services/financialMetrics";

export default function PerfilVirtual() {
  const { language, setLanguage, t } = useLanguage();
  const { clients, charges, loans, payments, isLoading, setClients, setCharges, setLoans, setPayments, metrics } = useApp();
  const { userName, updatePin, updateName, logout } = useAuth();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  // Change PIN state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // Change Name state
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [newName, setNewName] = useState(userName);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const handleBackup = async () => {
    try {
      const backupData = {
        clients,
        charges,
        loans,
        payments,
        exportedAt: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      await Clipboard.setString(jsonString);
      setDialogConfig({
        title: t('success'),
        message: t('backupSuccess'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } catch (error) {
      setDialogConfig({
        title: t('error'),
        message: t('backupError'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    }
  };

  const handleRestore = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (!clipboardContent) {
        setDialogConfig({
          title: t('error'),
          message: t('restoreEmpty'),
          onConfirm: () => setDialogVisible(false),
        });
        setDialogVisible(true);
        return;
      }

      const data = JSON.parse(clipboardContent);
      
      if (!data.clients || !data.charges || !data.loans || !data.payments) {
        setDialogConfig({
          title: t('error'),
          message: t('restoreInvalid'),
          onConfirm: () => setDialogVisible(false),
        });
        setDialogVisible(true);
        return;
      }

      setDialogConfig({
        title: t('confirmRestore'),
        message: t('restoreWarning'),
        onConfirm: async () => {
          try {
            await AsyncStorage.setItem('@finbolso_clients', JSON.stringify(data.clients));
            await AsyncStorage.setItem('@finbolso_charges', JSON.stringify(data.charges));
            await AsyncStorage.setItem('@finbolso_loans', JSON.stringify(data.loans));
            await AsyncStorage.setItem('@finbolso_payments', JSON.stringify(data.payments));
            
            setClients(data.clients);
            setCharges(data.charges);
            setLoans(data.loans);
            setPayments(data.payments);
            
            setDialogConfig({
              title: t('success'),
              message: t('restoreSuccess'),
              onConfirm: () => setDialogVisible(false),
            });
            setDialogVisible(true);
          } catch (error) {
            setDialogConfig({
              title: t('error'),
              message: t('restoreError'),
              onConfirm: () => setDialogVisible(false),
            });
            setDialogVisible(true);
          }
        },
        destructive: true,
      });
      setDialogVisible(true);
    } catch (error) {
      setDialogConfig({
        title: t('error'),
        message: t('restoreInvalid'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    }
  };

  const languages = [
    { code: 'portuguese' as const, name: 'Português', flag: '🇧🇷' },
    { code: 'english' as const, name: 'English', flag: '🇺🇸' },
    { code: 'spanish' as const, name: 'Español', flag: '🇪🇸' },
  ];

  const handleLanguageChange = (langCode: 'portuguese' | 'english' | 'spanish') => {
    setLanguage(langCode);
  };

  const handleClearData = async () => {
    setDialogConfig({
      title: t('clearData'),
      message: t('clearDataConfirm'),
      onConfirm: async () => {
        try {
          await storageService.clearAllData();
          setClients([]);
          setCharges([]);
          setLoans([]);
          setPayments([]);
          setDialogConfig({
            title: t('success'),
            message: t('dataCleared'),
            onConfirm: () => setDialogVisible(false),
          });
          setDialogVisible(true);
        } catch (error) {
          setDialogConfig({
            title: t('error'),
            message: t('clearDataError'),
            onConfirm: () => setDialogVisible(false),
          });
          setDialogVisible(true);
        }
      },
      destructive: true,
    });
    setDialogVisible(true);
  };

  const handleChangePin = async () => {
    if (currentPin.length !== 4 || !/^\d+$/.test(currentPin)) {
      setDialogConfig({
        title: t('error'),
        message: t('pinInvalid'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setDialogConfig({
        title: t('error'),
        message: t('pinInvalid'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    if (newPin !== confirmNewPin) {
      setDialogConfig({
        title: t('error'),
        message: t('pinMismatch'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    try {
      await updatePin(currentPin, newPin);
      setShowChangePinModal(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
      setDialogConfig({
        title: t('success'),
        message: t('pinUpdated'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } catch (error: any) {
      setDialogConfig({
        title: t('error'),
        message: error.message || t('error'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      setDialogConfig({
        title: t('error'),
        message: t('nameError'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    try {
      await updateName(newName.trim());
      setShowChangeNameModal(false);
      setDialogConfig({
        title: t('success'),
        message: t('nameChanged'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } catch (error: any) {
      setDialogConfig({
        title: t('error'),
        message: error.message || t('error'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    }
  };

  const handleLogout = () => {
    setDialogConfig({
      title: t('logout'),
      message: t('logoutConfirm'),
      onConfirm: async () => {
        await logout();
        // The AuthContext will handle the redirect
      },
      destructive: true,
    });
    setDialogVisible(true);
  };

  const stats = [
    { label: t('totalLoans'), value: formatCurrency(metrics.capitalInvestido), icon: 'cash', color: '#F59E0B' },
    { label: t('totalPortfolio'), value: formatCurrency(metrics.carteiraTotal), icon: 'wallet', color: '#3B82F6' },
    { label: t('valorTransito'), value: formatCurrency(metrics.valorEmTransito), icon: 'swap-horizontal', color: '#10B981' },
    { label: t('expectedProfit'), value: formatCurrency(metrics.lucroEsperado), icon: 'trending-up', color: '#8B5CF6' },
  ];

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#040814" />
        </View>
        <Text style={styles.userName}>{userName || t('user')}</Text>
        <Text style={styles.userEmail}>{t('email')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('statistics')}</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                language === lang.code && styles.languageOptionActive,
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={[
                styles.languageName,
                language === lang.code && styles.languageNameActive,
              ]}>
                {lang.name}
              </Text>
              {language === lang.code && (
                <Ionicons name="checkmark" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile')}</Text>
        
        <TouchableOpacity 
          style={styles.settingOption}
          onPress={() => setShowChangeNameModal(true)}
        >
          <Ionicons name="person-outline" size={24} color="#3B82F6" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{t('changeName')}</Text>
            <Text style={styles.settingValue}>{userName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingOption}
          onPress={() => setShowChangePinModal(true)}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#3B82F6" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{t('changePin')}</Text>
            <Text style={styles.settingValue}>••••</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingOption, styles.logoutOption]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
        <Ionicons name="trash" size={20} color="#EF4444" />
        <Text style={styles.dangerButtonText}>{t('clearAllData')}</Text>
      </TouchableOpacity>

      <View style={styles.backupRestoreSection}>
        <TouchableOpacity style={styles.backupButton} onPress={handleBackup}>
          <Ionicons name="cloud-upload-outline" size={20} color="#3B82F6" />
          <Text style={styles.backupButtonText}>{t('backupData')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Ionicons name="cloud-download-outline" size={20} color="#10B981" />
          <Text style={styles.restoreButtonText}>{t('restoreData')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>{t('systemVersion')} v1.0.0</Text>
    </ScrollView>

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

    {/* Change PIN Modal */}
    <Modal
      visible={showChangePinModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowChangePinModal(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{t('changePin')}</Text>
          
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{t('enterCurrentPin')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••"
              placeholderTextColor="#6B7280"
              value={currentPin}
              onChangeText={setCurrentPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>
          
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{t('enterNewPin')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••"
              placeholderTextColor="#6B7280"
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>
          
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{t('enterConfirmNewPin')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••"
              placeholderTextColor="#6B7280"
              value={confirmNewPin}
              onChangeText={setConfirmNewPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowChangePinModal(false);
                setCurrentPin("");
                setNewPin("");
                setConfirmNewPin("");
              }}
            >
              <Text style={styles.modalCancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={handleChangePin}
            >
              <Text style={styles.modalConfirmButtonText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Change Name Modal */}
    <Modal
      visible={showChangeNameModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowChangeNameModal(false);
        setNewName(userName);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{t('changeName')}</Text>
          
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{t('enterNewName')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={userName}
              placeholderTextColor="#6B7280"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowChangeNameModal(false);
                setNewName(userName);
              }}
            >
              <Text style={styles.modalCancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={handleChangeName}
            >
              <Text style={styles.modalConfirmButtonText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  languageList: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  languageFlag: {
    fontSize: 28,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  languageNameActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  backupRestoreSection: {
    flexDirection: 'row',
    gap: 12,
    margin: 20,
  },
  backupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  backupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  restoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 20,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutOption: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0B1329',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  modalInput: {
    backgroundColor: '#040814',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    fontSize: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
