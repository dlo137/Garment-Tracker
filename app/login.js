import { useRouter } from 'expo-router';
import SignInScreen from '../screens/SignInScreen';
import { useTheme } from '../hooks/useTheme';

export default function SignInRoute() {
  const router = useRouter();
  const { theme } = useTheme();

  const navigation = {
    goBack: () => router.back(),
    navigate: (screen) => {
      if (screen === 'SignUp') {
        router.push('/signup');
      }
    },
  };

  return <SignInScreen navigation={navigation} theme={theme} />;
}
