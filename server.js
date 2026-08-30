const express = require('express');
const path = require('path');
const app = express();

const rootDir = __dirname;
const indexFile = path.join(rootDir, 'index.html');

app.use(express.static(rootDir));

// Vercel/Express: explicitly serve the SPA entry point at the root.
app.get('/', (_req, res) => {
  res.sendFile(indexFile);
});

// Keep client-side navigation working for the standalone SPA.
app.get('*', (req, res, next) => {
  if (req.path.includes('.')) return next();
  res.sendFile(indexFile);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
