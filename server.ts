import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// We use service role key to bypass RLS since we authenticate by IP 
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Needed to accurately get client IP behind reverse proxy (Cloud Run)
  app.set('trust proxy', true);
  app.use(express.json());

  // API Routes
  const apiRouter = express.Router();

  apiRouter.get("/categories", async (req, res) => {
    const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString();
    const deviceId = (req.headers['x-device-id'] || req.query.deviceId || ip).toString();
    
    if (!supabase) {
      return res.json({ categories: null, deviceId, ip, error: "Supabase not configured" });
    }

    try {
      // 1. Query by device ID first
      let { data, error } = await supabase
        .from('user_categories')
        .select('categories')
        .eq('ip_address', deviceId)
        .maybeSingle();
      
      // 2. If not found by deviceId and deviceId is different from ip, try finding by IP for backward compatibility
      if (!data?.categories && deviceId !== ip) {
        const ipQuery = await supabase
          .from('user_categories')
          .select('categories')
          .eq('ip_address', ip)
          .maybeSingle();
        if (ipQuery.data?.categories) {
          data = ipQuery.data;
        }
      }

      if (error) {
        console.warn(`[Supabase GET warning] Unable to fetch user categories:`, error.message || error);
        return res.json({ categories: null, deviceId, ip, error: error.message || "Database query failed" });
      }

      if (data && data.categories) {
        return res.json({ categories: data.categories, deviceId, ip });
      } else {
        return res.json({ categories: null, deviceId, ip });
      }
    } catch (err: any) {
      console.warn(`[Supabase GET catch]`, err?.message || err);
      return res.json({ categories: null, deviceId, ip, error: err?.message || "Internal error" });
    }
  });

  apiRouter.post("/categories", async (req, res) => {
    const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString();
    const deviceId = (req.headers['x-device-id'] || req.body?.deviceId || req.query.deviceId || ip).toString();
    const { categories } = req.body;

    if (!categories) {
      return res.status(400).json({ error: "Missing categories data" });
    }

    if (!supabase) {
      return res.json({ success: false, deviceId, error: "Supabase not configured" });
    }

    try {
      const { error } = await supabase
        .from('user_categories')
        .upsert(
          { ip_address: deviceId, categories },
          { onConflict: 'ip_address' }
        );

      if (error) {
        console.warn(`[Supabase POST warning] Unable to save user categories:`, error.message || error);
        return res.json({ success: false, deviceId, error: error.message || "Failed to save categories" });
      }

      return res.json({ success: true, deviceId, ip });
    } catch (err: any) {
      console.warn(`[Supabase POST catch]`, err?.message || err);
      return res.json({ success: false, deviceId, error: err?.message || "Internal error" });
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: __dirname is not available natively in ESM, but esbuild bundling with --platform=node shim might work, 
    // or we can use process.cwd()
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
