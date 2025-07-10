import { toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface NotifyOptions {
  title: string;
  body: string;
  type?: "info" | "success" | "error" | "warning";
}

export function notify({ title, body, type = "info" }: NotifyOptions) {
  const options: ToastOptions = {
    type,
    position: "top-right",
    autoClose: 5000,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  toast(`${title}\n${body}`, options);
}
