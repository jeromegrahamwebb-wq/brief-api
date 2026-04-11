import OpenAI from "openai";
// redeploy trigger
export default async function handler(req, res) {
  // ✅ CORS (critical)
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
    const { documentText, documentType, jurisdiction, userConcern } = req.body || {};

    if (!documentText || typeof documentText !== "string") {
      return res.status(400).json({ error: "Missing documentText" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
You are generating a document orientation report for a legal information tool.
This is general legal information only, not legal advice.

Return valid JSON with exactly these keys:
- document_type_and_role
- what_this_document_is_doing
- key_obligations_or_demands
- deadlines_or_time_sensitivity
- risk_signals_or_pressure_points
- important_terms_or_clauses
- missing_or_unstated_information
- practical_orientation_summary

Rules:
- Be neutral
- Do not give legal advice
- Do not predict outcomes
- Do not invent facts
`;

    const userMessage = `
Document type: ${documentType || "Unknown"}
Jurisdiction: ${jurisdiction || "Unknown"}
User concern: ${userConcern || "None provided"}

Document text:
${documentText}
`;

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ]
    });

    return res.status(200).json({
      result: response.output_text
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Analysis failed"
    });
  }
}
