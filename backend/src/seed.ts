import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Wipe in dependency order
  await prisma.estimateService.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.project.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();

  // ── Clients ──────────────────────────────────────────────────────────────────
  const [c1, c2, c3, c4, c5] = await Promise.all([
    prisma.client.create({ data: { companyName: 'ТехКорп ООО',       contactPerson: 'Иван Петров',      phone: '+7 (495) 123-45-67', email: 'info@techcorp.ru',       comment: 'Постоянный клиент, крупный бюджет' } }),
    prisma.client.create({ data: { companyName: 'Startup.io',         contactPerson: 'Анна Сидорова',    phone: '+7 (916) 987-65-43', email: 'hello@startup.io',       comment: 'Новый клиент, стартап' } }),
    prisma.client.create({ data: { companyName: 'МегаШоп',           contactPerson: 'Сергей Козлов',    phone: '+7 (812) 555-11-22', email: 'marketing@megashop.ru'  } }),
    prisma.client.create({ data: { companyName: 'Клиника «Здоровье»', contactPerson: 'Мария Новикова',   phone: '+7 (495) 321-00-11', email: 'info@zdorovye-clinic.ru', comment: 'Медицинский центр, нужен SEO' } }),
    prisma.client.create({ data: { companyName: 'АвтоДилер Плюс',    contactPerson: 'Дмитрий Захаров',  phone: '+7 (903) 444-55-66', email: 'sales@autodilerplus.ru' } }),
  ]);

  // ── Services ─────────────────────────────────────────────────────────────────
  const svcs = await prisma.$transaction([
    // design (0, 1)
    prisma.service.create({ data: { name: 'Дизайн главной страницы',          category: 'design',      basePrice: 50000,  baseDays: 7,   isRequired: false, isActive: true,  costPrice: 30000 } }),
    prisma.service.create({ data: { name: 'Дизайн внутренних страниц',        category: 'design',      basePrice: 30000,  baseDays: 5,   isRequired: false, isActive: true,  costPrice: 18000 } }),
    // frontend (2, 3)
    prisma.service.create({ data: { name: 'Вёрстка (Frontend)',               category: 'frontend',    basePrice: 60000,  baseDays: 10,  isRequired: false, isActive: true,  costPrice: 40000 } }),
    prisma.service.create({ data: { name: 'React SPA разработка',             category: 'frontend',    basePrice: 80000,  baseDays: 14,  isRequired: false, isActive: true,  costPrice: 50000 } }),
    // backend (4, 5)
    prisma.service.create({ data: { name: 'Backend API (Node.js)',             category: 'backend',     basePrice: 90000,  baseDays: 14,  isRequired: false, isActive: true,  costPrice: 60000 } }),
    prisma.service.create({ data: { name: 'Настройка каталога товаров',       category: 'backend',     basePrice: 45000,  baseDays: 8,   isRequired: false, isActive: true,  costPrice: 28000 } }),
    // cms (6)
    prisma.service.create({ data: { name: 'Настройка CMS (WordPress/1С-Б)',   category: 'cms',         basePrice: 25000,  baseDays: 5,   isRequired: false, isActive: true,  costPrice: 15000 } }),
    // seo (7, 8)
    prisma.service.create({ data: { name: 'SEO-оптимизация (базовая)',        category: 'seo',         basePrice: 40000,  baseDays: 10,  isRequired: false, isActive: true,  costPrice: 25000 } }),
    prisma.service.create({ data: { name: 'SEO-продвижение (расширенное)',    category: 'seo',         basePrice: 70000,  baseDays: 20,  isRequired: false, isActive: true,  costPrice: 45000 } }),
    // analytics (9)
    prisma.service.create({ data: { name: 'Настройка аналитики (GA4 + Я.М)', category: 'analytics',   basePrice: 20000,  baseDays: 3,   isRequired: false, isActive: true,  costPrice: 12000 } }),
    // integration (10, 11)
    prisma.service.create({ data: { name: 'Интеграция с CRM',                 category: 'integration', basePrice: 50000,  baseDays: 7,   isRequired: false, isActive: true,  costPrice: 35000 } }),
    prisma.service.create({ data: { name: 'Интеграция с 1С',                  category: 'integration', basePrice: 60000,  baseDays: 10,  isRequired: false, isActive: true,  costPrice: 40000 } }),
    // support (12)
    prisma.service.create({ data: { name: 'Техническая поддержка (3 мес)',    category: 'support',     basePrice: 30000,  baseDays: 90,  isRequired: false, isActive: true,  costPrice: 18000 } }),
    // management (13)
    prisma.service.create({ data: { name: 'Управление проектом',              category: 'management',  basePrice: 35000,  baseDays: 20,  isRequired: true,  isActive: true,  costPrice: 20000 } }),
    // inactive (14)
    prisma.service.create({ data: { name: 'Устаревший дизайн-шаблон',         category: 'design',      basePrice: 5000,   baseDays: 2,   isRequired: false, isActive: false, costPrice: 4000  } }),
  ]);

  const id = (i: number) => svcs[i].id;

  // ── Projects ──────────────────────────────────────────────────────────────────
  const [p1, p2, p3, p4, p5, p6, p7, p8] = await Promise.all([
    prisma.project.create({ data: { clientId: c1.id, name: 'Корпоративный сайт ТехКорп',      type: 'corporate_website', description: 'Редизайн с новым брендбуком',              status: 'approved'   } }),
    prisma.project.create({ data: { clientId: c2.id, name: 'Интернет-магазин Startup.io',      type: 'ecommerce',         description: 'Магазин электроники с интеграцией 1С',     status: 'sent'       } }),
    prisma.project.create({ data: { clientId: c3.id, name: 'SEO-продвижение МегаШоп',          type: 'seo',               description: 'Комплексное SEO на 6 месяцев',             status: 'approved'   } }),
    prisma.project.create({ data: { clientId: c1.id, name: 'CRM-интеграция ТехКорп',           type: 'crm_integration',   description: 'Интеграция с Битрикс24',                   status: 'calculated' } }),
    prisma.project.create({ data: { clientId: c4.id, name: 'Сайт клиники «Здоровье»',          type: 'clinic_website',    description: 'Лендинг + запись на приём',                status: 'sent'       } }),
    prisma.project.create({ data: { clientId: c4.id, name: 'SEO для клиники',                  type: 'seo',               description: 'Локальное SEO-продвижение',                status: 'draft'      } }),
    prisma.project.create({ data: { clientId: c5.id, name: 'Интернет-магазин АвтоДилер',       type: 'ecommerce',         description: 'Каталог автомобилей с онлайн-заявками',    status: 'calculated' } }),
    prisma.project.create({ data: { clientId: c2.id, name: 'Техподдержка Startup.io',          type: 'support',           description: 'Ежемесячная поддержка после запуска',      status: 'rejected'   } }),
  ]);

  const coefficients: Record<string, number> = { low: 1.0, medium: 1.3, high: 1.6 };

  async function makeEstimate(
    projectId: number,
    version: number,
    svcIdxs: number[],
    complexity: string,
    discount: number,
    extraCharge: number,
    comment?: string,
    status: string = 'draft',
  ) {
    const svcList = svcIdxs.map((i) => svcs[i]);
    const coeff = coefficients[complexity];
    const baseTotal = svcList.reduce((s, sv) => s + sv.basePrice, 0);
    const complexityTotal = baseTotal * coeff;
    let totalPrice = complexityTotal - discount + extraCharge;
    if (totalPrice < 0) totalPrice = 0;
    const totalDays = Math.ceil(svcList.reduce((s, sv) => s + sv.baseDays, 0) * coeff);
    const totalCost = svcList.reduce((s, sv) => s + (sv.costPrice ?? 0), 0);
    const marginPercent = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    const warnings = marginPercent < 25 ? ['low_margin_warning'] : [];

    return prisma.estimate.create({
      data: {
        projectId, version, complexity, discount, extraCharge,
        totalPrice, totalDays, marginPercent, comment, status,
        warnings: JSON.stringify(warnings),
        services: { create: svcIdxs.map((i) => ({ serviceId: svcs[i].id })) },
      },
    });
  }

  // p1 — Корпоративный сайт ТехКорп: 3 версии (одобрён финальный)
  await makeEstimate(p1.id, 1, [0, 2, 4, 9, 13],       'medium', 0,     0,     'Первичный расчёт');
  await makeEstimate(p1.id, 2, [0, 1, 2, 4, 9, 13],    'medium', 15000, 0,     'Добавили внутренние страницы');
  await makeEstimate(p1.id, 3, [0, 1, 2, 4, 6, 9, 13], 'high',   20000, 5000,  'Финальный, с CMS и доп. наценкой', 'approved');

  // p2 — Интернет-магазин Startup.io: 2 версии
  await makeEstimate(p2.id, 1, [0, 2, 3, 4, 10, 5, 13], 'high',  0,     0,     'Базовый расчёт');
  await makeEstimate(p2.id, 2, [0, 2, 3, 4, 11, 5, 9, 6, 13], 'high', 30000, 0, 'Расширенный: 1С + аналитика + CMS', 'approved');

  // p3 — SEO МегаШоп: 2 версии
  await makeEstimate(p3.id, 1, [7, 9, 13],              'medium', 5000,  0,     'Базовая оптимизация');
  await makeEstimate(p3.id, 2, [7, 8, 9, 13],           'medium', 0,     0,     'Расширенное + реклама', 'approved');

  // p4 — CRM ТехКорп: 1 версия
  await makeEstimate(p4.id, 1, [10, 13],                'low',    0,     0,     'Интеграция Битрикс24');

  // p5 — Сайт клиники: 3 версии
  await makeEstimate(p5.id, 1, [0, 2, 13],              'low',    0,     0,     'Простой лендинг');
  await makeEstimate(p5.id, 2, [0, 1, 2, 9, 13],        'medium', 0,     0,     'С аналитикой и внутренними страницами');
  await makeEstimate(p5.id, 3, [0, 1, 2, 4, 7, 9, 13], 'medium', 10000, 0,     'Полный сайт + базовый SEO', 'approved');

  // p6 — SEO для клиники: 1 версия (черновик)
  await makeEstimate(p6.id, 1, [7, 9, 13],              'low',    0,     0,     'Предварительная оценка');

  // p7 — Интернет-магазин АвтоДилер: 2 версии
  await makeEstimate(p7.id, 1, [0, 2, 4, 5, 13],        'high',   0,     0,     'MVP с каталогом');
  await makeEstimate(p7.id, 2, [0, 1, 2, 3, 4, 5, 11, 9, 12, 13], 'high', 50000, 10000, 'Полный: SPA + 1С + поддержка');

  // p8 — Техподдержка Startup.io: 1 версия (отклонён)
  await makeEstimate(p8.id, 1, [12, 13],                'low',    0,     0,     'Ежемесячная поддержка', 'rejected');

  console.log(
    `Seed OK: 5 clients, 8 projects, ${svcs.length} services, 15 estimates (up to v3)`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
