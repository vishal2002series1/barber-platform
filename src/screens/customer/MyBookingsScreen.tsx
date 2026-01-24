import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, ActivityIndicator, SegmentedButtons, Surface } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MyBookingsScreen() {
  const { userProfile, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('upcoming'); 

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        slot_start,
        status,
        price,
        shops ( shop_name, image_url )
      `)
      .eq('customer_id', userProfile?.id)
      .order('slot_start', { ascending: false }); 

    if (data) setBookings(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return Colors.success;
      case 'rejected': return Colors.error;
      case 'cancelled': return Colors.error; // <--- CHANGED TO RED
      case 'completed': return Colors.primary;
      case 'requested': return '#F59E0B'; 
      default: return Colors.textSecondary;
    }
  };

  // --- FILTERING LOGIC ---
  const now = new Date();
  const filteredBookings = bookings.filter(b => {
    const slotTime = new Date(b.slot_start);
    if (viewMode === 'upcoming') {
        return slotTime >= now && b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'completed';
    } else {
        return slotTime < now || b.status === 'cancelled' || b.status === 'rejected' || b.status === 'completed';
    }
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={signOut}>
            <MaterialCommunityIcons name="logout" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={setViewMode}
            buttons={[
              { value: 'upcoming', label: 'Upcoming', icon: 'calendar-clock' },
              { value: 'history', label: 'History', icon: 'history' },
            ]}
            density="medium"
          />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={60} color="#ccc" />
          <Text style={{color: 'gray', marginTop: 10}}>No {viewMode} bookings found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
          contentContainerStyle={{ padding: 16, paddingTop: 5 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
            >
                <Surface style={styles.ticketCard} elevation={1}>
                    <Image 
                        source={{ uri: item.shops?.image_url || 'https://placehold.co/100x100/1A1A1A/FFF?text=Shop' }} 
                        style={styles.cardImage}
                    />
                    
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.shopName} numberOfLines={1}>{item.shops?.shop_name}</Text>
                            <Chip 
                                textStyle={{ color: 'white', fontWeight: 'bold', fontSize: 10 }} 
                                style={{ backgroundColor: getStatusColor(item.status), height: 24 }}
                                compact
                            >
                                {item.status.toUpperCase()}
                            </Chip>
                        </View>
                        
                        <Text style={styles.dateText}>
                             {new Date(item.slot_start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={styles.timeText}>
                             {new Date(item.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>

                        <Text style={styles.priceText}>${item.price} • Tap for info</Text>
                    </View>
                </Surface>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    padding: 20, 
    paddingTop: 60, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.text },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  ticketCard: { flexDirection: 'row', backgroundColor: 'white', marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  cardImage: { width: 90, height: '100%' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  shopName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, maxWidth: '65%' },
  dateText: { fontSize: 14, color: 'gray', fontWeight: '500' },
  timeText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginVertical: 2 },
  priceText: { fontSize: 12, color: '#888', marginTop: 4 }
});