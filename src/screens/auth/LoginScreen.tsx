import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../services/supabase'; // Ensure this file exists from previous step
import { Colors } from '../../config/colors';
import { Strings } from '../../config/strings';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'customer' | 'barber'>('customer');

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) Alert.alert("Login Failed", error.message);
    // Navigation is handled automatically by AuthContext (listening to session)
  };

  const handleRegister = async () => {
    setLoading(true);
    // Sign up logic
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: role } // Metadata is key!
      }
    });
    setLoading(false);

    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Success", "Check your email for the confirmation link!");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        
        {/* LOGO AREA (Novice can replace source) */}
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
             <Text style={styles.logoText}>✂️</Text>
          </View>
          <Text style={styles.title}>{Strings.appName}</Text>
          <Text style={styles.subtitle}>{Strings.welcomeSubtitle}</Text>
        </View>

        {/* ROLE SWITCHER */}
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'barber' && styles.roleBtnActive]}
            onPress={() => setRole('barber')}
          >
            <Text style={[styles.roleText, role === 'barber' && styles.roleTextActive]}>Barber</Text>
          </TouchableOpacity>
        </View>

        {/* FORM INPUTS */}
        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          outlineColor={Colors.secondary}
          activeOutlineColor={Colors.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          outlineColor={Colors.secondary}
          activeOutlineColor={Colors.secondary}
          secureTextEntry
        />

        {/* ACTION BUTTONS */}
        <Button 
          mode="contained" 
          onPress={handleLogin} 
          loading={loading}
          style={styles.mainBtn}
          buttonColor={Colors.primary}
        >
          {loading ? "Verifying..." : Strings.loginBtn}
        </Button>

        <TouchableOpacity onPress={handleRegister} style={styles.secondaryAction}>
          <Text style={styles.secondaryText}>New here? <Text style={{fontWeight: 'bold'}}>Create Account</Text></Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

// STYLES - Professional Layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 500, // Keeps it looking good on Web
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  logoText: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleTextActive: {
    color: Colors.primary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  mainBtn: {
    paddingVertical: 6,
    marginTop: 8,
    borderRadius: 8,
  },
  secondaryAction: {
    marginTop: 20,
    alignItems: 'center',
  },
  secondaryText: {
    color: Colors.textSecondary,
  },
});