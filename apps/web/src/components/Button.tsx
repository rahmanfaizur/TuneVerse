import { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type Variant = "ink" | "signal" | "outline" | "quiet";

const VARIANTS: Record<Variant, string> = {
    ink: "bg-accent text-accent-foreground enabled:hover:bg-signal enabled:hover:text-signal-foreground",
    signal: "bg-signal text-signal-foreground enabled:hover:bg-accent enabled:hover:text-accent-foreground",
    outline: "border border-foreground text-foreground enabled:hover:bg-foreground enabled:hover:text-background",
    quiet: "text-foreground underline underline-offset-4 enabled:hover:text-signal",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    loading?: boolean;
    loadingText?: string;
}

export default function Button({
    variant = "ink",
    loading = false,
    loadingText,
    disabled,
    className = "",
    children,
    ...props
}: ButtonProps) {
    const padding = variant === "quiet" ? "" : "px-7 py-3.5";

    return (
        <button
            {...props}
            disabled={disabled || loading}
            aria-busy={loading}
            className={`inline-flex items-center justify-center gap-2.5 text-sm tracking-wide transition-[color,background-color,opacity,transform] duration-300 active:enabled:scale-[0.98] disabled:cursor-not-allowed ${loading ? "" : "disabled:opacity-35"} ${padding} ${VARIANTS[variant]} ${className}`}
        >
            {loading && <Spinner />}
            {loading ? loadingText ?? children : children}
        </button>
    );
}
