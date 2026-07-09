require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Count all payments
    const allPayments = await Payment.countDocuments();
    console.log('📊 Total payments in DB:', allPayments);
    
    // Count completed payments
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    console.log('✅ Completed payments:', completedPayments);
    
    // Get connects sold
    const connectsResult = await Payment.aggregate([
      { $match: { status: 'completed', connects_purchased: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$connects_purchased' } } }
    ]);
    console.log('🎁 Total connects sold:', connectsResult[0]?.total || 0);
    
    // Get total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('💰 Total revenue:', revenueResult[0]?.total || 0);
    
    // Show sample payments
    const samples = await Payment.find().limit(5);
    console.log('📋 Sample payments (count:', samples.length, ')');
    samples.forEach((p, i) => {
      console.log(`  Payment ${i+1}: status=${p.status}, amount=${p.amount}, connects=${p.connects_purchased}, type=${p.description}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
