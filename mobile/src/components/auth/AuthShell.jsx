import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../constants/typography';
import { RADIUS } from '../../constants/spacing';
import { SHADOWS } from '../../constants/colors';

export default function AuthShell({ title, subtitle, children }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const wide = width >= 900;
  const compact = width < 480;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scroll,
            {
              justifyContent: wide ? 'center' : 'flex-start',
              paddingTop: Math.max(16, insets.top + 12),
              paddingBottom: Math.max(80, insets.bottom + 60),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.layout, wide && styles.wide]}>
            <View style={[styles.story, wide && styles.storyWide]}>
              <View style={styles.brand}>
                <View style={[styles.brandMark, { backgroundColor: isDark ? colors.surfaceAlt : colors.primary }]}>
                  <Ionicons name="cafe" size={compact ? 19 : 22} color={isDark ? colors.accent : colors.surface} />
                </View>
                <Text style={[styles.brandName, { color: colors.text, fontFamily: FONTS.serif }, compact && { fontSize: 22 }]}>
                  Cafe<Text style={{ color: colors.accent }}>Sync</Text>
                  <Text style={{ color: colors.copper }}>.</Text>
                </Text>
              </View>

              {wide && <Text style={[styles.headline, { color: colors.text }]}>Order ahead or book a table.</Text>}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.divider },
                SHADOWS.card.web,
                compact && styles.cardCompact,
                wide && styles.cardWide,
              ]}
            >
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text, fontFamily: FONTS.serif }, compact && { fontSize: 21 }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMid }, compact && { marginBottom: 16 }]}>{subtitle}</Text>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  layout: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: 20,
  },
  wide: {
    maxWidth: 1100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 72,
  },
  story: { gap: 10 },
  storyWide: { flex: 1, paddingVertical: 24, gap: 14 },
  brand: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
    fontWeight: '700',
  },
  card: {
    padding: 24,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
  },
  cardCompact: {
    padding: 18,
    borderRadius: RADIUS.xl,
  },
  cardWide: {
    width: 440,
    padding: 36,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
    fontFamily: FONTS.sans,
  },
});
