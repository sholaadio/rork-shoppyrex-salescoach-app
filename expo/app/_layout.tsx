import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import SessionGuard from "@/components/SessionGuard";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="closer" options={{ headerShown: false }} />
        <Stack.Screen name="teamlead" options={{ headerShown: false }} />
        <Stack.Screen name="management" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard", presentation: "modal" }} />
        <Stack.Screen name="attendance" options={{ title: "Attendance", presentation: "modal" }} />
        <Stack.Screen name="no-answer" options={{ title: "No Answer", presentation: "modal" }} />
        <Stack.Screen name="ai-summary" options={{ title: "AI Summary", presentation: "modal" }} />
        <Stack.Screen name="report-detail" options={{ title: "Call Analysis", presentation: "modal" }} />
        <Stack.Screen name="manage-staff" options={{ title: "Manage Staff", presentation: "modal" }} />
        <Stack.Screen name="roles" options={{ title: "Roles & Permissions", presentation: "modal" }} />
        <Stack.Screen name="pay-report" options={{ title: "Pay Report", presentation: "modal" }} />
        <Stack.Screen name="analyses" options={{ title: "AI Analyses", presentation: "modal" }} />
        <Stack.Screen name="teamlead-log" options={{ title: "My Daily Log", presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <SessionGuard>
              <RootLayoutNav />
            </SessionGuard>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
