import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const errorId = React.useId();
    const inputId = props.id || generatedId;

    // Determine if we have an error message to display
    const errorMessage = typeof error === "string" ? error : undefined;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
            hasError
              ? "border-red-300 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500",
            className,
          )}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={errorMessage ? errorId : undefined}
          {...props}
        />
        {errorMessage && (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export default Input;
