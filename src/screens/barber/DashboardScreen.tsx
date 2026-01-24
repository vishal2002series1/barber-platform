import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Switch, Chip, Avatar } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { Strings } from '../../config/strings';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BookingAlertModal from '../../components/BookingAlertModal'; 

export default function DashboardScreen() {
  const { userProfile, signOut } = useAuth(); 
  
  // State
  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayEarnings: 0, jobsDone: 0 });
  const [loading, setLoading] = useState(true);

  // Alarm State
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // REF: To track "Online" status inside the Realtime Listener without re-subscribing
  const isOnlineRef = useRef(isOnline);

  // 1. Keep Ref in sync with State
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // 2. Load Initial Data
  useEffect(() => {
    if (userProfile?.id) {
      fetchDashboardData();
      const unsubscribe = subscribeToBookings();
      return () => { unsubscribe(); };
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

    // Get Pending Requests (SORTED BY NEWEST CREATED)
    const { data: pending } = await supabase
      .from('bookings')
      .select('*, profiles:customer_id(full_name)')
      .eq('barber_id', userProfile!.id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false }); // <--- FIX 1: Sort by "Most Recent Request"
    
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

  // 3. Real-Time Listener (The Alarm Trigger)
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
        async (payload) => {
          console.log("New Booking Signal Received");

          // CHECK 1: Are we Online? (Using Ref for live value)
          if (!isOnlineRef.current) {
              console.log("Ignored: Shop is Offline");
              return; 
          }
          
          // Fetch full details
          const { data } = await supabase
            .from('bookings')
            .select('*, profiles:customer_id(full_name)')
            .eq('id', payload.new.id)
            .single();
            
          if (data) {
             // CHECK 2: Is this actually a REQUEST? (Fixes self-blocking alarm)
             if (data.status !== 'requested') {
                 console.log("Ignored: Status is", data.status);
                 return;
             }

             setIncomingRequest(data);
             setModalVisible(true); 
             fetchDashboardData(); 
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const toggleOnline = async (val: boolean) => {
    setIsOnline(val); // UI updates instantly
    // DB update happens in background
    await supabase.from('shops').update({ is_open: val }).eq('owner_id', userProfile!.id);
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'reject') => {
    setModalVisible(false);

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    setLoading(true);

    try {
        const { error } = await supabase.rpc('manage_booking', {
          p_booking_id: bookingId,
          p_status: newStatus
        });

        setLoading(false);

        if (error) {
            let msg = error.message;
            if (msg.includes("Network request failed") || msg.includes("JSON")) {
                msg = "This request is no longer valid (it may have been cancelled).";
            }
            Alert.alert("Notice", msg);
        }
        
        // Optimistic Update
        setRequests(prev => prev.filter(r => r.id !== bookingId));
        fetchDashboardData();

    } catch (e: any) {
        setLoading(false);
        Alert.alert("Error", "Something went wrong.");
        fetchDashboardData();
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />}
    >
      {/* ALARM MODAL */}
      <BookingAlertModal 
        visible={modalVisible} 
        booking={incomingRequest}
        onAccept={() => handleBookingAction(incomingRequest?.id, 'accept')}
        onReject={() => handleBookingAction(incomingRequest?.id, 'reject')}
      />

      {/* HEADER */}
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
        {/* STATS */}
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

        {/* REQUEST LIST */}
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