import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

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
  // Row level security on adnan_walk_media grants the anon role select and
  // insert but not delete, and PostgREST reports a blocked delete as a success
  // that removed zero rows. The service role bypasses RLS and never leaves the
  // server, so deletion uses it when it is configured.
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  const uploadPassword = process.env.UPLOAD_PASSWORD || 'adnan2026walk';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!supabaseUrl || !supabaseKey || !cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: 'Bulut yapılandırması sunucuda eksik (Vercel Environment Variables kontrol edin)' });
    return;
  }

  try {
    const { password, id } = req.body;

    if (password !== uploadPassword) {
      res.status(401).json({ error: 'Yanlış şifre! Silme yetkiniz yok.' });
      return;
    }

    if (!id) {
      res.status(400).json({ error: 'Medya ID belirtilmedi.' });
      return;
    }

    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Retrieve media details
    const { data: mediaItem, error: fetchError } = await supabase
      .from('adnan_walk_media')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!mediaItem) {
      res.status(404).json({ error: 'Medya bulunamadı.' });
      return;
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });

    // Delete from Cloudinary
    if (!id.startsWith('local_')) {
      const resType = mediaItem.type === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(id, { resource_type: resType });
    }

    // Delete from Supabase. Asking for the deleted rows back is what makes a
    // policy-blocked delete detectable: without it PostgREST answers 200 and the
    // row quietly stays, which is exactly how this bug went unnoticed.
    const { data: deletedRows, error: deleteError } = await supabase
      .from('adnan_walk_media')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) throw deleteError;

    if (!deletedRows || deletedRows.length === 0) {
      console.error('[api/delete] Delete affected zero rows for id:', id,
        '- SUPABASE_SERVICE_KEY is probably missing, so RLS blocked it.');
      res.status(500).json({
        error: 'Medya silinemedi: sunucunun veritabanında silme yetkisi yok.'
      });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    // Raw driver messages are logged, never returned: they leak internals and
    // mean nothing to the person looking at the gallery.
    console.error('[api/delete]', err);
    res.status(500).json({ error: 'Silme sırasında sunucu hatası oluştu. Lütfen tekrar deneyin.' });
  }
}
