import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/estimates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        project: { include: { client: true } },
        services: { include: { service: true } },
      },
    });
    if (!estimate) throw new AppError(404, 'Расчет не найден');
    res.json({ ...estimate, warnings: JSON.parse(estimate.warnings) });
  } catch (err) {
    next(err);
  }
});

const ESTIMATE_STATUSES = ['draft', 'approved', 'rejected'] as const;

const statusSchema = z.object({
  status: z.enum(ESTIMATE_STATUSES, {
    errorMap: () => ({ message: `Статус должен быть одним из: ${ESTIMATE_STATUSES.join(', ')}` }),
  }),
});

// PATCH /api/estimates/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const estimate = await prisma.estimate.findUnique({ where: { id: Number(req.params.id) } });
    if (!estimate) throw new AppError(404, 'Расчет не найден');
    const updated = await prisma.estimate.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { services: { include: { service: true } } },
    });
    res.json({ ...updated, warnings: JSON.parse(updated.warnings) });
  } catch (err) {
    next(err);
  }
});

export default router;
