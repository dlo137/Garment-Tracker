import { useRouter } from 'expo-router';
import SubscriptionScreen from '../screens/SubscriptionScreen';

export default function Subscription() {
  const router = useRouter();

  return (
    <SubscriptionScreen
      navigation={{
        goBack: () => router.back(),
        navigate: (screen) => {
          if (screen === 'folders') router.replace('/');
          else router.push(`/${screen}`);
        },
      }}
    />
  );
}
