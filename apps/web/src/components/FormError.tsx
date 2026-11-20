// Errors print on white with a fat pink edge, so they never look like the pink button.
export default function FormError({ message }: { message: string }) {
    return (
        <p role="alert" className="border-l-[6px] border-pink bg-field px-3 py-2 text-[15px] font-semibold text-ink">
            {message}
        </p>
    );
}
