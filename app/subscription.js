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
        navigate: (screen, params) => {
          if (screen === 'folders') router.replace('/');
          else if (params) router.push({ pathname: `/${screen}`, params });
          else router.push(`/${screen}`);
        },
      }}
    />
  );
}
