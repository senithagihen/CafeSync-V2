import { orderReference } from '../../utils/orderDisplay';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, RefreshControl,
  ScrollView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminOrdersAPI } from '../../api';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { Alert } from '../../utils/alert';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_FLOW = { Pending: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };

const STATUS_CONFIG = {
  Pending:   { color: COLORS.warning, icon: 'time-outline', label: 'Pending' },
  Preparing: { color: COLORS.info,    icon: 'restaurant-outline', label: 'Preparing' },
  Ready:     { color: COLORS.success, icon: 'checkmark-circle-outline', label: 'Ready' },
  Completed: { color: COLORS.textLight, icon: 'sparkles-outline', label: 'Completed' },
  Cancelled: { color: COLORS.danger,  icon: 'close-circle-outline', label: 'Cancelled' },
};

const ORDER_TYPE_CONFIG = {
  'Dine-In':         { icon: 'restaurant', color: COLORS.primary },
  'Takeaway':        { icon: 'bag-handle', color: COLORS.accent },
  'Online Delivery': { icon: 'bicycle',    color: COLORS.info },
};

const PAY_STATUS_CONFIG = {
  Pending: { color: COLORS.warning, icon: 'time-outline' },
  Paid:    { color: COLORS.success, icon: 'checkmark-circle' },
  Failed:  { color: COLORS.danger,  icon: 'close-circle' },
};

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onUpdateStatus, onUpdatePayment, onDelete, updatingId, colors }) => {
  const sCfg         = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
  const nextStatus   = STATUS_FLOW[order.status];
  const typeConfig   = ORDER_TYPE_CONFIG[order.orderType] || ORDER_TYPE_CONFIG['Dine-In'];
  const payCfg       = PAY_STATUS_CONFIG[order.paymentStatus] || PAY_STATUS_CONFIG.Pending;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIconBg, { backgroundColor: typeConfig.color + '12' }]}>
          <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
        </View>
        <View style={styles.cardHeaderMain}>
          <View style={styles.cardHeaderTop}>
            <Text style={[styles.orderIdText, { color: colors.text }]}>#{orderReference(order._id)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: sCfg.color + '15' }]}>
              <Text style={[styles.statusBadgeText, { color: sCfg.color }]}>{order.status}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.customerName, { color: colors.textLight }]}>{order.customer?.name || 'Walk-in Customer'}</Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.trashBtn, { backgroundColor: colors.dangerLight }]} 
              accessibilityLabel={`Delete order ${orderReference(order._id)}`} onPress={() => onDelete(order._id)}
              disabled={!!updatingId}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.metaStrip, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={colors.textLight} />
          <Text style={[styles.metaText, { color: colors.textMid }]}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="card-outline" size={12} color={payCfg.color} />
          <Text style={[styles.metaText, { color: payCfg.color, fontWeight: '800' }]}>{order.paymentStatus || 'Pending'}</Text>
        </View>
        {order.tableNumber && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>Table {order.tableNumber}</Text>
          </View>
        )}
      </View>

      <View style={[styles.itemsBox, { borderBottomColor: colors.divider }]}>
        {order.items?.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{it.name}</Text>
            <Text style={[styles.itemQty, { color: colors.textLight }]}>×{it.quantity}</Text>
            <Text style={[styles.itemTotal, { color: colors.text }]}>Rs. {(it.price * it.quantity).toFixed(0)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textLight }]}>Grand Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>Rs. {order.totalAmount?.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {nextStatus && (
          <TouchableOpacity accessibilityRole="button"
            style={[styles.mainAction, { backgroundColor: STATUS_CONFIG[nextStatus].color }]}
            onPress={() => onUpdateStatus(order._id, nextStatus)}
            disabled={!!updatingId}
          >
            {updatingId === order._id + 'status' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionText}>Move to {nextStatus}</Text>
            )}
          </TouchableOpacity>
        )}
        
        {order.paymentStatus === 'Pending' && (
          <TouchableOpacity accessibilityRole="button"
            style={[styles.secAction, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            onPress={() => onUpdatePayment(order._id, 'Paid')}
            disabled={!!updatingId}
          >
            {updatingId === order._id + 'pay' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.secActionText, { color: colors.primary }]}>Mark as Paid</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const OrderManagementScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [updatingId, setUpdatingId]     = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchOrders();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Auto-refresh every 10 seconds for "Live" updates
    const timer = setInterval(fetchOrders, 10000);
    return () => clearInterval(timer);
  }, [fadeAnim]);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(id + 'delete');
            try {
              await adminOrdersAPI.deleteOrder(id);
              setOrders(prev => prev.filter(o => o._id !== id));
            } catch (e) {
              Alert.alert('Delete Failed', e.message || 'Could not delete order');
            } finally { setUpdatingId(null); }
          }
        }
      ]
    );
  };

  const fetchOrders = async () => {
    try {
      const res = await adminOrdersAPI.getAll();
      setOrders(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id + 'status');
    try {
      await adminOrdersAPI.updateStatus(id, status);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Could not update order status');
    } finally { setUpdatingId(null); }
  };

  const updatePayment = async (id, paymentStatus) => {
    setUpdatingId(id + 'pay');
    try {
      await adminOrdersAPI.updatePaymentStatus(id, paymentStatus);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, paymentStatus } : o));
    } catch (e) {
      Alert.alert('Payment Update Failed', e.message || 'Could not update payment status');
    } finally { setUpdatingId(null); }
  };

  const allStatuses  = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
  const allTypes     = ['Dine-In', 'Takeaway', 'Online Delivery'];

  const activeCount = orders.filter(order => ['Pending', 'Preparing', 'Ready'].includes(order.status)).length;
  const filtered = orders.filter(o => {
    const statusOk = statusFilter === 'All' || o.status === statusFilter;
    const typeOk   = typeFilter   === 'All' || (o.orderType || 'Dine-In') === typeFilter;
    return statusOk && typeOk;
  });

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={[styles.hero, { backgroundColor: colors.background }]}>
        <View style={styles.heroTop}>
          <View style={styles.headerLeft}>
            <HeaderBrandLogo targetScreen="Dashboard" size={34} />
            <View style={styles.headerTitles}>
              <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>Orders</Text>
              <Text style={[styles.heroSub, { color: colors.textLight }]} numberOfLines={1}>{activeCount} active · {orders.length} total</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.themePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to Day theme' : 'Switch to Night theme'}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', ...allTypes].map(item => {
            const active = typeFilter === item;
            const cfg = ORDER_TYPE_CONFIG[item];
            const color = cfg?.color || colors.secondary;
            return (
              <TouchableOpacity accessibilityRole="button"
                key={item}
                style={[
                  styles.chip,
                  { backgroundColor: active ? color : colors.surface, borderColor: active ? color : colors.divider },
                ]}
                onPress={() => setTypeFilter(item)}
              >
                <View style={styles.chipContent}>
                  <Ionicons name={item === 'All' ? 'grid' : cfg?.icon} size={14} color={active ? COLORS.white : color} />
                  <Text style={[styles.chipText, { color: active ? COLORS.white : colors.textMid }]}>{item}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: 10 }]}>
          {['All', ...allStatuses].map(item => {
            const active = statusFilter === item;
            const color = STATUS_CONFIG[item]?.color || colors.secondary;
            const cnt = item === 'All' ? orders.length : orders.filter(o => o.status === item).length;
            return (
              <TouchableOpacity accessibilityRole="button"
                key={item}
                style={[
                  styles.chip,
                  { backgroundColor: active ? color : colors.surface, borderColor: active ? color : colors.divider },
                ]}
                onPress={() => setStatusFilter(item)}
              >
                <View style={styles.chipContent}>
                  <Ionicons name={item === 'All' ? 'list' : STATUS_CONFIG[item]?.icon} size={14} color={active ? COLORS.white : color} />
                  <Text style={[styles.chipText, { color: active ? COLORS.white : colors.textMid }]}>{item}</Text>
                  {cnt > 0 && <View style={styles.countTag}><Text style={[styles.countTagText, { color: active ? color : COLORS.white }]}>{cnt}</Text></View>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onUpdateStatus={updateStatus}
              onUpdatePayment={updatePayment}
              onDelete={handleDelete}
              updatingId={updatingId}
              colors={colors}
            />
          )}
          ListEmptyComponent={!loading && (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={60} color={colors.divider} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Found</Text>
              <Text style={[styles.emptySub, { color: colors.textLight }]}>Adjust your filters to see more orders.</Text>
            </View>
          )}
        />
      </Animated.View>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },

  headerSection: { marginBottom: 10 },
  hero: {
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 35, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themePill: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 },
  headerTitles: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  heroBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 
  },
  heroBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },

  filterBar: { marginTop: 20 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },
  countTag: { backgroundColor: COLORS.textMid, paddingHorizontal: 6, borderRadius: 8 },
  countTagText: { fontSize: 10, fontWeight: '900', color: COLORS.white },

  listContainer: { paddingBottom: 130 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 24, marginHorizontal: 20,
    marginBottom: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.divider,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 3 } }),
  },
  cardHeader: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  typeIconBg: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardHeaderMain: { flex: 1, justifyContent: 'center' },
  cardHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdText: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  customerName: { fontSize: 13, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  trashBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },

  metaStrip: { 
    flexDirection: 'row', gap: 14, 
    backgroundColor: COLORS.background, padding: 12, borderRadius: 16, marginBottom: 16 
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },

  itemsBox: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, color: COLORS.textMid },
  itemQty: { fontSize: 12, color: COLORS.textLight, width: 30, textAlign: 'center' },
  itemTotal: { fontSize: 13, fontWeight: '700', color: COLORS.text, width: 60, textAlign: 'right' },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  totalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase' },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  cardActions: { marginTop: 16, gap: 10 },
  mainAction: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  secAction: { 
    height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.successLight, borderWidth: 1.5, borderColor: COLORS.success 
  },
  secActionText: { color: COLORS.success, fontSize: 14, fontWeight: '800' },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 50 },
});

export default OrderManagementScreen;
