import { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
}

export default function TextField({ label, hint, id, ...props }: TextFieldProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm text-muted-foreground">{label}</label>
            <input
                id={id}
                {...props}
                className="mt-1 w-full border-b border-foreground bg-transparent py-2.5 text-lg outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-signal"
            />
            {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
    );
}
