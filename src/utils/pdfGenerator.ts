import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient, TreatmentRecord, Payment } from '../App';
import { toast } from 'sonner';

export const generateReceipt = (
  patient: Patient,
  record: TreatmentRecord,
  payments: Payment[]
) => {
  try {
    // Safety check for required data
    if (!patient || !record) {
      throw new Error('Patient or Record data is missing');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add Metadata
    doc.setProperties({
      title: `Receipt - ${patient.name || 'Patient'}`,
      subject: 'Dental Service Receipt',
      author: 'Dental Clinic Management System',
      creator: 'Dental Clinic'
    });

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 128, 128); // Teal color
    doc.text('DENTAL CLINIC RECEIPT', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('123 Dental St, Medical City, Philippines', pageWidth / 2, 28, { align: 'center' });
    doc.text('Contact: (555) 123-4567 | Email: hello@dentalclinic.com', pageWidth / 2, 33, { align: 'center' });

    // Divider
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);

    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', 15, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${patient.name || 'N/A'}`, 15, 58);
    doc.text(`Phone: ${patient.phone || 'N/A'}`, 15, 63);
    doc.text(`Email: ${patient.email || 'N/A'}`, 15, 68);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 58, { align: 'right' });
    doc.text(`Receipt #: REC-${record.id || '0'}-${Date.now().toString().slice(-4)}`, pageWidth - 15, 63, { align: 'right' });

    // Treatment Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', 15, 80);

    const tableData = [
      [
        record.date ? new Date(record.date).toLocaleDateString() : new Date().toLocaleDateString(),
        record.treatment || record.description || 'Dental Service',
        record.tooth || '-',
        record.dentist || '-',
        `PHP ${Number(record.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Service', 'Tooth', 'Dentist', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 128], textColor: 255 },
      margin: { left: 15, right: 15 }
    });

    // Payment Summary
    const lastTable = (doc as any).lastAutoTable;
    const finalY = lastTable ? lastTable.finalY + 10 : 100;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY', 15, finalY);

    const safePayments = Array.isArray(payments) ? payments : [];
    const paymentHistory = safePayments
      .filter(p => p && String(p.treatmentRecordId) === String(record.id))
      .map(p => [
        p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
        (p.paymentMethod || 'cash').toUpperCase(),
        `PHP ${Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

    if (paymentHistory.length > 0) {
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Method', 'Paid']],
        body: paymentHistory,
        theme: 'plain',
        headStyles: { textColor: 100, fontStyle: 'bold' },
        margin: { left: 15, right: 15 }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No payment records found for this service.', 15, finalY + 10);
    }

    // Final Totals
    const lastTable2 = (doc as any).lastAutoTable;
    const summaryY = paymentHistory.length > 0 ? (lastTable2 ? lastTable2.finalY + 10 : finalY + 20) : finalY + 20;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Cost:', pageWidth - 60, summaryY);
    doc.text(`PHP ${Number(record.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, summaryY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Total Paid:', pageWidth - 60, summaryY + 7);
    doc.text(`PHP ${Number(record.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, summaryY + 7, { align: 'right' });

    const balance = Number(record.remainingBalance || 0);
    doc.setTextColor(balance <= 0 ? [0, 128, 0] : [200, 0, 0]);
    doc.text('Remaining Balance:', pageWidth - 60, summaryY + 14);
    doc.text(`PHP ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, summaryY + 14, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing our Dental Clinic!', pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    doc.text('This is a computer-generated receipt.', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

    // Save the PDF
    const fileName = `Receipt-${(patient.name || 'Patient').replace(/[^\w-]/g, '-')}-${record.id || '0'}.pdf`;
    doc.save(fileName);
    toast.success('Receipt PDF generated successfully');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generatePatientHistoryPDF = (
  patient: Patient,
  records: TreatmentRecord[]
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 128, 128);
    doc.text('PATIENT SERVICE HISTORY', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Dental Clinic Management System', pageWidth / 2, 28, { align: 'center' });

    // Divider
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);

    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', 15, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${patient.name}`, 15, 52);
    doc.text(`Phone: ${patient.phone}`, 15, 57);
    doc.text(`Email: ${patient.email}`, 15, 62);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 52, { align: 'right' });

    // Services Table
    const tableData = records.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.treatment || record.description || '-',
      record.tooth || '-',
      record.dentist || '-',
      `PHP ${Number(record.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `PHP ${Number(record.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `PHP ${Number(record.remainingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Service', 'Tooth', 'Dentist', 'Total Cost', 'Paid', 'Balance']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 128], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    // Summary
    const lastTable = (doc as any).lastAutoTable;
    const finalY = lastTable ? lastTable.finalY + 15 : 100;

    const totalBilled = records.reduce((sum, r) => sum + Number(r.cost || 0), 0);
    const totalPaid = records.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
    const totalBalance = records.reduce((sum, r) => sum + Number(r.remainingBalance || 0), 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', 15, finalY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Services Billed:`, 15, finalY + 10);
    doc.text(`PHP ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, finalY + 10, { align: 'right' });

    doc.text(`Total Amount Paid:`, 15, finalY + 17);
    doc.text(`PHP ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, finalY + 17, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(totalBalance > 0 ? [200, 0, 0] : [0, 128, 0]);
    doc.text(`Overall Remaining Balance:`, 15, finalY + 24);
    doc.text(`PHP ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, finalY + 24, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('Confidential Dental Record', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

    doc.save(`History-${patient.name.replace(/\s+/g, '-')}.pdf`);
    toast.success('Patient history PDF generated');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error('Failed to generate patient history PDF');
  }
};

export const generateFinancialPDF = (
  summary: any,
  monthlyRevenue: number,
  totalOutstanding: number,
  breakdown: any
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 102, 204);
    doc.text('FINANCIAL SUMMARY REPORT', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    // Divider
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);

    // Key Metrics
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('KEY PERFORMANCE INDICATORS', 15, 45);

    const metricsData = [
      ['Total Revenue (Paid)', `PHP ${summary.totalRevenue.toLocaleString()}`],
      ['Total Billed Services', `PHP ${summary.totalBilled.toLocaleString()}`],
      ['Outstanding Balance', `PHP ${totalOutstanding.toLocaleString()}`],
      ['Current Monthly Revenue', `PHP ${monthlyRevenue.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 50,
      body: metricsData,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 80 } }
    });

    // Treatment Breakdown
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE BY TREATMENT TYPE', 15, finalY);

    const breakdownData = Object.entries(breakdown).map(([type, data]: [string, any]) => [
      type,
      data.count,
      `PHP ${data.revenue.toLocaleString()}`,
      `${((data.revenue / summary.totalBilled) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Treatment', 'Procedures', 'Revenue', 'Share']],
      body: breakdownData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] }
    });

    doc.save(`Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Financial PDF report generated');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error('Failed to generate financial PDF');
  }
};

export const generatePrescriptionPDF = (
  patient: Patient,
  prescription: {
    id: string;
    date: string;
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }[];
    dentist: string;
    notes: string;
  }
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(24);
    doc.setTextColor(0, 102, 204);
    doc.text('PRESCRIPTION / RESETA', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Dental Clinic Management System', pageWidth / 2, 28, { align: 'center' });
    doc.text(`Date: ${new Date(prescription.date).toLocaleDateString()}`, pageWidth - 15, 35, { align: 'right' });

    // Divider
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);

    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', 15, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${patient.name}`, 15, 58);
    doc.text(`Phone: ${patient.phone}`, 15, 63);
    doc.text(`Email: ${patient.email}`, 15, 68);
    doc.text(`Address: ${patient.address}`, 15, 73);

    // Medications
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICATIONS', 15, 85);

    const tableData = prescription.medications.map((med, i) => [
      i + 1,
      med.name,
      med.dosage,
      med.frequency,
      med.duration
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['#', 'Medication', 'Dosage', 'Frequency', 'Duration']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Instructions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUCTIONS / NOTES', 15, finalY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(prescription.notes || 'Follow dosage instructions as prescribed.', pageWidth - 30);
    doc.text(splitNotes, 15, finalY + 7);

    // Footer / Signature
    const footerY = doc.internal.pageSize.getHeight() - 40;
    doc.setDrawColor(150);
    doc.line(pageWidth - 80, footerY, pageWidth - 15, footerY);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dr. ${prescription.dentist}`, pageWidth - 47.5, footerY + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Licensed Dentist', pageWidth - 47.5, footerY + 12, { align: 'center' });

    doc.save(`Prescription-${patient.name.replace(/\s+/g, '-')}-${prescription.id}.pdf`);
    toast.success('Prescription PDF generated successfully');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error('Failed to generate prescription PDF');
  }
};

export const generateDetailedReceiptPDF = (
  patient: Patient,
  record: TreatmentRecord,
  payments: Payment[]
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add Logo or Clinic Name Header
    doc.setFontSize(24);
    doc.setTextColor(20, 184, 166); // Teal 600
    doc.setFont('helvetica', 'bold');
    doc.text('DENTAL CLINIC', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('123 Dental Street, Medical Plaza, City 12345', pageWidth / 2, 32, { align: 'center' });
    doc.text('Tel: (555) 000-1111 | Email: clinic@example.com', pageWidth / 2, 37, { align: 'center' });

    // Official Receipt Label
    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(0.8);
    doc.line(15, 45, pageWidth - 15, 45);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL RECEIPT', pageWidth / 2, 55, { align: 'center' });
    doc.text('RESIBO', pageWidth / 2, 62, { align: 'center' });

    // Receipt Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt No: ${record.id}`, 15, 75);
    doc.text(`Date: ${new Date(record.date).toLocaleDateString()}`, pageWidth - 15, 75, { align: 'right' });

    // Patient Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', 15, 90);
    doc.line(15, 92, 100, 92);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${patient.name}`, 15, 100);
    doc.text(`Phone: ${patient.phone}`, 15, 107);
    doc.text(`Address: ${patient.address}`, 15, 114);

    // Service Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', 15, 130);
    doc.line(15, 132, 100, 132);

    autoTable(doc, {
      startY: 138,
      head: [['Service Description', 'Tooth', 'Dentist', 'Amount']],
      body: [[
        record.treatment || record.description,
        record.tooth || 'N/A',
        `Dr. ${record.dentist}`,
        `PHP ${Number(record.cost).toLocaleString()}`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Payment Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY', 15, finalY);
    doc.line(15, finalY + 2, 100, finalY + 2);

    const summaryData = [
      ['Total Amount', `PHP ${Number(record.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Amount Paid', `PHP ${Number(record.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Remaining Balance', `PHP ${Number(record.remainingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
    ];

    autoTable(doc, {
      startY: finalY + 8,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 100 }, 1: { halign: 'right' } }
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing our clinic!', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Please keep this receipt for your records.', pageWidth / 2, footerY + 5, { align: 'center' });

    doc.save(`Receipt_${patient.name.replace(/\s+/g, '_')}_${record.id}.pdf`);
    toast.success('Receipt PDF generated successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Failed to generate PDF receipt');
  }
};


