import { v2 as cloudinary } from 'cloudinary';

// Issues a short-lived Cloudinary upload signature so the browser can send the
// file straight to Cloudinary. Vercel functions reject request bodies over
// 4.5MB, which made every video and many photos impossible to upload through
// the server. Only the signature travels through here, never the file.
//
// The API secret is used to sign and is never returned to the browser.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uploadPassword = process.env.UPLOAD_PASSWORD || 'adnan2026walk';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: 'Bulut yapılandırması sunucuda eksik (Vercel Environment Variables kontrol edin)' });
    return;
  }

  try {
    const { password } = req.body || {};

    if (password !== uploadPassword) {
      res.status(401).json({ error: 'Yanlış şifre! Yükleme yetkiniz yok.' });
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { folder: 'adnan_walk', timestamp };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    res.status(200).json({
      cloudName,
      apiKey,
      timestamp,
      folder: paramsToSign.folder,
      signature
    });
  } catch (err) {
    console.error('[api/sign]', err);
    res.status(500).json({ error: 'İmza oluşturulamadı. Lütfen tekrar deneyin.' });
  }
}
