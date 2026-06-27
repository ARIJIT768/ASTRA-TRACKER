import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  SiBrave, SiGooglechrome, SiDiscord, SiSlack, SiFigma, SiYoutube, SiGithub,
  SiOllama, SiOpenai, SiNotion, SiSpotify, SiPostman, SiDocker, SiFirefoxbrowser, 
  SiObsidian, SiZoom, SiAndroidstudio, SiIntellijidea, SiWebstorm, SiCanva, SiTelegram, SiClaude,
  SiXcode, SiVlcmediaplayer, SiVim, SiUnrealengine, SiUnity, SiTrello, SiSteam, SiSignal, 
  SiSafari, SiPycharm, SiOpera, SiNeovim, SiMessenger, SiLinear, SiKubernetes, SiJupyter, 
  SiJira, SiEvernote, SiEpicgames, SiBlender, SiAsana
} from 'react-icons/si';
import { FaGamepad, FaTerminal, FaWhatsapp, FaSpaceShuttle, FaWindows } from 'react-icons/fa';
import { VscVscode } from 'react-icons/vsc';
import { MdWorkOutline } from 'react-icons/md';
import CompanyChat from './components/CompanyChat';

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, Title, PointElement, LineElement, Filler);

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

const getParentAppName = (description: string) => {
  const lower = description.toLowerCase();
  
  // Custom / OS
  if (lower.includes('antigravity')) return 'Antigravity';
  if (lower.includes('astra')) return 'ASTRA Tracker';
  
  // Communication
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('telegram')) return 'Telegram';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('slack')) return 'Slack';
  if (lower.includes('zoom')) return 'Zoom';
  if (lower.includes('signal')) return 'Signal';
  if (lower.includes('messenger')) return 'Messenger';
  
  // AI
  if (lower.includes('ollama')) return 'Ollama';
  if (lower.includes('chatgpt') || lower.includes('openai')) return 'ChatGPT';
  if (lower.includes('claude')) return 'Claude';
  
  // Browsers
  if (lower.includes('brave')) return 'Brave';
  if (lower.includes('chrome')) return 'Chrome';
  if (lower.includes('firefox')) return 'Firefox';
  if (lower.includes('safari')) return 'Safari';
  if (lower.includes('opera')) return 'Opera';
  
  // Design & Creative
  if (lower.includes('figma')) return 'Figma';
  if (lower.includes('canva')) return 'Canva';
  if (lower.includes('blender')) return 'Blender';
  if (lower.includes('unity')) return 'Unity';
  if (lower.includes('unreal')) return 'Unreal Engine';
  
  // Productivity
  if (lower.includes('notion')) return 'Notion';
  if (lower.includes('obsidian')) return 'Obsidian';
  if (lower.includes('evernote')) return 'Evernote';
  if (lower.includes('trello')) return 'Trello';
  if (lower.includes('jira')) return 'Jira';
  if (lower.includes('asana')) return 'Asana';
  if (lower.includes('linear')) return 'Linear';
  
  // Media & Gaming
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('vlc')) return 'VLC';
  if (lower.includes('steam')) return 'Steam';
  if (lower.includes('epic games')) return 'Epic Games';
  
  // Dev & Engineering
  if (lower.includes('github')) return 'GitHub';
  if (lower.includes('postman')) return 'Postman';
  if (lower.includes('docker')) return 'Docker';
  if (lower.includes('kubernetes')) return 'Kubernetes';
  
  // IDEs & Code
  if (lower.includes('android studio')) return 'Android Studio';
  if (lower.includes('intellij')) return 'IntelliJ IDEA';
  if (lower.includes('webstorm')) return 'WebStorm';
  if (lower.includes('pycharm')) return 'PyCharm';
  if (lower.includes('xcode')) return 'Xcode';
  if (lower.includes('neovim')) return 'Neovim';
  if (lower.includes('vim') && !lower.includes('vimeo')) return 'Vim';
  if (lower.includes('jupyter')) return 'Jupyter';
  if (lower.includes('code') || lower.includes('vscode') || lower.includes('.tsx') || lower.includes('.ts') || lower.includes('.js')) return 'VS Code';
  
  if (lower.includes('terminal') || lower.includes('cmd') || lower.includes('powershell')) return 'Terminal';
  if (lower.includes('explorer') || lower.includes('.exe')) return 'Windows OS';
  
  const parts = description.split(' - ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : description.trim();
};

const getAppIcon = (appName: string) => {
  const lower = appName.toLowerCase();
  
  // Communication
  if (lower.includes('whatsapp')) return <FaWhatsapp size={24} color="#25D366" />;
  if (lower.includes('telegram')) return <SiTelegram size={24} color="#26A5E4" />;
  if (lower.includes('discord')) return <SiDiscord size={24} color="#5865F2" />;
  if (lower.includes('slack')) return <SiSlack size={24} color="#4A154B" />;
  if (lower.includes('zoom')) return <SiZoom size={24} color="#2D8CFF" />;
  if (lower.includes('signal')) return <SiSignal size={24} color="#3A76F0" />;
  if (lower.includes('messenger')) return <SiMessenger size={24} color="#00B2FF" />;
  
  // AI
  if (lower.includes('ollama')) return <SiOllama size={24} color="#FFFFFF" />;
  if (lower.includes('chatgpt')) return <SiOpenai size={24} color="#10A37F" />;
  if (lower.includes('claude')) return <SiClaude size={24} color="#D97757" />;
  
  // Browsers
  if (lower.includes('brave')) return <SiBrave size={24} color="#FF4724" />;
  if (lower.includes('chrome')) return <SiGooglechrome size={24} color="#4285F4" />;
  if (lower.includes('firefox')) return <SiFirefoxbrowser size={24} color="#FF7139" />;
  if (lower.includes('safari')) return <SiSafari size={24} color="#000000" />;
  if (lower.includes('opera')) return <SiOpera size={24} color="#FF1B2D" />;
  
  // Design & Creative
  if (lower.includes('figma')) return <SiFigma size={24} color="#F24E1E" />;
  if (lower.includes('canva')) return <SiCanva size={24} color="#00C4CC" />;
  if (lower.includes('blender')) return <SiBlender size={24} color="#F5792A" />;
  if (lower.includes('unity')) return <SiUnity size={24} color="#FFFFFF" />;
  if (lower.includes('unreal')) return <SiUnrealengine size={24} color="#FFFFFF" />;
  
  // Productivity
  if (lower.includes('notion')) return <SiNotion size={24} color="#FFFFFF" />;
  if (lower.includes('obsidian')) return <SiObsidian size={24} color="#7A3EE8" />;
  if (lower.includes('evernote')) return <SiEvernote size={24} color="#00A82D" />;
  if (lower.includes('trello')) return <SiTrello size={24} color="#0052CC" />;
  if (lower.includes('jira')) return <SiJira size={24} color="#0052CC" />;
  if (lower.includes('asana')) return <SiAsana size={24} color="#273347" />;
  if (lower.includes('linear')) return <SiLinear size={24} color="#5E6AD2" />;
  
  // Media & Gaming
  if (lower.includes('spotify')) return <SiSpotify size={24} color="#1DB954" />;
  if (lower.includes('youtube')) return <SiYoutube size={24} color="#FF0000" />;
  if (lower.includes('vlc')) return <SiVlcmediaplayer size={24} color="#FF8800" />;
  if (lower.includes('steam')) return <SiSteam size={24} color="#000000" />;
  if (lower.includes('epic games')) return <SiEpicgames size={24} color="#313131" />;
  
  // Dev & Engineering
  if (lower.includes('github')) return <SiGithub size={24} color="#FFFFFF" />;
  if (lower.includes('postman')) return <SiPostman size={24} color="#FF6C37" />;
  if (lower.includes('docker')) return <SiDocker size={24} color="#2496ED" />;
  if (lower.includes('kubernetes')) return <SiKubernetes size={24} color="#326CE5" />;
  
  // IDEs & Code
  if (lower.includes('android studio')) return <SiAndroidstudio size={24} color="#3DDC84" />;
  if (lower.includes('intellij')) return <SiIntellijidea size={24} color="#000000" />;
  if (lower.includes('webstorm')) return <SiWebstorm size={24} color="#000000" />;
  if (lower.includes('pycharm')) return <SiPycharm size={24} color="#000000" />;
  if (lower.includes('xcode')) return <SiXcode size={24} color="#1575F9" />;
  if (lower.includes('neovim')) return <SiNeovim size={24} color="#57A143" />;
  if (lower.includes('vim') && !lower.includes('vimeo')) return <SiVim size={24} color="#019733" />;
  if (lower.includes('jupyter')) return <SiJupyter size={24} color="#F37626" />;
  if (lower.includes('code') || lower.includes('vscode')) return <VscVscode size={24} color="#007ACC" />;
  
  // Custom / System
  if (lower.includes('antigravity')) return <FaSpaceShuttle size={24} color="#9900FF" />;
  if (lower.includes('game')) return <FaGamepad size={24} color="#FF00AA" />;
  if (lower.includes('terminal') || lower.includes('cmd') || lower.includes('powershell')) return <FaTerminal size={24} color="#00FF88" />;
  if (lower.includes('windows')) return <FaWindows size={24} color="#00A4EF" />;
  
  return <MdWorkOutline size={24} color="#00F0FF" />;
};

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<{ daily: number, weekly: number, monthly: number, yearly: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'chat'>('dashboard');
  
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
      const [membersRes, logsRes, remRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/members`),
        fetch(`${API_URL}/logs/${memberId}`),
        fetch(`${API_URL}/reminders/${memberId}`),
        fetch(`${API_URL}/stats/${memberId}`)
      ]);
      
      const allMembers = await membersRes.json();
      setMembers(allMembers);
      
      const freshMemberData = allMembers.find((m: Member) => m.id === memberId);
      if (freshMemberData) setLoggedInMember(freshMemberData);

      setLogs(await logsRes.json());
      setReminders(await remRes.json());
      setStats(await statsRes.json());
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

  const handleResetServer = async () => {
    const passcode = window.prompt("Admin action required: Enter 6-digit passcode to reset server.");
    if (passcode) {
      try {
        const res = await fetch(`${API_URL}/reset-server`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Server has been fully reset to a clean state!');
          handleLogout();
          // refresh members
          const mRes = await fetch(`${API_URL}/members`);
          setMembers(await mRes.json());
        } else {
          alert(data.error || 'Failed to reset server.');
        }
      } catch (err) {
        alert('Failed to reset server');
      }
    }
  };

  // Build professional Line Chart data (Cumulative Hours over time)
  const allApps = Array.from(new Set(logs.map(log => getParentAppName(log.description))));
  
  // Sort logs chronologically
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Create unique timestamps for the X-axis
  const uniqueTimestamps = Array.from(new Set(sortedLogs.map(log => {
    const d = new Date(log.timestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  })));

  const cumulativeHours: Record<string, number> = {};
  allApps.forEach(app => cumulativeHours[app] = 0);

  const datasetData: Record<string, number[]> = {};
  allApps.forEach(app => datasetData[app] = []);

  uniqueTimestamps.forEach(timeLabel => {
    const logsAtTime = sortedLogs.filter(log => {
      const d = new Date(log.timestamp);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` === timeLabel;
    });
    
    logsAtTime.forEach(log => {
      const app = getParentAppName(log.description);
      cumulativeHours[app] += log.hours;
    });

    allApps.forEach(app => {
      datasetData[app].push(cumulativeHours[app]);
    });
  });

  // If there's only 1 point, add 'Now' so a flat line can be drawn instead of a single dot, avoiding the 0-wedge issue!
  if (uniqueTimestamps.length === 1 && sortedLogs.length > 0) {
    uniqueTimestamps.push('Now');
    allApps.forEach(app => {
      datasetData[app].push(cumulativeHours[app]);
    });
  }

  const chartColors = ['#00f0ff', '#7000ff', '#ff0055', '#00ff88', '#ffaa00', '#0055ff', '#ff00aa', '#00ffff'];

  const lineChartData = {
    labels: uniqueTimestamps.map(t => t.replace(new Date().toLocaleDateString() + ' ', '')), // hide date if it's today
    datasets: allApps.map((app, index) => {
      const color = chartColors[index % chartColors.length];
      return {
        label: app,
        data: datasetData[app],
        borderColor: color,
        backgroundColor: color + '20', // transparent fill
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    })
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'top' as const,
        labels: { color: '#fff', font: { family: 'Outfit' }, boxWidth: 12, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        borderWidth: 1,
        padding: 10,
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        stacked: true,
        ticks: { color: '#94a3b8', padding: 10 }, 
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false } 
      },
      x: { 
        ticks: { color: '#94a3b8', padding: 10 }, 
        grid: { display: false, drawBorder: false } 
      }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
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
          <h1 onDoubleClick={handleResetServer} style={{ cursor: 'pointer' }} title="Double-click for admin actions">ASTRA Tracker</h1>
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
        <button className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Company Chat</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>Deep Analytics</h2>
              {deficit > 0 && (
                <div style={{ background: 'rgba(255,0,85,0.1)', color: 'var(--danger)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--danger)', marginBottom: '1rem', fontWeight: 'bold' }}>
                  ⚠️ You have a carryover deficit penalty of {deficit.toFixed(2)} hours from last week!
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
                <div className="stat-card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', borderLeft: '4px solid var(--accent-primary)', transition: 'transform 0.3s ease' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Today</span>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                    {stats?.daily?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.4rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                </div>

                <div className="stat-card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', borderLeft: '4px solid var(--success)', transition: 'transform 0.3s ease' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>This Week</span>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', fontFamily: 'Outfit', color: isSuccess ? 'var(--success)' : 'var(--text-primary)', textShadow: isSuccess ? '0 0 20px rgba(0,255,136,0.3)' : 'none' }}>
                    {stats?.weekly?.toFixed(2) || currentHours.toFixed(2)}<span style={{ fontSize: '1.4rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Goal: {totalTarget.toFixed(2)}h</div>
                  <div className="progress-container" style={{ marginTop: '0.2rem', height: '6px', width: '100%' }}>
                    <div className="progress-bar" style={{ width: `${progressPercent}%`, background: isSuccess ? 'var(--success)' : 'var(--accent-primary)', boxShadow: `0 0 10px ${isSuccess ? 'var(--success)' : 'var(--accent-primary)'}` }}></div>
                  </div>
                </div>

                <div className="stat-card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', borderLeft: '4px solid #ff00aa', transition: 'transform 0.3s ease' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>This Month</span>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                    {stats?.monthly?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.4rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                </div>

                <div className="stat-card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', borderLeft: '4px solid #ffaa00', transition: 'transform 0.3s ease' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>This Year</span>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                    {stats?.yearly?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.4rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                </div>
              </div>
            </div>



            <div className="panel glass animate-stagger-3">
              <h2>App Monitor Activity</h2>
              <div style={{ height: '200px', marginBottom: '2rem', marginTop: '1rem' }}>
                {uniqueTimestamps.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No activity data for chart.</p>
                ) : (
                  <Line data={lineChartData} options={lineChartOptions as any} />
                )}
              </div>

              <div className="logs-list">
                {logs.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No recent activity tracked yet.</p>
                ) : (
                  logs.map(log => {
                    const parentApp = getParentAppName(log.description);
                    return (
                      <div key={log.id} className="log-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                        <div className="app-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                          {getAppIcon(parentApp)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="log-header" style={{ marginBottom: '0.2rem' }}>
                            <span className="log-name" style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{parentApp}</span>
                          </div>
                          {log.description !== parentApp && (
                            <div className="log-task" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', wordBreak: 'break-all' }}>
                              {log.description}
                            </div>
                          )}
                          <div className="log-time" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      <div className="log-scores">
                        <span className="badge" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                          {log.hours.toFixed(2)}h
                        </span>
                      </div>
                    </div>
                    );
                  })
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

              <div className="panel glass animate-stagger-2" style={{ marginBottom: '2rem', borderLeft: '4px solid #00f0ff', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#fff' }}>🤖 ASTRA Insights</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {(() => {
                    const sorted = [...members].sort((a, b) => (b.current_week_hours || 0) - (a.current_week_hours || 0));
                    const top = sorted[0];
                    const bottom = sorted[sorted.length - 1];
                    const isBottomFailing = bottom && (bottom.current_week_hours || 0) < ((bottom.weekly_target_hours || 0) + (bottom.carryover_deficit || 0)) * 0.5;
                    
                    return (
                      <>
                        {top && (top.current_week_hours || 0) > 0 && (
                          <div style={{ padding: '1rem', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
                            <strong style={{ color: 'var(--success)' }}>🏆 Top Performer:</strong> {top.name} is leading the team with {(top.current_week_hours || 0).toFixed(2)} hours logged this week! Outstanding dedication.
                          </div>
                        )}
                        {isBottomFailing && (
                          <div style={{ padding: '1rem', background: 'rgba(255, 0, 85, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 0, 85, 0.2)' }}>
                            <strong style={{ color: 'var(--danger)' }}>⚠️ Falling Behind:</strong> {bottom.name} is currently significantly behind their weekly quota. ASTRA recommends prioritizing focused work sessions.
                          </div>
                        )}
                        <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                          <strong style={{ color: 'var(--accent-primary)' }}>💡 Suggestion:</strong> Break down larger tasks into 2-hour deep work blocks to improve tracking consistency across the team.
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
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
      
      {activeTab === 'chat' && <CompanyChat loggedInMember={loggedInMember} />}
    </div>
  );
}

export default App;
