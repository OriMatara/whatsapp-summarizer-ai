import { useState } from "react"



function IndexPopup() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [unreadMessages, setUnreadMessages] = useState<Record<string, string[]>>({})
  const [hasResults, setHasResults] = useState(false)
  const [totalMessages, setTotalMessages] = useState(0)
  const [copiedMessage, setCopiedMessage] = useState("")
  const [conversationSummary, setConversationSummary] = useState("")
  const [mainMessages, setMainMessages] = useState<Record<string, string>>({})

  /**
   * Fetch unread messages from the active WhatsApp tab
   */
  const handleSummarizeUnread = async () => {
    setIsLoading(true)
    setError("")
    setHasResults(false)
    setCopiedMessage("")
    
    try {
      // Get the active tab and log its details
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Targeting Tab:', tab.id, 'URL:', tab.url);

      // Use native chrome messaging instead of Plasmo wrapper
      // Define the response type
      interface MessageResponse {
        success: boolean;
        messages: Record<string, string[]>;
        error: string | null;
      }

      const response = await new Promise<MessageResponse>((resolve) => {
        chrome.tabs.sendMessage(tab.id, { name: "GET_UNREAD_MESSAGES" }, (response) => {
          resolve(response || { success: false, error: "No response from content script", messages: {} });
        });
      });
      
      if (response.success) {
        setUnreadMessages(response.messages)
        const hasMsgs = Object.keys(response.messages).length > 0
        setHasResults(hasMsgs)
        
        // Count the total number of messages
        let count = 0
        if (hasMsgs) {
          Object.values(response.messages).forEach((msgs: string[]) => {
            count += msgs.length
          })
          
          // Generate a conversation summary
          const summary = generateConversationSummary(response.messages)
          setConversationSummary(summary)
          
          // Extract main messages from each participant
          const mainMsgs = getMainMessagePerSender(response.messages)
          setMainMessages(mainMsgs)
        } else {
          // No messages found
          setConversationSummary("No unread messages found in the active chat.")
          setMainMessages({})
        }
        setTotalMessages(count)
      } else {
        setError(response.error || "Failed to get unread messages")
      }
    } catch (error) {
      console.error("Error communicating with content script:", error)
      setError("Error communicating with WhatsApp. Make sure you have WhatsApp Web open.")
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Open WhatsApp Web in a new tab
   */
  const openWhatsApp = () => {
    chrome.tabs.create({ url: "https://web.whatsapp.com/" })
  }
  
  /**
   * Copy messages to clipboard
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessage("Copied to clipboard!")
      setTimeout(() => setCopiedMessage(""), 2000)
    })
  }

  /**
   * Generate a summary of the conversation based on unread messages
   */
  const generateConversationSummary = (messages: Record<string, string[]>): string => {
    const participants = Object.keys(messages)
    
    if (participants.length === 0) {
      return "No unread messages found."
    }
    
    // Count total messages
    let totalMsgCount = 0
    Object.values(messages).forEach(msgs => {
      totalMsgCount += msgs.length
    })
    
    if (participants.length === 1) {
      // Single participant
      const sender = participants[0]
      const messageCount = messages[sender].length
      return `You have ${messageCount} unread message${messageCount > 1 ? 's' : ''} from ${sender}.`
    } else {
      // Multiple participants
      return `You have ${totalMsgCount} unread messages from ${participants.length} participants: ${participants.join(", ")}.`
    }
  }

  /**
   * Extract the most important/primary message from each sender
   */
  const getMainMessagePerSender = (messages: Record<string, string[]>): Record<string, string> => {
    const mainMessages: Record<string, string> = {}
    
    Object.entries(messages).forEach(([sender, msgs]) => {
      // Simple approach: use the first message as the "main" message
      // This could be improved with NLP to find the most significant message
      if (msgs.length > 0) {
        mainMessages[sender] = msgs[0]
      }
    })
    
    return mainMessages
  }
  
  /**
   * Format all messages into a single text for copying
   */
  const getAllMessagesText = () => {
    let result = "WhatsApp Unread Messages Summary:\n\n"
    result += conversationSummary + "\n\n"
    result += "Main Messages:\n"
    
    Object.entries(mainMessages).forEach(([sender, message]) => {
      result += `${sender}: ${message}\n`
    })
    
    result += "\nAll Messages:\n"
    
    Object.entries(unreadMessages).forEach(([sender, messages]) => {
      result += `${sender}:\n`
      messages.forEach((message) => {
        result += `- ${message}\n`
      })
      result += "\n"
    })
    
    return result
  }

  return (
    <div style={{
      padding: 16,
      width: 350,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f2f5', // WhatsApp bg color
      minHeight: '400px',
      borderRadius: '8px'
    }}>
      <h2 style={{ 
        marginTop: 0, 
        color: '#128C7E', // WhatsApp teal
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
        </svg>
        WhatsApp Summarizer
      </h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={handleSummarizeUnread}
          disabled={isLoading}
          style={{
            flex: 2,
            padding: '8px 16px',
            backgroundColor: '#25D366', // WhatsApp green
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'default' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          }}>
          {isLoading ? "Summarizing..." : "Summarize Unread Messages"}
        </button>
        
        <button
          onClick={openWhatsApp}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#128C7E',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          }}>
          Open WhatsApp
        </button>
      </div>
      
      {error && (
        <div style={{ 
          color: 'white',
          backgroundColor: '#FF5252', 
          padding: '10px',
          marginBottom: '16px', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      {copiedMessage && (
        <div style={{ 
          color: 'white',
          backgroundColor: '#25D366', 
          padding: '10px',
          marginBottom: '16px', 
          borderRadius: '4px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {copiedMessage}
        </div>
      )}
      
      {hasResults ? (
        <div>
          {/* Conversation Summary Section */}
          <div style={{ 
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#075E54',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{ marginRight: '6px' }}>✨</span> Conversation Summary
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              {conversationSummary}
            </p>
          </div>
          
          {/* Main Messages Section */}
          <div style={{ 
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#075E54',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '6px' }}>📌</span> Main Messages
            </h3>
            {Object.entries(mainMessages).map(([sender, message]) => (
              <div key={`main-${sender}`} style={{ 
                marginBottom: '8px',
                padding: '6px 10px',
                backgroundColor: '#f0f2f5',
                borderRadius: '6px'
              }}>
                <div style={{ 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '2px'
                }}>
                  {sender}
                </div>
                <div style={{ 
                  fontSize: '14px',
                }}>
                  {message}
                </div>
              </div>
            ))}
          </div>
          
          {/* All Messages Section Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px'
          }}>
            <h3 style={{ margin: 0 }}>
              All Unread Messages <span style={{ color: '#25D366' }}>({totalMessages})</span>
            </h3>
            <button
              onClick={() => copyToClipboard(getAllMessagesText())}
              style={{
                backgroundColor: '#075E54',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Copy All
            </button>
          </div>
          
          {/* All Messages List */}
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            {Object.entries(unreadMessages).map(([sender, messages]) => (
              <div key={sender} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #E8E8E8'
                }}>
                  <span>{sender} <span style={{ color: 'gray', fontSize: '13px' }}>({messages.length})</span></span>
                  <button
                    onClick={() => copyToClipboard(`${sender}:\n${messages.join('\n')}`)}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#128C7E',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Copy
                  </button>
                </div>
                <ul style={{ 
                  margin: '8px 0', 
                  paddingLeft: '20px',
                  fontSize: '14px',
                  color: '#303030'
                }}>
                  {messages.map((message, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : !error && !isLoading && (
        <div style={{ 
          color: '#555',
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          margin: '10px 0 20px 0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>💬</div>
          Click the button to summarize unread messages in your active chat.
        </div>
      )}
      
      {isLoading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          padding: '30px 0'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px',
            border: '4px solid rgba(18, 140, 126, 0.2)',
            borderTop: '4px solid #128C7E',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      <div style={{ 
        fontSize: '12px', 
        marginTop: '16px', 
        color: '#666', 
        textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: '8px',
        borderRadius: '4px'
      }}>
        Make sure you have WhatsApp Web open with unread messages.
      </div>
    </div>
  )
}

export default IndexPopup