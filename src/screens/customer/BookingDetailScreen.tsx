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
        ),
        booking_services (
          service_id, 
          price_at_booking,
          services ( name, duration_min )
        )
      `) // <--- NEW: Added service_id so we can pass it to the edit screen
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

  const submitReview = async () => {
    if (!comment.trim()) {
        Alert.alert("Review", "Please write a short comment.");
        return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({ booking_id: bookingId, rating: rating, comment: comment });
    setSubmittingReview(false);
    if (error) Alert.alert("Error", error.message);
    else {
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

  // --- NEW: Modify Booking Logic ---
  const handleModifyBooking = () => {
    // Extract the exact IDs of the services the user currently has booked
    const currentServiceIds = booking.booking_services.map((bs: any) => bs.service_id);
    
    // Extract Date and Slot
    const currentDate = booking.slot_start.split('T')[0];
    const currentSlot = booking.slot_start;

    // Navigate to Booking screen in Edit Mode
    navigation.navigate('Booking', {
        shopId: booking.shop_id,
        shopName: booking.shops?.shop_name,
        editMode: true,
        bookingId: booking.id,
        initialServices: currentServiceIds,
        initialDate: currentDate,
        initialSlot: currentSlot
    });
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return Colors.success;
      case 'rejected': return Colors.error;
      case 'cancelled': return Colors.error;
      case 'completed': return Colors.primary;
      case 'requested': return '#F59E0B'; 
      default: return 'gray';
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />;
  if (!booking) return null;

  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const receipt = booking.receipt_data;
  
  const expectedTotal = booking.booking_services?.reduce((sum: number, item: any) => sum + (item.price_at_booking || 0), 0) || booking.price;
  const expectedDuration = booking.booking_services?.reduce((sum: number, item: any) => sum + (item.services?.duration_min || 0), 0) || 0;

  return (
    <Provider>
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{isCompleted ? "Receipt & Review" : "Booking Details"}</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {isCancelled && (
            <Surface style={styles.cancelBanner} elevation={2}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 5}}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.error} />
                    <Text style={{fontSize: 18, fontWeight: 'bold', color: Colors.error, marginLeft: 8}}>
                        Booking Cancelled
                    </Text>
                </View>
                <Text style={{color: '#555', marginTop: 4, fontStyle: 'italic'}}>
                    Reason: "{booking.cancellation_reason || 'No reason provided.'}"
                </Text>
            </Surface>
        )}

        {!isCompleted && (
            <Surface style={styles.statusCard} elevation={1}>
                <Chip 
                    textStyle={{color: 'white', fontWeight: 'bold'}}
                    style={{backgroundColor: getStatusColor(booking.status), alignSelf: 'center', marginBottom: 10}}
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

        {(!isCompleted || !receipt) && (
            <>
                <Text style={styles.sectionTitle}>Services Requested</Text>
                <Surface style={styles.servicesCard} elevation={1}>
                    {booking.booking_services?.map((bs: any, index: number) => (
                        <View key={index} style={styles.serviceRow}>
                            <View style={{flex: 1}}>
                                <Text style={styles.itemText}>{bs.services?.name}</Text>
                                <Text style={styles.itemDuration}>{bs.services?.duration_min} mins</Text>
                            </View>
                            <Text style={styles.itemPrice}>Rs. {bs.price_at_booking}</Text>
                        </View>
                    ))}
                    <Divider style={{marginVertical: 10}} />
                    <View style={styles.row}>
                        <Text style={{fontSize: 16, color: 'gray'}}>Est. Duration</Text>
                        <Text style={{fontSize: 16, fontWeight: '600'}}>{expectedDuration} mins</Text>
                    </View>
                    <View style={[styles.row, {marginTop: 5}]}>
                        <Text style={{fontSize: 18, fontWeight: 'bold'}}>Total Price</Text>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: Colors.primary}}>
                            Rs. {expectedTotal}
                        </Text>
                    </View>
                </Surface>
            </>
        )}

        {/* ... (Digital Receipt block remains exactly same) ... */}
        {isCompleted && receipt && (
             <Surface style={styles.receiptCard} elevation={2}>
                 <View style={{alignItems:'center', marginBottom: 15}}>
                    <Avatar.Icon icon="check" size={40} style={{backgroundColor: Colors.success}} />
                    <Text style={{fontWeight: 'bold', fontSize: 18, marginTop: 5}}>Service Completed</Text>
                    <Text style={{color: 'gray'}}>{new Date(booking.slot_start).toLocaleDateString()}</Text>
                 </View>
                 <Divider />
                 <View style={{marginVertical: 15}}>
                    {receipt.items.map((item: any, index: number) => (
                        <View key={index} style={styles.row}>
                            <Text style={styles.itemText}>{item.name}</Text>
                            <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                        </View>
                    ))}
                 </View>
                 <Divider />
                 <View style={{marginTop: 15}}>
                    {receipt.discount > 0 && (
                        <View style={styles.row}>
                            <Text style={{color: Colors.success}}>Discount</Text>
                            <Text style={{color: Colors.success}}>-Rs.{receipt.discount}</Text>
                        </View>
                    )}
                    {receipt.tax_amount > 0 && (
                        <View style={styles.row}>
                            <Text style={{color: 'gray'}}>Tax</Text>
                            <Text style={{color: 'gray'}}>Rs. {receipt.tax_amount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={[styles.row, {marginTop: 10}]}>
                        <Text style={{fontSize: 20, fontWeight: 'bold'}}>Total Paid</Text>
                        <Text style={{fontSize: 20, fontWeight: 'bold', color: Colors.primary}}>Rs. {booking.final_price?.toFixed(2)}</Text>
                    </View>
                 </View>
                 <Button mode="contained" icon="star" buttonColor="#FFB100" style={{marginTop: 20}} onPress={() => setReviewModalVisible(true)}>
                    Rate Experience
                 </Button>
             </Surface>
        )}

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

        {/* --- NEW: MODIFY & CANCEL ACTIONS --- */}
        {!isCompleted && !isCancelled && booking.status !== 'rejected' && (
            <View style={{marginTop: 20, marginBottom: 50}}>
                <Button 
                    mode="contained" 
                    buttonColor={Colors.primary} 
                    icon="pencil"
                    onPress={handleModifyBooking}
                    style={{marginBottom: 12, paddingVertical: 5}}
                >
                    Modify Booking
                </Button>
                <Button 
                    mode="outlined" 
                    textColor={Colors.error}
                    style={{borderColor: Colors.error, borderWidth: 1}}
                    onPress={() => setCancelModalVisible(true)}
                >
                    Cancel Booking
                </Button>
            </View>
        )}
      </ScrollView>

      {/* ... (Modals remain exactly same) ... */}
      <Portal>
        <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Rate Your Cut ✂️</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginVertical: 15}}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <MaterialCommunityIcons name={star <= rating ? "star" : "star-outline"} size={40} color="#FFB100" style={{marginHorizontal: 5}} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={styles.input} placeholder="How was the service?" value={comment} onChangeText={setComment} multiline />
                    <View style={styles.modalButtons}>
                        <Button onPress={() => setReviewModalVisible(false)} style={{flex:1}}>Cancel</Button>
                        <Button mode="contained" onPress={submitReview} loading={submittingReview} style={{flex:1}}>Submit</Button>
                    </View>
                </Surface>
            </KeyboardAvoidingView>
        </Modal>
      </Portal>
      
      <Portal>
        <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cancel Booking</Text>
                    <TextInput style={styles.input} placeholder="Reason for cancellation..." value={cancelReason} onChangeText={setCancelReason} />
                    <Button mode="contained" buttonColor={Colors.error} onPress={handleCancelWithReason} loading={cancelling} style={{marginTop: 10}}>Confirm Cancel</Button>
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
  cancelBanner: { padding: 20, borderRadius: 12, backgroundColor: '#FEF2F2', marginBottom: 20, borderLeftWidth: 4, borderLeftColor: Colors.error },
  statusCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', marginBottom: 20 },
  servicesCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', marginBottom: 20 },
  receiptCard: { padding: 20, borderRadius: 12, backgroundColor: 'white', marginBottom: 20 },
  card: { marginBottom: 15, backgroundColor: 'white', borderRadius: 12 },
  dateText: { fontSize: 18, fontWeight: '600', marginTop: 5 },
  timeText: { fontSize: 32, fontWeight: 'bold', color: Colors.primary, marginVertical: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemText: { fontSize: 16, color: '#333', fontWeight: '500' },
  itemDuration: { fontSize: 12, color: 'gray', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA', minHeight: 50, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
});