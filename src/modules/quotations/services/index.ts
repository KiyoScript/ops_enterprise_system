// Composition root: services get their repository implementations here, so
// everything else depends only on interfaces.
import { PrismaCustomerRepository } from "@/modules/shared/repositories/customer-repository";
import { PrismaActivityLogRepository } from "@/modules/shared/repositories/activity-log-repository";
import { PrismaQuotationRepository } from "../repositories/quotation-repository";
import { QuotationService } from "./quotation-service";

let quotationService: QuotationService | undefined;

export function getQuotationService(): QuotationService {
  quotationService ??= new QuotationService(
    new PrismaQuotationRepository(),
    new PrismaCustomerRepository(),
    new PrismaActivityLogRepository()
  );
  return quotationService;
}
