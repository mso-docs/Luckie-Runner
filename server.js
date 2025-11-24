const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the game directory
app.use(express.static(path.join(__dirname, 'game')));

// Serve the main game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Something went wrong!');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`🎮 Luckie Runner server running on http://localhost:${PORT}`);
    console.log('📁 Serving game files from /game directory');
    console.log('🚀 Ready to help Luckie get to the cafe on time!');
});