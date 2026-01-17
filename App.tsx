import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // <--- ADD THIS
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>  {/* <--- WRAP HERE */}
        <PaperProvider>
          <RootNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}