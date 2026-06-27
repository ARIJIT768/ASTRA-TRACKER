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
  // Decrypted values (local only)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    try {
      const key = await deriveKey(password);
      setCryptoKey(key);
      setIsUnlocked(true);
    } catch (e) {
      alert("Failed to setup encryption keys.");
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
        if (attachment.size > 3000000) { // 3MB limit for DB
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
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '600px', margin: '0 auto' }}>
        <div className="panel glass animate-stagger-1" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h2>🔒 Secure Company Chat</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            This chat is <strong>End-to-End Encrypted (E2EE)</strong>. Messages and files are encrypted locally in your browser before hitting the database. Vercel and Supabase cannot read them.
          </p>
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              placeholder="Enter shared company secret key..." 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', fontSize: '1.2rem', padding: '1rem' }}
              required
            />
            <button type="submit" className="primary-btn" style={{ width: '100%' }}>Unlock Secure Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', height: 'calc(100vh - 200px)' }}>
      <div className="panel glass" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--success)' }}>●</span> Secure Company Chat
          </h3>
          <button onClick={() => { setIsUnlocked(false); setCryptoKey(null); }} className="primary-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}>
             Lock Chat
          </button>
        </div>

        {/* Message Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.3)' }}>
          {messages.map((msg, idx) => {
            const isMe = msg.member_id === loggedInMember.id;
            return (
              <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', minWidth: '200px' }}>
                {!isMe && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{msg.member_name}</div>}
                <div style={{ 
                  background: isMe ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  borderBottomRightRadius: isMe ? '2px' : '12px',
                  borderBottomLeftRadius: !isMe ? '2px' : '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  {msg.decryptionFailed ? (
                     <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>[Encrypted Message]</span>
                  ) : (
                     <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.decryptedContent}</span>
                  )}
                  
                  {msg.decryptedFileData && (
                    <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {msg.file_type?.startsWith('image/') && (
                        <img src={msg.decryptedFileData} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                      )}
                      {msg.file_type?.startsWith('video/') && (
                        <video src={msg.decryptedFileData} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                      )}
                      {!msg.file_type?.startsWith('image/') && !msg.file_type?.startsWith('video/') && (
                        <a href={msg.decryptedFileData} download={msg.file_name || 'document'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isMe ? '#fff' : 'var(--accent-primary)', textDecoration: 'none', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '6px' }}>
                          📄 {msg.file_name}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
          {attachment && (
            <div style={{ marginBottom: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>
              📎 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
              <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
            </div>
          )}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              📎
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={e => setAttachment(e.target.files?.[0] || null)}
            />
            <input 
              type="text" 
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Type an encrypted message..."
              style={{ flex: 1, borderRadius: '24px', padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.05)' }}
            />
            <button type="submit" disabled={isSending} className="primary-btn" style={{ borderRadius: '24px', padding: '0.8rem 1.5rem' }}>
              {isSending ? 'Encrypting...' : 'Send'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
