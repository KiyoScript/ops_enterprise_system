// Composition root: services get their repository implementations here, so
// everything else depends only on interfaces.
import { PrismaCustomerRepository } from "@/modules/shared/repositories/customer-repository";
import { PrismaActivityLogRepository } from "@/modules/shared/repositories/activity-log-repository";
import { PrismaJobOrderRepository } from "../repositories/job-order-repository";
import { JobOrderService } from "./job-order-service";
import { LegacyImportService } from "./legacy-import-service";

let jobOrderService: JobOrderService | undefined;
let legacyImportService: LegacyImportService | undefined;

export function getJobOrderService(): JobOrderService {
  jobOrderService ??= new JobOrderService(
    new PrismaJobOrderRepository(),
    new PrismaCustomerRepository(),
    new PrismaActivityLogRepository()
  );
  return jobOrderService;
}

export function getLegacyImportService(): LegacyImportService {
  legacyImportService ??= new LegacyImportService(
    new PrismaJobOrderRepository(),
    new PrismaCustomerRepository(),
    new PrismaActivityLogRepository()
  );
  return legacyImportService;
}
