import { useState } from "react"
// 1. ייבוא פונקציית ה-AI שלנו מהקובץ שיצרנו
import { summarizeWithGemini } from "./api/gemini" 

function IndexPopup() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [unreadMessages, setUnreadMessages] = useState<Record<string, string[]>>({})
  const [hasResults, setHasResults] = useState(false)
  const [totalMessages, setTotalMessages] = useState(0)
  const [copiedMessage, setCopiedMessage] = useState("")
  const [conversationSummary, setConversationSummary] = useState("")
  const [mainMessages, setMainMessages] = useState<Record<string, string>>({})

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

      // שליחת הודעה ל-Handler (ה-Content Script) בוואטסאפ
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

          // 2. החלק הכי חשוב: קריאה ל-Gemini לביצוע הסיכום האמיתי!
          try {
            const aiSummary = await summarizeWithGemini(response.messages);
            setConversationSummary(aiSummary); // כאן נשמר הסיכום שה-AI יצר
          } catch (aiErr: any) {
            console.error("AI Error:", aiErr);
            setConversationSummary("נכשלנו ביצירת סיכום AI, אבל ההודעות נשלפו בהצלחה.");
          }
          
          // ספירת כמות ההודעות הכוללת
          let count = 0
          Object.values(response.messages).forEach((msgs: string[]) => {
            count += msgs.length
          })
          setTotalMessages(count)
          
          const mainMsgs = getMainMessagePerSender(response.messages)
          setMainMessages(mainMsgs)

        } else {
          setConversationSummary("לא נמצאו הודעות שלא נקראו בצ'אט הזה.")
          setHasResults(true)
          setMainMessages({})
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

  const openWhatsApp = () => {
    chrome.tabs.create({ url: "https://web.whatsapp.com/" })
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessage("הועתק ללוח!");
      setTimeout(() => setCopiedMessage(""), 2000);
    })
  }

  const getMainMessagePerSender = (messages: Record<string, string[]>): Record<string, string> => {
    const mainMessages: Record<string, string> = {}
    Object.entries(messages).forEach(([sender, msgs]) => {
      if (msgs.length > 0) mainMessages[sender] = msgs[0]
    })
    return mainMessages
  }

  const getAllMessagesText = () => {
    let result = "סיכום הודעות וואטסאפ (AI):\n\n" + conversationSummary + "\n\nהודעות מקוריות:\n"
    Object.entries(unreadMessages).forEach(([sender, messages]) => {
      result += `${sender}:\n${messages.map(m => `- ${m}`).join('\n')}\n\n`
    })
    return result
  }

  return (
    <div dir="rtl" style={{ padding: 16, width: 350, fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f2f5', minHeight: '400px', borderRadius: '8px' }}>
      
      <h2 style={{ marginTop: 0, color: '#128C7E', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
         WhatsApp Summarizer
      </h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={handleSummarizeUnread} disabled={isLoading} style={{ flex: 2, padding: '8px 16px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '4px', cursor: isLoading ? 'default' : 'pointer', fontWeight: 'bold' }}>
          {isLoading ? "מסכם..." : "סכם עם Gemini ✨"}
        </button>
        <button onClick={openWhatsApp} style={{ flex: 1, padding: '8px', backgroundColor: '#128C7E', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          וואטסאפ
        </button>
      </div>

      {error && <div style={{ color: 'white', backgroundColor: '#FF5252', padding: '10px', marginBottom: '16px', borderRadius: '4px', textAlign: 'center' }}>{error}</div>}
      
      {hasResults && (
        <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#075E54' }}>✨ סיכום בינה מלאכותית</h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
            {conversationSummary}
          </p>
          <button onClick={() => copyToClipboard(getAllMessagesText())} style={{ marginTop: '10px', backgroundColor: '#075E54', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', width: '100%' }}>
            העתק סיכום מלא
          </button>
        </div>
      )}

      {isLoading && <div style={{ textAlign: 'center', padding: '20px' }}>מעבד נתונים...</div>}
      
      {copiedMessage && <div style={{ color: '#25D366', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>{copiedMessage}</div>}
    </div>
  )
}

export default IndexPopup