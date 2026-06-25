import ctypes
import time
import json
import os
import urllib.request
from collections import defaultdict

class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint),
                ("dwTime", ctypes.c_uint)]

def get_idle_time_seconds():
    try:
        lii = LASTINPUTINFO()
        lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
        if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
            millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
            return millis / 1000.0
    except Exception:
        pass
    return 0.0

def get_active_window_title():
    try:
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
        return buf.value
    except Exception:
        return ""

def setup_member_id(config_path, config):
    api_url = config.get('api_url', 'https://astra-tracker-mu.vercel.app/api/log')
    members_url = api_url.replace('/log', '/members')
    
    try:
        req = urllib.request.Request(members_url)
        with urllib.request.urlopen(req) as response:
            members = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print("Could not fetch members list. Defaulting to ID 1.")
        return 1
        
    print("\n" + "="*40)
    print("WELCOME TO ASTRA DESKTOP TRACKER")
    print("="*40)
    print("Please select your profile to begin tracking:")
    for m in members:
        print(f"[{m['id']}] {m['name']}")
        
    while True:
        try:
            choice = int(input("\nEnter your ID number: "))
            selected_member = next((m for m in members if m['id'] == choice), None)
            if selected_member:
                config['member_id'] = choice
                with open(config_path, 'w') as f:
                    json.dump(config, f, indent=4)
                print(f"Awesome! You are now locked in as '{selected_member['name']}'.")
                print("Your ID has been saved to config.json.")
                print("="*40 + "\n")
                return choice
            else:
                print("Invalid number. Try again.")
        except ValueError:
            print("Please enter a valid number.")

def main():
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print("Failed to load config.json", e)
        return

    member_id = config.get('member_id', 0)
    if not member_id or member_id == 0:
        member_id = setup_member_id(config_path, config)

    api_url = config.get('api_url', 'https://astra-tracker-mu.vercel.app/api/log')
    poll_interval = config.get('poll_interval_seconds', 1)
    submit_interval = config.get('submit_interval_seconds', 5)
    idle_threshold = config.get('idle_threshold_seconds', 60)
    
    app_usage = defaultdict(int) # app_name -> seconds spent
    last_submit_time = time.time()

    print(f"Agent started for Member ID: {member_id}.")
    print(f"Polling active windows every {poll_interval}s.")
    print(f"Idle timeout set to {idle_threshold}s.")
    print(f"Submitting auto-logs every {submit_interval} seconds to {api_url}.")
    print("Press Ctrl+C to stop.")
    
    last_seen_window = ""
    
    while True:
        idle_seconds = get_idle_time_seconds()
        
        # Only log if user is NOT idle
        if idle_seconds < idle_threshold:
            title = get_active_window_title()
            if title:
                last_seen_window = title
                parts = title.split(' - ')
                app_name = parts[-1].strip() if len(parts) > 1 else title.strip()
                
                allowed_apps = config.get('allowed_apps', [])
                
                if app_name and app_name not in ["Program Manager", "Task Switching"]:
                    is_allowed = True
                    if allowed_apps:
                        is_allowed = any(allowed.lower() in app_name.lower() for allowed in allowed_apps)
                    
                    if is_allowed:
                        app_usage[app_name] += poll_interval

        time.sleep(poll_interval)
        
        current_time = time.time()
        if current_time - last_submit_time >= submit_interval:
            total_seconds = sum(app_usage.values())
            
            if total_seconds > 0:
                for app, sec in app_usage.items():
                    hours = round(sec / 3600, 4)
                    if hours > 0:
                        payload = {
                            "member_id": member_id,
                            "description": f"{app} - Auto Tracked",
                            "hours": hours
                        }
                        data = json.dumps(payload).encode('utf-8')
                        req = urllib.request.Request(api_url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
                        try:
                            with urllib.request.urlopen(req) as response:
                                print(f"[{time.strftime('%H:%M:%S')}] Logged {app} for {round(sec/60, 2)} minutes.")
                        except Exception as e:
                            print(f"[{time.strftime('%H:%M:%S')}] Failed to submit log for {app}: {e}")
            else:
                if idle_seconds >= idle_threshold:
                    print(f"[{time.strftime('%H:%M:%S')}] No activity tracked. (You are marked as IDLE!)")
                else:
                    print(f"[{time.strftime('%H:%M:%S')}] No activity tracked. (Active window '{last_seen_window}' is not an allowed app)")
                
            # Reset counters
            app_usage.clear()
            last_submit_time = current_time

if __name__ == '__main__':
    main()
