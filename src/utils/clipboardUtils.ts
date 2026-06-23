import { Clipboard } from 'react-native';

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    await Clipboard.setString(text.trim());
    return true;
  } catch {
    return false;
  }
}
