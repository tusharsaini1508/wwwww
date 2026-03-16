import { create } from "zustand";

type ToastTone = "info" | "success" | "warning" | "danger";

type ToastState = {
  visible: boolean;
  message: string;
  tone: ToastTone;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
};

export const useUiStore = create<ToastState>((set) => ({
  visible: false,
  message: "",
  tone: "info",
  showToast: (message, tone = "info") =>
    set({
      visible: true,
      message,
      tone
    }),
  hideToast: () =>
    set({
      visible: false,
      message: "",
      tone: "info"
    })
}));
