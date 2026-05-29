import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const RU_PHONE_RE = /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;

const clientSchema = z.object({
  companyName:   z.string().min(1, 'Название компании обязательно'),
  contactPerson: z.string().min(1, 'Контактное лицо обязательно'),
  phone: z
    .string()
    .min(1, 'Телефон обязателен')
    .regex(RU_PHONE_RE, 'Неверный формат телефона (пример: +7 (999) 123-45-67)'),
  email:   z.string().min(1, 'Email обязателен').email('Неверный формат email'),
  comment: z.string().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    const existing = await prisma.client.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Клиент с таким email уже существует');
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { projects: true } } },
    });
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: Number(req.params.id) } });
    if (!client) throw new AppError(404, 'Клиент не найден');
    if (data.email && data.email !== client.email) {
      const existing = await prisma.client.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError(409, 'Клиент с таким email уже существует');
    }
    const updated = await prisma.client.update({ where: { id: Number(req.params.id) }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!client) throw new AppError(404, 'Клиент не найден');
    if (client._count.projects > 0) {
      throw new AppError(409, `Нельзя удалить клиента — у него есть ${client._count.projects} проект(ов). Сначала удалите проекты.`);
    }
    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
      include: { projects: { orderBy: { createdAt: 'desc' } } },
    });
    if (!client) throw new AppError(404, 'Клиент не найден');
    res.json(client);
  } catch (err) {
    next(err);
  }
});

export default router;
