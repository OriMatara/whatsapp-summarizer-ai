const OPENROUTER_KEY = process.env.PLASMO_PUBLIC_OPENROUTER_KEY;

export async function summarizeWithGemini(groupedMessages: Record<string, string[]>) {
  if (!OPENROUTER_KEY) {
    throw new Error("Missing OpenRouter API Key");
  }

  let chatContext = "";
  for (const [sender, texts] of Object.entries(groupedMessages)) {
    chatContext += `${sender}: ${texts.join(" | ")}\n`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "WhatsApp Summarizer Ori"
      },
      body: JSON.stringify({
        "model": "google/gemini-3-flash-preview", 
        "messages": [
          {
            "role": "system",
            "content": `You are an advanced WhatsApp chat summarizer. Your task is to analyze the provided messages and generate a structured summary strictly in Hebrew.

Follow this exact output format using markdown asterisks for bolding:

**תמצית האירועים:**
[Provide a concise overview of the general discussion, main topics, and context of the messages]

**מסר מרכזי לפי משתתף:**

**[שם האדם]**
[המסר המרכזי או הדבר החשוב שהוא אמר/ביקש]

CRITICAL RULES:
1. Format headers strictly with double asterisks, like: **תמצית האירועים:** and **מסר מרכזי לפי משתתף:**
2. For each participant, put their name in double asterisks on its own line: **[שם האדם]** and then the message summary on the line below it. Do NOT use bullet points (*) or colons (:) next to the name.
3. Do NOT use HTML tags like <strong>. Use markdown asterisks ONLY.
4. ONLY include people who actually sent a message within the provided text.
5. Completely REMOVE and do NOT generate sections for "משימות לביצוע" or "פגישות".`
          },
          {
            "role": "user",
            "content": `להלן ההודעות:\n${chatContext}`
          }
        ],
        "temperature": 0.7 
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenRouter API Error Details:", data.error);
      throw new Error(data.error.message || "שגיאה בגישה למודל");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Network or Logic Error:", error);
    throw error;
  }
}