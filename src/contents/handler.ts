import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://web.whatsapp.com/*"]
}

console.log('--- [DEBUG] WhatsApp Summarizer: Diagnostic Mode Active ---');

// מבנה הנתונים שלנו
const unreadRegistry: Record<string, number> = {};

/**
 * פונקציה שמנקה שם מאימוג'ים וסימנים מיוחדים לצורך השוואה
 */
function getMatchKey(name: string): string {
  return name
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // תווים שקופים
    .replace(/[^\w\u0590-\u05FF]/g, '')    // השארת רק אותיות (עברית/אנגלית) ומספרים
    .trim();
}

// --- 1. עדכון הרישום ---
function updateUnreadRegistry() {
  const chatRows = document.querySelectorAll('div[role="row"]');
  
  chatRows.forEach(row => {
    const nameEl = row.querySelector('header span[title], span[title]');
    const unreadEl = row.querySelector('span[aria-label*="unread"], span[aria-label*="הודעות"], span[aria-label*="נכנסו"]');
    
    if (nameEl) {
      const rawName = nameEl.getAttribute('title') || nameEl.textContent || "";
      const matchKey = getMatchKey(rawName);
      const count = unreadEl ? parseInt(unreadEl.textContent || "0") : 0;
      
      if (count > 0 && matchKey) {
        if (unreadRegistry[matchKey] !== count) {
          unreadRegistry[matchKey] = count;
          console.log(`[Registry Update] Key: "${matchKey}" (Raw: "${rawName}") | Count: ${count}`);
        }
      }
    }
  });
}

const observer = new MutationObserver(() => updateUnreadRegistry());
observer.observe(document.body, { childList: true, subtree: true });

// --- 2. עיבוד הודעה ---
function processMessageElement(msgElement: HTMLElement, messages: any[], currentContact: string, index: number) {
  const textEl = msgElement.querySelector('.copyable-text, .selectable-text, [data-lexical-text="true"]');
  if (!textEl) return;

  let messageText = textEl.textContent?.trim() || "";
  messageText = messageText.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // ניקוי ה-tail
  messageText = messageText.replace(/^(tail-out|tail-in|tail)/i, '').trim();

  // מחיקת שעה
  messageText = messageText.replace(/\d{1,2}:\d{2}(\s?[AP]M)?$/i, '').trim();

  if (!messageText || /^\d{1,2}:\d{2}$/.test(messageText)) return;

  let sender = currentContact;
  if (msgElement.closest('.message-out')) {
    sender = "את/ה";
  } else {
    const authorEl = msgElement.querySelector('span[dir="auto"].x1jch66q, [data-pre-plain-text]');
    if (authorEl) {
      const rawAuthor = authorEl.getAttribute('data-pre-plain-text') || authorEl.textContent;
      const match = rawAuthor?.match(/\] (.*?):/) || [null, rawAuthor];
      if (match[1]) sender = match[1].trim();
    }
  }

  messages.push({ sender, text: messageText });
}

// --- 3. הפונקציה המרכזית ---
function getUnreadMessages() {
  const result = { success: true, messages: {}, error: null };
  try {
    const main = document.querySelector('#main') as HTMLElement;
    if (!main) throw new Error("Chat not found");

    const headerTitleEl = main.querySelector('header span[title], header div[role="button"] span');
    let rawHeaderTitle = headerTitleEl?.getAttribute('title') || headerTitleEl?.textContent || "";
    
    const headerKey = getMatchKey(rawHeaderTitle);
    console.log(`[LOG 1] Active Chat Key: "${headerKey}" (Raw: "${rawHeaderTitle}")`);

    const container = (main.querySelector('div[style*="overflow-y: scroll"]') || 
                      main.querySelector('.copyable-area > div:last-child')) as HTMLElement;

    const messages: any[] = [];
    const allBubbles = Array.from(container.querySelectorAll('[data-id]'));
    console.log(`[LOG 2] Total bubbles found in container: ${allBubbles.length}`);

    const registryCount = unreadRegistry[headerKey] || 0;
    console.log(`[LOG 3] Registry count for this chat: ${registryCount}`);

    // חיפוש מפריד
    let separator: HTMLElement | null = null;
    const allSpans = container.querySelectorAll('span, div');
    
    // לוג לבדיקה מה הקוד רואה במפרידים
    for (const el of Array.from(allSpans)) {
      const t = el.textContent?.trim();
      if (t === "הודעות שלא נקראו" || t === "Unread messages") {
        separator = el as HTMLElement;
        console.log(`[LOG 4] Found separator element with text: "${t}"`);
        break;
      }
    }

    if (separator) {
      console.log(`[LOG 5] Entering Route A: Separator Found`);
      const unreadBubbles = allBubbles.filter(b => separator!.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      console.log(`[LOG 5a] Bubbles following separator: ${unreadBubbles.length}`);
      unreadBubbles.forEach((b, i) => processMessageElement(b as HTMLElement, messages, rawHeaderTitle, i));
    } 
    else if (registryCount > 0) {
      console.log(`[LOG 6] Entering Route B: Registry Count Found (${registryCount})`);
      allBubbles.slice(-registryCount).forEach((b, i) => processMessageElement(b as HTMLElement, messages, rawHeaderTitle, i));
      unreadRegistry[headerKey] = 0;
    } 
    else {
      console.log(`[LOG 7] Entering Route C: Fallback (No separator, No registry). Slicing 10.`);
      allBubbles.slice(-10).forEach((b, i) => processMessageElement(b as HTMLElement, messages, rawHeaderTitle, i));
    }

    const grouped: any = {};
    messages.forEach(msg => {
      if (!grouped[msg.sender]) grouped[msg.sender] = [];
      grouped[msg.sender].push(msg.text);
    });
    result.messages = grouped;

  } catch (e: any) {
    result.success = false;
    result.error = e.message;
    console.error(`[LOG ERROR] ${e.message}`);
  }
  return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.name === "GET_UNREAD_MESSAGES") {
    sendResponse(getUnreadMessages());
  }
  return true;
});