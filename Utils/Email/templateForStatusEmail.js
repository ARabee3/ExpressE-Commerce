
export const getStatusInfo = (status) => {
  const statusData = {
    Pending: {
      subject: "Order Confirmation",
      icon: "⏳",
      color: "#FFA500",
      title: "Order Received",
      message:
        "Thank you for your order! We have received your order and it is now pending confirmation.",
      action: "Your order will be processed shortly.",
    },
    Processing: {
      subject: "Order Processing",
      icon: "⚙️",
      color: "#2196F3",
      title: "Order Being Processed",
      message: "Great news! Your order is now being processed by our team.",
      action: "We are preparing your items for shipment.",
    },
    Shipped: {
      subject: "Order Shipped",
      icon: "🚚",
      color: "#9C27B0",
      title: "Order Shipped",
      message:
        "Excellent news! Your order has been shipped and is on its way to you.",
    },
    Delivered: {
      subject: "Order Delivered",
      icon: "✅",
      color: "#4CAF50",
      title: "Order Delivered",
      message: "Your order has been successfully delivered!",
      action:
        "We hope you enjoy your purchase. Thank you for shopping with us!",
    },
    Cancelled: {
      subject: "Order Cancelled",
      icon: "❌",
      color: "#F44336",
      title: "Order Cancelled",
      message: "Your order has been cancelled.",
      action: "If you have any questions, please contact our support team.",
    },
  };

  return statusData[status] || statusData["Pending"];
};


export const generateEmailHTML = (
  userName,
  orderId,
  status,
  statusInfo,
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        .header .icon {
          font-size: 60px;
          margin-bottom: 15px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .status-box {
          background-color: #f9f9f9;
          border-left: 4px solid ${statusInfo.color};
          padding: 20px;
          margin: 25px 0;
          border-radius: 5px;
        }
        .status-box h2 {
          color: ${statusInfo.color};
          margin-bottom: 10px;
          font-size: 20px;
        }
        .status-box p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .order-details {
          background-color: #fff;
          border: 1px solid #e0e0e0;
          padding: 20px;
          margin: 25px 0;
          border-radius: 5px;
        }
        .order-details h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 18px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        .detail-value {
          color: #333;
          font-weight: 600;
        }
        .action-text {
          background-color: #f0f7ff;
          padding: 15px;
          border-radius: 5px;
          color: #555;
          line-height: 1.6;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background-color: ${statusInfo.color};
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }
        .button:hover {
          opacity: 0.9;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 30px;
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
        }
        .footer a {
          color: ${statusInfo.color};
          text-decoration: none;
        }
        .social-links {
          margin-top: 20px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #666;
          text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
          .container {
            border-radius: 0;
          }
          .content {
            padding: 30px 20px;
          }
          .detail-row {
            flex-direction: column;
          }
          .detail-value {
            margin-top: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="icon">${statusInfo.icon}</div>
          <h1>${statusInfo.title}</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p class="greeting">Hello <strong>${userName}</strong>,</p>
          
          <div class="status-box">
            <h2>Order Status Update</h2>
            <p>${statusInfo.message}</p>
          </div>

          <div class="order-details">
            <h3>Order Information</h3>
            <div class="detail-row">
              <span class="detail-label">Order ID:</span>
              <span class="detail-value">#${orderId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: ${statusInfo.color};">${status}</span>
            </div>

          <div class="action-text">
            ${statusInfo.action}
          </div>

          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/orders/${orderId}" class="button">
              View Order Details
            </a>
          </div>

          <p style="color: #666; margin-top: 30px; line-height: 1.6;">
            If you have any questions or concerns about your order, 
            please don't hesitate to contact our customer support team.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>E-Commerce Store</strong></p>
          <p>123 Business Street, Cairo, Egypt</p>
          <p>Email: <a href="mailto:support@ecommerce.com">support@ecommerce.com</a></p>
          <p>Phone: +20 123 456 7890</p>

        </div>
      </div>
    </body>
    </html>
  `;
};
