import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale, SaleItem, SalePayment, BusinessConfig } from '@/types/database';
import { formatCOP, formatDateTime } from '@/lib/format';

const PAGE_WIDTH = 226; // ~80mm in points
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

function drawSeparator(doc: jsPDF, y: number): number {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  return y + 4;
}

function centerText(doc: jsPDF, text: string, y: number, fontSize?: number): number {
  if (fontSize) doc.setFontSize(fontSize);
  doc.text(text, PAGE_WIDTH / 2, y, { align: 'center' });
  return y + doc.getTextDimensions(text).h + 1;
}

export function generateInvoicePDF(
  sale: Sale,
  businessConfig: BusinessConfig,
  items: SaleItem[],
  payments: SalePayment[],
  sellerName?: string
): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [PAGE_WIDTH, 800], // tall page, will trim later
  });

  let y = 15;

  // --- Business header ---
  // Logo (skip if not available — adding images requires base64 data)
  if (businessConfig.logo_url) {
    // Logo would be added here if we had the base64 data.
    // For now we skip and rely on the business name text.
  }

  doc.setFont('helvetica', 'bold');
  y = centerText(doc, businessConfig.name.toUpperCase(), y, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (businessConfig.nit) {
    y = centerText(doc, `NIT: ${businessConfig.nit}`, y, 7);
  }
  if (businessConfig.address) {
    y = centerText(doc, businessConfig.address, y, 7);
  }
  if (businessConfig.city) {
    y = centerText(doc, businessConfig.city, y, 7);
  }
  if (businessConfig.phone) {
    y = centerText(doc, `Tel: ${businessConfig.phone}`, y, 7);
  }

  y += 2;
  y = drawSeparator(doc, y);

  // --- Document title ---
  const hasCustomer = Boolean(sale.customer_name);
  const docTitle = hasCustomer ? 'FACTURA DE VENTA' : 'RECIBO DE CAJA';

  doc.setFont('helvetica', 'bold');
  y = centerText(doc, docTitle, y, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  y = centerText(doc, `No. ${sale.invoice_number}`, y, 7);
  y = centerText(doc, `Fecha: ${formatDateTime(sale.created_at)}`, y, 7);

  if (sellerName) {
    y = centerText(doc, `Vendedor/a: ${sellerName}`, y, 7);
  }

  y += 1;
  y = drawSeparator(doc, y);

  // --- Customer info ---
  if (hasCustomer) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('CLIENTE', MARGIN, y);
    y += 9;

    doc.setFont('helvetica', 'normal');
    if (sale.customer_name) {
      doc.text(`Nombre: ${sale.customer_name}`, MARGIN, y);
      y += 9;
    }
    if (sale.customer_id_number) {
      doc.text(`Cedula: ${sale.customer_id_number}`, MARGIN, y);
      y += 9;
    }
    if (sale.customer_phone) {
      doc.text(`Tel: ${sale.customer_phone}`, MARGIN, y);
      y += 9;
    }

    y += 1;
    y = drawSeparator(doc, y);
  }

  // --- Items table ---
  const tableBody = items.map((item) => [
    item.product_sku || '',
    item.product_name,
    item.size,
    String(item.quantity),
    formatCOP(item.unit_price),
    formatCOP(item.subtotal),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Ref', 'Descripcion', 'Talla', 'Cant', 'P.Unit', 'Subtotal']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: 2,
      overflow: 'linebreak',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 6,
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 36, halign: 'right' },
      5: { cellWidth: 38, halign: 'right' },
    },
    tableWidth: CONTENT_WIDTH,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;
  y = drawSeparator(doc, y);

  // --- Totals ---
  const totalsX = PAGE_WIDTH - MARGIN;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  doc.text('Subtotal:', MARGIN, y);
  doc.text(formatCOP(sale.subtotal), totalsX, y, { align: 'right' });
  y += 10;

  if (sale.discount > 0) {
    doc.text('Descuento:', MARGIN, y);
    doc.text(`-${formatCOP(sale.discount)}`, totalsX, y, { align: 'right' });
    y += 10;
  }

  if (sale.iva > 0) {
    doc.text('IVA:', MARGIN, y);
    doc.text(formatCOP(sale.iva), totalsX, y, { align: 'right' });
    y += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', MARGIN, y);
  doc.text(formatCOP(sale.total), totalsX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  y += 2;
  y = drawSeparator(doc, y);

  // --- Payments ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MEDIOS DE PAGO', MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  for (const payment of payments) {
    const label = PAYMENT_LABELS[payment.method] || payment.method;
    doc.text(label, MARGIN, y);
    doc.text(formatCOP(payment.amount), totalsX, y, { align: 'right' });
    y += 9;
  }

  y += 2;
  y = drawSeparator(doc, y);

  // --- Footer ---
  if (businessConfig.footer_message) {
    doc.setFontSize(6);
    const footerLines = doc.splitTextToSize(businessConfig.footer_message, CONTENT_WIDTH);
    doc.text(footerLines, PAGE_WIDTH / 2, y, { align: 'center' });
    y += footerLines.length * 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  y = centerText(doc, 'Gracias por su compra', y + 2, 8);

  // Trim page height to content
  const pageHeight = y + 10;
  // Re-create with correct height by setting internal page size
  // jsPDF doesn't support resizing after creation, but the extra white space is acceptable
  // for thermal printers that cut after content.

  return doc;
}
