import { orderReference, itemCount } from '../../utils/orderDisplay';
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, ScrollView, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminOrdersAPI, adminReservationsAPI } from '../../api';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { Alert } from '../../utils/alert';
import HeaderBrandLogo from '../../components/common/HeaderBrandLogo';
import { TIME_SLOTS, getLocalDayString } from '../../utils/date';



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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [editForm, setEditForm] = useState({
    tableNumber: 1,
    date: '',
    time: '',
    guests: 2,
    status: 'Pending',
    specialRequests: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

  const openEditModal = (r) => {
    const dStr = r.date
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(r.date))
      : getLocalDayString(0);

    setEditingRes(r);
    setEditForm({
      tableNumber: r.tableNumber || 1,
      date: dStr,
      time: r.time || '12:00 PM',
      guests: r.guests || 2,
      status: r.status || 'Pending',
      specialRequests: r.specialRequests || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRes) return;
    if (!editForm.date || !/^\d{4}-\d{2}-\d{2}$/.test(editForm.date.trim())) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!editForm.time) {
      Alert.alert('Time Slot Required', 'Please select a time slot.');
      return;
    }
    const guestsNum = Number(editForm.guests);
    if (!guestsNum || guestsNum < 1) {
      Alert.alert('Invalid Guests', 'Number of guests must be at least 1.');
      return;
    }
    const tableNum = Number(editForm.tableNumber);
    if (!tableNum || tableNum < 1 || tableNum > 20) {
      Alert.alert('Invalid Table', 'Please select a table between 1 and 20.');
      return;
    }

    setSavingEdit(true);
    try {
      await adminReservationsAPI.update(editingRes._id, {
        tableNumber: tableNum,
        date: editForm.date.trim(),
        time: editForm.time,
        guests: guestsNum,
        status: editForm.status,
        specialRequests: editForm.specialRequests.trim(),
      });
      setEditModalVisible(false);
      setEditingRes(null);
      Alert.alert('Success', 'Reservation updated successfully.');
      fetchAll();
    } catch (e) {
      Alert.alert('Update Failed', e.response?.data?.error || e.message || 'Could not update reservation');
    } finally {
      setSavingEdit(false);
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
            style={[styles.resEditBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]} 
            accessibilityLabel={`Edit reservation for table ${r.tableNumber}`}
            onPress={() => openEditModal(r)}
            disabled={!!updatingRes}
          >
            <Ionicons name="create-outline" size={17} color={colors.primary} />
          </TouchableOpacity>
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

      {/* Edit Reservation Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !savingEdit && setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.editModalContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: colors.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Reservation</Text>
                <Text style={[styles.editModalSub, { color: colors.textLight }]}>
                  {editingRes?.customer?.name ? `${editingRes.customer.name} · ` : ''}ID: #{editingRes?._id?.slice(-6).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !savingEdit && setEditModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}
                accessibilityRole="button"
                accessibilityLabel="Close edit modal"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalBody}>
              {/* Table Selector */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Select Table (1 - 20)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
                  const isSelected = editForm.tableNumber === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.tableSelectChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.divider,
                        },
                      ]}
                      onPress={() => setEditForm(prev => ({ ...prev, tableNumber: num }))}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.tableSelectChipText, { color: isSelected ? '#fff' : colors.text }]}>
                        T{num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Date Input & Quick Chips */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Reservation Date (YYYY-MM-DD)</Text>
              <View style={styles.quickDateRow}>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: 'In 2 Days', offset: 2 },
                ].map(({ label, offset }) => {
                  const dStr = getLocalDayString(offset);
                  const isSelected = editForm.date === dStr;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.quickDateBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.divider,
                        },
                      ]}
                      onPress={() => setEditForm(prev => ({ ...prev, date: dStr }))}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.quickDateBtnText, { color: isSelected ? '#fff' : colors.textMid }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text }]}
                value={editForm.date}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                onChangeText={(v) => setEditForm(prev => ({ ...prev, date: v }))}
              />

              {/* Time Slot Chips */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Time Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {TIME_SLOTS.map((t) => {
                  const isSelected = editForm.time === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.divider,
                        },
                      ]}
                      onPress={() => setEditForm(prev => ({ ...prev, time: t }))}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.timeChipText, { color: isSelected ? '#fff' : colors.textMid }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Guest Count */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Guest Count</Text>
              <View style={styles.guestsStepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
                  onPress={() => setEditForm(prev => ({ ...prev, guests: Math.max(1, (prev.guests || 1) - 1) }))}
                  accessibilityRole="button"
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.guestsInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text }]}
                  value={String(editForm.guests)}
                  keyboardType="numeric"
                  onChangeText={(v) => {
                    const num = parseInt(v, 10);
                    setEditForm(prev => ({ ...prev, guests: isNaN(num) ? '' : num }));
                  }}
                />
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
                  onPress={() => setEditForm(prev => ({ ...prev, guests: (prev.guests || 1) + 1 }))}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Status Selector */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Reservation Status</Text>
              <View style={styles.statusChipRow}>
                {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((st) => {
                  const isSelected = editForm.status === st;
                  const stColor = RES_STATUS_CONFIG[st]?.color || colors.primary;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: isSelected ? stColor : colors.surfaceAlt,
                          borderColor: isSelected ? stColor : colors.divider,
                        },
                      ]}
                      onPress={() => setEditForm(prev => ({ ...prev, status: st }))}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.statusChipText, { color: isSelected ? '#fff' : colors.textMid }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Special Requests */}
              <Text style={[styles.formLabel, { color: colors.textMid }]}>Special Requests / Notes</Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.formTextarea,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text },
                ]}
                value={editForm.specialRequests}
                placeholder="Dietary preferences, seating requests, etc."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                onChangeText={(v) => setEditForm(prev => ({ ...prev, specialRequests: v }))}
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.editModalFooter, { borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.divider }]}
                onPress={() => !savingEdit && setEditModalVisible(false)}
                disabled={savingEdit}
                accessibilityRole="button"
              >
                <Text style={[styles.modalCancelText, { color: colors.textMid }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
                accessibilityRole="button"
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  resEditBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  editModalContainer: { width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  editModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  editModalTitle: { fontSize: 18, fontWeight: '800' },
  editModalSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  editModalBody: { padding: 20, gap: 14 },
  formLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  formTextarea: { height: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginHorizontal: -4 },
  tableSelectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginHorizontal: 4, minWidth: 46, alignItems: 'center' },
  tableSelectChipText: { fontSize: 13, fontWeight: '700' },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickDateBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  quickDateBtnText: { fontSize: 12, fontWeight: '700' },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginHorizontal: 4 },
  timeChipText: { fontSize: 12, fontWeight: '700' },
  guestsStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  guestsInput: { width: 80, height: 40, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  statusChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: '800' },
  editModalFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, gap: 12 },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700' },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

export default TableManagementScreen;
