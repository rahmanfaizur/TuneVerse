import { getApiUrl } from "./api";

export async function postAuth(path: "login" | "signup" | "guest", body: Record<string, string>) {
    let res: Response;
    try {
        res = await fetch(`${getApiUrl()}/api/auth/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error("We can't reach the server right now. Try again in a moment.");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Something went wrong. Try again.");
    return data;
}

// Only ever send people to a page on this site after they sign in.
export const safeCallback = (url: string | null) =>
    url && url.startsWith("/") && !url.startsWith("//") ? url : "/lobby";
