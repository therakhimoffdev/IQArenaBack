import User from "../models/User.js";

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const { name, email, phone, address, avatar } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User topilmadi" });
        }

        // Only update sent fields
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email.toLowerCase();
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (avatar !== undefined) user.avatar = avatar;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            address: updatedUser.address,
            premium: updatedUser.premium,
        });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);
        res.status(500).json({ message: "Server xatosi" });
    }
};
