const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/apply", async function (req, res) {

```
const data = req.body;

if (
    !data.fullName ||
    !data.rpName ||
    !data.cid ||
    !data.phone ||
    !data.age ||
    !data.discord ||
    !data.reason
) {
    return res.status(400).json({
        success: false,
        message: "Please complete all required fields."
    });
}

if (!process.env.DISCORD_WEBHOOK) {
    console.log("DISCORD_WEBHOOK is missing.");

    return res.status(500).json({
        success: false,
        message: "Discord webhook is not configured."
    });
}

try {

    const embed = {
        title: "🟢 NEW IRISH PUB APPLICATION",
        color: 12953181,

        fields: [
            {
                name: "👤 Full Name",
                value: String(data.fullName),
                inline: true
            },
            {
                name: "🎭 RP Name",
                value: String(data.rpName),
                inline: true
            },
            {
                name: "🆔 CID",
                value: String(data.cid),
                inline: true
            },
            {
                name: "📱 Phone Number",
                value: String(data.phone),
                inline: true
            },
            {
                name: "🎂 Age",
                value: String(data.age),
                inline: true
            },
            {
                name: "💬 Discord ID",
                value: String(data.discord),
                inline: true
            },
            {
                name: "📋 Previous Experience",
                value: String(
                    data.experience || "No previous experience provided."
                ),
                inline: false
            },
            {
                name: "❓ Why do you want to join?",
                value: String(data.reason),
                inline: false
            }
        ],

        footer: {
            text: "Irish Pub • GTA RP Recruitment"
        },

        timestamp: new Date().toISOString()
    };

    const response = await fetch(
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

    if (!response.ok) {

        const errorText = await response.text();

        console.log("Discord Error:");
        console.log(errorText);

        return res.status(500).json({
            success: false,
            message: "Discord rejected the application."
        });
    }

    console.log(
        "Application sent successfully from " + data.rpName
    );

    return res.json({
        success: true,
        message: "Application submitted successfully!"
    });

} catch (error) {

    console.log("Server Error:");
    console.log(error);

    return res.status(500).json({
        success: false,
        message: "Could not send application."
    });
}
```

});

app.listen(PORT, function () {
console.log(
"Irish Pub website running at http://localhost:" + PORT
);
});
