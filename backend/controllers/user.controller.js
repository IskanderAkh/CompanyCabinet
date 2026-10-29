import User from "../models/user.model";

export const getUserById = async (userId) => {
    try {
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return { error: "User not found" };
        }
        return user;
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        return error;
    }
}

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const user = await User.create({ name, email, password, role });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        return error;
    }
}

