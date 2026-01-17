import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
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