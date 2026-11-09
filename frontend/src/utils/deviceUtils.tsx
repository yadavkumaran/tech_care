import React from 'react';
import {
  Laptop,
  Smartphone,
  Watch,
  Mouse,
  Keyboard,
  Tablet,
  Headphones,
  HardDrive,
  Printer,
  Monitor,
  Cpu,
  Package,
} from 'lucide-react';

export interface DeviceTypeOption {
  value: string;
  label: string;
  badge: string;
  iconName: string;
}

export const DEVICE_TYPES: DeviceTypeOption[] = [
  { value: 'LAPTOP', label: 'Laptop', badge: '💻 Laptop', iconName: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop PC', badge: '🖥️ Desktop', iconName: 'Cpu' },
  { value: 'MOBILE', label: 'Mobile / Smartphone', badge: '📱 Mobile', iconName: 'Smartphone' },
  { value: 'TABLET', label: 'Tablet / iPad', badge: '📱 Tablet', iconName: 'Tablet' },
  { value: 'SMARTWATCH', label: 'Smart Watch / Wearable', badge: '⌚ Smart Watch', iconName: 'Watch' },
  { value: 'MOUSE', label: 'Mouse / Pointing Device', badge: '🖱️ Mouse', iconName: 'Mouse' },
  { value: 'KEYBOARD', label: 'Keyboard', badge: '⌨️ Keyboard', iconName: 'Keyboard' },
  { value: 'MONITOR', label: 'Monitor / Display', badge: '🖥️ Monitor', iconName: 'Monitor' },
  { value: 'PRINTER', label: 'Printer / Scanner', badge: '🖨️ Printer', iconName: 'Printer' },
  { value: 'ALL_IN_ONE', label: 'All-in-One PC', badge: '🖥️ All-in-One', iconName: 'Monitor' },
  { value: 'CUSTOM_PC', label: 'Custom PC / Gaming Rig', badge: '🕹️ Custom PC', iconName: 'Cpu' },
  { value: 'AUDIO', label: 'Headphones / Earbuds / Audio', badge: '🎧 Audio', iconName: 'Headphones' },
  { value: 'STORAGE', label: 'External Drive / SSD / USB', badge: '💾 Storage', iconName: 'HardDrive' },
  { value: 'PERIPHERAL', label: 'Peripheral / Accessory', badge: '🔌 Peripheral', iconName: 'Package' },
  { value: 'OTHER', label: 'Other Electronic Gadget', badge: '📦 Other', iconName: 'Package' },
];

export const formatDeviceType = (type?: string): string => {
  if (!type) return 'Hardware';
  const found = DEVICE_TYPES.find((d) => d.value === type.toUpperCase());
  if (found) return found.label;
  return type.replace(/_/g, ' ');
};

export const getDeviceBadgeText = (type?: string): string => {
  if (!type) return '📦 Hardware';
  const found = DEVICE_TYPES.find((d) => d.value === type.toUpperCase());
  if (found) return found.badge;
  return `📦 ${type.replace(/_/g, ' ')}`;
};

export const getDeviceIcon = (type?: string, size = 14, color = 'var(--text-tertiary)') => {
  const t = (type || '').toUpperCase();
  switch (t) {
    case 'MOBILE':
      return <Smartphone size={size} color={color} />;
    case 'TABLET':
      return <Tablet size={size} color={color} />;
    case 'SMARTWATCH':
      return <Watch size={size} color={color} />;
    case 'MOUSE':
      return <Mouse size={size} color={color} />;
    case 'KEYBOARD':
      return <Keyboard size={size} color={color} />;
    case 'AUDIO':
      return <Headphones size={size} color={color} />;
    case 'PRINTER':
      return <Printer size={size} color={color} />;
    case 'MONITOR':
    case 'ALL_IN_ONE':
      return <Monitor size={size} color={color} />;
    case 'CUSTOM_PC':
    case 'DESKTOP':
      return <Cpu size={size} color={color} />;
    case 'STORAGE':
      return <HardDrive size={size} color={color} />;
    case 'PERIPHERAL':
    case 'OTHER':
      return <Package size={size} color={color} />;
    case 'LAPTOP':
    default:
      return <Laptop size={size} color={color} />;
  }
};
