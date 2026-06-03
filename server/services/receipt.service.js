const PDFDocument = require('pdfkit');
const { supabase } = require('../config/db');

async function generateReceiptStream(orderId) {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:users!buyer_id(id, shop_name, email, phone_number),
      seller:users!seller_id(id, shop_name, email, phone_number),
      wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit)
    `)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.fontSize(22).font('Helvetica-Bold').text('DukaanSetu', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('B2B Order Receipt', { align: 'center' });
  doc.moveDown();

  doc.fontSize(8).fillColor('#666').text(`Order #${orderId.slice(0, 8).toUpperCase()}`, { align: 'center' });
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).fillColor('#000');
  doc.text(`Buyer: ${order.buyer?.shop_name || 'N/A'}`);
  doc.text(`Seller: ${order.seller?.shop_name || 'N/A'}`);
  doc.text(`Status: ${order.status}`);
  doc.moveDown();

  // Table header
  const startX = 50;
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Product', startX, y, { width: 200 });
  doc.text('Qty', startX + 200, y, { width: 60, align: 'right' });
  doc.text('Price', startX + 260, y, { width: 80, align: 'right' });
  doc.text('Subtotal', startX + 340, y, { width: 100, align: 'right' });
  doc.moveDown();
  y = doc.y;
  doc.font('Helvetica').fontSize(9);

  if (items && items.length > 0) {
    items.forEach(item => {
      const subtotal = (item.quantity || 0) * parseFloat(item.price || 0);
      doc.text(item.product_name || `Product #${item.product_id}`, startX, y, { width: 200 });
      doc.text(String(item.quantity), startX + 200, y, { width: 60, align: 'right' });
      doc.text(`₹${parseFloat(item.price || 0).toFixed(2)}`, startX + 260, y, { width: 80, align: 'right' });
      doc.text(`₹${subtotal.toFixed(2)}`, startX + 340, y, { width: 100, align: 'right' });
      y += 18;
    });
  } else {
    doc.text(order.wholesaler_products?.product_name || 'Product', startX, y, { width: 200 });
    doc.text(String(order.quantity || 0), startX + 200, y, { width: 60, align: 'right' });
    doc.text(`₹${parseFloat(order.wholesaler_products?.price_per_unit || 0).toFixed(2)}`, startX + 260, y, { width: 80, align: 'right' });
    doc.text(`₹${parseFloat(order.total_price || 0).toFixed(2)}`, startX + 340, y, { width: 100, align: 'right' });
    y += 18;
  }

  y += 10;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Total: ₹${parseFloat(order.total_price || 0).toFixed(2)}`, startX + 250, y, { width: 190, align: 'right' });
  y += 20;
  doc.font('Helvetica').fontSize(9);
  doc.text(`Discount Applied: ₹${parseFloat(order.applied_discount || 0).toFixed(2)}`, startX + 250, y, { width: 190, align: 'right' });
  y += 20;
  doc.text(`Payment Status: ${order.fraud_flag ? 'Flagged for Review' : 'Pending'}`, startX, y);

  doc.end();
  return doc;
}

module.exports = { generateReceiptStream };
