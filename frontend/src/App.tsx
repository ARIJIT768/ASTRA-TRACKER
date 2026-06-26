import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { SiBrave, SiGooglechrome, SiDiscord, SiSlack, SiFigma, SiYoutube, SiGithub } from 'react-icons/si';
import { FaGamepad, FaTerminal } from 'react-icons/fa';
import { VscVscode } from 'react-icons/vsc';
import { MdWorkOutline } from 'react-icons/md';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

const API_URL = 'https://astra-tracker-mu.vercel.app/api';

type Member = {
  id: number;
  name: string;
  weekly_target_hours: number;
  current_week_hours: number;
  carryover_deficit: number;
  has_pin: number;
};

type Log = {
  id: number;
  member_id: number;
  member_name: string;
  description: string;
  hours: number;
  timestamp: string;
};

type Reminder = {
  id: number;
  member_id: number;
  member_name: string;
  message: string;
  timestamp: string;
};

const getAppIcon = (appName: string) => {
  const lower = appName.toLowerCase();
  if (lower.includes('brave')) return <SiBrave size={24} color="#FF4724" />;
  if (lower.includes('code') || lower.includes('vscode')) return <VscVscode size={24} color="#007ACC" />;
  if (lower.includes('chrome')) return <SiGooglechrome size={24} color="#4285F4" />;
  if (lower.includes('discord')) return <SiDiscord size={24} color="#5865F2" />;
  if (lower.includes('slack')) return <SiSlack size={24} color="#4A154B" />;
  if (lower.includes('figma')) return <SiFigma size={24} color="#F24E1E" />;
  if (lower.includes('youtube')) return <SiYoutube size={24} color="#FF0000" />;
  if (lower.includes('github')) return <SiGithub size={24} color="#FFFFFF" />;
  if (lower.includes('game')) return <FaGamepad size={24} color="#FF00AA" />;
  if (lower.includes('terminal') || lower.includes('cmd') || lower.includes('powershell')) return <FaTerminal size={24} color="#00FF88" />;
  return <MdWorkOutline size={24} color="#00F0FF" />;
};

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team'>('dashboard');
  
  const [loggedInMember, setLoggedInMember] = useState<Member | null>(() => {
    const saved = localStorage.getItem('astra_user');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (parsed.current_week_hours === undefined) {
           localStorage.removeItem('astra_user');
           return null;
        }
        return parsed;
      } catch (e) { return null; }
    }
    return null;
  });
  const [loginId, setLoginId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/members`)
      .then(res => res.json())
      .then(data => setMembers(data))
      .catch(err => console.error('Failed to load members', err));
  }, []);

  const fetchDashboardData = async (memberId: number) => {
    try {
      const [membersRes, logsRes, remRes] = await Promise.all([
        fetch(`${API_URL}/members`),
        fetch(`${API_URL}/logs/${memberId}`),
        fetch(`${API_URL}/reminders/${memberId}`)
      ]);
      
      const allMembers = await membersRes.json();
      setMembers(allMembers);
      
      const freshMemberData = allMembers.find((m: Member) => m.id === memberId);
      if (freshMemberData) setLoggedInMember(freshMemberData);

      setLogs(await logsRes.json());
      setReminders(await remRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    if (!loggedInMember) return;
    fetchDashboardData(loggedInMember.id);
    const interval = setInterval(() => fetchDashboardData(loggedInMember.id), 5000);
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
        localStorage.setItem('astra_user', JSON.stringify(data.member));
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
    localStorage.removeItem('astra_user');
    setLoggedInMember(null);
    setLogs([]);
    setReminders([]);
  };

  const simulateEndOfWeek = async () => {
    if (!window.confirm('Are you sure you want to simulate an End of Week? This will calculate penalties and reset all current hours to 0!')) return;
    try {
      const res = await fetch(`${API_URL}/end-week`, { method: 'POST' });
      if (res.ok) {
        alert('End of week rollover simulated successfully!');
        if (loggedInMember) fetchDashboardData(loggedInMember.id);
      }
    } catch(err) {
      alert('Failed to simulate end of week');
    }
  };

  const appData = logs.reduce((acc: Record<string, { hours: number }>, log) => {
    const appName = log.description.split(' - ')[0] || log.description;
    if (!acc[appName]) acc[appName] = { hours: 0 };
    acc[appName].hours += log.hours;
    return acc;
  }, {});

  const chartLabels = Object.keys(appData);
  const chartColors = ['#00f0ff', '#7000ff', '#ff0055', '#00ff88', '#ffaa00', '#0055ff', '#ff00aa', '#00ffff'];

  const doughnutData = {
    labels: chartLabels,
    datasets: [{
      data: chartLabels.map(app => appData[app].hours),
      backgroundColor: chartColors.slice(0, chartLabels.length),
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
    }],
  };

  const barData = {
    labels: chartLabels,
    datasets: [{
      label: 'Hours Logged',
      data: chartLabels.map(app => appData[app].hours),
      backgroundColor: 'rgba(0, 240, 255, 0.5)',
      borderColor: '#00f0ff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOptions = { responsive: true, plugins: { legend: { labels: { color: '#fff', font: { family: 'Outfit' } } } }, scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };
  const doughnutOptions = { responsive: true, plugins: { legend: { position: 'right' as const, labels: { color: '#fff', font: { family: 'Outfit' } } } } };

  const logsByDate = logs.reduce((acc: Record<string, number>, log) => {
    const date = new Date(log.timestamp).toLocaleDateString();
    acc[date] = (acc[date] || 0) + log.hours;
    return acc;
  }, {});

  const sortedDates = Object.keys(logsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  const lineChartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Hours Logged',
        data: sortedDates.map(date => logsByDate[date]),
        fill: true,
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderColor: '#00f0ff',
        tension: 0.4,
        pointBackgroundColor: '#00f0ff',
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  const markReminderRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/reminders/${id}/read`, { method: 'POST' });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error('Failed to mark reminder read'); }
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
                {members.map(m => <option key={m.id} value={m.id}>[{m.id}] {m.name}</option>)}
              </select>
            </div>
            {loginId && (
              <div className="form-group">
                <label style={{ color: isSettingPin ? 'var(--accent-primary)' : 'inherit' }}>{isSettingPin ? 'Setup Your New PIN' : 'Enter Your PIN'}</label>
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={isSettingPin ? 'Create a 4+ digit PIN' : 'Enter PIN'} required />
                {isSettingPin && <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>You will use this PIN for all future logins.</small>}
              </div>
            )}
            <button type="submit" className="primary-btn" disabled={loading || !loginId}>
              {loading ? <div className="spinner"></div> : (isSettingPin ? 'Save PIN & Login' : 'Access Dashboard')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentHours = loggedInMember.current_week_hours || 0;
  const deficit = loggedInMember.carryover_deficit || 0;
  const targetHours = loggedInMember.weekly_target_hours || 0;
  const totalTarget = targetHours + deficit;
  const progressPercent = totalTarget > 0 ? Math.min(100, (currentHours / totalTarget) * 100) : 0;
  const isSuccess = currentHours >= totalTarget;

  return (
    <div className="app-container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>ASTRA Tracker</h1>
          <button onClick={simulateEndOfWeek} className="primary-btn" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.75rem', padding: '0.3rem 0.8rem', width: 'auto' }}>
            Simulate End of Week
          </button>
        </div>
        <div className="glass" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <span style={{ color: 'var(--success)', fontWeight: '500' }}>{loggedInMember.name}</span>
           <button onClick={handleLogout} className="primary-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', padding: '0 1rem' }}>
        <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>My Dashboard</button>
        <button className={`tab-button ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>Team Activity</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>Your Weekly Progress</h2>
              {deficit > 0 && (
                <div style={{ background: 'rgba(255,0,85,0.1)', color: 'var(--danger)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--danger)', marginBottom: '1rem', fontWeight: 'bold' }}>
                  ⚠️ You have a carryover deficit penalty of {deficit.toFixed(2)} hours from last week!
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>
                <div style={{ fontSize: '4.5rem', fontWeight: '800', fontFamily: 'Outfit', color: isSuccess ? 'var(--success)' : 'var(--text-primary)', textShadow: `0 0 20px ${isSuccess ? 'rgba(0,255,136,0.3)' : 'transparent'}` }}>
                  {currentHours.toFixed(2)}<span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>h</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', fontWeight: '500' }}>Weekly Target Goal: {totalTarget.toFixed(2)} hours</p>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progressPercent}%`, background: isSuccess ? 'var(--success)' : 'var(--accent-primary)', boxShadow: `0 0 10px ${isSuccess ? 'var(--success)' : 'var(--accent-primary)'}` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel glass animate-stagger-2">
              <h2>App Time Breakdown</h2>
              {chartLabels.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No app activity tracked yet.</p>
              ) : (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '300px', height: '300px' }}><Doughnut data={doughnutData} options={doughnutOptions} /></div>
                  <div style={{ flex: 1, minWidth: '300px', height: '300px', display: 'flex', alignItems: 'center' }}><Bar data={barData} options={chartOptions as any} /></div>
                </div>
              )}
            </div>

            <div className="panel glass animate-stagger-3">
              <h2>App Monitor Activity</h2>
              <div style={{ height: '200px', marginBottom: '2rem', marginTop: '1rem' }}>
                {sortedDates.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No activity data for chart.</p>
                ) : (
                  <Line data={lineChartData} options={lineChartOptions as any} />
                )}
              </div>

              <div className="logs-list">
                {logs.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No recent activity tracked yet.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="log-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div className="app-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        {getAppIcon(log.description.split(' - ')[0] || log.description)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="log-header" style={{ marginBottom: '0.2rem' }}>
                          <span className="log-name" style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{log.description}</span>
                        </div>
                        <div className="log-time" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="log-scores">
                        <span className="badge" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                          {log.hours.toFixed(2)}h
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sidebar">
            {reminders.length > 0 && (
              <div className="panel glass animate-stagger-4" style={{ borderColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255,0,85,0.1)' }}>
                <h2>⚠️ Action Required</h2>
                {reminders.map(rem => (
                  <div key={rem.id} className="reminder-item">
                    <div className="reminder-message">{rem.message}</div>
                    <button onClick={() => markReminderRead(rem.id)} className="primary-btn" style={{ marginTop: '0.8rem', padding: '0.5rem', fontSize: '0.85rem' }}>Acknowledge</button>
                  </div>
                ))}
              </div>
            )}

            <div className="panel glass animate-stagger-5">
              <h2>ASTRA Agent</h2>
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <a href="/ASTRA_Tracker.exe" download className="primary-btn" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
                  📥 Download Windows Tracker
                </a>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Activity tracking is <strong>fully automated</strong>.<br /><br />
                  Download the standalone `.exe` agent, log in with your PIN, and leave it running to hit your weekly quota!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>Global Team Progress</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Summary of total weekly hours and quota progress for all members.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[...members].sort((a, b) => (b.current_week_hours || 0) - (a.current_week_hours || 0)).map((m, idx) => {
                  const target = (m.weekly_target_hours || 0) + (m.carryover_deficit || 0);
                  const currentHours = m.current_week_hours || 0;
                  const percent = target > 0 ? Math.min(100, (currentHours / target) * 100) : 0;
                  const isSuccess = currentHours >= target;
                  
                  return (
                    <div key={m.id} className="panel glass" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: loggedInMember && m.id === loggedInMember.id ? '1px solid var(--accent-primary)' : '' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : ''}`}>#{idx + 1}</span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: loggedInMember && m.id === loggedInMember.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '1.2rem', color: isSuccess ? 'var(--success)' : 'var(--text-primary)' }}>
                          {currentHours.toFixed(2)}h
                        </span>
                      </div>
                      
                      <div className="progress-container" style={{ height: '6px', marginBottom: '0.8rem' }}>
                        <div className="progress-bar" style={{ width: `${percent}%`, background: isSuccess ? 'var(--success)' : 'var(--accent-primary)' }}></div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>Target: {target.toFixed(2)}h</span>
                        {(m.carryover_deficit || 0) > 0 && <span style={{ color: 'var(--danger)' }}>Penalty: {(m.carryover_deficit || 0).toFixed(2)}h</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
