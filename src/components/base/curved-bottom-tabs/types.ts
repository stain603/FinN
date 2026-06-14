import type { ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";

export interface Tab {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface FloatingButtonComponentProps {
  icon: React.ReactNode;
  gradient: [string, string];
  scale: number;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  badge?: number;
}

export interface BackgroundCurveProps {
  position: SharedValue<number>;
  gradient: [string, string];
  height: number;
}

export interface StyleConfig {
  barHeight: number;
  textSize: number;
  fontFamily?: string;
  inactiveColor: string;
  labelColor: string;
}

export interface AnimationConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export interface CurvedBottomTabsProps {
  tabs: Tab[];
  currentIndex: number;
  onPress: (index: number, tab: Tab) => void;
  gradient: [string, string] | string[];
  barHeight?: number;
  buttonScale?: number;
  activeColor?: string;
  inactiveColor?: string;
  labelColor?: string;
  textSize?: number;
  fontFamily?: string;
  hideWhenKeyboardShown?: boolean;
  animation?: AnimationConfig;
  shadow?: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface CurvedTabBarNavigationProps {
  gradients?: [string, string] | string[];
}
