const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the src/ui directory
app.use(express.static(path.join(__dirname, 'src/ui')));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/ui', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DentRecords Web App is running on http://localhost:${PORT}`);
});
