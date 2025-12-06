// ESC/POS Commands for thermal printers
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Initialize printer
const INIT = new Uint8Array([ESC, 0x40]);

// Text formatting
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 1]);
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0]);
const BOLD_ON = new Uint8Array([ESC, 0x45, 1]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0]);
const DOUBLE_SIZE = new Uint8Array([GS, 0x21, 0x11]);
const NORMAL_SIZE = new Uint8Array([GS, 0x21, 0x00]);

// Cut paper
const CUT = new Uint8Array([GS, 0x56, 0x00]);

// Line feed
const FEED_LINE = new Uint8Array([LF]);
const FEED_LINES = (n: number) => new Uint8Array([ESC, 0x64, n]);

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface PrintData {
  billNo: string;
  date: string;
  time: string;
  items: BillItem[];
  subtotal: number;
  additionalCharges?: { name: string; amount: number }[];
  discount: number;
  total: number;
  paymentMethod: string;
  hotelName?: string;
}

const textToBytes = (text: string): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(text);
};

const padRight = (text: string, length: number): string => {
  return text.length >= length ? text.substring(0, length) : text + ' '.repeat(length - text.length);
};

const formatLine = (left: string, right: string, width: number = 32): string => {
  const rightLen = right.length;
  const leftLen = width - rightLen - 1;
  return padRight(left, leftLen) + ' ' + right;
};

const generateReceiptBytes = (data: PrintData): Uint8Array => {
  const commands: Uint8Array[] = [];
  
  // Initialize
  commands.push(INIT);
  
  // Header - Hotel Name
  if (data.hotelName) {
    commands.push(ALIGN_CENTER);
    commands.push(DOUBLE_SIZE);
    commands.push(BOLD_ON);
    commands.push(textToBytes(data.hotelName));
    commands.push(FEED_LINE);
    commands.push(BOLD_OFF);
    commands.push(NORMAL_SIZE);
  }
  
  // Bill info
  commands.push(ALIGN_CENTER);
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  commands.push(textToBytes(`Bill No: ${data.billNo}`));
  commands.push(FEED_LINE);
  commands.push(textToBytes(`${data.date} ${data.time}`));
  commands.push(FEED_LINE);
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  
  // Items header
  commands.push(ALIGN_LEFT);
  commands.push(BOLD_ON);
  commands.push(textToBytes(formatLine('Item', 'Amount')));
  commands.push(FEED_LINE);
  commands.push(BOLD_OFF);
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  
  // Items
  data.items.forEach(item => {
    const itemName = item.name.length > 18 ? item.name.substring(0, 18) : item.name;
    const qtyPrice = `${item.quantity}x${item.price.toFixed(0)}`;
    const total = item.total.toFixed(2);
    
    commands.push(textToBytes(itemName));
    commands.push(FEED_LINE);
    commands.push(textToBytes(formatLine(`  ${qtyPrice}`, `Rs.${total}`)));
    commands.push(FEED_LINE);
  });
  
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  
  // Subtotal
  commands.push(textToBytes(formatLine('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`)));
  commands.push(FEED_LINE);
  
  // Additional charges
  if (data.additionalCharges && data.additionalCharges.length > 0) {
    data.additionalCharges.forEach(charge => {
      commands.push(textToBytes(formatLine(charge.name + ':', `+Rs.${charge.amount.toFixed(2)}`)));
      commands.push(FEED_LINE);
    });
  }
  
  // Discount
  if (data.discount > 0) {
    commands.push(textToBytes(formatLine('Discount:', `-Rs.${data.discount.toFixed(2)}`)));
    commands.push(FEED_LINE);
  }
  
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  
  // Total
  commands.push(BOLD_ON);
  commands.push(DOUBLE_SIZE);
  commands.push(textToBytes(formatLine('TOTAL:', `Rs.${data.total.toFixed(2)}`)));
  commands.push(FEED_LINE);
  commands.push(NORMAL_SIZE);
  commands.push(BOLD_OFF);
  
  commands.push(textToBytes('--------------------------------'));
  commands.push(FEED_LINE);
  
  // Payment method
  commands.push(ALIGN_CENTER);
  commands.push(textToBytes(`Paid by: ${data.paymentMethod.toUpperCase()}`));
  commands.push(FEED_LINE);
  
  // Footer
  commands.push(FEED_LINES(2));
  commands.push(textToBytes('Thank you for your visit!'));
  commands.push(FEED_LINES(3));
  
  // Cut paper
  commands.push(CUT);
  
  // Combine all commands
  const totalLength = commands.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  commands.forEach(arr => {
    result.set(arr, offset);
    offset += arr.length;
  });
  
  return result;
};

export const printReceipt = async (data: PrintData): Promise<boolean> => {
  const nav = navigator as any;
  
  if (!nav.bluetooth) {
    console.error('Bluetooth not supported');
    return false;
  }

  try {
    // Request device
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    if (!device.gatt) {
      throw new Error('GATT not available');
    }

    // Connect to GATT server
    const server = await device.gatt.connect();
    
    // Get the primary service
    const services = await server.getPrimaryServices();
    
    if (services.length === 0) {
      throw new Error('No services found');
    }

    // Find writable characteristic
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const receiptBytes = generateReceiptBytes(data);
          
          // Send in chunks (max 512 bytes per write)
          const chunkSize = 512;
          for (let i = 0; i < receiptBytes.length; i += chunkSize) {
            const chunk = receiptBytes.slice(i, Math.min(i + chunkSize, receiptBytes.length));
            await char.writeValueWithoutResponse(chunk);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          server.disconnect();
          return true;
        }
      }
    }

    server.disconnect();
    throw new Error('No writable characteristic found');
  } catch (error) {
    console.error('Print error:', error);
    return false;
  }
};

export type { PrintData, BillItem };
