// Composition root: services get their repository implementations here, so
// everything else depends only on interfaces.
import { PrismaCustomerRepository } from "@/modules/shared/repositories/customer-repository";
import { PrismaActivityLogRepository } from "@/modules/shared/repositories/activity-log-repository";
import { PrismaJobOrderRepository } from "@/modules/job-orders/repositories/job-order-repository";
import { PrismaQuotationRepository } from "../repositories/quotation-repository";
import { PrismaInquiryRepository } from "../repositories/inquiry-repository";
import { QuotationService } from "./quotation-service";
import { InquiryService } from "./inquiry-service";

let quotationService: QuotationService | undefined;
let inquiryService: InquiryService | undefined;

export function getQuotationService(): QuotationService {
  quotationService ??= new QuotationService(
    new PrismaQuotationRepository(),
    new PrismaCustomerRepository(),
    new PrismaActivityLogRepository(),
    // JO repo powers quote → JO conversion (numbering + creation);
    // inquiry repo links Inquiry → Quotation on create.
    new PrismaJobOrderRepository(),
    new PrismaInquiryRepository()
  );
  return quotationService;
}

export function getInquiryService(): InquiryService {
  inquiryService ??= new InquiryService(
    new PrismaInquiryRepository(),
    new PrismaActivityLogRepository()
  );
  return inquiryService;
}
