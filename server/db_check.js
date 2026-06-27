const mongoose = require('mongoose');
require('dotenv').config();

const Payment = require('./models/Payment');

async function check() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const payments = await Payment.find({});
        console.log('Total Payments in DB:', payments.length);
        payments.forEach(p => {
            console.log(`Payment: ${p._id}`);
            console.log(`  - desc: "${p.description}"`);
            console.log(`  - amount: ${p.amount}`);
            console.log(`  - status: "${p.status}"`);
            console.log(`  - package_id: "${p.package_id}" (type: ${typeof p.package_id})`);
            console.log(`  - connects_purchased: ${p.connects_purchased} (type: ${typeof p.connects_purchased})`);
            console.log(`  - user_id: ${p.user_id}`);
            console.log(`  - client_id: ${p.client_id}`);
            console.log(`  - freelancer_id: ${p.freelancer_id}`);
            console.log(`  - project_id: ${p.project_id}`);
        });

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

check();
