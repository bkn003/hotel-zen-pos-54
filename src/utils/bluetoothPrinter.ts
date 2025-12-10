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

// Social Media Icons (Base64 SVGs for Canvas)
// We use simple black versions for printing validity
const FB_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTI0IDEyLjA3M2MwLTYuNjI3LTUuMzczLTEyLTEyLTEyczLTEyIDUuMzczLTEyIDEyYzAgNS45OSA0LjM4OCAxMC45NTQgMTAuMTI1IDExLjg1NHYtOC4zODVINy4wNzh2LTMuNDdoMy4wNDdWOS40M2MwLTMuMDA3IDEuNzkxLTQuNjY5IDQuNTMzLTQuNjY5IDEuMzEyIDAgMi42ODYuMjM1IDIuNjg2LjIzNXYyLjk1M0gxNS44M2MtMS40OTEgMC0xLjk1Ni45MjUtMS45NTYgMS44NzR2Mi4yNWgzLjMyOGwtLjUzMiAzLjQ3aC0yLjc5NnY4LjM4NUMxOS42MTIgMjMuMDI3IDI0IDE4LjA2MiAyNCAxMi4wNzN6Ii8+PC9zdmc+`;
const IG_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDIuMTYzYzMuMjA0IDAgMy41ODQuMDEyIDQuODUuMDcgMy4yNTIuMTQ4IDQuNzcxIDEuNjkxIDQuOTE5IDQuOTE5LjA1OCAxLjI2NS4wNjkgMS42NDUuMDY5IDQuODQ5IDAgMy4yMDUtLjAxMiAzLjU4NC0uMDY5IDQuODQ5LS4xNDkgMy4yMjUtMS42NjQgNC43NzEtNC45MTkgNC45MTktMS4yNjYuMDU4LTEuNjQ0LjA3LTQuODUuMDctMy4yMDQgMC0zLjU4NC0uMDEyLTQuODQ5LS4wNy0zLjI2LS4xNDktNC43NzEtMS42OTktNC45MTktNC45MjAtLjA1OC0xLjI2NS0uMDctMS42NDQtLjA3LTQuODQ5IDAtMy4yMDQuMDEzLTMuNTgzLjA3LTQuODQ5LjE0OS0zLjIyNyAxLjY2NC00Ljc3MSA0LjkxOS00LjkxOSAxLjI2Ni0uMDU3IDEuNjQ1LS4wNjkgNC44NDktLjA2OXptMC0yLjE2M2MtMy4yNTkgMC0zLjY2Ny4wMTQtNC45NDcuMDcyLTQuMzU4LjItNi43OCAyLjYxOC02Ljk4IDYuOTgtLjA1OSAxLjI4MS0uMDczIDEuNjg5LS4wNzMgNC45NDggMCAzLjI1OS4wMTQgMy42NjguMDcyIDQuOTQ4LjIgNC4zNTggMi42MTggNi43OCA2Ljk4IDYuOTggMS4yODEuMDU4IDEuNjg5LjA3MiA0Ljk0OC4wNzIgMy4yNTkgMCAzLjY2OC0uMDE0IDQuOTQ4LS4wNzIgNC4zNTQtLjIgNi43ODItMi42MTggNi45NzktNi45OC4wNTktMS4yOC4wNzMtMS42ODkuMDczLTQuOTQ4IDAtMy4yNTktLjAxNC0zLjY2Ny0uMDcyLTQuOTQ3LS4xOTYtNC4zNTQtMi42MTctNi43OC02Ljk3OS02Ljk4LTEuMjgxLS4wNTktMS42OS0uMDczLTQuOTQ5LS4wNzN6bTAgNS44MzhjLTMuNDAzIDAtNi4xNjIgMi43NTktNi4xNjIgNi4xNjJzMi43NTkgNi4xNjMgNi4xNjIgNi4xNjMgNi4xNjItMi43NTkgNi4xNjItNi4xNjNjMC0zLjQwMy0yLjc1OS02LjE2Mi02LjE2Mi02LjE2MnptMCAxMC4xNjJjLTIuMjA5IDAtNC0xLjc5LTQtNCAwLTIuMjA5IDEuNzkxLTQgNC00czQgMS43OTEgNCA0YzAgMi4yMS0xLjc5MSA0LTQgNHptNi40MDYtMTEuODQ1Yy0uNzk2IDAtMS40NDEuNjQ1LTEuNDQxIDEuNDRzLjY0NSAxLjQ0IDEuNDQxIDEuNDRjLjc5NSAwIDEuNDM5LS42NDUgMS40MzktMS40NHMtLjY0NC0xLjQ0LTEuNDM5LTEuNDR6Ii8+PC9zdmc+`;
const WA_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTS4wNTcgMjRsMS42ODctNi4xNjNjLTEuMDQxLTEuODA0LTEuNTg4LTMuODQ5LTEuNTg3LTUuOTQ2LjAwMy02LjU1NiA1LjMzOC0xMS44OTEgMTEuODkzLTExLjg5MSAzLjE4MS4wMDEgNi4xNjcgMS4yNCA4LjQxMyAzLjQ4OCAyLjI0NSAyLjI0OCAzLjQ4MSA1LjIzNiAzLjQ4IDguNDE0LS4wMDMgNi41NTctNS4zMzggMTEuODkyLTExLjg5MyAxMS44OTItMS45OS0uMDAxLTMuOTUxLS41LTUuNjg4LTEuNDQ4bC02LjMwNSAxLjY1NHptNi41OTctMy44MDdjMS42NzYuOTk1IDMuMjc2IDEuNTkxIDUuMzkyIDEuNTkyIDUuNDQ4IDAgOS44ODYtNC40MzQgOS44ODktOS44ODUuMDAyLTUuNDYyLTQuNDE1LTkuODktOS44ODEtOS44OTItNS40NTIgMC05Ljg4NyA0LjQzNC05Ljg4OSA5Ljg4NC0uMDAxIDIuMjI1LjY1MSAzLjg5MSAxLjc0NiA1LjYzNGwtLjk5OSAzLjY0OCAzLjc0Mi0uOTgxeiIvPjwvc3ZnPg==`;

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

// Helper: Generate Social Media Row Image
const generateSocialMediaImage = async (
  facebook?: string,
  instagram?: string,
  whatsapp?: string,
  targetWidth: number = 384
): Promise<Uint8Array | null> => {
  return new Promise(async (resolve) => {
    // 1. Create a canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(null); return; }

    // 2. Measure content
    ctx.font = 'bold 20px sans-serif';
    const iconSize = 24;
    const padding = 10;
    const gap = 20; // Gap between items

    // Items to draw
    const items = [];
    if (facebook) items.push({ icon: FB_SVG, text: facebook, type: 'fb' });
    if (instagram) items.push({ icon: IG_SVG, text: instagram, type: 'ig' });
    if (whatsapp) items.push({ icon: WA_SVG, text: whatsapp, type: 'wa' });

    if (items.length === 0) { resolve(null); return; }

    // Function to measure an item
    const measureItem = (item: any) => {
      return iconSize + padding + ctx.measureText(item.text).width;
    };

    // Calculate Layout (Rows)
    const rows: any[][] = [];
    let currentRow: any[] = [];
    let currentRowWidth = 0;

    items.forEach((item) => {
      const itemWidth = measureItem(item);

      // Check if adding this item would exceed width (account for gap if not first item)
      const gapWidth = currentRow.length > 0 ? gap : 0;

      if (currentRowWidth + gapWidth + itemWidth > targetWidth) {
        // Wrap to next line
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
          currentRowWidth = 0;
        }
      }

      // Add to current row
      if (currentRow.length > 0) currentRowWidth += gap;
      currentRow.push(item);
      currentRowWidth += itemWidth;
    });
    // Push last row
    if (currentRow.length > 0) rows.push(currentRow);

    // 3. Setup Canvas
    const rowHeight = 40;
    const canvasHeight = rows.length * rowHeight; // Tighter packing

    canvas.width = targetWidth;
    canvas.height = canvasHeight;
    // White bg
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load images helper
    const loadImg = (src: string) => new Promise<HTMLImageElement>((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.src = src;
    });

    try {
      // Draw Rows
      let currentY = 0;

      for (const row of rows) {
        // Calculate total width of this row to center it
        let rowContentWidth = 0;
        row.forEach((item, idx) => {
          rowContentWidth += measureItem(item);
          if (idx < row.length - 1) rowContentWidth += gap;
        });

        let currentX = Math.max(0, (targetWidth - rowContentWidth) / 2);

        for (const item of row) {
          const iconImg = await loadImg(item.icon);

          // Draw Icon
          ctx.drawImage(iconImg, currentX, currentY + (rowHeight - iconSize) / 2, iconSize, iconSize);
          currentX += iconSize + padding;

          // Draw Text
          ctx.fillStyle = 'black';
          ctx.font = 'bold 20px sans-serif'; // Reset font just in case
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, currentX, currentY + rowHeight / 2);

          currentX += ctx.measureText(item.text).width + gap;
        }

        currentY += rowHeight;
      }

      const dataUrl = canvas.toDataURL('image/png');
      const printBytes = await processImageForPrinting(dataUrl, targetWidth);
      resolve(printBytes);

    } catch (e) {
      console.error("Failed to generate social image", e);
      resolve(null);
    }
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
  paymentDetails?: Record<string, number>;
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
      // Use full width for logo (was 0.9)
      const loopsWidth = Math.floor(IMAGE_WIDTH * 1.0);
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

  // Social Media - Print as Image
  if (data.facebook || data.instagram || data.whatsapp) {
    try {
      const loopsWidth = Math.floor(IMAGE_WIDTH * 0.95);
      // Generate image with multi-line wrapping support
      const socialImageBytes = await generateSocialMediaImage(data.facebook, data.instagram, data.whatsapp, loopsWidth);
      if (socialImageBytes) {
        commands.push(ALIGN_CENTER);
        commands.push(socialImageBytes);
        commands.push(FEED_LINE);
      } else {
        // Fallback to text if image generation fails
        if (data.facebook) commands.push(textToBytes(`fb: ${data.facebook}\n`));
        if (data.instagram) commands.push(textToBytes(`ig: ${data.instagram}\n`));
        if (data.whatsapp) commands.push(textToBytes(`wa: ${data.whatsapp}\n`));
      }
    } catch (e) {
      console.warn("Failed to print social icons", e);
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
