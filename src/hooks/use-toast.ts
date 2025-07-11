export function useToast() {
  return {
    toasts: [],
    toast: (_props?: any) => ({
      id: "",
      dismiss: () => {},
      update: () => {},
    }),
    dismiss: () => {},
  };
}

export function toast(_props?: any) {
  return {
    id: "",
    dismiss: () => {},
    update: () => {},
  };
}
