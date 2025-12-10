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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    @page { 
      size: 80mm auto; 
      margin: 0mm; 
    }
    
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #fff;
    }
    
    .receipt-container {
      width: 76mm; /* Constrain to slightly less than 80mm */
      margin: 0 auto;
      padding: 10px 5px;
      font-size: 12px;
      line-height: 1.3;
      color: #000;
      box-sizing: border-box;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: 600; }
    
    .header-section { 
      text-align: center; 
      margin-bottom: 12px; 
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .logo { 
      max-width: 60px; 
      max-height: 60px; 
      object-fit: contain; 
      margin-bottom: 5px;
    }
    
    .shop-name { 
      font-size: 16px; 
      font-weight: 700; 
      text-transform: uppercase; 
      margin: 2px 0;
      word-wrap: break-word;
    }
    
    .shop-address, .shop-contact { 
      font-size: 11px; 
      color: #333; 
    }
    
    .social-section {
      margin-top: 4px;
      font-size: 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .bill-meta { 
      margin: 10px 0; 
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 5px 0;
      font-size: 11px;
    }
    
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; }
    td { padding: 4px 0; vertical-align: top; }
    
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .item-qty { font-size: 11px; color: #555; margin-top: 2px; }
    
    .summary-section { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      font-size: 16px; 
      font-weight: 700; 
      margin-top: 8px; 
      border-top: 1px solid #000; 
      padding-top: 5px;
    }
    
    .footer { text-align: center; margin-top: 15px; font-size: 11px; color: #555; }
  `;

  // --- Content Generators ---

  // 1. Logo
  const logoHtml = data.logoUrl
    ? `<img src="${data.logoUrl}" class="logo" onerror="this.style.display='none'" />`
    : '';

  // 2. Shop Info
  const shopNameHtml = `<div class="shop-name">${data.shopName || data.hotelName || 'My Shop'}</div>`;
  const addressHtml = data.address ? `<div class="shop-address">${data.address}</div>` : '';
  const contactHtml = data.contactNumber ? `<div class="shop-contact">Tel: ${data.contactNumber}</div>` : '';

  // 3. Social Media
  let socialHtml = '';
  const socials = [];
  if (data.facebook) socials.push(`FB: ${data.facebook}`);
  if (data.instagram) socials.push(`IG: ${data.instagram}`);
  if (data.whatsapp) socials.push(`WA: ${data.whatsapp}`);

  if (socials.length > 0) {
    socialHtml = `<div class="social-section">${socials.map(s => `<span>${s}</span>`).join('')}</div>`;
  }

  // 4. Items Report
  let itemsHtml = '';
  data.items.forEach(item => {
    itemsHtml += `
      <tr>
        <td colspan="2">
          <div style="font-weight: 500;">${item.name}</div>
          <div class="item-row">
            <span class="item-qty">${item.quantity} x ${item.price.toFixed(2)}</span>
            <span class="bold">${item.total.toFixed(2)}</span>
          </div>
        </td>
      </tr>
    `;
  });

  // 5. Additional Charges
  let additionalChargesHtml = '';
  if (data.additionalCharges && data.additionalCharges.length > 0) {
    data.additionalCharges.forEach(charge => {
      additionalChargesHtml += `
        <div class="summary-row">
          <span>${charge.name}</span>
          <span>+${charge.amount.toFixed(2)}</span>
        </div>
      `;
    });
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Receipt</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header-section">
            ${logoHtml}
            ${shopNameHtml}
            ${addressHtml}
            ${contactHtml}
            ${socialHtml}
          </div>
          
          <div class="bill-meta">
            <div style="display: flex; justify-content: space-between;">
              <span>Bill No: <b>${data.billNo}</b></span>
            </div>
            <div style="font-size: 10px; color: #555; margin-top: 2px;">
              ${data.date} ${data.time}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th width="65%">Item</th>
                <th width="35%" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div class="summary-row">
              <span>Subtotal</span>
              <b>${data.subtotal.toFixed(2)}</b>
            </div>
            ${additionalChargesHtml}
            ${data.discount > 0 ? `
            <div class="summary-row">
              <span>Discount</span>
              <span>-${data.discount.toFixed(2)}</span>
            </div>` : ''}
            
            <div class="total-row">
              <span>TOTAL</span>
              <span>${data.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="text-center" style="margin-top: 10px; font-size: 10px; border: 1px solid #ddd; padding: 4px; border-radius: 4px;">
            PAID VIA ${data.paymentMethod.toUpperCase()} <br/>
            ${Object.entries(data.paymentDetails || {}).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' | ')}
          </div>
          
          <div class="footer">
            Thank you for your visit!
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Print execution
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  }, 500);
};
