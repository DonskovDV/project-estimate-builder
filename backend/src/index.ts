import express from 'express';
import cors from 'cors';
import path from 'path';
import clientsRouter from './routes/clients';
import projectsRouter from './routes/projects';
import servicesRouter from './routes/services';
import estimatesRouter from './routes/estimates';
import estimateByIdRouter from './routes/estimateById';
import analyticsRouter from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/api/clients', clientsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:id/estimates', estimatesRouter);
app.use('/api/estimates', estimateByIdRouter);
app.use('/api/services', servicesRouter);
app.use('/api/analytics', analyticsRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
