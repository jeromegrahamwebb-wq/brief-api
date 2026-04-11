export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { document } = req.body;

    if (!document) {
      return res.status(400).json({ error: "Missing document text" });
    }

    // 🔹 Your OpenAI logic goes here
    return res.status(200).json({
      success: true,
      message: "Document received",
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
