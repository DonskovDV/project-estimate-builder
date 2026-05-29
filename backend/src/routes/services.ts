import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const SERVICE_CATEGORIES = ['design', 'frontend', 'backend', 'cms', 'seo', 'analytics', 'integration', 'support', 'management'] as const;

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(SERVICE_CATEGORIES),
  basePrice: z.number().positive(),
  baseDays: z.number().int().positive(),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  costPrice: z.number().nonnegative().optional(),
});

const updateServiceSchema = serviceSchema.partial();

router.get('/', async (req, res, next) => {
  try {
    const { category, isActive } = req.query;
    const services = await prisma.service.findMany({
      where: {
        ...(category ? { category: String(category) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateServiceSchema.parse(req.body);
    const existing = await prisma.service.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new AppError(404, 'Услуга не найдена');
    const service = await prisma.service.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

export default router;
