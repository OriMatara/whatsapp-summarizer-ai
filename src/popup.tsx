import { useState } from "react"
import { summarizeWithGemini } from "./api/gemini" 

function IndexPopup() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [unreadMessages, setUnreadMessages] = useState<Record<string, string[]>>({})
  const [hasResults, setHasResults] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState("")
  const [conversationSummary, setConversationSummary] = useState("")

  const handleSummarizeUnread = async () => {
    setIsLoading(true)
    setError("")
    setHasResults(false)
    setCopiedMessage("")
    
    try {
      // שליפת הטאב האקטיבי
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      interface MessageResponse {
        success: boolean;
        messages: Record<string, string[]>;
        error: string | null;
      }

      // שליחת הודעה ל-Content Script (השם המדויק שעבד לך)
      const response = await new Promise<MessageResponse>((resolve) => {
        chrome.tabs.sendMessage(tab.id, { name: "GET_UNREAD_MESSAGES" }, (response) => {
          resolve(response || { success: false, error: "No response from content script", messages: {} });
        });
      });
      
      if (response.success) {
        const hasMsgs = Object.keys(response.messages).length > 0
        if (hasMsgs) {
          setUnreadMessages(response.messages)
          setHasResults(true)

          try {
            // ביצוע הסיכום עם ה-AI
            const aiSummary = await summarizeWithGemini(response.messages);
            setConversationSummary(aiSummary);
          } catch (aiErr: any) {
            console.error("AI Error:", aiErr);
            setConversationSummary("נכשלנו ביצירת סיכום AI, אבל ההודעות נשלפו בהצלחה.");
          }
        } else {
          setConversationSummary("לא נמצאו הודעות שלא נקראו בצ'אט הזה.")
          setHasResults(true)
        }
      } else {
        setError(response.error || "נכשלנו בשליפת ההודעות")
      }
    } catch (error) {
      console.error("Communication Error:", error)
      setError("שגיאה: וודא שוואטסאפ ווב פתוח והצ'אט פעיל.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    const text = getAllMessagesText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessage("הועתק!");
      setTimeout(() => setCopiedMessage(""), 2000);
    })
  }

  const getAllMessagesText = () => {
    let result = "סיכום הודעות וואטסאפ (AI):\n\n" + conversationSummary + "\n\nהודעות מקוריות:\n"
    Object.entries(unreadMessages).forEach(([sender, messages]) => {
      result += `${sender}:\n${messages.map(m => `- ${m}`).join('\n')}\n\n`
    })
    return result
  }

  return (
    <div style={{
      width: "350px",
      height: "500px",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f0f2f5",
      fontFamily: "Segoe UI, Tahoma, sans-serif",
      direction: "rtl",
      overflow: "hidden"
    }}>
      
      {/* Header */}
      <header style={{
        backgroundColor: "#00a884",
        color: "white",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 10
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "14px"
        }}>✨</div>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>WhatsApp Summarizer</h2>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
        backgroundSize: "contain"
      }}>
        
        {!hasResults && !isLoading && !error && (
          <div style={{
            textAlign: "center",
            marginTop: "40px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "15px",
            borderRadius: "10px",
            color: "#667781",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
          }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>מוכן לסכם?</p>
            <p style={{ margin: 0, fontSize: "14px" }}>פתח צ'אט עם הודעות חדשות ולחץ על הכפתור למטה.</p>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", marginTop: "20px", backgroundColor: "rgba(255,255,255,0.8)", padding: "15px", borderRadius: "10px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#667781", marginTop: "10px", fontWeight: "bold" }}>מנתח את השיחה...</p>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            border: "1px solid #fecaca",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {hasResults && conversationSummary && (
          <div style={{
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            position: "relative",
            whiteSpace: "pre-wrap",
            fontSize: "14px",
            lineHeight: "1.5",
            color: "#111b21",
            alignSelf: "start",
            maxWidth: "90%",
            marginTop: "10px"
          }}>
            {/* בועת צ'אט - זנב */}
            <div style={{
              position: "absolute",
              top: 0,
              right: "-8px",
              width: "0",
              height: "0",
              borderStyle: "solid",
              borderWidth: "10px 10px 0 0",
              borderColor: "white transparent transparent transparent"
            }}></div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#00a884" }}>✨ סיכום בינה מלאכותית</h3>
            
            {/* השינוי המיוחל: מפעילים את הפונקציה על הטקסט שחזר מה-AI */}
            {renderFormattedSummary(conversationSummary)}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: "16px",
        backgroundColor: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        borderTop: "1px solid #d1d7db"
      }}>
        <button 
          onClick={handleSummarizeUnread}
          disabled={isLoading}
          style={{
            width: "100%",
            backgroundColor: isLoading ? "#ccc" : "#00a884",
            color: "white",
            border: "none",
            padding: "12px",
            borderRadius: "24px",
            fontWeight: "bold",
            cursor: isLoading ? "default" : "pointer",
            fontSize: "15px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
          }}>
          {isLoading ? "מעבד..." : "סכם עם AI"}
        </button>
        
        {hasResults && (
          <button 
            onClick={copyToClipboard}
            style={{
              backgroundColor: "white",
              color: "#54656f",
              border: "1px solid #d1d7db",
              padding: "8px",
              borderRadius: "24px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px"
            }}>
            {copiedMessage || "העתק סיכום מלא"}
          </button>
        )}
      </footer>

      <style>{`
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #00a884;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default IndexPopup

// פונקציה שממירה מרקאון לכותרות ובוליטים מעוצבים
const renderFormattedSummary = (rawText: string) => {
  if (!rawText) return null;
  
  const lines = rawText.split('\n');

  return lines.map((line, index) => {
    const trimmedLine = line.trim();

    // 1. אם השורה מתחילה ומסתיימת ב-** (כותרת מודגשת)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      const headerText = trimmedLine.slice(2, -2);
      return (
        <h3 key={index} style={{ fontWeight: 'bold', marginTop: '14px', marginBottom: '6px', color: '#111b21', fontSize: '16px' }}>
          {headerText}
        </h3>
      );
    }

    // 2. אם השורה מתחילה ב-* (בוליט)
    if (trimmedLine.startsWith('*')) {
      const bulletText = trimmedLine.slice(1).trim();
      return (
        <div key={index} style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0', paddingRight: '8px' }}>
          <span style={{ marginLeft: '6px', color: '#25D366' }}>•</span>
          <span style={{ color: '#3b4a54', fontSize: '14px', lineHeight: '1.4' }}>{bulletText}</span>
        </div>
      );
    }

    // 3. שורה רגילה או ריקה
    return trimmedLine ? (
      <p key={index} style={{ margin: '6px 0', color: '#3b4a54', fontSize: '14px' }}>{trimmedLine}</p>
    ) : (
      <div key={index} style={{ height: '8px' }} />
    );
  });
};