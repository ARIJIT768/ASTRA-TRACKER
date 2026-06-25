import { useState, useEffect } from 'react';

// Use the permanent Vercel backend URL to guarantee connection
const API_URL = 'https://astra-tracker-mu.vercel.app/api';

type Member = {
  id: number;
  name: string;
  score_threshold: number;
  total_score: number;
  has_pin: number;
};

type Log = {
  id: number;
  member_id: number;
  member_name: string;
  description: string;
  hours: number;
  task_score: number;
  time_score: number;
  total_score: number;
  timestamp: string;
};

type Reminder = {
  id: number;
  member_id: number;
  member_name: string;
  message: string;
  timestamp: string;
};

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [globalLogs, setGlobalLogs] = useState<Log[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team'>('dashboard');
  
  // Login State
  const [loggedInMember, setLoggedInMember] = useState<Member | null>(null);
  const [loginId, setLoginId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch only members list initially for the login dropdown
  useEffect(() => {
    fetch(`${API_URL}/members`)
      .then(res => res.json())
      .then(data => setMembers(data))
      .catch(err => console.error("Failed to load members", err));
  }, []);

  const fetchDashboardData = async (memberId: number) => {
    try {
      const [membersRes, logsRes, remRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/members`),
        fetch(`${API_URL}/logs/${memberId}`),
        fetch(`${API_URL}/reminders/${memberId}`),
        fetch(`${API_URL}/activity`)
      ]);
      
      const allMembers = await membersRes.json();
      setMembers(allMembers);
      
      // Update logged in member's fresh score
      const freshMemberData = allMembers.find((m: Member) => m.id === memberId);
      if (freshMemberData) setLoggedInMember(freshMemberData);

      setLogs(await logsRes.json());
      setReminders(await remRes.json());
      setGlobalLogs(await activityRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  useEffect(() => {
    if (!loggedInMember) return;
    
    fetchDashboardData(loggedInMember.id);
    const interval = setInterval(() => fetchDashboardData(loggedInMember.id), 30000);
    return () => clearInterval(interval);
  }, [loggedInMember?.id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !pin) return;
    
    const selectedMember = members.find(m => m.id === Number(loginId));
    if (!selectedMember) return;
    
    setLoading(true);
    setLoginError('');
    try {
      const endpoint = selectedMember.has_pin === 1 ? '/login' : '/set-pin';
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: Number(loginId), pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoggedInMember(data.member);
        setPin('');
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInMember(null);
    setLogs([]);
    setReminders([]);
  };

  const markReminderRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/reminders/${id}/read`, { method: 'POST' });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to mark reminder read");
    }
  };

  if (!loggedInMember) {
    const selectedMember = members.find(m => m.id === Number(loginId));
    const isSettingPin = selectedMember && selectedMember.has_pin === 0;

    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="panel glass" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>ASTRA Login</h2>
          {loginError && <div className="reminder-item" style={{ marginBottom: '1rem' }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Select Your Profile</label>
              <select value={loginId} onChange={(e) => { setLoginId(e.target.value); setPin(''); }} required>
                <option value="" disabled>Choose your name</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            
            {loginId && (
              <div className="form-group">
                <label style={{ color: isSettingPin ? 'var(--accent-primary)' : 'inherit' }}>
                  {isSettingPin ? 'Setup Your New PIN' : 'Enter Your PIN'}
                </label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  placeholder={isSettingPin ? "Create a 4+ digit PIN" : "Enter PIN"} 
                  required 
                />
                {isSettingPin && <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>You will use this PIN for all future logins.</small>}
              </div>
            )}
            
            <button type="submit" disabled={loading || !loginId}>
              {loading ? <div className="spinner"></div> : (isSettingPin ? 'Save PIN & Login' : 'Access Dashboard')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>ASTRA Tracker</h1>
        <div className="glass" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <span style={{ color: 'var(--success)', fontWeight: '500' }}>{loggedInMember.name}</span>
           <button onClick={handleLogout} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto', background: 'transparent', border: '1px solid var(--border-color)' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', padding: '0 1rem' }}>
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')} 
        >
          My Dashboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')} 
        >
          Team Activity
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>Your Current Score</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>
                <div style={{ fontSize: '4.5rem', fontWeight: '800', fontFamily: 'Outfit', color: loggedInMember.total_score >= loggedInMember.score_threshold ? 'var(--success)' : 'var(--danger)', textShadow: `0 0 20px ${loggedInMember.total_score >= loggedInMember.score_threshold ? 'rgba(0,255,136,0.3)' : 'rgba(255,0,85,0.3)'}` }}>
                  {loggedInMember.total_score}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', fontWeight: '500' }}>Target Goal: {loggedInMember.score_threshold} points</p>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ 
                      width: `${Math.min(100, (loggedInMember.total_score / loggedInMember.score_threshold) * 100)}%`, 
                      background: loggedInMember.total_score >= loggedInMember.score_threshold ? 'var(--success)' : 'var(--accent-primary)',
                      boxShadow: `0 0 10px ${loggedInMember.total_score >= loggedInMember.score_threshold ? 'var(--success)' : 'var(--accent-primary)'}`
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel glass animate-stagger-2">
              <h2>Your Recent Activity</h2>
              <div className="logs-list">
                {logs.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No recent activity tracked yet.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="log-item">
                      <div className="log-header">
                        <span className="log-name" style={{ color: 'var(--text-primary)' }}>{log.description}</span>
                        <span className="log-time" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="log-scores" style={{ marginTop: '0.5rem' }}>
                        <span className="badge">⏱️ {log.hours}h</span>
                        <span className="badge">🤖 Bot Task Score: {log.task_score}/10</span>
                        <span className="badge" style={{ color: 'var(--success)' }}>Earned: +{log.total_score} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sidebar">
            {reminders.length > 0 && (
              <div className="panel glass animate-stagger-3" style={{ borderColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255,0,85,0.1)' }}>
                <h2>⚠️ Action Required</h2>
                {reminders.map(rem => (
                  <div key={rem.id} className="reminder-item">
                    <div className="reminder-message">{rem.message}</div>
                    <button 
                      onClick={() => markReminderRead(rem.id)}
                      className="primary-btn"
                      style={{ marginTop: '0.8rem', padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="panel glass animate-stagger-4">
              <h2>Tracking Status</h2>
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div className="spinner" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', borderTopColor: 'var(--accent-primary)', marginBottom: '1rem' }}></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Activity tracking is <strong>fully automated</strong> by your background agent.
                  <br /><br />
                  Ensure your desktop agent is running to get credited for your work!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="dashboard-grid">
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>Global Team Activity</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Live feed of what everyone is working on right now.</p>
              <div className="logs-list">
                {globalLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No global activity tracked yet.</p>
                ) : (
                  globalLogs.map(log => (
                    <div key={log.id} className="log-item">
                      <div className="log-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{log.member_name}</span>
                          <span className="log-name" style={{ color: 'var(--text-primary)' }}>{log.description}</span>
                        </div>
                        <span className="log-time" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="log-scores" style={{ marginTop: '0.5rem' }}>
                        <span className="badge">⏱️ {log.hours}h</span>
                        <span className="badge">🤖 Bot Task Score: {log.task_score}/10</span>
                        <span className="badge success-badge">Earned: +{log.total_score} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sidebar">
            <div className="panel glass animate-stagger-2">
              <h2>🏆 Leaderboard</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[...members].sort((a, b) => b.total_score - a.total_score).map((m, idx) => (
                  <div key={m.id} className={`leaderboard-item ${m.id === loggedInMember.id ? 'highlight' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : ''}`}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontWeight: m.id === loggedInMember.id ? 'bold' : '500', color: m.id === loggedInMember.id ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: 'Outfit' }}>
                        {m.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: '800', fontFamily: 'Outfit', color: m.total_score >= m.score_threshold ? 'var(--success)' : 'var(--text-primary)' }}>
                      {m.total_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
