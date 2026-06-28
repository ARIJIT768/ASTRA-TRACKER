const express = require('express');
const cors = require('cors');
const pool = require('./database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 5001;

// Root health check route for Vercel
app.get('/', (req, res) => {
    res.json({ status: 'ASTRA Backend is actively running on Vercel!' });
});

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, name, weekly_target_hours, current_week_hours, carryover_deficit, CASE WHEN pin IS NULL THEN 0 ELSE 1 END as has_pin FROM members ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { member_id, pin } = req.body;
    try {
        const { rows } = await pool.query("SELECT id, name, weekly_target_hours, current_week_hours, carryover_deficit FROM members WHERE id = $1 AND pin = $2", [member_id, pin]);
        if (rows.length === 0) return res.status(401).json({ error: "Invalid PIN" });
        res.json({ success: true, member: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set PIN for the first time
app.post('/api/set-pin', async (req, res) => {
    const { member_id, pin } = req.body;
    if (!pin || pin.length !== 6) return res.status(400).json({ error: "PIN must be exactly 6 digits" });

    try {
        const { rows } = await pool.query("SELECT pin FROM members WHERE id = $1", [member_id]);
        if (rows.length === 0) return res.status(404).json({ error: "Member not found" });
        if (rows[0].pin !== null) return res.status(400).json({ error: "PIN is already set. Ask admin to reset." });
        
        await pool.query("UPDATE members SET pin = $1 WHERE id = $2", [pin, member_id]);
        
        const memberData = await pool.query("SELECT id, name, weekly_target_hours, current_week_hours, carryover_deficit FROM members WHERE id = $1", [member_id]);
        res.json({ success: true, member: memberData.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get global activity
app.get('/api/activity', async (req, res) => {
    const query = `
        SELECT l.*, m.name as member_name 
        FROM logs l 
        JOIN members m ON l.member_id = m.id 
        ORDER BY l.timestamp DESC 
        LIMIT 50
    `;
    try {
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get logs for a specific member
app.get('/api/logs/:id', async (req, res) => {
    const query = `
        SELECT l.*, m.name as member_name 
        FROM logs l 
        JOIN members m ON l.member_id = m.id 
        WHERE l.member_id = $1
        ORDER BY l.timestamp DESC 
        LIMIT 50
    `;
    try {
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get active reminders for a specific member
app.get('/api/reminders/:id', async (req, res) => {
    const query = `
        SELECT r.*, m.name as member_name 
        FROM reminders r 
        JOIN members m ON r.member_id = m.id 
        WHERE r.is_read = 0 AND r.member_id = $1
        ORDER BY r.timestamp DESC
    `;
    try {
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Log work (Strict Time Tracking)
app.post('/api/log', async (req, res) => {
    const { member_id, description, hours } = req.body;
    
    if (!member_id || !description || hours == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        await pool.query(
            "INSERT INTO logs (member_id, description, hours) VALUES ($1, $2, $3)",
            [member_id, description, hours]
        );
                
        await pool.query("UPDATE members SET current_week_hours = current_week_hours + $1 WHERE id = $2", [hours, member_id]);
        
        res.json({ success: true, hours_added: hours });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// End of Week Calculation (Admin/Cron)
app.post('/api/end-week', async (req, res) => {
    try {
        const { rows: members } = await pool.query("SELECT id, name, weekly_target_hours, current_week_hours, carryover_deficit FROM members");
        
        for (const member of members) {
            const totalRequired = member.weekly_target_hours;
            let message = "";
            
            if (member.current_week_hours < totalRequired) {
                const missedBy = totalRequired - member.current_week_hours;
                message = `🚨 CRITICAL WARNING: You missed your quota by ${missedBy.toFixed(2)} hours this week. You must hit your target of ${member.weekly_target_hours.toFixed(2)} hours next week!`;
            } else {
                message = `✅ Great job! You successfully met your weekly target.`;
            }
            
            // Add reminder
            await pool.query("INSERT INTO reminders (member_id, message) VALUES ($1, $2)", [member.id, message]);
            
            // Reset current week and carryover deficit (so it stays 0)
            await pool.query("UPDATE members SET current_week_hours = 0, carryover_deficit = 0 WHERE id = $2", [member.id]);
        }
        
        res.json({ success: true, message: "Weekly rollover executed successfully" });
    } catch (err) {
        console.error("End week error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Mark reminder as read
app.post('/api/reminders/:id/read', async (req, res) => {
    try {
        await pool.query("UPDATE reminders SET is_read = 1 WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Company Chat Endpoints ---

// Get latest chat messages
app.get('/api/chat', async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, member_id, member_name, content, file_data, file_type, file_name, timestamp FROM company_chat ORDER BY timestamp ASC LIMIT 200"
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Post a new chat message
app.post('/api/chat', async (req, res) => {
    const { member_id, member_name, content, file_data, file_type, file_name } = req.body;
    try {
        // Enforce max payload roughly check (Express JSON already limits, but good to ensure DB doesn't choke)
        if (file_data && file_data.length > 4000000) {
            return res.status(400).json({ error: "File too large. Max 3MB allowed for secure chat." });
        }
        
        await pool.query(
            "INSERT INTO company_chat (member_id, member_name, content, file_data, file_type, file_name) VALUES ($1, $2, $3, $4, $5, $6)",
            [member_id, member_name, content, file_data, file_type, file_name]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deep Analytics (Daily, Weekly, Monthly, Yearly)
app.get('/api/stats/:id', async (req, res) => {
    const query = `
        SELECT 
            COALESCE(SUM(hours) FILTER (WHERE timestamp >= date_trunc('day', CURRENT_TIMESTAMP)), 0) AS daily,
            COALESCE(SUM(hours) FILTER (WHERE timestamp >= date_trunc('week', CURRENT_TIMESTAMP)), 0) AS weekly,
            COALESCE(SUM(hours) FILTER (WHERE timestamp >= date_trunc('month', CURRENT_TIMESTAMP)), 0) AS monthly,
            COALESCE(SUM(hours) FILTER (WHERE timestamp >= date_trunc('year', CURRENT_TIMESTAMP)), 0) AS yearly
        FROM logs
        WHERE member_id = $1
    `;
    try {
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FULL SERVER RESET (Wipe all data, reset all members)
app.post('/api/reset-server', async (req, res) => {
    const { passcode } = req.body;
    if (passcode !== '200628') {
        return res.status(403).json({ error: "Unauthorized. Incorrect admin code." });
    }
    try {
        await pool.query("TRUNCATE TABLE logs, reminders RESTART IDENTITY CASCADE");
        await pool.query("UPDATE members SET current_week_hours = 0, carryover_deficit = 0, pin = NULL");
        res.json({ success: true, message: "Server fully reset." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats History - Daily hours for last 30 days (for sparkline charts)
app.get('/api/stats/:id/history', async (req, res) => {
    const query = `
        SELECT date_trunc('day', timestamp)::date AS day, SUM(hours) AS total
        FROM logs 
        WHERE member_id = $1 AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day 
        ORDER BY day
    `;
    try {
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Week Info - Calendar-aware week boundaries
app.get('/api/week-info', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                date_trunc('week', CURRENT_DATE)::date AS week_start,
                (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date AS week_end,
                EXTRACT(DOW FROM CURRENT_DATE) AS day_of_week,
                EXTRACT(WEEK FROM CURRENT_DATE) AS week_number
        `);
        const info = rows[0];
        const daysRemaining = 7 - parseInt(info.day_of_week || '0');
        res.json({
            weekStart: info.week_start,
            weekEnd: info.week_end,
            daysRemaining: daysRemaining === 7 ? 0 : daysRemaining,
            weekNumber: parseInt(info.week_number)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// For Vercel Serverless Functions
module.exports = app;

// Fallback for local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`);
    });
}
