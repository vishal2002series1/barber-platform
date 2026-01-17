import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';

export default function ScheduleScreen() {
  const { userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  // 1. Accept a 'silent' flag to prevent scroll jumping
  const fetchSchedule = async (silent = false) => {
    if (!silent) setLoading(true); // Only show spinner on first load
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('get_barber_schedule', {
      p_barber_id: userProfile?.id,
      p_date: dateStr
    });

    if (data) setSlots(data);
    if (!silent) setLoading(false);
  };

  const handleToggleSlot = async (slotTime: string, currentStatus: string) => {
    if (currentStatus === 'busy' || currentStatus === 'requested') {
      Alert.alert("Booked", "This slot has a customer. Check your Dashboard to manage it.");
      return;
    }

    // 1. Optimistic Update (Instant UI change)
    const originalSlots = [...slots]; // Keep backup in case of error
    setSlots(prev => prev.map(s => {
        if (s.slot_time === slotTime) {
            return { ...s, status: s.status === 'free' ? 'unavailable' : 'free' };
        }
        return s;
    }));

    // 2. Call Backend
    const { error } = await supabase.rpc('toggle_slot_availability', {
        p_barber_id: userProfile?.id,
        p_slot_time: slotTime
    });

    if (error) {
        // If error, revert changes and show alert
        setSlots(originalSlots);
        Alert.alert("Error", error.message);
    } else {
        // If success, refresh data SILENTLY (No loading spinner = No scroll jump)
        fetchSchedule(true);
    }
  };

  // Helper to change dates
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getSlotColor = (status: string) => {
    switch (status) {
        case 'free': return 'white';
        case 'unavailable': return '#F3F4F6'; // Grey
        case 'requested': return '#FEF3C7'; // Yellow
        case 'busy': return '#D1FAE5'; // Green
        default: return 'white';
    }
  };

  const getSlotText = (item: any) => {
      if (item.status === 'free') return "Available";
      if (item.status === 'unavailable') return "Blocked (Personal)";
      if (item.status === 'requested') return "Request Pending";
      return `Booked: ${item.customer_name || 'Customer'}`;
  };

  return (
    <View style={styles.container}>
      {/* DATE HEADER */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => changeDate(-1)} />
        <Text style={styles.dateTitle}>{selectedDate.toDateString()}</Text>
        <IconButton icon="chevron-right" onPress={() => changeDate(1)} />
      </View>

      {loading ? <ActivityIndicator style={{marginTop: 50}} /> : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.slot_time}
          contentContainerStyle={{padding: 16}}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleToggleSlot(item.slot_time, item.status)}>
                <Card style={[styles.slotCard, { backgroundColor: getSlotColor(item.status) }]}>
                    <Card.Content style={styles.slotContent}>
                        <Text style={styles.timeText}>
                            {new Date(item.slot_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                        <View>
                            <Text style={styles.statusText}>{getSlotText(item)}</Text>
                            {item.status === 'free' && <Text style={styles.hintText}>Tap to Block</Text>}
                            {item.status === 'unavailable' && <Text style={styles.hintText}>Tap to Unblock</Text>}
                        </View>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 50, paddingBottom: 10, backgroundColor: '#F9FAFB' 
  },
  dateTitle: { fontSize: 18, fontWeight: 'bold' },
  slotCard: { marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  slotContent: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 18, fontWeight: 'bold', marginRight: 20, width: 80 },
  statusText: { fontSize: 16, fontWeight: '500' },
  hintText: { fontSize: 12, color: 'gray', marginTop: 2 }
});