import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

// Configure body size limit for base64 uploads (Vercel allows up to 4.5MB payload on free tier serverless functions)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb'
    }
  }
};

export default async function handler(req, res) {
  // CORS Headers
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const uploadPassword = process.env.UPLOAD_PASSWORD || 'adnan2026walk';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!supabaseUrl || !supabaseKey || !cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: 'Bulut yapılandırması sunucuda eksik (Vercel Environment Variables kontrol edin)' });
    return;
  }

  try {
    const { password, fileData, fileName, fileType, title, location, description } = req.body;

    if (password !== uploadPassword) {
      res.status(401).json({ error: 'Yanlış şifre! Yükleme yetkiniz yok.' });
      return;
    }

    if (!fileData || !fileName || !fileType) {
      res.status(400).json({ error: 'Geçersiz dosya verisi.' });
      return;
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileData, {
      resource_type: fileType.startsWith('video/') ? 'video' : 'image',
      folder: 'adnan_walk',
      quality: 'auto',
      fetch_format: 'auto'
    });

    const mediaUrl = result.secure_url;
    const publicId = result.public_id;

    // Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const newMedia = {
      id: publicId,
      url: mediaUrl,
      title: title || fileName,
      type: fileType.startsWith('video/') ? 'video' : 'image',
      location: location || '',
      description: description || '',
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('adnan_walk_media')
      .insert([newMedia]);

    if (error) throw error;

    res.status(200).json({ success: true, item: newMedia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Yükleme sırasında sunucu hatası oluştu.' });
  }
}
