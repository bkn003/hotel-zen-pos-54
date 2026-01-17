import { PrintData } from './bluetoothPrinter';
import { formatQuantityWithUnit } from './timeUtils';

export const printBrowserReceipt = (data: PrintData) => {
  const width = data.printerWidth || '58mm';
  const widthValue = width === '80mm' ? '3.125in' : '2.125in';

  // Debug logging - can be removed later
  console.log('🖨️ Print Data:', {
    items: data.items.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })),
    totalItemsCount: data.totalItemsCount,
    smartQtyCount: data.smartQtyCount
  });

  // Compact item rows with qty (with unit) and total
  let itemsHtml = data.items.map(item => {
    const qtyWithUnit = formatQuantityWithUnit(item.quantity, item.unit);
    return `<div class="row item"><span class="name">${qtyWithUnit} × ${item.name}</span><span>₹${item.total.toFixed(0)}</span></div>`;
  }).join('');

  const totalItems = data.totalItemsCount || data.items.length;
  const smartQty = data.smartQtyCount || 0;


  const html = `
    <html>
      <head>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            width: ${widthValue};
            margin: 0;
            padding: 10px;
            font-size: 11px;
            line-height: 1.2;
            color: black;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 10px; }
          .shop-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed black; margin: 5px 0; }
          .row { display: flex; justify-content: space-between; margin: 1px 0; }
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

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};
