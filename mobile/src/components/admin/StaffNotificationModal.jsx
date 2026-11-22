import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationAPI } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../constants/typography';

export default function StaffNotificationModal({ visible, onClose, onRefreshCount }) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.list({ limit: 40 });
      setNotifications(res.data?.data || []);
      if (onRefreshCount) onRefreshCount();
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      if (onRefreshCount) onRefreshCount();
    } catch (e) {
      console.log(e?.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onRefreshCount) onRefreshCount();
    } catch (e) {
      console.log(e?.message);
    }
  };

  const renderItem = ({ item }) => {
    const isCritical = item.severity === 'critical';
    const color = isCritical ? colors.danger : colors.warning;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: item.isRead ? colors.divider : color,
            borderLeftWidth: item.isRead ? 1 : 4,
            borderLeftColor: item.isRead ? colors.divider : color,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
            <Ionicons
              name={isCritical ? 'flame' : 'alert-circle'}
              size={18}
              color={color}
            />
          </View>
          <View style={styles.cardHeaderTitle}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardTime, { color: colors.textLight }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {!item.isRead ? (
            <TouchableOpacity
              style={[styles.readBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => handleMarkAsRead(item._id)}
            >
              <Ionicons name="checkmark" size={14} color={colors.accent || colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.readBadge}>
              <Text style={[styles.readBadgeText, { color: colors.textLight }]}>Read</Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardMessage, { color: colors.textMid }]}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.metaPillText, { color: colors.textLight }]}>
              Stock: {item.currentStock ?? 0} | Min: {item.threshold ?? 5}
            </Text>
          </View>
          {item.resolvedAt && (
            <View style={[styles.resolvedPill, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-done" size={12} color={colors.success} />
              <Text style={[styles.resolvedText, { color: colors.success }]}>Replenished</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.badgeBg, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="notifications" size={18} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text, fontFamily: FONTS.serif }]}>
                  Staff Alerts & Inventory
                </Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                  Automated Threshold Warnings
                </Text>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Action row */}
          <View style={[styles.actionRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.countText, { color: colors.textLight }]}>
              {notifications.filter((n) => !n.isRead).length} unread alerts
            </Text>
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={[styles.markAllText, { color: colors.accent || colors.primary }]}>
                Mark all as read
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent || colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="shield-checkmark-outline" size={48} color={colors.divider} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Alerts</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>
                    All inventory levels are healthy and within configured thresholds.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { height: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeBg: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  countText: { fontSize: 12, fontWeight: '700' },
  markAllText: { fontSize: 12, fontWeight: '800' },
  list: { padding: 16, gap: 10 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardHeaderTitle: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardTime: { fontSize: 11, marginTop: 2 },
  readBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  readBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  readBadgeText: { fontSize: 10, fontWeight: '700' },
  cardMessage: { fontSize: 12, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaPillText: { fontSize: 10, fontWeight: '700' },
  resolvedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  resolvedText: { fontSize: 10, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
