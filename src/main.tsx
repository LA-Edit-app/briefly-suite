// Must be first: reads the email-link details from the URL hash before the
// Supabase client clears it.
import "./lib/authLink";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
