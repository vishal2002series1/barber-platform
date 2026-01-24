import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Platform, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Avatar, IconButton, Divider, Portal, Provider, Surface } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';

export default function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

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
      Alert.alert("Error", "Could not load booking.");
      navigation.goBack();
    } else {
      setBooking(data);
      setLoading(false);
    }
  };

  const handleCancelWithReason = async () => {
    if (!cancelReason.trim()) {
        Alert.alert("Reason Required", "Please let the barber know why you are cancelling.");
        return;
    }

    setCancelling(true);
    
    const { error } = await supabase
        .from('bookings')
        .update({ 
            status: 'cancelled', 
            cancellation_reason: cancelReason 
        })
        .eq('id', bookingId);

    setCancelling(false);

    if (error) {
        Alert.alert("Error", error.message);
    } else {
        setCancelModalVisible(false);
        Alert.alert("Cancelled", "Your booking has been cancelled.");
        navigation.goBack();
    }
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
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("No Phone", "Shop number is not available.");
  };

  const openWhatsApp = () => {
    const phone = booking?.shops?.profiles?.phone;
    if (phone) Linking.openURL(`whatsapp://send?phone=${phone}&text=Hi, regarding my appointment...`);
    else Alert.alert("No Phone", "Shop number is not available.");
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />;
  if (!booking) return null;

  const statusColor = 
    booking.status === 'accepted' ? Colors.success : 
    booking.status === 'rejected' ? Colors.error : 
    booking.status === 'cancelled' ? 'gray' : '#F59E0B';
  
  const canCancel = booking.status === 'requested' || booking.status === 'accepted';
  const isPast = new Date(booking.slot_start) < new Date();

  // Format Created At Date
  const bookedOn = new Date(booking.created_at).toLocaleString([], {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'
  });

  return (
    <Provider>
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATUS CARD */}
        <Surface style={styles.statusCard} elevation={2}>
             <Chip 
                textStyle={{color: 'white', fontWeight: 'bold'}}
                style={{backgroundColor: statusColor, alignSelf: 'center', marginBottom: 10}}
            >
                {booking.status.toUpperCase()}
            </Chip>
            
            <Text style={styles.dateText}>
                {new Date(booking.slot_start).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})}
            </Text>
            <Text style={styles.timeText}>
                {new Date(booking.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>

            {/* --- NEW: BOOKED ON TIMESTAMP --- */}
            <Text style={styles.bookedOnText}>
                Booked on: {bookedOn}
            </Text>

            {(booking.status === 'cancelled' || booking.status === 'rejected') && booking.cancellation_reason && (
                <View style={styles.reasonBox}>
                    <Text style={{fontWeight: 'bold', color: Colors.error}}>Reason:</Text>
                    <Text style={{color: '#333'}}>{booking.cancellation_reason}</Text>
                </View>
            )}
        </Surface>

        {/* SHOP INFO */}
        <Text style={styles.sectionTitle}>Barber Shop</Text>
        <Card style={styles.card}>
            <Card.Cover source={{ uri: booking.shops?.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Shop' }} />
            <Card.Title 
                title={booking.shops?.shop_name} 
                subtitle={booking.shops?.profiles?.full_name || "Owner"}
                left={(props) => <Avatar.Icon {...props} icon="store" backgroundColor={Colors.secondary} />}
            />
            <Card.Actions style={{justifyContent: 'space-around', paddingBottom: 15}}>
                <Button mode="outlined" icon="phone" onPress={callShop}>Call</Button>
                <Button mode="outlined" icon="whatsapp" textColor="#25D366" onPress={openWhatsApp}>Chat</Button>
                <Button mode="contained" icon="map-marker" buttonColor={Colors.primary} onPress={openMap}>Map</Button>
            </Card.Actions>
        </Card>

        {/* PRICE SUMMARY */}
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.row}>
                    <Text style={{fontSize: 16}}>Service Total</Text>
                    <Text style={{fontSize: 16, fontWeight: 'bold'}}>${booking.price}</Text>
                </View>
                <Divider style={{marginVertical: 10}} />
                <View style={styles.row}>
                    <Text style={{color: 'gray'}}>Payment Method</Text>
                    <Text>Cash at Venue</Text>
                </View>
            </Card.Content>
        </Card>

        {/* CANCEL BUTTON */}
        {canCancel && !isPast && (
            <Button 
                mode="contained" 
                buttonColor={Colors.error} 
                onPress={() => setCancelModalVisible(true)}
                style={{marginTop: 20, marginBottom: 50}}
                icon="cancel"
            >
                Cancel Booking
            </Button>
        )}
      </ScrollView>

      {/* --- CANCELLATION MODAL --- */}
      <Portal>
        <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cancel Appointment</Text>
                    <Text style={styles.modalSubtitle}>Please tell us why you need to cancel:</Text>
                    
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g. Changed plans, Sick..."
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        multiline
                        numberOfLines={3}
                    />

                    <View style={styles.modalButtons}>
                        <Button onPress={() => setCancelModalVisible(false)} style={{flex:1}}>Keep It</Button>
                        <Button 
                            mode="contained" 
                            buttonColor={Colors.error} 
                            onPress={handleCancelWithReason} 
                            loading={cancelling}
                            style={{flex:1, marginLeft: 10}}
                        >
                            Confirm Cancel
                        </Button>
                    </View>
                </Surface>
            </KeyboardAvoidingView>
        </Modal>
      </Portal>

    </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    paddingTop: 50, paddingHorizontal: 10, paddingBottom: 10, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  
  statusCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', marginBottom: 20 },
  dateText: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 5 },
  timeText: { fontSize: 32, fontWeight: 'bold', color: Colors.primary, marginVertical: 5 },
  bookedOnText: { fontSize: 12, color: 'gray', marginTop: 5, fontStyle: 'italic' }, // <--- NEW STYLE
  reasonBox: { marginTop: 15, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 8, width: '100%' },

  card: { marginBottom: 15, backgroundColor: 'white', borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalSubtitle: { color: 'gray', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA', height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
});