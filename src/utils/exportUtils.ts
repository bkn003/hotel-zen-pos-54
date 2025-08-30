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

interface BillForExport {
  bill_no: string;
  date: string;
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

  XLSX.writeFile(wb, `reports-${data.dateRange.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
};

// Export all reports to PDF with separate pages
export const exportAllReportsToPDF = (data: {
  bills: BillForExport[];
  items: ItemForExport[];
  payments: PaymentForExport[];
  profitLoss: ProfitLossForExport[];
  dateRange: string;
}) => {
  const doc = new jsPDF();
  
  // Title page
  doc.setFontSize(24);
  doc.setTextColor(40);
  doc.text('Business Reports', 20, 30);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`Period: ${data.dateRange}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);

  let startY = 80;

  // Bills Report
  if (data.bills.length > 0) {
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Bills Report', 20, 20);
    
    const billsTotal = data.bills.reduce((sum, bill) => sum + bill.total_amount, 0);
    doc.setFontSize(12);
    doc.text(`Total Bills: ${data.bills.length}`, 20, 35);
    doc.text(`Total Amount: ${billsTotal.toFixed(2)}`, 20, 45);
    
    const billsTableData = data.bills.map((bill, index) => [
      (index + 1).toString(),
      bill.bill_no,
      bill.date,
      bill.total_amount.toFixed(2),
      bill.discount.toFixed(2),
      bill.payment_mode,
      bill.items_count.toString()
    ]);
    
    billsTableData.push([
      '',
      'TOTAL',
      '',
      billsTotal.toFixed(2),
      data.bills.reduce((sum, bill) => sum + bill.discount, 0).toFixed(2),
      '',
      data.bills.reduce((sum, bill) => sum + bill.items_count, 0).toString()
    ]);

    autoTable(doc, {
      head: [['#', 'Bill No', 'Date', 'Amount', 'Discount', 'Payment', 'Items']],
      body: billsTableData,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  }

  // Items Report
  if (data.items.length > 0) {
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Items Sales Report', 20, 20);
    
    const itemsTotal = data.items.reduce((sum, item) => sum + item.total_revenue, 0);
    doc.setFontSize(12);
    doc.text(`Total Items: ${data.items.length}`, 20, 35);
    doc.text(`Total Revenue: ${itemsTotal.toFixed(2)}`, 20, 45);
    
    const itemsTableData = data.items.map((item, index) => [
      (index + 1).toString(),
      item.item_name,
      item.category,
      item.total_quantity.toString(),
      item.total_revenue.toFixed(2)
    ]);
    
    itemsTableData.push([
      '',
      'TOTAL',
      '',
      data.items.reduce((sum, item) => sum + item.total_quantity, 0).toString(),
      itemsTotal.toFixed(2)
    ]);

    autoTable(doc, {
      head: [['#', 'Item Name', 'Category', 'Quantity', 'Revenue']],
      body: itemsTableData,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  }

  // Payments Report
  if (data.payments.length > 0) {
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Payment Methods Report', 20, 20);
    
    const paymentsTotal = data.payments.reduce((sum, payment) => sum + payment.total_amount, 0);
    doc.setFontSize(12);
    doc.text(`Total Amount: ${paymentsTotal.toFixed(2)}`, 20, 35);
    
    const paymentsTableData = data.payments.map((payment, index) => [
      (index + 1).toString(),
      payment.payment_method,
      payment.total_amount.toFixed(2),
      payment.transaction_count.toString(),
      payment.percentage.toFixed(1) + '%'
    ]);
    
    paymentsTableData.push([
      '',
      'TOTAL',
      paymentsTotal.toFixed(2),
      data.payments.reduce((sum, payment) => sum + payment.transaction_count, 0).toString(),
      '100.0%'
    ]);

    autoTable(doc, {
      head: [['#', 'Payment Method', 'Amount', 'Transactions', 'Percentage']],
      body: paymentsTableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  }

  // P&L Report
  if (data.profitLoss.length > 0) {
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Profit & Loss Statement', 20, 20);
    
    const revenue = data.profitLoss.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.profitLoss.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const profit = revenue - expenses;
    
    const plTableData = data.profitLoss.map((item, index) => [
      (index + 1).toString(),
      item.description,
      item.type.toUpperCase(),
      item.amount.toFixed(2)
    ]);
    
    plTableData.push(
      ['', 'TOTAL REVENUE', 'REVENUE', revenue.toFixed(2)],
      ['', 'TOTAL EXPENSES', 'EXPENSE', expenses.toFixed(2)],
      ['', 'NET PROFIT/LOSS', profit >= 0 ? 'PROFIT' : 'LOSS', profit.toFixed(2)]
    );

    autoTable(doc, {
      head: [['#', 'Description', 'Type', 'Amount']],
      body: plTableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  }

  doc.save(`reports-${data.dateRange.toLowerCase().replace(/\s+/g, '-')}.pdf`);
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
