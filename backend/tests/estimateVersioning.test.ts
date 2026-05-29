/**
 * Integration test: estimate versioning
 *
 * Verifies that version numbers increment correctly when multiple estimates
 * are created for the same project.
 *
 * Uses a dedicated test.db (SQLite) and tears it down after the suite.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.resolve(__dirname, '../prisma/test.db');
const TEST_DB_URL = `file:${TEST_DB}`;

let prisma: PrismaClient;

beforeAll(() => {
  // Apply migrations to the test database
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function createTestClient() {
  return prisma.client.create({
    data: {
      companyName: 'Test Co',
      contactPerson: 'Test Person',
      phone: '+7 (999) 000-00-00',
      email: `test-${Date.now()}@test.ru`,
    },
  });
}

async function createTestProject(clientId: number) {
  return prisma.project.create({
    data: { clientId, name: 'Test Project', type: 'ecommerce' },
  });
}

async function createTestService() {
  return prisma.service.create({
    data: {
      name: 'Test Service',
      category: 'design',
      basePrice: 10000,
      baseDays: 5,
      isActive: true,
      costPrice: 5000,
    },
  });
}

/** Replicates the version-picking logic from the route */
async function getNextVersion(projectId: number): Promise<number> {
  const last = await prisma.estimate.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  return (last?.version ?? 0) + 1;
}

async function createEstimate(projectId: number, serviceId: number) {
  const version = await getNextVersion(projectId);
  return prisma.estimate.create({
    data: {
      projectId,
      version,
      complexity: 'low',
      discount: 0,
      extraCharge: 0,
      totalPrice: 10000,
      totalDays: 5,
      marginPercent: 50,
      warnings: '[]',
      services: { create: [{ serviceId }] },
    },
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('Estimate versioning', () => {
  it('first estimate gets version 1', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const service = await createTestService();

    const estimate = await createEstimate(project.id, service.id);

    expect(estimate.version).toBe(1);
  });

  it('second estimate gets version 2', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const service = await createTestService();

    await createEstimate(project.id, service.id);
    const v2 = await createEstimate(project.id, service.id);

    expect(v2.version).toBe(2);
  });

  it('third estimate gets version 3', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const service = await createTestService();

    await createEstimate(project.id, service.id);
    await createEstimate(project.id, service.id);
    const v3 = await createEstimate(project.id, service.id);

    expect(v3.version).toBe(3);
  });

  it('versions are independent per project', async () => {
    const client = await createTestClient();
    const svc = await createTestService();

    const projectA = await createTestProject(client.id);
    const projectB = await createTestProject(client.id);

    // Project A gets 2 estimates
    await createEstimate(projectA.id, svc.id);
    const a2 = await createEstimate(projectA.id, svc.id);

    // Project B starts fresh at v1
    const b1 = await createEstimate(projectB.id, svc.id);

    expect(a2.version).toBe(2);
    expect(b1.version).toBe(1);
  });

  it('db enforces unique (projectId, version) constraint', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const svc = await createTestService();

    await prisma.estimate.create({
      data: {
        projectId: project.id,
        version: 1,
        complexity: 'low',
        discount: 0,
        extraCharge: 0,
        totalPrice: 5000,
        totalDays: 3,
        marginPercent: 40,
        warnings: '[]',
        services: { create: [{ serviceId: svc.id }] },
      },
    });

    // Trying to insert version 1 again must throw
    await expect(
      prisma.estimate.create({
        data: {
          projectId: project.id,
          version: 1, // duplicate!
          complexity: 'low',
          discount: 0,
          extraCharge: 0,
          totalPrice: 5000,
          totalDays: 3,
          marginPercent: 40,
          warnings: '[]',
          services: { create: [{ serviceId: svc.id }] },
        },
      }),
    ).rejects.toThrow();
  });
});
