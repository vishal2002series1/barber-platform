import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Vibration, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av'; // Sound Library
import { Colors } from '../config/colors';

// Types
interface BookingAlertModalProps {
  visible: boolean;
  booking: any;
  onAccept: () => void;
  onReject: () => void;
}

export default function BookingAlertModal({ visible, booking, onAccept, onReject }: BookingAlertModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // 1. Play Sound when Modal opens
  useEffect(() => {
    if (visible) {
      playSound();
      // Vibrate in a pattern: 1s wait, 1s vibrate, 1s wait...
      Vibration.vibrate([1000, 1000, 1000], true); 
    } else {
      stopSound();
      Vibration.cancel();
    }

    return () => {
      stopSound();
      Vibration.cancel();
    };
  }, [visible]);

  // 2. Sound Logic
  async function playSound() {
    try {
        // Load a default "Phone Ring" sound from online or asset
        // For MVP, we use a simple generic sound URL
        const { sound } = await Audio.Sound.createAsync(
            { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
            { shouldPlay: true, isLooping: true }
        );
        setSound(sound);
        await sound.playAsync();
    } catch (e) {
        console.log("Error loading sound", e);
    }
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  }

  if (!booking) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.container}>
        
        <View style={styles.header}>
            <Text style={styles.incomingText}>INCOMING REQUEST</Text>
            <View style={styles.pulsingCircle}>
                <Avatar.Icon size={80} icon="account" style={{backgroundColor: 'white'}} />
            </View>
        </View>

        <View style={styles.detailsContainer}>
            <Text style={styles.customerName}>{booking.profiles?.full_name || "New Customer"}</Text>
            <Text style={styles.serviceText}>Requested a booking for</Text>
            <Text style={styles.timeText}>
                {new Date(booking.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
            <Text style={styles.priceText}>${booking.price}</Text>
        </View>

        <View style={styles.actionRow}>
            <TouchableOpacity onPress={onReject} style={[styles.btn, styles.rejectBtn]}>
                <Text style={styles.btnText}>DECLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onAccept} style={[styles.btn, styles.acceptBtn]}>
                <Text style={styles.btnText}>ACCEPT</Text>
            </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222', justifyContent: 'space-between', paddingVertical: 60 },
  header: { alignItems: 'center', marginTop: 40 },
  incomingText: { color: 'white', letterSpacing: 2, fontWeight: 'bold', marginBottom: 20 },
  pulsingCircle: { 
      padding: 20, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 2, borderColor: Colors.primary 
  },
  
  detailsContainer: { alignItems: 'center' },
  customerName: { color: 'white', fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  serviceText: { color: '#ccc', fontSize: 16, marginTop: 10 },
  timeText: { color: Colors.primary, fontSize: 40, fontWeight: 'bold', marginTop: 10 },
  priceText: { color: 'white', fontSize: 24, marginTop: 5 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  btn: { width: 140, height: 140, borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { backgroundColor: Colors.error },
  acceptBtn: { backgroundColor: Colors.success },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});