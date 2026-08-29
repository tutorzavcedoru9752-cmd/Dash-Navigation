import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-e5a5bd76/health", (c) => {
  return c.json({ status: "ok" });
});

// Fetch favicon and convert to base64
app.post("/make-server-e5a5bd76/fetch-favicon", async (c) => {
  try {
    const { url } = await c.req.json();

    if (!url) {
      return c.json({ success: false, error: "URL is required" }, 400);
    }

    // Extract domain from URL
    const domain = new URL(url).hostname;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    // Fetch the favicon
    const response = await fetch(faviconUrl);
    if (!response.ok) {
      return c.json({ success: false, error: "Failed to fetch favicon" }, 500);
    }

    // Convert to base64 in chunks to avoid stack overflow on large images
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const dataUrl = `data:image/png;base64,${btoa(binary)}`;

    return c.json({ success: true, faviconData: dataUrl });
  } catch (error) {
    console.log("Error fetching favicon:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve({
  onError: (error: unknown) => {
    // Swallow broken-pipe errors — client disconnected before response was fully written
    const code = (error as any)?.code;
    const name = (error as any)?.name;
    if (code === "EPIPE" || name === "Http") {
      return new Response(null, { status: 499 });
    }
    console.error("Unhandled server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
}, app.fetch);
