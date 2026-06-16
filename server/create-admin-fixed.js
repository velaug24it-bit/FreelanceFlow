const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Define schema directly
        const userSchema = new mongoose.Schema({
            email: String,
            full_name: String,
            password_hash: String,
            role: String,
            subscription_tier: String,
            subscription_status: String,
            created_at: Date
        });
        
        const User = mongoose.model('User', userSchema);
        
        // Create admin user with password 'velraj2006'
        const passwordHash = await bcrypt.hash('velraj2006', 10);
        
        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'velr012006@gmail.com' });
        
        if (existingAdmin) {
            // Update existing
            await User.updateOne(
                { email: 'velr012006@gmail.com' },
                {
                    full_name: 'Admin User',
                    password_hash: passwordHash,
                    role: 'admin',
                    subscription_tier: 'business',
                    subscription_status: 'active'
                }
            );
            console.log('✅ Admin user updated!');
        } else {
            // Create new
            await User.create({
                email: 'velr012006@gmail.com',
                full_name: 'Admin User',
                password_hash: passwordHash,
                role: 'admin',
                subscription_tier: 'business',
                subscription_status: 'active',
                created_at: new Date()
            });
            console.log('✅ Admin user created!');
        }
        
        // Create test admin
        const testHash = await bcrypt.hash('admin123', 10);
        const testAdmin = await User.findOne({ email: 'admin@freelanceflow.com' });
        
        if (!testAdmin) {
            await User.create({
                email: 'admin@freelanceflow.com',
                full_name: 'Super Admin',
                password_hash: testHash,
                role: 'admin',
                subscription_tier: 'business',
                subscription_status: 'active',
                created_at: new Date()
            });
            console.log('✅ Test admin created!');
        }
        
        // List all admins
        const admins = await User.find({ role: 'admin' });
        console.log('\n📋 Admin users:');
        admins.forEach(admin => {
            console.log(`   Email: ${admin.email}`);
        });
        
        console.log('\n✨ You can now login with:');
        console.log('   Email: velr012006@gmail.com');
        console.log('   Password: velraj2006');
        
        await mongoose.disconnect();
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

createAdmin();