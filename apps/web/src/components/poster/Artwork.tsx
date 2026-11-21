/* eslint-disable @next/next/no-img-element */

// Album art printed in the two inks. Hovering the parent .group shows the real colours.
export default function Artwork({ src, className = "" }: { src?: string | null; className?: string }) {
    if (!src) {
        return <span aria-hidden="true" className={`block bg-[repeating-linear-gradient(45deg,var(--blue)_0_6px,var(--pink)_6px_12px)] ${className}`} />;
    }
    return (
        <span aria-hidden="true" className={`duotone block ${className}`}>
            <img src={src} alt="" className="h-full w-full object-cover" />
        </span>
    );
}
