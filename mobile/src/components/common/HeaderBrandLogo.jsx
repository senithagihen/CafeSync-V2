import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/spacing';

export default function HeaderBrandLogo({ size = 36, style, onPress, targetScreen = 'Home' }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      navigation.navigate(targetScreen);
    } catch {
      try {
        navigation.navigate('CustomerTabs', { screen: targetScreen });
      } catch {
        // Fallback
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel="CafeSync Logo - Return to Home"
      accessibilityHint="Navigates back to the main home screen"
      style={[
        styles.logoBtn,
        {
          width: size,
          height: size,
          borderRadius: RADIUS.md,
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(217, 119, 74, 0.35)' : 'rgba(217, 119, 74, 0.20)',
        },
        style,
      ]}
    >
      <Ionicons name="cafe" size={Math.round(size * 0.52)} color={colors.surface} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  logoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2B1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

