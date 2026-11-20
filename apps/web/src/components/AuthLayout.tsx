import { ReactNode } from "react";
import Overprint from "./poster/Overprint";
import SiteHeader from "./poster/SiteHeader";
import Ticket from "./poster/Ticket";

interface AuthLayoutProps {
    headline: string;
    caption: string;
    children: ReactNode;
    /** Shown under the ticket, e.g. the guest form or a link to the other auth page. */
    after?: ReactNode;
}

export default function AuthLayout({ headline, caption, children, after }: AuthLayoutProps) {
    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 md:px-8">
            <SiteHeader />
            <div className="grid items-start gap-8 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
                <div className="lg:pt-6">
                    <Overprint text={headline} className="text-[clamp(3.75rem,11vw,8rem)]" />
                    <p className="mt-5 max-w-sm text-lg leading-snug">{caption}</p>
                </div>
                <div>
                    <Ticket
                        className="bg-wash"
                        stubWidth="3.25rem"
                        stubClassName="bg-pink text-on-pink"
                        stub={<span className="label whitespace-nowrap [writing-mode:vertical-rl]">Admit one</span>}
                    >
                        <div className="p-5 md:p-6">{children}</div>
                    </Ticket>
                    {after}
                </div>
            </div>
        </main>
    );
}
