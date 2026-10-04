const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get("/test", function (req, res) {
    res.send("Irish Pub Server Working!");
});

app.post("/api/apply", async function (req, res) {
    try {
        const data = req.body;

        console.log("Application received:", data.rpName);

        if (!process.env.DISCORD_WEBHOOK) {
            console.log("ERROR: DISCORD_WEBHOOK is missing");

            return res.status(500).json({
                success: false,
                message: "Discord webhook is not configured on the server."
            });
        }

        const embed = {
            title: "🟢 NEW IRISH PUB APPLICATION",
            color: 12953181,

            fields: [
                {
                    name: "👤 Full Name",
                    value: String(data.fullName || "Not provided"),
                    inline: true
                },
                {
                    name: "🎭 RP Name",
                    value: String(data.rpName || "Not provided"),
                    inline: true
                },
                {
                    name: "🆔 CID",
                    value: String(data.cid || "Not provided"),
                    inline: true
                },
                {
                    name: "📱 Phone Number",
                    value: String(data.phone || "Not provided"),
                    inline: true
                },
                {
                    name: "🎂 Age",
                    value: String(data.age || "Not provided"),
                    inline: true
                },
                {
                    name: "💬 Discord ID",
                    value: String(data.discord || "Not provided"),
                    inline: true
                },
                {
                    name: "📋 Previous Experience",
                    value: String(data.experience || "No previous experience"),
                    inline: false
                },
                {
                    name: "❓ Why do you want to join?",
                    value: String(data.reason || "Not provided"),
                    inline: false
                }
            ],

            footer: {
                text: "Irish Pub • GTA RP Recruitment"
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
            const errorText = await discordResponse.text();

            console.log("DISCORD ERROR:", errorText);

            return res.status(500).json({
                success: false,
                message: "Discord rejected the application."
            });
        }

        console.log("DISCORD NOTIFICATION SENT!");

        return res.json({
            success: true,
            message: "Application submitted successfully!"
        });

    } catch (error) {
        console.log("SERVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while sending application."
        });
    }
});

app.listen(PORT, function () {
    console.log("Irish Pub server running on port " + PORT);
});