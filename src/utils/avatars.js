export const generateDiceBearInitial = (name) => {
    const initials = name
        .split(" ")
        .map((p) => p[0] || "")
        .slice(0, 2)
        .join("")
        .toUpperCase();

    // use dicebear initials style
    return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(initials)}&size=512`;
};
