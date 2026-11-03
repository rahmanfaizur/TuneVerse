const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function readCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;
    if (!raw) {
        if (isProduction) throw new Error("CORS_ORIGIN must be set in production");
        return ["http://localhost:3000", "http://127.0.0.1:3000"];
    }

    const origins = raw.split(",").map((origin) => origin.trim()).filter(Boolean);
    if (isProduction && origins.includes("*")) {
        throw new Error("CORS_ORIGIN can't be * in production");
    }
    return origins;
}

const corsOrigins = readCorsOrigins();

export const config = {
    jwtSecret: requireEnv("JWT_SECRET"),
    corsOrigins,
    // Where Spotify sends people back to after login.
    clientUrl: process.env.CLIENT_URL || corsOrigins[0],
};
