import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';

const CartScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { cartCount, cartTotal } = useCart();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={[styles.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </TouchableOpacity>
          <HeaderBrandLogo size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.headerSup, { color: colors.accent }]} numberOfLines={1}>YOUR BAG</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]} numberOfLines={1}>
              Cafe Bag
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconBg, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
          <Ionicons name="bag-handle-outline" size={44} color={colors.primary} />
        </View>

        <Text style={[styles.eyebrow, { color: colors.accent }]}>A LITTLE TIME FOR YOURSELF</Text>
        <Text style={[styles.title, { color: colors.text, fontFamily: FONTS.serif }]}>
          Your Cafe Bag
        </Text>

        <Text style={[styles.sub, { color: colors.textMid }]}>
          {cartCount > 0
            ? `You have ${cartCount} handcrafted ${cartCount === 1 ? 'item' : 'items'} in your bag (Rs. ${cartTotal.toFixed(2)}). Ready to review and order?`
            : `Your bag is currently empty. Explore our roasts and warm bakery treats, then tap the floating bag to check out.`}
        </Text>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, SHADOWS.card.web]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Home', cartCount > 0 ? { openCart: true } : undefined)}
          accessibilityRole="button"
        >
          <Ionicons name={cartCount > 0 ? "checkmark-circle-outline" : "cafe-outline"} size={20} color={colors.surface} />
          <Text style={[styles.btnText, { color: colors.surface }]}>
            {cartCount > 0 ? `Review & Place Order (Rs. ${cartTotal.toFixed(2)})` : 'Browse Menu'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.divider }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Payments')}
          accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={18} color={colors.textMid} />
          <Text style={[styles.secondaryBtnText, { color: colors.textMid }]}>View Order & Tab Receipts</Text>
        </TouchableOpacity>
      </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSup: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: FONTS.sans,
    marginBottom: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    maxWidth: 440,
    width: '100%',
    gap: 14,
  },
  iconBg: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    fontFamily: FONTS.sans,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FONTS.sans,
    marginBottom: 10,
  },
  highlight: { fontWeight: '700' },
  btn: {
    minHeight: TOUCH_TARGET.largeButton,
    borderRadius: RADIUS.base,
    paddingHorizontal: 28,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: { fontWeight: '700', fontSize: 15, fontFamily: FONTS.sans },
  secondaryBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    paddingHorizontal: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 14, fontFamily: FONTS.sans },
});

export default CartScreen;
