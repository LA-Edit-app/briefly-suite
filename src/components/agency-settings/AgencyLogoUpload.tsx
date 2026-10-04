import { useRef, type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useRemoveAgencyLogo, useUploadAgencyLogo } from "@/hooks/useAgencyMembers";
import type { Database } from "@/integrations/supabase/types";
import { ALLOWED_LOGO_TYPES, isValidLogoFile } from "@/lib/agencyLogo";
import { BRIEFLY_LOGO } from "@/lib/brand";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

interface AgencyLogoUploadProps {
  agency: AgencyRow;
}

export function AgencyLogoUpload({ agency }: AgencyLogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadAgencyLogo();
  const removeLogo = useRemoveAgencyLogo();
  const busy = uploadLogo.isPending || removeLogo.isPending;

  const handleFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be chosen again later
    if (!file) return;

    if (!isValidLogoFile(file)) {
      toast.error("Please choose a PNG, JPG or WebP image under 5 MB.");
      return;
    }

    uploadLogo.mutate(
      { agency, file },
      {
        onSuccess: () => toast.success("Agency logo updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemove = () => {
    removeLogo.mutate(
      { agency },
      {
        onSuccess: () => toast.success("Agency logo removed"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-2">
      <Label>Agency Logo</Label>

      <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-muted/30 px-4">
        {agency.logo_url ? (
          <img
            src={agency.logo_url}
            alt={agency.name}
            className="max-h-14 max-w-full object-contain"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img src={BRIEFLY_LOGO} alt="Briefly" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-sm text-muted-foreground">Using the default Briefly logo</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPG or WebP, up to 5 MB. Wide logos with a transparent background look best.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_LOGO_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChosen}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="w-4 h-4" />
          {uploadLogo.isPending ? "Uploading..." : agency.logo_url ? "Replace logo" : "Upload logo"}
        </Button>

        {agency.logo_url && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" disabled={busy}>
                <Trash2 className="w-4 h-4" />
                {removeLogo.isPending ? "Removing..." : "Remove"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove agency logo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your team will see the default Briefly logo instead. You can upload a new logo at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
