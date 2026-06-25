const express = require('express');
const cors = require('cors');
const pool = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, name, score_threshold, total_score, CASE WHEN pin IS NULL THEN 0 ELSE 1 END as has_pin FROM members ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { member_id, pin } = req.body;
    try {
        const { rows } = await pool.query("SELECT id, name, score_threshold, total_score FROM members WHERE id = $1 AND pin = $2", [member_id, pin]);
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
        
        const memberData = await pool.query("SELECT id, name, score_threshold, total_score FROM members WHERE id = $1", [member_id]);
        res.json({ success: true, member: memberData.rows[0] });
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

// Helper function to call Groq API to score a task
async function getTaskScore(description) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.log("No GROQ_API_KEY provided. Defaulting to score 5.");
            return 5;
        }

        const prompt = `You are a productivity bot. A team member completed the following task: "${description}".
Rate the complexity and impact of this task on a scale of 1 to 10, where 1 is trivial and 10 is massive impact.
Respond ONLY with a single integer between 1 and 10. Do not include any other text.`;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            })
        });
        
        if (!response.ok) throw new Error('Groq API error');
        const data = await response.json();
        const aiText = data.choices[0].message.content;
        
        const scoreMatch = aiText.match(/\d+/);
        let score = scoreMatch ? parseInt(scoreMatch[0]) : 5;
        return Math.max(1, Math.min(10, score));
    } catch (err) {
        console.error("Error communicating with AI, falling back to default score", err);
        return 5; 
    }
}

// Log work
app.post('/api/log', async (req, res) => {
    const { member_id, description, hours } = req.body;
    
    if (!member_id || !description || hours == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const task_score = await getTaskScore(description);
        const time_score = Math.round(hours * 2);
        const total_score = task_score + time_score;

        await pool.query(
            `INSERT INTO logs (member_id, description, hours, task_score, time_score, total_score) VALUES ($1, $2, $3, $4, $5, $6)`,
            [member_id, description, hours, task_score, time_score, total_score]
        );
                
        await pool.query(`UPDATE members SET total_score = total_score + $1 WHERE id = $2`, [total_score, member_id]);
        
        // Check threshold asynchronously
        checkThresholds().catch(console.error);
        
        res.json({ success: true, task_score, time_score, total_score });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bot function to check if anyone is falling behind
async function checkThresholds() {
    try {
        const { rows: members } = await pool.query("SELECT id, name, total_score, score_threshold FROM members");
        
        for (const member of members) {
            if (member.total_score < member.score_threshold) {
                const diff = member.score_threshold - member.total_score;
                const message = `Reminder: You are ${diff} points below your target threshold of ${member.score_threshold}. Let's get some work done!`;
                
                const { rows: reminders } = await pool.query("SELECT id FROM reminders WHERE member_id = $1 AND is_read = 0", [member.id]);
                if (reminders.length === 0) {
                    await pool.query("INSERT INTO reminders (member_id, message) VALUES ($1, $2)", [member.id, message]);
                }
            }
        }
    } catch (err) {
        console.error("Threshold check error:", err);
    }
}

// Mark reminder as read
app.post('/api/reminders/:id/read', async (req, res) => {
    try {
        await pool.query("UPDATE reminders SET is_read = 1 WHERE id = $1", [req.params.id]);
        res.json({ success: true });
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
