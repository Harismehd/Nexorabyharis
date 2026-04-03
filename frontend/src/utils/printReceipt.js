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
            padding: 40px; 
            background: #f8fafc;
            line-height: 1.5;
          }
          .receipt-outer {
            background: #fff;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .brand-header {
            background: #0f172a;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .brand-header h2 { 
            margin: 0; 
            font-family: 'Syne', sans-serif; 
            font-weight: 800; 
            letter-spacing: -0.02em;
            font-size: 24px;
            color: #38bdf8;
          }
          .brand-header p {
            margin: 4px 0 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.8;
            font-weight: 700;
          }
          .content { padding: 40px; }
          .gym-info { text-align: center; margin-bottom: 40px; }
          .gym-info h1 { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; text-transform: uppercase; }
          .gym-info p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
          
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
          }
          .meta-item label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
          .meta-item span { display: block; font-size: 14px; font-weight: 600; color: #1e293b; }

          .transaction-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .transaction-table th { text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; }
          .transaction-table td { padding: 16px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          
          .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; }
          .total-label { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .total-amount { font-size: 24px; font-weight: 800; color: #0f172a; font-family: 'Syne', sans-serif; }

          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 30px;
            border-top: 1px solid #f1f5f9;
            font-size: 12px; 
            color: #94a3b8;
          }
          .footer-note { font-style: italic; color: #64748b; margin-top: 8px; font-size: 13px; }
          
          .watermark {
            text-align: center;
            margin-top: 30px;
            opacity: 0.5;
            filter: grayscale(1);
          }

          @media print {
            body { padding: 0; background: white; }
            .receipt-outer { box-shadow: none; border: 1px solid #eee; border-radius: 0; max-width: 100%; }
            .brand-header { -webkit-print-color-adjust: exact; }
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
              ${gymContact ? `<p>Contact: ${gymContact}</p>` : ''}
            </div>
            
            <div class="meta-grid">
              <div class="meta-item">
                <label>Receipt Number</label>
                <span>${payment.receiptNumber}</span>
              </div>
              <div class="meta-item">
                <label>Issue Date</label>
                <span>${new Date(payment.paymentDate).toLocaleDateString()}</span>
              </div>
              <div class="meta-item">
                <label>Member Name</label>
                <span>${member.name}</span>
              </div>
              <div class="meta-item">
                <label>Contact Info</label>
                <span>${member.phone}</span>
              </div>
            </div>
            
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Payment Method</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Gym Fee Installation</strong><br/>
                    <small style="color:#94a3b8;">${payment.periodCovered}</small>
                  </td>
                  <td>${payment.method}</td>
                  <td style="text-align: right; font-weight: 700;">Rs. ${payment.amount}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-row">
              <span class="total-label">Grand Total Paid</span>
              <span class="total-amount">RS ${payment.amount}</span>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing ${gymName}. This is an electronically generated document verifying your commitment to excellence.</p>
              ${profile.footerMessage ? `<p class="footer-note">"${profile.footerMessage}"</p>` : ''}
              
              <div style="margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                 <div style="width: 60px; height: 60px; border: 4px solid #f1f5f9; display: flex; align-items: center; justify-content: center; opacity: 0.3;">
                    <small style="font-size: 8px; font-weight: 800; transform: rotate(-45deg);">VERIFIED</small>
                 </div>
                 <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #cbd5e1;">NEXORA SECURITY AUDITED</span>
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
