function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { documentText } = req.body || {};

    if (!documentText) {
      return res.status(400).json({ error: "Missing documentText" });
    }

    return res.status(200).json({
      documentType: "Test",
      documentRole: "Test",
      whatThisIsDoing: "API is working",
      keyObligations: "None",
      deadlines: "None",
      riskSignals: "None",
      importantTerms: "None",
      missingInfo: "None",
      summary: "Success"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
