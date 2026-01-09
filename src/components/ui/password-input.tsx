import * as React from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/utils";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  /**
   * The aria-label for the show/hide password toggle button.
   */
  toggleAriaLabel?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, toggleAriaLabel, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [capsLock, setCapsLock] = React.useState(false);
    const generatedId = React.useId();
    const errorId = React.useId();
    const inputId = props.id || generatedId;

    // Determine if we have an error message to display
    const errorMessage = typeof error === "string" ? error : undefined;
    const hasError = !!error;

    const checkCapsLock = (
      e:
        | React.KeyboardEvent<HTMLInputElement>
        | React.MouseEvent<HTMLInputElement>,
    ) => {
      if (e.getModifierState("CapsLock")) {
        setCapsLock(true);
      } else {
        setCapsLock(false);
      }
    };

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
        <div className="relative">
          <input
            id={inputId}
            type={showPassword ? "text" : "password"}
            className={cn(
              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 pr-10",
              hasError
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500",
              className,
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={errorMessage ? errorId : undefined}
            {...props}
            onKeyDown={(e) => {
              checkCapsLock(e);
              props.onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              checkCapsLock(e);
              props.onKeyUp?.(e);
            }}
            onClick={(e) => {
              checkCapsLock(e);
              props.onClick?.(e);
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-1"
            aria-label={
              toggleAriaLabel ||
              (showPassword ? "Hide password" : "Show password")
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errorMessage && (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}
        {capsLock && (
          <p
            className="mt-1 text-xs text-yellow-600 flex items-center"
            role="alert"
          >
            <TriangleAlert className="h-3 w-3 mr-1" aria-hidden="true" />
            Caps Lock is on
          </p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
