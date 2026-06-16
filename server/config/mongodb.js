const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Atlas Connected Successfully!');
        return true;
    } catch (error) {
        console.error('❌ MongoDB Error:', error.message);
        return false;
    }
};

module.exports = connectDB;