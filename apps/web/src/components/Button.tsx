import { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "outline" | "quiet";

const VARIANTS: Record<Variant, string> = {
    primary: "btn-pink bg-pink px-6 py-3 font-bold text-on-pink not-disabled:hover:bg-blue not-disabled:hover:text-paper",
    outline: "border-2 border-ink px-6 py-2.5 font-bold text-ink not-disabled:hover:bg-ink not-disabled:hover:text-paper",
    quiet: "ink-link font-semibold text-ink",
};

const BASE = "inline-flex items-center justify-center gap-2 text-[15px] transition-colors duration-150";

// For links that should look like buttons.
export const buttonClass = (variant: Variant = "primary") => `${BASE} ${VARIANTS[variant]}`;

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
            className={`${BASE} active:enabled:translate-y-px disabled:cursor-not-allowed ${loading ? "opacity-80" : "disabled:opacity-40"} ${VARIANTS[variant]} ${className}`}
        >
            {loading && <Spinner />}
            {loading ? loadingText ?? children : children}
        </button>
    );
}
