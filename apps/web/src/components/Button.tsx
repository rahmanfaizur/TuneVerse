import { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "outline" | "quiet";

const VARIANTS: Record<Variant, string> = {
    primary: "bg-pink px-6 py-3 font-bold text-ink enabled:hover:bg-blue enabled:hover:text-paper",
    outline: "border-2 border-ink px-6 py-2.5 font-bold text-ink enabled:hover:bg-ink enabled:hover:text-paper",
    quiet: "ink-link font-semibold text-ink",
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
            className={`inline-flex items-center justify-center gap-2 text-[15px] transition-colors duration-150 active:enabled:translate-y-px disabled:cursor-not-allowed ${loading ? "opacity-80" : "disabled:opacity-40"} ${VARIANTS[variant]} ${className}`}
        >
            {loading && <Spinner />}
            {loading ? loadingText ?? children : children}
        </button>
    );
}
