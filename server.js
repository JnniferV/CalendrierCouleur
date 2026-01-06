const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Use environment port for Hostinger or 3000 default
const DATA_FILE = path.join(__dirname, 'allocations.json');

// Middleware
app.use(cors()); 
app.use(express.json());

// --- SECURITY & STATIC FILES ---

// 1. Block access to backend files
app.use((req, res, next) => {
    const sensitiveFiles = ['server.js', 'package.json', 'package-lock.json', 'allocations.json', '.env'];
    if (sensitiveFiles.some(file => req.url.includes(file))) {
        return res.status(403).send('Forbidden');
    }
    next();
});

// 2. Serve static frontend files (html, css, js)
app.use(express.static(__dirname));

// --- DATA HELPERS ---
const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return [];
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("Error writing DB:", err);
        return false;
    }
};

// --- API Endpoints ---

app.get('/api/allocations', (req, res) => {
    const data = readData();
    res.json(data);
});

app.post('/api/allocations', (req, res) => {
    const { date, personId } = req.body;
    if (!date || !personId) return res.status(400).json({ error: 'Missing date or personId' });

    let data = readData();
    const index = data.findIndex(item => item[0] === date);
    
    if (index !== -1) {
        data[index] = [date, personId];
    } else {
        data.push([date, personId]);
    }

    if (writeData(data)) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to save data' });
});

app.delete('/api/allocations', (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    let data = readData();
    const newData = data.filter(item => item[0] !== date);

    if (writeData(newData)) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to save data' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
