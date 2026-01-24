import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, IconButton, ActivityIndicator, Chip, Divider, Surface } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native'; // <--- NEW: Auto-refresh
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ScheduleScreen() {
  const { userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. AUTO-REFRESH: Runs every time this tab is focused OR date changes
  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [selectedDate]) // Re-run when date changes
  );

  const fetchSchedule = async (silent = false) => {
    if (!silent) setLoading(true);
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const { data } = await supabase.rpc('get_barber_schedule', {
      p_barber_id: userProfile?.id,
      p_date: dateStr
    });

    if (data) setSlots(data);
    if (!silent) setLoading(false);
  };

  const handleToggleSlot = async (slotTime: string, currentStatus: string) => {
    if (currentStatus === 'busy' || currentStatus === 'requested') {
      Alert.alert("Booked Slot", "This time is booked by a customer. Go to Dashboard to manage/cancel it.");
      return;
    }

    // Optimistic Update
    const originalSlots = [...slots];
    setSlots(prev => prev.map(s => {
        if (s.slot_time === slotTime) {
            return { ...s, status: s.status === 'free' ? 'unavailable' : 'free' };
        }
        return s;
    }));

    // Call Backend
    const { error } = await supabase.rpc('toggle_slot_availability', {
        p_barber_id: userProfile?.id,
        p_slot_time: slotTime
    });

    if (error) {
        setSlots(originalSlots); // Revert
        Alert.alert("Error", error.message);
    } else {
        fetchSchedule(true); // Silent Refresh
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // --- VISUAL HELPERS ---
  const getStatusConfig = (item: any) => {
    switch (item.status) {
        case 'free': 
            return { 
                color: Colors.success, 
                bg: '#ECFDF5', 
                icon: 'check-circle-outline', 
                label: 'Available',
                subLabel: 'Tap to Block'
            };
        case 'unavailable': 
            return { 
                color: 'gray', 
                bg: '#F3F4F6', 
                icon: 'cancel', 
                label: 'Blocked',
                subLabel: 'Tap to Open'
            };
        case 'busy': 
        case 'accepted':
            return { 
                color: Colors.primary, 
                bg: '#EFF6FF', 
                icon: 'account', 
                label: 'Booked',
                subLabel: item.customer_name || 'Customer'
            };
        case 'requested': 
            return { 
                color: '#D97706', 
                bg: '#FFFBEB', 
                icon: 'clock-outline', 
                label: 'Request',
                subLabel: 'Check Dashboard'
            };
        default: return { color: 'black', bg: 'white', icon: 'help', label: 'Unknown', subLabel: '' };
    }
  };

  return (
    <View style={styles.container}>
      {/* --- CALENDAR HEADER --- */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
            <IconButton icon="chevron-left" size={30} onPress={() => changeDate(-1)} />
            <View style={{alignItems: 'center'}}>
                <Text style={styles.dateDay}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                <Text style={styles.dateDate}>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <IconButton icon="chevron-right" size={30} onPress={() => changeDate(1)} />
        </View>
      </Surface>

      {/* --- TIMELINE LIST --- */}
      {loading ? <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} /> : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.slot_time}
          contentContainerStyle={{padding: 20, paddingBottom: 80}}
          renderItem={({ item, index }) => {
            const config = getStatusConfig(item);
            const timeLabel = new Date(item.slot_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const isLast = index === slots.length - 1;

            return (
              <View style={styles.timelineRow}>
                {/* 1. Time Column */}
                <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{timeLabel}</Text>
                </View>

                {/* 2. Timeline Line & Dot */}
                <View style={styles.lineCol}>
                    <View style={[styles.dot, { backgroundColor: config.color }]} />
                    {!isLast && <View style={styles.line} />}
                </View>

                {/* 3. Card Content */}
                <TouchableOpacity 
                    style={{flex: 1}} 
                    onPress={() => handleToggleSlot(item.slot_time, item.status)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.card, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
                        <View style={{flex: 1}}>
                            <Text style={[styles.statusLabel, { color: config.color }]}>
                                {config.label.toUpperCase()}
                            </Text>
                            <Text style={[
                                styles.customerName, 
                                item.status === 'unavailable' && { textDecorationLine: 'line-through', color: 'gray' }
                            ]}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  
  // Header
  header: { backgroundColor: 'white', paddingVertical: 10, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  dateDay: { fontSize: 14, fontWeight: '600', color: 'gray', textTransform: 'uppercase' },
  dateDate: { fontSize: 20, fontWeight: 'bold', color: Colors.text },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 5 },
  timeCol: { width: 70, alignItems: 'flex-end', paddingRight: 10, paddingTop: 10 },
  timeText: { fontWeight: 'bold', color: '#555' },
  
  lineCol: { width: 20, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 14, zIndex: 1 },
  line: { width: 2, backgroundColor: '#E5E7EB', flex: 1, position: 'absolute', top: 14, bottom: -14 },

  // Card
  card: { 
      flex: 1, flexDirection: 'row', alignItems: 'center', 
      padding: 12, borderRadius: 12, borderWidth: 1,
      marginBottom: 10, marginLeft: 5,
      // Shadow for depth
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  statusLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
});