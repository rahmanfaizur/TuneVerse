import { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "outline" | "quiet";

const VARIANTS: Record<Variant, string> = {
    primary: "rounded-full bg-signal px-6 py-3 font-medium text-signal-foreground enabled:hover:opacity-90",
    outline: "rounded-full border border-border px-6 py-3 font-medium enabled:hover:bg-muted",
    quiet: "text-foreground underline-offset-4 enabled:hover:text-signal enabled:hover:underline",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    loading?: boolean;
    loadingText?: string;
}

export default function Button({
    variant = "primary",
    loading = false,
    loadingText,
    disabled,
    className = "",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            aria-busy={loading}
            className={`inline-flex items-center justify-center gap-2 text-[15px] transition-[color,background-color,opacity,transform] duration-200 active:enabled:scale-[0.98] disabled:cursor-not-allowed ${loading ? "opacity-80" : "disabled:opacity-40"} ${VARIANTS[variant]} ${className}`}
        >
            {loading && <Spinner />}
            {loading ? loadingText ?? children : children}
        </button>
    );
}
