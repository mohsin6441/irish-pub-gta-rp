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
                [ // PERSONAL INFORMATION { name: "👤 APPLICANT INFORMATION", value: "**Full Name**\n" + `${String(data.fullName || "Not provided")}\n\n` + "**RP Name**\n" + `${String(data.rpName || "Not provided")}\n\n` + "**CID**\n" + `${String(data.cid || "Not provided")}`, inline: false }, // CONTACT INFORMATION { name: "📞 CONTACT INFORMATION", value: "**Phone Number**\n" + `${String(data.phone || "Not provided")}\n\n` + "**Age**\n" + `${String(data.age || "Not provided")}\n\n` + "**Discord ID**\n" + `${String(data.discord || "Not provided")}`, inline: false }, // EXPERIENCE { name: "📋 PREVIOUS EXPERIENCE", value: String( data.experience || "No previous experience provided." ), inline: false }, // REASON { name: "❓ WHY DO YOU WANT TO JOIN?", value: String( data.reason || "No reason provided." ), inline: false } ]
            ],

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