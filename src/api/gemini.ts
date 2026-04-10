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
        // השם המדויק מהרשימה שלך
        "model": "google/gemini-3-flash-preview", 
        "messages": [
          {
            "role": "system",
            "content": "אתה עוזר חכם ומיומן. סכם את הודעות הוואטסאפ הבאות בעברית. תן דגש על פגישות, משימות לביצוע ותמצית האירועים."
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