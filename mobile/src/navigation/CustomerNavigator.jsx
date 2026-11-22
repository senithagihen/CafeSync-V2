import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/customer/HomeScreen';
import OrderScreen from '../screens/customer/OrderScreen';
import ReservationScreen from '../screens/customer/ReservationScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedCardsScreen from '../screens/customer/SavedCardsScreen';
import AssistantScreen from '../screens/customer/AssistantScreen';
import CartScreen from '../screens/customer/CartScreen';
import FloatingAssistiveAssistant from '../components/common/FloatingAssistiveAssistant';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../constants/typography';
import { RADIUS, TOUCH_TARGET } from '../constants/spacing';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = {
  Home:         { label: 'Menu',     icon: 'cafe'     },
  Orders:       { label: 'Orders',   icon: 'receipt'  },
  Reservations: { label: 'Reserve',  icon: 'calendar' },
  Payments:     { label: 'Payments', icon: 'card'     },
  Profile:      { label: 'Profile',  icon: 'person'   },
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();

  const isDesktop = Platform.OS === 'web' && width >= 768;
  const tabHeight = isDesktop
    ? 58
    : Platform.select({ web: 82, default: Math.max(76, 60 + insets.bottom) });
  const tabPaddingBottom = isDesktop
    ? 0
    : Platform.select({ web: 18, default: Math.max(14, insets.bottom + 8) });

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarPosition: isDesktop ? 'top' : 'bottom',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarIcon: ({ focused }) => {
          const tab = TABS[route.name];
          return (
            <View
              style={[
                styles.iconWrap,
                isDesktop && styles.iconWrapDesktop,
                focused && [styles.activeIconWrap, { backgroundColor: colors.surfaceAlt }],
              ]}
            >
              <Ionicons
                name={focused ? tab.icon : `${tab.icon}-outline`}
                size={isDesktop ? 18 : 20}
                color={focused ? (isDark ? colors.accent : colors.primary) : colors.textLight}
              />
            </View>
          );
        },
        tabBarLabel: ({ focused }) => (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              isDesktop && styles.labelDesktop,
              { color: focused ? (isDark ? colors.accent : colors.primary) : colors.textLight },
              focused && styles.activeLabel,
            ]}
          >
            {TABS[route.name].label}
          </Text>
        ),
        tabBarStyle: [
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderTopColor:  colors.divider,
            borderBottomColor: colors.divider,
            borderTopWidth:  isDesktop ? 0 : 1,
            borderBottomWidth: isDesktop ? 1 : 0,
            height:          tabHeight,
            paddingBottom:   tabPaddingBottom,
            paddingTop:      isDesktop ? 0 : 6,
          },
          isDesktop && styles.barDesktop,
        ],
        tabBarItemStyle: [styles.item, isDesktop && styles.itemDesktop],
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen}          options={{ tabBarAccessibilityLabel: 'Cafe Menu' }} />
      <Tab.Screen name="Orders"       component={OrderScreen}         options={{ tabBarAccessibilityLabel: 'My Orders' }} />
      <Tab.Screen name="Reservations" component={ReservationScreen}   options={{ tabBarAccessibilityLabel: 'Table Reservations' }} />
      <Tab.Screen name="Payments"     component={PaymentHistoryScreen} options={{ tabBarAccessibilityLabel: 'Payment History' }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}        options={{ tabBarAccessibilityLabel: 'User Profile' }} />
    </Tab.Navigator>
  );
}

function CustomerTabsScreen({ navigation }) {
  return (
    <View style={styles.tabsContainer}>
      <TabNavigator />
      <FloatingAssistiveAssistant
        onPress={(initialMessage) =>
          navigation.navigate('Assistant', initialMessage ? { initialMessage } : undefined)
        }
      />
    </View>
  );
}

export default function CustomerNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabsScreen} />
      <Stack.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen name="SavedCards" component={SavedCardsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flex: 1,
    position: 'relative',
  },
  bar: {
    borderTopWidth: 1,
    paddingTop: 6,
    overflow: 'visible',
    ...Platform.select({
      ios:     { shadowColor: '#2B1810', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 10 },
      web:     { boxShadow: '0 -4px 16px rgba(43,24,16,0.05)' },
    }),
  },
  barDesktop: {
    paddingTop: 0,
    paddingBottom: 0,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(43,24,16,0.06)',
      },
    }),
  },
  item: {
    paddingTop: 2, paddingBottom: 2,
    justifyContent: 'center', alignItems: 'center',
    minHeight: TOUCH_TARGET.min,
  },
  itemDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  iconWrap:   { width: 38, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  iconWrapDesktop: { width: 28, height: 28, marginRight: 4 },
  activeIconWrap: { borderRadius: RADIUS.md },
  label: {
    fontSize: 11, lineHeight: 14, fontWeight: '500',
    fontFamily: FONTS.sans, marginTop: 2, textAlign: 'center',
  },
  labelDesktop: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 0,
    fontWeight: '600',
    textAlign: 'left',
  },
  activeLabel: { fontWeight: '700' },
});
