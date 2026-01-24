import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Platform, Modal, TextInput, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Avatar, IconButton, Divider, Portal, Provider, Surface } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Review State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cancel State
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
      Alert.alert("Error", "Could not load booking.");
      navigation.goBack();
    } else {
      setBooking(data);
      setLoading(false);
    }
  };

  // --- REVIEW LOGIC ---
  const submitReview = async () => {
    if (!comment.trim()) {
        Alert.alert("Review", "Please write a short comment.");
        return;
    }
    setSubmittingReview(true);

    const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        rating: rating,
        comment: comment
    });

    setSubmittingReview(false);

    if (error) {
        Alert.alert("Error", error.message);
    } else {
        setReviewModalVisible(false);
        Alert.alert("Thank You!", "Your review has been submitted.");
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
        .update({ status: 'cancelled', cancellation_reason: cancelReason })
        .eq('id', bookingId);
    setCancelling(false);
    if (!error) {
        setCancelModalVisible(false);
        Alert.alert("Cancelled", "Your booking has been cancelled.");
        navigation.goBack();
    }
  };

  // --- ACTIONS ---
  const callShop = () => {
    const phone = booking?.shops?.profiles?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = () => {
    const phone = booking?.shops?.profiles?.phone;
    if (phone) Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const openMap = () => {
    if (booking?.shops?.latitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${booking.shops.latitude},${booking.shops.longitude}`,
        android: `geo:0,0?q=${booking.shops.latitude},${booking.shops.longitude}`
      });
      if (url) Linking.openURL(url);
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />;
  if (!booking) return null;

  const isCompleted = booking.status === 'completed';
  const receipt = booking.receipt_data; // JSON Data
  const statusColor = isCompleted ? Colors.primary : booking.status === 'accepted' ? Colors.success : 'gray';

  return (
    <Provider>
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{isCompleted ? "Receipt & Review" : "Booking Details"}</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- 1. DIGITAL RECEIPT (If Completed) --- */}
        {isCompleted && receipt ? (
             <Surface style={styles.receiptCard} elevation={2}>
                 <View style={{alignItems:'center', marginBottom: 15}}>
                    <Avatar.Icon icon="check" size={40} style={{backgroundColor: Colors.success}} />
                    <Text style={{fontWeight: 'bold', fontSize: 18, marginTop: 5}}>Service Completed</Text>
                    <Text style={{color: 'gray'}}>
                        {new Date(booking.slot_start).toLocaleDateString()}
                    </Text>
                 </View>

                 <Divider />
                 
                 {/* Items List */}
                 <View style={{marginVertical: 15}}>
                    {receipt.items.map((item: any, index: number) => (
                        <View key={index} style={styles.row}>
                            <Text style={styles.itemText}>{item.name}</Text>
                            <Text style={styles.itemPrice}>${item.price}</Text>
                        </View>
                    ))}
                 </View>

                 <Divider />

                 {/* Totals */}
                 <View style={{marginTop: 15}}>
                    {receipt.discount > 0 && (
                        <View style={styles.row}>
                            <Text style={{color: Colors.success}}>Discount</Text>
                            <Text style={{color: Colors.success}}>-${receipt.discount}</Text>
                        </View>
                    )}
                    {receipt.tax_amount > 0 && (
                        <View style={styles.row}>
                            <Text style={{color: 'gray'}}>Tax</Text>
                            <Text style={{color: 'gray'}}>${receipt.tax_amount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={[styles.row, {marginTop: 10}]}>
                        <Text style={{fontSize: 20, fontWeight: 'bold'}}>Total Paid</Text>
                        <Text style={{fontSize: 20, fontWeight: 'bold', color: Colors.primary}}>
                            ${booking.final_price?.toFixed(2)}
                        </Text>
                    </View>
                 </View>

                 {/* WRITE REVIEW BUTTON */}
                 <Button 
                    mode="contained" 
                    icon="star" 
                    buttonColor="#FFB100" 
                    style={{marginTop: 20}}
                    onPress={() => setReviewModalVisible(true)}
                 >
                    Rate Experience
                 </Button>
             </Surface>
        ) : (
            /* --- 2. STANDARD STATUS CARD (If Not Completed) --- */
            <Surface style={styles.statusCard} elevation={1}>
                <Chip 
                    textStyle={{color: 'white', fontWeight: 'bold'}}
                    style={{backgroundColor: statusColor, alignSelf: 'center', marginBottom: 10}}
                >
                    {booking.status.toUpperCase()}
                </Chip>
                <Text style={styles.dateText}>
                    {new Date(booking.slot_start).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}
                </Text>
                <Text style={styles.timeText}>
                    {new Date(booking.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
            </Surface>
        )}

        {/* SHOP INFO */}
        <Text style={styles.sectionTitle}>Barber Shop</Text>
        <Card style={styles.card}>
            <Card.Cover source={{ uri: booking.shops?.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Shop' }} />
            <Card.Title 
                title={booking.shops?.shop_name} 
                subtitle={booking.shops?.profiles?.full_name}
                left={(props) => <Avatar.Icon {...props} icon="store" backgroundColor={Colors.secondary} />}
            />
            <Card.Actions style={{justifyContent: 'space-around', paddingBottom: 15}}>
                <Button mode="outlined" icon="phone" onPress={callShop}>Call</Button>
                <Button mode="outlined" icon="whatsapp" textColor="#25D366" onPress={openWhatsApp}>Chat</Button>
                <Button mode="contained" icon="map-marker" buttonColor={Colors.primary} onPress={openMap}>Map</Button>
            </Card.Actions>
        </Card>

        {/* CANCEL BUTTON (Only if active) */}
        {!isCompleted && booking.status !== 'cancelled' && booking.status !== 'rejected' && (
            <Button 
                mode="contained" 
                buttonColor={Colors.error} 
                onPress={() => setCancelModalVisible(true)}
                style={{marginTop: 20, marginBottom: 50}}
            >
                Cancel Booking
            </Button>
        )}
      </ScrollView>

      {/* --- REVIEW MODAL --- */}
      <Portal>
        <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Rate Your Cut ✂️</Text>
                    
                    {/* Star Rating */}
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginVertical: 15}}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <MaterialCommunityIcons 
                                    name={star <= rating ? "star" : "star-outline"} 
                                    size={40} 
                                    color="#FFB100" 
                                    style={{marginHorizontal: 5}}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput 
                        style={styles.input}
                        placeholder="How was the service?"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                    />

                    <View style={styles.modalButtons}>
                        <Button onPress={() => setReviewModalVisible(false)} style={{flex:1}}>Cancel</Button>
                        <Button 
                            mode="contained" 
                            onPress={submitReview} 
                            loading={submittingReview}
                            style={{flex:1}}
                        >
                            Submit
                        </Button>
                    </View>
                </Surface>
            </KeyboardAvoidingView>
        </Modal>
      </Portal>
      
      {/* Cancel Modal (Reused) */}
      <Portal>
        <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cancel Booking</Text>
                    <TextInput 
                        style={styles.input} placeholder="Reason for cancellation..."
                        value={cancelReason} onChangeText={setCancelReason}
                    />
                    <Button mode="contained" buttonColor={Colors.error} onPress={handleCancelWithReason} loading={cancelling} style={{marginTop: 10}}>
                        Confirm Cancel
                    </Button>
                    <Button onPress={() => setCancelModalVisible(false)} style={{marginTop: 10}}>Back</Button>
                </Surface>
            </View>
        </Modal>
      </Portal>

    </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingHorizontal: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  
  // Cards
  receiptCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', marginBottom: 20 },
  statusCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', marginBottom: 20 },
  card: { marginBottom: 15, backgroundColor: 'white', borderRadius: 12 },
  
  // Text
  dateText: { fontSize: 18, fontWeight: '600', marginTop: 5 },
  timeText: { fontSize: 32, fontWeight: 'bold', color: Colors.primary, marginVertical: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  
  // Receipt Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { fontSize: 16, color: '#333' },
  itemPrice: { fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA', minHeight: 50, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
});