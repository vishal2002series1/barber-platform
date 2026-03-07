import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import * as Notifications from 'expo-notifications';

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // 1. This listener fires whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("🔔 Notification Received (Foreground):", notification.request.content.title);
    });

    // 2. This listener fires whenever a user TAPS on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("👉 User Tapped Notification! Attached Data:", data);
    });

    return () => {
      // --- UPDATED: Directly call .remove() on the subscription references ---
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <PaperProvider>
          <RootNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}