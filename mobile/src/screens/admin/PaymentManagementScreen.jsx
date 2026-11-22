import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, RefreshControl,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminPaymentsAPI } from '../../api';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { Alert } from '../../utils/alert';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';

const STATUS_CONFIG = {
  Pending:   { color: COLORS.warning, icon: 'time-outline' },
  Completed: { color: COLORS.success, icon: 'checkmark-circle-outline' },
  Failed:    { color: COLORS.danger,  icon: 'close-circle-outline' },
};

const PaymentManagementScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async () => {
    try {
      const res = await adminPaymentsAPI.getAll();
      setPayments(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id + status);
    try {
      await adminPaymentsAPI.updateStatus(id, { status });
      setPayments(prev => prev.map(p => p._id === id ? { ...p, status } : p));
    } catch (e) {
      Alert.alert('Payment Update Failed', e.response?.data?.error || e.message || 'Could not update payment status');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'All' ? payments : payments.filter(p => p.status === filter);
  const totalRevenue = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);

  const renderItem = ({ item: p }) => {
    const color = STATUS_CONFIG[p.status]?.color || colors.textLight;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBg, { backgroundColor: color + '12' }]}>
            <Ionicons name={STATUS_CONFIG[p.status]?.icon} size={24} color={color} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.amount, { color: colors.text }]}>Rs. {p.amount?.toFixed(2)}</Text>
            <Text style={[styles.meta, { color: colors.textMid }]}>{p.paymentMethod} • {p.customer?.name || 'Walk-in'}</Text>
            <Text style={[styles.date, { color: colors.textLight }]}>{new Date(p.createdAt).toLocaleString()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.badgeText, { color }]}>{p.status}</Text>
          </View>
        </View>

        {p.status === 'Pending' && (
          <View style={[styles.btnRow, { borderTopColor: colors.divider }]}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              onPress={() => updateStatus(p._id, 'Completed')}
              disabled={!!updating}
            >
              {updating === p._id + 'Completed'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionText}>Approve</Text>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]}
              onPress={() => updateStatus(p._id, 'Failed')}
              disabled={!!updating}
            >
              {updating === p._id + 'Failed'
                ? <ActivityIndicator size="small" color={colors.danger} />
                : <Text style={[styles.actionText, { color: colors.danger }]}>Reject</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={[styles.hero, { backgroundColor: colors.background }]}>
        <View style={styles.heroContent}>
          <View style={styles.headerLeft}>
            <HeaderBrandLogo targetScreen="Dashboard" size={34} />
            <View style={styles.headerTitles}>
              <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>Payment Admin</Text>
              <Text style={[styles.heroSub, { color: colors.textLight }]} numberOfLines={1}>{payments.length} total transactions</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              onPress={toggleTheme}
              style={[styles.themePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            >
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color={colors.accent || colors.primary} />
            </TouchableOpacity>
            <View style={[styles.revenueBadge, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Text style={[styles.revLabel, { color: colors.textLight }]}>Revenue</Text>
              <Text style={[styles.revValue, { color: colors.accent || colors.primary }]}>Rs. {totalRevenue.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {['Pending', 'Completed', 'Failed'].map(s => (
          <View key={s} style={[styles.statCard, { backgroundColor: colors.surface, borderTopColor: STATUS_CONFIG[s].color, borderColor: colors.divider }]}>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>{s}</Text>
            <Text style={[styles.statValue, { color: STATUS_CONFIG[s].color }]}>{payments.filter(p => p.status === s).length}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Pending', 'Completed', 'Failed'].map(item => {
            const active = filter === item;
            const cfg = STATUS_CONFIG[item] || { color: colors.accent || colors.primary, icon: 'card-outline' };
            return (
              <TouchableOpacity accessibilityRole="button"
                key={item}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.divider },
                  active && { backgroundColor: cfg.color, borderColor: cfg.color },
                ]}
                onPress={() => setFilter(item)}
              >
                <View style={styles.chipContent}>
                  <Ionicons name={cfg.icon} size={14} color={active ? COLORS.white : cfg.color} />
                  <Text style={[styles.chipText, { color: colors.textMid }, active && { color: COLORS.white }]}>{item}</Text>
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
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.accent || colors.primary} />}
        renderItem={renderItem}
        ListEmptyComponent={!loading && (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={60} color={colors.divider} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payments</Text>
            <Text style={[styles.emptySub, { color: colors.textLight }]}>No transaction records found matching this filter.</Text>
          </View>
        )}
      />
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
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  themePill: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  
  headerSection: { marginBottom: 10 },
  hero: {
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 35, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 },
  headerTitles: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  revenueBadge: { alignItems: 'flex-end', backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider, flexShrink: 0 },
  revLabel: { fontSize: 10, color: COLORS.textLight, textTransform: 'uppercase', fontWeight: '700' },
  revValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 12,
    borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.divider,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  filterSection: { marginTop: 24, marginBottom: 10 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },

  listContent: { paddingBottom: 130 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, marginHorizontal: 20,
    marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  amount: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textMid, marginTop: 2, fontWeight: '600' },
  date: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 16 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 50 },
});

export default PaymentManagementScreen;
