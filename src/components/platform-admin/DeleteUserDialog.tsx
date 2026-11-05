import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAdminDeleteUser } from "@/hooks/usePlatformAdmin";

export type DeleteUserTarget = { id: string; name: string; email: string | null };

interface Props {
  user: DeleteUserTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ user, onOpenChange }: Props) {
  const deleteUser = useAdminDeleteUser();
  const [confirm, setConfirm] = useState("");
  const confirmTarget = user?.email ?? "DELETE";

  useEffect(() => {
    if (user) setConfirm("");
  }, [user]);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync({ userId: user.id });
      onOpenChange(false);
      toast.success("Account deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the login for{" "}
            <span className="font-medium text-foreground">{user?.name}</span> and removes them from
            every agency. Campaigns and tasks they created are kept. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="del-confirm" className="text-xs">
            Type <span className="font-mono font-medium text-foreground">{confirmTarget}</span> to confirm
          </Label>
          <Input
            id="del-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={confirm.trim().toLowerCase() !== confirmTarget.toLowerCase() || deleteUser.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteUser.isPending ? "Deleting…" : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
