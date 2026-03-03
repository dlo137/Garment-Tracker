import { useRouter } from 'expo-router';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import { useTheme } from '../hooks/useTheme';

export default function Subscription() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SubscriptionScreen
      theme={theme}
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
