import { StyleSheet, Text, View } from 'react-native';
export default function DriverHome() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Driver — SP3-P2-03 (chưa implement)</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#94a3b8' },
});
