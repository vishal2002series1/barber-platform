import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Avatar, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';

export default function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false); // New State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        shops (
          id,
          shop_name,
          image_url,
          latitude,
          longitude,
          profiles:owner_id ( full_name, phone ) 
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      setErrorMsg(error.message); 
      setLoading(false);
    } else {
      setBooking(data);
      setLoading(false);
    }
  };

  // --- NEW FEATURE: CANCEL BOOKING ---
  const handleCancel = async () => {
    Alert.alert(
        "Cancel Booking",
        "Are you sure you want to cancel this appointment?",
        [
            { text: "No", style: "cancel" },
            { 
                text: "Yes, Cancel", 
                style: 'destructive',
                onPress: async () => {
                    setCancelling(true);
                    
                    // 1. Call the database function
                    const { error } = await supabase.rpc('manage_booking', {
                        p_booking_id: bookingId,
                        p_status: 'cancelled'
                    });

                    if (error) {
                        Alert.alert("Error", error.message);
                        setCancelling(false);
                    } else {
                        Alert.alert("Cancelled", "Your booking has been cancelled.");
                        navigation.goBack(); // Return to list
                    }
                }
            }
        ]
    );
  };

  const openMap = () => {
    if (booking?.shops?.latitude && booking?.shops?.longitude) {
      const lat = booking.shops.latitude;
      const lng = booking.shops.longitude;
      const label = encodeURIComponent(booking.shops.shop_name);

      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}(${label})`,
        android: `geo:0,0?q=${lat},${lng}(${label})`,
        web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      });
      if (url) Linking.openURL(url);
    } else {
        Alert.alert("No Location", "Shop coordinates not found.");
    }
  };

  const callShop = () => {
    const phone = booking?.shops?.profiles?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("No Phone", "Shop number is not available.");
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />;

  if (errorMsg) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text style={{fontWeight:'bold'}}>Error</Text>
            </View>
            <View style={{padding: 20, alignItems: 'center'}}>
                <Text style={{color: 'red'}}>Failed to load details</Text>
            </View>
        </View>
    );
  }

  if (!booking) return null;

  const statusColor = 
    booking.status === 'accepted' ? Colors.success : 
    booking.status === 'rejected' ? Colors.error : 
    booking.status === 'cancelled' ? 'gray' : '#F59E0B';

  // Only show Cancel button if status is NOT cancelled or done
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'rejected';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATUS CARD */}
        <Card style={styles.card}>
            <Card.Content style={{alignItems: 'center'}}>
                <Chip 
                    textStyle={{color: 'white', fontWeight: 'bold'}}
                    style={{backgroundColor: statusColor, marginBottom: 10}}
                >
                    {booking.status.toUpperCase()}
                </Chip>
                <Text style={styles.dateText}>
                    {new Date(booking.slot_start).toDateString()}
                </Text>
                <Text style={styles.timeText}>
                    {new Date(booking.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
                <Text style={styles.priceText}>Total: ${booking.price}</Text>
            </Card.Content>
        </Card>

        {/* SHOP INFO */}
        <Text style={styles.sectionTitle}>Barber Shop</Text>
        <Card style={styles.card}>
            <Card.Cover source={{ uri: booking.shops?.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Shop' }} />
            <Card.Title 
                title={booking.shops?.shop_name} 
                subtitle={booking.shops?.profiles?.full_name || "Owner"}
                left={(props) => <Avatar.Icon {...props} icon="store" backgroundColor={Colors.secondary} />}
            />
            <Card.Actions style={{justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16}}>
                <Button mode="outlined" icon="phone" onPress={callShop} textColor={Colors.primary}>
                    Call
                </Button>
                <Button mode="contained" icon="map-marker" onPress={openMap} buttonColor={Colors.primary}>
                    Directions
                </Button>
            </Card.Actions>
        </Card>

        {/* CANCEL BUTTON AREA */}
        {canCancel && (
            <View style={{marginTop: 30, marginBottom: 50}}>
                <Button 
                    mode="contained" 
                    buttonColor={Colors.error} 
                    onPress={handleCancel}
                    loading={cancelling}
                    icon="cancel"
                >
                    Cancel Booking
                </Button>
                <Text style={{textAlign:'center', color:'gray', marginTop:10, fontSize:12}}>
                    Please cancel at least 1 hour in advance.
                </Text>
            </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    paddingTop: 50, paddingHorizontal: 10, paddingBottom: 10, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { marginBottom: 20, backgroundColor: 'white' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  dateText: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  timeText: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, marginVertical: 5 },
  priceText: { fontSize: 16, color: 'gray' },
});