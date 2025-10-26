import express from 'express';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 8080;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Compression
app.use(compression());

// Redirect HTTP -> HTTPS quando atrás de proxy (Azure usa x-forwarded-proto)
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Canonical redirect de www para raiz
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host === 'www.codecraftgenz.com.br') {
    return res.redirect(301, `https://codecraftgenz.com.br${req.originalUrl}`);
  }
  next();
});

const staticDir = path.join(__dirname, 'dist');
app.use(express.static(staticDir, { maxAge: '7d' }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});