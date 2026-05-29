import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { calculateEstimate } from '../services/estimateCalculator';

const router = Router({ mergeParams: true });

const createEstimateSchema = z.object({
  serviceIds: z.array(z.number().int().positive()).min(1),
  complexity: z.enum(['low', 'medium', 'high']),
  discount: z.number().nonnegative().default(0),
  extraCharge: z.number().nonnegative().default(0),
  comment: z.string().optional(),
});

// POST /api/projects/:id/estimates
router.post('/', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'Проект не найден');

    const input = createEstimateSchema.parse(req.body);

    const services = await prisma.service.findMany({
      where: { id: { in: input.serviceIds } },
    });

    if (services.length !== input.serviceIds.length) {
      const foundIds = services.map((s) => s.id);
      const missing = input.serviceIds.filter((id) => !foundIds.includes(id));
      throw new AppError(400, `Услуги не найдены: ${missing.join(', ')}`);
    }

    const result = calculateEstimate({
      services,
      complexity: input.complexity,
      discount: input.discount,
      extraCharge: input.extraCharge,
    });

    // Determine next version number
    const lastEstimate = await prisma.estimate.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    const version = (lastEstimate?.version ?? 0) + 1;

    const estimate = await prisma.estimate.create({
      data: {
        projectId,
        version,
        complexity: input.complexity,
        discount: input.discount,
        extraCharge: input.extraCharge,
        totalPrice: result.totalPrice,
        totalDays: result.totalDays,
        marginPercent: result.marginPercent,
        comment: input.comment,
        warnings: JSON.stringify(result.warnings),
        services: {
          create: input.serviceIds.map((sid) => ({ serviceId: sid })),
        },
      },
      include: {
        services: { include: { service: true } },
      },
    });

    // Update project status to 'calculated'
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'calculated' },
    });

    res.status(201).json({
      ...estimate,
      warnings: JSON.parse(estimate.warnings),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/estimates
router.get('/', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'Проект не найден');

    const estimates = await prisma.estimate.findMany({
      where: { projectId },
      orderBy: { version: 'asc' },
      include: {
        services: { include: { service: true } },
      },
    });

    res.json(
      estimates.map((e) => ({ ...e, warnings: JSON.parse(e.warnings) })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
