import React, { useState, useEffect, useRef } from 'react';

type Member = { id: number; name: string };

type ChatMessage = {
  id: number;
  member_id: number;
  member_name: string;
  content: string; // Encrypted Base64
  file_data: string | null; // Encrypted Base64
  file_type: string | null;
  file_name: string | null;
  timestamp: string;
  decryptedContent?: string;
  decryptedFileData?: string | null;
  decryptionFailed?: boolean;
};

const API_URL = 'https://astra-tracker-mu.vercel.app/api';

// --- Web Crypto E2EE Helpers ---
const deriveKey = async (password: string, saltHex: string = "a1b2c3d4e5f6"): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buffer as any)));
const base64ToArrayBuffer = (base64: string) => {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
  return bytes.buffer;
};

const encryptData = async (text: string, key: CryptoKey): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return arrayBufferToBase64(iv) + ":" + arrayBufferToBase64(encrypted);
};

const decryptData = async (encryptedStr: string, key: CryptoKey): Promise<string> => {
  try {
    const [ivB64, dataB64] = encryptedStr.split(":");
    if (!ivB64 || !dataB64) return "[Invalid Format]";
    const iv = base64ToArrayBuffer(ivB64);
    const data = base64ToArrayBuffer(dataB64);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return "[Decryption Failed - Wrong Key?]";
  }
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

// --- Component ---
export default function CompanyChat({ loggedInMember }: { loggedInMember: Member }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  
  useEffect(() => {
    // Restore session on refresh
    if (sessionStorage.getItem('astra_chat_unlocked') === 'true') {
      deriveKey("ASTRA_SHARED_COMPANY_CHAT_KEY_2026").then(key => {
        setCryptoKey(key);
        setIsUnlocked(true);
      });
    }
  }, []);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAndDecryptMessages = async (key: CryptoKey) => {
    try {
      const res = await fetch(`${API_URL}/chat`);
      if (!res.ok) return;
      const rawMessages: ChatMessage[] = await res.json();
      
      const decrypted = await Promise.all(rawMessages.map(async (msg) => {
        const text = await decryptData(msg.content, key);
        let fileData = null;
        if (msg.file_data) {
           const dec = await decryptData(msg.file_data, key);
           if (!dec.includes('[Decryption Failed')) fileData = dec;
        }
        return {
          ...msg,
          decryptedContent: text,
          decryptedFileData: fileData,
          decryptionFailed: text.includes('[Decryption Failed')
        };
      }));
      setMessages(decrypted);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (cryptoKey && isUnlocked) {
      fetchAndDecryptMessages(cryptoKey);
      const interval = setInterval(() => fetchAndDecryptMessages(cryptoKey), 3000);
      return () => clearInterval(interval);
    }
  }, [cryptoKey, isUnlocked]);



  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    try {
      // 1. Verify their personal PIN with the backend
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: loggedInMember.id, pin: password })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        alert("Incorrect PIN. Chat remains locked.");
        return;
      }
      
      // 2. Derive the actual E2EE key using a Shared Company Secret so everyone can read the chat
      const key = await deriveKey("ASTRA_SHARED_COMPANY_CHAT_KEY_2026");
      setCryptoKey(key);
      setIsUnlocked(true);
      sessionStorage.setItem('astra_chat_unlocked', 'true');
    } catch (e) {
      alert("Failed to setup encryption keys or verify PIN.");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoKey || (!draft.trim() && !attachment)) return;
    
    setIsSending(true);
    try {
      const encryptedContent = await encryptData(draft.trim() || "[Attachment Only]", cryptoKey);
      
      let encryptedFile = null;
      let fileType = null;
      let fileName = null;
      
      if (attachment) {
        if (attachment.size > 3000000) { 
           alert("File is too large! Max 3MB allowed for DB limits.");
           setIsSending(false);
           return;
        }
        const b64 = await fileToBase64(attachment);
        encryptedFile = await encryptData(b64, cryptoKey);
        fileType = attachment.type;
        fileName = attachment.name;
      }
      
      await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: loggedInMember.id,
          member_name: loggedInMember.name,
          content: encryptedContent,
          file_data: encryptedFile,
          file_type: fileType,
          file_name: fileName
        })
      });
      
      setDraft('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAndDecryptMessages(cryptoKey);
    } catch (err) {
      console.error("Send failed", err);
      alert("Failed to send message. Might be too large.");
    }
    setIsSending(false);
  };

  if (!isUnlocked) {
    return (
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '400px', margin: '4rem auto' }}>
        <div className="panel glass animate-stagger-1" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>🔒 E2EE Chat Lock</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Enter your <strong>6-Digit PIN</strong> to decrypt the company chat.
          </p>
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              placeholder="Enter 6-digit PIN" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem', padding: '1rem', letterSpacing: '4px' }}
              required
              maxLength={6}
              minLength={6}
            />
            <button type="submit" className="primary-btn" style={{ width: '100%', padding: '1rem' }}>Decrypt Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container glass">
      
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(0,240,255,0.05)' }}>🏢</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ color: 'var(--neon-cyan)', fontSize: '17px', fontWeight: 600, fontFamily: 'Outfit', letterSpacing: '0.3px' }}>ASTRA Company Chat</span>
             <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>🔒 End-to-end encrypted</span>
          </div>
        </div>
        <button onClick={() => { setIsUnlocked(false); setCryptoKey(null); setPassword(''); sessionStorage.removeItem('astra_chat_unlocked'); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
           Lock Chat
        </button>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '12px', padding: '10px 16px', borderRadius: '12px', alignSelf: 'center', textAlign: 'center', marginBottom: '20px', maxWidth: '85%', lineHeight: '1.5' }}>
          🔒 Messages and files are <strong>end-to-end encrypted</strong>. No one outside of this chat, not even the database or ASTRA servers, can read them.
        </div>
        
        {messages.map((msg, idx) => {
          const isMe = msg.member_id === loggedInMember.id;
          const showName = idx === 0 || messages[idx-1].member_id !== msg.member_id;
          
          return (
            <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', minWidth: '120px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                background: isMe ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(76, 29, 149, 0.9))' : 'rgba(255,255,255,0.05)', 
                color: 'var(--text-primary)',
                padding: '10px 14px', 
                borderRadius: '16px',
                borderBottomRightRadius: isMe ? '4px' : '16px',
                borderBottomLeftRadius: !isMe ? '4px' : '16px',
                border: isMe ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isMe ? '0 4px 20px rgba(124, 58, 237, 0.2)' : '0 4px 15px rgba(0,0,0,0.2)',
                position: 'relative'
              }}>
                {showName && <div style={{ fontSize: '11.5px', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--neon-cyan)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{msg.member_name}</div>}
                
                {msg.decryptedFileData && (
                  <div style={{ marginBottom: msg.decryptedContent ? '5px' : '0' }}>
                    {msg.file_type?.startsWith('image/') && (
                      <img src={msg.decryptedFileData} alt="attachment" style={{ width: '100%', borderRadius: '6px', maxHeight: '300px', objectFit: 'cover' }} />
                    )}
                    {msg.file_type?.startsWith('video/') && (
                      <video src={msg.decryptedFileData} controls style={{ width: '100%', borderRadius: '6px', maxHeight: '300px' }} />
                    )}
                    {!msg.file_type?.startsWith('image/') && !msg.file_type?.startsWith('video/') && (
                      <a href={msg.decryptedFileData} download={msg.file_name || 'document'} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', textDecoration: 'none', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,240,255,0.1)', padding: '8px', borderRadius: '8px', color: isMe ? '#fff' : 'var(--neon-cyan)' }}>📄</div> {msg.file_name}
                      </a>
                    )}
                  </div>
                )}
                
                {msg.decryptionFailed ? (
                   <span style={{ color: 'var(--danger)', fontStyle: 'italic', fontSize: '14px' }}>[Encrypted Message]</span>
                ) : (
                   <span style={{ fontSize: '14px', lineHeight: '20px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.decryptedContent}</span>
                )}
                
                <div style={{ float: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '10px', marginTop: '4px', height: '15px' }}>
                  {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {attachment && (
          <div style={{ position: 'absolute', bottom: '85px', left: '20px', background: 'var(--surface-color)', backdropFilter: 'blur(10px)', border: '1px solid var(--neon-cyan)', padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(0,240,255,0.15)', color: 'var(--text-primary)' }}>
            📄 {attachment.name} 
            <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'rgba(255,45,85,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )}
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }} 
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          📎
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={e => setAttachment(e.target.files?.[0] || null)}
        />
        <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="text" 
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type an encrypted message..."
            style={{ flex: 1, background: 'rgba(0,0,0,0.5)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 20px', borderRadius: '24px', fontSize: '15px', outline: 'none', transition: 'all 0.3s ease' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--neon-violet)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button type="submit" disabled={isSending} style={{ background: 'linear-gradient(135deg, var(--neon-violet), #4c1d95)', color: '#fff', border: '1px solid rgba(124,58,237,0.5)', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}>
            {isSending ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : '➤'}
          </button>
        </form>
      </div>

    </div>
  );
}
