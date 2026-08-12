import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

// Vercel caps a function's request body at 4.5MB and that cap is not configurable
// from here, so large files never reach this endpoint. The browser signs with
// /api/sign and sends the file straight to Cloudinary, then posts only the
// resulting URL here. The legacy base64 path is kept for small files.

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
    const {
      password, fileData, fileName, fileType, title, location, description,
      // Set when the browser already uploaded straight to Cloudinary
      secureUrl, publicId: uploadedPublicId
    } = req.body;

    if (password !== uploadPassword) {
      res.status(401).json({ error: 'Yanlış şifre! Yükleme yetkiniz yok.' });
      return;
    }

    const isDirectUpload = Boolean(secureUrl && uploadedPublicId);

    if (!isDirectUpload && (!fileData || !fileName || !fileType)) {
      res.status(400).json({ error: 'Geçersiz dosya verisi.' });
      return;
    }

    let mediaUrl;
    let publicId;

    if (isDirectUpload) {
      // Only accept URLs that actually live on this Cloudinary account, so this
      // endpoint cannot be used to insert arbitrary links into the gallery.
      if (!secureUrl.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
        res.status(400).json({ error: 'Geçersiz medya adresi.' });
        return;
      }
      mediaUrl = secureUrl;
      publicId = uploadedPublicId;
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      let result;
      try {
        result = await cloudinary.uploader.upload(fileData, {
          resource_type: fileType.startsWith('video/') ? 'video' : 'image',
          folder: 'adnan_walk',
          quality: 'auto',
          fetch_format: 'auto'
        });
      } catch (err) {
        throw stageError('CLOUDINARY', err);
      }

      mediaUrl = result.secure_url;
      publicId = result.public_id;
    }

    // Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const newMedia = {
      id: publicId,
      url: mediaUrl,
      title: title || fileName || 'İsimsiz',
      type: (fileType || '').startsWith('video/') ? 'video' : 'image',
      location: location || '',
      description: description || '',
      timestamp: new Date().toISOString()
    };

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('adnan_walk_media')
          .insert([newMedia]);
        if (error) throw error;
      });
    } catch (err) {
      // The file is already in Cloudinary at this point, so the upload is not a
      // total loss: report it distinctly rather than as a generic failure.
      throw stageError('DATABASE', err);
    }

    res.status(200).json({ success: true, item: newMedia });
  } catch (err) {
    // Log the real error for the Vercel function logs, but never hand the raw
    // message to the browser: it leaks internals and reads as gibberish to a user.
    console.error('[api/upload]', err.stage || 'UNKNOWN', err);
    res.status(500).json({
      error: MESSAGES[err.stage] || 'Yükleme sırasında sunucu hatası oluştu. Lütfen tekrar deneyin.',
      stage: err.stage || 'UNKNOWN'
    });
  }
}

const MESSAGES = {
  CLOUDINARY: 'Dosya medya sunucusuna yüklenemedi. Bağlantı geçici olarak kesilmiş olabilir, lütfen tekrar deneyin.',
  DATABASE: 'Dosya yüklendi ama galeriye kaydedilemedi. Birazdan tekrar deneyin.'
};

// Tag an error with the stage it came from so the handler can pick a message
// without pattern matching on driver-specific text.
function stageError(stage, cause) {
  const err = new Error(`${stage} step failed: ${cause && cause.message}`);
  err.stage = stage;
  err.cause = cause;
  return err;
}

// "TypeError: fetch failed" from undici is almost always a transient connection
// drop between the serverless function and the service. One retry clears it.
async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 400 * (i + 1)));
      }
    }
  }
  throw lastError;
}
