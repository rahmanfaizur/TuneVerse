import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { prisma } from "@tuneverse/database";
import { config } from "../config";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many attempts, try again in a few minutes" },
}));

const isText = (value: unknown, max: number): value is string =>
    typeof value === "string" && value.trim().length > 0 && value.length <= max;

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!isText(username, 30) || !isText(email, 254) || !isText(password, 72)) {
            return res.status(400).json({ error: "Missing or invalid fields" });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existingUser) {
            return res.status(400).json({ error: "Username or email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                isGuest: false,
            },
        });

        const token = jwt.sign(
            { id: user.id, username: user.username, isGuest: false },
            config.jwtSecret,
            { expiresIn: "7d" }
        );

        const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatarUrl } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!isText(email, 254) || !isText(password, 72)) {
            return res.status(400).json({ error: "Missing or invalid fields" });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, isGuest: user.isGuest },
            config.jwtSecret,
            { expiresIn: "7d" }
        );

        const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatarUrl } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Guest Login
router.post("/guest", async (req, res) => {
    try {
        const { username } = req.body;

        // If no username provided, generate one
        if (username !== undefined && username !== "" && !isText(username, 30)) {
            return res.status(400).json({ error: "Invalid username" });
        }

        const guestName = username || `Guest-${Math.floor(Math.random() * 10000)}`;

        // Check if username taken (unlikely for random guest, but possible for custom guest name)
        const existingUser = await prisma.user.findUnique({
            where: { username: guestName }
        });

        if (existingUser) {
            return res.status(400).json({ error: "Username taken" });
        }

        const user = await prisma.user.create({
            data: {
                username: guestName,
                isGuest: true,
            },
        });

        const token = jwt.sign(
            { id: user.id, username: user.username, isGuest: true },
            config.jwtSecret,
            { expiresIn: "24h" }
        );

        const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
        res.json({ token, user: { id: user.id, username: user.username, isGuest: true, avatarUrl } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get Me
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) return res.sendStatus(401);

    const user = await prisma.user.findUnique({
        where: { id: req.user.id }
    });

    if (!user) return res.sendStatus(404);

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest
    });
});

export default router;
