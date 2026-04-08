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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@800&display=swap" rel="stylesheet">
    <style>
          body { 
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1a202c; 
            padding: 0; 
            margin: 0;
            background: #fff;
            line-height: 1.3;
            width: 280px;
          }
          .receipt-outer {
            width: 100%;
            margin: 0;
            padding: 10px;
            box-sizing: border-box;
          }
          .brand-header {
            background: #0f172a;
            color: white;
            padding: 15px 10px;
            text-align: center;
            -webkit-print-color-adjust: exact;
          }
          .brand-header h2 { 
            margin: 0; 
            font-family: 'Syne', sans-serif; 
            font-weight: 800; 
            font-size: 18px;
            color: #38bdf8;
          }
          .brand-header p {
            margin: 2px 0 0;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.8;
            font-weight: 700;
          }
          .content { padding: 15px 5px; }
          .gym-info { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15px; }
          .gym-info h1 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; }
          .gym-info p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
          
          .meta-section {
            margin-bottom: 20px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
          }
          .meta-item { border-bottom: 1px solid #f1f5f9; padding: 6px 0; }
          .meta-item:last-child { border-bottom: none; }
          .meta-item label { display: block; font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
          .meta-item span { display: block; font-size: 12px; font-weight: 600; color: #1e293b; }

          .transaction-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .transaction-table th { text-align: left; font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
          .transaction-table td { padding: 10px 0; border-bottom: 1px dashed #f1f5f9; font-size: 12px; }
          
          .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 2px solid #0f172a; }
          .total-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .total-amount { font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Syne', sans-serif; }

          .footer { 
            text-align: center; 
            margin-top: 25px; 
            padding-top: 15px;
            border-top: 1px solid #f1f5f9;
            font-size: 10px; 
            color: #94a3b8;
          }
          .footer-note { font-style: italic; color: #64748b; margin-top: 5px; font-size: 11px; }

          @media print {
            @page { margin: 0; size: auto; }
            body { width: 58mm; }
            .receipt-outer { width: 58mm; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-outer">
          <div class="brand-header">
            <h2>NEXORA</h2>
            <p>Intelligence Platform</p>
          </div>
          
          <div class="content">
            <div class="gym-info">
              <h1>${gymName}</h1>
              <p>${gymAddress}</p>
              ${gymContact ? `<p>${gymContact}</p>` : ''}
            </div>
            
            <div class="meta-section">
              <div class="meta-item">
                <label>Receipt No.</label>
                <span>${payment.receiptNumber}</span>
              </div>
              <div class="meta-item">
                <label>Date</label>
                <span>${new Date(payment.paymentDate).toLocaleDateString()}</span>
              </div>
              <div class="meta-item">
                <label>Member</label>
                <span>${member.name}</span>
              </div>
              <div class="meta-item">
                <label>Contact</label>
                <span>${member.phone}</span>
              </div>
            </div>
            
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Gym Fee</strong><br/>
                    <small style="color:#94a3b8;">${payment.periodCovered}</small><br/>
                    <small style="color:#64748b;">Method: ${payment.method}</small>
                  </td>
                  <td style="text-align: right; font-weight: 700; vertical-align: top;">Rs. ${payment.amount}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-row">
              <span class="total-label">Total Paid</span>
              <span class="total-amount">RS ${payment.amount}</span>
            </div>
            
            <div class="footer">
              <p>Electronically generated by NEXORA for ${gymName}.</p>
              ${profile.footerMessage ? `<p class="footer-note">"${profile.footerMessage}"</p>` : ''}
              
              <div style="margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                 <span style="font-size: 8px; font-weight: 800; letter-spacing: 0.1em; color: #cbd5e1; text-transform: uppercase;">Nexora Security Audited</span>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            // window.close();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
}
