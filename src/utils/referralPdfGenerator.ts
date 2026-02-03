import { jsPDF } from 'jspdf';
import { Referral, Patient } from '../App';
import { toast } from 'sonner';
import { clinicMap, redorLogo, xrayClinic, clinicLogo } from '../assets';

export const generateReferralPDF = (referral: Referral, patient?: Patient) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    const isXrayReferral = referral.specialty === 'X-Ray Imaging' || referral.referredTo === 'X-Ray Facility';

    if (!isXrayReferral) {
      // Header for Doctor Referral
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Doctor Referral Form', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
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
      yPosition += 10;

      // Yellow line before services
      doc.setDrawColor(234, 179, 8); // Yellow
      doc.setLineWidth(2);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;

      // Two column services
      const leftCol = 15;
      const servicesStartY = yPosition;
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
      yPosition = servicesStartY;
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

      yPosition += 8;

      // Clinic information with map - Two column layout
      const clinicInfoStartY = yPosition;
      
      // Left column - Clinic Logo and information
      // Add clinic logo
      try {
        const logoWidth = 60;
        const logoHeight = 20;
        doc.addImage(clinicLogo, 'PNG', 15, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 4;
      } catch (error) {
        console.error('Failed to add clinic logo to PDF:', error);
      }

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

      yPosition += 50;

      // Yellow line before thank you message
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(2);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;

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
      // X-Ray Referral Format - REDOR Style
      // Reset yPosition for clinic header
      yPosition = 15;

      // Clinic Logo/Branding
      const headerTopY = 15;
      const logoWidth = 45;
      const logoHeight = 20;
      try {
        doc.addImage(redorLogo, 'PNG', 15, headerTopY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Failed to add REDOR logo to PDF:', error);
      }

      // Contact Information (right aligned) with vertical line
      const brandColor: [number, number, number] = [16, 83, 151];
      doc.setFontSize(8);
      doc.setTextColor(...brandColor);
      doc.setFont('helvetica', 'normal');
      const contactY = headerTopY + 2;
      const contactX = pageWidth - 15;
      doc.text('37 Quezon Ave., Lucena City', contactX, contactY, { align: 'right' });
      doc.text('Tel. (042) 710-6484', contactX, contactY + 4, { align: 'right' });
      doc.text('Mobile 09920-2179688', contactX, contactY + 8, { align: 'right' });
      doc.text('www.redordentalcenter.com', contactX, contactY + 12, { align: 'right' });

      // Vertical line before contact info
      const lineX = pageWidth - 80;
      doc.setDrawColor(...brandColor);
      doc.setLineWidth(0.5);
      doc.line(lineX, headerTopY, lineX, headerTopY + logoHeight);

      yPosition = headerTopY + logoHeight + 8;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text("Date:", 15, yPosition);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(30, yPosition + 1, 80, yPosition + 1);
      doc.text(new Date(referral.date).toLocaleDateString('en-US'), 32, yPosition);
      yPosition += 8;

      // Patient's Name with sex checkboxes
      doc.text("Patient's Name:", 15, yPosition);
      doc.line(45, yPosition + 1, 120, yPosition + 1);
      doc.text(referral.patientName, 47, yPosition);

      // Sex checkboxes
      const sexX = 125;
      doc.rect(sexX, yPosition - 3, 3, 3);
      if (patient?.sex === 'Male') {
        doc.setFillColor(0, 0, 0);
        doc.rect(sexX + 0.5, yPosition - 2.5, 2, 2, 'F');
      }
      doc.text("Male", sexX + 5, yPosition);

      doc.rect(sexX + 18, yPosition - 3, 3, 3);
      if (patient?.sex === 'Female') {
        doc.setFillColor(0, 0, 0);
        doc.rect(sexX + 18.5, yPosition - 2.5, 2, 2, 'F');
      }
      doc.text("Female", sexX + 23, yPosition);
      yPosition += 8;

      // Birthday
      doc.text("Birthday:", 15, yPosition);
      doc.line(35, yPosition + 1, 100, yPosition + 1);
      doc.text(patient?.dateOfBirth || '', 37, yPosition);
      yPosition += 8;

      // Referred by Dr.
      doc.text("Referred by Dr.:", 15, yPosition);
      doc.line(45, yPosition + 1, 120, yPosition + 1);
      doc.text(referral.referringDentist, 47, yPosition);

      // Dentist's Contact #
      doc.text("Dentist's Contact #:", pageWidth - 95, yPosition);
      doc.line(pageWidth - 60, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(referral.referredByContact || '', pageWidth - 58, yPosition);
      yPosition += 8;

      // Patient's Address
      doc.text("Patient's Address:", 15, yPosition);
      doc.line(45, yPosition + 1, 120, yPosition + 1);
      doc.text(patient?.address || '', 47, yPosition);

      // Patient's Contact #
      doc.text("Patient's Contact #:", pageWidth - 95, yPosition);
      doc.line(pageWidth - 60, yPosition + 1, pageWidth - 15, yPosition + 1);
      doc.text(patient?.phone || '', pageWidth - 58, yPosition);
      yPosition += 12;

      // Main instruction text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("Please perform the following radiological procedure/s:", 15, yPosition);
      yPosition += 8;

      // I X-RAY FILM FORMAT
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("I X-RAY FILM FORMAT", 15, yPosition);
      yPosition += 8;

      // Peri-apical with tooth diagram
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("_____ Peri-apical (please encircle no./nos.)", 20, yPosition);
      doc.text("_____ Occlusal", 115, yPosition);
      doc.text("_____ Upper", 155, yPosition);
      yPosition += 5;
      doc.text("_____ Lower", 155, yPosition);
      yPosition += 6;

      // Tooth diagram
      const diagramStartY = yPosition;
      const diagramCenterX = pageWidth / 2;
      
      // Upper teeth numbers and letters
      doc.setFontSize(7);
      const toothSpacing = 5;
      const leftTeeth = ['8', '7', '6', '5', '4', '3', '2', '1'];
      const rightTeeth = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const leftLetters = ['E', 'D', 'C', 'B', 'A'];
      const rightLetters = ['A', 'B', 'C', 'D', 'E'];
      
      // Upper left teeth (8-1)
      let startX = diagramCenterX - (leftTeeth.length * toothSpacing);
      leftTeeth.forEach((tooth, i) => {
        doc.text(tooth, startX + (i * toothSpacing), diagramStartY);
      });
      
      // Upper right teeth (1-8)
      startX = diagramCenterX + 2;
      rightTeeth.forEach((tooth, i) => {
        doc.text(tooth, startX + (i * toothSpacing), diagramStartY);
      });

      yPosition += 4;

      // Upper letters (left E-A, right A-E)
      startX = diagramCenterX - (leftLetters.length * toothSpacing);
      leftLetters.forEach((letter, i) => {
        doc.text(letter, startX + (i * toothSpacing), yPosition);
      });
      
      startX = diagramCenterX + 2;
      rightLetters.forEach((letter, i) => {
        doc.text(letter, startX + (i * toothSpacing), yPosition);
      });

      // R and L labels with lines
      doc.setFont('helvetica', 'bold');
      doc.text('R', 15, yPosition);
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, diagramCenterX - 48, yPosition);
      doc.line(diagramCenterX + 47, yPosition, pageWidth - 25, yPosition);
      doc.text('L', pageWidth - 20, yPosition);

      yPosition += 4;

      // Lower letters (left E-A, right A-E)
      doc.setFont('helvetica', 'normal');
      startX = diagramCenterX - (leftLetters.length * toothSpacing);
      leftLetters.forEach((letter, i) => {
        doc.text(letter, startX + (i * toothSpacing), yPosition);
      });
      
      startX = diagramCenterX + 2;
      rightLetters.forEach((letter, i) => {
        doc.text(letter, startX + (i * toothSpacing), yPosition);
      });

      yPosition += 4;

      // Lower teeth (left 8-1, right 1-8)
      startX = diagramCenterX - (leftTeeth.length * toothSpacing);
      leftTeeth.forEach((tooth, i) => {
        doc.text(tooth, startX + (i * toothSpacing), yPosition);
      });
      
      startX = diagramCenterX + 2;
      rightTeeth.forEach((tooth, i) => {
        doc.text(tooth, startX + (i * toothSpacing), yPosition);
      });

      yPosition += 10;

      // II DIGITAL FORMAT
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("II DIGITAL FORMAT", 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Left column
      const leftCol = 20;
      const rightCol = 115;
      
      const digitalLeft = [
        { label: 'Panoramic', id: 'panoramic' },
        { label: 'Cephalometric', id: 'cephalometric' },
        { label: 'TMJ/Transcranial', id: 'tmj' },
        { label: 'Sinus', id: 'sinus' }
      ];
      
      const digitalRight = [
        { label: 'Handwrist/Carpal', id: 'handwrist' },
        { label: 'Submentovertex (SMV)', id: 'smv' },
        { label: "Water's View", id: 'waters' }
      ];

      let leftY = yPosition;
      digitalLeft.forEach((service) => {
        const isChecked = referral.selectedServices?.[service.id];
        doc.text('_____', leftCol, leftY);
        doc.text(service.label, leftCol + 8, leftY);
        if (isChecked) {
          doc.text('X', leftCol + 1, leftY);
        }
        leftY += 5;
      });

      let rightY = yPosition;
      digitalRight.forEach((service) => {
        const isChecked = referral.selectedServices?.[service.id];
        doc.text('_____', rightCol, rightY);
        doc.text(service.label, rightCol + 8, rightY);
        if (isChecked) {
          doc.text('X', rightCol + 1, rightY);
        }
        rightY += 5;
      });

      yPosition = Math.max(leftY, rightY) + 8;

      // OTHER SERVICES
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("OTHER SERVICES:", 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const otherServices = [
        { label: 'Extra and Intra-oral Photographs', id: 'photographs' },
        { label: 'Diagnostic Study Model Cast with duplicate casts', id: 'model-cast' },
        { label: 'Complete Orthodontic Records (Pano, Ceph, Photos, Caph with free digital tracing)', id: 'ortho-records' },
        { label: 'Digitalized Ceph Tracing', id: 'ceph-tracing' }
      ];

      otherServices.forEach((service) => {
        const isChecked = referral.selectedServices?.[service.id];
        doc.text('_____', leftCol, yPosition);
        doc.text(service.label, leftCol + 8, yPosition);
        if (isChecked) {
          doc.text('X', leftCol + 1, yPosition);
        }
        yPosition += 5;
      });

      yPosition += 4;

      const xrayBlockStartY = yPosition;

      // Bleeding tray and related services
      const extraServices = [
        { label: 'Bleeding Tray', id: 'bleeding-tray' },
        { label: 'Post-Ortho Positioner', id: 'post-ortho' },
        { label: 'Bleaching Machine for Rent', id: 'bleaching' }
      ];

      extraServices.forEach((service) => {
        const isChecked = referral.selectedServices?.[service.id];
        doc.text('_____', leftCol, yPosition);
        doc.text(service.label, leftCol + 8, yPosition);
        if (isChecked) {
          doc.text('X', leftCol + 1, yPosition);
        }
        yPosition += 5;
      });

      yPosition += 4;

      // CASES TO BE
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("CASES TO BE:", 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const casesOptions = [
        { label: 'Taken Out by Patient', id: 'patient-takeout' },
        { label: 'Sent via JRS to Dentist', id: 'jrs' },
        { label: 'Pick up by dentist', id: 'pickup' },
        { label: 'Delivered to dentist (Lucena area only)', id: 'delivery' },
        { label: 'X-ray/s to be emailed', id: 'email' }
      ];

      casesOptions.forEach((option) => {
        const isChecked = referral.selectedServices?.[option.id];
        doc.text('_____', leftCol, yPosition);
        doc.text(option.label, leftCol + 8, yPosition);
        if (isChecked) {
          doc.text('X', leftCol + 1, yPosition);
        }
        yPosition += 5;
      });

      // X-ray clinic image on the right
      try {
        const imageWidth = 55;
        const imageHeight = 45;
        const imageX = pageWidth - imageWidth - 15;
        const imageY = xrayBlockStartY;
        doc.addImage(xrayClinic, 'JPEG', imageX, imageY, imageWidth, imageHeight);
      } catch (error) {
        console.error('Failed to add X-ray clinic image to PDF:', error);
      }
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
