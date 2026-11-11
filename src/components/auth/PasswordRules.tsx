import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";
import { cn } from "@/lib/utils";

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-1.5", ok ? "text-green-600 dark:text-green-500" : "text-muted-foreground")}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
