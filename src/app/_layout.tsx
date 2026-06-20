import React, { useEffect } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StackAwareTabBar } from "@/components/base/stack-aware-tabs";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider, useApp } from "@/contexts/AppContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useAuth();
  const { isLoading: appLoading } = useApp();

  useEffect(() => {
    if (!authLoading && !appLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authLoading, appLoading]);

  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const onLoginScreen = pathname === "/" || pathname === "/index";

    if (!isAuthenticated && !onLoginScreen) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}

function TabLayoutContent() {
  const CustomTabBar = (props: any) => {
    if (props.state.index === 0 && props.state.routes[0].name === "index") {
      return null;
    }
    return <StackAwareTabBar {...props} />;
  };

  return (
    <AuthGate>
      <AppBootstrap>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Tabs
            tabBar={(props) => <CustomTabBar {...props as any} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                href: null,
              }}
            />
            <Tabs.Screen
              name="(first)"
              options={{
                title: "Home",
                tabBarIcon: ({ focused }) => (
                  <Ionicons
                    name={focused ? "home" : "home-outline"}
                    size={24}
                    color={focused ? "#FFFFFF" : "#B9B9B9"}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="(second)"
              options={{
                title: "Clientes",
                tabBarIcon: ({ focused }) => (
                  <Ionicons
                    name={focused ? "people" : "people-outline"}
                    size={24}
                    color={focused ? "#FFFFFF" : "#B9B9B9"}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="(third)"
              options={{
                title: "Perfil",
                tabBarIcon: ({ focused }) => (
                  <Ionicons
                    name={focused ? "person" : "person-outline"}
                    size={24}
                    color={focused ? "#FFFFFF" : "#B9B9B9"}
                  />
                ),
              }}
            />
          </Tabs>
        </GestureHandlerRootView>
      </AppBootstrap>
    </AuthGate>
  );
}

export default function TabLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppProvider>
          <TabLayoutContent />
        </AppProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
