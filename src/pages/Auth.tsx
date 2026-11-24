import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { consumeAuthLinkError } from "@/lib/authLink";
import { isPasswordValid, PASSWORD_RULES_MESSAGE } from "@/lib/password";
import { z } from "zod";
import { errorMessage } from "@/lib/errors";
import { AGENCY_NAME_TAKEN } from "@/lib/agencyName";

const emailSchema = z.string().email({ message: "Please enter a valid email address" });

type Mode = "login" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const isLogin = mode === "login";
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ agencyName?: string; email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (consumeAuthLinkError()) {
      toast({
        title: "This link has expired",
        description: "Invite and reset links only work once and expire after a while. Use \"Forgot password?\" to get a new one.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setResetSent(false);
  };

  const validateForm = () => {
    const fieldErrors: { agencyName?: string; email?: string; password?: string } = {};
    if (mode === "signup" && !agencyName.trim()) fieldErrors.agencyName = "Please enter your agency's name";
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) fieldErrors.email = emailResult.error.errors[0].message;
    if (mode === "login" && !password) fieldErrors.password = "Please enter your password";
    if (mode === "signup" && !isPasswordValid(password)) fieldErrors.password = PASSWORD_RULES_MESSAGE;
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        // Same message whether or not the account exists, so the form can't
        // be used to check which emails are registered.
        if (error && error.status !== 400 && error.status !== 404) throw error;
        setResetSent(true);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        // Agency names are unique (#52): check first so we can say why.
        const { data: available, error: nameError } = await supabase.rpc("agency_name_available", {
          p_name: agencyName.trim(),
        });
        if (nameError) throw nameError;
        if (!available) {
          setErrors({ agencyName: AGENCY_NAME_TAKEN });
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { agency_name: agencyName.trim() },
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "You can now log in with your credentials.",
        });
        setMode("login");
      }
    } catch (error) {
      let message = errorMessage(error);
      if (message.includes("User already registered")) {
        message = "This email is already registered. Please log in instead.";
      } else if (mode === "signup" && message.includes("Database error saving new user")) {
        // Someone took the name between the check and the sign-up.
        message = AGENCY_NAME_TAKEN;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset your password"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === "login"
                ? "Sign in to access your dashboard"
                : mode === "signup"
                  ? "Sign up to get started"
                  : "Enter your email and we'll send you a link to choose a new password"}
            </p>
          </div>

          {mode === "forgot" && resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">
                If an account exists for <span className="font-medium">{email.trim()}</span>, a reset link is on its way.
                Check your inbox and spam folder.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => switchMode("login")}>
                Back to sign in
              </Button>
            </div>
          ) : (

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency name</Label>
                <Input
                  id="agencyName"
                  placeholder="Your agency"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  disabled={loading}
                  autoComplete="organization"
                />
                {errors.agencyName ? (
                  <p className="text-sm text-destructive">{errors.agencyName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">You'll be this agency's Admin.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                {mode === "signup" && <PasswordRules password={password} />}
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "signup"
                    ? "Sign Up"
                    : "Send reset link"}
            </Button>
          </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : mode === "forgot"
                  ? "Back to sign in"
                  : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
