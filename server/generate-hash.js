const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'velraj2006';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Hash length:', hash.length);
}

generateHash();