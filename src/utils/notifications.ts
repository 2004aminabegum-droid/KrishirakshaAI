import { IoTDevice } from './iotDevices';
import { ValidationRequest } from './supabase';

export type NotificationAudience = 'farmer' | 'officer';
export type NotificationLevel = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  level: NotificationLevel;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = 'krishirakshak_notifications';

export function loadNotifications(audience: NotificationAudience): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    return all.filter(item => item.audience === audience).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function saveNotifications(items: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 100)));
}

export function addNotification(notification: Omit<AppNotification, 'createdAt' | 'read'>) {
  if (typeof window === 'undefined') return;
  const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
  if (all.some(item => item.id === notification.id)) return;
  saveNotifications([{ ...notification, createdAt: new Date().toISOString(), read: false }, ...all]);
  window.dispatchEvent(new Event('krishirakshak-notifications-updated'));
}

export function markNotificationRead(id: string) {
  if (typeof window === 'undefined') return;
  const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
  saveNotifications(all.map(item => item.id === id ? { ...item, read: true } : item));
  window.dispatchEvent(new Event('krishirakshak-notifications-updated'));
}

export function markAllNotificationsRead(audience: NotificationAudience) {
  if (typeof window === 'undefined') return;
  const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
  saveNotifications(all.map(item => item.audience === audience ? { ...item, read: true } : item));
  window.dispatchEvent(new Event('krishirakshak-notifications-updated'));
}

export function syncRiskNotifications(devices: IoTDevice[], pendingRequests: ValidationRequest[] = []) {
  devices.forEach(device => {
    const telemetry = device.telemetry;
    if (telemetry.pestCatches > 30) addNotification({ id: `pest-risk-${device.id}-${telemetry.lastSync.slice(0, 10)}`, audience: 'farmer', level: 'critical', title: 'High pest activity detected', message: `${device.name}: ${telemetry.pestCatches} pests recorded today. Inspect the crop now.`, href: '/surveillance' });
    if (telemetry.humidity > 78 || telemetry.rainChance > 65 || telemetry.temperature > 36) addNotification({ id: `weather-risk-${device.id}-${telemetry.lastSync.slice(0, 10)}`, audience: 'farmer', level: 'warning', title: 'Environmental risk alert', message: `${device.name}: weather conditions may increase disease pressure.`, href: '/environmental-risk' });
    if (telemetry.pestCatches > 30 || telemetry.humidity > 78 || telemetry.rainChance > 65 || telemetry.temperature > 36) addNotification({ id: `outbreak-risk-${device.id}-${telemetry.lastSync.slice(0, 10)}`, audience: 'officer', level: 'critical', title: 'High-risk outbreak signal', message: `${device.name} requires regional surveillance attention.`, href: '/surveillance?view=officer' });
  });
  pendingRequests.filter(request => request.status === 'pending').forEach(request => addNotification({ id: `validation-${request.id}`, audience: 'officer', level: 'warning', title: 'Expert validation required', message: `${request.farmer_name} submitted a ${request.type} report for review.`, href: '/dashboard/officer' }));
}