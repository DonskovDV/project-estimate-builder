import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const PROJECT_TYPES = ['clinic_website', 'ecommerce', 'corporate_website', 'seo', 'crm_integration', 'support'] as const;
const PROJECT_STATUSES = ['draft', 'calculated', 'sent', 'approved', 'rejected', 'archived'] as const;

const createProjectSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1),
  type: z.enum(PROJECT_TYPES),
  description: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new AppError(404, 'Клиент не найден');
    const project = await prisma.project.create({
      data,
      include: { client: true },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { status, type, clientId } = req.query;
    const projects = await prisma.project.findMany({
      where: {
        ...(status ? { status: String(status) } : {}),
        ...(type ? { type: String(type) } : {}),
        ...(clientId ? { clientId: Number(clientId) } : {}),
      },
      include: {
        client: true,
        _count: { select: { estimates: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: true,
        estimates: {
          orderBy: { version: 'desc' },
          include: {
            services: { include: { service: true } },
          },
        },
      },
    });
    if (!project) throw new AppError(404, 'Проект не найден');
    res.json(project);
  } catch (err) {
    next(err);
  }
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  type: z.enum(PROJECT_TYPES).optional(),
  description: z.string().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!project) throw new AppError(404, 'Проект не найден');
    const updated = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data,
      include: { client: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { estimates: true } } },
    });
    if (!project) throw new AppError(404, 'Проект не найден');
    if (project._count.estimates > 0) {
      throw new AppError(409, `Нельзя удалить проект — у него есть ${project._count.estimates} расчёт(ов). Сначала удалите расчёты.`);
    }
    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!project) throw new AppError(404, 'Проект не найден');
    const updated = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { client: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
