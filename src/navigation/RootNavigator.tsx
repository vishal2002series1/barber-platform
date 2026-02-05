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
import OnboardingScreen from '../screens/auth/OnboardingScreen'; // <--- IMPORT NEW SCREEN
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
  // Grab userProfile to check the 'is_onboarded' flag
  const { session, loading, isBarber, userProfile } = useAuth();

  if (loading || (session && !userProfile)) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // 1. Not Logged In -> Login Screen
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !userProfile?.is_onboarded ? (
          // 2. Logged In BUT Not Onboarded -> The Gate
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : isBarber ? (
          // 3. Barber App (Onboarded)
          <>
            <Stack.Screen name="BarberApp" component={BarberTabs} />
            <Stack.Screen name="ReceiptBuilder" component={ReceiptBuilderScreen} />
            <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
          </>
        ) : (
          // 4. Customer App (Onboarded)
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

// -- BARBER TABS --
function BarberTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        tabBarActiveTintColor: Colors.secondary,
        headerShown: false 
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleScreen} 
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-clock" size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="Services" 
        component={ServicesScreen} 
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="content-cut" size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// -- CUSTOMER TABS --
function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: Colors.primary, headerShown: false }}>
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen} 
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="compass" size={24} color={color} /> }}
      />
      <Tab.Screen 
          name="MyBookings" 
          component={MyBookingsScreen} 
          options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-check" size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}