import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Checkbox, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
// import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';

export default function BookingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { shopId, shopName } = route.params;

  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Slot State
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [shopId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Services
    const { data: menu } = await supabase.from('services').select('*').eq('shop_id', shopId);
    if (menu) setServices(menu);

    // 2. Fetch Barber ID (Needed for schedule)
    const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', shopId).single();
    
    if (shop) {
        // 3. Fetch Slots using our RPC function
        const { data: schedule } = await supabase.rpc('get_barber_schedule', {
            p_barber_id: shop.owner_id,
            p_date: selectedDate
        });
        if (schedule) setSlots(schedule);
    }
    setLoading(false);
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(prev => prev.filter(item => item !== id));
    } else {
      setSelectedServices(prev => [...prev, id]);
    }
  };

  // ... imports ...

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

    const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', shopId).single();

    const { error } = await supabase.rpc('request_booking_v2', {
        p_barber_id: shop.owner_id,
        p_shop_id: shopId,
        p_slot_start: selectedSlot,
        p_service_ids: selectedServices,
        p_payment_method: 'cash'
    });

    setSubmitting(false);

    if (error) {
        Alert.alert("Booking Failed", error.message);
    } else {
        // --- FIXED NAVIGATION LOGIC ---
        const goHome = () => {
            // 1. Force the navigation to the main Customer Stack
            // 2. Then specify the specific Tab we want
            navigation.navigate('CustomerApp', { 
              screen: 'MyBookings' 
            });
        };

        if (Platform.OS === 'web') {
            // Web Alert (Blocking)
            alert("Success: Booking sent to barber!");
            goHome();
        } else {
            // Mobile Alert
            Alert.alert("Success", "Booking sent to barber!", [
                { text: "OK", onPress: goHome }
            ]);
        }
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <IconButton icon="close" size={24} onPress={() => navigation.goBack()} />
        <View>
            <Text style={styles.shopTitle}>{shopName}</Text>
            <Text style={styles.subtitle}>New Appointment</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator style={{marginTop: 50}} /> : (
        <FlatList
          ListHeaderComponent={
            <>
              {/* SERVICE SECTION */}
              <Text style={styles.sectionTitle}>1. Select Services</Text>
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

              <View style={styles.divider} />

              {/* SLOT SECTION */}
              <Text style={styles.sectionTitle}>2. Select Time ({selectedDate})</Text>
              <View style={styles.slotsGrid}>
                {slots.map((slot, index) => {
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
            </>
          }
          data={[]} // Empty data because we render everything in Header for simplicity
          renderItem={null}
          contentContainerStyle={{paddingBottom: 100}}
        />
      )}

      {/* FOOTER BUTTON */}
      <View style={styles.footer}>
        <Button 
            mode="contained" 
            onPress={confirmBooking} 
            loading={submitting}
            buttonColor={Colors.primary}
            contentStyle={{height: 50}}
        >
            Confirm Booking
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 10, paddingTop: 50, backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center' },
  shopTitle: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: 'gray', fontSize: 12 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 16, marginBottom: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  serviceName: { fontSize: 16, fontWeight: '500' },
  servicePrice: { color: 'gray', marginTop: 2 },
  
  divider: { height: 8, backgroundColor: '#F3F4F6', marginVertical: 10 },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  slotBadge: { 
    width: '30%', margin: '1.5%', paddingVertical: 10, 
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, 
    alignItems: 'center', justifyContent: 'center' 
  },
  slotSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotBusy: { backgroundColor: '#F3F4F6', borderColor: '#eee' },
  slotText: { fontWeight: '600' },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' },
});