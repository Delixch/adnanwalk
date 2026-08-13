import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

// Read database helper
const getDatabase = () => {
  const dbPath = path.resolve('database.json');
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ media: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

// Write database helper
const saveDatabase = (data) => {
  const dbPath = path.resolve('database.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
};

export default defineConfig(({ mode }) => {
  // Load environment variables from process.cwd() using Vite's loadEnv helper
  const env = loadEnv(mode, process.cwd(), '');

  const UPLOAD_PASSWORD = env.UPLOAD_PASSWORD || "adnan2026walk";

  // Configure Cloudinary
  const isCloudinaryConfigured = env.CLOUDINARY_CLOUD_NAME && 
                                env.CLOUDINARY_API_KEY && 
                                env.CLOUDINARY_API_SECRET;

  if (isCloudinaryConfigured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET
    });
    console.log("[API] Cloudinary configured successfully using environment variables.");
  } else {
    console.log("[API] Cloudinary credentials missing in .env. Running in local sandbox upload mode.");
  }

  // Configure Supabase Client
  const isSupabaseConfigured = env.SUPABASE_URL && env.SUPABASE_KEY;
  let supabase = null;

  if (isSupabaseConfigured) {
    // Prefer the service role: RLS on adnan_walk_media denies delete to anon,
    // and a denied delete is reported as a success that removed nothing.
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY);
    console.log("[API] Supabase client initialized successfully.");
  } else {
    console.log("[API] Supabase credentials missing. Falling back to local database.json.");
  }

  return {
    server: {
      port: 3000,
      open: true
    },
    plugins: [
      {
        name: 'adnan-walk-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // 1. GET /api/media - List all uploaded media files
            if (req.url === '/api/media' && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              try {
                if (isSupabaseConfigured) {
                  const { data, error } = await supabase
                    .from('adnan_walk_media')
                    .select('*')
                    .order('timestamp', { ascending: false });

                  if (error) {
                    if (error.code === '42P01' || error.message.includes('relation "adnan_walk_media" does not exist')) {
                      res.statusCode = 200;
                      res.end(JSON.stringify([{
                        id: "setup_required",
                        url: "",
                        title: "Supabase Tablosu Eksik",
                        type: "image",
                        location: "Supabase Ayarı",
                        description: "Lütfen Supabase panelinizdeki SQL Editor alanına giderek size gönderdiğim SQL scriptini çalıştırın.",
                        timestamp: new Date().toISOString()
                      }]));
                      return;
                    }
                    throw error;
                  }
                  res.end(JSON.stringify(data));
                } else {
                  const db = getDatabase();
                  res.end(JSON.stringify(db.media));
                }
              } catch (err) {
                console.error("[API] Media fetch failed:", err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Veritabanı okuma hatası oluştu." }));
              }
              return;
            }

            // 1B. POST /api/sign - Issue a Cloudinary signature for direct browser upload
            if (req.url === '/api/sign' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const { password } = JSON.parse(body);

                  if (password !== UPLOAD_PASSWORD) {
                    res.statusCode = 401;
                    res.end(JSON.stringify({ error: "Yanlış şifre! Yükleme yetkiniz yok." }));
                    return;
                  }

                  if (!isCloudinaryConfigured) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: "Cloudinary yapılandırılmamış, doğrudan yükleme kullanılamaz." }));
                    return;
                  }

                  const timestamp = Math.round(Date.now() / 1000);
                  const paramsToSign = { folder: 'adnan_walk', timestamp };
                  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    cloudName: env.CLOUDINARY_CLOUD_NAME,
                    apiKey: env.CLOUDINARY_API_KEY,
                    timestamp,
                    folder: paramsToSign.folder,
                    signature
                  }));
                } catch (err) {
                  console.error("[API] Sign failed:", err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: "İmza oluşturulamadı." }));
                }
              });
              return;
            }

            // 2. POST /api/upload - Secured Cloudinary/local upload
            if (req.url === '/api/upload' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const {
                    password, fileData, fileName, fileType, title, location, description,
                    secureUrl, publicId: uploadedPublicId
                  } = JSON.parse(body);

                  // Check password securely
                  if (password !== UPLOAD_PASSWORD) {
                    res.statusCode = 401;
                    res.end(JSON.stringify({ error: "Yanlış şifre! Yükleme yetkiniz yok." }));
                    return;
                  }

                  // The browser may have uploaded straight to Cloudinary already,
                  // in which case only the resulting URL arrives here.
                  const isDirectUpload = Boolean(secureUrl && uploadedPublicId);

                  if (!isDirectUpload && (!fileData || !fileName || !fileType)) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: "Geçersiz dosya verisi." }));
                    return;
                  }

                  let mediaUrl = '';
                  let publicId = '';

                  // Handle file upload
                  if (isDirectUpload) {
                    mediaUrl = secureUrl;
                    publicId = uploadedPublicId;
                    console.log("[API] Direct browser upload recorded:", mediaUrl);
                  } else if (isCloudinaryConfigured) {
                    // Upload to Cloudinary
                    const result = await cloudinary.uploader.upload(fileData, {
                      resource_type: fileType.startsWith('video/') ? 'video' : 'image',
                      folder: 'adnan_walk',
                      quality: 'auto',
                      fetch_format: 'auto'
                    });
                    mediaUrl = result.secure_url;
                    publicId = result.public_id;
                    console.log("[API] File uploaded to Cloudinary:", mediaUrl);
                  } else {
                    // Local Sandbox Mode
                    const uploadsDir = path.resolve('public', 'uploads');
                    if (!fs.existsSync(uploadsDir)) {
                      fs.mkdirSync(uploadsDir, { recursive: true });
                    }

                    // Strip data URI prefix if present
                    const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
                    const fileBuffer = Buffer.from(base64Data, 'base64');
                    const finalFileName = `${Date.now()}_${fileName}`;
                    const filePath = path.join(uploadsDir, finalFileName);

                    fs.writeFileSync(filePath, fileBuffer);
                    mediaUrl = `/uploads/${finalFileName}`;
                    publicId = `local_${Date.now()}`;
                    console.log("[API] File saved locally in sandbox mode:", mediaUrl);
                  }

                  // Update database
                  const db = getDatabase();
                  const newMedia = {
                    id: publicId,
                    url: mediaUrl,
                    title: title || fileName || "İsimsiz",
                    type: (fileType || '').startsWith('video/') ? 'video' : 'image',
                    location: location || "",
                    description: description || "",
                    timestamp: new Date().toISOString()
                  };

                  if (isSupabaseConfigured) {
                    const { error } = await supabase
                      .from('adnan_walk_media')
                      .insert([newMedia]);
                    
                    if (error) throw error;
                    console.log("[API] Saved metadata to Supabase:", newMedia.id);
                  } else {
                    const db = getDatabase();
                    db.media.unshift(newMedia);
                    saveDatabase(db);
                    console.log("[API] Saved metadata to database.json:", newMedia.id);
                  }

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, item: newMedia }));

                } catch (err) {
                  console.error("[API] Upload failed:", err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: "Yükleme sırasında sunucu hatası oluştu." }));
                }
              });
              return;
            }

            // 3. POST /api/delete - Delete media securely
            if (req.url === '/api/delete' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const { password, id } = JSON.parse(body);

                  // Check password securely
                  if (password !== UPLOAD_PASSWORD) {
                    res.statusCode = 401;
                    res.end(JSON.stringify({ error: "Yanlış şifre! Silme yetkiniz yok." }));
                    return;
                  }

                  if (!id) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: "Medya ID belirtilmedi." }));
                    return;
                  }

                  let itemType = 'image';
                  let itemUrl = '';

                  // Get item type and URL first
                  if (isSupabaseConfigured) {
                    const { data, error } = await supabase
                      .from('adnan_walk_media')
                      .select('*')
                      .eq('id', id)
                      .maybeSingle();
                    
                    if (error) throw error;
                    if (data) {
                      itemType = data.type;
                      itemUrl = data.url;
                    }
                  } else {
                    const db = getDatabase();
                    const item = db.media.find(m => m.id === id);
                    if (item) {
                      itemType = item.type;
                      itemUrl = item.url;
                    }
                  }

                  // Delete from Cloudinary / Local uploads
                  if (isCloudinaryConfigured && !id.startsWith('local_')) {
                    const resType = itemType === 'video' ? 'video' : 'image';
                    await cloudinary.uploader.destroy(id, { resource_type: resType });
                    console.log("[API] Deleted file from Cloudinary:", id);
                  } else {
                    if (itemUrl && itemUrl.startsWith('/uploads/')) {
                      const localPath = path.join('public', itemUrl);
                      if (fs.existsSync(localPath)) {
                        fs.unlinkSync(localPath);
                        console.log("[API] Deleted local file:", localPath);
                      }
                    }
                  }

                  // Delete from Database. Requesting the removed rows back is what
                  // exposes an RLS-blocked delete: PostgREST answers 200 with an
                  // empty result instead of an error when policy denies it.
                  if (isSupabaseConfigured) {
                    const { data: deletedRows, error } = await supabase
                      .from('adnan_walk_media')
                      .delete()
                      .eq('id', id)
                      .select();

                    if (error) throw error;

                    if (!deletedRows || deletedRows.length === 0) {
                      console.error("[API] Delete affected zero rows for id:", id,
                        "- SUPABASE_SERVICE_KEY is probably missing, so RLS blocked it.");
                      res.statusCode = 500;
                      res.end(JSON.stringify({ error: "Medya silinemedi: sunucuda SUPABASE_SERVICE_KEY tanımlı değil, veritabanı silme iznini reddediyor." }));
                      return;
                    }
                    console.log("[API] Deleted row from Supabase:", id);
                  } else {
                    const db = getDatabase();
                    db.media = db.media.filter(m => m.id !== id);
                    saveDatabase(db);
                    console.log("[API] Deleted entry from database.json:", id);
                  }

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));

                } catch (err) {
                  console.error("[API] Deletion failed:", err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: "Silme sırasında sunucu hatası oluştu." }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ]
  };
});
