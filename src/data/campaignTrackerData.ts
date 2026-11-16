export interface Creator {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  platforms: string[];
}

export interface ContentItem {
  id: string;
  type: "image" | "video" | "reel" | "story" | "carousel";
  title: string;
  url?: string;
  thumbnail?: string;
  platform: string;
  status: "draft" | "pending" | "approved" | "published";
  dueDate?: string;
  notes?: string;
  source?: string;
}

export interface CampaignComment {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export interface CampaignAttachment {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  comment?: string;
  contentType?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface CampaignData {
  id: string;
  creatorId: string;
  brand: string;
  launchDate: string;
  activity: string;
  liveDate: string;
  agPrice: number | null;
  creatorFee: number | null;
  shot: string;
  complete: string;
  invoiceNo: string;
  paid: string;
  includesVat: string;
  currency: string;
  brandPOs: string;
  paymentTerms: string;
  content?: ContentItem[];
  notes?: string;
  campaign_comments?: CampaignComment[];
  campaign_attachments?: CampaignAttachment[];
  secondaryStatus?: string;
  invoiceStatus?: string | null;
  xeroInvoiceId?: string | null;
  custom_fields?: Record<string, unknown>;
}
