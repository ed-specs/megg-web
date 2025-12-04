import { QrCode, Printer, Link2 } from "lucide-react";

export default function QRCodeModal({ 
  selectedBatch, 
  qrCodeDataUrl, 
  qrCodeLoading, 
  downloadQRCode,
  copyBatchUrl
}) {
  // Print QR Code - Multiple small QR codes per page
  const printQRCode = () => {
    if (!qrCodeDataUrl || !selectedBatch) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the QR code');
      return;
    }

    // Create multiple QR codes in a grid (4 columns x 10 rows = 40 per page)
    const cols = 4;
    const rows = 10;
    const total = cols * rows;
    
    let qrGridHTML = '';
    for (let i = 0; i < total; i++) {
      qrGridHTML += `
        <div class="qr-item">
          <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code-small" />
          <div class="batch-number">${selectedBatch}</div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - ${selectedBatch}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 5mm;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(${cols}, 1fr);
              gap: 5mm;
              width: 100%;
            }
            .qr-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm;
              page-break-inside: avoid;
            }
            .qr-code-small {
              width: 45mm;
              height: 45mm;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            .batch-number {
              margin-top: 2mm;
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              word-break: break-all;
              max-width: 45mm;
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
            ${qrGridHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  if (!selectedBatch) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 w-full xl:w-80">
      {/* QR Code section */}
      <div className="flex flex-col gap-4 border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-500">
            <QrCode className="w-4 h-4" />
          </div>
          <h3 className="font-medium">QR Code</h3>
        </div>

        {qrCodeLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : qrCodeDataUrl ? (
          <div className="flex flex-col gap-4 items-center">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt={`QR Code for batch ${selectedBatch}`}
                className="w-48 h-48"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Scan this QR code to view batch details on any device
            </p>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={printQRCode}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-colors duration-150 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-150 text-sm font-medium"
              >
                Download
              </button>
            </div>
            
            {/* Copy URL Button */}
            <button
              onClick={() => copyBatchUrl(selectedBatch)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150 text-sm font-medium border border-gray-300"
            >
              <Link2 className="w-4 h-4" />
              Copy Batch URL
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <p className="text-sm">Failed to generate QR code</p>
          </div>
        )}
      </div>

      {/* Batch info */}
      <div className="flex flex-col gap-4 border border-gray-300 rounded-lg p-4">
        <h3 className="font-medium">Selected Batch</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Batch Number:</span>
            <span className="text-sm font-medium">{selectedBatch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
