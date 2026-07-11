import { NotFoundError } from "@/lib/errors";
import { type Actor } from "@/lib/authz";
import { assertCan } from "@/lib/ability";
import type { IActivityLogRepository } from "@/modules/shared/repositories/activity-log-repository";
import type {
  IInquiryRepository,
  InquiryRecord,
} from "../repositories/inquiry-repository";
import type {
  InquiryCreateInput,
  InquiryListFilters,
  InquiryPageDto,
  InquiryRowDto,
  InquiryUpdateInput,
} from "../schemas/inquiry";

export class InquiryService {
  constructor(
    private readonly inquiries: IInquiryRepository,
    private readonly activity: IActivityLogRepository
  ) {}

  async list(
    _actor: Actor,
    filters: InquiryListFilters
  ): Promise<InquiryPageDto> {
    const { rows, nextCursor } = await this.inquiries.listPage(filters);
    return { rows: rows.map(mapRow), nextCursor };
  }

  async get(_actor: Actor, id: string): Promise<InquiryRowDto> {
    const record = await this.inquiries.findById(id);
    if (!record) throw new NotFoundError("Inquiry not found.");
    return mapRow(record);
  }

  async create(actor: Actor, input: InquiryCreateInput): Promise<{ id: string }> {
    assertCan(actor, "create", "Inquiry");
    const created = await this.inquiries.create({
      customerName: input.customerName,
      contactNumber: input.contactNumber || null,
      medium: input.medium,
      servicesRequested: input.servicesRequested,
      notes: input.notes || null,
      createdById: actor.id,
    });
    await this.activity.log({
      userId: actor.id,
      entityType: "Inquiry",
      entityId: created.id,
      action: "create",
      payload: { customerName: input.customerName, medium: input.medium },
    });
    return created;
  }

  async update(actor: Actor, input: InquiryUpdateInput): Promise<void> {
    assertCan(actor, "update", "Inquiry");
    const record = await this.inquiries.findById(input.id);
    if (!record) throw new NotFoundError("Inquiry not found.");
    await this.inquiries.update(input.id, {
      customerName: input.customerName,
      contactNumber: input.contactNumber || null,
      medium: input.medium,
      servicesRequested: input.servicesRequested,
      notes: input.notes || null,
    });
    await this.activity.log({
      userId: actor.id,
      entityType: "Inquiry",
      entityId: input.id,
      action: "update",
      payload: { customerName: input.customerName },
    });
  }
}

function mapRow(record: InquiryRecord): InquiryRowDto {
  return {
    id: record.id,
    customerName: record.customerName,
    contactNumber: record.contactNumber,
    medium: record.medium,
    servicesRequested: record.servicesRequested,
    notes: record.notes,
    quotationId: record.quotationId,
    quoteNumber: record.quotation?.quoteNumber ?? null,
    quoteStatus: record.quotation?.status ?? null,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdBy.name,
  };
}
