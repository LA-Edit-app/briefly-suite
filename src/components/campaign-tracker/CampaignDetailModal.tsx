import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Paperclip, Trash2, Download, Send, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { CampaignData, ContentItem, Creator, CampaignComment, CampaignAttachment } from "@/data/campaignTrackerData";
import type { ColumnDefinition } from "@/hooks/useColumnSchemas";
import { SYSTEM_COLUMN_KEYS } from "@/hooks/useColumnSchemas";
import { DatePickerCell } from "@/components/campaign-tracker/DatePickerCell";
import { useUpdateCampaign } from "@/hooks/useCampaigns";
import { useProfile } from "@/hooks/useDatabase";
import { useAgencyId } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPAIGN_ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_BYTES,
  ACCEPTED_ATTACHMENT_TYPES,
  isValidAttachmentFile,
  buildAttachmentPath,
  getAttachmentUrl,
} from "@/lib/campaignAttachments";

// ── Static select options (mirrors CreateCampaignDialog) ──────────────────────
const SYSTEM_SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  complete: [
    { value: "Pending", label: "Pending" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
  ],
  detailStatus: [
    { value: "None", label: "None" },
    { value: "Awaiting details", label: "Awaiting details" },
  ],
  paid: [
    { value: "CHASED", label: "CHASED" },
    { value: "17 Oct", label: "17 Oct" },
    { value: "OCT", label: "OCT" },
    { value: "NOV", label: "NOV" },
    { value: "DEC", label: "DEC" },
  ],
  includesVat: [
    { value: "VAT", label: "VAT" },
    { value: "NO VAT", label: "NO VAT" },
  ],
  currency: [
    { value: "GBP", label: "GBP" },
    { value: "EUR", label: "EUR" },
  ],
};

const ATTACHMENT_CONTENT_TYPES = ["Brief", "Contract", "Image", "Reference", "Other"] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CampaignDetailModalProps {
  campaign: CampaignData | null;
  creator: Creator;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCampaign: (campaign: CampaignData) => void;
  activeColumns: ColumnDefinition[];
  readOnly?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function campaignToValues(campaign: CampaignData): Record<string, string> {
  const base: Record<string, string> = {
    brand: campaign.brand ?? "",
    launchDate: campaign.launchDate ?? "",
    activity: campaign.activity ?? "",
    liveDate: campaign.liveDate ?? "",
    agPrice: campaign.agPrice != null ? String(campaign.agPrice) : "",
    creatorFee: campaign.creatorFee != null ? String(campaign.creatorFee) : "",
    shot: campaign.shot ?? "",
    complete: campaign.complete ?? "Pending",
    detailStatus: campaign.secondaryStatus ?? "",
    invoiceNo: campaign.invoiceNo ?? "",
    paid: campaign.paid ?? "",
    includesVat: campaign.includesVat ?? "",
    currency: campaign.currency ?? "GBP",
    brandPOs: campaign.brandPOs ?? "",
    paymentTerms: campaign.paymentTerms ?? "",
  };

  // Custom fields
  if (campaign.custom_fields) {
    for (const [k, v] of Object.entries(campaign.custom_fields)) {
      base[k] = v != null ? String(v) : "";
    }
  }

  return base;
}

function valuesToCampaignUpdates(values: Record<string, string>, activeColumns: ColumnDefinition[]) {
  const customFields: Record<string, unknown> = {};
  for (const col of activeColumns) {
    if (!SYSTEM_COLUMN_KEYS.has(col.key) && values[col.key] !== undefined && values[col.key] !== "") {
      customFields[col.key] =
        col.type === "number" || col.type === "currency"
          ? parseFloat(values[col.key]) || null
          : values[col.key];
    }
  }

  return {
    brand: values.brand ?? "",
    launch_date: values.launchDate || null,
    activity: values.activity || null,
    live_date: values.liveDate || null,
    ag_price: values.agPrice ? parseFloat(values.agPrice) : null,
    creator_fee: values.creatorFee ? parseFloat(values.creatorFee) : null,
    shot: values.shot || null,
    complete: values.complete === "Completed",
    campaign_status:
      values.complete?.toLowerCase() === "active"
        ? "active"
        : values.complete?.toLowerCase() === "completed"
          ? "completed"
          : "pending",
    completion_status:
      values.detailStatus === "Awaiting details" ? "awaiting_details" : null,
    invoice_no: values.invoiceNo || null,
    paid_date: values.paid || null,
    includes_vat: values.includesVat || null,
    currency: values.currency || "GBP",
    brand_pos: values.brandPOs || null,
    payment_terms: values.paymentTerms || null,
    custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CampaignDetailModal = ({
  campaign,
  creator,
  open,
  onOpenChange,
  onUpdateCampaign,
  activeColumns,
  readOnly = false,
}: CampaignDetailModalProps) => {
  const updateCampaign = useUpdateCampaign();
  const { data: profile } = useProfile();
  const { data: agencyId } = useAgencyId();

  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<CampaignComment[]>([]);
  const [attachments, setAttachments] = useState<CampaignAttachment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Attachment upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComment, setUploadComment] = useState("");
  const [uploadContentType, setUploadContentType] = useState("Other");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Re-initialise form, comments and attachments whenever the campaign changes
  useEffect(() => {
    if (campaign) {
      setValues(campaignToValues(campaign));
      setComments(campaign.campaign_comments ?? []);
      setAttachments(campaign.campaign_attachments ?? []);
    }
  }, [campaign?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  if (!campaign) return null;

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  // ── Save details ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!values.brand?.trim()) {
      toast.error("Brand is required");
      return;
    }
    try {
      await updateCampaign.mutateAsync({
        id: String(campaign.id),
        updates: valuesToCampaignUpdates(values, activeColumns),
      });
      // Propagate the updated local state back to the parent
      onUpdateCampaign({
        ...campaign,
        brand: values.brand,
        launchDate: values.launchDate ?? "",
        activity: values.activity ?? "",
        liveDate: values.liveDate ?? "",
        agPrice: values.agPrice ? parseFloat(values.agPrice) : null,
        creatorFee: values.creatorFee ? parseFloat(values.creatorFee) : null,
        shot: values.shot ?? "",
        complete: values.complete ?? "Pending",
        secondaryStatus: values.detailStatus ?? "",
        invoiceNo: values.invoiceNo ?? "",
        paid: values.paid ?? "",
        includesVat: values.includesVat ?? "",
        currency: values.currency ?? "GBP",
        brandPOs: values.brandPOs ?? "",
        paymentTerms: values.paymentTerms ?? "",
      });
      toast.success("Campaign saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save campaign");
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text) return;

    const authorName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || (profile.email ?? "Unknown")
      : "Unknown";

    const comment: CampaignComment = {
      id: crypto.randomUUID(),
      text,
      authorName,
      authorId: profile?.id ?? "",
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...comments, comment];
    setIsSubmittingComment(true);
    try {
      await updateCampaign.mutateAsync({
        id: String(campaign.id),
        updates: { campaign_comments: updatedComments as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["campaigns"]["Update"]["campaign_comments"] },
      });
      setComments(updatedComments);
      setNewComment("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ── Attachment handlers ────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = isValidAttachmentFile(file);
    if (!check.valid) {
      toast.error(check.reason);
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile || !agencyId) return;
    setIsUploading(true);
    try {
      const storagePath = buildAttachmentPath(agencyId, campaign.id, pendingFile);
      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_ATTACHMENTS_BUCKET)
        .upload(storagePath, pendingFile);
      if (uploadError) throw uploadError;

      const authorName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || (profile.email ?? "Unknown")
        : "Unknown";

      const attachment: CampaignAttachment = {
        id: crypto.randomUUID(),
        fileName: pendingFile.name,
        storagePath,
        mimeType: pendingFile.type,
        sizeBytes: pendingFile.size,
        comment: uploadComment.trim() || undefined,
        contentType: uploadContentType,
        uploadedById: profile?.id ?? "",
        uploadedByName: authorName,
        uploadedAt: new Date().toISOString(),
      };

      const updated = [...attachments, attachment];
      await updateCampaign.mutateAsync({
        id: String(campaign.id),
        updates: {
          campaign_attachments: updated as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["campaigns"]["Update"]["campaign_attachments"],
        },
      });
      setAttachments(updated);
      onUpdateCampaign({ ...campaign, campaign_attachments: updated });
      setPendingFile(null);
      setUploadComment("");
      setUploadContentType("Other");
      toast.success("File attached");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: CampaignAttachment) => {
    try {
      await supabase.storage.from(CAMPAIGN_ATTACHMENTS_BUCKET).remove([attachment.storagePath]);
      const updated = attachments.filter((a) => a.id !== attachment.id);
      await updateCampaign.mutateAsync({
        id: String(campaign.id),
        updates: {
          campaign_attachments: updated as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["campaigns"]["Update"]["campaign_attachments"],
        },
      });
      setAttachments(updated);
      onUpdateCampaign({ ...campaign, campaign_attachments: updated });
      toast.success("Attachment removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove attachment");
    }
  };

  const handleDownload = async (attachment: CampaignAttachment) => {
    const url = await getAttachmentUrl(attachment.storagePath);
    if (!url) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── renderField (mirrors CreateCampaignDialog) ────────────────────────────

  const renderField = (col: ColumnDefinition) => {
    const schemaOptions = Array.isArray(col.options) && col.options.length > 0
      ? col.options
      : (SYSTEM_SELECT_OPTIONS[col.key] ?? []);
    const options = schemaOptions
      .map((opt) => (opt.value === "" || opt.value == null) ? { ...opt, value: opt.label } : opt)
      .filter((opt) => opt.value != null && opt.value !== "");

    switch (col.type) {
      case "select":
        return (
          <Select
            value={values[col.key] ?? ""}
            onValueChange={(val) => setValue(col.key, val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={`Select ${col.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <SelectItem value="_no_options_" disabled>No options configured</SelectItem>
              ) : (
                options.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <Select
            value={values[col.key] ?? ""}
            onValueChange={(val) => setValue(col.key, val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <DatePickerCell
            value={values[col.key] ?? ""}
            onChange={(v) => setValue(col.key, v)}
            displayClassName="h-9 w-full border border-input rounded-md bg-background hover:bg-accent/50"
            readOnly={readOnly}
          />
        );

      case "currency":
      case "number":
        return (
          <Input
            className="h-9"
            type="number"
            placeholder={col.type === "currency" ? "0.00" : "0"}
            step={col.type === "currency" ? "0.01" : "1"}
            min="0"
            value={values[col.key] ?? ""}
            onChange={(e) => setValue(col.key, e.target.value)}
            disabled={readOnly}
          />
        );

      default:
        return (
          <Input
            className="h-9"
            placeholder={col.label}
            value={values[col.key] ?? ""}
            onChange={(e) => setValue(col.key, e.target.value)}
            disabled={readOnly}
          />
        );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{campaign.brand}</DialogTitle>
            <p className="text-sm text-muted-foreground">{creator.name}</p>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes {comments.length > 0 && `(${comments.length})`}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto mt-4">

              {/* ── Details tab ─────────────────────────────────────────── */}
              <TabsContent value="details" className="m-0">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 py-1">
                  {activeColumns.map((col) => (
                    <div
                      key={col.key}
                      className={`space-y-1.5 ${col.width === "wide" ? "col-span-2" : ""}`}
                    >
                      <Label className="text-xs font-medium text-muted-foreground">
                        {col.label}
                        {col.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      {renderField(col)}
                    </div>
                  ))}
                </div>

                {!readOnly && (
                  <div className="border-t pt-4 mt-4 flex justify-end">
                    <Button
                      onClick={() => void handleSave()}
                      disabled={updateCampaign.isPending}
                    >
                      {updateCampaign.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ── Attachments tab ─────────────────────────────────────── */}
              <TabsContent value="attachments" className="m-0 space-y-4">
                {/* Upload form */}
                {!readOnly && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={Object.keys(ACCEPTED_ATTACHMENT_TYPES).join(",")}
                      onChange={handleFileSelect}
                    />
                    {!pendingFile ? (
                      <Button
                        variant="outline"
                        className="w-full border-dashed h-16 flex-col gap-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, PNG, JPG, WEBP · max 10 MB
                        </span>
                      </Button>
                    ) : (
                      <div className="p-3 border border-border rounded-lg space-y-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate flex-1">{pendingFile.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(pendingFile.size)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Type</label>
                            <Select value={uploadContentType} onValueChange={setUploadContentType}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ATTACHMENT_CONTENT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Comment (optional)</label>
                            <Input
                              value={uploadComment}
                              onChange={(e) => setUploadComment(e.target.value)}
                              placeholder="Brief description…"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setPendingFile(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => void handleUpload()} disabled={isUploading}>
                            {isUploading ? "Uploading…" : "Upload"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment list */}
                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg group">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {att.contentType} · {formatBytes(att.sizeBytes)} · {att.uploadedByName}
                            {" · "}
                            {formatDistanceToNow(new Date(att.uploadedAt), { addSuffix: true })}
                          </p>
                          {att.comment && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{att.comment}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => void handleDownload(att)}
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          {!readOnly && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{att.fileName}" will be permanently deleted from storage.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDeleteAttachment(att)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !pendingFile && (
                    <div className="text-center py-10 text-muted-foreground">
                      <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-25" />
                      <p className="text-sm">No attachments yet</p>
                    </div>
                  )
                )}
              </TabsContent>

              {/* ── Notes tab ───────────────────────────────────────────── */}
              <TabsContent value="notes" className="m-0 flex flex-col gap-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const initials = comment.authorName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{comment.authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={commentsEndRef} />
                  </div>
                )}

                {!readOnly && (
                  <div className="flex gap-2 pt-2 border-t sticky bottom-0 bg-background pb-1">
                    <Textarea
                      placeholder="Add a note…"
                      className="min-h-[72px] resize-none flex-1 text-sm"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void handleAddComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="self-end h-9 w-9 shrink-0"
                      disabled={!newComment.trim() || isSubmittingComment}
                      onClick={() => void handleAddComment()}
                      title="Send (⌘↵)"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

            </div>
          </Tabs>

          <DialogFooter className="border-t pt-3 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};
