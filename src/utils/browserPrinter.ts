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
      margin: 0mm 0mm 0mm 0mm; 
    }
    
    * {
      box-sizing: border-box;
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
      padding: 8px 5px 5px 5px;
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
      flex-direction: row;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .social-item {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    
    .social-icon {
      width: 12px;
      height: 12px;
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
    
    .footer { text-align: center; margin-top: 8px; margin-bottom: 3px; font-size: 11px; color: #555; }
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

  // 3. Social Media with Icons (inline SVG for print compatibility)
  let socialHtml = '';
  const socialItems: string[] = [];

  // Facebook icon (simple F in circle)
  if (data.facebook) {
    socialItems.push(`<span class="social-item"><svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>${data.facebook}</span>`);
  }

  // Instagram icon
  if (data.instagram) {
    socialItems.push(`<span class="social-item"><svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3Z"/></svg>${data.instagram}</span>`);
  }

  // WhatsApp icon
  if (data.whatsapp) {
    socialItems.push(`<span class="social-item"><svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg>${data.whatsapp}</span>`);
  }

  if (socialItems.length > 0) {
    socialHtml = `<div class="social-section">${socialItems.join('')}</div>`;
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
