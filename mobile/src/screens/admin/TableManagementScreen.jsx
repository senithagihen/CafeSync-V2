import { orderReference, itemCount } from '../../utils/orderDisplay';
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminOrdersAPI, adminReservationsAPI } from '../../api';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { Alert } from '../../utils/alert';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';



// Standardized User-Friendly Color Palette using Design Tokens
const THEME = {
  Available: { main: COLORS.success, bg: COLORS.successLight, text: COLORS.success, label: 'Available' },
  Occupied: { main: COLORS.danger, bg: COLORS.dangerLight, text: COLORS.danger, label: 'Occupied' },
  Reserved: { main: COLORS.warning, bg: COLORS.warningLight, text: COLORS.warning, label: 'Reserved' },
};

const buildTables = (orders, reservations) =>
  Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    const activeOrder = orders.find(o =>
      !['Completed', 'Cancelled'].includes(o.status) &&
      (o.orderType === 'Dine-In' || !o.orderType) &&
      o.tableNumber === num
    );
    const activeRes = reservations.find(r =>
      r.tableNumber === num &&
      ['Confirmed', 'Pending'].includes(r.status) &&
      new Date(r.date).toDateString() === new Date().toDateString()
    );
    let status = 'Available';
    if (activeOrder) status = 'Occupied';
    else if (activeRes) status = 'Reserved';
    return { num, status, order: activeOrder, reservation: activeRes };
  });

const RES_STATUS_CONFIG = {
  Expired: { color: COLORS.textLight, icon: 'time-outline' },
  Pending: { color: THEME.Reserved.main, icon: 'time-outline' },
  Confirmed: { color: THEME.Available.main, icon: 'checkmark-circle-outline' },
  Cancelled: { color: THEME.Occupied.main, icon: 'close-circle-outline' },
  Completed: { color: COLORS.textLight, icon: 'sparkles-outline' },
};

const TableManagementScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('Map');
  const [selectedTable, setSelectedTable] = useState(null);
  const [resFilter, setResFilter] = useState('Upcoming');
  const [updatingRes, setUpdatingRes] = useState(null);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async () => {
    try {
      const [ordRes, resRes] = await Promise.all([
        adminOrdersAPI.getAll(),
        adminReservationsAPI.getAll(),
      ]);
      const fetchedReservations = resRes.data.data || [];
      setReservations(fetchedReservations);
      setTables(buildTables(ordRes.data.data || [], fetchedReservations));
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateResStatus = async (id, status) => {
    setUpdatingRes(id + status);
    try {
      await adminReservationsAPI.update(id, { status });
      fetchAll();
    } catch (e) {
      Alert.alert('Update Failed', e.response?.data?.error || e.message || 'Could not update reservation');
    } finally {
      setUpdatingRes(null);
    }
  };

  const handleDeleteRes = async (id) => {
    Alert.alert(
      'Delete Reservation',
      'Are you sure you want to delete this reservation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingRes(id + 'delete');
            try {
              await adminReservationsAPI.delete(id);
              fetchAll();
            } catch (e) {
              Alert.alert('Delete Failed', e.response?.data?.error || e.message || 'Could not delete reservation');
            } finally {
              setUpdatingRes(null);
            }
          }
        }
      ]
    );
  };

  const resStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  const upcoming = reservations.filter(r => ['Confirmed', 'Pending'].includes(r.status) && !r.pastSlot);
  const filteredReservations = resFilter === 'Upcoming' ? upcoming
    : resFilter === 'History' ? reservations.filter(r => !upcoming.includes(r))
    : resFilter === 'All' ? reservations : reservations.filter(r => r.status === resFilter);

  const renderReservationItem = ({ item: r }) => {
    const color = RES_STATUS_CONFIG[r.status]?.color || colors.textLight;
    return (
      <View style={[styles.resCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
        <View style={styles.resCardTop}>
          <View style={[styles.resIconBg, { backgroundColor: color + '12' }]}>
            <Ionicons name={RES_STATUS_CONFIG[r.status]?.icon} size={22} color={color} />
          </View>
          <View style={[styles.resInfo, { minWidth: 0 }]}>
            <Text style={[styles.resTableTitle, { color: colors.text }]} numberOfLines={1}>Table {r.tableNumber}</Text>
            <Text style={[styles.resCustomerName, { color: colors.textLight }]} numberOfLines={1}>{r.customer?.name || 'Customer'}</Text>
          </View>
          <View style={[styles.resBadge, { backgroundColor: color + '12' }]}>
            <Text style={[styles.resBadgeText, { color }]}>{r.status}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.resTrashBtn, { backgroundColor: colors.dangerLight }]} 
            accessibilityLabel={`Delete reservation for table ${r.tableNumber}`} onPress={() => handleDeleteRes(r._id)}
            disabled={!!updatingRes}
          >
            <Ionicons name="trash-outline" size={18} color={THEME.Occupied.main} />
          </TouchableOpacity>
        </View>

        <View style={styles.resMetaRow}>
          <View style={styles.resMetaItemRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.textLight} />
            <Text style={[styles.resMetaItem, { color: colors.textMid }]}>{new Date(r.date).toDateString()}</Text>
          </View>
          <View style={styles.resMetaItemRow}>
            <Ionicons name="time-outline" size={12} color={colors.textLight} />
            <Text style={[styles.resMetaItem, { color: colors.textMid }]}>{r.time}</Text>
          </View>
          <View style={styles.resMetaItemRow}>
            <Ionicons name="people-outline" size={12} color={colors.textLight} />
            <Text style={[styles.resMetaItem, { color: colors.textMid }]}>{r.guests} guests</Text>
          </View>
        </View>
        {r.specialRequests ? (
          <View style={[styles.resSpecialRow, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="document-text-outline" size={12} color={colors.textMid} />
            <Text style={[styles.resSpecial, { color: colors.textMid }]}>{r.specialRequests}</Text>
          </View>
        ) : null}

        <View style={styles.resBtnRow}>
          {r.status === 'Pending' && (
            <>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.resActionBtn, { backgroundColor: THEME.Available.main, flex: 1 }]}
                onPress={() => updateResStatus(r._id, 'Confirmed')}
                disabled={!!updatingRes}
              >
                {updatingRes === r._id + 'Confirmed'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.resActionText}>Confirm</Text>}
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.resActionBtn, { backgroundColor: THEME.Occupied.main, flex: 1 }]}
                onPress={() => updateResStatus(r._id, 'Cancelled')}
                disabled={!!updatingRes}
              >
                {updatingRes === r._id + 'Cancelled'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.resActionText}>Reject</Text>}
              </TouchableOpacity>
            </>
          )}
          {r.status === 'Confirmed' && (
            <TouchableOpacity accessibilityRole="button"
              style={[styles.resActionBtn, { backgroundColor: colors.textLight, width: '100%' }]}
              onPress={() => updateResStatus(r._id, 'Completed')}
              disabled={!!updatingRes}
            >
              {updatingRes === r._id + 'Completed'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.resActionText}>Mark Completed</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={[styles.headerTitleRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={styles.headerLeft}>
            <HeaderBrandLogo targetScreen="Dashboard" size={34} />
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{viewMode === 'Map' ? 'Floor Manager' : 'Reservations'}</Text>
              <Text style={[styles.headerSub, { color: colors.textLight }]} numberOfLines={1}>
                {viewMode === 'Map' ? 'Monitor live table occupancy' : `${upcoming.length} upcoming · ${reservations.length} total`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            onPress={toggleTheme}
            style={[styles.themePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color={colors.accent || colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.switcher, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.switchBtn, viewMode === 'Map' && [styles.switchBtnActive, { backgroundColor: colors.surface }]]}
            onPress={() => setViewMode('Map')}
          >
            <Ionicons name="grid" size={14} color={viewMode === 'Map' ? (colors.accent || colors.primary) : colors.textMid} />
            <Text style={[styles.switchText, { color: colors.textMid }, viewMode === 'Map' && { color: colors.text, fontWeight: '900' }]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.switchBtn, viewMode === 'Reservations' && [styles.switchBtnActive, { backgroundColor: colors.surface }]]}
            onPress={() => setViewMode('Reservations')}
          >
            <Ionicons name="calendar" size={14} color={viewMode === 'Reservations' ? THEME.Available.main : colors.textMid} />
            <Text style={[styles.switchText, { color: colors.textMid }, viewMode === 'Reservations' && { color: colors.text, fontWeight: '900' }]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        viewMode === 'Map' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.accent || colors.primary} />}
          >
            <View style={styles.legend}>
              {Object.entries(THEME).map(([key, info]) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: info.main }]} />
                  <Text style={[styles.legendText, { color: colors.textMid }]}>{info.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {tables.map(table => {
                const info = THEME[table.status];
                const isSelected = selectedTable?.num === table.num;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={table.num}
                    style={[
                      styles.tableCell,
                      { backgroundColor: info.bg, borderColor: isSelected ? info.main : colors.divider },
                      isSelected && { borderWidth: 2.5 }
                    ]}
                    accessibilityLabel={`Table ${table.num}, ${table.status}`} onPress={() => setSelectedTable(isSelected ? null : table)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusTag, { backgroundColor: info.main }]}>
                       <Text style={styles.statusTagText}>{table.status === 'Available' ? '✓' : table.status[0]}</Text>
                    </View>
                    <Text style={[styles.tableNum, { color: info.text }]}>{table.num}</Text>
                    <View style={styles.seatContainer}>
                       {[1,2,3,4].map(s => <View key={s} style={[styles.seatBox, { borderColor: info.main + '40' }]} />)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedTable && (
              <View style={[styles.detailPanel, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                <View style={[styles.panelIndicator, { backgroundColor: THEME[selectedTable.status].main }]} />
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: colors.text }]}>Table {selectedTable.num}</Text>
                  <View style={[styles.panelBadge, { backgroundColor: THEME[selectedTable.status].bg }]}>
                    <Text style={[styles.panelBadgeText, { color: THEME[selectedTable.status].text }]}>{selectedTable.status}</Text>
                  </View>
                </View>

                {selectedTable.order ? (
                  <View style={styles.panelBody}>
                     <Text style={[styles.panelLabel, { color: colors.textLight }]}>Active Order</Text>
                     <Text style={[styles.panelMain, { color: colors.text }]}>#{orderReference(selectedTable.order._id)} · {selectedTable.order.customer?.name || 'Walk-in'}</Text>
                     <Text style={[styles.panelSub, { color: colors.textMid }]}>{itemCount(selectedTable.order.items?.length)} · Rs. {selectedTable.order.totalAmount?.toFixed(0)}</Text>
                  </View>
                ) : selectedTable.reservation ? (
                  <View style={styles.panelBody}>
                     <Text style={[styles.panelLabel, { color: colors.textLight }]}>Upcoming Reservation</Text>
                     <Text style={[styles.panelMain, { color: colors.text }]}>{selectedTable.reservation.customer?.name} · {selectedTable.reservation.guests} guests</Text>
                     <Text style={[styles.panelSub, { color: colors.textMid }]}>At {selectedTable.reservation.time}</Text>
                  </View>
                ) : (
                  <Text style={[styles.panelEmpty, { color: colors.textMid }]}>This table is currently free and ready for new guests.</Text>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <>
            <View style={{ paddingVertical: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
                {['Upcoming', 'History', 'All', ...resStatuses].map(item => {
                  const active = resFilter === item;
                  const color = RES_STATUS_CONFIG[item]?.color || THEME.Available.main;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={item}
                      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.divider }, active && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setResFilter(item)}
                    >
                      <Text style={[styles.chipText, { color: colors.textMid }, active && { color: COLORS.white }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <FlatList
              data={filteredReservations}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={THEME.Available.main} />}
              renderItem={renderReservationItem}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={60} color={colors.divider} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No reservations found</Text>
                </View>
              }
            />
          </>
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 25, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerCircle: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerTitleRow: { marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  themePill: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  switcher: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 14, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  switchBtnActive: { backgroundColor: COLORS.white },
  switchText: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },
  switchTextActive: { color: COLORS.text, fontWeight: '900' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, fontWeight: '700', color: COLORS.textMid },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  tableCell: {
    flexBasis: '22%', flexGrow: 1, maxWidth: 160, aspectRatio: 0.95,
    borderRadius: 10, padding: 8, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5 }, android: { elevation: 1 } }),
  },
  statusTag: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 5, paddingVertical: 2, borderBottomLeftRadius: 6, borderTopRightRadius: 8 },
  statusTagText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  tableNum: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  seatContainer: { flexDirection: 'row', flexWrap: 'wrap', width: 24, height: 24, gap: 2, marginTop: 6, justifyContent: 'center' },
  seatBox: { width: 6, height: 6, borderRadius: 1.5, borderWidth: 1 },

  detailPanel: {
    backgroundColor: COLORS.surface, marginHorizontal: 20, marginTop: 24, borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: COLORS.divider,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15 }, android: { elevation: 5 } }),
  },
  panelIndicator: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  panelTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  panelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  panelBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  panelBody: { gap: 4 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase' },
  panelMain: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  panelSub: { fontSize: 13, color: COLORS.textMid },
  panelEmpty: { fontSize: 14, color: COLORS.textMid, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },

  filterList: { paddingHorizontal: 20, gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMid },
  list: { padding: 20, gap: 15, paddingBottom: 130 },
  resCard: {
    backgroundColor: COLORS.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.divider,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 12 }, android: { elevation: 3 } }),
  },
  resCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  resIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  resInfo: { flex: 1 },
  resTableTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  resCustomerName: { fontSize: 13, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  resBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  resBadgeText: { fontSize: 11, fontWeight: '800' },
  resTrashBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  resMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 12 },
  resMetaItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resMetaItem: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
  resSpecialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, padding: 10, borderRadius: 12, marginBottom: 15 },
  resSpecial: { fontSize: 12, color: COLORS.textMid, fontStyle: 'italic', flex: 1 },
  resBtnRow: { flexDirection: 'row', gap: 12 },
  resActionBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resActionText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
});

export default TableManagementScreen;
