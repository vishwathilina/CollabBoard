import type { ButtonProps } from "@/types/components";

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  danger: "bg-transparent text-danger hover:bg-surface-2",
  outline: "border border-border bg-transparent text-fg hover:bg-surface-2",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  type = "button",
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
