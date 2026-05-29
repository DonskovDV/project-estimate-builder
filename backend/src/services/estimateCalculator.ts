import { Service } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export const COMPLEXITY_COEFFICIENTS: Record<string, number> = {
  low: 1.0,
  medium: 1.3,
  high: 1.6,
};

export interface EstimateInput {
  services: Service[];
  complexity: string;
  discount: number;
  extraCharge: number;
}

export interface EstimateResult {
  baseTotal: number;
  complexityTotal: number;
  totalPrice: number;
  totalDays: number;
  marginPercent: number;
  warnings: string[];
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const { services, complexity, discount, extraCharge } = input;

  if (services.length === 0) {
    throw new AppError(400, 'Нельзя создать расчет без услуг');
  }

  const inactiveServices = services.filter((s) => !s.isActive);
  if (inactiveServices.length > 0) {
    throw new AppError(
      400,
      `Нельзя выбрать неактивные услуги: ${inactiveServices.map((s) => s.name).join(', ')}`,
    );
  }

  const coeff = COMPLEXITY_COEFFICIENTS[complexity];
  if (!coeff) {
    throw new AppError(400, `Неизвестная сложность: ${complexity}`);
  }

  const baseTotal = services.reduce((sum, s) => sum + s.basePrice, 0);
  const complexityTotal = baseTotal * coeff;

  // Discount max 30%
  const maxDiscount = complexityTotal * 0.3;
  if (discount > maxDiscount) {
    throw new AppError(
      400,
      `Скидка не может быть больше 30% от суммы (максимум ${maxDiscount.toFixed(2)} ₽)`,
    );
  }

  let totalPrice = complexityTotal - discount + extraCharge;
  if (totalPrice < 0) totalPrice = 0;

  const rawDays = services.reduce((sum, s) => sum + s.baseDays, 0);
  const totalDays = Math.ceil(rawDays * coeff);

  if (totalDays < 3) {
    throw new AppError(400, 'Срок проекта не может быть меньше 3 дней');
  }

  const totalCost = services.reduce((sum, s) => sum + (s.costPrice ?? 0), 0);

  // Total price cannot be less than cost
  if (totalPrice < totalCost) {
    throw new AppError(
      400,
      `Итоговая цена (${totalPrice} ₽) не может быть ниже себестоимости (${totalCost} ₽)`,
    );
  }

  const marginPercent = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

  const warnings: string[] = [];
  if (marginPercent < 25) {
    warnings.push('low_margin_warning');
  }

  return { baseTotal, complexityTotal, totalPrice, totalDays, marginPercent, warnings };
}
