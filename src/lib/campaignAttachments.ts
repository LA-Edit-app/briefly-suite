import { supabase } from "@/integrations/supabase/client";

export const CAMPAIGN_ATTACHMENTS_BUCKET = "campaign-attachments";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export function isValidAttachmentFile(file: File): { valid: boolean; reason?: string } {
  if (!ACCEPTED_ATTACHMENT_TYPES[file.type]) {
    return { valid: false, reason: "Unsupported file type. Accepted: PDF, DOC, DOCX, PNG, JPG, WEBP." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { valid: false, reason: "File exceeds 10 MB limit." };
  }
  return { valid: true };
}

export function buildAttachmentPath(agencyId: string, campaignId: string | number, file: File): string {
  const ext = ACCEPTED_ATTACHMENT_TYPES[file.type] ?? "";
  const uuid = crypto.randomUUID();
  return `${agencyId}/${campaignId}/${uuid}${ext}`;
}

export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CAMPAIGN_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1-hour signed URL
  if (error || !data) return null;
  return data.signedUrl;
}
