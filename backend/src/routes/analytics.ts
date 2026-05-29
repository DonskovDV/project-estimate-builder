import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/summary', async (_req, res, next) => {
  try {
    const [
      totalProjects,
      totalEstimates,
      allEstimates,
      projectsByStatus,
      projectsByType,
      estimateServices,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.estimate.count(),
      prisma.estimate.findMany({ select: { totalPrice: true, marginPercent: true, warnings: true } }),
      prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.project.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.estimateService.findMany({
        select: { service: { select: { name: true } } },
      }),
    ]);

    const averagePrice =
      totalEstimates > 0
        ? allEstimates.reduce((s, e) => s + e.totalPrice, 0) / totalEstimates
        : 0;

    const averageMargin =
      totalEstimates > 0
        ? allEstimates.reduce((s, e) => s + e.marginPercent, 0) / totalEstimates
        : 0;

    const lowMarginEstimates = allEstimates.filter((e) => {
      const warnings = JSON.parse(e.warnings) as string[];
      return warnings.includes('low_margin_warning');
    }).length;

    // Top-5 services by usage
    const serviceCounts: Record<string, number> = {};
    for (const es of estimateServices) {
      const name = es.service.name;
      serviceCounts[name] = (serviceCounts[name] ?? 0) + 1;
    }
    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([serviceName, usageCount]) => ({ serviceName, usageCount }));

    res.json({
      totalProjects,
      totalEstimates,
      averagePrice: Math.round(averagePrice),
      averageMargin: Math.round(averageMargin),
      projectsByStatus: Object.fromEntries(projectsByStatus.map((r) => [r.status, r._count._all])),
      projectsByType: Object.fromEntries(projectsByType.map((r) => [r.type, r._count._all])),
      topServices,
      lowMarginEstimates,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
