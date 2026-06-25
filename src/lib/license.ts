import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { desc } from 'drizzle-orm';
import { db } from '../db';
import { formSubmissions } from '../db/schema';

interface LicenseData {
  tenantId: string;
  companyName: string;
  expiryDate: string; // ISO String: "2026-12-31"
  licenseKey: string;
}

// Bellek içi önbellek
let cachedResult: { isValid: boolean; reason?: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 Dakika (Hızlı reaksiyon için 1 dakikaya düşürdük)

export async function verifyLicense(): Promise<{ isValid: boolean; reason?: string }> {
  const now = Date.now();
  
  if (cachedResult && (now - cachedResult.timestamp) < CACHE_TTL_MS) {
    return cachedResult;
  }

  const result = await performLicenseCheck();
  cachedResult = { ...result, timestamp: now };
  return result;
}

async function performLicenseCheck(): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const licensePath = path.join(process.cwd(), '.license');
    
    if (!fs.existsSync(licensePath)) {
      return { isValid: false, reason: 'LİSANS DOSYASI BULUNAMADI' };
    }

    const encryptedData = fs.readFileSync(licensePath, 'utf8').trim();
    const license = decryptLicense(encryptedData);

    if (!license) {
      return { isValid: false, reason: 'GEÇERSİZ LİSANS FORMATI' };
    }

    // 1. Tarih Hilesi Emniyet Sistemi (Historical Clock Log)
    const isClockTampered = await checkClockTampering();
    if (isClockTampered) {
      return { isValid: false, reason: 'SİSTEM SAAT HİLESİ TESPİT EDİLDİ (SAAT GERİYE ALINMIŞ)' };
    }

    // 2. Yerel Tarih Kontrolü
    const expiry = new Date(license.expiryDate);
    const today = new Date();
    
    if (today > expiry) {
      return { isValid: false, reason: 'LİSANS SÜRESİ DOLMUŞTUR' };
    }

    // 3. Merkezi Sunucu Kontrolü (Kill-Switch) - İnternet varsa sorgulanır
    const isSuspended = await checkCentralKillSwitch(license.licenseKey);
    if (isSuspended) {
      return { isValid: false, reason: 'LİSANSINIZ ASKIYA ALINMIŞTIR (MERKEZİ KONTROL)' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Lisans doğrulama hatası:', error);
    return { isValid: false, reason: 'LİSANS KONTROLÜ SIRASINDA SİSTEMSEL HATA' };
  }
}

// AES-256-CBC Şifre Çözücü
function decryptLicense(encryptedText: string): LicenseData | null {
  try {
    const secret = process.env.LICENSE_SECRET_KEY || 'novexistech-crypto-key';
    const key = crypto.createHash('sha256').update(secret).digest();
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString('utf8')) as LicenseData;
  } catch (e) {
    return null;
  }
}

// Sunucu Saatinin Geriye Alınmasını Önleyen Güvenlik Emniyeti (Historical Clock Log)
async function checkClockTampering(): Promise<boolean> {
  try {
    // Veritabanına kaydedilmiş en son formun tarihini çekiyoruz
    const latestSubmission = await db
      .select({ createdAt: formSubmissions.createdAt })
      .from(formSubmissions)
      .orderBy(desc(formSubmissions.createdAt))
      .limit(1);

    if (latestSubmission && latestSubmission.length > 0) {
      const latestDate = new Date(latestSubmission[0].createdAt);
      const today = new Date();

      // Eğer sunucunun mevcut saati veritabanındaki en son kayıttan daha gerideyse saat geriye alınmıştır!
      if (today < latestDate) {
        console.error(`GÜVENLİK ALARMI: Sunucu saati geriye alınmış! En son kayıt tarihi: ${latestDate.toISOString()}, Mevcut saat: ${today.toISOString()}`);
        return true;
      }
    }
  } catch (error) {
    // Tablonun boş olması veya henüz oluşturulmamış olması durumunda kontrolü pas geçiyoruz
    console.warn('Saat manipülasyonu kontrolü atlandı (Muhtemelen veri bulunmuyor veya tablo yok).');
  }
  return false;
}

// Merkezi Sunucu Kontrolü (Kill-Switch)
async function checkCentralKillSwitch(licenseKey: string): Promise<boolean> {
  const apiUrl = process.env.CENTRAL_LICENSE_API;
  if (!apiUrl) return false;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // 2 saniye zaman aşımı

    const response = await fetch(`${apiUrl}?key=${licenseKey}`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(id);

    if (response.ok) {
      const data = await response.json();
      return data.status === 'SUSPENDED';
    }
  } catch (err) {
    // Çevrimdışı çalışmaya tolerans tanıyoruz
    console.warn('Merkezi lisans sunucusuna erişilemedi, yerel lisans geçerli sayılıyor (Offline Tolerans).');
  }
  
  return false;
}
