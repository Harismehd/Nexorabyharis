export default function printReceiptHtml(payment, profile, member) {
  // Confirm before printing
  const confirmPrint = window.confirm('Generate and print this receipt now?');
  if (!confirmPrint) return;

  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) {
    alert("Popup blocker prevented printing. Please allow popups for this site.");
    return;
  }
  
  const gymName = profile.name || 'Gym Name';
  const gymAddress = profile.address || 'Gym Address Not Configured';
  const gymContact = profile.contact || '';
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${payment.receiptNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', Courier, monospace; 
            color: #000; 
            padding: 20px; 
            background: #fff;
          }
          .receipt-container { 
            max-width: 350px; 
            margin: 0 auto; 
            border: 1px dashed #ccc; 
            padding: 20px; 
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .header h1 { margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 5px 0 0; font-size: 14px; }
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            font-size: 14px; 
          }
          .row-bold { 
            font-weight: bold; 
            font-size: 16px; 
            margin-top: 15px; 
            border-top: 2px dashed #000; 
            padding-top: 15px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 12px; 
            border-top: 1px dashed #000; 
            padding-top: 15px; 
          }
          @media print {
            body { padding: 0; }
            .receipt-container { border: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${gymName}</h1>
            <p>${gymAddress}</p>
            ${gymContact ? `<p>Contact: ${gymContact}</p>` : ''}
          </div>
          
          <div class="row">
            <span>Receipt No:</span>
            <span>${payment.receiptNumber}</span>
          </div>
          <div class="row">
            <span>Date:</span>
            <span>${new Date(payment.paymentDate).toLocaleDateString()}</span>
          </div>
          <br/>
          <div class="row">
            <span>Customer:</span>
            <span>${member.name}</span>
          </div>
          <div class="row">
            <span>Phone:</span>
            <span>${member.phone}</span>
          </div>
          <br/>
          <div class="row">
            <span>Period:</span>
            <span>${payment.periodCovered}</span>
          </div>
          <div class="row">
            <span>Method:</span>
            <span>${payment.method}</span>
          </div>
          
          <div class="row row-bold">
            <span>TOTAL PAID:</span>
            <span>Rs. ${payment.amount}</span>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            ${profile.footerMessage ? `<p style="margin-top:5px; font-style:italic;">${profile.footerMessage}</p>` : ''}
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            // Optional: Close popup after printing or cancelling
            // setTimeout(function() { window.close(); }, 500); 
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
}
