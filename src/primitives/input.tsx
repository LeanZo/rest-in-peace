import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  suffix?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ icon, suffix, error, className, ...props }, ref) {
    return (
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-2.5 text-text-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-surface-input text-text-primary text-sm rounded-md",
            "border border-border-default outline-none transition-colors duration-150",
            "placeholder:text-text-muted",
            "focus:border-accent-purple",
            "disabled:opacity-50",
            icon ? "pl-8" : "pl-3",
            suffix ? "pr-8" : "pr-3",
            "py-1.5",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-2.5 text-text-muted">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
