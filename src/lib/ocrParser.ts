import { db } from '../db';
import { formTypes } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * OpenAI GPT-4o-mini modeline gönderilecek olan katı JSON şeması (Structured Outputs).
 * Bu şema, form yapısının her zaman tutarlı ve belirlenen alanlarla dönmesini garanti eder.
 */
const strictOcrJsonSchema = {
  type: 'object',
  properties: {
    tarih: { 
      type: 'string', 
      description: 'Formun doldurulduğu tarih (YYYY-MM-DD formatında)' 
    },
    formAdi: { 
      type: 'string', 
      description: 'Formun başlığı veya adı' 
    },
    kontroller: {
      type: 'array',
      description: 'Form tablosunda yer alan periyodik kontrol satırları',
      items: {
        type: 'object',
        properties: {
          saat: { 
            type: 'string', 
            description: 'Kontrolün yapıldığı saat (SS:DD formatında)' 
          },
          deger: { 
            type: 'string', 
            description: 'Ölçülen veya gözlemlenen değer (Örn: "29.8 °C", "Temiz", "Test Ok")' 
          },
          uygunluk: { 
            type: 'boolean', 
            description: 'Kontrolün durumu. U, UYGUN, veya (✓) işareti varsa true; UD, UYGUN DEĞİL, veya (✗) işareti varsa false.' 
          },
          kontrolEden: { 
            type: 'string', 
            description: 'Kontrolü gerçekleştiren operatörün veya işçinin adı/parafe bilgisi' 
          }
        },
        required: ['saat', 'deger', 'uygunluk', 'kontrolEden'],
        additionalProperties: false
      }
    },
    notlar: { 
      type: 'string', 
      description: 'Formun altında yer alan özel notlar, sapmalar veya açıklama kısımları' 
    }
  },
  required: ['tarih', 'formAdi', 'kontroller', 'notlar'],
  additionalProperties: false
};

/**
 * Görseli analiz edip form tipine göre yapılandırılmış JSON döndürür.
 * @param imageBuffer Önişlemeden geçmiş görsel buffer'ı
 * @param formTypeId İlgili formun veritabanındaki ID'si
 */
export async function parseFormWithAI(imageBuffer: Buffer, formTypeId: string): Promise<Record<string, any>> {
  // 1. Form tipinin adını çek
  const [formType] = await db
    .select()
    .from(formTypes)
    .where(eq(formTypes.id, formTypeId))
    .limit(1);

  const formName = formType ? formType.displayName : 'Genel Kalite Formu';

  // 2. Base64 formatına dönüştür
  const base64Image = imageBuffer.toString('base64');
  const apiKey = process.env.OPENAI_API_KEY;

  // Geliştirici veya yerel test ortamında API key tanımlı değilse mock veri döndür
  if (!apiKey) {
    console.warn('OPENAI_API_KEY bulunamadı. Mock veri simülasyonu yapılıyor.');
    return generateMockParsedData(formName);
  }

  // 3. OpenAI Vision API Çağrısı (Structured Outputs - strict: true)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'gida_kalite_formu_donusumu',
          strict: true,
          schema: strictOcrJsonSchema
        }
      },
      messages: [
        {
          role: 'system',
          content: `Sen bir gıda fabrikası kalite kontrol asistanısın. Görevin, yüklenen form görselindeki el yazısı tablo verilerini okuyarak jilet gibi temiz bir JSON objesine dönüştürmektir.
          
Form Tipi: "${formName}"

Kurallar:
1. Tablo satırlarını ve sütunlarını sırayla oku.
2. El yazısıyla yazılmış veya işaretlenmiş alanları şu kurallara göre boolean yap:
   - "u", "U", "UYGUN", veya onay/tik (✓) işareti varsa => true
   - "ud", "UD", "UYGUN DEĞİL", veya çarpı (✗) işareti varsa => false
3. Okunamayan alanlar için boş veya mantıklı varsayılan değerler ata.
4. Yanıtı belirtilen JSON Şemasına %100 uyumlu olarak döndür.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Lütfen bu kalite formundaki el yazısı tablo verilerini oku ve şemaya uygun şekilde yapılandır.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1200
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Hatası: ${errText}`);
  }

  const result = await response.json();
  const rawJsonString = result.choices[0].message.content;
  return JSON.parse(rawJsonString);
}

// Simülasyon Verisi (Geliştirme / Test kolaylığı için)
function generateMockParsedData(formName: string): Record<string, any> {
  const bugun = new Date().toISOString().split('T')[0];
  
  if (formName.includes('Metal')) {
    return {
      tarih: bugun,
      formAdi: formName,
      kontroller: [
        { saat: "08:00", deger: "Fe: 1.5mm Ok, Non-Fe: 2.0mm Ok", uygunluk: true, kontrolEden: "Ahmet Usta" },
        { saat: "12:00", deger: "Fe: 1.5mm Ok, Non-Fe: 2.0mm Ok", uygunluk: true, kontrolEden: "Ahmet Usta" },
        { saat: "16:00", deger: "Sensörde un kalıntısı temizlendi", uygunluk: false, kontrolEden: "Mehmet Can" }
      ],
      notlar: "Saat 16:00'da dedektörün etrafı temizlendi ve kalibrasyon testi tekrarlandı."
    };
  }
  
  return {
    tarih: bugun,
    formAdi: formName,
    kontroller: [
      { saat: "09:00", deger: "24.5 °C", uygunluk: true, kontrolEden: "Mustafa Vardiya" },
      { saat: "15:00", deger: "25.2 °C", uygunluk: true, kontrolEden: "Mustafa Vardiya" }
    ],
    notlar: "Sıcaklık ve nem değerleri kritik limitler içerisindedir."
  };
}
