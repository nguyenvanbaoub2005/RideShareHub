import { StyleSheet, Text, View } from 'react-native';
export default function AdminHome() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Admin — dùng Web App (SP4-P1-02)</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#94a3b8' },
});
