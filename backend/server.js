const express = require('express');
const cors = require('cors');
const pool = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

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
    if (!pin || pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });

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
            const totalRequired = member.weekly_target_hours + member.carryover_deficit;
            let newDeficit = member.carryover_deficit;
            let message = "";
            
            if (member.current_week_hours < totalRequired) {
                const missedBy = totalRequired - member.current_week_hours;
                newDeficit += missedBy;
                message = `🚨 CRITICAL WARNING: You missed your quota by ${missedBy.toFixed(2)} hours this week. Your deficit penalty has been applied. Your new target for next week is ${(member.weekly_target_hours + newDeficit).toFixed(2)} hours. Get to work!`;
            } else {
                // If they did extra work, it reduces their deficit (if they have one)
                const extraHours = member.current_week_hours - totalRequired;
                newDeficit = Math.max(0, newDeficit - extraHours);
                message = `✅ Great job! You successfully met your weekly target.`;
            }
            
            // Add reminder
            await pool.query("INSERT INTO reminders (member_id, message) VALUES ($1, $2)", [member.id, message]);
            
            // Reset current week and update deficit
            await pool.query("UPDATE members SET current_week_hours = 0, carryover_deficit = $1 WHERE id = $2", [newDeficit, member.id]);
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

// For Vercel Serverless Functions
module.exports = app;

// Fallback for local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`);
    });
}
