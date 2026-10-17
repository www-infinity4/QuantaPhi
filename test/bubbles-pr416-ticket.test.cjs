const fs = require('fs');
const path = require('path');

// Resolve the absolute path to the ticket file relative to the repository root
const ticketPath = path.resolve(__dirname, '..', 'work-tickets', 'bubbles-pr416-verification.md');

if (!fs.existsSync(ticketPath)) {
  console.error('Ticket file missing:', ticketPath);
  process.exit(1);
}

process.exit(0);
