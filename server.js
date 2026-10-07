const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* PUBLIC IRISH PUB WEBSITE */
app.use(express.static(__dirname));

/* STAFF MANAGEMENT WEBSITE */
app.use(
    "/staff",
    express.static(path.join(__dirname, "staff"))
);


/* =========================================================
   DATA FILE
========================================================= */

const DATA_FILE = path.join(__dirname, "irish-pub-data.json");


/* =========================================================
   DEFAULT STAFF
========================================================= */

const defaultData = {

    staff: [
        {
            name: "Mohsin",
            username: "mohsin",
            role: "Owner"
        },
        {
            name: "Manager",
            username: "manager",
            role: "Manager"
        },
        {
            name: "Alison Burgurs",
            username: "alison",
            role: "Staff"
        },
        {
            name: "Staff 2",
            username: "staff2",
            role: "Staff"
        }
    ],

    shifts: {},

    shiftHistory: [],

    sales: []
};


/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(defaultData, null, 2)
            );

            return JSON.parse(
                JSON.stringify(defaultData)
            );
        }

        const raw = fs.readFileSync(
            DATA_FILE,
            "utf8"
        );

        const data = JSON.parse(raw);

        return {
            staff: Array.isArray(data.staff)
                ? data.staff
                : defaultData.staff,

            shifts: data.shifts || {},

            shiftHistory: Array.isArray(data.shiftHistory)
                ? data.shiftHistory
                : [],

            sales: Array.isArray(data.sales)
                ? data.sales
                : []
        };

    } catch (error) {

        console.log(
            "DATA LOAD ERROR:",
            error
        );

        return JSON.parse(
            JSON.stringify(defaultData)
        );
    }
}


/* =========================================================
   SAVE DATA
========================================================= */

function saveData(data) {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );

    } catch (error) {

        console.log(
            "DATA SAVE ERROR:",
            error
        );
    }
}


/* =========================================================
   DATA
========================================================= */

let database = loadData();


/* =========================================================
   HELPERS
========================================================= */

function findStaff(username) {

    return database.staff.find(
        user =>
            user.username === String(username)
    );
}


function managementAccess(username) {

    const user = findStaff(username);

    if (!user) return false;

    return (
        user.role === "Owner" ||
        user.role === "Manager"
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


function calculateDutyTime(username) {

    let total = 0;

    database.shiftHistory.forEach(shift => {

        if (
            shift.username === username &&
            shift.startedAt &&
            shift.endedAt
        ) {

            const start =
                new Date(shift.startedAt).getTime();

            const end =
                new Date(shift.endedAt).getTime();

            if (end > start) {
                total +=
                    Math.floor(
                        (end - start) / 1000
                    );
            }
        }
    });


    /* Include active shift time */

    const active =
        database.shifts[username];

    if (
        active &&
        active.startedAt
    ) {

        const start =
            new Date(active.startedAt).getTime();

        const now =
            Date.now();

        if (now > start) {

            total +=
                Math.floor(
                    (now - start) / 1000
                );
        }
    }

    return total;
}


/* =========================================================
   TEST
========================================================= */

app.get("/test", function (req, res) {

    res.send(
        "Irish Pub Server Working!"
    );

});


/* =========================================================
   STAFF API
========================================================= */

/*
   GET ALL STAFF
*/

app.get("/api/staff", function (req, res) {

    try {

        res.json(database.staff);

    } catch (error) {

        console.log(
            "STAFF API ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Could not load staff."
        });
    }

});


/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/staff/:username", function (req, res) {

    const user =
        findStaff(req.params.username);

    if (!user) {

        return res.status(404).json({
            message:
                "Staff member not found."
        });
    }

    res.json(user);

});


/* =========================================================
   SHIFT CURRENT
========================================================= */

app.get(
    "/api/shift/current",
    function (req, res) {

        const username =
            String(req.query.username || "");

        const user =
            findStaff(username);

        if (!user) {

            return res.status(404).json({
                message:
                    "Staff member not found."
            });
        }

        const shift =
            database.shifts[username];

        if (!shift) {

            return res.json({
                active: false
            });
        }

        res.json({
            active: true,
            startedAt: shift.startedAt
        });

    }
);


/* =========================================================
   START SHIFT
========================================================= */

app.post(
    "/api/shift/start",
    function (req, res) {

        try {

            const username =
                String(req.body.username || "");

            const user =
                findStaff(username);

            if (!user) {

                return res.status(404).json({
                    message:
                        "Staff member not found."
                });
            }


            if (database.shifts[username]) {

                return res.status(400).json({
                    message:
                        "Your shift is already active."
                });
            }


            const startedAt =
                new Date().toISOString();


            database.shifts[username] = {

                username: username,

                staffName: user.name,

                startedAt: startedAt

            };


            saveData(database);


            console.log(
                `${user.name} started shift`
            );


            res.json({

                success: true,

                startedAt: startedAt

            });

        } catch (error) {

            console.log(
                "START SHIFT ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not start shift."
            });
        }

    }
);


/* =========================================================
   END SHIFT
========================================================= */

app.post(
    "/api/shift/end",
    function (req, res) {

        try {

            const username =
                String(req.body.username || "");

            const user =
                findStaff(username);

            if (!user) {

                return res.status(404).json({
                    message:
                        "Staff member not found."
                });
            }


            const activeShift =
                database.shifts[username];


            if (!activeShift) {

                return res.status(400).json({
                    message:
                        "No active shift found."
                });
            }


            const endedAt =
                new Date().toISOString();


            const start =
                new Date(
                    activeShift.startedAt
                ).getTime();

            const end =
                new Date(
                    endedAt
                ).getTime();


            const duration =
                Math.max(
                    0,
                    Math.floor(
                        (end - start) / 1000
                    )
                );


            database.shiftHistory.push({

                username: username,

                staffName: user.name,

                startedAt:
                    activeShift.startedAt,

                endedAt: endedAt,

                duration: duration

            });


            delete database.shifts[username];


            saveData(database);


            console.log(
                `${user.name} ended shift`
            );


            res.json({

                success: true,

                endedAt: endedAt,

                duration: duration

            });

        } catch (error) {

            console.log(
                "END SHIFT ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not end shift."
            });
        }

    }
);


/* =========================================================
   SALES
========================================================= */

app.post(
    "/api/sales",
    async function (req, res) {

        try {

            const {
                username,
                staffName,
                items,
                subtotal,
                discount,
                tax,
                total
            } = req.body;


            const user =
                findStaff(username);


            if (!user) {

                return res.status(404).json({
                    message:
                        "Staff member not found."
                });
            }


            /*
               Sale requires active shift
            */

            if (!database.shifts[username]) {

                return res.status(400).json({
                    message:
                        "Please start your shift before completing a sale."
                });
            }


            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({
                    message:
                        "No items in the order."
                });
            }


            const sale = {

                id:
                    Date.now().toString(),

                username:
                    username,

                staffName:
                    staffName ||
                    user.name,

                items:
                    items,

                subtotal:
                    Number(subtotal) || 0,

                discount:
                    Number(discount) || 0,

                tax:
                    Number(tax) || 0,

                total:
                    Number(total) || 0,

                createdAt:
                    new Date().toISOString()
            };


            database.sales.push(sale);


            saveData(database);


            console.log(
                "SALE COMPLETED:",
                sale.staffName,
                sale.total
            );


            /* =================================================
               DISCORD SALES NOTIFICATION
            ================================================= */

            if (process.env.DISCORD_SALES_WEBHOOK) {

                try {

                    const itemText =
                        sale.items
                            .map(item =>
                                `${item.name} x${item.quantity} - $${(
                                    Number(item.price) *
                                    Number(item.quantity)
                                ).toFixed(2)}`
                            )
                            .join("\n");


                    const embed = {

                        title:
                            "💰 IRISH PUB — NEW SALE",

                        color:
                            12953181,

                        fields: [

                            {
                                name:
                                    "👤 Staff",

                                value:
                                    String(
                                        sale.staffName
                                    ),

                                inline: true
                            },

                            {
                                name:
                                    "🆔 Username",

                                value:
                                    String(
                                        username
                                    ),

                                inline: true
                            },

                            {
                                name:
                                    "🍽 Items",

                                value:
                                    itemText ||
                                    "No items",

                                inline: false
                            },

                            {
                                name:
                                    "💵 Subtotal",

                                value:
                                    `$${sale.subtotal.toFixed(2)}`,

                                inline: true
                            },

                            {
                                name:
                                    "🏷 Discount",

                                value:
                                    `$${sale.discount.toFixed(2)}`,

                                inline: true
                            },

                            {
                                name:
                                    "🧾 Tax",

                                value:
                                    `$${sale.tax.toFixed(2)}`,

                                inline: true
                            },

                            {
                                name:
                                    "💰 Total",

                                value:
                                    `$${sale.total.toFixed(2)}`,

                                inline: true
                            }

                        ],

                        footer: {

                            text:
                                "Irish Pub • GTA RP • Made By Mohsin"

                        },

                        timestamp:
                            sale.createdAt
                    };


                    await fetch(
                        process.env.DISCORD_SALES_WEBHOOK,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    username:
                                        "Irish Pub Sales",

                                    embeds:
                                        [embed]

                                })

                        }
                    );

                } catch (discordError) {

                    console.log(
                        "SALES DISCORD ERROR:",
                        discordError
                    );

                }

            }


            res.json({

                success: true,

                message:
                    "Sale completed successfully.",

                sale: sale

            });

        } catch (error) {

            console.log(
                "SALE ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not complete sale."
            });
        }

    }
);


/* =========================================================
   DASHBOARD
========================================================= */

app.get(
    "/api/dashboard",
    function (req, res) {

        try {

            const username =
                String(
                    req.query.username || ""
                );


            const user =
                findStaff(username);


            if (!user) {

                return res.status(404).json({
                    message:
                        "Staff member not found."
                });
            }


            /*
               ONLY OWNER / MANAGER
            */

            if (
                user.role !== "Owner" &&
                user.role !== "Manager"
            ) {

                return res.status(403).json({
                    message:
                        "Only Owner or Manager can access the dashboard."
                });
            }


            let totalSales = 0;

            let totalOrders = 0;

            let totalDutyTime = 0;

            let todaySales = 0;


            const startToday =
                todayStart();


            database.sales.forEach(
                sale => {

                    totalSales +=
                        Number(sale.total) || 0;

                    totalOrders += 1;


                    const saleDate =
                        new Date(
                            sale.createdAt
                        );


                    if (
                        saleDate >=
                        startToday
                    ) {

                        todaySales +=
                            Number(
                                sale.total
                            ) || 0;

                    }

                }
            );


            database.staff.forEach(
                person => {

                    totalDutyTime +=
                        calculateDutyTime(
                            person.username
                        );

                }
            );


            /*
               STAFF PERFORMANCE
            */

            const staffPerformance =
                database.staff.map(
                    person => {

                        const personSales =
                            database.sales.filter(
                                sale =>
                                    sale.username ===
                                    person.username
                            );


                        const sales =
                            personSales.reduce(
                                (
                                    sum,
                                    sale
                                ) =>
                                    sum +
                                    (
                                        Number(
                                            sale.total
                                        ) || 0
                                    ),
                                0
                            );


                        return {

                            name:
                                person.name,

                            username:
                                person.username,

                            role:
                                person.role,

                            orders:
                                personSales.length,

                            sales:
                                sales,

                            dutyTime:
                                calculateDutyTime(
                                    person.username
                                )

                        };

                    }
                );


            /*
               RECENT SALES
            */

            const recentSales =
                database.sales
                    .slice(-20)
                    .reverse();


            res.json({

                totalSales:
                    totalSales,

                totalOrders:
                    totalOrders,

                totalDutyTime:
                    totalDutyTime,

                todaySales:
                    todaySales,

                staffPerformance:
                    staffPerformance,

                recentSales:
                    recentSales

            });

        } catch (error) {

            console.log(
                "DASHBOARD ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not load dashboard."
            });
        }

    }
);


/* =========================================================
   RESET DASHBOARD
========================================================= */

app.post(
    "/api/dashboard/reset",
    function (req, res) {

        try {

            const username =
                String(
                    req.body.username || ""
                );


            const user =
                findStaff(username);


            if (!user) {

                return res.status(404).json({
                    message:
                        "Staff member not found."
                });
            }


            if (
                user.role !== "Owner" &&
                user.role !== "Manager"
            ) {

                return res.status(403).json({
                    message:
                        "Only Owner or Manager can reset dashboard."
                });
            }


            /*
               Clear sales + completed shifts
            */

            database.sales = [];

            database.shiftHistory = [];


            /*
               Keep active shifts
            */

            saveData(database);


            console.log(
                `Dashboard reset by ${user.name}`
            );


            res.json({

                success: true,

                message:
                    "Dashboard data has been reset."

            });

        } catch (error) {

            console.log(
                "RESET ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Dashboard reset failed."
            });
        }

    }
);


/* =========================================================
   STAFF ROLE UPDATE
========================================================= */

app.post(
    "/api/staff/roles",
    function (req, res) {

        try {

            const {
                username,
                changes
            } = req.body;


            const currentUser =
                findStaff(username);


            if (!currentUser) {

                return res.status(404).json({
                    message:
                        "Current staff member not found."
                });
            }


            /*
               ONLY OWNER / MANAGER
            */

            if (
                currentUser.role !== "Owner" &&
                currentUser.role !== "Manager"
            ) {

                return res.status(403).json({
                    message:
                        "Only Owner or Manager can change positions."
                });
            }


            if (!Array.isArray(changes)) {

                return res.status(400).json({
                    message:
                        "Invalid staff changes."
                });
            }


            /*
               Validate roles
            */

            const allowedRoles = [
                "Owner",
                "Manager",
                "Staff"
            ];


            changes.forEach(change => {

                if (
                    !allowedRoles.includes(
                        change.role
                    )
                ) {
                    return;
                }


                const target =
                    findStaff(
                        change.username
                    );


                if (!target) {
                    return;
                }


                /*
                   Manager cannot change Owner
                */

                if (
                    currentUser.role === "Manager" &&
                    target.role === "Owner"
                ) {

                    return;
                }


                /*
                   Manager cannot promote someone to Owner
                */

                if (
                    currentUser.role === "Manager" &&
                    change.role === "Owner"
                ) {

                    return;
                }


                /*
                   Owner can change all roles
                */

                target.role =
                    change.role;

            });


            saveData(database);


            console.log(
                `Staff positions updated by ${currentUser.name}`
            );


            res.json({

                success: true,

                message:
                    "Staff positions saved successfully!",

                staff:
                    database.staff

            });

        } catch (error) {

            console.log(
                "ROLE UPDATE ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not update staff positions."
            });
        }

    }
);


/* =========================================================
   APPLICATION / CAREERS
========================================================= */

app.post(
    "/api/apply",
    async function (req, res) {

        try {

            const data = req.body;

            console.log(
                "Application received:",
                data.rpName
            );


            if (!process.env.DISCORD_WEBHOOK) {

                console.log(
                    "ERROR: DISCORD_WEBHOOK is missing"
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Discord webhook is not configured on the server."

                });
            }


            const embed = {

                title:
                    "🟢 NEW IRISH PUB APPLICATION",

                color:
                    12953181,


                fields: [

                    {
                        name:
                            "👤 Full Name",

                        value:
                            String(
                                data.fullName ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "🎭 RP Name",

                        value:
                            String(
                                data.rpName ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "🆔 CID",

                        value:
                            String(
                                data.cid ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "📱 Phone Number",

                        value:
                            String(
                                data.phone ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "🎂 Age",

                        value:
                            String(
                                data.age ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "💬 Discord ID",

                        value:
                            String(
                                data.discord ||
                                "Not provided"
                            ),

                        inline: true
                    },

                    {
                        name:
                            "📋 Previous Experience",

                        value:
                            String(
                                data.experience ||
                                "No previous experience"
                            ),

                        inline: false
                    },

                    {
                        name:
                            "❓ Why do you want to join?",

                        value:
                            String(
                                data.reason ||
                                "Not provided"
                            ),

                        inline: false
                    }

                ],


                footer: {

                    text:
                        "Irish Pub • GTA RP Recruitment • Made By Mohsin"

                },


                timestamp:
                    new Date().toISOString()

            };


            const discordResponse =
                await fetch(
                    process.env.DISCORD_WEBHOOK,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                username:
                                    "Irish Pub Recruitment",

                                embeds:
                                    [embed]

                            })

                    }
                );


            if (!discordResponse.ok) {

                const errorText =
                    await discordResponse.text();


                console.log(
                    "DISCORD ERROR:",
                    errorText
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Discord rejected the application."

                });

            }


            console.log(
                "DISCORD NOTIFICATION SENT!"
            );


            return res.json({

                success: true,

                message:
                    "Application submitted successfully!"

            });

        } catch (error) {

            console.log(
                "SERVER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error while sending application."

            });

        }

    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    function () {

        console.log(
            "========================================"
        );

        console.log(
            " Irish Pub Server Running"
        );

        console.log(
            ` http://localhost:${PORT}`
        );

        console.log(
            ` Staff: http://localhost:${PORT}/staff/`
        );

        console.log(
            "========================================"
        );

    }
);