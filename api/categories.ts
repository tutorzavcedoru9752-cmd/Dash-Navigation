import { createClient } from "@supabase/supabase-js";

type CategoriesPayload = unknown;

function getClientIp(headers: Record<string, string | string[] | undefined>) {
  const forwardedFor = headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (forwardedValue) {
    return forwardedValue.split(",")[0].trim();
  }

  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

function json(
  res: {
    status: (code: number) => typeof res;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
  },
  statusCode: number,
  body: unknown,
) {
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(
  req: {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: { categories?: CategoriesPayload };
  },
  res: {
    status: (code: number) => typeof res;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
  },
) {
  const ip = getClientIp(req.headers);

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    if (req.method === "GET") {
      return json(res, 200, { categories: null, ip, error: "Supabase not configured" });
    }

    return json(res, 200, { success: false, error: "Supabase not configured" });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("user_categories")
        .select("categories")
        .eq("ip_address", ip)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase select error:", error);
        return json(res, 200, { categories: null, ip, error: "Database error" });
      }

      if (data?.categories) {
        return json(res, 200, { categories: data.categories, ip });
      }

      return json(res, 200, { categories: null, ip });
    } catch (error) {
      console.error(error);
      return json(res, 400, { error: "Internal error" });
    }
  }

  const categories = req.body?.categories;
  if (!categories) {
    return json(res, 400, { error: "Missing categories data" });
  }

  try {
    const { error } = await supabase
      .from("user_categories")
      .upsert({ ip_address: ip, categories }, { onConflict: "ip_address" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return json(res, 200, { success: false, error: "Failed to save categories" });
    }

    return json(res, 200, { success: true, ip });
  } catch (error) {
    console.error(error);
    return json(res, 400, { error: "Internal error" });
  }
}
