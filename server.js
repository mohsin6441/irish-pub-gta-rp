const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();

const {
    initializeApp,
    applicationDefault,
    cert,
    getApps
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================================
// CONFIGURATION
// ========================================================

const OWNER_EMAIL = (
    process.env.OWNER_EMAIL || "mohsin644774@gmail.com"
).trim().toLowerCase();

const DATA_FILE = path.join(__dirname, "irish-pub-data.json");

const ALLOWED_ROLES = ["Owner", "Manager", "Staff"];

const STAFF_DEFAULTS = [
    {
        name: "Mohsin",
        username: "mohsin",
        role: "Developer",
        email: OWNER_EMAIL
    },
    {
        name: "Alison",
        username: "don",
        role: "Staff",
        email: "mohsin132211@gmail.com"
    },
    {
        name: "Akash Khan",
        username: "akash",
        role: "Owner",
        email: "desmondx998@gmail.com"
    },
    {
        name: "Staff 2",
        username: "staff2",
        role: "Staff"
    }
];

// ========================================================
// FIREBASE ADMIN INITIALIZATION
// ========================================================

function initializeFirebase() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId =
        process.env.FIREBASE_PROJECT_ID || "irish-pub-staff";

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        );

        return initializeApp({
            credential: cert(serviceAccount),
            projectId
        });
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return initializeApp({
            credential: applicationDefault(),
            projectId
        });
    }

    return initializeApp({
        credential: applicationDefault(),
        projectId
    });
}

let firebaseAuth;

try {
    firebaseAuth = getAuth(initializeFirebase());
    console.log("Firebase Admin initialized.");
} catch (error) {
    console.error("Firebase initialization error:", error.message);
    process.exit(1);
}

// ========================================================
// MIDDLEWARE
// ========================================================

app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ========================================================
// DEFAULT DATA
// ========================================================

const defaultData = {
    staff: STAFF_DEFAULTS,
    shifts: {},
    shiftHistory: [],
    sales: []
};

// ========================================================
// LOAD DATA
// ========================================================

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(defaultData, null, 2),
                "utf8"
            );

            return JSON.parse(JSON.stringify(defaultData));
        }

        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const data = JSON.parse(raw);

        const staff = Array.isArray(data.staff)
            ? data.staff
            : JSON.parse(JSON.stringify(STAFF_DEFAULTS));

        const owner = staff.find(
            member => member.username === "mohsin"
        );

        if (owner) {
            owner.email = OWNER_EMAIL;
            owner.role = "Owner";
        } else {
            staff.unshift({
                name: "Mohsin",
                username: "mohsin",
                role: "Owner",
                email: OWNER_EMAIL
            });
        }

        return {
            staff,

            shifts:
                data.shifts &&
                typeof data.shifts === "object" &&
                !Array.isArray(data.shifts)
                    ? data.shifts
                    : {},

            shiftHistory: Array.isArray(data.shiftHistory)
                ? data.shiftHistory
                : [],

            sales: Array.isArray(data.sales)
                ? data.sales
                : []
        };
    } catch (error) {
        console.error("DATA LOAD ERROR:", error.message);
        throw error;
    }
}

// ========================================================
// SAVE DATA
// ========================================================

let database = loadData();

function saveData(data) {
    const tempFile = DATA_FILE + ".tmp";

    try {
        fs.writeFileSync(
            tempFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        fs.renameSync(tempFile, DATA_FILE);

        return true;
    } catch (error) {
        console.error("DATA SAVE ERROR:", error.message);

        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch (_) {}

        return false;
    }
}

// ========================================================
// STAFF HELPERS
// ========================================================

function findStaff(username) {
    return database.staff.find(
        user => user.username === String(username || "")
    );
}

function findStaffByEmail(email) {
    if (!email) return null;

    const normalizedEmail = String(email).trim().toLowerCase();

    return database.staff.find(
        member =>
            member.email &&
            member.email.trim().toLowerCase() === normalizedEmail
    );
}

function managementAccess(user) {
    return Boolean(
        user &&
        (user.role === "Owner" || user.role === "Manager")
    );
}

function todayStart() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}

// ========================================================
// FIREBASE AUTHENTICATION
// ========================================================

async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Missing Firebase token."
            });
        }

        const decodedToken = await firebaseAuth.verifyIdToken(token);

        if (!decodedToken.email || !decodedToken.email_verified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email first."
            });
        }

        const staff = findStaffByEmail(decodedToken.email);

        if (!staff) {
            return res.status(403).json({
                success: false,
                message: "This email is not approved for Irish Pub staff."
            });
        }

        req.firebaseUser = decodedToken;
        req.staff = staff;

        next();
    } catch (error) {
        console.error(
            "Firebase authentication error:",
            error.code || "",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired login. Please login again."
        });
    }
}

function requireManagement(req, res, next) {
    if (!managementAccess(req.staff)) {
        return res.status(403).json({
            success: false,
            message: "Only Owner or Manager can access this feature."
        });
    }

    next();
}

// ========================================================
// TEST ROUTES
// ========================================================

app.get("/test", (req, res) => {
    res.send("Irish Pub Server Working!");
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Irish Pub API is working."
    });
});

// ========================================================
// CHECK APPROVED EMAIL
// ========================================================

app.post("/api/auth/check-email", (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required."
        });
    }

    const approvedStaff = findStaffByEmail(email);

    if (!approvedStaff) {
        return res.status(403).json({
            success: false,
            message: "This email is not approved for Irish Pub staff."
        });
    }

    return res.json({
        success: true,
        message: "Email approved."
    });
});
// ==========================================
// STAFF REGISTRATION DISCORD NOTIFICATION
// ==========================================

app.post("/api/auth/register-profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing."
            });
        }

        // Verify Firebase account
        const decodedToken = await firebaseAuth.verifyIdToken(token);

        const name = String(req.body.name || "").trim();
        const cityName = String(req.body.cityName || "").trim();
        const cid = String(req.body.cid || "").trim();
        const cityNumber = String(req.body.cityNumber || "").trim();
        const discord = String(req.body.discord || "").trim();
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        // Ensure submitted email matches Firebase account
        if (
            !decodedToken.email ||
            decodedToken.email.toLowerCase() !== email
        ) {
            return res.status(403).json({
                success: false,
                message: "Email verification failed."
            });
        }

        if (!name || !cityName || !cid ||
            !cityNumber || !discord || !email) {
            return res.status(400).json({
                success: false,
                message: "All registration fields are required."
            });
        }

        // Existing approved staff cannot register again
        if (findStaffByEmail(email)) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        const webhookUrl = process.env.DISCORD_STAFF_WEBHOOK_URL;

        if (!webhookUrl) {
            console.error("DISCORD_STAFF_WEBHOOK_URL is missing.");

            return res.status(500).json({
                success: false,
                message: "Registration notification is not configured."
            });
        }

        // Password is intentionally NOT sent to Discord.
        const discordResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                embeds: [{
                    title: "☘️ New Irish Pub Staff Registration",
                    color: 3066993,
                    fields: [
                        { name: "Name", value: name, inline: true },
                        { name: "City Name", value: cityName, inline: true },
                        { name: "CID", value: cid, inline: true },
                        { name: "City Number", value: cityNumber, inline: true },
                        { name: "Discord", value: discord, inline: true },
                        { name: "Gmail", value: email, inline: false },
                        {
                            name: "Status",
                            value: "Pending Owner Approval",
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Irish Pub • Developed By Mohsin"
                    }
                }]
            })
        });

        if (!discordResponse.ok) {
            console.error(
                "Staff registration Discord notification failed:",
                discordResponse.status
            );

            return res.status(502).json({
                success: false,
                message: "Could not send registration notification."
            });
        }

        return res.json({
            success: true,
            message: "Registration notification sent."
        });

    } catch (error) {
        console.error("Staff registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});
// ========================================================
// CURRENT AUTHENTICATED USER
// ========================================================

app.get("/api/me", verifyFirebaseToken, (req, res) => {
    res.json({
        success: true,
        allowed: true,

        staff: {
            name: req.staff.name,
            username: req.staff.username,
            role: req.staff.role,
            email: req.staff.email
        }
    });
});

// ========================================================
// PUBLIC WEBSITE
// ========================================================

app.use(express.static(__dirname, {
    index: "index.html"
}));

// STAFF PORTAL ROUTE
app.get("/staff", (req, res) => {
    res.sendFile(path.join(__dirname, "Staff", "index.html"));
});

app.get("/staff/", (req, res) => {
    res.sendFile(path.join(__dirname, "Staff", "index.html"));
});


// ========================================================
// STAFF WEBSITE
// ========================================================

app.use(
    "/staff",
    express.static(path.join(__dirname, "staff"))
);

// ========================================================
// STAFF API
// ========================================================

app.get("/api/staff", verifyFirebaseToken, (req, res) => {
    res.json(
        database.staff.map(member => ({
            name: member.name,
            username: member.username,
            role: member.role,
            email: member.email || ""
        }))
    );
});

app.get("/api/staff/:username", verifyFirebaseToken, (req, res) => {
    const user = findStaff(req.params.username);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "Staff member not found."
        });
    }

    res.json({
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email || ""
    });
});

// ========================================================
// SHIFT TIME CALCULATION
// ========================================================

function calculateDutyTime(username) {
    let total = 0;

    database.shiftHistory.forEach(shift => {
        if (
            shift.username === username &&
            shift.startedAt &&
            shift.endedAt
        ) {
            const start = new Date(shift.startedAt).getTime();
            const end = new Date(shift.endedAt).getTime();

            if (end > start) {
                total += Math.floor((end - start) / 1000);
            }
        }
    });

    const active = database.shifts[username];

    if (active && active.startedAt) {
        const start = new Date(active.startedAt).getTime();
        const now = Date.now();

        if (now > start) {
            total += Math.floor((now - start) / 1000);
        }
    }

    return total;
}

// ========================================================
// CURRENT SHIFT
// ========================================================

app.get("/api/shift/current", verifyFirebaseToken, (req, res) => {
    const username = String(req.query.username || "");

    // Staff may only check their own shift.
    if (username !== req.staff.username) {
        return res.status(403).json({
            success: false,
            message: "You can only check your own shift."
        });
    }

    const shift = database.shifts[req.staff.username];

    if (!shift) {
        return res.json({
            success: true,
            active: false,
            shift: null
        });
    }

    res.json({
        success: true,
        active: true,
        shift,
        currentShift: shift,
        startedAt: shift.startedAt
    });
});
// ========================================================
// IRISH PUB SHIFT DISCORD NOTIFICATION
// ========================================================

async function sendShiftDiscordNotification(title, color, fields) {
    try {
        const webhookURL = process.env.DISCORD_WEBHOOK_URL;

        if (!webhookURL) {
            console.log("Shift Discord webhook is not configured.");
            return;
        }

        const response = await fetch(webhookURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                embeds: [
                    {
                        title,
                        color,
                        fields,
                        footer: {
                            text: "Irish Pub • Developed By Mohsin"
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            })
        });

        if (!response.ok) {
            console.error(
                "SHIFT DISCORD ERROR:",
                response.status,
                await response.text()
            );
        } else {
            console.log("Shift Discord notification sent.");
        }
    } catch (error) {
        console.error("SHIFT DISCORD ERROR:", error.message);
    }
}
// ========================================================
// START SHIFT
// ========================================================

app.post("/api/shift/start", verifyFirebaseToken, (req, res) => {
    try {
        const username = req.staff.username;

        if (database.shifts[username]) {
            return res.status(400).json({
                success: false,
                message: "Your shift is already active."
            });
        }

        const startedAt = new Date().toISOString();

        const shift = {
            username,
            staffName: req.staff.name,
            startedAt
        };

        database.shifts[username] = shift;

        if (!saveData(database)) {
            delete database.shifts[username];

            return res.status(500).json({
                success: false,
                message: "Could not save shift."
            });
        }

        console.log(`${req.staff.name} started shift.`);
        sendShiftDiscordNotification(
    "🟢 SHIFT STARTED",
    0x2ecc71,
    [
        {
            name: "Staff Name",
            value: req.staff.name || "Unknown",
            inline: true
        },
        {
            name: "Username",
            value: req.staff.username || "Unknown",
            inline: true
        },
        {
            name: "Shift Start",
            value: `<t:${Math.floor(new Date(startedAt).getTime() / 1000)}:F>`,
            inline: false
        },
        {
            name: "Status",
            value: "Shift is now active.",
            inline: false
        }
    ]
);

        res.json({
            success: true,
            message: "Shift started successfully.",
            shift,
            startedAt
        });
    } catch (error) {
        console.error("START SHIFT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not start shift."
        });
    }
});

// ========================================================
// END SHIFT
// ========================================================

app.post("/api/shift/end", verifyFirebaseToken, (req, res) => {
    try {
        const username = req.staff.username;
        const activeShift = database.shifts[username];

        if (!activeShift) {
            return res.status(400).json({
                success: false,
                message: "No active shift found."
            });
        }

        const endedAt = new Date().toISOString();

        const start = new Date(activeShift.startedAt).getTime();
        const end = new Date(endedAt).getTime();

        const duration = Math.max(
            0,
            Math.floor((end - start) / 1000)
        );

        const completedShift = {
            username,
            staffName: req.staff.name,
            startedAt: activeShift.startedAt,
            endedAt,
            duration
        };

        database.shiftHistory.push(completedShift);
        delete database.shifts[username];

        if (!saveData(database)) {
            database.shiftHistory.pop();
            database.shifts[username] = activeShift;

            return res.status(500).json({
                success: false,
                message: "Could not save shift."
            });
        }

        console.log(`${req.staff.name} ended shift.`);
        const hours = Math.floor(duration / 3600);
const minutes = Math.floor((duration % 3600) / 60);
const seconds = duration % 60;

sendShiftDiscordNotification(
    "🔴 SHIFT ENDED",
    0xe74c3c,
    [
        {
            name: "Staff Name",
            value: req.staff.name || "Unknown",
            inline: true
        },
        {
            name: "Username",
            value: req.staff.username || "Unknown",
            inline: true
        },
        {
            name: "Shift Started",
            value: `<t:${Math.floor(start / 1000)}:F>`,
            inline: false
        },
        {
            name: "Shift Ended",
            value: `<t:${Math.floor(end / 1000)}:F>`,
            inline: false
        },
        {
            name: "Total Duty Time",
            value: `${hours}h ${minutes}m ${seconds}s`,
            inline: false
        }
    ]
);

        res.json({
            success: true,
            message: "Shift ended successfully.",
            shift: completedShift,
            endedAt,
            duration
        });
    } catch (error) {
        console.error("END SHIFT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not end shift."
        });
    }
});


/* ========================================================
SALES HISTORY — GET
======================================================== */

app.get("/api/sales", verifyFirebaseToken, (req, res) => {
try {
const sales = managementAccess(req.staff)
? database.sales
: database.sales.filter(
sale => sale.username === req.staff.username
);

    return res.json({
        success: true,
        sales
    });

} catch (error) {
    console.error("LOAD SALES ERROR:", error);

    return res.status(500).json({
        success: false,
        message: "Unable to load sales history."
    });
}

});

/* ========================================================
TRUSTED SERVER-SIDE MENU
======================================================== */

const SALE_MENU = [
{ id: "smores", name: "S'mores", price: 40 },
{ id: "skittles", name: "Skittles", price: 45 },
{ id: "hot-dog", name: "Hot Dog", price: 60 },
{ id: "ham-sandwich", name: "Ham Sandwich", price: 60 },
{ id: "nachos", name: "Nachos", price: 50 },
{ id: "toyto-chips", name: "Toyto Chips", price: 20 },
{ id: "shepherds-pie", name: "Shepherd's Pie", price: 75 },
{ id: "fish-and-chips", name: "Fish And Chips", price: 80 },
{ id: "fries", name: "Fries", price: 80 },

{ id: "irish-coffee", name: "Irish Coffee", price: 50 },
{ id: "guinness", name: "Guinness", price: 40 },
{ id: "jameson", name: "Jameson", price: 180 },
{ id: "whiskey", name: "Whiskey", price: 170 },
{ id: "rum", name: "Rum", price: 90 },
{ id: "vodka", name: "Vodka", price: 90 },
{ id: "tequila", name: "Tequila", price: 80 },
{ id: "absinthe", name: "Absinthe", price: 140 },
{ id: "beer", name: "Beer", price: 120 },
{ id: "cider", name: "Cider", price: 100 },
{ id: "sweet-tea", name: "Sweet Tea", price: 50 },
{ id: "green-cow", name: "Green Cow", price: 60 },
{ id: "water", name: "Water", price: 20 },
{ id: "delicioussmoothie", name: "Delicious Smoothie", price: 80 },
{ id: "suspicioussmoothie", name: "Suspicious Smoothie", price: 80 },
{ id: "sprunk", name: "Sprunk", price: 70 },
{ id: "cocacola", name: "Coca Cola", price: 60 }

];

/* ========================================================
COMPLETE SALE — POST
======================================================== */

app.post("/api/sales", verifyFirebaseToken, async (req, res) => {
try {
const username = req.staff.username;
const user = req.staff;

    const { items, discount } = req.body;

    // Require an active shift
    if (!database.shifts[username]) {
        return res.status(400).json({
            success: false,
            message: "Please start your shift before completing a sale."
        });
    }

    // Validate cart
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No items in the order."
        });
    }

    // Validate each item against the server-side menu
    const cleanItems = [];

    for (const item of items) {
        const id = String(item.id || "").trim();
        const quantity = Number(item.quantity);

        const menuItem = SALE_MENU.find(
            product => product.id === id
        );

        if (
            !menuItem ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 1000
        ) {
            return res.status(400).json({
                success: false,
                message: `Invalid sale item: ${id || "unknown"}`
            });
        }

        cleanItems.push({
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity
        });
    }

    // Calculate subtotal
    const subtotal = cleanItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // Validate discount
    const requestedDiscount =
        discount === undefined || discount === null || discount === ""
            ? 0
            : Number(discount);

    if (
        !Number.isFinite(requestedDiscount) ||
        requestedDiscount < 0 ||
        requestedDiscount > subtotal
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid discount amount."
        });
    }

    const safeDiscount = Number(requestedDiscount.toFixed(2));

    // Calculate 5% tax
    const tax = Number(
        ((subtotal - safeDiscount) * 0.05).toFixed(2)
    );

    const total = Number(
        (subtotal - safeDiscount + tax).toFixed(2)
    );

    // Create sale record
    const sale = {
        id: crypto.randomUUID(),
        username,
        staffName: user.name || username,
        items: cleanItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount: safeDiscount,
        tax,
        total,
        createdAt: new Date().toISOString()
    };

    // Save sale to database
    database.sales.push(sale);

    if (!saveData(database)) {
        database.sales.pop();

        return res.status(500).json({
            success: false,
            message: "Could not save sale."
        });
    }

    console.log(
        "SALE COMPLETED:",
        sale.staffName,
        sale.total
    );

    // Discord notification
    const webhook =
        process.env.DISCORD_SALES_WEBHOOK_URL;

    if (webhook) {
        try {
            const itemText = sale.items
                .map(item =>
                    `${item.name} x${item.quantity} - $${(
                        item.price * item.quantity
                    ).toFixed(2)}`
                )
                .join("\n")
                .slice(0, 1000);

            const embed = {
                title: "💰 IRISH PUB — NEW SALE",
                color: 12953181,
                fields: [
                    {
                        name: "👤 Staff",
                        value: String(sale.staffName).slice(0, 1024),
                        inline: true
                    },
                    {
                        name: "🆔 Username",
                        value: String(sale.username).slice(0, 1024),
                        inline: true
                    },
                    {
                        name: "🍽 Items",
                        value: itemText || "No items",
                        inline: false
                    },
                    {
                        name: "💵 Subtotal",
                        value: `$${sale.subtotal.toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: "🏷 Discount",
                        value: `$${sale.discount.toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: "🧾 Tax (5%)",
                        value: `$${sale.tax.toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: "💰 Total",
                        value: `$${sale.total.toFixed(2)}`,
                        inline: true
                    }
                ],
                footer: {
                    text: "Irish Pub • Developed By Mohsin"
                },
                timestamp: sale.createdAt
            };

            const response = await fetch(webhook, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: "Irish Pub Sales",
                    embeds: [embed]
                })
            });

            if (!response.ok) {
                console.error(
                    "SALES DISCORD ERROR:",
                    response.status,
                    await response.text()
                );
            }
        } catch (discordError) {
            // Sale is already saved; notification failure won't undo it
            console.error(
                "SALES DISCORD ERROR:",
                discordError.message
            );
        }
    }

    // Respond to frontend
    return res.status(201).json({
        success: true,
        message: "Sale completed successfully.",
        sale
    });

} catch (error) {
    console.error("SALE ERROR:", error);

    return res.status(500).json({
        success: false,
        message: "Could not complete sale."
    });
}

});


// ========================================================
// DASHBOARD
// ========================================================

app.get(
    "/api/dashboard",
    verifyFirebaseToken,
    requireManagement,
    (req, res) => {
        try {
            let totalSales = 0;
            let totalOrders = 0;
            let totalDutyTime = 0;
            let todaySales = 0;

            const startToday = todayStart();

            database.sales.forEach(sale => {
                totalSales += Number(sale.total) || 0;
                totalOrders++;

                const saleDate = new Date(sale.createdAt);

                if (
                    !Number.isNaN(saleDate.getTime()) &&
                    saleDate >= startToday
                ) {
                    todaySales += Number(sale.total) || 0;
                }
            });

            database.staff.forEach(person => {
                totalDutyTime += calculateDutyTime(person.username);
            });

            const staffPerformance = database.staff.map(person => {
                const personSales = database.sales.filter(
                    sale => sale.username === person.username
                );

                const sales = personSales.reduce(
                    (sum, sale) => sum + (Number(sale.total) || 0),
                    0
                );

                return {
                    name: person.name,
                    username: person.username,
                    role: person.role,
                    orders: personSales.length,
                    sales,
                    dutyTime: calculateDutyTime(person.username)
                };
            });

            res.json({
                success: true,
                totalSales,
                totalOrders,
                totalDutyTime,
                todaySales,
                staffPerformance,
                recentSales: database.sales.slice(-20).reverse()
            });
        } catch (error) {
            console.error("DASHBOARD ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Could not load dashboard."
            });
        }
    }
);

// ========================================================
// RESET DASHBOARD
// ========================================================

app.post(
    "/api/dashboard/reset",
    verifyFirebaseToken,
    requireManagement,
    (req, res) => {
        try {
            const oldSales = database.sales;
            const oldHistory = database.shiftHistory;

            database.sales = [];
            database.shiftHistory = [];

            if (!saveData(database)) {
                database.sales = oldSales;
                database.shiftHistory = oldHistory;

                return res.status(500).json({
                    success: false,
                    message: "Could not save dashboard reset."
                });
            }

            console.log(`Dashboard reset by ${req.staff.name}`);

            res.json({
                success: true,
                message: "Dashboard data has been reset."
            });
        } catch (error) {
            console.error("RESET ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Dashboard reset failed."
            });
        }
    }
);

// ========================================================
// STAFF ROLE UPDATE
// ========================================================

app.post(
    "/api/staff/roles",
    verifyFirebaseToken,
    requireManagement,
    (req, res) => {
        try {
            const currentUser = req.staff;
            const changes = req.body.changes;

            if (!Array.isArray(changes)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid staff changes."
                });
            }

            const oldRoles = database.staff.map(member => ({
                username: member.username,
                role: member.role
            }));

            for (const change of changes) {
                if (
                    !change ||
                    typeof change.username !== "string"
                ) {
                    continue;
                }

                if (!ALLOWED_ROLES.includes(change.role)) {
                    for (const old of oldRoles) {
                        const member = findStaff(old.username);
                        if (member) member.role = old.role;
                    }

                    return res.status(400).json({
                        success: false,
                        message: "Invalid role."
                    });
                }

                const target = findStaff(change.username);

                if (!target) {
                    for (const old of oldRoles) {
                        const member = findStaff(old.username);
                        if (member) member.role = old.role;
                    }

                    return res.status(404).json({
                        success: false,
                        message: `Staff member not found: ${change.username}`
                    });
                }

                // The primary Owner cannot be demoted.
                if (
                    target.username === "mohsin" &&
                    change.role !== "Owner"
                ) {
                    for (const old of oldRoles) {
                        const member = findStaff(old.username);
                        if (member) member.role = old.role;
                    }

                    return res.status(403).json({
                        success: false,
                        message: "The primary Owner cannot be demoted."
                    });
                }

                // Managers cannot assign or change Owner roles.
                if (
                    currentUser.role === "Manager" &&
                    (
                        target.role === "Owner" ||
                        change.role === "Owner"
                    )
                ) {
                    for (const old of oldRoles) {
                        const member = findStaff(old.username);
                        if (member) member.role = old.role;
                    }

                    return res.status(403).json({
                        success: false,
                        message: "Managers cannot change Owner positions."
                    });
                }

                target.role = change.role;
            }

            const ownerCount = database.staff.filter(
                member => member.role === "Owner"
            ).length;

            if (ownerCount < 1) {
                for (const old of oldRoles) {
                    const member = findStaff(old.username);
                    if (member) member.role = old.role;
                }

                return res.status(400).json({
                    success: false,
                    message: "At least one Owner is required."
                });
            }

            if (!saveData(database)) {
                for (const old of oldRoles) {
                    const member = findStaff(old.username);
                    if (member) member.role = old.role;
                }

                return res.status(500).json({
                    success: false,
                    message: "Could not save staff positions."
                });
            }

            console.log(
                `Staff positions updated by ${currentUser.name}`
            );

            res.json({
                success: true,
                message: "Staff positions saved successfully!",

                staff: database.staff.map(member => ({
                    name: member.name,
                    username: member.username,
                    role: member.role,
                    email: member.email || ""
                }))
            });
        } catch (error) {
            console.error("ROLE UPDATE ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Could not update staff positions."
            });
        }
    }
);

// ========================================================
// CAREERS APPLICATION
// ========================================================

app.post("/api/apply", async (req, res) => {
    try {
        const data = req.body;

        if (!process.env.DISCORD_WEBHOOK) {
            return res.status(500).json({
                success: false,
                message: "Discord webhook is not configured on the server."
            });
        }

        const fields = [
            ["👤 Full Name", data.fullName],
            ["🎭 RP Name", data.rpName],
            ["🆔 CID", data.cid],
            ["📱 Phone Number", data.phone],
            ["🎂 Age", data.age],
            ["💬 Discord ID", data.discord],
            ["📋 Previous Experience", data.experience],
            ["❓ Why do you want to join?", data.reason]
        ];

        const embed = {
            title: "🟢 NEW IRISH PUB APPLICATION",
            color: 12953181,

            fields: fields.map(([name, value]) => ({
                name,
                value: String(value || "Not provided").slice(0, 1000),
                inline: false
            })),

            footer: {
                text: "Irish Pub • GTA RP Recruitment • Made By Mohsin"
            },

            timestamp: new Date().toISOString()
        };

        const discordResponse = await fetch(
            process.env.DISCORD_WEBHOOK,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: "Irish Pub Recruitment",
                    embeds: [embed]
                })
            }
        );

        if (!discordResponse.ok) {
            console.error(
                "DISCORD ERROR:",
                discordResponse.status,
                await discordResponse.text()
            );

            return res.status(500).json({
                success: false,
                message: "Discord rejected the application."
            });
        }

        res.json({
            success: true,
            message: "Application submitted successfully!"
        });
    } catch (error) {
        console.error("APPLICATION ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Server error while sending application."
        });
    }
});

// ========================================================
// API 404 HANDLER
// ========================================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// ========================================================
// ERROR HANDLER
// ========================================================

app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// ========================================================
// START SERVER
// ========================================================

app.listen(PORT, () => {
    console.log("========================================");
    console.log(" Irish Pub Server Running");
    console.log(` http://localhost:${PORT}`);
    console.log(` Staff: http://localhost:${PORT}/staff/`);
    console.log("========================================");
});