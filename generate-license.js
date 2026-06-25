const fs = require('fs');
const crypto = require('crypto');

const licensePayload = {
  tenantId: "da9bd9a4-ecdf-416b-b4a8-6c8ef0058b8f", // Örnek tenant ID (isteğe bağlı)
  companyName: "Novexistech Gıda Fabrikası A.Ş.",
  expiryDate: "2026-12-31", // Son kullanma tarihi (Süreyi aşmak için geçmiş tarih yazıp test edebilirsiniz)
  licenseKey: "novexistech-gida-rehberi-2026-key"
};

function generateLicense() {
  const secret = process.env.LICENSE_SECRET_KEY || 'novexistech-crypto-key';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(licensePayload), 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const licenseContent = iv.toString('hex') + ':' + encrypted.toString('hex');
  
  fs.writeFileSync('.license', licenseContent, 'utf8');
  console.log('✅ .license dosyası başarıyla üretildi!');
  console.log('Payload:', licensePayload);
}

generateLicense();
