import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Define interfaces for different report types
interface ExpenseForPDF {
  expense_name?: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

interface ExpenseForExport {
  expense_name?: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  created_at: string;
}

interface BillForExport {
  bill_no: string;
  date: string;
  time: string;
  total_amount: number;
  discount: number;
  payment_mode: string;
  items_count: number;
}

interface ItemForExport {
  item_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

interface PaymentForExport {
  payment_method: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

interface ProfitLossForExport {
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
}

// Export all reports to Excel with separate sheets
export const exportAllReportsToExcel = (data: {
  bills: BillForExport[];
  items: ItemForExport[];
  payments: PaymentForExport[];
  profitLoss: ProfitLossForExport[];
  dateRange: string;
}) => {
  const wb = XLSX.utils.book_new();

  // Bills sheet
  if (data.bills.length > 0) {
    const billsData = data.bills.map((bill, index) => ({
      '#': index + 1,
      'Bill No': bill.bill_no,
      'Date': bill.date,
      'Time': bill.time,
      'Amount': bill.total_amount,
      'Discount': bill.discount,
      'Payment Mode': bill.payment_mode,
      'Items': bill.items_count
    }));

    const billsTotal = data.bills.reduce((sum, bill) => sum + bill.total_amount, 0);
    billsData.push({
      '#': '',
      'Bill No': '',
      'Date': 'TOTAL',
      'Time': '',
      'Amount': billsTotal,
      'Discount': data.bills.reduce((sum, bill) => sum + bill.discount, 0),
      'Payment Mode': '',
      'Items': data.bills.reduce((sum, bill) => sum + bill.items_count, 0)
    } as any);

    const billsWs = XLSX.utils.json_to_sheet(billsData);

    // Auto-fit columns
    const billsRange = XLSX.utils.decode_range(billsWs['!ref'] || 'A1');
    const billsColWidths = [];
    for (let C = billsRange.s.c; C <= billsRange.e.c; ++C) {
      let maxWidth = 10;
      for (let R = billsRange.s.r; R <= billsRange.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = billsWs[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          maxWidth = Math.max(maxWidth, cellLength + 2);
        }
      }
      billsColWidths.push({ width: Math.min(maxWidth, 50) });
    }
    billsWs['!cols'] = billsColWidths;

    XLSX.utils.book_append_sheet(wb, billsWs, 'Bills Report');
  }

  // Items sheet
  if (data.items.length > 0) {
    const itemsData = data.items.map((item, index) => ({
      '#': index + 1,
      'Item Name': item.item_name,
      'Category': item.category,
      'Quantity Sold': item.total_quantity,
      'Revenue': item.total_revenue
    }));

    const itemsTotal = data.items.reduce((sum, item) => sum + item.total_revenue, 0);
    itemsData.push({
      '#': '',
      'Item Name': '',
      'Category': 'TOTAL',
      'Quantity Sold': data.items.reduce((sum, item) => sum + item.total_quantity, 0),
      'Revenue': itemsTotal
    } as any);

    const itemsWs = XLSX.utils.json_to_sheet(itemsData);

    // Auto-fit columns for items
    const itemsRange = XLSX.utils.decode_range(itemsWs['!ref'] || 'A1');
    const itemsColWidths = [];
    for (let C = itemsRange.s.c; C <= itemsRange.e.c; ++C) {
      let maxWidth = 10;
      for (let R = itemsRange.s.r; R <= itemsRange.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = itemsWs[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          maxWidth = Math.max(maxWidth, cellLength + 2);
        }
      }
      itemsColWidths.push({ width: Math.min(maxWidth, 50) });
    }
    itemsWs['!cols'] = itemsColWidths;

    XLSX.utils.book_append_sheet(wb, itemsWs, 'Items Report');
  }

  // Payments sheet
  if (data.payments.length > 0) {
    const paymentsData = data.payments.map((payment, index) => ({
      '#': index + 1,
      'Payment Method': payment.payment_method,
      'Amount': payment.total_amount,
      'Transactions': payment.transaction_count,
      'Percentage': payment.percentage + '%'
    }));

    const paymentsTotal = data.payments.reduce((sum, payment) => sum + payment.total_amount, 0);
    paymentsData.push({
      '#': '',
      'Payment Method': 'TOTAL',
      'Amount': paymentsTotal,
      'Transactions': data.payments.reduce((sum, payment) => sum + payment.transaction_count, 0),
      'Percentage': '100%'
    } as any);

    const paymentsWs = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, paymentsWs, 'Payments Report');
  }

  // P&L sheet
  if (data.profitLoss.length > 0) {
    const plData = data.profitLoss.map((item, index) => ({
      '#': index + 1,
      'Description': item.description,
      'Type': item.type.toUpperCase(),
      'Amount': item.amount
    }));

    const revenue = data.profitLoss.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.profitLoss.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const profit = revenue - expenses;

    plData.push(
      { '#': '', 'Description': 'TOTAL REVENUE', 'Type': 'REVENUE', 'Amount': revenue } as any,
      { '#': '', 'Description': 'TOTAL EXPENSES', 'Type': 'EXPENSE', 'Amount': expenses } as any,
      { '#': '', 'Description': 'NET PROFIT/LOSS', 'Type': profit >= 0 ? 'PROFIT' : 'LOSS', 'Amount': profit } as any
    );

    const plWs = XLSX.utils.json_to_sheet(plData);
    XLSX.utils.book_append_sheet(wb, plWs, 'Profit & Loss');
  }

  // Generate clean filename with current date
  const today = new Date().toISOString().split('T')[0];
  const cleanDateRange = data.dateRange.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filename = `reports-${cleanDateRange}-${today}.xlsx`;

  // Write file with explicit options for better browser compatibility
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
};

// Export all reports to PDF using HTML (supports Tamil and all Unicode)
export const exportAllReportsToPDF = (data: {
  bills: BillForExport[];
  items: ItemForExport[];
  payments: PaymentForExport[];
  profitLoss: ProfitLossForExport[];
  dateRange: string;
}) => {
  // Calculate totals
  const billsTotal = data.bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const itemsTotal = data.items.reduce((sum, item) => sum + item.total_revenue, 0);
  const itemsQtyTotal = data.items.reduce((sum, item) => sum + item.total_quantity, 0);
  const paymentsTotal = data.payments.reduce((sum, payment) => sum + payment.total_amount, 0);
  const revenue = data.profitLoss.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0);
  const expenses = data.profitLoss.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const profit = revenue - expenses;

  // Generate HTML with proper Unicode support
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reports - ${data.dateRange}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      font-size: 12px; 
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; color: #2980b9; margin-bottom: 10px; }
    h2 { font-size: 18px; color: #2980b9; margin: 20px 0 10px; border-bottom: 2px solid #2980b9; padding-bottom: 5px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #2980b9; color: white; padding: 8px; text-align: left; font-weight: bold; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .total-row { font-weight: bold; background: #e8f4fc !important; }
    .amount { text-align: right; }
    .center { text-align: center; }
    .profit { color: #27ae60; font-weight: bold; }
    .loss { color: #e74c3c; font-weight: bold; }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 10px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <h1>📊 Business Reports</h1>
  <div class="meta">
    <div><strong>Period:</strong> ${data.dateRange}</div>
    <div><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
  </div>

  ${data.bills.length > 0 ? `
  <h2>📋 Bills Report</h2>
  <div class="meta">Total: ${data.bills.length} bills | ₹${billsTotal.toFixed(2)}</div>
  <table>
    <tr><th>#</th><th>Bill No</th><th>Date</th><th>Time</th><th class="amount">Amount</th><th class="amount">Discount</th><th>Payment</th><th class="center">Items</th></tr>
    ${data.bills.map((bill, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${bill.bill_no}</td>
        <td>${bill.date}</td>
        <td>${bill.time}</td>
        <td class="amount">₹${bill.total_amount.toFixed(2)}</td>
        <td class="amount">₹${bill.discount.toFixed(2)}</td>
        <td>${bill.payment_mode}</td>
        <td class="center">${bill.items_count}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td></td><td>TOTAL</td><td></td><td></td>
      <td class="amount">₹${billsTotal.toFixed(2)}</td>
      <td class="amount">₹${data.bills.reduce((s, b) => s + b.discount, 0).toFixed(2)}</td>
      <td></td>
      <td class="center">${data.bills.reduce((s, b) => s + b.items_count, 0)}</td>
    </tr>
  </table>
  ` : ''}

  ${data.items.length > 0 ? `
  <div class="page-break"></div>
  <h2>🍽️ Items Sales Report</h2>
  <div class="meta">Total: ${data.items.length} items | Qty: ${itemsQtyTotal} | Revenue: ₹${itemsTotal.toFixed(2)}</div>
  <table>
    <tr><th>#</th><th>Item Name</th><th>Category</th><th class="center">Quantity</th><th class="amount">Revenue</th></tr>
    ${data.items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.item_name}</td>
        <td>${item.category}</td>
        <td class="center">${item.total_quantity}</td>
        <td class="amount">₹${item.total_revenue.toFixed(2)}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td></td><td>TOTAL</td><td></td>
      <td class="center">${itemsQtyTotal}</td>
      <td class="amount">₹${itemsTotal.toFixed(2)}</td>
    </tr>
  </table>
  ` : ''}

  ${data.payments.length > 0 ? `
  <h2>💳 Payment Methods</h2>
  <table>
    <tr><th>#</th><th>Payment Method</th><th class="amount">Amount</th><th class="center">Transactions</th><th class="center">%</th></tr>
    ${data.payments.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.payment_method}</td>
        <td class="amount">₹${p.total_amount.toFixed(2)}</td>
        <td class="center">${p.transaction_count}</td>
        <td class="center">${p.percentage.toFixed(1)}%</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td></td><td>TOTAL</td>
      <td class="amount">₹${paymentsTotal.toFixed(2)}</td>
      <td class="center">${data.payments.reduce((s, p) => s + p.transaction_count, 0)}</td>
      <td class="center">100%</td>
    </tr>
  </table>
  ` : ''}

  ${data.profitLoss.length > 0 ? `
  <h2>📈 Profit & Loss</h2>
  <table>
    <tr><th>#</th><th>Description</th><th>Type</th><th class="amount">Amount</th></tr>
    ${data.profitLoss.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td>${item.type.toUpperCase()}</td>
        <td class="amount">₹${item.amount.toFixed(2)}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td></td><td>TOTAL REVENUE</td><td>REVENUE</td>
      <td class="amount profit">₹${revenue.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td></td><td>TOTAL EXPENSES</td><td>EXPENSE</td>
      <td class="amount loss">₹${expenses.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td></td><td><strong>NET ${profit >= 0 ? 'PROFIT' : 'LOSS'}</strong></td>
      <td>${profit >= 0 ? 'PROFIT' : 'LOSS'}</td>
      <td class="amount ${profit >= 0 ? 'profit' : 'loss'}">₹${Math.abs(profit).toFixed(2)}</td>
    </tr>
  </table>
  ` : ''}

</body>
</html>`;

  // Open in new window and trigger print (allows Save as PDF)
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // Fallback
  setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 1000);
};

// Keep the old functions for backward compatibility
export const exportToPDF = (expenses: ExpenseForPDF[], title: string = 'Expenses Report') => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(title, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(`Total Expenses: ${total.toFixed(2)}`, 20, 40);

  const tableData = expenses.map((expense, index) => [
    (index + 1).toString(),
    expense.expense_name || 'Unnamed Expense',
    expense.category,
    expense.amount.toFixed(2),
    new Date(expense.date).toLocaleDateString(),
    expense.note || '-'
  ]);

  autoTable(doc, {
    head: [['#', 'Name', 'Category', 'Amount', 'Date', 'Note']],
    body: tableData,
    startY: 50,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { halign: 'right', cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 35 }
    },
    margin: { top: 50, left: 20, right: 20, bottom: 20 },
    theme: 'striped',
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};

export const exportToExcel = (expenses: ExpenseForPDF[], title: string = 'Expenses Report') => {
  const excelData = expenses.map((expense, index) => ({
    '#': index + 1,
    'Name': expense.expense_name || 'Unnamed Expense',
    'Category': expense.category,
    'Amount': expense.amount,
    'Date': new Date(expense.date).toLocaleDateString(),
    'Note': expense.note || '-'
  }));

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  excelData.push({
    '#': '',
    'Name': '',
    'Category': 'TOTAL',
    'Amount': total,
    'Date': '',
    'Note': ''
  } as any);

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
};

export const exportExpensesToPDF = exportToPDF;
export const exportExpensesToExcel = exportToExcel;
