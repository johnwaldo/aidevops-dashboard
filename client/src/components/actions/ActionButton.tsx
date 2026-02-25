import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
  size?: "sm" | "default";
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActionButton({
  label,
  icon,
  variant = "outline",
  size = "sm",
  loading,
  success,
  error,
  disabled,
  onClick,
  className,
}: ActionButtonProps) {
  const baseClass = size === "sm"
    ? "h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]"
    : "border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]";

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled className={`${baseClass} ${className ?? ""}`}>
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Working...
      </Button>
    );
  }

  if (success) {
    return (
      <Button variant={variant} size={size} disabled className={`${baseClass} text-emerald-400 border-emerald-400/30 ${className ?? ""}`}>
        <Check className="h-3 w-3 mr-1" />
        Done
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant={variant} size={size} disabled className={`${baseClass} text-rose-400 border-rose-400/30 ${className ?? ""}`}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${className ?? ""}`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </Button>
  );
}
