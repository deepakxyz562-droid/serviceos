import type { ErrorBoundaryProps } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[nuvora] Unhandled render error', error);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nuvora could not open this screen</Text>
      <Text style={styles.message}>Your data is safe. Try loading the screen again.</Text>
      <Button title="Try again" onPress={retry} color="#0f766e" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    backgroundColor: '#ffffff',
  },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: '#475569', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
