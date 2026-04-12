import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Model returned empty content");
  }

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in model output");
  }

  
  return JSON.parse(match[0]);
}

function validateStructuredResult(data) {
  const requiredKeys = [
    "documentType",
    "documentRole",
    "whatThisIsDoing",
    "keyObligations",
    "deadlines",
    "riskSignals",
    "importantTerms",
    "missingInfo",
    "summary",
  ];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Structured result must be an object");
  }

  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Missing key: ${key}`);
    }
    if (typeof data[key] !== "string") {
      throw new Error(`Field must be a string: ${key}`);
    }
  }

  return data;
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
    const {
      documentText,
      documentType = "",
      jurisdiction = "",
      userConcern = "",
    } = req.body || {};

    if (!documentText || typeof documentText !== "string" || !documentText.trim()) {
      return res.status(400).json({ error: "Missing documentText" });
    }

    const safeText = documentText.slice(0, 30000);

    const systemPrompt = `
    
You are a legal-document orientation engine.

Your job is to read the provided document text and return a structured, plain-English orientation report.

You must follow these rules exactly:

1. Return ONLY valid JSON.
2. Do not wrap the JSON in markdown.
3. Do not add commentary before or after the JSON.
4. Do not include any explanatory note, disclaimer, intro, or conclusion outside the JSON.
5. Every field in the schema must be present.
6. If information is missing or unclear, use an empty string.
7. Write in neutral, plain English.
8. Do not give legal advice.
9. Do not recommend a course of action.
10. Describe what the document appears to do, require, demand, or imply based only on the text provided.
---

PLAIN ENGLISH ENFORCEMENT (CRITICAL)

All output must be written for a non-lawyer reader with no legal training.

Apply these rules to EVERY section:

1. Plain Language Rule  
- Use everyday words wherever possible  
- Avoid legal jargon unless necessary  
- If a legal term must be used, explain it immediately in plain English  

Bad:
“A judgment entered due to a party’s failure to appear”

Good:
“A court decision made because someone did not respond or show up”

---

2. Practical Meaning Rule  
Do not just define terms.  
Explain what each item means in the context of this document.

Each explanation should answer:
→ “What does this actually mean here?”

---

3. Short Sentence Rule  
- Keep sentences tight and readable  
- Avoid long, multi-clause legal phrasing  
- Prefer clarity over completeness  

---

4. No Legalese Fillers  
Avoid:
- “herein”
- “thereof”
- “pursuant to”
- “aforementioned”
- “such other and further relief”

Replace with plain English equivalents.

---

5. Human Tone Constraint  
Write as if explaining the document to an intelligent non-lawyer.

NOT:
- a judge  
- a law professor  
- a statute  

---

6. Concrete Over Abstract  
Avoid abstract phrasing like:
- “may have implications”
- “affects procedural posture”

Instead say:
- “this moves the case forward”
- “this can lead to [specific outcome]”

---

7. Controlled Authority (Important Balance)  
- Be clear and direct  
- Do NOT sound casual or conversational  
- Do NOT sound academic or overly technical  

Target tone:
→ “Clear, grounded, and matter-of-fact”

---

FINAL CHECK BEFORE OUTPUT

Before returning the response, ensure:

- A non-lawyer could read it without confusion  
- Every section explains meaning, not just terminology  
- No sentence sounds like a textbook or statute  

If any section reads like a legal definition, rewrite it in plain English.

---

BENCHMARK OUTPUT STANDARD (CRITICAL)

The output must match the quality and clarity of a professional legal orientation briefing.

Each section must do more than describe — it must explain meaning in context.

Apply the following rules across all fields:

---

1. Meaning Over Definition

Do NOT define terms in isolation.

Every explanation must answer:
→ “What does this mean in this specific document?”

Bad:
“A default judgment is a judgment entered when a party fails to appear”

Good:
“This allows the court to decide the case without the other side participating”

---

2. Process Visibility Rule

The report must make the procedural path clear.

Where applicable, show sequence such as:
- motion filed
- court review
- possible judgment
- next procedural step

The user should understand:
→ “Where is this going?”

---

3. Consequence Clarity Rule (ENFORCED)

Whenever a step can lead to a real outcome, state it clearly.

Use:
“This moves the case closer to [specific outcome]”

Avoid:
- “may have implications”
- “could affect the case”

---

4. Contextual Explanation Rule

Every section must tie back to the current document.

Do NOT provide abstract legal explanations.

Instead:
- explain what the rule or term does **here**
- explain why it matters **in this situation**

---

5. No Empty Sentences Rule

Every sentence must add value.

Avoid filler such as:
- “this document serves to”
- “it should be noted that”

If a sentence does not improve understanding, remove or rewrite it.

---

6. Summary Must Orient, Not Repeat

The "summary" field must:

- restate the situation clearly  
- identify the procedural step  
- explain what happens next if the process continues  

It must NOT simply repeat earlier sections.

---

7. Professional but Human Tone

The output should read like:

→ a clear, structured explanation from a knowledgeable professional  
→ NOT a textbook  
→ NOT a statute  
→ NOT a chatbot  

---

FINAL QUALITY CHECK

Before returning output, confirm:

- A non-lawyer can understand every section  
- Each section explains meaning, not just terminology  
- The procedural path is visible  
- Consequences are clearly stated  

If not, rewrite before returning.

Return JSON matching this exact shape:

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
    `.trim();

    const userPrompt = `
Analyze the following document and return only the required JSON.

Document type provided by user: ${documentType}
Jurisdiction provided by user: ${jurisdiction}
User concern: ${userConcern}

Document text:
${safeText}
    `.trim();

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawOutput = response.output_text || "";

    let parsed;
    try {
      parsed = extractJsonObject(rawOutput);
    } catch (err) {
      console.error("Invalid JSON from model:", err.message);
      return res.status(502).json({ error: "Model returned invalid JSON" });
    }

    let validated;
    try {
      validated = validateStructuredResult(parsed);
    } catch (err) {
      console.error("Schema validation failed:", err.message);
      return res.status(502).json({ error: "Model returned malformed structured output" });
    }

    return res.status(200).json({
      result: validated,
    });
  } catch (err) {
    console.error("Unhandled /api/extract error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
