// Voice is a tab-bar action. Direct links return to the employee dashboard.
import { Redirect } from 'expo-router';
export default function VoiceRoute() {
  return <Redirect href="/(employee)/today" />;
}
