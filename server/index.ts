import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/index.js';
import ingestRouter from './routes/ingest.js';
import excerptsRouter from './routes/excerpts.js';
import graphRouter from './routes/graph.js';
import sourcesRouter from './routes/sources.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allows your Vite frontend to talk to this backend
app.use(express.json());

// Initialize Database
initDb();

// Routes
app.use('/api/ingest', ingestRouter);
app.use('/api/excerpts', excerptsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/sources', sourcesRouter);

app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`⚙️ The Epistemology Engine Backend`);
    console.log(`=========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
});