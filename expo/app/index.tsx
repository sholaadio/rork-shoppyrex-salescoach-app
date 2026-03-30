import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashLandingScreen() {
  const { user, isLoading, portal } = useAuth();
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSplashDone(true);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [logoScale, logoOpacity]);

  useEffect(() => {
    if (!splashDone || isLoading) return;

    if (user && portal) {
      router.replace(`/${portal}` as '/closer' | '/teamlead' | '/management');
    } else {
      router.replace('/login');
    }
  }, [splashDone, isLoading, user, portal, router]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={{ uri: 'https://r2-pub.rork.com/generated-images/4c404a99-156b-45db-88b1-ec4bcbaeb88f.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
