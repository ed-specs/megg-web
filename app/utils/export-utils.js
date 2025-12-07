import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from 'docx'
import { saveAs } from 'file-saver'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { getCurrentUser, getUserAccountId } from './auth-utils'

// Utility function to load image with CORS handling
const loadImageWithFallback = async (imageUrl) => {
  try {
    // First try with our proxy API
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const blob = await response.blob()
    return { success: true, blob, type: blob.type }
  } catch (error) {
    console.warn('Proxy failed, trying direct fetch:', error)
    
    // Fallback: Try direct fetch
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'image/*',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      return { success: true, blob, type: blob.type }
    } catch (fetchError) {
      console.warn('Direct fetch failed, trying Image object:', fetchError)
      
      // Final fallback: Try using Image object with canvas
      try {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            
            canvas.toBlob((blob) => {
              resolve({ success: true, blob, type: blob.type })
            }, 'image/jpeg', 0.8)
          }
          
          img.onerror = () => {
            reject(new Error('Image loading failed'))
          }
          
          // Add timestamp to bypass cache
          img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        })
      } catch (fallbackError) {
        console.warn('All methods failed:', fallbackError)
        return { success: false, error: fallbackError }
      }
    }
  }
}

// Helper to fetch image and convert to base64
async function getImageBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to get current user's farm information from Firestore
async function getUserFarmInfo() {
  try {
    const user = getCurrentUser();
    const accountId = getUserAccountId();
    const docId = accountId || user?.uid;
    
    if (!docId) {
      return {
        farmName: null,
        farmAddress: null
      };
    }
    
    const userDocRef = doc(db, "users", docId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        farmName: userData.farmName || null,
        farmAddress: userData.farmAddress || null
      };
    }
    
    return {
      farmName: null,
      farmAddress: null
    };
  } catch (error) {
    console.error("Error fetching user farm info:", error);
    return {
      farmName: null,
      farmAddress: null
    };
  }
}

// Export to CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create header rows
  const headerRows = [
    ['REPUBLIC OF THE PHILIPPINES'],
    ['MINDORO STATE UNIVERSITY'],
    ["A'S DUCK FARM"],
    ['MANGANGAN I, BACO ORIENTAL MINDORO'],
    [''], // Empty row for spacing
    [''], // Empty row for spacing
    [`Generated on: ${new Date().toLocaleString()}`],
    [''] // Empty row for spacing
  ]

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content with header rows
  const csvContent = [
    ...headerRows.map(row => row.join(',')),
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === 0) return '0'
        // Handle values that need quotes (contain commas, quotes, or newlines)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export to Excel
export const exportToExcel = (data, filename, sheetName = 'Data') => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create header rows
  const headerRows = [
    ['Republic of the Philippines'],
    ['Mindoro State University'],
    ["A's Duck Farm"],
    ['Mangangan I, Baco Oriental Mindoro'],
    [''], // Empty row for spacing

    [''], // Empty row for spacing
    [`Generated on: ${new Date().toLocaleString()}`],
    [''] // Empty row for spacing
  ];

  // Get headers from first object
  const headers = Object.keys(data[0]);
  headerRows.push(headers); // Add column headers as a row

  // Convert data objects to arrays
  const dataRows = data.map(row => headers.map(h => row[h]));

  // Combine header rows and data rows
  const allRows = [...headerRows, ...dataRows];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

// Export to PDF
export const exportToPDF = async (data, filename, title, columns) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load logos as base64
  const [minsuLogo, ccsLogo, meggLogo] = await Promise.all([
    getImageBase64('/misulogo.png'),
    getImageBase64('/ccslogo.png'),
    getImageBase64('/logo.png'),
  ]);

  // --- COVER PAGE ---
  let y = 30;
  const logoSize = 36;
  const gap = 24;
  const totalWidth = logoSize * 3 + gap * 2;
  const startX = (pageWidth - totalWidth) / 2;
  doc.addImage(minsuLogo, 'PNG', startX, y, logoSize, logoSize);
  doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, y, logoSize, logoSize);
  doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, y, logoSize, logoSize);
  y += logoSize + 12;
  doc.setFontSize(20); doc.setFont(undefined, 'bold');
  doc.text('Defect Logs Report', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5);
  doc.line(30, y, pageWidth - 30, y); // thin line below title
  y += 8;
  doc.setFontSize(14); doc.setFont(undefined, 'normal');
  doc.text('Republic of the Philippines', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text('Mindoro State University', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text("A's Duck Farm", pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text('Mangangan I, Baco Oriental Mindoro', pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 16;
  // --- Summary Box ---
  const totalLogs = data.length;
  const timestamps = data.map(row => new Date(row.timestamp));
  const minDate = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const maxDate = timestamps.length ? new Date(Math.max(...timestamps)) : null;
  const defectCounts = {};
  data.forEach(row => {
    const type = row.defect_type || row.defectType || 'Unknown';
    defectCounts[type] = (defectCounts[type] || 0) + 1;
  });
  doc.setFillColor(230, 240, 255);
  doc.roundedRect(25, y, pageWidth - 50, 32 + Object.keys(defectCounts).length * 7, 4, 4, 'F');
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('Summary', pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.text(`Total Logs: ${totalLogs}`, 30, y + 18);
  if (minDate && maxDate) {
    doc.text(`Date Range: ${minDate.toLocaleString()} - ${maxDate.toLocaleString()}`, 30, y + 26);
  }
  doc.text('Defect Counts:', 30, y + 34);
  let defectY = y + 41;
  Object.entries(defectCounts).forEach(([type, count]) => {
    doc.text(`- ${type}: ${count}`, 36, defectY);
    defectY += 7;
  });
  // --- End of cover page ---
  addFooter(doc, pageWidth, pageHeight);
  doc.addPage();

  // --- HEADER FOR SUBSEQUENT PAGES ---
  function addHeader(doc, pageWidth) {
    const logoSize = 16;
    const gap = 10;
    const totalWidth = logoSize * 3 + gap * 2;
    const startX = (pageWidth - totalWidth) / 2;
    let y = 10;
    doc.addImage(minsuLogo, 'PNG', startX, y, logoSize, logoSize);
    doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, y, logoSize, logoSize);
    doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, y, logoSize, logoSize);
    y += logoSize + 2;
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.text('Defect Logs Report', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5);
    doc.line(30, y, pageWidth - 30, y);
    return y + 6;
  }

  // --- TABLE ---
  // Only show these columns:
  const displayColumns = [
    { key: 'timestamp', header: 'Timestamp', align: 'left', width: 54 },
    { key: 'batch_id', header: 'Batch ID', align: 'left', width: 44 },
    { key: 'confidence_score', header: 'Confidence', align: 'right', width: 28 },
    { key: 'defect_type', header: 'Defect Type', align: 'left', width: 28 },
    { key: 'machine_id', header: 'Machine ID', align: 'left', width: 44 },
  ];
  const tableMarginX = (pageWidth - displayColumns.reduce((a, b) => a + b.width, 0)) / 2;
  let yPosition = addHeader(doc, pageWidth) + 20; // extra whitespace above table
  const rowHeight = 14;
  const fontSize = 11;

  // Section title
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('Defect Log Details', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Table header
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize + 2);
  doc.setTextColor(255, 255, 255);
  doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
  let x = tableMarginX;
  displayColumns.forEach((col) => {
    doc.setFillColor(60, 120, 216);
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    doc.rect(x, yPosition, col.width, rowHeight);
    doc.text(col.header, x + col.width / 2, yPosition + rowHeight / 2 + 1, { align: 'center', baseline: 'middle' });
    x += col.width;
  });
  yPosition += rowHeight;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  // Table rows
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (yPosition > pageHeight - 80) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      yPosition = addHeader(doc, pageWidth) + 20;
      // Section title
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('Defect Log Details', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      // Redraw table header
      doc.setFont(undefined, 'bold');
      doc.setFontSize(fontSize + 2);
      doc.setTextColor(255, 255, 255);
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
      x = tableMarginX;
      displayColumns.forEach((col) => {
        doc.setFillColor(60, 120, 216);
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
        doc.rect(x, yPosition, col.width, rowHeight);
        doc.text(col.header, x + col.width / 2, yPosition + rowHeight / 2 + 1, { align: 'center', baseline: 'middle' });
        x += col.width;
      });
      yPosition += rowHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }
    // Alternating row color
    x = tableMarginX;
    displayColumns.forEach((col) => {
      if (rowIdx % 2 === 1) {
        doc.setFillColor(245, 248, 255);
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
      }
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
      doc.rect(x, yPosition, col.width, rowHeight);
      x += col.width;
    });
    // Cell content with wrapping
    x = tableMarginX;
    displayColumns.forEach((col) => {
      let value = row[col.key] === 0 ? '0' : (row[col.key] || '');
      // Format timestamp as local string, always single line
      if (col.key === 'timestamp') {
        let dateObj = null;
        if (row.timestamp && typeof row.timestamp.toDate === 'function') {
          // Firestore Timestamp object
          dateObj = row.timestamp.toDate();
        } else if (typeof row.timestamp === 'string') {
          dateObj = new Date(row.timestamp);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          value = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        } else {
          value = '';
        }
      }
      let text = String(value);
      // Text wrapping for all except timestamp (which should always be single line)
      const paddingX = 3;
      const maxWidth = col.width - 2 * paddingX;
      let lines = (col.key === 'timestamp') ? [text] : doc.splitTextToSize(text, maxWidth);
      // Vertically center
      let textY = yPosition + rowHeight / 2 + 1 - (lines.length - 1) * (fontSize / 2.5);
      lines.forEach((line, i) => {
        let textX = col.align === 'right' ? x + col.width - paddingX : x + paddingX;
        doc.text(line, textX, textY + i * (fontSize + 1) * 0.6, { align: col.align, baseline: 'middle' });
      });
      x += col.width;
    });
    yPosition += rowHeight;
    // --- IMAGE ---
    if (row.image_url && row.image_url !== 'N/A' && row.image_url.startsWith('http')) {
      if (yPosition > pageHeight - 80) {
        addFooter(doc, pageWidth, pageHeight);
        doc.addPage();
        yPosition = addHeader(doc, pageWidth) + 20;
      }
      yPosition += 12;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Captured Image:', pageWidth / 2, yPosition + 8, { align: 'center' });
      try {
        const imageResult = await loadImageWithFallback(row.image_url);
        if (imageResult.success) {
          const arrayBuffer = await imageResult.blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          const imageType = imageResult.type || 'image/jpeg';
          const format = imageType.includes('png') ? 'PNG' : 'JPEG';
          const imgWidth = 80;
          const imgHeight = 48;
          const imgX = (pageWidth - imgWidth) / 2;
          doc.setDrawColor(120, 120, 120);
          doc.rect(imgX - 2, yPosition + 12 - 2, imgWidth + 4, imgHeight + 4);
          doc.addImage(
            `data:${imageType};base64,${base64}`,
            format,
            imgX,
            yPosition + 12,
            imgWidth,
            imgHeight
          );
          // Show image URL in small gray text
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          let urlText = row.image_url;
          if (urlText.length > 60) urlText = urlText.slice(0, 57) + '...';
          doc.text(urlText, pageWidth / 2, yPosition + 12 + imgHeight + 7, { align: 'center' });
        } else {
          throw new Error('Image loading failed');
        }
        yPosition += 70;
      } catch (error) {
        doc.setFontSize(8);
        doc.setTextColor(200, 0, 0);
        doc.text('Image: [Failed to load]', pageWidth / 2, yPosition + 18, { align: 'center' });
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text(`URL: ${row.image_url}`, pageWidth / 2, yPosition + 25, { align: 'center' });
        yPosition += 30;
      }
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }
    yPosition += 8;
  }

  // --- SUMMARY ROW ---
  x = tableMarginX;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize);
  doc.setFillColor(230, 240, 255);
  displayColumns.forEach((col, colIndex) => {
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
    doc.rect(x, yPosition, col.width, rowHeight);
    if (colIndex === 0) {
      doc.text('Total Logs:', x + 4, yPosition + rowHeight / 2 + 1, { align: 'left', baseline: 'middle' });
    }
    if (colIndex === 1) {
      doc.text(String(data.length), x + 4, yPosition + rowHeight / 2 + 1, { align: 'left', baseline: 'middle' });
    }
    x += col.width;
  });
  yPosition += rowHeight;

  // --- FOOTER (last page) ---
  addFooter(doc, pageWidth, pageHeight);
  doc.save(`${filename}.pdf`);
}

// Export to DOCX
export const exportToDOCX = async (data, filename, title, columns) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  try {
    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: title || 'Report', heading: 'Heading1' }),
            new Paragraph({ text: `Generated on: ${new Date().toLocaleString()}` }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: (columns || Object.keys(data[0]).map((key) => ({ key, header: key }))).map((col) =>
                    new TableCell({
                      children: [new Paragraph({ text: col.header ?? String(col), alignment: AlignmentType.CENTER })],
                    })
                  ),
                }),
                ...data.map((row) =>
                  new TableRow({
                    children: (columns || Object.keys(row).map((key) => ({ key, header: key }))).map((col) =>
                      new TableCell({
                        children: [new Paragraph(String(row[col.key] ?? ''))],
                      })
                    ),
                  })
                ),
              ],
            }),
          ],
        },
      ],
    })

    const blob = await Packer.toBlob(docxDoc)
    saveAs(blob, `${filename}.docx`)
  } catch (error) {
    console.error('Error exporting to DOCX:', error)
  }
}

// Helper to add page number and footer
function addFooter(doc, pageWidth, pageHeight) {
  const pageCount = doc.internal.getNumberOfPages();
  const page = doc.internal.getCurrentPageInfo().pageNumber;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Page ${page} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
  doc.text('Generated by MEGG System', 20, pageHeight - 10);
  doc.setTextColor(0, 0, 0);
}

// Export to Image (PNG)
export const exportToImage = async (elementRef, filename) => {
  if (!elementRef || !elementRef.current) {
    console.warn('No element reference provided')
    return
  }

  try {
    // Create a temporary container with header
    const tempContainer = document.createElement('div')
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      background: white;
      padding: 20px;
      font-family: Arial, sans-serif;
    `
    
    // Add institutional header
    const header = document.createElement('div')
    header.style.cssText = `
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    `
    
    header.innerHTML = `
      <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0; color: #1f2937;">REPUBLIC OF THE PHILIPPINES</h1>
      <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 5px 0; color: #374151;">MINDORO STATE UNIVERSITY</h2>
      <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 5px 0; color: #4b5563;">A'S DUCK FARM</h3>
      <p style="font-size: 12px; margin: 0; color: #6b7280;">MANGANGAN I, BACO ORIENTAL MINDORO</p>
    `
    
    tempContainer.appendChild(header)
    
    // Clone the original element
    const clonedElement = elementRef.current.cloneNode(true)
    tempContainer.appendChild(clonedElement)
    
    // Add to DOM temporarily
    document.body.appendChild(tempContainer)
    
    // Capture the entire container
    const canvas = await html2canvas(tempContainer, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    // Remove temporary container
    document.body.removeChild(tempContainer)
    
    canvas.toBlob((blob) => {
      saveAs(blob, `${filename}.png`)
    }, 'image/png')
  } catch (error) {
    console.error('Error exporting to image:', error)
  }
}

// Specific export functions for each component

// Daily Summary Export
export const exportDailySummary = (data, format) => {
  const { periodTotal, dailyAverage, peakTime, percentageChange, hourlyDistribution, defectCounts, lastUpdated } = data
  
  const exportData = [
    {
      metric: 'Period Total',
      value: periodTotal,
      description: 'Total defects in the period'
    },
    {
      metric: 'Daily Average',
      value: dailyAverage.toFixed(1),
      description: 'Average defects per day'
    },
    {
      metric: 'Peak Time',
      value: peakTime,
      description: 'Time with highest activity'
    },
    {
      metric: 'Percentage Change',
      value: `${percentageChange}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: lastUpdated ? lastUpdated.toLocaleString() : 'N/A',
      description: 'Last data update time'
    }
  ]

  const defectData = Object.entries(defectCounts).map(([type, count]) => ({
    defectType: type.charAt(0).toUpperCase() + type.slice(1),
    count: count,
    percentage: ((count / periodTotal) * 100).toFixed(1) + '%'
  }))

  const hourlyData = hourlyDistribution.map(hour => ({
    hour: hour.hour,
    total: hour.total,
    dirty: hour.dirty,
    cracked: hour.cracked,
    good: hour.good
  }))

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ]

  const filename = `daily-summary-${new Date().toISOString().split('T')[0]}`
  const title = 'Daily Summary Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Daily Summary')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Statistics Export
export const exportStatistics = (data, format) => {
  const { totalInspections, defectCounts, defectPercentages, mostCommonDefect, inspectionRate, inspectionTrend, lastUpdated } = data

  const exportData = [
    {
      metric: 'Total Inspections',
      value: totalInspections,
      description: 'Total items inspected'
    },
    {
      metric: 'Most Common Defect',
      value: mostCommonDefect ? mostCommonDefect.type : 'N/A',
      description: 'Highest occurring defect type'
    },
    {
      metric: 'Inspection Rate',
      value: `${inspectionRate}/hr`,
      description: 'Average items per hour'
    },
    {
      metric: 'Inspection Trend',
      value: `${inspectionTrend}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: lastUpdated,
      description: 'Last data update time'
    }
  ]

  const defectData = Object.entries(defectCounts).map(([type, count]) => ({
    defectType: type.charAt(0).toUpperCase() + type.slice(1),
    count: count,
    percentage: defectPercentages[type] ? `${defectPercentages[type]}%` : '0%'
  }))

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ]

  const filename = `statistics-${new Date().toISOString().split('T')[0]}`
  const title = 'Statistics Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Statistics')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Defect Log Export
export const exportDefectLogs = async (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No defect logs to export')
    return
  }

  const exportData = data.map(log => ({
    timestamp: log.timestamp
      ? (typeof log.timestamp === 'string'
          ? new Date(log.timestamp).toLocaleString()
          : log.timestamp.seconds
            ? new Date(log.timestamp.seconds * 1000).toLocaleString()
            : 'N/A')
      : 'N/A',
    batch_id: log.batch_id || log.batchNumber || 'Unknown',
    confidence_score: typeof log.confidence_score === 'number'
      ? log.confidence_score
      : (typeof log.confidence === 'number' ? log.confidence : 'N/A'),
    defect_type: log.defect_type || log.defectType || 'Unknown',
    image_id: log.image_id || log.imageId || 'N/A',
    image_url: log.imageUrl || 'N/A',
    machine_id: log.machine_id || log.machineId || 'N/A'
  }));

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'batch_id', header: 'Batch ID' },
    { key: 'confidence_score', header: 'Confidence Score' },
    { key: 'defect_type', header: 'Defect Type' },
    { key: 'image_id', header: 'Image ID' },
    { key: 'image_url', header: 'Image URL' },
    { key: 'machine_id', header: 'Machine ID' }
  ];

  const filename = `defect-logs-${new Date().toISOString().split('T')[0]}`;
  const title = 'Defect Logs Report';

  console.log("Export Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Defect Logs');
      break;
    case 'pdf':
      await exportDefectLogsPDF(data, filename);
      break;
    case 'print':
      // For print, return PDF blob instead of saving
      return await exportDefectLogsPDF(data, null);
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, exportData);
  }
}

// Batch Review Export
export const exportBatchReview = (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No batch data to export')
    return
  }

  const exportData = data.map(batch => ({
    batchNumber: batch.batchNumber || batch.batch_number || 'Unknown',
    totalDefects: typeof (batch.totalDefects ?? batch.total_count) === 'number'
      ? (batch.totalDefects ?? batch.total_count)
      : 0,
    uniqueDefectTypes: (() => {
      if (typeof batch.uniqueDefectTypes === 'number') return batch.uniqueDefectTypes;
      if (batch.defectCounts)
        return Object.keys(batch.defectCounts).filter(key => key !== "good" && batch.defectCounts[key] > 0).length;
      if (batch.defect_counts)
        return Object.keys(batch.defect_counts).filter(key => key !== "good" && batch.defect_counts[key] > 0).length;
      return 0;
    })(),
    processedCount: typeof (batch.total_count ?? batch.processed_count) === 'number'
      ? (batch.total_count ?? batch.processed_count)
      : 0,
    lastUpdated: batch.updated_at
      ? (batch.updated_at.toDate ? batch.updated_at.toDate().toLocaleString() : new Date(batch.updated_at).toLocaleString())
      : (batch.lastUpdated || batch.timestamp || 'N/A')
  }))

  const columns = [
    { key: 'batchNumber', header: 'Batch Number' },
    { key: 'totalDefects', header: 'Total Defects' },
    { key: 'uniqueDefectTypes', header: 'Unique Defect Types' },
    { key: 'processedCount', header: 'Processed Count' },
    { key: 'lastUpdated', header: 'Last Updated' }
  ]

  const filename = `batch-review-${new Date().toISOString().split('T')[0]}`
  const title = 'Batch Review Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Batch Review')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Sort Log Export
export const exportSortLogs = async (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No sort logs to export')
    return
  }

  const exportData = data.map(log => ({
    timestamp: log.timestamp
      ? (typeof log.timestamp === 'string'
          ? new Date(log.timestamp).toLocaleString()
          : log.timestamp instanceof Date
            ? log.timestamp.toLocaleString()
            : log.timestamp.seconds
              ? new Date(log.timestamp.seconds * 1000).toLocaleString()
              : 'N/A')
      : 'N/A',
    egg_id: log.eggId || log.id || 'Unknown',
    batch_number: log.batchNumber || log.batch_id || 'Unknown',
    batch_id: log.batchId || log.batch_id || 'Unknown',
    weight: typeof log.weight === 'number' ? log.weight.toFixed(2) : 'N/A',
    size: log.eggSize || log.size || 'Unknown',
    quality: log.quality ? (log.quality.charAt(0).toUpperCase() + log.quality.slice(1)) : 'Good'
  }));

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'egg_id', header: 'Egg ID' },
    { key: 'batch_number', header: 'Batch Number' },
    { key: 'batch_id', header: 'Batch ID' },
    { key: 'weight', header: 'Weight (g)' },
    { key: 'size', header: 'Size' },
    { key: 'quality', header: 'Quality' }
  ];

  const filename = `sort-logs-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Logs Report';

  console.log("Export Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Logs');
      break;
    case 'pdf':
      await exportSortLogsPDF(data, filename);
      break;
    case 'print':
      // For print, return PDF blob instead of saving
      return await exportSortLogsPDF(data, null);
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, exportData);
  }
}

// Sort Logs PDF Export (Custom layout matching inventory style)
const exportSortLogsPDF = async (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('No sort logs to export')
    return
  }

  const doc = new jsPDF('landscape'); // Use landscape for better table layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Get user farm info and load MEGG logo
  const [farmInfo, meggLogo] = await Promise.all([
    getUserFarmInfo(),
    getImageBase64('/logo.png'),
  ]);

  // Calculate summary statistics
  const totalLogs = data.length;
  const totalWeight = data.reduce((sum, log) => sum + (log.weight || 0), 0);
  const avgWeight = totalLogs > 0 ? (totalWeight / totalLogs).toFixed(2) : '0.00';
  
  // Size distribution
  const sizeDistribution = {};
  data.forEach(log => {
    const size = log.eggSize || log.size || 'Unknown';
    sizeDistribution[size] = (sizeDistribution[size] || 0) + 1;
  });

  // Date range
  const timestamps = data
    .map(log => {
      if (!log.timestamp) return null;
      if (typeof log.timestamp === 'string') return new Date(log.timestamp);
      if (log.timestamp instanceof Date) return log.timestamp;
      if (log.timestamp.seconds) return new Date(log.timestamp.seconds * 1000);
      return null;
    })
    .filter(date => date !== null);
  
  const minDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const maxDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  // --- HEADER (Content-Centric) ---
  let y = 15;
  const logoSize = 20; // Small logo
  const marginLeft = 15;
  
  // Logo at top left
  doc.addImage(meggLogo, 'PNG', marginLeft, y, logoSize, logoSize);
  
  // Title next to logo
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136); // MEGG Blue
  doc.text('Sort Logs Report', marginLeft + logoSize + 8, y + 7);
  
  // Farm info on the right side
  if (farmInfo.farmName || farmInfo.farmAddress) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    let rightY = y + 4;
    if (farmInfo.farmName) {
      doc.text(farmInfo.farmName, pageWidth - marginLeft, rightY, { align: 'right' });
      rightY += 5;
    }
    if (farmInfo.farmAddress) {
      doc.text(farmInfo.farmAddress, pageWidth - marginLeft, rightY, { align: 'right' });
    }
  }
  
  y += logoSize + 8;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
  y += 10;
  
  // Generation date - small and on the right
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, pageWidth - marginLeft, y, { align: 'right' });
  y += 12;

  // --- SUMMARY SECTION ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Summary', marginLeft, y);
  y += 8;
  
  // Clean layout - 3 columns for better use of landscape space
  const col1 = marginLeft + 5;
  const col2 = pageWidth / 3 + 10;
  const col3 = (pageWidth / 3) * 2 + 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Column 1
  doc.text('Total Logs:', col1, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(totalLogs.toLocaleString(), col1 + 45, y);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Average Weight:', col1, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${avgWeight}g`, col1 + 45, y + 7);
  
  // Column 2
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Total Weight:', col2, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${totalWeight.toFixed(2)}g`, col2 + 40, y);
  
  if (minDate && maxDate) {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Date Range:', col2, y + 7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const dateRange = `${minDate.toLocaleDateString('en-US')} - ${maxDate.toLocaleDateString('en-US')}`;
    doc.setFontSize(9);
    doc.text(dateRange, col2 + 40, y + 7);
    doc.setFontSize(10);
  }
  
  // Column 3 - Size Distribution
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Size Distribution:', col3, y);
  let sizeY = y + 7;
  Object.entries(sizeDistribution).slice(0, 3).forEach(([size, count]) => {
    const percentage = ((count / totalLogs) * 100).toFixed(1);
    doc.setFontSize(9);
    doc.text(`${size}: ${count} (${percentage}%)`, col3, sizeY);
    sizeY += 5;
  });
  
  addFooter(doc, pageWidth, pageHeight);
  doc.addPage();

  // --- TABLE PAGE ---
  function addTableHeader(doc, pageWidth) {
    const headerMargin = 10;
    const smallLogoSize = 15;
    let y = 8;
    
    // Small logo at top left
    doc.addImage(meggLogo, 'PNG', headerMargin, y, smallLogoSize, smallLogoSize);
    
    // Title next to logo
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 85, 136);
    doc.text('Sort Logs Report', headerMargin + smallLogoSize + 5, y + 6);
    
    y += smallLogoSize + 3;
    
    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(headerMargin, y, pageWidth - headerMargin, y);
    return y + 5;
  }

  // Table columns - Optimized widths to fit landscape page
  const columns = [
    { key: 'timestamp', header: 'Timestamp', width: 50, align: 'left' },
    { key: 'egg_id', header: 'Egg ID', width: 50, align: 'left' },
    { key: 'size', header: 'Size', width: 25, align: 'center' },
    { key: 'weight', header: 'Weight (g)', width: 28, align: 'right' },
    { key: 'batch_number', header: 'Batch Number', width: 40, align: 'left' },
  ];

  const tableStartX = 12;
  const headerHeight = 10;
  const rowHeight = 8;
  const fontSize = 7.5;
  const headerFontSize = 8;
  let yPosition = addTableHeader(doc, pageWidth) + 5;

  // Section title
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Sort Log Details', 15, yPosition);
  yPosition += 10;

  // Table header row
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(16, 85, 136); // MEGG Blue
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  let x = tableStartX;
  
  // Draw all header backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(16, 85, 136);
    doc.rect(x, yPosition, col.width, headerHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  
  columns.forEach((col) => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, yPosition, col.width, headerHeight);
    
    const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
    doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
      align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
      baseline: 'middle',
      maxWidth: col.width - 6
    });
    x += col.width;
  });
  yPosition += headerHeight;

  // Table data rows
  doc.setFont(undefined, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  
  data.forEach((log, rowIdx) => {
    if (yPosition > pageHeight - 25) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      yPosition = addTableHeader(doc, pageWidth) + 5;
      
      // Redraw header on new page
      x = tableStartX;
      
      // Draw all header backgrounds first
      columns.forEach((col) => {
        doc.setFillColor(16, 85, 136);
        doc.rect(x, yPosition, col.width, headerHeight, 'F');
        x += col.width;
      });
      
      // Draw borders and text
      x = tableStartX;
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(headerFontSize);
      
      columns.forEach((col) => {
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, yPosition, col.width, headerHeight);
        
        const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
        doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
          align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
          baseline: 'middle',
          maxWidth: col.width - 6
        });
        x += col.width;
      });
      yPosition += headerHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }

    // Alternating row background
    if (rowIdx % 2 === 1) {
      x = tableStartX;
      doc.setFillColor(245, 250, 255);
      columns.forEach((col) => {
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
        x += col.width;
      });
    }

    // Cell content
    x = tableStartX;
    columns.forEach((col) => {
      let value = '';
      if (col.key === 'timestamp') {
        if (log.timestamp) {
          if (typeof log.timestamp === 'string') {
            value = new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else if (log.timestamp instanceof Date) {
            value = log.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else if (log.timestamp.seconds) {
            value = new Date(log.timestamp.seconds * 1000).toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else {
            value = 'N/A';
          }
        } else {
          value = 'N/A';
        }
      } else if (col.key === 'egg_id') {
        value = log.eggId || log.id || 'Unknown';
      } else if (col.key === 'size') {
        value = log.eggSize || log.size || 'Unknown';
      } else if (col.key === 'weight') {
        value = log.weight ? log.weight.toFixed(2) : 'N/A';
      } else if (col.key === 'batch_number') {
        value = log.batchNumber || 'N/A';
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(x, yPosition, col.width, rowHeight);
      
      // Truncate text if too long
      const maxWidth = col.width - 6;
      let displayValue = value;
      
      if (col.key === 'egg_id' && value.length > 25) {
        displayValue = value.substring(0, 23) + '..';
      }
      if (col.key === 'batch_number' && value.length > 12) {
        displayValue = value.substring(0, 10) + '..';
      }
      
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(displayValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: maxWidth
      });
      x += col.width;
    });
    yPosition += rowHeight;
  });

  // Summary row (TOTALS)
  yPosition += 2;
  x = tableStartX;
  
  // Draw all backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(230, 240, 255); // Light blue background
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  columns.forEach((col, colIdx) => {
    doc.rect(x, yPosition, col.width, rowHeight);
    
    let summaryValue = '';
    if (colIdx === 0) summaryValue = 'TOTALS';
    else if (col.key === 'weight') summaryValue = `${totalWeight.toFixed(2)}g`;
    else if (col.key === 'size') summaryValue = `${Object.keys(sizeDistribution).length} sizes`;
    
    if (summaryValue) {
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(summaryValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: col.width - 6
      });
    }
    x += col.width;
  });

  addFooter(doc, pageWidth, pageHeight);
  
  // Return PDF blob if requested (for printing), otherwise save
  if (filename === null) {
    // Enable auto-print for printing
    doc.autoPrint({ variant: 'non-conform' });
    // Return as blob for printing
    return doc.output('blob');
  } else {
    doc.save(`${filename}.pdf`);
  }
}

// Defect Logs PDF Export (Custom layout matching inventory style)
const exportDefectLogsPDF = async (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('No defect logs to export')
    return
  }

  const doc = new jsPDF('landscape'); // Use landscape for better table layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Get user farm info and load MEGG logo
  const [farmInfo, meggLogo] = await Promise.all([
    getUserFarmInfo(),
    getImageBase64('/logo.png'),
  ]);

  // Calculate summary statistics
  const totalLogs = data.length;
  
  // Defect type distribution
  const defectDistribution = {};
  data.forEach(log => {
    const defectType = log.defectType || log.defect_type || 'Unknown';
    defectDistribution[defectType] = (defectDistribution[defectType] || 0) + 1;
  });

  // Date range
  const timestamps = data
    .map(log => {
      if (!log.timestamp) return null;
      if (typeof log.timestamp === 'string') return new Date(log.timestamp);
      if (log.timestamp instanceof Date) return log.timestamp;
      if (log.timestamp.seconds) return new Date(log.timestamp.seconds * 1000);
      return null;
    })
    .filter(date => date !== null);
  
  const minDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const maxDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  // --- HEADER (Content-Centric) ---
  let y = 15;
  const logoSize = 20; // Small logo
  const marginLeft = 15;
  
  // Logo at top left
  doc.addImage(meggLogo, 'PNG', marginLeft, y, logoSize, logoSize);
  
  // Title next to logo
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136); // MEGG Blue
  doc.text('Defect Logs Report', marginLeft + logoSize + 8, y + 7);
  
  // Farm info on the right side
  if (farmInfo.farmName || farmInfo.farmAddress) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    let rightY = y + 4;
    if (farmInfo.farmName) {
      doc.text(farmInfo.farmName, pageWidth - marginLeft, rightY, { align: 'right' });
      rightY += 5;
    }
    if (farmInfo.farmAddress) {
      doc.text(farmInfo.farmAddress, pageWidth - marginLeft, rightY, { align: 'right' });
    }
  }
  
  y += logoSize + 8;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
  y += 10;
  
  // Generation date - small and on the right
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, pageWidth - marginLeft, y, { align: 'right' });
  y += 12;

  // --- SUMMARY SECTION ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Summary', marginLeft, y);
  y += 8;
  
  // Clean layout - 3 columns for better use of landscape space
  const col1 = marginLeft + 5;
  const col2 = pageWidth / 3 + 10;
  const col3 = (pageWidth / 3) * 2 + 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Column 1
  doc.text('Total Defects:', col1, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(totalLogs.toLocaleString(), col1 + 45, y);
  
  if (minDate && maxDate) {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Date Range:', col1, y + 7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const dateRange = `${minDate.toLocaleDateString('en-US')} - ${maxDate.toLocaleDateString('en-US')}`;
    doc.setFontSize(9);
    doc.text(dateRange, col1 + 45, y + 7);
    doc.setFontSize(10);
  }
  
  // Column 2 - Defect Type Distribution
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Defect Distribution:', col2, y);
  let defectY = y + 7;
  Object.entries(defectDistribution).slice(0, 2).forEach(([type, count]) => {
    const percentage = ((count / totalLogs) * 100).toFixed(1);
    doc.setFontSize(9);
    doc.text(`${type}: ${count} (${percentage}%)`, col2, defectY);
    defectY += 5;
  });
  
  // Column 3 - More defect types if available
  if (Object.keys(defectDistribution).length > 2) {
    doc.setFontSize(9);
    Object.entries(defectDistribution).slice(2, 4).forEach(([type, count]) => {
      const percentage = ((count / totalLogs) * 100).toFixed(1);
      doc.text(`${type}: ${count} (${percentage}%)`, col3, defectY);
      defectY += 5;
    });
  }
  
  addFooter(doc, pageWidth, pageHeight);
  doc.addPage();

  // --- TABLE PAGE ---
  function addTableHeader(doc, pageWidth) {
    const headerMargin = 10;
    const smallLogoSize = 15;
    let y = 8;
    
    // Small logo at top left
    doc.addImage(meggLogo, 'PNG', headerMargin, y, smallLogoSize, smallLogoSize);
    
    // Title next to logo
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 85, 136);
    doc.text('Defect Logs Report', headerMargin + smallLogoSize + 5, y + 6);
    
    y += smallLogoSize + 3;
    
    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(headerMargin, y, pageWidth - headerMargin, y);
    return y + 5;
  }

  // Table columns - Optimized widths to fit landscape page
  const columns = [
    { key: 'timestamp', header: 'Timestamp', width: 50, align: 'left' },
    { key: 'egg_id', header: 'Egg ID', width: 50, align: 'left' },
    { key: 'batch_number', header: 'Batch Number', width: 40, align: 'left' },
    { key: 'defect_type', header: 'Defect Type', width: 30, align: 'center' },
    { key: 'confidence', header: 'Confidence', width: 28, align: 'right' },
  ];

  const tableStartX = 12;
  const headerHeight = 10;
  const rowHeight = 8;
  const fontSize = 7.5;
  const headerFontSize = 8;
  let yPosition = addTableHeader(doc, pageWidth) + 5;

  // Section title
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Defect Log Details', 15, yPosition);
  yPosition += 10;

  // Table header row
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(16, 85, 136); // MEGG Blue
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  let x = tableStartX;
  
  // Draw all header backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(16, 85, 136);
    doc.rect(x, yPosition, col.width, headerHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  
  columns.forEach((col) => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, yPosition, col.width, headerHeight);
    
    const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
    doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
      align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
      baseline: 'middle',
      maxWidth: col.width - 6
    });
    x += col.width;
  });
  yPosition += headerHeight;

  // Table data rows
  doc.setFont(undefined, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  
  data.forEach((log, rowIdx) => {
    if (yPosition > pageHeight - 25) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      yPosition = addTableHeader(doc, pageWidth) + 5;
      
      // Redraw header on new page
      x = tableStartX;
      
      columns.forEach((col) => {
        doc.setFillColor(16, 85, 136);
        doc.rect(x, yPosition, col.width, headerHeight, 'F');
        x += col.width;
      });
      
      x = tableStartX;
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(headerFontSize);
      
      columns.forEach((col) => {
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, yPosition, col.width, headerHeight);
        
        const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
        doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
          align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
          baseline: 'middle',
          maxWidth: col.width - 6
        });
        x += col.width;
      });
      yPosition += headerHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }

    // Alternating row background
    if (rowIdx % 2 === 1) {
      x = tableStartX;
      doc.setFillColor(245, 250, 255);
      columns.forEach((col) => {
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
        x += col.width;
      });
    }

    // Cell content
    x = tableStartX;
    columns.forEach((col) => {
      let value = '';
      if (col.key === 'timestamp') {
        if (log.timestamp) {
          if (typeof log.timestamp === 'string') {
            value = new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else if (log.timestamp instanceof Date) {
            value = log.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else if (log.timestamp.seconds) {
            value = new Date(log.timestamp.seconds * 1000).toLocaleString('en-US', { timeZone: 'Asia/Manila' });
          } else {
            value = 'N/A';
          }
        } else {
          value = 'N/A';
        }
      } else if (col.key === 'egg_id') {
        value = log.eggId || log.id || 'Unknown';
      } else if (col.key === 'batch_number') {
        value = log.batchNumber || log.batchId || 'N/A';
      } else if (col.key === 'defect_type') {
        value = log.defectType || log.defect_type || 'Unknown';
      } else if (col.key === 'confidence') {
        const conf = log.confidence || log.confidence_score || 0;
        value = typeof conf === 'number' ? `${(conf * 100).toFixed(1)}%` : 'N/A';
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(x, yPosition, col.width, rowHeight);
      
      const maxWidth = col.width - 6;
      let displayValue = value;
      
      if (col.key === 'batch_number' && value.length > 20) {
        displayValue = value.substring(0, 18) + '..';
      }
      
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(displayValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: maxWidth
      });
      x += col.width;
    });
    yPosition += rowHeight;
  });

  // Summary row (TOTALS)
  yPosition += 2;
  x = tableStartX;
  
  // Draw all backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(230, 240, 255); // Light blue background
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  columns.forEach((col, colIdx) => {
    doc.rect(x, yPosition, col.width, rowHeight);
    
    let summaryValue = '';
    if (colIdx === 0) summaryValue = 'TOTALS';
    else if (col.key === 'defect_type') summaryValue = `${Object.keys(defectDistribution).length} types`;
    
    if (summaryValue) {
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(summaryValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: col.width - 6
      });
    }
    x += col.width;
  });

  addFooter(doc, pageWidth, pageHeight);
  
  // Return PDF blob if requested (for printing), otherwise save
  if (filename === null) {
    // Enable auto-print for printing
    doc.autoPrint({ variant: 'non-conform' });
    // Return as blob for printing
    return doc.output('blob');
  } else {
    doc.save(`${filename}.pdf`);
  }
}

// Sort Statistics Export
export const exportSortStatistics = async (stats, format) => {
  if (!stats) {
    console.warn('No sort statistics to export')
    return
  }

  // Prepare data for export
  const exportData = [
    {
      metric: 'Total Sorts',
      value: stats.totalSorts || 0,
      description: 'Total items sorted on linked machines'
    },
    {
      metric: 'Most Common Size',
      value: stats.mostCommonSize ? stats.mostCommonSize.type : 'N/A',
      description: 'Highest occurring size'
    },
    {
      metric: 'Sort Rate',
      value: `${stats.sortRate || 0} /hr`,
      description: 'Average items per hour'
    },
    {
      metric: 'Sort Trend',
      value: `${stats.sortTrend || 0}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: stats.lastUpdated || 'N/A',
      description: 'Last data refresh time'
    }
  ];

  // Add size distribution data
  if (stats.sizeCounts && Object.keys(stats.sizeCounts).length > 0) {
    Object.keys(stats.sizeCounts).forEach(sizeType => {
      exportData.push({
        metric: `${sizeType} Count`,
        value: stats.sizeCounts[sizeType] || 0,
        description: `Number of ${sizeType} items sorted`
      });
      exportData.push({
        metric: `${sizeType} Percentage`,
        value: `${stats.sizePercentages[sizeType] || 0}%`,
        description: `Percentage of ${sizeType} items`
      });
    });
  }

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ];

  const filename = `sort-statistics-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Statistics Report';

  console.log("Export Statistics Data:", stats);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Statistics');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, stats);
  }
}

// Sort Daily Summary Export
export const exportSortDailySummary = async (data, format) => {
  if (!data) {
    console.warn('No sort daily summary data to export')
    return
  }

  // Prepare data for export
  const exportData = [
    {
      metric: 'Today Total',
      value: data.todayTotal || 0,
      description: 'Total sorts today on linked machines'
    },
    {
      metric: 'Yesterday Total',
      value: data.yesterdayTotal || 0,
      description: 'Total sorts yesterday on linked machines'
    },
    {
      metric: 'Daily Average',
      value: data.average ? data.average.toFixed(1) : '0.0',
      description: 'Average sorts per day over last 7 days'
    },
    {
      metric: 'Peak Time',
      value: data.peak || 'N/A',
      description: 'Highest activity period today'
    },
    {
      metric: 'Change from Yesterday',
      value: `${data.change ? data.change.toFixed(1) : 0}%`,
      description: 'Percentage change from yesterday'
    }
  ];

  // Add size distribution data
  if (data.counts && Object.keys(data.counts).length > 0) {
    Object.keys(data.counts).forEach(sizeType => {
      const count = data.counts[sizeType] || 0;
      const percentage = data.todayTotal > 0 ? ((count / data.todayTotal) * 100).toFixed(1) : 0;
      
      exportData.push({
        metric: `${sizeType} Count`,
        value: count,
        description: `Number of ${sizeType} items sorted today`
      });
      exportData.push({
        metric: `${sizeType} Percentage`,
        value: `${percentage}%`,
        description: `Percentage of ${sizeType} items today`
      });
    });
  }

  // Add hourly distribution data
  if (data.hourlyDistribution && Object.keys(data.hourlyDistribution).length > 0) {
    Object.keys(data.hourlyDistribution).forEach(hour => {
      const count = data.hourlyDistribution[hour] || 0;
      const hourLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      
      exportData.push({
        metric: `Hour ${hourLabel}`,
        value: count,
        description: `Number of sorts at ${hourLabel}`
      });
    });
  }

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ];

  const filename = `sort-daily-summary-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Daily Summary Report';

  console.log("Export Daily Summary Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Daily Summary');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, data);
  }
}

// Sort Batch Review Export
export const exportSortBatchReview = async (data, format) => {
  if (!data) {
    console.warn('No sort batch review data to export')
    return
  }

  let exportData = []
  let columns = []
  let filename = ''
  let title = ''

  // Check if data is a single batch or array of batches
  if (Array.isArray(data)) {
    // Multiple batches
    exportData = data.map(batch => ({
      batch_number: batch.batchNumber || 'Unknown',
      total_sort: batch.totalSort || 0,
      common_size: batch.commonSize || 'Unknown',
      time_range: batch.timeRange || 'N/A',
      from_date: batch.fromDate || 'N/A',
      to_date: batch.toDate || 'N/A'
    }))

    columns = [
      { key: 'batch_number', header: 'Batch Number' },
      { key: 'total_sort', header: 'Total Sort' },
      { key: 'common_size', header: 'Most Common Size' },
      { key: 'time_range', header: 'Time Range' },
      { key: 'from_date', header: 'From Date' },
      { key: 'to_date', header: 'To Date' }
    ]

    filename = `sort-batch-reviews-${new Date().toISOString().split('T')[0]}`
    title = 'Sort Batch Reviews Report'
  } else {
    // Single batch with detailed information
    exportData = [
      {
        metric: 'Batch Number',
        value: data.batchNumber || 'Unknown',
        description: 'Unique batch identifier'
      },
      {
        metric: 'Total Sort',
        value: data.totalSort || 0,
        description: 'Total number of sorts in this batch'
      },
      {
        metric: 'Most Common Size',
        value: data.commonSize || 'Unknown',
        description: 'Most frequently occurring size in this batch'
      },
      {
        metric: 'Time Range',
        value: data.timeRange || 'N/A',
        description: 'Time span of sorting operations'
      },
      {
        metric: 'From Date',
        value: data.fromDate || 'N/A',
        description: 'Start date and time of batch'
      },
      {
        metric: 'To Date',
        value: data.toDate || 'N/A',
        description: 'End date and time of batch'
      }
    ]

    // Add size distribution data if available
    if (data.sizeCounts && Object.keys(data.sizeCounts).length > 0) {
      Object.keys(data.sizeCounts).forEach(sizeType => {
        const count = data.sizeCounts[sizeType] || 0
        const percentage = data.totalSort > 0 ? ((count / data.totalSort) * 100).toFixed(1) : 0
        
        exportData.push({
          metric: `${sizeType} Count`,
          value: count,
          description: `Number of ${sizeType} items in this batch`
        })
        exportData.push({
          metric: `${sizeType} Percentage`,
          value: `${percentage}%`,
          description: `Percentage of ${sizeType} items in this batch`
        })
      })
    }

    columns = [
      { key: 'metric', header: 'Metric' },
      { key: 'value', header: 'Value' },
      { key: 'description', header: 'Description' }
    ]

    filename = `sort-batch-review-${data.batchNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}`
    title = `Sort Batch Review Report - ${data.batchNumber || 'Unknown'}`
  }

  console.log("Export Batch Review Data:", data)

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, title)
      break
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns)
      break
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns)
      break
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.')
      break
    default:
      console.warn('Unknown export format:', format, data)
  }
}

// Chart Export
export const exportChart = async (chartRef, format, filename) => {
  if (format === 'image') {
    await exportToImage(chartRef, filename)
  } else {
    console.warn('Chart can only be exported as image')
  }
}

// Inventory Batch List Export
export const exportInventoryBatches = async (batches, format) => {
  if (!batches || batches.length === 0) {
    console.warn('No batches to export')
    return
  }

  // Calculate defect rate for each batch
  const calculateDefectRate = (batch) => {
    if (!batch.totalEggs || batch.totalEggs === 0) return 0
    const defectEggs = batch.eggSizes?.Defect || 0
    return parseFloat(((defectEggs / batch.totalEggs) * 100).toFixed(2))
  }

  const exportData = batches.map(batch => ({
    batchNumber: batch.batchNumber || 'Unknown',
    totalEggs: batch.totalEggs || 0,
    totalSort: batch.totalSort || batch.goodEggs || 0,
    defectEggs: batch.eggSizes?.Defect || 0,
    defectRate: calculateDefectRate(batch),
    smallEggs: batch.eggSizes?.Small || 0,
    mediumEggs: batch.eggSizes?.Medium || 0,
    largeEggs: batch.eggSizes?.Large || 0,
    status: (batch.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Not Active',
    fromDate: batch.fromDate || 'N/A',
    toDate: batch.toDate || 'N/A',
    createdAt: batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'N/A',
  }))

  const columns = [
    { key: 'batchNumber', header: 'Batch Number' },
    { key: 'totalEggs', header: 'Total Eggs' },
    { key: 'totalSort', header: 'Total Sort' },
    { key: 'defectEggs', header: 'Defect Eggs' },
    { key: 'defectRate', header: 'Defect Rate (%)' },
    { key: 'smallEggs', header: 'Small Eggs' },
    { key: 'mediumEggs', header: 'Medium Eggs' },
    { key: 'largeEggs', header: 'Large Eggs' },
    { key: 'status', header: 'Status' },
    { key: 'fromDate', header: 'From Date' },
    { key: 'toDate', header: 'To Date' },
    { key: 'createdAt', header: 'Created At' }
  ]

  const filename = `inventory-batches-${new Date().toISOString().split('T')[0]}`
  const title = 'Inventory Batches Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Inventory Batches')
      break
    case 'pdf':
      await exportInventoryBatchesPDF(batches, filename)
      break
    case 'print':
      // For print, we'll handle it in the component
      return await exportInventoryBatchesPDF(batches, null)
    default:
      console.warn('Unknown export format:', format)
  }
}

// Improved PDF export specifically for inventory batches
const exportInventoryBatchesPDF = async (batches, filename) => {
  const doc = new jsPDF('landscape'); // Use landscape for better table layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate defect rate helper function
  const calculateDefectRate = (batch) => {
    if (!batch.totalEggs || batch.totalEggs === 0) return 0;
    const defectEggs = batch.eggSizes?.Defect || 0;
    return parseFloat(((defectEggs / batch.totalEggs) * 100).toFixed(2));
  };

  // Get user farm info and load MEGG logo
  const [farmInfo, meggLogo] = await Promise.all([
    getUserFarmInfo(),
    getImageBase64('/logo.png'),
  ]);

  // Calculate summary statistics
  const totalBatches = batches.length;
  const totalEggs = batches.reduce((sum, b) => sum + (b.totalEggs || 0), 0);
  const totalDefects = batches.reduce((sum, b) => sum + (b.eggSizes?.Defect || 0), 0);
  const totalGood = batches.reduce((sum, b) => sum + (b.totalSort || b.goodEggs || 0), 0);
  const activeBatches = batches.filter(b => (b.status || 'active').toLowerCase() === 'active').length;
  const avgDefectRate = totalEggs > 0 ? ((totalDefects / totalEggs) * 100).toFixed(2) : '0.00';

  // --- HEADER (Content-Centric) ---
  let y = 15;
  const logoSize = 20; // Small logo
  const marginLeft = 15;
  
  // Logo at top left
  doc.addImage(meggLogo, 'PNG', marginLeft, y, logoSize, logoSize);
  
  // Title next to logo
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136); // MEGG Blue
  doc.text('Inventory Batches Report', marginLeft + logoSize + 8, y + 7);
  
  // Farm info on the right side
  if (farmInfo.farmName || farmInfo.farmAddress) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    let rightY = y + 4;
    if (farmInfo.farmName) {
      doc.text(farmInfo.farmName, pageWidth - marginLeft, rightY, { align: 'right' });
      rightY += 5;
    }
    if (farmInfo.farmAddress) {
      doc.text(farmInfo.farmAddress, pageWidth - marginLeft, rightY, { align: 'right' });
    }
  }
  
  y += logoSize + 8;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
  y += 10;
  
  // Generation date - small and on the right
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, pageWidth - marginLeft, y, { align: 'right' });
  y += 12;

  // --- SUMMARY SECTION ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Summary', marginLeft, y);
  y += 8;
  
  // Clean layout - 3 columns for better use of landscape space
  const col1 = marginLeft + 5;
  const col2 = pageWidth / 3 + 10;
  const col3 = (pageWidth / 3) * 2 + 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Column 1
  doc.text('Total Batches:', col1, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(totalBatches.toString(), col1 + 45, y);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Active Batches:', col1, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(activeBatches.toString(), col1 + 45, y + 7);
  
  // Column 2
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Total Eggs:', col2, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(totalEggs.toLocaleString(), col2 + 40, y);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Good Eggs:', col2, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 197, 94); // Green
  doc.text(totalGood.toLocaleString(), col2 + 40, y + 7);
  
  // Column 3
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Total Defects:', col3, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(239, 68, 68); // Red
  doc.text(totalDefects.toLocaleString(), col3 + 40, y);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Avg Defect Rate:', col3, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${avgDefectRate}%`, col3 + 40, y + 7);
  
  addFooter(doc, pageWidth, pageHeight);
  doc.addPage();

  // --- TABLE PAGE ---
  function addTableHeader(doc, pageWidth) {
    const headerMargin = 10;
    const smallLogoSize = 15;
    let y = 8;
    
    // Small logo at top left
    doc.addImage(meggLogo, 'PNG', headerMargin, y, smallLogoSize, smallLogoSize);
    
    // Title next to logo
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 85, 136);
    doc.text('Inventory Batches Report', headerMargin + smallLogoSize + 5, y + 6);
    
    y += smallLogoSize + 3;
    
    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(headerMargin, y, pageWidth - headerMargin, y);
    return y + 5;
  }

  // Table columns - Optimized widths to fit landscape page (297mm ~ 297 points)
  // Total available width: ~275 points (297 - 22 for margins)
  const columns = [
    { key: 'batchNumber', header: 'Batch Number', width: 42, align: 'left' },
    { key: 'totalEggs', header: 'Total', width: 20, align: 'right' },
    { key: 'totalSort', header: 'Good', width: 20, align: 'right' },
    { key: 'defectEggs', header: 'Defect', width: 20, align: 'right' },
    { key: 'defectRate', header: 'Def %', width: 18, align: 'right' },
    { key: 'smallEggs', header: 'Small', width: 17, align: 'right' },
    { key: 'mediumEggs', header: 'Medium', width: 19, align: 'right' },
    { key: 'largeEggs', header: 'Large', width: 17, align: 'right' },
    { key: 'status', header: 'Status', width: 24, align: 'center' },
    { key: 'fromDate', header: 'From Date', width: 38, align: 'left' },
    { key: 'toDate', header: 'To Date', width: 38, align: 'left' },
  ];
  // Total width: 273 points (fits in 275 available)

  const tableStartX = 12;
  const headerHeight = 10; // Taller header row
  const rowHeight = 8;
  const fontSize = 7.5; // Data row font size
  const headerFontSize = 8; // Header row font size
  let yPosition = addTableHeader(doc, pageWidth) + 5;

  // Section title
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Batch Details', 15, yPosition);
  yPosition += 10;

  // Table header row
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(16, 85, 136); // MEGG Blue
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  let x = tableStartX;
  
  // Draw all header backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(16, 85, 136); // MEGG Blue for all headers
    doc.rect(x, yPosition, col.width, headerHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setTextColor(255, 255, 255); // White text for all headers
  doc.setFont(undefined, 'bold');
  doc.setFontSize(headerFontSize);
  
  columns.forEach((col) => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, yPosition, col.width, headerHeight);
    
    const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
    doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
      align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
      baseline: 'middle',
      maxWidth: col.width - 6
    });
    x += col.width;
  });
  yPosition += headerHeight;

  // Table data rows
  doc.setFont(undefined, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  
  batches.forEach((batch, rowIdx) => {
    if (yPosition > pageHeight - 25) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      yPosition = addTableHeader(doc, pageWidth) + 5;
      
      // Redraw header on new page
      x = tableStartX;
      
      // Draw all header backgrounds first
      columns.forEach((col) => {
        doc.setFillColor(16, 85, 136); // MEGG Blue for all headers
        doc.rect(x, yPosition, col.width, headerHeight, 'F');
        x += col.width;
      });
      
      // Draw borders and text
      x = tableStartX;
      doc.setTextColor(255, 255, 255); // White text
      doc.setFont(undefined, 'bold');
      doc.setFontSize(headerFontSize);
      
      columns.forEach((col) => {
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, yPosition, col.width, headerHeight);
        
        const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
        doc.text(col.header, textX, yPosition + headerHeight / 2 + 1, { 
          align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
          baseline: 'middle',
          maxWidth: col.width - 6
        });
        x += col.width;
      });
      yPosition += headerHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }

    // Alternating row background
    if (rowIdx % 2 === 1) {
      x = tableStartX;
      doc.setFillColor(245, 250, 255);
      columns.forEach((col) => {
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
        x += col.width;
      });
    }

    // Cell content
    x = tableStartX;
    columns.forEach((col) => {
      let value = '';
      if (col.key === 'batchNumber') value = batch.batchNumber || 'Unknown';
      else if (col.key === 'totalEggs') value = (batch.totalEggs || 0).toLocaleString();
      else if (col.key === 'totalSort') value = ((batch.totalSort || batch.goodEggs || 0)).toLocaleString();
      else if (col.key === 'defectEggs') value = (batch.eggSizes?.Defect || 0).toLocaleString();
      else if (col.key === 'defectRate') {
        const rate = calculateDefectRate(batch);
        value = `${rate.toFixed(2)}%`;
      }
      else if (col.key === 'smallEggs') value = (batch.eggSizes?.Small || 0).toLocaleString();
      else if (col.key === 'mediumEggs') value = (batch.eggSizes?.Medium || 0).toLocaleString();
      else if (col.key === 'largeEggs') value = (batch.eggSizes?.Large || 0).toLocaleString();
      else if (col.key === 'status') value = (batch.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Not Active';
      else if (col.key === 'fromDate') {
        // Format date to be compact (MM/DD/YYYY only, no time)
        value = batch.fromDate ? new Date(batch.fromDate).toLocaleDateString('en-US') : 'N/A';
      }
      else if (col.key === 'toDate') {
        // Format date to be compact (MM/DD/YYYY only, no time)
        value = batch.toDate ? new Date(batch.toDate).toLocaleDateString('en-US') : 'N/A';
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(x, yPosition, col.width, rowHeight);
      
      // Truncate text if too long to prevent overflow
      const maxWidth = col.width - 6;
      let displayValue = value;
      
      // For batch numbers, ensure they fit
      if (col.key === 'batchNumber' && value.length > 20) {
        displayValue = value.substring(0, 18) + '..';
      }
      
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(displayValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: maxWidth
      });
      x += col.width;
    });
    yPosition += rowHeight;
  });

  // Summary row (TOTALS)
  yPosition += 2;
  x = tableStartX;
  
  // Draw all backgrounds first
  columns.forEach((col) => {
    doc.setFillColor(230, 240, 255); // Light blue background
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    x += col.width;
  });
  
  // Draw borders and text
  x = tableStartX;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0); // Black text for totals
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  
  columns.forEach((col, colIdx) => {
    doc.rect(x, yPosition, col.width, rowHeight);
    
    let summaryValue = '';
    if (colIdx === 0) summaryValue = 'TOTALS';
    else if (col.key === 'totalEggs') summaryValue = totalEggs.toLocaleString();
    else if (col.key === 'totalSort') summaryValue = totalGood.toLocaleString();
    else if (col.key === 'defectEggs') summaryValue = totalDefects.toLocaleString();
    else if (col.key === 'defectRate') summaryValue = `${avgDefectRate}%`;
    else if (col.key === 'smallEggs') {
      summaryValue = batches.reduce((sum, b) => sum + (b.eggSizes?.Small || 0), 0).toLocaleString();
    }
    else if (col.key === 'mediumEggs') {
      summaryValue = batches.reduce((sum, b) => sum + (b.eggSizes?.Medium || 0), 0).toLocaleString();
    }
    else if (col.key === 'largeEggs') {
      summaryValue = batches.reduce((sum, b) => sum + (b.eggSizes?.Large || 0), 0).toLocaleString();
    }
    else if (col.key === 'status') summaryValue = `${activeBatches} Active`;
    
    if (summaryValue) {
      const textX = col.align === 'right' ? x + col.width - 3 : col.align === 'center' ? x + col.width / 2 : x + 3;
      doc.text(summaryValue, textX, yPosition + rowHeight / 2 + 1, { 
        align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', 
        baseline: 'middle',
        maxWidth: col.width - 6
      });
    }
    x += col.width;
  });

  addFooter(doc, pageWidth, pageHeight);
  
  // Return PDF blob if requested (for printing), otherwise save
  if (filename === null) {
    // Enable auto-print for printing - this adds print instructions to the PDF
    doc.autoPrint({ variant: 'non-conform' });
    // Return as blob for printing - this is the EXACT same PDF as export
    return doc.output('blob');
  } else {
    doc.save(`${filename}.pdf`);
  }
}

// Individual Batch Details Export (PDF)
export const exportBatchDetailsPDF = async (batchNumber, overviewData) => {
  if (!overviewData) {
    console.warn('No batch details to export')
    return
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Get user farm info and load MEGG logo
  const [farmInfo, meggLogo] = await Promise.all([
    getUserFarmInfo(),
    getImageBase64('/logo.png'),
  ]);

  // Calculate values
  const totalEggs = overviewData.totalEggs || 0;
  const goodEggs = overviewData.goodEggs || overviewData.totalSort || 0;
  const defectEggs = overviewData.defectEggs || 0;
  const defectRate = totalEggs > 0 ? ((defectEggs / totalEggs) * 100).toFixed(2) : '0.00';
  const status = (overviewData.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Not Active';

  // --- HEADER (Content-Centric) ---
  let y = 15;
  const logoSize = 20; // Smaller logo
  const marginLeft = 15;
  
  // Logo at top left
  doc.addImage(meggLogo, 'PNG', marginLeft, y, logoSize, logoSize);
  
  // Title next to logo
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136); // MEGG Blue
  doc.text('Batch Details Report', marginLeft + logoSize + 8, y + 7);
  
  // Farm info on the right side
  if (farmInfo.farmName || farmInfo.farmAddress) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    let rightY = y + 4;
    if (farmInfo.farmName) {
      doc.text(farmInfo.farmName, pageWidth - marginLeft, rightY, { align: 'right' });
      rightY += 5;
    }
    if (farmInfo.farmAddress) {
      doc.text(farmInfo.farmAddress, pageWidth - marginLeft, rightY, { align: 'right' });
    }
  }
  
  y += logoSize + 8;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
  y += 10;
  
  // Generation date - small and on the right
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, pageWidth - marginLeft, y, { align: 'right' });
  y += 10;

  // Batch Number - Simple and Clean
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136); // MEGG Blue
  doc.text(`Batch Number: ${batchNumber || 'Unknown'}`, marginLeft, y);
  y += 12;

  // --- SUMMARY SECTION ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 85, 136);
  doc.text('Summary', marginLeft, y);
  y += 8;
  
  // Clean table layout
  const leftCol = marginLeft + 5;
  const valueCol = 75;
  const rightCol = pageWidth / 2 + 10;
  const rightValueCol = pageWidth / 2 + 75;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Left column - Main metrics
  doc.text('Total Eggs:', leftCol, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(totalEggs.toLocaleString(), valueCol, y);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Good Eggs:', leftCol, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 197, 94); // Green
  doc.text(goodEggs.toLocaleString(), valueCol, y + 7);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Defect Eggs:', leftCol, y + 14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(239, 68, 68); // Red
  doc.text(defectEggs.toLocaleString(), valueCol, y + 14);
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Defect Rate:', leftCol, y + 21);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${defectRate}%`, valueCol, y + 21);
  
  // Time Range in left column (has more space)
  if (overviewData.timeRange) {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Time Range:', leftCol, y + 28);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const timeRange = String(overviewData.timeRange);
    doc.text(timeRange, valueCol, y + 28);
  }
  
  // Right column - Metadata
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Status:', rightCol, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(status, rightValueCol, y);
  
  if (overviewData.createdAt) {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Created:', rightCol, y + 7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const createdAt = new Date(overviewData.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
    doc.text(createdAt, rightValueCol, y + 7);
  }
  
  y += 38;

  // --- SIZE BREAKDOWN SECTION ---
  if (overviewData.sizeBreakdown && Object.keys(overviewData.sizeBreakdown).length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 85, 136);
    doc.text('Size Breakdown', marginLeft, y);
    y += 8;
    
    // Simple clean table with borders
    const tableStartY = y;
    const rowHeight = 8;
    const col1 = marginLeft + 5;
    const col2 = marginLeft + 60;
    const col3 = marginLeft + 110;
    const tableWidth = pageWidth - (marginLeft * 2);
    
    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, tableStartY, tableWidth, rowHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(marginLeft, tableStartY, tableWidth, rowHeight);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Size', col1, tableStartY + 5.5);
    doc.text('Count', col2, tableStartY + 5.5);
    doc.text('Percentage', col3, tableStartY + 5.5);
    y += rowHeight;
    
    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    Object.entries(overviewData.sizeBreakdown).forEach(([size, count]) => {
      const percentage = totalEggs > 0 ? ((count || 0) / totalEggs * 100).toFixed(1) : '0.0';
      
      // Draw row border
      doc.setDrawColor(220, 220, 220);
      doc.rect(marginLeft, y, tableWidth, rowHeight);
      
      doc.text(size, col1, y + 5.5);
      doc.text((count || 0).toLocaleString(), col2, y + 5.5);
      doc.text(`${percentage}%`, col3, y + 5.5);
      y += rowHeight;
    });
    
    y += 5;
  }

  addFooter(doc, pageWidth, pageHeight);
  
  const filename = `batch-details-${batchNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}`;
  doc.save(`${filename}.pdf`);
}

// Batch Overview Image Export
export const exportBatchOverviewImage = async (elementId, batchNumber) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.warn('Element not found for image export')
    return
  }

  const filename = `batch-overview-${batchNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}`
  
  // Create a ref-like object for exportToImage
  const elementRef = { current: element }
  await exportToImage(elementRef, filename)
}

