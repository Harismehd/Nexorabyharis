import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export default function generateReceiptPDF(payment, gymProfile, member) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue primary
  doc.text(gymProfile.name || 'Gym Receipt', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  if (gymProfile.address) doc.text(gymProfile.address, 14, 30);
  if (gymProfile.contact) doc.text(`Contact: ${gymProfile.contact}`, 14, 35);
  if (gymProfile.email) doc.text(`Email: ${gymProfile.email}`, 14, 40);
  if (gymProfile.taxReg) doc.text(`Tax Reg No: ${gymProfile.taxReg}`, 14, 45);

  // Receipt Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('PAYMENT RECEIPT', 140, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Receipt No: ${payment.receiptNumber}`, 140, 30);
  doc.text(`Date: ${format(new Date(payment.paymentDate), 'dd MMM yyyy')}`, 140, 35);
  doc.text(`Status: Paid`, 140, 40);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 50, 196, 50);

  // Member Info
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Billed To:', 14, 60);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Name: ${member.name}`, 14, 66);
  doc.text(`Phone: ${member.phone}`, 14, 71);
  if (member.email) doc.text(`Email: ${member.email}`, 14, 76);

  // Payment Details Table
  doc.autoTable({
    startY: 85,
    headStyles: { fillColor: [37, 99, 235] },
    head: [['Description', 'Method', 'Period Covered', 'Amount']],
    body: [
      [
        `Gym Membership (${payment.monthsCovered} Month${payment.monthsCovered > 1 ? 's' : ''}) ${payment.isAdvance ? '[Advance]' : ''}`,
        payment.method,
        payment.periodCovered,
        `Rs. ${payment.amount}`
      ]
    ],
    foot: [['', '', 'Total Paid', `Rs. ${payment.amount}`]],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(gymProfile.footerMessage || 'Thank you for your payment!', 105, finalY, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('This is a computer-generated receipt.', 105, finalY + 6, { align: 'center' });

  // Save PDF
  doc.save(`${payment.receiptNumber}.pdf`);
}
