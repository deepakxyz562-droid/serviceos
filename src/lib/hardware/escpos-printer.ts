/**
 * Universal ESC/POS Thermal Printer Driver for ServiceOS / Take.app Parity
 * Supports 58mm (32 chars) & 80mm (48 chars) thermal printers over:
 * 1. Web Bluetooth (Chrome Android, macOS, Windows)
 * 2. WebUSB (Direct Countertop POS thermal printer)
 * 3. Browser Print Fallback (High-fidelity CSS thermal receipt)
 */

export type PaperWidth = 58 | 80;

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'network' | 'browser';
  paperWidth: PaperWidth;
  connected: boolean;
}

export interface BusinessPrintInfo {
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
  fssai?: string;
  billFooter?: string;
}

export interface PrintOrderItem {
  name: string;
  qty: number;
  price: number;
  amount?: number;
  notes?: string;
}

export interface PrintOrderData {
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY' | string;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  createdAt?: string | Date;
  items: PrintOrderItem[];
  subtotal?: number;
  taxRate?: number;
  taxName?: string;
  taxAmount?: number;
  serviceCharge?: number;
  discount?: number;
  total: number;
  paymentMethod?: 'UPI' | 'CASH' | 'CARD' | string;
  paymentStatus?: 'PAID' | 'PENDING' | string;
  upiId?: string;
  notes?: string | null;
}

// ─── ESC/POS Command Byte Constants ───
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  FONT_NORMAL: [GS, 0x21, 0x00],
  FONT_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  FONT_DOUBLE_WIDTH: [GS, 0x21, 0x10],
  FONT_DOUBLE_SIZE: [GS, 0x21, 0x11], // 2x height + 2x width
  FONT_LARGE_HEADER: [GS, 0x21, 0x22], // 3x size
  CUT_FULL: [GS, 0x56, 0x00],
  CUT_PARTIAL_FEED: [GS, 0x56, 0x41, 0x18], // Feed 24 units & partial cut
  DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xfa], // Cash drawer kick
  LINE_FEED: [0x0a],
};

/**
 * EscPosBuilder: Builds raw byte buffers conforming to ESC/POS standards
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  public paperWidth: PaperWidth;
  public maxChars: number;

  constructor(paperWidth: PaperWidth = 58) {
    this.paperWidth = paperWidth;
    this.maxChars = paperWidth === 80 ? 48 : 32;
    this.init();
  }

  public init(): this {
    this.buffer.push(...CMD.INIT);
    return this;
  }

  public align(alignment: 'left' | 'center' | 'right'): this {
    if (alignment === 'center') this.buffer.push(...CMD.ALIGN_CENTER);
    else if (alignment === 'right') this.buffer.push(...CMD.ALIGN_RIGHT);
    else this.buffer.push(...CMD.ALIGN_LEFT);
    return this;
  }

  public bold(enable: boolean = true): this {
    this.buffer.push(...(enable ? CMD.BOLD_ON : CMD.BOLD_OFF));
    return this;
  }

  public size(size: 'normal' | 'double-height' | 'double-width' | 'double' | 'large'): this {
    if (size === 'large') this.buffer.push(...CMD.FONT_LARGE_HEADER);
    else if (size === 'double') this.buffer.push(...CMD.FONT_DOUBLE_SIZE);
    else if (size === 'double-height') this.buffer.push(...CMD.FONT_DOUBLE_HEIGHT);
    else if (size === 'double-width') this.buffer.push(...CMD.FONT_DOUBLE_WIDTH);
    else this.buffer.push(...CMD.FONT_NORMAL);
    return this;
  }

  public text(text: string): this {
    // Convert string to raw ASCII bytes (safe for ESC/POS thermal codepages)
    const sanitized = text
      .replace(/₹/g, 'Rs. ')
      .replace(/[^\x20-\x7E\n\r]/g, ''); // strip non-ASCII chars
    for (let i = 0; i < sanitized.length; i++) {
      this.buffer.push(sanitized.charCodeAt(i));
    }
    return this;
  }

  public line(text: string = ''): this {
    this.text(text);
    this.buffer.push(...CMD.LINE_FEED);
    return this;
  }

  public feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(...CMD.LINE_FEED);
    }
    return this;
  }

  public divider(char: string = '-'): this {
    const lineStr = char.repeat(this.maxChars);
    this.line(lineStr);
    return this;
  }

  public doubleDivider(): this {
    return this.divider('=');
  }

  public row(left: string, right: string): this {
    const leftClean = left.replace(/₹/g, 'Rs. ');
    const rightClean = right.replace(/₹/g, 'Rs. ');
    const spaceCount = this.maxChars - leftClean.length - rightClean.length;

    if (spaceCount <= 0) {
      // Truncate left if needed
      const maxLeft = Math.max(1, this.maxChars - rightClean.length - 1);
      const truncatedLeft = leftClean.substring(0, maxLeft);
      this.line(truncatedLeft + ' ' + rightClean);
    } else {
      this.line(leftClean + ' '.repeat(spaceCount) + rightClean);
    }
    return this;
  }

  public itemRow(qty: number, name: string, priceStr: string): this {
    const qtyStr = `${qty}x `;
    const priceFormatted = priceStr.replace(/₹/g, 'Rs. ');
    const availableForName = this.maxChars - qtyStr.length - priceFormatted.length - 1;

    let trimmedName = name.replace(/₹/g, 'Rs. ');
    if (trimmedName.length > availableForName) {
      trimmedName = trimmedName.substring(0, Math.max(1, availableForName));
    }

    const spaceCount = this.maxChars - (qtyStr.length + trimmedName.length + priceFormatted.length);
    const line = qtyStr + trimmedName + ' '.repeat(Math.max(1, spaceCount)) + priceFormatted;
    this.line(line);
    return this;
  }

  public cut(): this {
    this.feed(3);
    this.buffer.push(...CMD.CUT_PARTIAL_FEED);
    return this;
  }

  public cashDrawer(): this {
    this.buffer.push(...CMD.DRAWER_KICK);
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// ─── High-Level Recipe Generators ───

/**
 * 1. Kitchen Order Ticket (KOT)
 * Purpose: Streamlined, large-type ticket strictly for cooking / preparation staff.
 * Features: Huge Order #, Table/Pickup info, Item quantities and special notes. Zero price clutter.
 */
export function buildKitchenOrderTicket(
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  paperWidth: PaperWidth = 58
): Uint8Array {
  const b = new EscPosBuilder(paperWidth);

  // Top KOT Header
  b.align('center')
    .bold(true)
    .size('normal')
    .line('*** KITCHEN ORDER TICKET ***')
    .size('normal');

  if (businessInfo?.name) {
    b.line(businessInfo.name);
  }

  b.doubleDivider();

  // Huge Order Number
  b.align('center')
    .bold(true)
    .size('double')
    .line(`ORDER #${order.orderNumber}`)
    .size('normal');

  // Order Details
  b.align('center');
  const typeLabel =
    order.orderType === 'DINE_IN'
      ? `DINE-IN ${order.tableNumber ? `(Table: ${order.tableNumber})` : ''}`
      : order.orderType === 'TAKEOUT'
      ? 'TAKEOUT / SELF-PICKUP'
      : order.orderType === 'DELIVERY'
      ? 'DELIVERY'
      : order.orderType;

  b.bold(true).line(`[ ${typeLabel} ]`).bold(false);

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  b.line(`Time: ${dateStr}`);

  if (order.customerName) {
    b.line(`Customer: ${order.customerName}`);
  }

  b.divider();

  // Items List (Clean & Readable)
  b.align('left');
  order.items.forEach((item) => {
    b.bold(true)
      .size('double-height')
      .line(`${item.qty} x ${item.name}`)
      .size('normal')
      .bold(false);

    if (item.notes) {
      b.line(`   * Note: ${item.notes}`);
    }
  });

  b.divider();

  // Special instructions
  if (order.notes) {
    b.bold(true).line('SPECIAL INSTRUCTIONS:').bold(false);
    b.line(order.notes);
    b.divider();
  }

  b.align('center').line(`Total Items: ${order.items.reduce((acc, i) => acc + i.qty, 0)}`);

  b.cut();
  return b.getBytes();
}

/**
 * 2. Customer Tax Invoice / Billing Receipt
 * Purpose: Professional receipt for the customer with business info, GST/tax breakup, and payment confirmation.
 */
export function buildCustomerReceipt(
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  paperWidth: PaperWidth = 58
): Uint8Array {
  const b = new EscPosBuilder(paperWidth);

  // Business Header
  b.align('center').bold(true).size('double-height');
  b.line(businessInfo?.name || 'RECEIPT');
  b.size('normal').bold(false);

  if (businessInfo?.address) b.line(businessInfo.address);
  if (businessInfo?.phone) b.line(`Tel: ${businessInfo.phone}`);
  if (businessInfo?.gstin) b.bold(true).line(`GSTIN: ${businessInfo.gstin}`).bold(false);
  if (businessInfo?.fssai) b.line(`FSSAI: ${businessInfo.fssai}`);

  b.doubleDivider();

  // Order meta
  b.align('left');
  b.row(`Order: #${order.orderNumber}`, order.orderType || 'Pickup');
  if (order.tableNumber) b.line(`Table: ${order.tableNumber}`);
  if (order.customerName) b.line(`Customer: ${order.customerName}`);
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  b.line(`Date: ${dateStr}`);

  b.divider();

  // Itemized List
  b.bold(true);
  b.row('Item', 'Amount');
  b.bold(false);
  b.divider();

  order.items.forEach((item) => {
    const itemTotal = item.amount ?? item.price * item.qty;
    b.itemRow(item.qty, item.name, `Rs.${itemTotal.toFixed(2)}`);
  });

  b.divider();

  // Totals & Taxes
  const subtotal = order.subtotal ?? order.items.reduce((s, i) => s + (i.amount ?? i.price * i.qty), 0);
  b.row('Subtotal:', `Rs.${subtotal.toFixed(2)}`);

  if (order.discount && order.discount > 0) {
    b.row('Discount:', `-Rs.${order.discount.toFixed(2)}`);
  }

  if (order.serviceCharge && order.serviceCharge > 0) {
    b.row('Service Charge:', `Rs.${order.serviceCharge.toFixed(2)}`);
  }

  if (order.taxAmount && order.taxAmount > 0) {
    const taxLabel = order.taxName || 'GST';
    b.row(`${taxLabel}:`, `Rs.${order.taxAmount.toFixed(2)}`);
  }

  b.doubleDivider();

  // Grand Total
  b.align('center').bold(true).size('double-height');
  b.row('TOTAL:', `Rs.${order.total.toFixed(2)}`);
  b.size('normal');

  // Payment Status
  const payStatus = order.paymentStatus === 'PAID' ? 'PAID' : 'PAY AT COUNTER';
  const payMethod = order.paymentMethod ? `via ${order.paymentMethod}` : '';
  b.align('center').bold(true).line(`[ ${payStatus} ${payMethod} ]`.trim()).bold(false);

  b.feed(1);

  // Footer
  b.align('center');
  if (businessInfo?.billFooter) {
    b.line(businessInfo.billFooter);
  } else {
    b.line('Thank you! Please visit again.');
  }

  b.cut();
  return b.getBytes();
}

/**
 * 3. Test Print Ticket
 */
export function buildTestTicket(printerName: string, paperWidth: PaperWidth = 58): Uint8Array {
  const b = new EscPosBuilder(paperWidth);
  b.align('center').bold(true).size('double');
  b.line('TEST PRINT');
  b.size('normal').bold(false);
  b.line('ServiceOS Local Commerce POS');
  b.divider();
  b.align('left');
  b.row('Printer:', printerName);
  b.row('Width:', `${paperWidth}mm (${b.maxChars} chars)`);
  b.row('Status:', 'ONLINE & READY');
  b.row('Time:', new Date().toLocaleTimeString());
  b.divider();
  b.align('center').bold(true).line('ESC/POS THERMAL DRIVER OK');
  b.cut();
  return b.getBytes();
}

// ─── Web Bluetooth Thermal Printer Connection ───

export class BluetoothThermalPrinter {
  private device: any | null = null;
  private server: any | null = null;
  private characteristic: any | null = null;
  public isConnected: boolean = false;
  public printerName: string = '';

  // Well-known Bluetooth Printer Service UUIDs (ESC/POS vendors like Rongta, Xprinter, Everycom, TVS)
  private static PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Widely used cheap 58mm printer service
    '0000ff00-0000-1000-8000-00805f9b34fb', // Common serial service
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent serial
  ];

  public async connect(): Promise<boolean> {
    if (typeof window === 'undefined' || !(navigator as any).bluetooth) {
      throw new Error('Web Bluetooth is not supported on this browser. Please use Chrome on Android or macOS.');
    }

    try {
      const bluetooth = (navigator as any).bluetooth;
      this.device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BluetoothThermalPrinter.PRINTER_SERVICES,
      });

      if (!this.device) return false;
      this.printerName = this.device.name || 'Bluetooth Thermal Printer';

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.characteristic = null;
      });

      this.server = await this.device.gatt.connect();

      // Find first usable writable characteristic across services
      for (const serviceUuid of BluetoothThermalPrinter.PRINTER_SERVICES) {
        try {
          const service = await this.server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              this.isConnected = true;
              return true;
            }
          }
        } catch {
          // continue search in other service UUIDs
        }
      }

      // If specific services failed, query all primary services
      if (!this.characteristic) {
        try {
          const services = await this.server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                this.characteristic = char;
                this.isConnected = true;
                return true;
              }
            }
          }
        } catch (e) {
          console.warn('Could not discover generic services', e);
        }
      }

      if (!this.characteristic) {
        throw new Error('Found Bluetooth device, but no ESC/POS writable print service was discovered.');
      }

      this.isConnected = true;
      return true;
    } catch (err: any) {
      this.isConnected = false;
      throw err;
    }
  }

  public async print(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Printer is not connected via Bluetooth.');
    }

    // BLE MTU Chunking: BLE characteristics typically accept 20 to 100 bytes at a time
    const CHUNK_SIZE = 64;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small 15ms pause to avoid saturating printer hardware buffer
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  public disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.characteristic = null;
  }
}

// ─── Web USB Thermal Printer Connection ───

export class UsbThermalPrinter {
  private device: any | null = null;
  private endpointOut: any | null = null;
  public isConnected: boolean = false;
  public printerName: string = '';

  public async connect(): Promise<boolean> {
    if (typeof window === 'undefined' || !(navigator as any).usb) {
      throw new Error('WebUSB is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
    }

    try {
      const usb = (navigator as any).usb;
      this.device = await usb.requestDevice({
        filters: [], // User selects from connected USB devices
      });

      if (!this.device) return false;
      this.printerName = this.device.productName || 'USB Thermal Printer';

      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim printer interface (Class 7 = Printer, or find Bulk OUT endpoint)
      for (const iface of this.device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          const outEp = alt.endpoints.find((ep: any) => ep.direction === 'out' && ep.type === 'bulk');
          if (outEp) {
            await this.device.claimInterface(iface.interfaceNumber);
            this.endpointOut = outEp;
            this.isConnected = true;
            return true;
          }
        }
      }

      throw new Error('No writable Bulk OUT endpoint found on selected USB device.');
    } catch (err: any) {
      this.isConnected = false;
      throw err;
    }
  }

  public async print(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.device || !this.endpointOut) {
      throw new Error('USB Thermal Printer is not connected.');
    }
    await this.device.transferOut(this.endpointOut.endpointNumber, bytes);
  }

  public async disconnect(): Promise<void> {
    if (this.device?.opened) {
      await this.device.close();
    }
    this.isConnected = false;
    this.endpointOut = null;
  }
}

// ─── Browser Thermal Print Fallback (High-Fidelity CSS Thermal Iframe) ───

export function printReceiptViaBrowserDialog(
  type: 'KOT' | 'RECEIPT',
  order: PrintOrderData,
  businessInfo?: BusinessPrintInfo,
  paperWidth: PaperWidth = 58
): void {
  if (typeof window === 'undefined') return;

  const widthMm = paperWidth === 80 ? '72mm' : '48mm';
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const subtotal = order.subtotal ?? order.items.reduce((s, i) => s + (i.amount ?? i.price * i.qty), 0);
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${type === 'KOT' ? 'KOT' : 'Receipt'} #${order.orderNumber}</title>
        <style>
          @page {
            size: ${paperWidth}mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${widthMm};
            margin: 0 auto;
            padding: 8px 4px;
            font-size: ${paperWidth === 80 ? '13px' : '11px'};
            line-height: 1.25;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .huge { font-size: ${paperWidth === 80 ? '22px' : '18px'}; font-weight: 900; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .item-name { flex: 1; padding-right: 4px; word-break: break-word; }
        </style>
      </head>
      <body>
        ${
          type === 'KOT'
            ? `
          <div class="center bold">*** KITCHEN ORDER TICKET ***</div>
          <div class="center">${businessInfo?.name || 'Local Kitchen'}</div>
          <div class="double-divider"></div>
          <div class="center huge">ORDER #${order.orderNumber}</div>
          <div class="center bold">[ ${order.orderType} ${order.tableNumber ? `- Table ${order.tableNumber}` : ''} ]</div>
          <div class="center">Time: ${dateStr}</div>
          ${order.customerName ? `<div class="center">Customer: ${order.customerName}</div>` : ''}
          <div class="divider"></div>
          ${order.items
            .map(
              (i) => `
            <div class="bold" style="font-size: 13px; margin: 4px 0;">
              ${i.qty} x ${i.name}
            </div>
            ${i.notes ? `<div style="font-size: 10px; margin-left: 12px;">* ${i.notes}</div>` : ''}
          `
            )
            .join('')}
          <div class="divider"></div>
          ${order.notes ? `<div class="bold">Note: ${order.notes}</div><div class="divider"></div>` : ''}
          <div class="center">Items: ${order.items.reduce((s, i) => s + i.qty, 0)}</div>
        `
            : `
          <div class="center huge">${businessInfo?.name || 'RECEIPT'}</div>
          ${businessInfo?.address ? `<div class="center">${businessInfo.address}</div>` : ''}
          ${businessInfo?.phone ? `<div class="center">Tel: ${businessInfo.phone}</div>` : ''}
          ${businessInfo?.gstin ? `<div class="center bold">GSTIN: ${businessInfo.gstin}</div>` : ''}
          <div class="double-divider"></div>
          <div class="row"><span>Order: #${order.orderNumber}</span><span>${order.orderType}</span></div>
          ${order.tableNumber ? `<div class="row"><span>Table:</span><span>${order.tableNumber}</span></div>` : ''}
          <div class="row"><span>Date:</span><span>${dateStr}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>Item</span><span>Amount</span></div>
          <div class="divider"></div>
          ${order.items
            .map(
              (i) => `
            <div class="item-row">
              <span class="item-name">${i.qty}x ${i.name}</span>
              <span>Rs.${((i.amount ?? i.price * i.qty)).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>Rs.${subtotal.toFixed(2)}</span></div>
          ${order.discount ? `<div class="row"><span>Discount:</span><span>-Rs.${order.discount.toFixed(2)}</span></div>` : ''}
          ${order.taxAmount ? `<div class="row"><span>${order.taxName || 'GST'}:</span><span>Rs.${order.taxAmount.toFixed(2)}</span></div>` : ''}
          <div class="double-divider"></div>
          <div class="row huge"><span>TOTAL:</span><span>Rs.${order.total.toFixed(2)}</span></div>
          <div class="center bold" style="margin-top: 6px;">[ ${order.paymentStatus === 'PAID' ? 'PAID' : 'PAY AT COUNTER'} ${order.paymentMethod ? `via ${order.paymentMethod}` : ''} ]</div>
          <div class="center" style="margin-top: 10px;">${businessInfo?.billFooter || 'Thank you! Please visit again.'}</div>
        `
        }
      </body>
    </html>
  `;

  iframe.contentWindow?.document.open();
  iframe.contentWindow?.document.write(html);
  iframe.contentWindow?.document.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Browser print error:', e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  };
}

// Global active printer singleton
export const activeBluetoothPrinter = new BluetoothThermalPrinter();
export const activeUsbPrinter = new UsbThermalPrinter();
