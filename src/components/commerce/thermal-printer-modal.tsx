'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  Usb,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  Sparkles,
  Zap,
  Sliders,
  RefreshCw,
  ChefHat,
  Receipt,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  PaperWidth,
  activeBluetoothPrinter,
  activeUsbPrinter,
  buildTestTicket,
} from '@/lib/hardware/escpos-printer';

export interface ThermalPrinterConfig {
  connectionType: 'bluetooth' | 'usb' | 'browser';
  deviceName: string;
  paperWidth: PaperWidth;
  autoPrintEnabled: boolean;
  autoPrintTarget: 'KOT' | 'RECEIPT' | 'BOTH';
  soundAlertEnabled: boolean;
}

interface ThermalPrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ThermalPrinterConfig;
  onConfigChange: (config: ThermalPrinterConfig) => void;
}

export function ThermalPrinterModal({
  open,
  onOpenChange,
  config,
  onConfigChange,
}: ThermalPrinterModalProps) {
  const [connectingBt, setConnectingBt] = useState(false);
  const [connectingUsb, setConnectingUsb] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const [btSupported, setBtSupported] = useState(true);
  const [usbSupported, setUsbSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBtSupported(!!(navigator as any).bluetooth);
      setUsbSupported(!!(navigator as any).usb);
    }
  }, []);

  if (!open) return null;

  const isConnected =
    (config.connectionType === 'bluetooth' && activeBluetoothPrinter.isConnected) ||
    (config.connectionType === 'usb' && activeUsbPrinter.isConnected);

  // Play pleasant acoustic chime
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // 3 ascending chime notes
      playTone(523.25, 0.0, 0.25); // C5
      playTone(659.25, 0.15, 0.25); // E5
      playTone(783.99, 0.3, 0.45); // G5
      toast.success('🔔 Order alert chime played');
    } catch {
      toast.info('Audio playback initialized');
    }
  };

  const handleConnectBluetooth = async () => {
    setConnectingBt(true);
    try {
      const success = await activeBluetoothPrinter.connect();
      if (success) {
        onConfigChange({
          ...config,
          connectionType: 'bluetooth',
          deviceName: activeBluetoothPrinter.printerName,
        });
        toast.success(`Connected to ${activeBluetoothPrinter.printerName} via Bluetooth!`);
      }
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      toast.error(err?.message || 'Bluetooth connection cancelled or failed.');
    } finally {
      setConnectingBt(false);
    }
  };

  const handleConnectUsb = async () => {
    setConnectingUsb(true);
    try {
      const success = await activeUsbPrinter.connect();
      if (success) {
        onConfigChange({
          ...config,
          connectionType: 'usb',
          deviceName: activeUsbPrinter.printerName,
        });
        toast.success(`Connected to ${activeUsbPrinter.printerName} via USB!`);
      }
    } catch (err: any) {
      console.warn('USB connection error:', err);
      toast.error(err?.message || 'USB printer selection cancelled or unsupported.');
    } finally {
      setConnectingUsb(false);
    }
  };

  const handleDisconnect = () => {
    if (config.connectionType === 'bluetooth') {
      activeBluetoothPrinter.disconnect();
    } else if (config.connectionType === 'usb') {
      activeUsbPrinter.disconnect();
    }
    onConfigChange({
      ...config,
      connectionType: 'browser',
      deviceName: '',
    });
    toast.info('Printer disconnected. System will use browser print dialog fallback.');
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const testBytes = buildTestTicket(config.deviceName || 'Thermal Printer', config.paperWidth);
      if (config.connectionType === 'bluetooth' && activeBluetoothPrinter.isConnected) {
        await activeBluetoothPrinter.print(testBytes);
        toast.success('Test print sent via Bluetooth!');
      } else if (config.connectionType === 'usb' && activeUsbPrinter.isConnected) {
        await activeUsbPrinter.print(testBytes);
        toast.success('Test print sent via USB!');
      } else {
        toast.info('No direct ESC/POS hardware paired. Please pair Bluetooth or USB first.');
      }
    } catch (err: any) {
      toast.error(`Print failed: ${err.message}`);
    } finally {
      setTestingPrint(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-stone-900 to-stone-700 text-white flex items-center justify-center shadow-md">
              <Printer className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Thermal Printer &amp; KOT Setup</h2>
              <p className="text-xs text-stone-500">
                Connect any ₹1.5k–₹3k ESC/POS Bluetooth, USB, or Network thermal printer
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="rounded-full size-8 cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Active Status Badge */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <div className="text-xs font-bold">
                  {isConnected
                    ? `Connected: ${config.deviceName || 'ESC/POS Printer'}`
                    : 'No Hardware Paired (Browser Print Fallback Active)'}
                </div>
                <div className="text-[11px] text-stone-500">
                  Protocol: {config.connectionType.toUpperCase()} • Width: {config.paperWidth}mm
                </div>
              </div>
            </div>

            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 h-8 rounded-xl cursor-pointer"
              >
                Disconnect
              </Button>
            ) : null}
          </div>

          {/* Connection Options */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              1. Pair Thermal Printer
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bluetooth Button */}
              <button
                type="button"
                onClick={handleConnectBluetooth}
                disabled={connectingBt || !btSupported}
                className="flex flex-col items-start p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-blue-500 bg-white dark:bg-stone-900 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Bluetooth className="size-5" />
                </div>
                <span className="font-bold text-xs">Bluetooth Printer (Mobile/POS)</span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  {connectingBt
                    ? 'Scanning devices...'
                    : btSupported
                    ? 'Pair standard 58mm/80mm BLE thermal printer'
                    : 'Not supported on this browser (use Chrome)'}
                </span>
              </button>

              {/* USB Button */}
              <button
                type="button"
                onClick={handleConnectUsb}
                disabled={connectingUsb || !usbSupported}
                className="flex flex-col items-start p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-emerald-500 bg-white dark:bg-stone-900 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Usb className="size-5" />
                </div>
                <span className="font-bold text-xs">USB Countertop Printer</span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  {connectingUsb
                    ? 'Connecting USB...'
                    : usbSupported
                    ? 'Direct USB thermal printer on PC / Tablet'
                    : 'Not supported on this browser'}
                </span>
              </button>
            </div>
          </div>

          {/* Paper Size Setting */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              2. Paper Roll Width
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onConfigChange({ ...config, paperWidth: 58 })}
                className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  config.paperWidth === 58
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">58mm (Handheld/Cart)</span>
                  {config.paperWidth === 58 && <CheckCircle2 className="size-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">32 columns • Portable mobile printers</p>
              </button>

              <button
                type="button"
                onClick={() => onConfigChange({ ...config, paperWidth: 80 })}
                className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  config.paperWidth === 80
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">80mm (Counter POS)</span>
                  {config.paperWidth === 80 && <CheckCircle2 className="size-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">48 columns • Full-size kitchen &amp; restaurant POS</p>
              </button>
            </div>
          </div>

          {/* Killer Feature: Auto-Print New Orders */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              3. Automatic Kitchen Dispatch
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="size-4 text-amber-500" />
                    Auto-Print New Incoming Orders
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Immediately print ticket when a customer places an order via QR or WhatsApp
                  </div>
                </div>
                <Switch
                  checked={config.autoPrintEnabled}
                  onCheckedChange={(checked) =>
                    onConfigChange({ ...config, autoPrintEnabled: checked })
                  }
                />
              </div>

              {config.autoPrintEnabled && (
                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-600 dark:text-stone-300">
                    Auto-Print Document Type:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, autoPrintTarget: 'KOT' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        config.autoPrintTarget === 'KOT'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-900 border text-stone-600'
                      }`}
                    >
                      KOT Only
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, autoPrintTarget: 'RECEIPT' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        config.autoPrintTarget === 'RECEIPT'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-stone-900 border text-stone-600'
                      }`}
                    >
                      Bill Only
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, autoPrintTarget: 'BOTH' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        config.autoPrintTarget === 'BOTH'
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                          : 'bg-white dark:bg-stone-900 border text-stone-600'
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>
              )}

              {/* Sound alert switch */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Volume2 className="size-4 text-blue-500" />
                    Kitchen Audio Chime
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Play a loud ascending alert when a new order arrives
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={playAlertSound}
                    className="h-8 text-[11px] text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Test Sound
                  </Button>
                  <Switch
                    checked={config.soundAlertEnabled}
                    onCheckedChange={(checked) =>
                      onConfigChange({ ...config, soundAlertEnabled: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            disabled={testingPrint || !isConnected}
            className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
          >
            <Printer className="size-3.5" />
            {testingPrint ? 'Printing Test...' : 'Test Print Ticket'}
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-5 rounded-xl cursor-pointer shadow-sm"
          >
            Save &amp; Close
          </Button>
        </div>
      </div>
    </div>
  );
}
