import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Switch, ActivityIndicator, Chip, Avatar } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { Strings } from '../../config/strings';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { userProfile, signOut } = useAuth(); // Added signOut
  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayEarnings: 0, jobsDone: 0 });
  const [loading, setLoading] = useState(true);

  // 1. Load Initial Data
  useEffect(() => {
    if (userProfile?.id) {
      fetchDashboardData();
      subscribeToBookings();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Get Shop Status
    const { data: shop } = await supabase
      .from('shops')
      .select('is_open, id')
      .eq('owner_id', userProfile!.id)
      .single();
    
    if (shop) setIsOnline(shop.is_open);

    // Get Pending Requests
    const { data: pending } = await supabase
      .from('bookings')
      .select('*, profiles:customer_id(full_name)')
      .eq('barber_id', userProfile!.id)
      .eq('status', 'requested');
    
    if (pending) setRequests(pending);

    // Get Stats
    const today = new Date().toISOString().split('T')[0];
    const { data: earnings } = await supabase
      .rpc('get_barber_stats', { 
        p_barber_id: userProfile!.id, 
        p_start_date: today, 
        p_end_date: today 
      });
      
    if (earnings) setStats({ todayEarnings: earnings.revenue, jobsDone: earnings.completed });
    
    setLoading(false);
  };

  // 2. Real-Time Listener
  const subscribeToBookings = () => {
    const channel = supabase
      .channel('barber-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `barber_id=eq.${userProfile!.id}`
        },
        (payload) => {
          Alert.alert(Strings.newRequest, "Check your queue!");
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  // 3. Actions
  const toggleOnline = async (val: boolean) => {
    setIsOnline(val);
    await supabase.from('shops').update({ is_open: val }).eq('owner_id', userProfile!.id);
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'reject') => {
    const { error } = await supabase.rpc('manage_booking', {
      p_booking_id: bookingId,
      p_action: action,
      p_reason: action === 'reject' ? 'Barber is busy' : null
    });

    if (error) Alert.alert("Error", error.message);
    else {
      setRequests(prev => prev.filter(r => r.id !== bookingId));
      fetchDashboardData();
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />}
    >
      {/* HEADER: STATUS TOGGLE & LOGOUT */}
      <View style={[styles.header, { backgroundColor: isOnline ? Colors.success : Colors.textSecondary }]}>
        <View>
          <Text style={styles.headerTitle}>{isOnline ? Strings.goOnline : Strings.goOffline}</Text>
          <Text style={styles.headerSubtitle}>{userProfile?.full_name}'s Shop</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Switch value={isOnline} onValueChange={toggleOnline} color="white" style={{marginRight: 15}} />
            <TouchableOpacity onPress={signOut}>
                <MaterialCommunityIcons name="logout" size={24} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* STATS CARDS */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text style={styles.statLabel}>Today's Earnings</Text>
              <Text style={styles.statValue}>${stats.todayEarnings}</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text style={styles.statLabel}>Jobs Done</Text>
              <Text style={styles.statValue}>{stats.jobsDone}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* PENDING REQUESTS */}
        <Text style={styles.sectionTitle}>Incoming Requests ({requests.length})</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{color: Colors.textSecondary}}>No pending requests.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <Card key={req.id} style={styles.requestCard}>
              <Card.Title 
                title={req.profiles?.full_name || "New Customer"} 
                subtitle={`Time: ${new Date(req.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                left={(props) => <Avatar.Icon {...props} icon="account" backgroundColor={Colors.secondary} />}
              />
              <Card.Content>
                <Chip icon="cash" style={{alignSelf: 'flex-start'}}>${req.price}</Chip>
              </Card.Content>
              <Card.Actions>
                <Button textColor={Colors.error} onPress={() => handleBookingAction(req.id, 'reject')}>Reject</Button>
                <Button mode="contained" buttonColor={Colors.success} onPress={() => handleBookingAction(req.id, 'accept')}>Accept</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', opacity: 0.8 },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 0.48, backgroundColor: Colors.surface },
  statLabel: { color: Colors.textSecondary, fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  requestCard: { marginBottom: 12, backgroundColor: Colors.surface, borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  emptyState: { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }
});