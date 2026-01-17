import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import DashboardScreen from '../screens/barber/DashboardScreen';
import ServicesScreen from '../screens/barber/ServicesScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // For nice tab icons
import ExploreScreen from '../screens/customer/ExploreScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import ScheduleScreen from '../screens/barber/ScheduleScreen';

// Import Screens
import LoginScreen from '../screens/auth/LoginScreen';
// Placeholders (We will build these next)
const BarberHome = () => <View><Text>Barber Dashboard</Text></View>; 
const CustomerHome = () => <View><Text>Customer Home</Text></View>;

import { useAuth } from '../auth/AuthContext'; // From previous step
import { Colors } from '../config/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  const { session, loading, isBarber } = useAuth();

  if (loading) {
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
      // AUTH STACK
      <Stack.Screen name="Login" component={LoginScreen} />
    ) : isBarber ? (
      // BARBER STACK
      <Stack.Screen name="BarberApp" component={BarberTabs} />
    ) : (
      // CUSTOMER STACK
      <>
        <Stack.Screen name="CustomerApp" component={CustomerTabs} />
        {/* Add this line so we can navigate to Booking from Explore */}
        <Stack.Screen name="Booking" component={BookingScreen} options={{ presentation: 'modal' }} />
      </>
    )}
  </Stack.Navigator>
</NavigationContainer>
  );
}

// -- TAB NAVIGATORS (The Bottom Bar) --

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
        {/* We will build ScheduleScreen later, keeping placeholder for now if you want */}
      </Tab.Navigator>
    );
  }

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
           component={MyBookingsScreen} // <--- UPDATED THIS LINE
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