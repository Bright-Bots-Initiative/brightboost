import { toast } from "@/components/ui/use-toast";

interface NotifyOptions {
  title: string;
  body: string;
  type?: "info" | "success" | "error" | "warning";
}

export function notify({ title, body, type = "info" }: NotifyOptions) {
  toast({
    title,
    description: body,
    variant: type === "error" ? "destructive" : "default",
  });
}