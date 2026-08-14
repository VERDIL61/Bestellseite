require('dotenv').config();
const bcrypt = require(bcryptjs);
const connectDB = require('./config/db');
const Admin = require('./models/Admin');

async function resetPassword(req, res) {
    // das neue password wird als Argument beim Aufrufen übergeben: node reset-password.js MeinNeuesPasswort
   const newPassword = process.argv[2];

   if (!newPassword) {
       console.error('Bitte ein neues Passwort angeben:');
       console.error(' node reset-password.js DeinNeuesPasswort');
       process.exit(1);
   }

   if (newPassword.length < 4) {
       console.error('Das Passwort muss mindestens 4 Zeichen lang sein.');
       process.exit(1);
   }

   await connectDB();

   const passwordHash = await bcrypt.hash(newPassword, 10);

   // Es gibt nur ein Admin-Dokument, Falls keine existiert, wird eins angelegt.
    let admin = await Admin.findOne();
    if (admin) {
        admin.passwordHash = passwordHash;
        await admin.save();
        console.log('✅ Passwort wurde erfolgreich zurückgesetzt.');
    } else {
        await Admin.create({ passwordHash });
        console.log('✅ Kein Admin-Konto gefunden – neues Konto mit diesem Passwort angelegt.');
    }

    process.exit(0);
}
resetPassword();