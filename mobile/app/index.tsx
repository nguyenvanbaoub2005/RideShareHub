import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View>
        <Text style={styles.eyebrow}>RIDESHAREHUB</Text>
        <Text style={styles.title}>Mobile foundation</Text>
        <Text style={styles.body}>Passenger and Driver flows will remain role-scoped.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#f4f0e8' },
  eyebrow: { color: '#265fcf', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#17212b', fontSize: 40, fontWeight: '800', marginTop: 8 },
  body: { color: '#53616b', fontSize: 16, marginTop: 12 },
});
