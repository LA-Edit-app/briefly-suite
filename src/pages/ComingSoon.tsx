import { useState } from "react";

const features = [
  "Campaign tracker",
  "Creator management",
  "Revenue analytics",
  "Xero integration",
  "Task management",
];

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_60%_0%,#2d1b69_0%,#0f0a1e_55%,#0a0714_100%)] flex flex-col items-center justify-center px-4 py-16 font-sans text-white">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-10 h-10 rounded-[10px] bg-violet-600 grid grid-cols-2 gap-1 p-2.5 box-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2px]" />
          ))}
        </div>
        <span className="text-[1.35rem] font-bold tracking-tight">Briefly</span>
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 border border-violet-500/60 rounded-full px-4 py-1 text-[0.7rem] font-semibold tracking-widest uppercase text-violet-300 mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 inline-block" />
        Coming soon
      </div>

      {/* Headline */}
      <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.1] text-center max-w-2xl mx-0 mb-5 tracking-tight">
        Campaign management,{" "}
        <span className="text-violet-400">finally simplified.</span>
      </h1>

      {/* Subtitle */}
      <p className="text-[1.05rem] text-slate-400 text-center max-w-[500px] leading-relaxed mb-10">
        Briefly is the platform talent agencies have been waiting for — track campaigns, manage your
        creators, and report revenue all in one clean workspace.
      </p>

      {/* Email form */}
      {submitted ? (
        <div className="bg-violet-600/15 border border-violet-500/40 rounded-xl px-8 py-4 text-violet-300 text-[0.95rem] font-medium mb-10">
          You&apos;re on the list. We&apos;ll be in touch!
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 w-full max-w-[440px] mb-3.5"
          >
            <input
              type="email"
              required
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-[10px] border border-white/12 bg-white/8 text-white text-[0.95rem] outline-none placeholder:text-slate-500 focus:border-violet-500/60"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-[10px] bg-violet-600 text-white border-0 font-semibold text-[0.95rem] cursor-pointer whitespace-nowrap hover:bg-violet-500 transition-colors"
            >
              Notify me
            </button>
          </form>
          <p className="text-[0.8rem] text-slate-500 mb-12">
            No spam. Just one email when we launch.
          </p>
        </>
      )}

      {/* Feature list */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 max-w-[560px] mb-12">
        {features.map((f) => (
          <span key={f} className="flex items-center gap-1.5 text-[0.85rem] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 inline-block shrink-0" />
            {f}
          </span>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[0.8rem] text-slate-600">
        © 2026 Briefly. All rights reserved.
      </p>
    </div>
  );
};

export default ComingSoon;
