import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, Linking, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, IconButton, ActivityIndicator, Surface, Button, Avatar, Divider, Provider, Portal } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ScheduleScreen() {
  const { userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Closure State
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);

  // Booking Detail State
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelInput, setShowCancelInput] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [selectedDate])
  );

  // --- SAFE DATE HELPER ---
  // Gets local YYYY-MM-DD correctly regardless of time of day
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchSchedule = async (silent = false) => {
    if (!silent) setLoading(true);
    const dateStr = getLocalDateString(selectedDate);
    
    // 1. Check Manual Closure
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile?.id).single();
    if (shop) {
        const { data: closure } = await supabase
            .from('shop_closures')
            .select('id')
            .eq('shop_id', shop.id)
            .eq('closed_date', dateStr)
            .maybeSingle();
            
        setClosureId(closure?.id || null);
        setIsDayClosed(!!closure);
    }

    // 2. Fetch Slots
    const { data, error } = await supabase.rpc('get_barber_schedule', {
      p_barber_id: userProfile?.id,
      p_date: dateStr
    });

    if (error) {
        console.error(error);
        Alert.alert("Error", "Could not load schedule");
    }

    setSlots(data || []);
    if (!silent) setLoading(false);
  };

  const toggleDayBlock = async () => {
    setLoading(true);
    const dateStr = getLocalDateString(selectedDate);
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile?.id).single();
    
    if (!shop) return;

    if (isDayClosed && closureId) {
        const { error } = await supabase.from('shop_closures').delete().eq('id', closureId);
        if (error) Alert.alert("Error", error.message);
    } else {
        const { error } = await supabase.from('shop_closures').insert({
            shop_id: shop.id, closed_date: dateStr, reason: 'Manual Block'
        });
        if (error) Alert.alert("Error", error.message);
    }
    
    await fetchSchedule(true);
    setLoading(false);
  };

  const handleSlotPress = async (item: any) => {
    if (item.status === 'busy' || item.status === 'accepted') {
        openBookingDetails(item);
        return;
    }
    if (new Date(item.slot_time) < new Date()) return;
    toggleSlot(item.slot_time, item.status);
  };

  const toggleSlot = async (slotTime: string, currentStatus: string) => {
    const originalSlots = [...slots];
    setSlots(prev => prev.map(s => {
        if (s.slot_time === slotTime) return { ...s, status: s.status === 'free' ? 'unavailable' : 'free' };
        return s;
    }));

    const { error } = await supabase.rpc('toggle_slot_availability', {
        p_barber_id: userProfile?.id, p_slot_time: slotTime
    });

    if (error) {
        setSlots(originalSlots);
        Alert.alert("Error", error.message);
    } else {
        fetchSchedule(true);
    }
  };

  const openBookingDetails = async (slotItem: any) => {
    const { data } = await supabase
        .from('bookings')
        .select('*, profiles:customer_id(full_name, phone)')
        .eq('barber_id', userProfile?.id)
        .eq('slot_start', slotItem.slot_time)
        .in('status', ['accepted', 'completed']) 
        .maybeSingle();

    if (data) {
        setSelectedBooking(data);
        setDetailModalVisible(true);
        setShowCancelInput(false);
        setCancelReason('');
    } else {
        Alert.alert("Notice", "Could not load booking details.");
    }
  };

  const confirmCancellation = async () => {
      if (!cancelReason.trim()) { Alert.alert("Required", "Enter a reason."); return; }
      setCancelling(true);
      const { error } = await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: cancelReason }).eq('id', selectedBooking.id);
      setCancelling(false);
      if (error) Alert.alert("Error", error.message);
      else {
          Alert.alert("Cancelled", "Booking cancelled.");
          setDetailModalVisible(false);
          fetchSchedule(true);
      }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusConfig = (item: any) => {
    const isPast = new Date(item.slot_time) < new Date();
    switch (item.status) {
        case 'free': return { color: isPast ? '#9CA3AF' : Colors.success, bg: isPast ? '#F3F4F6' : '#ECFDF5', icon: 'check-circle-outline', label: 'Available', subLabel: isPast ? 'Past' : 'Tap to Block' };
        case 'unavailable': return { color: 'gray', bg: '#F3F4F6', icon: 'cancel', label: 'Blocked', subLabel: isPast ? 'Past' : 'Tap to Open' };
        case 'busy': 
        case 'accepted': return { color: Colors.primary, bg: '#EFF6FF', icon: 'account', label: isPast ? 'COMPLETED' : 'BOOKED', subLabel: item.customer_name || 'Customer' };
        default: return { color: 'black', bg: 'white', icon: 'help', label: 'Unknown', subLabel: '' };
    }
  };

  return (
    <Provider>
    <View style={styles.container}>
      {/* HEADER */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
            <IconButton icon="chevron-left" size={30} onPress={() => changeDate(-1)} />
            <View style={{alignItems: 'center'}}>
                <Text style={styles.dateDay}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                <Text style={styles.dateDate}>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <IconButton icon="chevron-right" size={30} onPress={() => changeDate(1)} />
        </View>
        <View style={{alignItems: 'center', paddingBottom: 10}}>
            <Button 
                mode={isDayClosed ? "contained" : "outlined"} 
                textColor={isDayClosed ? "white" : Colors.error}
                buttonColor={isDayClosed ? Colors.error : undefined}
                onPress={toggleDayBlock}
                icon={isDayClosed ? "lock-open" : "lock"}
                style={{borderColor: Colors.error}}
            >
                {isDayClosed ? "Unblock This Date" : "Mark Day as Closed"}
            </Button>
        </View>
      </Surface>

      {/* TIMELINE */}
      {loading ? <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} /> : (
        slots.length === 0 ? (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="store-off" size={60} color="#ccc" />
                <Text style={{color: 'gray', marginTop: 10, fontSize: 16}}>Shop Closed</Text>
                <Text style={{color: '#999', fontSize: 12}}>
                    {isDayClosed ? "You manually blocked this date." : "Weekly Off Day or No Slots Configured."}
                </Text>
                {/* DEBUG TEXT: Shows what date is being queried */}
                <Text style={{fontSize: 10, color: '#ddd', marginTop: 20}}>
                   Querying: {getLocalDateString(selectedDate)}
                </Text>
            </View>
        ) : (
            <FlatList
            data={slots}
            keyExtractor={(item) => item.slot_time}
            contentContainerStyle={{padding: 20, paddingBottom: 80}}
            renderItem={({ item, index }) => {
                const config = getStatusConfig(item);
                const timeLabel = new Date(item.slot_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const isLast = index === slots.length - 1;
                const isPast = new Date(item.slot_time) < new Date();
                const isBooked = item.status === 'busy' || item.status === 'accepted';
                const rowOpacity = (isPast && !isBooked) ? 0.5 : 1.0;

                return (
                <View style={[styles.timelineRow, {opacity: rowOpacity}]}>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeText}>{timeLabel}</Text>
                    </View>
                    <View style={styles.lineCol}>
                        <View style={[styles.dot, { backgroundColor: config.color }]} />
                        {!isLast && <View style={styles.line} />}
                    </View>
                    <TouchableOpacity style={{flex: 1}} onPress={() => handleSlotPress(item)} activeOpacity={0.7}>
                        <View style={[styles.card, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
                            <View style={{flex: 1}}>
                                <Text style={[styles.statusLabel, { color: config.color }]}>{config.label.toUpperCase()}</Text>
                                <Text style={[styles.customerName, item.status === 'unavailable' && { textDecorationLine: 'line-through', color: 'gray' }]}>
                                    {config.subLabel}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name={config.icon as any} size={24} color={config.color} />
                        </View>
                    </TouchableOpacity>
                </View>
                );
            }}
            />
        )
      )}

      {/* --- BOOKING DETAIL MODAL --- */}
      <Portal>
          <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{selectedBooking?.profiles?.full_name || "Customer"}</Text>
                    {!showCancelInput ? (
                        <>
                             <View style={styles.actionRow}>
                                <Button mode="outlined" icon="phone" onPress={() => Linking.openURL(`tel:${selectedBooking?.profiles?.phone}`)} style={styles.actionBtn}>Call</Button>
                                <Button mode="outlined" icon="whatsapp" onPress={() => Linking.openURL(`whatsapp://send?phone=${selectedBooking?.profiles?.phone}`)} style={styles.actionBtn} textColor="#25D366">WhatsApp</Button>
                            </View>
                            <Button mode="contained" buttonColor={Colors.error} onPress={() => setShowCancelInput(true)} style={{marginTop: 20}}>Cancel Booking</Button>
                            <Button onPress={() => setDetailModalVisible(false)} style={{marginTop: 10}}>Close</Button>
                        </>
                    ) : (
                        <>
                            <TextInput placeholder="Reason" style={styles.input} value={cancelReason} onChangeText={setCancelReason} autoFocus />
                            <Button mode="contained" buttonColor={Colors.error} onPress={confirmCancellation} loading={cancelling} style={{marginTop: 10}}>Confirm Cancel</Button>
                            <Button onPress={() => setShowCancelInput(false)}>Back</Button>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
          </Modal>
      </Portal>

    </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { backgroundColor: 'white', paddingVertical: 10, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  dateDay: { fontSize: 14, fontWeight: '600', color: 'gray', textTransform: 'uppercase' },
  dateDate: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  timelineRow: { flexDirection: 'row', marginBottom: 5 },
  timeCol: { width: 70, alignItems: 'flex-end', paddingRight: 10, paddingTop: 10 },
  timeText: { fontWeight: 'bold', color: '#555' },
  lineCol: { width: 20, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 14, zIndex: 1 },
  line: { width: 2, backgroundColor: '#E5E7EB', flex: 1, position: 'absolute', top: 14, bottom: -14 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10, marginLeft: 5 },
  statusLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 10, textAlign: 'center', marginBottom: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 0.48 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#f9f9f9', marginBottom: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 }
});