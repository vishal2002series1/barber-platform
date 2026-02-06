import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { Text, Button, Checkbox, ActivityIndicator, IconButton, Chip, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';


export default function BookingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { shopId, shopName } = route.params;

  // Data State
  const [shopDetails, setShopDetails] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  // Selection State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  useEffect(() => {
    if (shopDetails?.owner_id) {
        if (shopDetails.is_open) {
            fetchSchedule();
        } else {
            setSlots([]); 
        }
    }
  }, [shopDetails, selectedDate]);

  const fetchShopData = async () => {
    setLoading(true);
    
    // 1. Get Shop Details
    const { data: shop } = await supabase
        .from('shops')
        .select('owner_id, image_url, latitude, longitude, is_open')
        .eq('id', shopId)
        .single();
    
    if (shop) setShopDetails(shop);

    // 2. Get Services (FIX: Only fetch ACTIVE services)
    const { data: menu } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true); // <--- THIS WAS MISSING
    
    if (menu) setServices(menu);
    setLoading(false);
  };

  const fetchSchedule = async () => {
    const { data: schedule } = await supabase.rpc('get_barber_schedule', {
        p_barber_id: shopDetails.owner_id,
        p_date: selectedDate
    });

    if (schedule) {
        const now = new Date();
        const filtered = schedule.filter((slot: any) => {
            const slotTime = new Date(slot.slot_time);
            if (new Date(selectedDate).toDateString() === now.toDateString()) {
                return slotTime > now;
            }
            return true;
        });
        setSlots(filtered);
    }
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(prev => prev.filter(item => item !== id));
    } else {
      setSelectedServices(prev => [...prev, id]);
    }
  };

  const confirmBooking = async () => {
    if (selectedServices.length === 0) {
        Alert.alert("Missing Info", "Please select at least one service.");
        return;
    }
    if (!selectedSlot) {
        Alert.alert("Missing Info", "Please select a time slot.");
        return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc('request_booking_v2', {
        p_barber_id: shopDetails.owner_id,
        p_shop_id: shopId,
        p_slot_start: selectedSlot,
        p_service_ids: selectedServices,
        p_payment_method: 'cash'
    });

    setSubmitting(false);

    if (error) {
        Alert.alert("Booking Failed", error.message);
    } else {
        const goHome = () => navigation.navigate('CustomerApp', { screen: 'MyBookings' });
        
        if (Platform.OS === 'web') {
            alert("Success: Booking sent to barber!");
            goHome();
        } else {
            Alert.alert("Success", "Booking sent to barber!", [{ text: "OK", onPress: goHome }]);
        }
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} />;

  const isShopClosed = shopDetails && !shopDetails.is_open;

  return (
    <View style={styles.container}>
      {/* HEADER IMAGE */}
      <View style={styles.imageContainer}>
          <Image 
            source={{ uri: shopDetails?.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Barber+Shop' }} 
            style={styles.headerImage} 
          />
          <IconButton icon="arrow-left" iconColor="white" style={styles.backBtn} onPress={() => navigation.goBack()} />
          <View style={styles.imageOverlay}>
              <Text style={styles.shopTitle}>{shopName}</Text>
              <View style={styles.badgeRow}>
                  <Chip icon="map-marker" textStyle={{fontSize: 12}} style={{marginRight: 8}}>
                    {shopDetails?.latitude ? `${shopDetails.latitude.toFixed(3)}, ${shopDetails.longitude.toFixed(3)}` : "Location N/A"}
                  </Chip>
                  <Chip 
                    icon={isShopClosed ? "close-circle" : "clock"} 
                    textStyle={{fontSize: 12, color: isShopClosed ? 'red' : 'green'}}
                    style={{backgroundColor: 'white'}}
                  >
                    {isShopClosed ? "Currently Closed" : "Open Now"}
                  </Chip>
              </View>
          </View>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        
        {/* SERVICES LIST */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Select Services</Text>
            {services.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => toggleService(item.id)} style={styles.serviceRow}>
                    <View style={{flex: 1}}>
                        <Text style={styles.serviceName}>{item.name}</Text>
                        <Text style={styles.servicePrice}>${item.price} • {item.duration_min} mins</Text>
                    </View>
                    <Checkbox 
                        status={selectedServices.includes(item.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleService(item.id)}
                        color={Colors.primary}
                    />
                </TouchableOpacity>
            ))}
        </View>

        <Divider style={{height: 6, backgroundColor: '#f4f4f4'}} />

        {/* TIME SLOTS */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Select Time ({selectedDate})</Text>
            
            {isShopClosed ? (
                <View style={styles.closedContainer}>
                    <MaterialCommunityIcons name="store-off" size={40} color={Colors.error} />
                    <Text style={styles.closedText}>This shop is currently offline.</Text>
                </View>
            ) : slots.length === 0 ? (
                <Text style={{color: 'gray', fontStyle: 'italic', marginTop: 10}}>
                    No available slots for the rest of the day.
                </Text>
            ) : (
                <View style={styles.slotsGrid}>
                    {slots.map((slot: any, index: number) => {
                        const timeLabel = new Date(slot.slot_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const isAvailable = slot.status === 'free';
                        const isSelected = selectedSlot === slot.slot_time;
                        
                        return (
                            <TouchableOpacity
                                key={index}
                                disabled={!isAvailable}
                                onPress={() => setSelectedSlot(slot.slot_time)}
                                style={[
                                    styles.slotBadge,
                                    isSelected && styles.slotSelected,
                                    !isAvailable && styles.slotBusy
                                ]}
                            >
                                <Text style={[
                                    styles.slotText, 
                                    isSelected && {color: 'white'},
                                    !isAvailable && {color: '#ccc'}
                                ]}>
                                    {timeLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, isShopClosed && {opacity: 0.5}]}>
        <Button 
            mode="contained" 
            onPress={confirmBooking} 
            loading={submitting}
            buttonColor={Colors.primary}
            contentStyle={{height: 50}}
            disabled={isShopClosed}
        >
            {isShopClosed ? "Shop is Closed" : "Confirm & Book"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  imageContainer: { height: 250, width: '100%', position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 40, left: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  imageOverlay: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      padding: 20, 
      backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  shopTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  badgeRow: { flexDirection: 'row' },
  section: { padding: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  serviceRow: { 
      flexDirection: 'row', alignItems: 'center', 
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' 
  },
  serviceName: { fontSize: 16, fontWeight: '500' },
  servicePrice: { color: 'gray', marginTop: 2 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  slotBadge: { 
    width: '30%', margin: '1.5%', paddingVertical: 10, 
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, 
    alignItems: 'center', justifyContent: 'center' 
  },
  slotSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotBusy: { backgroundColor: '#F3F4F6', borderColor: '#eee' },
  slotText: { fontWeight: '600', fontSize: 13 },
  closedContainer: { alignItems: 'center', padding: 30, backgroundColor: '#FFF5F5', borderRadius: 10 },
  closedText: { color: Colors.error, fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  footer: { 
      padding: 20, borderTopWidth: 1, borderTopColor: '#eee', 
      position: 'absolute', bottom: 0, width: '100%', 
      backgroundColor: 'white' 
  },
});