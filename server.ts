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
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    if (!supabase) {
      return res.json({ categories: null, ip, error: "Supabase not configured" });
    }

    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('categories')
        .eq('ip_address', ip)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        console.error("Supabase select error:", error);
        return res.json({ categories: null, ip, error: "Database error" });
      }

      if (data && data.categories) {
        return res.json({ categories: data.categories, ip });
      } else {
        return res.json({ categories: null, ip });
      }
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Internal error" });
    }
  });

  apiRouter.post("/categories", async (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const { categories } = req.body;

    if (!categories) {
      return res.status(400).json({ error: "Missing categories data" });
    }

    if (!supabase) {
      return res.json({ success: false, error: "Supabase not configured" });
    }

    try {
      const { error } = await supabase
        .from('user_categories')
        .upsert(
          { ip_address: ip, categories },
          { onConflict: 'ip_address' }
        );

      if (error) {
        console.error("Supabase upsert error:", error);
        return res.json({ success: false, error: "Failed to save categories" });
      }

      res.json({ success: true, ip });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Internal error" });
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
