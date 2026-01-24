import React, { useRef } from 'react';
import { View, Pressable, Animated, StyleSheet, Easing, Platform } from 'react-native';

export const ModernThemeSwitch = ({ value, onToggle, accessibilityLabel = 'Toggle dark/light mode' }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [value]);

  // Knob position interpolates from left (0) to right (1)
  // For a 72px wide switch, 28px knob, 4px padding each side:
  // Max translateX = width - knob - 2*padding = 72 - 28 - 8 = 36
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 30], // 4px padding, 30px slide (keeps knob perfectly inside)
  });
  const knobScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1], // scale stays 1, but can animate on press
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
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: value ? '#F1F5F9' : '#1E293B',
            shadowColor: value ? '#60A5FA' : '#000',
            shadowOpacity: value ? 0.25 : 0.15,
            shadowRadius: value ? 8 : 4,
            shadowOffset: { width: 0, height: 2 },
            transform: [
              { translateX },
              { scale: knobScale },
            ],
            elevation: value ? 4 : 2,
          },
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switchBase: {
     width: 72,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'flex-start',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  switchPressed: {
    opacity: 0.92,
  },
  knob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
