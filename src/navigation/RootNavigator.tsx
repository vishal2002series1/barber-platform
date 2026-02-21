import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { Colors } from '../config/colors';

// Import Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen'; 
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'; // <--- NEW
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen'; // <--- NEW

import DashboardScreen from '../screens/barber/DashboardScreen';
import ServicesScreen from '../screens/barber/ServicesScreen';
import ScheduleScreen from '../screens/barber/ScheduleScreen';
import ExploreScreen from '../screens/customer/ExploreScreen'; 
import BookingScreen from '../screens/customer/BookingScreen';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import BookingDetailScreen from '../screens/customer/BookingDetailScreen'; 
import ReceiptBuilderScreen from '../screens/barber/ReceiptBuilderScreen'; 
import EarningsHistoryScreen from '../screens/barber/EarningsHistoryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  // Grab resetPasswordMode to control the flow
  const { session, loading, isBarber, userProfile, resetPasswordMode } = useAuth();

  // // Basic linking config to handle the email redirect
  // const linking = {
  //   prefixes: ['barberplatform://'],
  //   config: {
  //     screens: {
  //       ResetPassword: 'reset-password', // handles barberplatform://reset-password
  //     },
  //   },
  // };

  // Basic linking config to handle the email redirect safely
  const linking = {
    prefixes: ['barberplatform://'],
    config: {
      screens: {
        // This tells React Navigation: "If you see reset-password, just stay on Login."
        // Our AuthContext will immediately flip the UI to the real Reset screen anyway.
        Login: 'reset-password', 
      },
    },
  };

  if (loading || (session && !userProfile)) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // 1. Not Logged In
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : resetPasswordMode ? (
          // 2. Logged In VIA PASSWORD LINK -> Reset Screen
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : !userProfile?.is_onboarded ? (
          // 3. Not Onboarded
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : isBarber ? (
          // 4. Barber App
          <>
            <Stack.Screen name="BarberApp" component={BarberTabs} />
            <Stack.Screen name="ReceiptBuilder" component={ReceiptBuilderScreen} />
            <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
          </>
        ) : (
          // 5. Customer App
          <>
            <Stack.Screen name="CustomerApp" component={CustomerTabs} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ... BarberTabs and CustomerTabs remain unchanged ...
// (Include them here to complete the file)
function BarberTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ tabBarActiveTintColor: Colors.secondary, headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} /> }}/>
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-clock" size={24} color={color} /> }}/>
      <Tab.Screen name="Services" component={ServicesScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="content-cut" size={24} color={color} /> }}/>
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} /> }}/>
    </Tab.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: Colors.primary, headerShown: false }}>
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="compass" size={24} color={color} /> }}/>
      <Tab.Screen name="MyBookings" component={MyBookingsScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-check" size={24} color={color} /> }}/>
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} /> }}/>
    </Tab.Navigator>
  );
}