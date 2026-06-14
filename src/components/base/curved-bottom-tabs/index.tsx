import React, { memo, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";
import type {
  BackgroundCurveProps,
  CurvedBottomTabsProps,
  FloatingButtonComponentProps,
  StyleConfig,
  Tab,
  CurvedTabBarNavigationProps,
} from "./types";
import {
  calculateTabPosition,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from "./helper";

const FloatingButtonComponent: React.FC<FloatingButtonComponentProps> =
  memo<FloatingButtonComponentProps>(
    ({
      icon,
      gradient,
      scale,
      shadow,
      badge,
    }: FloatingButtonComponentProps) => {
      const buttonSize: number = scale * 100;

      return (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            ...shadow,
          }}
        >
          <Svg width={buttonSize} height={buttonSize}>
            <Defs>
              <SvgGradient
                id="floatingButtonGradient"
                x1="0%"
                y1="25%"
                x2="80%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={gradient[0]} />
                <Stop offset="100%" stopColor={gradient[1]} />
              </SvgGradient>
            </Defs>
            <Circle
              cx={buttonSize / 2}
              cy={buttonSize / 2}
              r={buttonSize / 2.2}
              fill="url(#floatingButtonGradient)"
            />
          </Svg>
          <View
            style={{
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              width: buttonSize,
              height: buttonSize,
            }}
          >
            {icon}
          </View>
          {badge !== undefined && badge > 0 && (
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -10,
                backgroundColor: "#ff4444",
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                {badge > 99 ? "99+" : badge.toString()}
              </Text>
            </View>
          )}
        </View>
      );
    },
  );

const BackgroundCurve: React.FC<BackgroundCurveProps> =
  memo<BackgroundCurveProps>(
    ({ position, gradient, height }: BackgroundCurveProps) => {
      const screenWidth = Math.ceil(VIEWPORT_WIDTH * 100);
      const totalWidth = screenWidth * 3;
      const centerOffset = screenWidth;
      const origWidth = 394;
      const origHeight = 86;

      const curveWidth = screenWidth;
      const leftEdge = (133 / origWidth) * curveWidth;
      const rightEdge = (258 / origWidth) * curveWidth;
      const center = (197 / origWidth) * curveWidth;
      const notchHeight = (43.5 / origHeight) * height;
      const leftControl1 = (159.724 / origWidth) * curveWidth;
      const leftControl2 = (172.684 / origWidth) * curveWidth;
      const rightControl1 = (220.932 / origWidth) * curveWidth;
      const rightControl2 = (235.992 / origWidth) * curveWidth;

      const path = `
    M0 0
    L${centerOffset} 0
    C${centerOffset} 0 ${centerOffset + leftEdge * 0.8} 0 ${
        centerOffset + leftEdge
      } 0
    C${centerOffset + leftControl1} 0 ${
        centerOffset + leftControl2
      } ${notchHeight} ${centerOffset + center} ${notchHeight}
    C${centerOffset + rightControl1} ${notchHeight * 0.99} ${
        centerOffset + rightControl2
      } 0 ${centerOffset + rightEdge} 0
    C${centerOffset + rightEdge + (curveWidth - rightEdge) * 0.1} 0 ${
        centerOffset + curveWidth
      } 0 ${centerOffset + curveWidth} 0
    L${totalWidth} 0
    V${height}
    H0
    V0
    Z
  `;

      const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
        transform: [{ translateX: position.value }],
      }));

      return (
        <View style={{ overflow: "hidden", width: screenWidth }}>
          <Animated.View style={animatedStyle}>
            <Svg
              width={totalWidth}
              height={height}
              preserveAspectRatio="none"
              viewBox={`0 0 ${totalWidth} ${height}`}
              fill="none"
            >
              <Path d={path} fill="url(#curveGradient)" />
              <Defs>
                <SvgGradient
                  id="curveGradient"
                  x1={0}
                  y1={height * 0.8}
                  x2={totalWidth}
                  y2={height * 0.8}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset={0.0576923} stopColor={gradient[0]} />
                  <Stop offset={0.903846} stopColor={gradient[1]} />
                </SvgGradient>
              </Defs>
            </Svg>
          </Animated.View>
        </View>
      );
    },
  );

const CurvedBottomTabsCore: React.FC<CurvedBottomTabsProps> =
  memo<CurvedBottomTabsProps>(
    ({
      tabs,
      currentIndex,
      onPress,
      gradient,
      barHeight = 0.12,
      buttonScale = 0.6,
      activeColor = "#ffffff",
      inactiveColor = "#cccccc",
      labelColor = "#cccccc",
      textSize = 12,
      fontFamily,
      hideWhenKeyboardShown = false,
      animation = { damping: 12, stiffness: 120, mass: 0.5 },
      shadow = {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
      },
    }: CurvedBottomTabsProps) => {
      const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);

      const curvePosition = useSharedValue<number>(0);
      const floatingAnimations = useRef<SharedValue<number>[]>(
        tabs.map(() => useSharedValue<number>(0)),
      ).current;

      const processedGradient = gradient as [string, string];

      useEffect(() => {
        if (!hideWhenKeyboardShown) return;

        const showListener = Keyboard.addListener("keyboardDidShow", () => {
          setKeyboardVisible(true);
        });
        const hideListener = Keyboard.addListener("keyboardDidHide", () => {
          setKeyboardVisible(false);
        });

        return () => {
          showListener.remove();
          hideListener.remove();
        };
      }, [hideWhenKeyboardShown]);

      const animateToIndex = <T extends number>(targetIndex: T): void => {
        const targetPosition = calculateTabPosition<number, number>(
          targetIndex,
          tabs.length,
        );

        curvePosition.value = withSpring<number>(targetPosition, {
          damping: animation.damping,
          stiffness: animation.stiffness,
          mass: animation.mass,
        });

        floatingAnimations.forEach(
          (anim: SharedValue<number>, index: number) => {
            anim.value = withSpring<number>(
              index === targetIndex ? -50 : 0,
              {
                damping: 10,
                stiffness: 100,
                mass: 0.5,
              },
            );
          },
        );
      };

      useEffect(() => {
        const timer = setTimeout<[void]>(() => {
          animateToIndex<number>(currentIndex);
        }, 100);
        return () => clearTimeout(timer);
      }, []);

      useEffect(() => {
        animateToIndex<number>(currentIndex);
      }, [currentIndex]);

      const styles = createStyles<StyleConfig>({
        barHeight,
        textSize,
        fontFamily,
        inactiveColor,
        labelColor,
      });

      if (hideWhenKeyboardShown && keyboardVisible) {
        return null;
      }

      return (
        <View style={styles.wrapper}>
          <View style={styles.backgroundContainer}>
            <BackgroundCurve
              position={curvePosition}
              gradient={processedGradient}
              height={78}
            />
          </View>

          {tabs.map((tab: Tab, index: number) => {
            const floatingAnimation = floatingAnimations[index];
            const isActive = currentIndex === index;

            const handlePress = (): void => {
              onPress(index, tab);
            };

            const animatedTabStyle = useAnimatedStyle<ViewStyle>(() => ({
              transform: [{ translateY: floatingAnimations[index].value }],
            }));

            return (
              <Animated.View
                key={tab.id}
                style={[styles.tabWrapper, animatedTabStyle]}
              >
                <TouchableOpacity
                  onPress={handlePress}
                  style={styles.tabTouchable}
                  activeOpacity={0.9}
                >
                  {isActive ? (
                    <FloatingButtonComponent
                      icon={tab.icon}
                      gradient={processedGradient}
                      scale={buttonScale}
                      shadow={shadow}
                      badge={tab.badge}
                    />
                  ) : (
                    <>
                      <View style={styles.iconWrapper}>
                        {tab.icon}
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <View style={styles.badgeContainer}>
                            <Text style={styles.badgeLabel}>
                              {tab.badge > 99 ? "99+" : tab.badge.toString()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tabLabel, { color: labelColor }]}>
                        {tab.title}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      );
    },
  );

const createStyles = <T extends StyleConfig>({
  barHeight,
  textSize,
  fontFamily,
  ...props
}: T) =>
  StyleSheet.create({
   wrapper: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  alignSelf: "center",
  backgroundColor: "transparent",
  justifyContent: "space-between",
  height: 78, 
  flexDirection: "row",
  width: "100%",
  zIndex: 9999, 
},
    backgroundContainer: {
      position: "absolute",
      bottom: 0,
      zIndex: 20,
      width: "100%",
    },
    tabWrapper: {
      flex: 1,
      zIndex: 10000,
    },
    tabTouchable: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      zIndex: 10001,
      // Afastamento extra no Android para desgrudar dos 3 botões nativos do sistema
      paddingBottom: Platform.OS === "ios" ? 20 : 12,
    },
    tabLabel: {
      fontSize: textSize,
      fontFamily,
      textAlign: "center",
      marginTop: 10,
    },
    iconWrapper: {
      position: "relative",
    },
    badgeContainer: {
      position: "absolute",
      top: -5,
      right: -10,
      backgroundColor: "#ff4444",
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeLabel: {
      color: "white",
      fontSize: 10,
      fontWeight: "bold",
    },
  });

export const CurvedBottomTabs: React.FC<
  BottomTabBarProps & CurvedTabBarNavigationProps
> = memo(
    ({
      state,
      descriptors,
      navigation,
      gradients = ["#111827", "#060b13"],
    }) => {
      // 1. Oculta a barra na tela de Login imediatamente
      const currentRoute = state.routes[state.index];
      if (currentRoute.name === "index") return null;

      // 2. Filtra as rotas injetando tipagem explícita para eliminar erros de 'any'
      const visibleRoutes = state.routes.filter((r: any) => r.name !== "index");
      const activeVisibleIndex = visibleRoutes.findIndex((r: any) => r.name === currentRoute.name);

      const tabs: Tab[] = visibleRoutes.map((route: any) => {
        const { options } = descriptors[route.key];
        const isActive = currentRoute.name === route.name;

        return {
          id: route.key,
          title:
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name,
          icon: options?.tabBarIcon
            ? options.tabBarIcon({
                focused: isActive,
                color: isActive ? "#ffffff" : "#6B7280",
                size: 24,
              })
            : null,
          badge:
            typeof options.tabBarBadge === "number"
              ? options.tabBarBadge
              : undefined,
        };
      });

      const handlePress = (index: number, tab: Tab): void => {
        const route = visibleRoutes[index];

        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });

        if (currentRoute.name !== route.name && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };

      return (
        <CurvedBottomTabsCore
          tabs={tabs}
          currentIndex={activeVisibleIndex >= 0 ? activeVisibleIndex : 0}
          onPress={handlePress}
          gradient={gradients}
        />
      );
    },
  );