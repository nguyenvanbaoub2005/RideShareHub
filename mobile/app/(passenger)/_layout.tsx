import { Stack } from 'expo-router';
export default function PassengerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="results" />
      <Stack.Screen name="trip/[tripId]" />
    </Stack>
  );
}
