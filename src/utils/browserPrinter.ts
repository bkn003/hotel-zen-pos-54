import { PrintData } from './bluetoothPrinter';
import { formatQuantityWithUnit } from './timeUtils';

// Detect if running on mobile device
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const printBrowserReceipt = (data: PrintData) => {
  const width = data.printerWidth || '58mm';
  const widthValue = width === '80mm' ? '3.125in' : '2.125in';

  // Debug logging
  console.log('🖨️ Print Data:', {
    items: data.items.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })),
    totalItemsCount: data.totalItemsCount,
    smartQtyCount: data.smartQtyCount,
    isMobile: isMobile()
  });

  // Compact item rows with qty (with unit) and total
  let itemsHtml = data.items.map(item => {
    const qtyWithUnit = formatQuantityWithUnit(item.quantity, item.unit);
    return `<div class="row item"><span class="name">${qtyWithUnit} × ${item.name}</span><span>₹${item.total.toFixed(0)}</span></div>`;
  }).join('');

  const totalItems = data.totalItemsCount || data.items.length;
  const smartQty = data.smartQtyCount || 0;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill #${data.billNo}</title>
        <style>
          @page { 
            margin: 5mm; 
            size: ${widthValue} auto;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          body { 
            font-family: 'Courier New', Courier, monospace;
            width: 100%;
            max-width: ${widthValue};
            margin: 0 auto;
            padding: 8px;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 8px; }
          .shop-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item { font-size: 11px; }
          .item .name { 
            flex: 1; 
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 5px;
          }
          .total-row { font-size: 13px; font-weight: bold; margin-top: 5px; }
          .footer { margin-top: 10px; font-size: 10px; }
          .qty-row { font-weight: bold; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="shop-name">${(data.shopName || data.hotelName).toUpperCase()}</div>
          ${data.address ? `<div>${data.address}</div>` : ''}
          ${data.contactNumber ? `<div>Ph: ${data.contactNumber}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="row"><span>#${data.billNo}</span><span>${data.date}</span></div>
        <div class="row"><span>Time:</span><span>${data.time}</span></div>
        <div class="divider"></div>

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="divider"></div>
        <div class="row qty-row">
          <span>Items: ${totalItems}</span>
          <span>Qty: ${smartQty}</span>
        </div>
        <div class="divider"></div>

        <div class="row"><span>Subtotal:</span><span>₹${data.subtotal.toFixed(0)}</span></div>
        ${data.additionalCharges?.map(c => `<div class="row"><span>${c.name}:</span><span>₹${c.amount.toFixed(0)}</span></div>`).join('') || ''}
        ${data.discount ? (data.discount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${data.discount.toFixed(0)}</span></div>` : '') : ''}
        
        <div class="row total-row">
          <span>TOTAL:</span>
          <span>₹${data.total.toFixed(0)}</span>
        </div>

        <div class="row" style="margin-top: 5px;">
          <span>Paid via:</span>
          <span>${data.paymentMethod.toUpperCase()}</span>
        </div>

        <div class="footer center">
          <div>Thank you!</div>
          ${data.facebook || data.instagram || data.whatsapp ? '<div class="divider"></div>' : ''}
          ${data.facebook ? `<div>FB: ${data.facebook}</div>` : ''}
          ${data.instagram ? `<div>IG: ${data.instagram}</div>` : ''}
          ${data.whatsapp ? `<div>WA: ${data.whatsapp}</div>` : ''}
        </div>
      </body>
    </html>
  `;

  // Use iframe-based printing for mobile (more reliable for Save as PDF)
  if (isMobile()) {
    printViaMobileIframe(html, data.billNo);
  } else {
    printViaPopup(html);
  }
};

// Mobile-friendly printing via iframe
const printViaMobileIframe = (html: string, billNo: string) => {
  // Remove any existing print iframe
  const existingFrame = document.getElementById('print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'print-iframe';
  iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; border: none; z-index: 99999; background: white;';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Could not access iframe document');
    // Fallback to popup
    printViaPopup(html);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Add close button for mobile
  const closeBtn = iframeDoc.createElement('button');
  closeBtn.innerHTML = '✕ Close';
  closeBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 100000;
    padding: 10px 20px;
    font-size: 16px;
    background: #333;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => iframe.remove();
  iframeDoc.body.appendChild(closeBtn);

  // Add print button for mobile
  const printBtn = iframeDoc.createElement('button');
  printBtn.innerHTML = '🖨️ Print / Save PDF';
  printBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100000;
    padding: 15px 40px;
    font-size: 18px;
    font-weight: bold;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  printBtn.onclick = () => {
    // Hide buttons before printing
    closeBtn.style.display = 'none';
    printBtn.style.display = 'none';

    // Give browser time to hide buttons, then print
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.print();
      }
      // Show buttons again after print dialog
      setTimeout(() => {
        closeBtn.style.display = 'block';
        printBtn.style.display = 'block';
      }, 1000);
    }, 100);
  };
  iframeDoc.body.appendChild(printBtn);

  console.log('📱 Mobile print iframe ready - tap Print/Save PDF button');
};

// Desktop printing via popup (original method)
const printViaPopup = (html: string) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to fully render before printing
    setTimeout(() => {
      printWindow.print();
      // Don't auto-close on mobile, let user close manually
      if (!isMobile()) {
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }
    }, 500);
  } else {
    console.error('Popup blocked - please allow popups for this site');
    alert('Popup blocked! Please allow popups for this site to print bills.');
  }
};
