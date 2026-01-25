import React, { useRef } from 'react';
import { View, Pressable, Animated, StyleSheet, Easing, Platform, Image } from 'react-native';

import sun from '../assets/sun.png';
import moon from '../assets/moon.png';
import lightSun from '../assets/light-sun.png';
import lightMoon from '../assets/light-moon.png';

export const ModernThemeSwitch = ({ value, onToggle, accessibilityLabel = 'Toggle dark/light mode' }) => {
  // value: false = light, true = dark
  // Animate icon scale/opacity for feedback
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const sunOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
  const sunScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] });
  const moonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const moonScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] });

  // Swap: sunIcon is sun in light mode, lightSun in dark mode
  // value: false = light, true = dark
  const sunIcon = value ? lightSun : sun;
  const moonIcon = value ? lightMoon : moon;

  // Animated circle position and color
  // Animate pill position
  const pillLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [4, 44] });
  // Use pure white and pure dark
  const pillColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fff', '#23272F'],
  });

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      style={({ pressed, focused }) => [
        styles.switchBase,
        {
          backgroundColor: value ? '#363738' : '#e4e7eb',
          borderColor: focused ? '#60A5FA' : 'transparent',
        },
        pressed && styles.switchPressed,
      ]}
      android_ripple={{ color: '#cbd5e1', borderless: true }}
      focusable={true}
    >
      {/* Animated circle behind active icon */}
      <Animated.View
        style={[
          styles.pill,
          {
            left: pillLeft,
            backgroundColor: pillColor,
          },
        ]}
      />
      <Animated.Image
        source={sunIcon}
        style={[
          styles.icon,
          { left: 11, opacity: sunOpacity, transform: [{ scale: sunScale }] },
        ]}
        resizeMode="contain"
        accessibilityLabel="Light mode"
      />
      <Animated.Image
        source={moonIcon}
        style={[
          styles.icon,
          { left: 51, opacity: moonOpacity, transform: [{ scale: moonScale }] },
        ]}
        resizeMode="contain"
        accessibilityLabel="Dark mode"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switchBase: {
    width: 88,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    backgroundColor: '#e4e7eb',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  switchPressed: {
    opacity: 0.92,
  },
  icon: {
    width: 22,
    height: 22,
    position: 'absolute',
    top: 11,
    zIndex: 2,
  },
  pill: {
    position: 'absolute',
    top: 6,
    width: 36,
    height: 32,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
