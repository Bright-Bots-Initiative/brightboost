// src/components/ui/Card.tsx
import React from "react";
import { cn } from "../../lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("bg-white p-6 rounded-lg shadow-md", className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <div ref={ref} className={cn("mb-4", className)} {...rest}>
        {children}
      </div>
    );
  },
);
CardHeader.displayName = "CardHeader";

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <h3 ref={ref} className={cn("text-xl font-semibold", className)} {...rest}>
        {children}
      </h3>
    );
  },
);
CardTitle.displayName = "CardTitle";

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...rest}>
        {children}
      </div>
    );
  },
);
CardContent.displayName = "CardContent";

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <div ref={ref} className={cn("mt-4 pt-4 border-t", className)} {...rest}>
        {children}
      </div>
    );
  },
);
CardFooter.displayName = "CardFooter";
