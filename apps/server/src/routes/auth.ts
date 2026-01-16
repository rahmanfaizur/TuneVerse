import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@tuneverse/database";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
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
            JWT_SECRET,
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

        if (!email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
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
            JWT_SECRET,
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
            JWT_SECRET,
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
import { authenticateToken, AuthRequest } from "../middleware/auth";

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
