import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function triggerSuccessFeedback(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics may be unavailable on some devices
  }
}

export async function triggerLightFeedback(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
}
