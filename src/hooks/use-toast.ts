export function useToast() {
  return {
    toasts: [],
    toast: () => ({
      id: '',
      dismiss: () => {},
      update: () => {},
    }),
    dismiss: () => {},
  }
}

export function toast() {
  return {
    id: '',
    dismiss: () => {},
    update: () => {},
  }
}
