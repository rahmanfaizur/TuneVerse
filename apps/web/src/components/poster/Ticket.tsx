import { AllHTMLAttributes, CSSProperties, ElementType, ReactNode } from "react";

interface TicketProps extends Omit<AllHTMLAttributes<HTMLElement>, "as"> {
    stub: ReactNode;
    children: ReactNode;
    as?: ElementType;
    className?: string;
    stubClassName?: string;
    stubWidth?: string;
}

// A block with a perforated stub on the right and notches cut where it tears.
export default function Ticket({ stub, children, as: Tag = "div", className = "", stubClassName = "", stubWidth, ...rest }: TicketProps) {
    const style = stubWidth ? ({ "--stub": stubWidth } as CSSProperties) : undefined;
    return (
        <Tag {...rest} style={style} className={`ticket ${className}`}>
            <div className="min-w-0">{children}</div>
            <div className={`ticket-stub flex flex-col items-center justify-center text-center ${stubClassName}`}>{stub}</div>
        </Tag>
    );
}
