const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

