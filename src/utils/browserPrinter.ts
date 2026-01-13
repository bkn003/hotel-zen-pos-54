import { PrintData } from './bluetoothPrinter';
import { formatQuantityWithUnit } from './timeUtils';

export const printBrowserReceipt = (data: PrintData) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Could not access iframe document');
    return;
  }

  // COMPACT receipt styles - tea shop style
  const styles = `
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; font-size: 10px; line-height: 1.2; }
    .r { width: 54mm; margin: 0 auto; padding: 2mm; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .s { border-top: 1px dashed #000; margin: 2px 0; }
    .row { display: flex; justify-content: space-between; }
    .item { margin: 1px 0; }
    .name { max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .shop { font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .total { font-size: 11px; font-weight: bold; }
    .thx { font-size: 9px; margin-top: 3px; }
    .time { font-size: 8px; }
    .qty { font-size: 9px; font-weight: bold; }
  `;

  // Use the bill's time, not current time
  const timeStr = data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  // Calculate total items count
  const totalItems = data.items.length;

  // Compact item rows with qty (with unit) and total
  let itemsHtml = data.items.map(item => {
    const qtyWithUnit = formatQuantityWithUnit(item.quantity, item.unit);
    return `<div class="row item"><span class="name">${qtyWithUnit} × ${item.name}</span><span>₹${item.total.toFixed(0)}</span></div>`;
  }).join('');

  // Additional charges compact
  let chargesHtml = (data.additionalCharges || []).map(c => 
    `<div class="row"><span>${c.name.substring(0, 10)}</span><span>+${c.amount.toFixed(0)}</span></div>`
  ).join('');

  const hasExtras = (data.additionalCharges && data.additionalCharges.length > 0) || data.discount > 0;

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>${styles}</style></head><body>
    <div class="r">
      <div class="c shop">${data.shopName || data.hotelName || 'SHOP'}</div>
      <div class="c" style="font-size:9px">${[data.address, data.contactNumber].filter(Boolean).join(' | ')}</div>
      <div class="s"></div>
      <div class="row"><span>#${data.billNo}</span><span>${data.date}</span></div>
      <div class="c time">${timeStr}</div>
      <div class="s"></div>
      ${itemsHtml}
      <div class="s"></div>
      <div class="row"><span>Items: ${totalItems}</span><span>Sub: ${data.subtotal.toFixed(0)}</span></div>
      ${chargesHtml}
      ${data.discount > 0 ? `<div class="row"><span>Disc</span><span>-${data.discount.toFixed(0)}</span></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>Rs.${data.total.toFixed(0)}</span></div>
      <div class="row"><span>Paid</span><span>${data.paymentMethod.toUpperCase()}</span></div>
      <div class="c thx">Thank you!</div>
    </div>
  </body></html>`);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 60000);
  }, 500);
};
