export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: "Missing server environment variables",
      required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"],
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/alarmas-seguimiento`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: "{}",
    });

    const rawBody = await response.text();
    let parsedBody = null;

    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      parsedBody = { raw: rawBody };
    }

    return res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      upstream: parsedBody,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to trigger alarmas-seguimiento",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
