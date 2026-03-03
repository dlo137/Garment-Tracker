import { useRouter } from 'expo-router';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../hooks/useTheme';

export default function ProfileRoute() {
  const router = useRouter();
  const { theme } = useTheme();

  const navigation = {
    goBack: () => router.back(),
    navigate: (screen) => {
      if (screen === 'Subscription') {
        router.push('/subscription');
      }
    },
  };

  return <ProfileScreen navigation={navigation} theme={theme} />;
}
