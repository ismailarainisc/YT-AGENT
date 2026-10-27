import express from 'express';
import path from 'path';
import fs from 'fs';
import { app } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;
const distPath = path.resolve(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube Studio AI Agent production server running on port ${PORT}`);
});
