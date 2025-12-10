import { PrintData } from './bluetoothPrinter';

export const printBrowserReceipt = (data: PrintData) => {
  // Create a hidden iframe
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

  // Generate HTML content
  const styles = `
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      font-size: 12px;
      line-height: 1.2;
      padding: 10px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .double-size { font-size: 1.5em; font-weight: bold; }
    .separator { border-top: 1px dashed black; margin: 5px 0; }
    .item-row { display: flex; justify-content: space-between; }
    .logo { width: 1.5in; height: 1.5in; object-fit: contain; display: block; margin: 0 auto 10px; }
  `;

  let itemsHtml = '';
  data.items.forEach(item => {
    itemsHtml += `
      <div style="margin-bottom: 2px;">
        <div>${item.name}</div>
        <div class="item-row">
          <span>${item.quantity} x ${item.price.toFixed(0)}</span>
          <span>${item.total.toFixed(2)}</span>
        </div>
      </div>
    `;
  });

  let additionalChargesHtml = '';
  if (data.additionalCharges) {
    data.additionalCharges.forEach(charge => {
      additionalChargesHtml += `
        <div class="item-row">
          <span>${charge.name}:</span>
          <span>+${charge.amount.toFixed(2)}</span>
        </div>
      `;
    });
  }

  const logoHtml = data.logoUrl ? `<img src="${data.logoUrl}" class="logo" />` : '';
  const shopNameHtml = data.shopName || data.hotelName ? `<div class="text-center double-size">${data.shopName || data.hotelName}</div>` : '';
  const addressHtml = data.address ? `<div class="text-center">${data.address}</div>` : '';
  const contactHtml = data.contactNumber ? `<div class="text-center">${data.contactNumber}</div>` : '';

  // Social media
  let socialHtml = '';
  if (data.facebook) socialHtml += `<div>FB: ${data.facebook}</div>`;
  if (data.instagram) socialHtml += `<div>IG: ${data.instagram}</div>`;
  if (data.whatsapp) socialHtml += `<div>WA: ${data.whatsapp}</div>`;
  if (socialHtml) socialHtml = `<div class="text-center" style="font-size: 10px; margin-top: 5px;">${socialHtml}</div>`;

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>${styles}</style>
      </head>
      <body>
        ${logoHtml}
        ${shopNameHtml}
        ${addressHtml}
        ${contactHtml}
        ${socialHtml}
        
        <div class="separator"></div>
        <div class="text-center">Bill No: ${data.billNo}</div>
        <div class="text-center">${data.date} ${data.time}</div>
        <div class="separator"></div>
        
        <div class="item-row bold">
          <span>Item</span>
          <span>Amount</span>
        </div>
        <div class="separator"></div>
        
        ${itemsHtml}
        
        <div class="separator"></div>
        
        <div class="item-row">
          <span>Subtotal:</span>
          <span>${data.subtotal.toFixed(2)}</span>
        </div>
        ${additionalChargesHtml}
        ${data.discount > 0 ? `
        <div class="item-row">
          <span>Discount:</span>
          <span>-${data.discount.toFixed(2)}</span>
        </div>` : ''}
        
        <div class="separator"></div>
        <div class="item-row double-size">
          <span>TOTAL:</span>
          <span>${data.total.toFixed(2)}</span>
        </div>
        <div class="separator"></div>
        
        <div class="text-center">
            ${data.paymentDetails ? Object.entries(data.paymentDetails).map(([method, amount]) => `${method}: ${Number(amount).toFixed(2)}`).join(' | ') : `Paid by: ${data.paymentMethod.toUpperCase()}`}
        </div>
        
        <br/><br/>
        <div class="text-center">Thank you for your visit!</div>
      </body>
    </html>
  `);
  doc.close();

  // Print and remove iframe
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Use a longer timeout to allow print dialog to appear before removing
    // In many browsers, removing the iframe cancels the print. 
    // It's safer to keep it or remove it after a long delay or on user action.
    // For now, we'll leave it or remove after 1 min to be safe.
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  }, 500);
};
