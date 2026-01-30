/**
 * ToastHost - Global toast container for transient notifications
 * Provides a single toast system (sonner) mounted once in the layout
 * Views can trigger toasts for success states and transient errors
 */

import { Toaster } from "../ui/sonner";

export function ToastHost() {
  return <Toaster position="top-center" />;
}
