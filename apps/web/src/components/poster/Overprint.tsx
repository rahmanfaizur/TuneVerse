import { ElementType } from "react";

interface OverprintProps {
    text: string;
    as?: ElementType;
    className?: string;
}

// The headline printed twice, pink under blue, slightly off register like a riso print.
export default function Overprint({ text, as: Tag = "h1", className = "" }: OverprintProps) {
    return (
        <Tag data-text={text} className={`overprint display ${className}`}>
            <span>{text}</span>
        </Tag>
    );
}
