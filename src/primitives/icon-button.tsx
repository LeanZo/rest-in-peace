import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: "sm" | "md";
  tooltip?: string;
}

export function IconButton({
  icon,
  size = "md",
  tooltip,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-text-muted",
        "hover:text-text-primary hover:bg-surface-hover transition-colors duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        className,
      )}
      title={tooltip}
      {...props}
    >
      {icon}
    </button>
  );
}
