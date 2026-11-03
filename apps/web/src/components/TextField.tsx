import { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
}

export default function TextField({ label, hint, id, ...props }: TextFieldProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium">{label}</label>
            <input id={id} {...props} className="field mt-1.5" />
            {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
    );
}
