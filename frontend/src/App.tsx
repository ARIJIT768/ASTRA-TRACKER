import React, { useState, useEffect, useRef } from 'react';
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
import { FaGamepad, FaTerminal, FaWhatsapp, FaSpaceShuttle, FaWindows, FaAndroid } from 'react-icons/fa';
import { VscVscode } from 'react-icons/vsc';
import { MdWorkOutline } from 'react-icons/md';
import CompanyChat from './components/CompanyChat';
import { Capacitor } from '@capacitor/core';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');

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

type WeekInfo = {
  weekStart: string;
  weekEnd: string;
  daysRemaining: number;
  weekNumber: number;
};

type HistoryDay = { day: string; total: number };

const getParentAppName = (description: string) => {
  const lower = description.toLowerCase();
  if (lower.includes('antigravity')) return 'Antigravity';
  if (lower.includes('astra')) return 'ASTRA Tracker';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('telegram')) return 'Telegram';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('slack')) return 'Slack';
  if (lower.includes('zoom')) return 'Zoom';
  if (lower.includes('signal')) return 'Signal';
  if (lower.includes('messenger')) return 'Messenger';
  if (lower.includes('ollama')) return 'Ollama';
  if (lower.includes('chatgpt') || lower.includes('openai')) return 'ChatGPT';
  if (lower.includes('claude')) return 'Claude';
  if (lower.includes('brave')) return 'Brave';
  if (lower.includes('chrome')) return 'Chrome';
  if (lower.includes('firefox')) return 'Firefox';
  if (lower.includes('safari')) return 'Safari';
  if (lower.includes('opera')) return 'Opera';
  if (lower.includes('figma')) return 'Figma';
  if (lower.includes('canva')) return 'Canva';
  if (lower.includes('blender')) return 'Blender';
  if (lower.includes('unity')) return 'Unity';
  if (lower.includes('unreal')) return 'Unreal Engine';
  if (lower.includes('notion')) return 'Notion';
  if (lower.includes('obsidian')) return 'Obsidian';
  if (lower.includes('evernote')) return 'Evernote';
  if (lower.includes('trello')) return 'Trello';
  if (lower.includes('jira')) return 'Jira';
  if (lower.includes('asana')) return 'Asana';
  if (lower.includes('linear')) return 'Linear';
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('vlc')) return 'VLC';
  if (lower.includes('steam')) return 'Steam';
  if (lower.includes('epic games')) return 'Epic Games';
  if (lower.includes('github')) return 'GitHub';
  if (lower.includes('postman')) return 'Postman';
  if (lower.includes('docker')) return 'Docker';
  if (lower.includes('kubernetes')) return 'Kubernetes';
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
  if (lower.includes('whatsapp')) return <FaWhatsapp size={24} color="#25D366" />;
  if (lower.includes('telegram')) return <SiTelegram size={24} color="#26A5E4" />;
  if (lower.includes('discord')) return <SiDiscord size={24} color="#5865F2" />;
  if (lower.includes('slack')) return <SiSlack size={24} color="#4A154B" />;
  if (lower.includes('zoom')) return <SiZoom size={24} color="#2D8CFF" />;
  if (lower.includes('signal')) return <SiSignal size={24} color="#3A76F0" />;
  if (lower.includes('messenger')) return <SiMessenger size={24} color="#00B2FF" />;
  if (lower.includes('ollama')) return <SiOllama size={24} color="#FFFFFF" />;
  if (lower.includes('chatgpt')) return <SiOpenai size={24} color="#10A37F" />;
  if (lower.includes('claude')) return <SiClaude size={24} color="#D97757" />;
  if (lower.includes('brave')) return <SiBrave size={24} color="#FB542B" />;
  if (lower.includes('chrome')) return <SiGooglechrome size={24} color="#4285F4" />;
  if (lower.includes('firefox')) return <SiFirefoxbrowser size={24} color="#FF7139" />;
  if (lower.includes('safari')) return <SiSafari size={24} color="#006CFF" />;
  if (lower.includes('opera')) return <SiOpera size={24} color="#FF1B2D" />;
  if (lower.includes('figma')) return <SiFigma size={24} color="#F24E1E" />;
  if (lower.includes('canva')) return <SiCanva size={24} color="#00C4CC" />;
  if (lower.includes('blender')) return <SiBlender size={24} color="#E87D0D" />;
  if (lower.includes('unity')) return <SiUnity size={24} color="#FFFFFF" />;
  if (lower.includes('unreal')) return <SiUnrealengine size={24} color="#0E1128" />;
  if (lower.includes('notion')) return <SiNotion size={24} color="#FFFFFF" />;
  if (lower.includes('obsidian')) return <SiObsidian size={24} color="#7C3AED" />;
  if (lower.includes('evernote')) return <SiEvernote size={24} color="#00A82D" />;
  if (lower.includes('trello')) return <SiTrello size={24} color="#0052CC" />;
  if (lower.includes('jira')) return <SiJira size={24} color="#0052CC" />;
  if (lower.includes('asana')) return <SiAsana size={24} color="#F06A6A" />;
  if (lower.includes('linear')) return <SiLinear size={24} color="#5E6AD2" />;
  if (lower.includes('spotify')) return <SiSpotify size={24} color="#1DB954" />;
  if (lower.includes('youtube')) return <SiYoutube size={24} color="#FF0000" />;
  if (lower.includes('vlc')) return <SiVlcmediaplayer size={24} color="#FF8800" />;
  if (lower.includes('steam')) return <SiSteam size={24} color="#00ADEE" />;
  if (lower.includes('epic')) return <SiEpicgames size={24} color="#FFFFFF" />;
  if (lower.includes('github')) return <SiGithub size={24} color="#FFFFFF" />;
  if (lower.includes('postman')) return <SiPostman size={24} color="#FF6C37" />;
  if (lower.includes('docker')) return <SiDocker size={24} color="#2496ED" />;
  if (lower.includes('kubernetes')) return <SiKubernetes size={24} color="#326CE5" />;
  if (lower.includes('android studio')) return <SiAndroidstudio size={24} color="#3DDC84" />;
  if (lower.includes('intellij')) return <SiIntellijidea size={24} color="#000000" />;
  if (lower.includes('webstorm')) return <SiWebstorm size={24} color="#00CDD7" />;
  if (lower.includes('pycharm')) return <SiPycharm size={24} color="#21D789" />;
  if (lower.includes('xcode')) return <SiXcode size={24} color="#147EFB" />;
  if (lower.includes('neovim')) return <SiNeovim size={24} color="#57A143" />;
  if (lower.includes('vim')) return <SiVim size={24} color="#019733" />;
  if (lower.includes('jupyter')) return <SiJupyter size={24} color="#F37626" />;
  if (lower.includes('vs code')) return <VscVscode size={24} color="#007ACC" />;
  if (lower.includes('astra') || lower.includes('antigravity')) return <FaSpaceShuttle size={24} color="#00f0ff" />;
  if (lower.includes('game')) return <FaGamepad size={24} color="#FF6B6B" />;
  if (lower.includes('terminal') || lower.includes('cmd') || lower.includes('powershell')) return <FaTerminal size={24} color="#00FF88" />;
  if (lower.includes('windows')) return <FaWindows size={24} color="#00A4EF" />;
  return <MdWorkOutline size={24} color="#00f0ff" />;
};

// ===================== MINI SPARKLINE COMPONENT (Using Chart.js) =====================
function Sparkline({ data, color }: { data: number[], color: string }) {
  // If no data or all zeros, create a flat line at 0 for proper scaling
  const chartData = data.length > 0 ? data : [0, 0];
  const displayData = chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;

  const dataConfig = {
    labels: displayData.map((_, i) => String(i)),
    datasets: [
      {
        data: displayData,
        borderColor: color,
        borderWidth: 2,
        backgroundColor: color + '15', // very faint fill
        fill: true,
        tension: 0.4, // smooth curve
        pointRadius: 0, // hide points
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 },
    },
    layout: { padding: 0 },
    interaction: { intersect: false, mode: 'index' as const },
  };

  return (
    <div className="sparkline-container" style={{ width: '100%', height: '50px' }}>
      <Line data={dataConfig} options={options as any} />
    </div>
  );
}

// ===================== CUSTOM DROPDOWN COMPONENT =====================
function CustomDropdown({ members, value, onChange }: { members: Member[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = members.find(m => m.id === Number(value));
  
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  
  return (
    <div className="custom-dropdown" ref={ref}>
      <button 
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selected ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)' }}>
          {selected ? `${selected.name}` : 'Choose your profile'}
        </span>
        <span className="chevron">▾</span>
      </button>
      {isOpen && (
        <div className="custom-dropdown-menu">
          {members.map(m => (
            <div 
              key={m.id} 
              className={`custom-dropdown-item ${Number(value) === m.id ? 'selected' : ''}`}
              onClick={() => { onChange(String(m.id)); setIsOpen(false); }}
            >
              {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== MAIN APP =====================
function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<{ daily: number, weekly: number, monthly: number, yearly: number } | null>(null);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'chat'>(() => {
    return (sessionStorage.getItem('astra_active_tab') as any) || 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState('00:00:00');
  const [trackingError, setTrackingError] = useState(false);
  const webTrackingRef = useRef<any>(null);

  // IPC Listeners for Desktop App Network Status
  useEffect(() => {
    if (isElectron) {
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.on('tracking-ping-success', () => setTrackingError(false));
        ipcRenderer.on('tracking-ping-failed', () => setTrackingError(true));
      } catch (e) { console.error('IPC listener setup failed', e); }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('astra_active_tab', activeTab);
  }, [activeTab]);
  
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
    
    fetch(`${API_URL}/week-info`)
      .then(res => res.json())
      .then(data => setWeekInfo(data))
      .catch(err => console.error('Failed to load week info', err));
  }, []);

  const fetchDashboardData = async (memberId: number) => {
    try {
      const [membersRes, logsRes, remRes, statsRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/members`),
        fetch(`${API_URL}/logs/${memberId}`),
        fetch(`${API_URL}/reminders/${memberId}`),
        fetch(`${API_URL}/stats/${memberId}`),
        fetch(`${API_URL}/stats/${memberId}/history`)
      ]);
      
      const allMembers = await membersRes.json();
      setMembers(allMembers);
      
      const freshMemberData = allMembers.find((m: Member) => m.id === memberId);
      if (freshMemberData) setLoggedInMember(freshMemberData);

      setLogs(await logsRes.json());
      setReminders(await remRes.json());
      setStats(await statsRes.json());
      setHistory(await historyRes.json());
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

  // Elapsed time counter for tracking
  useEffect(() => {
    if (isTracking && trackingStartTime) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - trackingStartTime) / 1000);
        const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        setElapsedDisplay(`${h}:${m}:${s}`);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTracking, trackingStartTime]);

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
    handleClockOut();
  };

  // ===================== CLOCK IN / OUT =====================
  const sendTrackingPing = async (memberId: number) => {
    try {
      await fetch(`${API_URL}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          description: isElectron ? 'Desktop App - Auto Tracked' : Capacitor.isNativePlatform() ? 'Mobile App - Auto Tracked' : 'Web App - Auto Tracked',
          hours: 60 / 3600
        })
      });
    } catch (e) {
      console.error('Tracking ping failed:', e);
    }
  };

  const handleClockIn = () => {
    if (!loggedInMember) return;
    setIsTracking(true);
    setTrackingStartTime(Date.now());

    let useWebTracking = !isElectron;

    if (isElectron) {
      try {
        // @ts-ignore
        window.require('electron').ipcRenderer.send('clock-in', { memberId: loggedInMember.id });
      } catch (e) { 
        console.error("Electron IPC failed, falling back to web tracking", e); 
        useWebTracking = true;
      }
    } 
    
    if (useWebTracking) {
      // Web/mobile: send immediate first ping then every 60s
      sendTrackingPing(loggedInMember.id);
      webTrackingRef.current = setInterval(() => {
        if (!document.hidden) {
          sendTrackingPing(loggedInMember.id);
        }
      }, 60000);
    }
  };

  const handleClockOut = () => {
    setIsTracking(false);
    setTrackingStartTime(null);
    setElapsedDisplay('00:00:00');
    setTrackingError(false);
    
    let useWebTracking = !isElectron;

    if (isElectron) {
      try {
        // @ts-ignore
        window.require('electron').ipcRenderer.send('clock-out');
      } catch (e) { 
        useWebTracking = true;
      }
    } 
    
    if (useWebTracking) {
      if (webTrackingRef.current) {
        clearInterval(webTrackingRef.current);
        webTrackingRef.current = null;
      }
    }
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

  const markReminderRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/reminders/${id}/read`, { method: 'POST' });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error('Failed to mark reminder read'); }
  };

  // ===================== CHART DATA =====================
  const allApps = Array.from(new Set(logs.map(log => getParentAppName(log.description))));
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

  if (uniqueTimestamps.length === 1 && sortedLogs.length > 0) {
    uniqueTimestamps.push('Now');
    allApps.forEach(app => { datasetData[app].push(cumulativeHours[app]); });
  }

  const chartColors = ['#00f0ff', '#7c3aed', '#ff0055', '#00ff88', '#ffaa00', '#0055ff', '#ff00aa', '#00ffff'];

  const lineChartData = {
    labels: uniqueTimestamps.map(t => t.replace(new Date().toLocaleDateString() + ' ', '')),
    datasets: allApps.map((app, index) => {
      const color = chartColors[index % chartColors.length];
      return {
        label: app, data: datasetData[app], borderColor: color,
        backgroundColor: color + '15', borderWidth: 2, fill: true, tension: 0.4,
        pointBackgroundColor: color, pointBorderColor: 'transparent', pointBorderWidth: 0,
        pointRadius: 3, pointHoverRadius: 6,
      };
    })
  };

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, boxWidth: 10, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(8, 8, 16, 0.95)', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(0, 240, 255, 0.2)', borderWidth: 1, padding: 10, mode: 'index' as const, intersect: false }
    },
    scales: {
      y: { beginAtZero: true, stacked: true, ticks: { color: '#555', padding: 10, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false } },
      x: { ticks: { color: '#555', padding: 10, font: { size: 10 } }, grid: { display: false, drawBorder: false } }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
  };

  // Build sparkline data arrays from history
  const last7 = history.slice(-7);
  const last30 = history.slice(-30);
  const dailySparkData = last7.map(d => parseFloat(String(d.total)));
  const weeklySparkData = (() => {
    // Group by week from history
    const weeks: number[] = [];
    let weekSum = 0;
    last30.forEach((d, i) => {
      weekSum += parseFloat(String(d.total));
      if ((i + 1) % 7 === 0 || i === last30.length - 1) {
        weeks.push(weekSum);
        weekSum = 0;
      }
    });
    return weeks.length > 0 ? weeks : [0];
  })();
  const monthlySparkData = last30.map(d => parseFloat(String(d.total)));

  // ===================== LOGIN PAGE =====================
  if (!loggedInMember) {
    const selectedMember = members.find(m => m.id === Number(loginId));
    const isSettingPin = selectedMember && selectedMember.has_pin === 0;
    return (
      <div className="login-container">
        <div className="login-card glass animate-stagger-1">
          <h2 className="login-title">ASTRA Tracker</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>
          {loginError && <div className="reminder-item" style={{ marginBottom: '1rem' }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Your Profile</label>
              <CustomDropdown members={members} value={loginId} onChange={(val) => { setLoginId(val); setPin(''); }} />
            </div>
            {loginId && (
              <div className="form-group">
                <label style={{ color: isSettingPin ? 'var(--neon-cyan)' : 'inherit' }}>
                  {isSettingPin ? 'Create Your 6-Digit PIN' : 'Enter Your 6-Digit PIN'}
                </label>
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={isSettingPin ? 'Create a 6-digit PIN' : '••••••'} required maxLength={6} minLength={6} />
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
  const targetHours = loggedInMember.weekly_target_hours || 0;
  const progressPercent = targetHours > 0 ? Math.min(100, (currentHours / targetHours) * 100) : 0;
  const isSuccess = currentHours >= targetHours;

  const formatWeekDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 onDoubleClick={handleResetServer} style={{ cursor: 'pointer' }} title="Double-click for admin actions">ASTRA Tracker</h1>
          <button onClick={simulateEndOfWeek} className="primary-btn" style={{ background: 'var(--danger)', borderColor: 'rgba(255,45,85,0.3)', fontSize: '0.75rem', padding: '0.3rem 0.8rem', width: 'auto' }}>
            Simulate End of Week
          </button>
          {!Capacitor.isNativePlatform() && !isElectron && (
            <>
              <a href="https://nightly.link/ARIJIT768/ASTRA-TRACKER/workflows/build-android.yml/main/ASTRA-Tracker-App.zip" download className="primary-btn" style={{ background: 'linear-gradient(135deg, #3DDC84, #1B9C50)', borderColor: 'rgba(61,220,132,0.3)', fontSize: '0.75rem', padding: '0.3rem 0.8rem', width: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaAndroid /> Android
              </a>
              <a href="https://nightly.link/ARIJIT768/ASTRA-TRACKER/workflows/build-desktop.yml/main/ASTRA-Tracker-Windows.zip" download className="primary-btn" style={{ background: 'linear-gradient(135deg, #00A4EF, #0055AA)', borderColor: 'rgba(0,164,239,0.3)', fontSize: '0.75rem', padding: '0.3rem 0.8rem', width: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaWindows /> Desktop
              </a>
            </>
          )}
        </div>
        <div className="glass header-actions" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
           <span style={{ color: 'var(--neon-green)', fontWeight: '600', fontFamily: 'Outfit' }}>{loggedInMember.name}</span>
           <button onClick={handleLogout} className="primary-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto' }}>Logout</button>
        </div>
      </header>

      <div className="mobile-menu-bar">
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Navigation</h2>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>☰</button>
      </div>

      <div className={`tabs-container ${isMobileMenuOpen ? 'open' : ''}`} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', padding: '0 1rem', overflowX: 'auto', whiteSpace: 'nowrap', transition: 'max-height 0.3s ease' }}>
        <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}>My Dashboard</button>
        <button className={`tab-button ${activeTab === 'team' ? 'active' : ''}`} onClick={() => { setActiveTab('team'); setIsMobileMenuOpen(false); }}>Team Activity</button>
        <button className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}>Company Chat</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          <div className="main-content">
            {/* Week Info Banner */}
            {weekInfo && (
              <div className="week-banner animate-stagger-1">
                <span className="week-label">📅 Week {weekInfo.weekNumber}</span>
                <span className="week-dates">{formatWeekDate(weekInfo.weekStart)} — {formatWeekDate(weekInfo.weekEnd)}</span>
                <span className="days-remaining">
                  {weekInfo.daysRemaining === 0 ? '🔥 Last day!' : `${weekInfo.daysRemaining} day${weekInfo.daysRemaining === 1 ? '' : 's'} left`}
                </span>
              </div>
            )}

            {/* Stats Cards with Sparklines */}
            <div className="panel glass animate-stagger-1">
              <h2>📊 Deep Analytics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '0.5rem 0' }}>
                <div className="stat-card glass neon-cyan" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderRadius: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Today</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--neon-cyan)', textShadow: '0 0 20px rgba(0,240,255,0.25)' }}>
                    {stats?.daily?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                  <Sparkline data={dailySparkData.length > 0 ? dailySparkData : [0]} color="#00f0ff" />
                </div>

                <div className="stat-card glass neon-green" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderRadius: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px' }}>This Week</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit', color: isSuccess ? 'var(--neon-green)' : 'var(--text-primary)', textShadow: isSuccess ? '0 0 25px rgba(0,255,136,0.3)' : 'none' }}>
                    {stats?.weekly?.toFixed(2) || currentHours.toFixed(2)}<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Goal: {targetHours.toFixed(2)}h</span>
                  <div className="progress-container" style={{ marginTop: '0.2rem', height: '6px', width: '100%', maxWidth: '100%' }}>
                    <div className="progress-bar" style={{ width: `${progressPercent}%`, background: isSuccess ? 'var(--neon-green)' : 'var(--neon-cyan)' }}></div>
                  </div>
                  <Sparkline data={weeklySparkData} color="#00ff88" />
                </div>

                <div className="stat-card glass neon-violet" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderRadius: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px' }}>This Month</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--neon-violet)', textShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
                    {stats?.monthly?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                  <Sparkline data={monthlySparkData.length > 0 ? monthlySparkData : [0]} color="#7c3aed" />
                </div>

                <div className="stat-card glass neon-amber" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderRadius: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px' }}>This Year</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit', color: 'var(--neon-amber)', textShadow: '0 0 20px rgba(255,170,0,0.25)' }}>
                    {stats?.yearly?.toFixed(2) || '0.00'}<span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>h</span>
                  </div>
                  <Sparkline data={monthlySparkData.length > 0 ? monthlySparkData : [0]} color="#ffaa00" />
                </div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="panel glass animate-stagger-3">
              <h2>⚡ App Monitor Activity</h2>
              <div style={{ height: '220px', marginBottom: '2rem', marginTop: '1rem' }}>
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
                      <div key={log.id} className="log-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                        <div className="app-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                          {getAppIcon(parentApp)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="log-header" style={{ marginBottom: '0.15rem' }}>
                            <span className="log-name">{parentApp}</span>
                          </div>
                          {log.description !== parentApp && (
                            <div className="log-task" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.15rem', wordBreak: 'break-all' }}>
                              {log.description}
                            </div>
                          )}
                          <div className="log-time">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="log-scores">
                          <span className="badge">{log.hours.toFixed(2)}h</span>
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
              <div className="panel glass animate-stagger-4" style={{ borderColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255,45,85,0.06)' }}>
                <h2>⚠️ Action Required</h2>
                {reminders.map(rem => (
                  <div key={rem.id} className="reminder-item">
                    <div className="reminder-message">{rem.message}</div>
                    <button onClick={() => markReminderRead(rem.id)} className="primary-btn" style={{ marginTop: '0.8rem', padding: '0.5rem', fontSize: '0.85rem' }}>Acknowledge</button>
                  </div>
                ))}
              </div>
            )}

            {/* Clock In / Out Panel */}
            <div className="panel glass animate-stagger-5">
              <h2>⏱️ ASTRA Time Tracker</h2>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                {isTracking ? (
                  <>
                    <button 
                      onClick={handleClockOut}
                      className="primary-btn clock-out-btn" 
                      style={{ 
                        background: 'rgba(255,45,85,0.1)', 
                        border: '1px solid var(--danger)', 
                        color: 'var(--danger)', 
                        boxShadow: '0 0 15px rgba(255,45,85,0.2)',
                        padding: '0.8rem 2rem',
                        width: '100%'
                      }}
                    >
                      ⏹️ Stop Tracking
                    </button>
                    <div style={{ marginTop: '1rem', color: trackingError ? 'var(--neon-violet)' : 'var(--neon-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div className="pulse-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: trackingError ? 'var(--neon-violet)' : 'var(--neon-green)', boxShadow: `0 0 10px ${trackingError ? 'var(--neon-violet)' : 'var(--neon-green)'}` }}></div>
                      {trackingError ? 'Connection Issue...' : `Active • ${elapsedDisplay}`}
                    </div>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleClockIn}
                      className="primary-btn clock-in-btn" 
                      style={{ width: '100%', marginBottom: '1rem' }}
                    >
                      ▶️ Clock In
                    </button>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                      Click to start tracking your activity automatically.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="main-content">
            <div className="panel glass animate-stagger-1">
              <h2>🏆 Global Team Progress</h2>
              {weekInfo && (
                <div className="week-banner" style={{ marginBottom: '1.5rem' }}>
                  <span className="week-label">📅 Week {weekInfo.weekNumber}</span>
                  <span className="week-dates">{formatWeekDate(weekInfo.weekStart)} — {formatWeekDate(weekInfo.weekEnd)}</span>
                  <span className="days-remaining">
                    {weekInfo.daysRemaining === 0 ? '🔥 Last day!' : `${weekInfo.daysRemaining} day${weekInfo.daysRemaining === 1 ? '' : 's'} left`}
                  </span>
                </div>
              )}

              <div className="panel glass animate-stagger-2" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--neon-cyan)', background: 'rgba(0,240,255,0.02)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#fff' }}>🤖 ASTRA Insights</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {(() => {
                    const sorted = [...members].sort((a, b) => (b.current_week_hours || 0) - (a.current_week_hours || 0));
                    const top = sorted[0];
                    const totalTeamHours = members.reduce((acc, m) => acc + (m.current_week_hours || 0), 0);
                    const isWeekStarted = totalTeamHours > 0;
                    const failingMembers = members.filter(m => (m.current_week_hours || 0) < (m.weekly_target_hours || 0) * 0.5);
                    
                    return (
                      <>
                        {!isWeekStarted ? (
                          <div style={{ padding: '1.2rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                            <strong style={{ color: 'var(--neon-cyan)', display: 'block', marginBottom: '0.3rem' }}>⏳ Awaiting Team Activity</strong> 
                            The week has just started and the team is at 0 hours. Start your trackers to generate AI insights!
                          </div>
                        ) : (
                          <>
                            <div style={{ padding: '1.2rem', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.15)' }}>
                              <strong style={{ color: 'var(--neon-green)', display: 'block', marginBottom: '0.3rem' }}>🏆 Top Performer</strong> 
                              {top.name} is leading the team with {(top.current_week_hours || 0).toFixed(2)} hours logged this week! Outstanding consistency.
                            </div>
                            
                            {failingMembers.length > 0 && (
                              <div style={{ padding: '1.2rem', background: 'rgba(255, 45, 85, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 45, 85, 0.15)' }}>
                                <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.3rem' }}>⚠️ Team Warning</strong> 
                                {failingMembers.length} member(s) are currently significantly behind their weekly quota. Consider a quick standup to unblock tasks.
                              </div>
                            )}
                            
                            <div style={{ padding: '1.2rem', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '12px', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                              <strong style={{ color: 'var(--neon-violet)', display: 'block', marginBottom: '0.3rem' }}>💡 Productivity Tip</strong> 
                              The team has logged {totalTeamHours.toFixed(2)} total hours this week. Try grouping deep work into 90-minute focused blocks for maximum flow state.
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[...members].sort((a, b) => (b.current_week_hours || 0) - (a.current_week_hours || 0)).map((m, idx) => {
                  const target = (m.weekly_target_hours || 0);
                  const mCurrentHours = m.current_week_hours || 0;
                  const percent = target > 0 ? Math.min(100, (mCurrentHours / target) * 100) : 0;
                  const mIsSuccess = mCurrentHours >= target;
                  
                  return (
                    <div key={m.id} className="panel glass" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: loggedInMember && m.id === loggedInMember.id ? '1px solid rgba(0,240,255,0.2)' : '', boxShadow: loggedInMember && m.id === loggedInMember.id ? '0 0 15px rgba(0,240,255,0.05)' : '' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : ''}`}>#{idx + 1}</span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: loggedInMember && m.id === loggedInMember.id ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '1.15rem', color: mIsSuccess ? 'var(--neon-green)' : 'var(--text-primary)', textShadow: mIsSuccess ? '0 0 10px rgba(0,255,136,0.3)' : 'none' }}>
                          {mCurrentHours.toFixed(2)}h
                        </span>
                      </div>
                      
                      <div className="progress-container" style={{ height: '6px', marginBottom: '0.8rem', maxWidth: '100%' }}>
                        <div className="progress-bar" style={{ width: `${percent}%`, background: mIsSuccess ? 'var(--neon-green)' : 'var(--neon-cyan)' }}></div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span>Target: {target.toFixed(2)}h</span>
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
