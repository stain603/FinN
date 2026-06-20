import React, { memo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";

import Animated, {
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { TabBarProps } from "./types";

const TabButton: React.FC<TabBarProps> & React.FunctionComponent<TabBarProps> =
  memo(
    ({ onPress, onLongPress, isFocused, label, icon }) => {
      const scale = useSharedValue(1);
      const opacity = useSharedValue(0.6);

      React.useEffect(() => {
        scale.value = withSpring(isFocused ? 1.1 : 1, {});
        opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
      }, [isFocused]);

      const animatedStyle = useAnimatedStyle(() => {
        return {
          transform: [
            {
              scale: scale.value,
            },
          ],
          opacity: opacity.value,
        };
      });

      const handlePressIn = () => {
        scale.value = withSpring(0.85, {});
      };

      const handlePressOut = () => {
        scale.value = withSpring(isFocused ? 1.1 : 1, {});
      };

      // Safely render icon outside of Animated.View to avoid Reanimated UI thread issues
      const iconContent = React.useMemo(() => {
        if (!icon) return null;
        
        // Check if icon is a function
        if (typeof icon === 'function') {
          return icon({
            focused: isFocused,
            color: isFocused ? "#fff" : "#6b7280",
            size: 32,
          });
        }
        
        // If icon is not a function, render it as-is (fallback for incorrect usage)
        return icon;
      }, [icon, isFocused]);

      return (
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.tabButton}
          activeOpacity={1}
        >
          <Animated.View style={[styles.iconContainer, animatedStyle]}>
            {iconContent}
          </Animated.View>
        </TouchableOpacity>
      );
    },
  );

export const StackAwareTabBar: React.FC<BottomTabBarProps> &
  React.FunctionComponent<BottomTabBarProps> = memo(
  (props: BottomTabBarProps): React.ReactElement => {
    const { state, descriptors, navigation } = props;

    return (
      <View style={styles.container} pointerEvents="box-none">
        <View style={styles.tabBar}>
          {state.routes
            .filter((route) => route.name !== "index")
            .map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? String(options.tabBarLabel)
                : options.title !== undefined
                  ? options.title
                  : route.name;
            const isFocused = state.routes[state.index].name === route.name;

            const onPress = (): void => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              
              // Call the custom listener if it exists
              const customListener = (options as any).listeners?.tabPress;
              if (customListener) {
                customListener(event);
              }
              
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = (): void => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                isFocused={isFocused}
                label={label}
                icon={options.tabBarIcon}
              />
            );
          })}
        </View>
      </View>
    );
  },
);

export default memo(StackAwareTabBar);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 80 : 40,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#040814",
    borderRadius: 32,
    paddingVertical: 14,
    width: "80%", // Força a barra a ter uma largura fixa centralizada
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabButton: {
    flex: 1, // Divide o espaço da barra igualmente entre os botões visíveis
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
});