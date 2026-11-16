import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/admin/DashboardScreen';
import OrderManagementScreen from '../screens/admin/OrderManagementScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import TableManagementScreen from '../screens/admin/TableManagementScreen';
import PaymentManagementScreen from '../screens/admin/PaymentManagementScreen';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../constants/spacing';
import { FONTS } from '../constants/typography';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Dashboard: { icon: 'stats-chart', key: 'secondary' },
  Orders: { icon: 'cart', key: 'primary' },
  Inventory: { icon: 'restaurant', key: 'warning' },
  Tables: { icon: 'grid', key: 'secondaryLight' },
  Payments: { icon: 'card', key: 'accent' },
};

const TabIcon = ({ name, focused, colors, isDesktop }) => {
  const config = TAB_CONFIG[name];
  const activeColor = colors[config.key] || colors.primary;
  return (
    <View style={[styles.iconWrap, isDesktop && styles.iconWrapDesktop, focused && { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons
        name={focused ? config.icon : `${config.icon}-outline`}
        size={isDesktop ? 18 : 20}
        color={focused ? activeColor : colors.textLight}
      />
    </View>
  );
};

const AdminNavigator = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  const isDesktop = Platform.OS === 'web' && width >= 768;
  const tabHeight = isDesktop
    ? 58
    : Platform.select({ web: 82, default: Math.max(76, 60 + insets.bottom) });
  const tabPaddingBottom = isDesktop
    ? 0
    : Platform.select({ web: 18, default: Math.max(14, insets.bottom + 8) });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name];
        const activeColor = colors[config.key] || colors.primary;
        return {
          tabBarPosition: isDesktop ? 'top' : 'bottom',
          tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} colors={colors} isDesktop={isDesktop} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                isDesktop && styles.tabLabelDesktop,
                { color: focused ? activeColor : colors.textLight },
                focused && { fontWeight: '700' },
              ]}
            >
              {route.name}
            </Text>
          ),
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.divider,
              borderBottomColor: colors.divider,
              borderTopWidth: isDesktop ? 0 : 1,
              borderBottomWidth: isDesktop ? 1 : 0,
              height: tabHeight,
              paddingBottom: tabPaddingBottom,
              paddingTop: isDesktop ? 0 : 6,
            },
            isDesktop && styles.tabBarDesktop,
          ],
          tabBarItemStyle: [styles.tabItem, isDesktop && styles.tabItemDesktop],
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrderManagementScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Tables" component={TableManagementScreen} />
      <Tab.Screen name="Payments" component={PaymentManagementScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 6,
    overflow: 'visible',
    ...Platform.select({
      ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 16px rgba(43, 24, 16, 0.05)' },
    }),
  },
  tabBarDesktop: {
    paddingTop: 0,
    paddingBottom: 0,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(43, 24, 16, 0.06)',
      },
    }),
  },
  tabItem: {
    paddingTop: 2,
    paddingBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: TOUCH_TARGET.min,
  },
  tabItemDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapDesktop: {
    width: 28,
    height: 28,
    marginRight: 4,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: FONTS.sans,
    textAlign: 'center',
  },
  tabLabelDesktop: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 0,
    fontWeight: '600',
    textAlign: 'left',
  },
});

export default AdminNavigator;
