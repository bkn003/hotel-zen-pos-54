// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const INIT = new Uint8Array([ESC, 0x40]);
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);
const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);
const DOUBLE_SIZE = new Uint8Array([GS, 0x21, 0x11]);
const NORMAL_SIZE = new Uint8Array([GS, 0x21, 0x00]);
const FEED_LINE = new Uint8Array([0x0A]);
const FEED_LINES = (n: number) => new Uint8Array([ESC, 0x64, n]);
const CUT = new Uint8Array([GS, 0x56, 0x41, 0x10]); // Cut full with feed

// Helper to convert Base64 to bitmap data for ESC/POS
const processImageForPrinting = async (base64Url: string, targetWidth: number = 384): Promise<Uint8Array | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Calculate height to maintain aspect ratio
      const height = Math.floor((img.height * targetWidth) / img.width);
      canvas.width = targetWidth;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Draw image to canvas (white background)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, targetWidth, height);

      const imageData = ctx.getImageData(0, 0, targetWidth, height);
      const data = imageData.data;

      // Convert to monochrome (thresholding)
      // We need to pack bits: 1 bit per pixel. 0 = white, 1 = black.
      // Width must be divisible by 8 for standard raster command
      const validWidth = Math.ceil(targetWidth / 8) * 8;
      const xBytes = validWidth / 8;
      const yBits = height;

      // GS v 0 m xL xH yL yH d1...dk
      // m = 0 (normal), xL, xH = width in bytes, yL, yH = height in dots

      const commandHeader = new Uint8Array([
        0x1D, 0x76, 0x30, 0x00,
        xBytes % 256, Math.floor(xBytes / 256),
        yBits % 256, Math.floor(yBits / 256)
      ]);

      const imageBuffer = new Uint8Array(xBytes * yBits);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < xBytes; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const currentX = x * 8 + bit;
            if (currentX < targetWidth) {
              const pixelIndex = (y * targetWidth + currentX) * 4;
              // Simple luminance formula
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

              // If dark enough, set bit (1 = print/black)
              if (luminance < 128) {
                byte |= (1 << (7 - bit));
              }
            }
          }
          imageBuffer[y * xBytes + x] = byte;
        }
      }

      // Merge header and body
      const finalCommand = new Uint8Array(commandHeader.length + imageBuffer.length);
      finalCommand.set(commandHeader);
      finalCommand.set(imageBuffer, commandHeader.length);

      resolve(finalCommand);
    };

    img.onerror = () => resolve(null);
    img.src = base64Url;
  });
};

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
  shopName?: string;
  address?: string;
  contactNumber?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  printerWidth?: '58mm' | '80mm';
  logoUrl?: string;
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

const generateReceiptBytes = async (data: PrintData): Promise<Uint8Array> => {
  const commands: Uint8Array[] = [];

  // Set width based on setting (default single width, 58mm = 32 chars, 80mm = 48 chars)
  // For images: 58mm ~384 dots, 80mm ~576 dots
  const LINE_WIDTH = data.printerWidth === '80mm' ? 48 : 32;
  const IMAGE_WIDTH = data.printerWidth === '80mm' ? 576 : 384;
  const SEPARATOR = '-'.repeat(LINE_WIDTH);

  // Helper to format line with current width
  const formatLineDynamic = (left: string, right: string) => formatLine(left, right, LINE_WIDTH);

  // Initialize
  commands.push(INIT);
  commands.push(ALIGN_CENTER); // Default center for header

  // 1. Logo (if available) - Print First
  if (data.logoUrl) {
    try {
      // Use slightly smaller width for safety margin (e.g. 90% of max)
      const loopsWidth = Math.floor(IMAGE_WIDTH * 0.9);
      const imageBytes = await processImageForPrinting(data.logoUrl, loopsWidth);
      if (imageBytes) {
        commands.push(ALIGN_CENTER);
        commands.push(imageBytes);
        commands.push(FEED_LINE);
      }
    } catch (e) {
      console.warn("Failed to process logo for printing", e);
    }
  }

  // Header - Shop Name (Override) or Hotel Name
  const headerName = data.shopName || data.hotelName;
  if (headerName) {
    commands.push(ALIGN_CENTER);
    commands.push(DOUBLE_SIZE);
    commands.push(BOLD_ON);
    commands.push(textToBytes(headerName));
    commands.push(FEED_LINE);
    commands.push(BOLD_OFF);
    commands.push(NORMAL_SIZE);
  }

  commands.push(NORMAL_SIZE);
}

// Address
if (data.address) {
  commands.push(ALIGN_CENTER);
  commands.push(textToBytes(data.address));
  commands.push(FEED_LINE);
}

// Contact Number
if (data.contactNumber) {
  commands.push(ALIGN_CENTER);
  commands.push(textToBytes(data.contactNumber));
  commands.push(FEED_LINE);
}

// Social Media
if (data.facebook || data.instagram || data.whatsapp) {
  commands.push(ALIGN_CENTER);
  if (data.facebook) {
    commands.push(textToBytes(`fb: ${data.facebook}`));
    commands.push(FEED_LINE);
  }
  if (data.instagram) {
    commands.push(textToBytes(`ig: ${data.instagram}`));
    commands.push(FEED_LINE);
  }
  if (data.whatsapp) {
    commands.push(textToBytes(`wa: ${data.whatsapp}`));
    commands.push(FEED_LINE);
  }
}

// Bill info
commands.push(ALIGN_CENTER);
commands.push(textToBytes(SEPARATOR));
commands.push(FEED_LINE);
commands.push(textToBytes(`Bill No: ${data.billNo}`));
commands.push(FEED_LINE);
commands.push(textToBytes(`${data.date} ${data.time}`));
commands.push(FEED_LINE);
commands.push(textToBytes(SEPARATOR));
commands.push(FEED_LINE);

// Items header
commands.push(ALIGN_LEFT);
commands.push(BOLD_ON);
commands.push(textToBytes(formatLineDynamic('Item', 'Amount')));
commands.push(FEED_LINE);
commands.push(BOLD_OFF);
commands.push(textToBytes(SEPARATOR));
commands.push(FEED_LINE);

// Items
data.items.forEach(item => {
  // Truncate name to fit (width - 14 for price/qty)
  const nameWidth = LINE_WIDTH - 14;
  const itemName = item.name.length > nameWidth ? item.name.substring(0, nameWidth) : item.name;
  const qtyPrice = `${item.quantity}x${item.price.toFixed(0)}`;
  const total = item.total.toFixed(2);

  commands.push(textToBytes(itemName));
  commands.push(FEED_LINE);
  commands.push(textToBytes(formatLineDynamic(`  ${qtyPrice}`, `Rs.${total}`)));
  commands.push(FEED_LINE);
});

commands.push(textToBytes(SEPARATOR));
commands.push(FEED_LINE);

// Subtotal
commands.push(textToBytes(formatLineDynamic('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`)));
commands.push(FEED_LINE);

// Additional charges
if (data.additionalCharges && data.additionalCharges.length > 0) {
  data.additionalCharges.forEach(charge => {
    commands.push(textToBytes(formatLineDynamic(charge.name + ':', `+Rs.${charge.amount.toFixed(2)}`)));
    commands.push(FEED_LINE);
  });
}

// Discount
if (data.discount > 0) {
  commands.push(textToBytes(formatLineDynamic('Discount:', `-Rs.${data.discount.toFixed(2)}`)));
  commands.push(FEED_LINE);
}

commands.push(textToBytes(SEPARATOR));
commands.push(FEED_LINE);

// Total
commands.push(BOLD_ON);
commands.push(DOUBLE_SIZE);
commands.push(textToBytes(formatLineDynamic('TOTAL:', `Rs.${data.total.toFixed(2)}`)));
commands.push(FEED_LINE);
commands.push(NORMAL_SIZE);
commands.push(BOLD_OFF);

commands.push(textToBytes(SEPARATOR));
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
          const receiptBytes = await generateReceiptBytes(data);

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
