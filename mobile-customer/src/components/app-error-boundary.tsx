import type { ErrorBoundaryProps } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[mobile] Unhandled render error', error);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        The app could not open this screen. Your saved data is still available.
      </Text>
      <Button title="Try again" onPress={retry} color="#059669" />
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
  title: { color: '#111827', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: '#4b5563', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
