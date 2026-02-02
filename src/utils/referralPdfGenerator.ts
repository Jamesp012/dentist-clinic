import { jsPDF } from 'jspdf';
import { Referral, Patient } from '../App';
import { toast } from 'sonner';
import clinicMap from '../assets/clinic-map.jpg';

export const generateReferralPDF = (referral: Referral, patient?: Patient) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    const isXrayReferral = referral.specialty === 'X-Ray Imaging' || referral.referredTo === 'X-Ray Facility';

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const title = isXrayReferral ? 'X-Ray Referral Form' : 'Doctor Referral Form';
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    if (!isXrayReferral) {
      // Doctor Referral Format
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      // Patient's Name
      doc.text("Patient's Name:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.line(50, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.patientName, 52, yPosition);
      yPosition += 10;

      // Date, Contact No, Age (3 columns)
      doc.setFont('helvetica', 'bold');
      doc.text("Date:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(30, yPosition + 1, 65, yPosition + 1);
      doc.text(new Date(referral.date).toLocaleDateString('en-US'), 32, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text("Contact No.:", 70, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(95, yPosition + 1, 130, yPosition + 1);
      doc.text(patient?.phone || '', 97, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text("Age:", 135, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(148, yPosition + 1, pageWidth - 15, yPosition + 1);
      const age = patient ? String(new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) : '';
      doc.text(age, 150, yPosition);
      yPosition += 10;

      // Sex and Date of Birth
      doc.setFont('helvetica', 'bold');
      doc.text("Sex:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(28, yPosition + 1, 90, yPosition + 1);
      doc.text(patient?.sex || '', 30, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text("Date Of Birth:", 95, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(125, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(patient?.dateOfBirth || '', 127, yPosition);
      yPosition += 10;

      // Referred by
      doc.setFont('helvetica', 'bold');
      doc.text("Referred by:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(42, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.referringDentist, 44, yPosition);
      yPosition += 10;

      // Contact No and Clinic Email Address
      doc.setFont('helvetica', 'bold');
      doc.text("Contact No.:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(42, yPosition + 1, 100, yPosition + 1);
      doc.text(referral.referredByContact || '', 44, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text("Clinic Email Address:", 105, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(147, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.referredByEmail || '', 149, yPosition);
      yPosition += 15;

      // Yellow border section for services
      doc.setDrawColor(234, 179, 8); // Yellow
      doc.setLineWidth(2);
      const servicesBoxY = yPosition;
      doc.rect(15, servicesBoxY, pageWidth - 30, 80);

      yPosition += 8;

      // Two column services
      const leftCol = 20;
      const rightCol = pageWidth / 2 + 10;

      // Left column - Diagnostic Services
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DIAGNOSTIC SERVICES:', leftCol, yPosition);
      yPosition += 7;

      const diagnosticServices = [
        { label: 'STANDARD PANORAMIC', id: 'pano' },
        { label: 'TMJ (OPEN & CLOSE)', id: 'tmj' },
        { label: 'SINUS PA', id: 'sinus' },
        { label: 'BITEWING LEFT SIDE', id: 'bite-l' },
        { label: 'BITEWING RIGHT SIDE', id: 'bite-r' },
        { label: 'PERIAPICAL XRAY TOOTH#', id: 'peri' }
      ];

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      diagnosticServices.forEach((service) => {
        const serviceValue = referral.selectedServices?.[service.id];
        const isChecked = serviceValue === true || (typeof serviceValue === 'string' && serviceValue !== '');
        const textValue = typeof serviceValue === 'string' ? serviceValue : '';
        
        // Draw circle
        doc.setDrawColor(234, 179, 8);
        doc.setLineWidth(0.8);
        doc.circle(leftCol + 1.5, yPosition - 1.2, 1.5);
        
        if (isChecked) {
          doc.setFillColor(234, 179, 8);
          doc.circle(leftCol + 1.5, yPosition - 1.2, 1.5, 'F');
          
          // Draw checkmark
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.line(leftCol + 0.5, yPosition - 1.2, leftCol + 1.2, yPosition - 0.3);
          doc.line(leftCol + 1.2, yPosition - 0.3, leftCol + 2.5, yPosition - 2.2);
        }
        
        doc.setTextColor(0, 0, 0);
        let displayText = service.label;
        if (service.id === 'peri' && textValue) {
          displayText += ` ${textValue}`;
        }
        doc.text(displayText, leftCol + 5, yPosition);
        yPosition += 5;
      });

      // Right column - Other Services
      yPosition = servicesBoxY + 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OTHER SERVICES:', rightCol, yPosition);
      yPosition += 7;

      const otherServices = [
        { label: 'DIAGNOSTIC MODEL CAST', id: 'model' },
        { label: 'INTRAORAL PHOTOGRAPH', id: 'intra' },
        { label: 'EXTRAORAL PHOTOGRAPH', id: 'extra' }
      ];

      doc.setFontSize(8);
      otherServices.forEach((service) => {
        const serviceValue = referral.selectedServices?.[service.id];
        const isChecked = serviceValue === true || (typeof serviceValue === 'string' && serviceValue !== '');
        
        doc.setDrawColor(234, 179, 8);
        doc.setLineWidth(0.8);
        doc.circle(rightCol + 1.5, yPosition - 1.2, 1.5);
        
        if (isChecked) {
          doc.setFillColor(234, 179, 8);
          doc.circle(rightCol + 1.5, yPosition - 1.2, 1.5, 'F');
          
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.line(rightCol + 0.5, yPosition - 1.2, rightCol + 1.2, yPosition - 0.3);
          doc.line(rightCol + 1.2, yPosition - 0.3, rightCol + 2.5, yPosition - 2.2);
        }
        
        doc.setTextColor(0, 0, 0);
        doc.text(service.label, rightCol + 5, yPosition);
        yPosition += 5;
      });

      yPosition = servicesBoxY + 90;

      // Clinic information with map - Two column layout
      const clinicInfoStartY = yPosition;
      
      // Left column - Clinic information
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Address:', 15, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += 4;
      doc.text('#48 Luis Palad Street, Brgy. Angeles Zone 1, Tayabas City', 15, yPosition);
      yPosition += 4;
      doc.text('(infront of St. Jude Pharmacy, beside Motoposh Tayabas)', 15, yPosition);
      yPosition += 4;
      doc.text('Lucena-Tayabas Road, Luis Palad Street', 15, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Email:', 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text('j.aguilardentalclinic@gmail.com', 30, yPosition);
      yPosition += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('Facebook:', 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text('J. Aguilar Dental Clinic Tayabas Branch', 35, yPosition);
      yPosition += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('Contact No.:', 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text('0938-171-7695', 40, yPosition);

      // Right column - Map image
      try {
        const mapWidth = 65;
        const mapHeight = 40;
        const mapX = pageWidth / 2 + 5;
        const mapY = clinicInfoStartY;
        doc.addImage(clinicMap, 'JPEG', mapX, mapY, mapWidth, mapHeight);
      } catch (error) {
        console.error('Failed to add map image to PDF:', error);
      }

      // Yellow border line
      yPosition += 45;
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(2);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 8;

      // Thank you message
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('THANK YOU FOR YOUR REFERRAL!', 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const thankYouText = 'It is our policy to decline performing procedures that are not indicated in the referral form.';
      const thankYouText2 = 'This is based on our strict observance of the Dental Code of Ethics.';
      doc.text(thankYouText, 15, yPosition);
      yPosition += 5;
      doc.text(thankYouText2, 15, yPosition);

    } else {
      // X-Ray Referral Format
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      // Date
      doc.text("Date:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.line(30, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(new Date(referral.date).toLocaleDateString('en-US'), 32, yPosition);
      yPosition += 10;

      // Patient's Name
      doc.setFont('helvetica', 'bold');
      doc.text("Patient's Name:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(50, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.patientName, 52, yPosition);
      yPosition += 10;

      // Birthday and Sex
      doc.setFont('helvetica', 'bold');
      doc.text("Birthday:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(38, yPosition + 1, 100, yPosition + 1);
      doc.text(patient?.dateOfBirth || '', 40, yPosition);

      // Sex checkboxes
      doc.setFont('helvetica', 'bold');
      doc.text("Male", 110, yPosition);
      doc.rect(105, yPosition - 3, 3, 3);
      if (patient?.sex === 'Male') {
        doc.setFillColor(0, 0, 0);
        doc.rect(105.5, yPosition - 2.5, 2, 2, 'F');
      }
      
      doc.text("Female", 135, yPosition);
      doc.rect(130, yPosition - 3, 3, 3);
      if (patient?.sex === 'Female') {
        doc.setFillColor(0, 0, 0);
        doc.rect(130.5, yPosition - 2.5, 2, 2, 'F');
      }
      yPosition += 10;

      // Referred by Dr. and Contact
      doc.setFont('helvetica', 'bold');
      doc.text("Referred by Dr.:", 15, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(50, yPosition + 1, 100, yPosition + 1);
      doc.text(referral.referringDentist, 52, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text("Dentist's Contact #:", 105, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.line(145, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.referredByContact || '', 147, yPosition);
      yPosition += 15;

      // X-Ray Services
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('X-RAY IMAGING SERVICES', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      const xrayServices = [
        { label: 'Panoramic X-Ray', id: 'panoramic' },
        { label: 'Periapical X-Ray', id: 'periapical' },
        { label: 'Bitewing X-Ray', id: 'bitewing' },
        { label: 'Occlusal X-Ray', id: 'occlusal' },
        { label: 'TMJ X-Ray', id: 'tmj' },
        { label: 'CBCT (3D Imaging)', id: 'cbct' }
      ];

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let col = 0;
      xrayServices.forEach((service) => {
        const serviceValue = referral.selectedServices?.[service.id];
        const isChecked = serviceValue === true || (typeof serviceValue === 'string' && serviceValue !== '');
        const textValue = typeof serviceValue === 'string' ? serviceValue : '';
        const xPos = col === 0 ? 20 : pageWidth / 2 + 10;
        
        doc.rect(xPos, yPosition - 3, 3, 3);
        if (isChecked) {
          doc.setFillColor(0, 0, 0);
          doc.rect(xPos + 0.5, yPosition - 2.5, 2, 2, 'F');
        }
        
        doc.setTextColor(0, 0, 0);
        let displayText = service.label;
        if (textValue) {
          displayText += ` ${textValue}`;
        }
        doc.text(displayText, xPos + 5, yPosition);
        
        col++;
        if (col > 1) {
          col = 0;
          yPosition += 6;
        }
      });

      // Yellow border line
      yPosition += 8;
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(2);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 8;

      // Thank you message
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('THANK YOU FOR YOUR REFERRAL!', 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const thankYouText = 'It is our policy to decline performing procedures that are not indicated in the referral form.';
      const thankYouText2 = 'This is based on our strict observance of the Dental Code of Ethics.';
      doc.text(thankYouText, 15, yPosition);
      yPosition += 5;
      doc.text(thankYouText2, 15, yPosition);
    }

    // Save PDF
    const fileName = `Referral-${referral.patientName.replace(/[^\w-]/g, '-')}-${referral.id}.pdf`;
    doc.save(fileName);
    toast.success('Referral PDF downloaded successfully');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error('Failed to generate referral PDF');
  }
};
