import {
  buildKitchenOrderTicket,
  buildCustomerReceipt,
  printReceiptViaBrowserDialog,
  activeBluetoothPrinter,
  activeUsbPrinter,
  PrintOrderData,
  BusinessPrintInfo,
  PaperWidth,
} from './escpos-printer';
import { ThermalPrinterConfig } from '@/components/commerce/thermal-printer-modal';

export const DEFAULT_PRINTER_CONFIG: ThermalPrinterConfig = {
  connectionType: 'browser',
  deviceName: '',
  paperWidth: 58,
  autoPrintEnabled: false,
  autoPrintTarget: 'KOT',
  soundAlertEnabled: true,
};

export function loadPrinterConfig(): ThermalPrinterConfig {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  try {
    const raw = localStorage.getItem('serviceos_thermal_printer_config');
    if (raw) return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse printer config from localStorage', e);
  }
  return DEFAULT_PRINTER_CONFIG;
}

export function savePrinterConfig(config: ThermalPrinterConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('serviceos_thermal_printer_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save printer config to localStorage', e);
  }
}

/**
 * Play pleasant high-attention ascending chime when an order arrives
 */
export function playNewOrderChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Ascending triad chime (C5 -> E5 -> G5)
    playTone(523.25, 0.0, 0.3);
    playTone(659.25, 0.16, 0.3);
    playTone(783.99, 0.32, 0.55);
  } catch (e) {
    console.warn('Audio alert not permitted or failed', e);
  }
}

/**
 * Print Kitchen Order Ticket (KOT)
 * Direct hardware ESC/POS if Bluetooth/USB connected, or fallback to CSS thermal dialog
 */
export async function printKOT(
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  config?: ThermalPrinterConfig
): Promise<{ success: boolean; method: string; error?: string }> {
  const currentConfig = config || loadPrinterConfig();
  const width: PaperWidth = currentConfig.paperWidth || 58;

  try {
    const bytes = buildKitchenOrderTicket(order, businessInfo, width);

    if (currentConfig.connectionType === 'bluetooth' && activeBluetoothPrinter.isConnected) {
      await activeBluetoothPrinter.print(bytes);
      return { success: true, method: 'bluetooth' };
    }

    if (currentConfig.connectionType === 'usb' && activeUsbPrinter.isConnected) {
      await activeUsbPrinter.print(bytes);
      return { success: true, method: 'usb' };
    }

    // Fallback: Browser print dialog with CSS thermal layout
    printReceiptViaBrowserDialog('KOT', order, businessInfo, width);
    return { success: true, method: 'browser' };
  } catch (err: any) {
    console.error('KOT print error:', err);
    // Fallback to browser dialog on failure
    printReceiptViaBrowserDialog('KOT', order, businessInfo, width);
    return { success: false, method: 'fallback', error: err?.message };
  }
}

/**
 * Print Customer Billing Tax Receipt
 */
export async function printCustomerBill(
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  config?: ThermalPrinterConfig
): Promise<{ success: boolean; method: string; error?: string }> {
  const currentConfig = config || loadPrinterConfig();
  const width: PaperWidth = currentConfig.paperWidth || 58;

  try {
    const bytes = buildCustomerReceipt(order, businessInfo, width);

    if (currentConfig.connectionType === 'bluetooth' && activeBluetoothPrinter.isConnected) {
      await activeBluetoothPrinter.print(bytes);
      return { success: true, method: 'bluetooth' };
    }

    if (currentConfig.connectionType === 'usb' && activeUsbPrinter.isConnected) {
      await activeUsbPrinter.print(bytes);
      return { success: true, method: 'usb' };
    }

    // Fallback: Browser print dialog with CSS thermal layout
    printReceiptViaBrowserDialog('RECEIPT', order, businessInfo, width);
    return { success: true, method: 'browser' };
  } catch (err: any) {
    console.error('Customer receipt print error:', err);
    printReceiptViaBrowserDialog('RECEIPT', order, businessInfo, width);
    return { success: false, method: 'fallback', error: err?.message };
  }
}

/**
 * Auto-print handler when a new order arrives
 */
export async function handleAutoPrintNewOrder(
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  config?: ThermalPrinterConfig
): Promise<void> {
  const currentConfig = config || loadPrinterConfig();

  if (currentConfig.soundAlertEnabled) {
    playNewOrderChime();
  }

  if (!currentConfig.autoPrintEnabled) return;

  if (currentConfig.autoPrintTarget === 'KOT' || currentConfig.autoPrintTarget === 'BOTH') {
    await printKOT(order, businessInfo, currentConfig);
  }

  if (currentConfig.autoPrintTarget === 'RECEIPT' || currentConfig.autoPrintTarget === 'BOTH') {
    // Add small pause between prints if printing both to avoid printer buffer overlap
    if (currentConfig.autoPrintTarget === 'BOTH') {
      await new Promise((r) => setTimeout(r, 600));
    }
    await printCustomerBill(order, businessInfo, currentConfig);
  }
}
