import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import Icon

export default function MyBookingsScreen() {
  const { userProfile, signOut } = useAuth(); // <--- Import signOut
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        slot_start,
        status,
        price,
        shops ( shop_name )
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
      case 'requested': return '#F59E0B'; // Orange
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER WITH LOGOUT BUTTON */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={signOut}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{marginRight: 5, color: Colors.primary}}>Logout</Text>
                <MaterialCommunityIcons name="logout" size={24} color={Colors.primary} />
            </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text>No bookings yet.</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title
                title={item.shops?.shop_name || "Barber Shop"}
                subtitle={new Date(item.slot_start).toLocaleString()}
                right={(props) => (
                  <Chip 
                    textStyle={{ color: 'white', fontWeight: 'bold', fontSize: 12 }} 
                    style={{ backgroundColor: getStatusColor(item.status), marginRight: 16 }}
                  >
                    {item.status.toUpperCase()}
                  </Chip>
                )}
              />
              <Card.Content>
                 <Text style={{fontWeight: 'bold', marginTop: 5}}>Amount: ${item.price}</Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    padding: 20, 
    paddingTop: 60, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    flexDirection: 'row', // Align Title and Logout side-by-side
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: { marginBottom: 12, backgroundColor: 'white' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});