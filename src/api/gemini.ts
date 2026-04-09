const GEMINI_API_KEY = "הכנס_כאן_את_המפתח_שלך";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function summarizeWithGemini(groupedMessages: Record<string, string[]>) {
  // 1. הפיכת המבנה שלנו לטקסט אחד ארוך שהמודל יבין
  let chatContext = "";
  for (const [sender, texts] of Object.entries(groupedMessages)) {
    chatContext += `${sender}: ${texts.join(" | ")}\n`;
  }

  // 2. בניית ה-Prompt (ההוראות ל-AI)
  const prompt = `
    אתה עוזר אישי חכם. לפניך הודעות אחרונות מצ'אט בוואטסאפ.
    המטרה שלך: לסכם את עיקרי הדברים בצורה תמציתית, ברורה ונעימה בעברית.
    
    חוקים:
    - אם יש סיכום על פגישה, זמן או מקום - ציין זאת בבירור.
    - אם יש משימות לביצוע - רשום אותן בבולטים.
    - אל תמציא פרטים שלא קיימים.
    - שמור על טון ענייני.

    הצ'אט:
    ${chatContext}
    
    סיכום:
  `;

  // 3. שליחה ל-API
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("נכשלנו בחיבור ל-Gemini. בדוק את החיבור או את ה-API Key.");
  }
}