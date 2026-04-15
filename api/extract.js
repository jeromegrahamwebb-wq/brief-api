function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
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
    const { documentText, documentType, jurisdiction, userConcern } = req.body || {};

    const cleanDocumentText = safeText(documentText);
    const cleanDocumentType = safeText(documentType);
    const cleanJurisdiction = safeText(jurisdiction);
    const cleanUserConcern = safeText(userConcern);

    if (!cleanDocumentText) {
      return res.status(400).json({ error: "Missing documentText" });
    }

    const prompt = `
You are a legal document orientation engine.

Your job is to analyze an uploaded legal document and return a structured plain-English orientation report for a non-lawyer reader.

This is an informational document analysis tool.
It is not a legal advice tool.

USER CONTEXT
- User-selected document type: ${cleanDocumentType || "Not provided"}
- User-selected jurisdiction: ${cleanJurisdiction || "Not provided"}
- User concern: ${cleanUserConcern || "Not provided"}

TASKS
Analyze the document and, where relevant, do the following:

1. Document classification
Identify the most likely legal document type.

2. Document role
State the role this document appears to play.
Examples:
- starts a legal process
- makes a demand
- gives notice
- sets obligations
- responds to a dispute
- asks for payment
- sets deadlines

3. What this is doing
Explain in plain English what the document is doing.

4. Key obligations
Identify the main obligations, demands, restrictions, consequences, or requests visible in the text.

5. Deadlines
Identify any exact dates, deadlines, hearing dates, cure periods, response periods, or other time-sensitive references actually visible in the text.

6. Risk signals
Identify language suggesting legal, financial, procedural, or practical risk.

7. Important terms
Identify important clauses, triggers, thresholds, conditions, defined terms, or ambiguous wording that materially affect meaning.

8. Missing info
State what important facts are missing or unclear and why that limits interpretation.

9. Summary
Provide a short plain-English wrap-up.

CRITICAL RULES
- Use plain English for a non-lawyer.
- Do not invent facts.
- Do not invent citations, statutes, rules, or case law.
- Do not claim to have performed legal research.
- Do not recommend a specific legal action.
- Do not tell the user what they should do.
- Do not predict court outcomes.
- Do not say the user is liable, not liable, will win, or will lose.
- Do not provide litigation or negotiation strategy.
- Separate what the document says from what is uncertain.
- If facts are missing, say so directly.
- Be clear where the text is clear.
- Be explicit where the text is incomplete or ambiguous.

RETURN FORMAT
Return valid JSON only.
Do not use markdown.
Do not include any text before or after the JSON.

Use this exact schema:
{
  "documentType": "",
  "documentRole": "",
  "whatThisIsDoing": "",
  "keyObligations": "",
  "deadlines": "",
  "riskSignals": "",
  "importantTerms": "",
  "missingInfo": "",
  "summary": ""
}

DOCUMENT TEXT
"""
${cleanDocumentText}
"""
`;

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
    });

    const raw = (response.output_text || "").trim();

    if (!raw) {
      return res.status(502).json({ error: "Empty model response" });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, raw);
      return res.status(502).json({
        error: "Model returned invalid JSON",
        raw,
      });
    }

    const result = {
      documentType: safeText(parsed.documentType) || "Not clear from the document.",
      documentRole: safeText(parsed.documentRole) || "Not clear from the document.",
      whatThisIsDoing: safeText(parsed.whatThisIsDoing) || "Not clear from the document.",
      keyObligations: safeText(parsed.keyObligations) || "No clear obligations could be identified from the document alone.",
      deadlines: safeText(parsed.deadlines) || "No clear deadline was identified in the document text provided.",
      riskSignals: safeText(parsed.riskSignals) || "No clear risk signal was identified from the document alone.",
      importantTerms: safeText(parsed.importantTerms) || "No specific important term could be identified from the document alone.",
      missingInfo: safeText(parsed.missingInfo) || "No additional missing information was identified beyond the document text provided.",
      summary: safeText(parsed.summary) || "No summary could be generated from the document text provided.",
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error("extract.js error:", error);
    return res.status(500).json({
      error: "Server error",
      details: error?.message || "Unknown error",
    });
  }
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
