import { orderReference, itemCount } from '../../utils/orderDisplay';
import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform, Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { adminOrdersAPI, adminInventoryAPI, adminReservationsAPI, adminPaymentsAPI, notificationAPI } from '../../api';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';
import AdminAssistantModal from '../../components/admin/AdminAssistantModal';
import StaffNotificationModal from '../../components/admin/StaffNotificationModal';

const StatCard = ({ icon, label, value, color, delay, colors }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 7, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.divider,
          borderTopColor: color,
          borderTopWidth: 3,
          transform: [{ scale: anim }],
          opacity: anim,
        },
        SHADOWS.card.web,
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color: colors.text, fontFamily: FONTS.serif }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textLight }]} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
};

const DashboardScreen = () => {
  const { logout } = useContext(AuthContext);
  const { colors, isDark, toggleTheme } = useTheme();

  const [data, setData] = useState({ orders: [], inventory: [], reservations: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const headerAnim = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const STATUS_COLORS = {
    Pending: colors.warning,
    Preparing: colors.accent,
    Ready: colors.success,
    Completed: colors.textLight,
    Cancelled: colors.danger,
  };

  useEffect(() => {
    fetchAll();
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [headerAnim, headerOpacity]);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationAPI.unreadCount();
      setUnreadAlertsCount(res.data?.unreadCount || 0);
    } catch { }
  };

  const fetchAll = async () => {
    try {
      const [o, i, r, p, n] = await Promise.all([
        adminOrdersAPI.getAll(),
        adminInventoryAPI.getAll(),
        adminReservationsAPI.getAll(),
        adminPaymentsAPI.getAll(),
        notificationAPI.unreadCount().catch(() => ({ data: { unreadCount: 0 } })),
      ]);
      setData({
        orders: o.data.data || [],
        inventory: i.data.data || [],
        reservations: r.data.data || [],
        payments: p.data.data || [],
      });
      setUnreadAlertsCount(n.data?.unreadCount || 0);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pendingOrders = data.orders.filter((o) => o.status === 'Pending').length;
  const unpaidOrders = data.orders.filter((o) => o.paymentStatus === 'Pending' && o.status !== 'Cancelled').length;
  const lowStock = data.inventory.filter((i) => i.stock < 5).length;
  const todayRes = data.reservations.filter((r) => new Date(r.date).toDateString() === new Date().toDateString()).length;
  const dineInCount = data.orders.filter((o) => (o.orderType || 'Dine-In') === 'Dine-In').length;
  const takeawayCount = data.orders.filter((o) => o.orderType === 'Takeaway').length;
  const deliveryCount = data.orders.filter((o) => o.orderType === 'Online Delivery').length;
  const recentOrders = data.orders.slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.divider,
            transform: [{ translateY: headerAnim }],
            opacity: headerOpacity,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <HeaderBrandLogo targetScreen="Dashboard" size={34} />
            <View style={styles.headerTitles}>
              <Text style={[styles.headerSup, { color: colors.accent }]} numberOfLines={1}>CAFE MANAGEMENT</Text>
              <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]} numberOfLines={1}>
                Dashboard
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Notification Bell */}
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={() => setShowNotificationModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Staff Notifications"
            >
              <Ionicons name="notifications-outline" size={17} color={unreadAlertsCount > 0 ? colors.warning : colors.textMid} />
              {unreadAlertsCount > 0 && (
                <View style={[styles.badgeDot, { backgroundColor: colors.danger }]}>
                  <Text style={styles.notifBadgeText}>{unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Admin AI Assistant Button */}
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={() => setShowAssistantModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Admin Operations Assistant"
            >
              <Ionicons name="sparkles" size={16} color={colors.accent || colors.primary} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={toggleTheme}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to Day theme' : 'Switch to Night theme'}
            >
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={colors.accent} />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={logout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign out from admin panel"
            >
              <Ionicons name="log-out-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.accent} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Operations Assistant & Smart Alerts Card */}
            <View style={[styles.aiBanner, { backgroundColor: colors.surface, borderColor: colors.divider }, SHADOWS.card.web]}>
              <View style={styles.aiBannerLeft}>
                <View style={[styles.aiIconBg, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="sparkles" size={20} color={colors.accent || colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiBannerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>Operations Assistant</Text>
                  <Text style={[styles.aiBannerSub, { color: colors.textLight }]}>
                    {unreadAlertsCount > 0 ? `${unreadAlertsCount} active stock alerts need attention` : 'Sales analysis, low stock warnings & order pipeline'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.aiBannerBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAssistantModal(true)}
                >
                  <Ionicons name="chatbubbles-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.aiBannerBtnText}>Ask Assistant</Text>
                </TouchableOpacity>
                {unreadAlertsCount > 0 && (
                  <TouchableOpacity
                    style={[styles.aiBannerBtn, { backgroundColor: colors.warning }]}
                    onPress={() => setShowNotificationModal(true)}
                  >
                    <Ionicons name="alert-circle-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.aiBannerBtnText}>Review Alerts</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Stats Grid */}
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Overview
            </Text>
            <View style={styles.statsGrid}>
              <StatCard icon="cart" label="Pending Orders" value={pendingOrders} color={colors.warning} delay={0} colors={colors} />
              <StatCard icon="cash" label="Unpaid Tabs" value={unpaidOrders} color={colors.danger} delay={60} colors={colors} />
              <StatCard icon="calendar" label="Today's Tables" value={todayRes} color={colors.info} delay={120} colors={colors} />
              <StatCard icon="warning" label="Low stock" value={lowStock} color={colors.accent} delay={180} colors={colors} />
            </View>

            {/* Order Types */}
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Dining Types
            </Text>
            <View style={styles.summaryRow}>
              {[
                { icon: 'restaurant', label: 'Dine-In', value: dineInCount, color: colors.primary },
                { icon: 'bag-handle', label: 'Takeaway', value: takeawayCount, color: colors.accent },
                { icon: 'bicycle', label: 'Delivery', value: deliveryCount, color: colors.info },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.divider,
                      borderTopColor: item.color,
                    },
                    SHADOWS.card.web,
                  ]}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={[styles.summaryValue, { color: colors.text, fontFamily: FONTS.serif }]}>{item.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent Orders */}
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Recent Orders
            </Text>
            {recentOrders.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                <Ionicons name="cart-outline" size={38} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No recent orders</Text>
              </View>
            ) : (
              recentOrders.map((order) => {
                const payColor = order.paymentStatus === 'Paid' ? colors.success : order.paymentStatus === 'Failed' ? colors.danger : colors.warning;
                return (
                  <View
                    key={order._id}
                    style={[
                      styles.orderCard,
                      { backgroundColor: colors.surface, borderColor: colors.divider },
                      SHADOWS.card.web,
                    ]}
                  >
                    <View style={[styles.orderDot, { backgroundColor: STATUS_COLORS[order.status] || colors.primary }]} />
                    <View style={[styles.orderInfo, { minWidth: 0 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={order.orderType === 'Dine-In' ? 'restaurant-outline' : order.orderType === 'Takeaway' ? 'bag-handle-outline' : 'bicycle-outline'}
                          size={14}
                          color={colors.textMid}
                        />
                        <Text style={[styles.orderId, { color: colors.text }]} numberOfLines={1}>#{orderReference(order._id)}</Text>
                      </View>
                      <Text style={[styles.orderMeta, { color: colors.textMid }]} numberOfLines={1}>
                        {itemCount(order.items?.length)} · Rs. {order.totalAmount?.toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                      <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[order.status] || colors.primary) + '18' }]}>
                        <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status] || colors.primary }]} numberOfLines={1}>
                          {order.status}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: payColor + '18' }]}>
                        <Text style={[styles.badgeText, { color: payColor }]} numberOfLines={1}>
                          {order.paymentStatus || 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Admin Operations AI Assistant Modal */}
      <AdminAssistantModal
        visible={showAssistantModal}
        onClose={() => setShowAssistantModal(false)}
        dashboardData={data}
      />

      {/* Staff Low-Stock & Operational Alerts Modal */}
      <StaffNotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onRefreshCount={fetchUnreadCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  headerSup: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: FONTS.sans,
    marginBottom: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  actionPill: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  themePill: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { fontWeight: '700', fontSize: 13, fontFamily: FONTS.sans },
  scroll: {
    padding: 20,
    paddingBottom: 130,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  aiBanner: {
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  aiBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  aiBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '48%',
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center', fontFamily: FONTS.sans },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderTopWidth: 3,
  },
  summaryValue: { fontSize: 17, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontFamily: FONTS.sans },
  emptyCard: {
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, fontFamily: FONTS.sans },
  orderCard: {
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  orderDot: { width: 8, height: 8, borderRadius: 4 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  orderMeta: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sans },
});

export default DashboardScreen;
