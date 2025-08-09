"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// creation of register controller 
const register = async (req, res) => {
    const { email, password, name } = req.body;
    try {
        if (!email || !password || !name) {
            res.status(400).json({
                message: "Please fill all the fields"
            });
        }
        // now to check if the user alradyv exists in the db or not
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (user) {
            return res.status(400).json({
                message: "User already exists"
            });
        }
        // now we can create a new fresh user
        const newUser = await prisma.user.create({
            data: {
                email: email,
                password: password,
                name: name
            }
        });
        return res.status(200).json({
            message: "User registered successfully",
            user: newUser
        });
    }
    catch (error) {
        console.error("Error during user registration:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
exports.register = register;
// creation of login controller
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            res.status(400).json({
                message: "Please fill all the fields"
            });
        }
        // now to check if the user exists in the db or not
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            return res.status(400).json({
                message: "User does not exists"
            });
        }
        // now we can check if the password is correct or not
        if (user.password !== password) {
            return res.status(400).json({
                message: "Incorrect password"
            });
        }
        // now we can create a jwt token and send it to the user
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || "dvchvchjvcjhsvchjvscjh", {
            expiresIn: "1d"
        });
        return res.status(200).json({
            message: "User logged in successfully",
            token: token,
            user: user
        });
    }
    catch (error) {
        console.error("Error during user login:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
exports.login = login;
// identification of user
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "dvchvchjvcjhsvchjvscjh");
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Error during token verification:", error);
        return res.status(401).json({
            message: "Invalid token"
        });
    }
};
exports.authenticateUser = authenticateUser;
