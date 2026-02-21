import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { useAuth } from '../../auth/AuthContext';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setResetPasswordMode } = useAuth();

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      Alert.alert("Success", "Your password has been updated!");
      
      // Turn off Reset Mode -> This sends user to Dashboard automatically
      setResetPasswordMode(false);
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Password</Text>
      <Text style={styles.subtitle}>Please enter your new password below.</Text>

      <TextInput 
        label="New Password" 
        value={password} 
        onChangeText={setPassword} 
        mode="outlined" 
        secureTextEntry
        style={styles.input} 
      />

      <Button 
        mode="contained" 
        onPress={handleUpdatePassword} 
        loading={loading} 
        buttonColor={Colors.primary}
        style={styles.btn}
      >
        Update Password
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'white' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  input: { marginBottom: 20, backgroundColor: 'white' },
  btn: { paddingVertical: 6, borderRadius: 8 }
});