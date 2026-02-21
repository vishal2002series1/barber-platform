import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleResetRequest = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      // Redirect to the deep link scheme we set in app.json
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'barberplatform://reset-password',
      });

      if (error) throw error;

      Alert.alert("Check your email", "We've sent you a password reset link.");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <IconButton icon="arrow-left" size={30} onPress={() => navigation.goBack()} style={{alignSelf: 'flex-start', marginLeft: -10}} />
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>

        <TextInput 
          label="Email Address" 
          value={email} 
          onChangeText={setEmail} 
          mode="outlined" 
          keyboardType="email-address" 
          autoCapitalize="none"
          style={styles.input} 
        />

        <Button 
          mode="contained" 
          onPress={handleResetRequest} 
          loading={loading} 
          buttonColor={Colors.primary}
          style={styles.btn}
        >
          Send Link
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  input: { marginBottom: 20, backgroundColor: 'white' },
  btn: { paddingVertical: 6, borderRadius: 8 }
});