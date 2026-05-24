import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function GoogleFitCallback() {
  const { success, error } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Wait 2 seconds so the user can see the status, then redirect
    const timer = setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 2000);

    return () => clearTimeout(timer);
  }, [success]);

  const isSuccess = success === 'true';

  return (
    <View style={styles.container}>
      <View style={[styles.card, isSuccess ? styles.successCard : styles.errorCard]}>
        <Ionicons 
          name={isSuccess ? "checkmark-circle" : "alert-circle"} 
          size={80} 
          color={isSuccess ? "#10B981" : "#EF4444"} 
        />
        
        <Text style={styles.title}>
          {isSuccess ? "Google Fit Connected!" : "Connection Failed"}
        </Text>
        
        <Text style={styles.message}>
          {isSuccess 
            ? "Your health data is now being synchronized." 
            : error || "There was an error connecting to Google Fit."}
        </Text>

        <ActivityIndicator 
          size="small" 
          color="#64748B" 
          style={styles.loader} 
        />
        
        <Text style={styles.redirectText}>Redirecting to settings...</Text>

        <View style={styles.buttonContainer}>
          <Text 
            style={styles.manualButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            Go to Dashboard Now
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  successCard: {
    borderTopWidth: 8,
    borderTopColor: '#10B981',
  },
  errorCard: {
    borderTopWidth: 8,
    borderTopColor: '#EF4444',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loader: {
    marginBottom: 10,
  },
  redirectText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
    alignItems: 'center',
  },
  manualButton: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
    textDecorationLine: 'underline',
  }
});
