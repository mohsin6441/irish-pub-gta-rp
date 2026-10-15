require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName("duty")
        .setDescription("Staff duty report")
        .addStringOption(option =>
            option.setName("period")
                .setDescription("Select report period")
                .setRequired(true)
                .addChoices(
                    { name: "Daily", value: "daily" },
                    { name: "Weekly", value: "weekly" },
                    { name: "Monthly", value: "monthly" }
                )
        ),

    new SlashCommandBuilder()
        .setName("sales")
        .setDescription("Staff sales report")
        .addStringOption(option =>
            option.setName("period")
                .setDescription("Select report period")
                .setRequired(true)
                .addChoices(
                    { name: "Daily", value: "daily" },
                    { name: "Weekly", value: "weekly" },
                    { name: "Monthly", value: "monthly" }
                )
        ),

    new SlashCommandBuilder()
        .setName("onduty")
        .setDescription("Show staff currently on duty"),

    new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Sales leaderboard")
        .addStringOption(option =>
            option.setName("period")
                .setDescription("Select leaderboard period")
                .setRequired(true)
                .addChoices(
                    { name: "Daily", value: "daily" },
                    { name: "Weekly", value: "weekly" },
                    { name: "Monthly", value: "monthly" }
                )
        ),

    new SlashCommandBuilder()
        .setName("dailyreport")
        .setDescription("Complete daily sales and duty report")
].map(command => command.toJSON());

function getPeriodStart(period) {
    const now = new Date();
    const start = new Date(now);

    if (period === "daily") {
        start.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
        start.setHours(0, 0, 0, 0);

        const day = start.getDay();
        const daysSinceMonday = (day + 6) % 7;

        start.setDate(start.getDate() - daysSinceMonday);
    } else if (period === "monthly") {
        start.setHours(0, 0, 0, 0);
        start.setDate(1);
    }

    return start.getTime();
}

async function getReportData() {
    const response = await fetch(
        `${process.env.API_BASE_URL}/api/bot/report`,
        {
            headers: {
                "x-irish-pub-secret":
                    process.env.IRISH_PUB_API_SECRET
            },
            signal: AbortSignal.timeout(15000)
        }
    );

    if (!response.ok) {
        throw new Error(`Website API returned ${response.status}`);
    }

    return response.json();
}

function getSaleTime(sale) {
    const value =
        sale.createdAt ||
        sale.timestamp ||
        sale.date ||
        sale.soldAt;

    if (!value) return NaN;

    const time = new Date(value).getTime();

    return Number.isFinite(time) ? time : NaN;
}

function getSaleAmount(sale) {
    const amount = Number(
        sale.total ?? sale.grandTotal ?? sale.amount ?? 0
    );

    return Number.isFinite(amount) ? amount : 0;
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds));

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    return `${hours}h ${minutes}m`;
}

function getStaffName(username, staff) {
    const member = staff.find(
        person => person.username === username
    );

    return member?.name || username || "Unknown";
}

function makeEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || "No records found.")
        .setColor(0x176b45)
        .setFooter({
            text: "Irish Pub • Developed By Mohsin"
        })
        .setTimestamp();
}

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        const rest = new REST({ version: "10" })
            .setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("Irish Pub slash commands registered.");
    } catch (error) {
        console.error("COMMAND REGISTRATION ERROR:", error.message);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply();

    try {
        const data = await getReportData();

        const staff = data.staff || [];
        const sales = data.sales || [];
        const history = data.shiftHistory || [];
        const activeShifts = data.shifts || {};

        const command = interaction.commandName;
        const period = interaction.options.getString("period");
        const periodStart = period ? getPeriodStart(period) : getPeriodStart("daily");
        const now = Date.now();

        if (command === "onduty") {
            const entries = Object.entries(activeShifts);

            const description = entries.length
                ? entries.map(([username, shift]) => {
                    const startedAt = new Date(shift.startedAt).getTime();
                    const elapsed = Number.isFinite(startedAt)
                        ? Math.floor((now - startedAt) / 1000)
                        : 0;

                    return `🟢 **${getStaffName(username, staff)}** — ${formatDuration(elapsed)}`;
                }).join("\n")
                : "Nobody is currently on duty.";

            return interaction.editReply({
                embeds: [makeEmbed("🟢 Staff On Duty", description)]
            });
        }

        if (command === "sales" || command === "leaderboard" || command === "dailyreport") {
            const filteredSales = sales.filter(sale => {
                const time = getSaleTime(sale);

                return Number.isFinite(time) &&
                    time >= periodStart &&
                    time <= now;
            });

            const totals = new Map();

            for (const sale of filteredSales) {
                const username = sale.username || "unknown";

                if (!totals.has(username)) {
                    totals.set(username, { amount: 0, count: 0 });
                }

                const item = totals.get(username);

                item.amount += getSaleAmount(sale);
                item.count++;
            }

            const ranking = [...totals.entries()]
                .sort((a, b) => b[1].amount - a[1].amount);

            if (command === "sales" || command === "leaderboard") {
                const title = command === "sales"
                    ? `💰 ${period.toUpperCase()} SALES REPORT`
                    : `🏆 ${period.toUpperCase()} SALES LEADERBOARD`;

                const description = ranking.length
                    ? ranking.map(([username, value], index) =>
                        `${command === "leaderboard" ? `${index + 1}. ` : ""}**${getStaffName(username, staff)}** — $${value.amount.toFixed(2)} (${value.count} sales)`
                    ).join("\n")
                    : "No sales found for this period.";

                return interaction.editReply({
                    embeds: [makeEmbed(title, description)]
                });
            }

            const dutyTotals = new Map();

            for (const shift of history) {
                const start = new Date(shift.startedAt).getTime();
                const end = new Date(shift.endedAt).getTime();

                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    continue;
                }

                const overlapStart = Math.max(start, periodStart);
                const overlapEnd = Math.min(end, now);

                if (overlapEnd <= overlapStart) continue;

                const username = shift.username || "unknown";

                dutyTotals.set(
                    username,
                    (dutyTotals.get(username) || 0) +
                    Math.floor((overlapEnd - overlapStart) / 1000)
                );
            }

            const salesText = ranking.length
                ? ranking.map(([username, value]) =>
                    `**${getStaffName(username, staff)}** — $${value.amount.toFixed(2)} (${value.count} sales)`
                ).join("\n")
                : "No sales recorded today.";

            const dutyText = [...dutyTotals.entries()]
                .map(([username, seconds]) =>
                    `**${getStaffName(username, staff)}** — ${formatDuration(seconds)}`
                ).join("\n") || "No completed shifts today.";

            return interaction.editReply({
                embeds: [
                    makeEmbed(
                        "📊 IRISH PUB DAILY REPORT",
                        `**Sales**\n${salesText}\n\n**Completed Duty**\n${dutyText}\n\n**Currently On Duty:** ${Object.keys(activeShifts).length}`
                    )
                ]
            });
        }

        if (command === "duty") {
            const dutyTotals = new Map();

            for (const shift of history) {
                const start = new Date(shift.startedAt).getTime();
                const end = new Date(shift.endedAt).getTime();

                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    continue;
                }

                const overlapStart = Math.max(start, periodStart);
                const overlapEnd = Math.min(end, now);

                if (overlapEnd <= overlapStart) continue;

                const username = shift.username || "unknown";

                dutyTotals.set(
                    username,
                    (dutyTotals.get(username) || 0) +
                    Math.floor((overlapEnd - overlapStart) / 1000)
                );
            }

            for (const [username, shift] of Object.entries(activeShifts)) {
                const start = new Date(shift.startedAt).getTime();

                if (!Number.isFinite(start)) continue;

                const overlapStart = Math.max(start, periodStart);

                if (now > overlapStart) {
                    dutyTotals.set(
                        username,
                        (dutyTotals.get(username) || 0) +
                        Math.floor((now - overlapStart) / 1000)
                    );
                }
            }

            const description = [...dutyTotals.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([username, seconds]) =>
                    `**${getStaffName(username, staff)}** — ${formatDuration(seconds)}`
                ).join("\n");

            return interaction.editReply({
                embeds: [
                    makeEmbed(
                        `⏱️ ${period.toUpperCase()} DUTY REPORT`,
                        description || "No duty records found."
                    )
                ]
            });
        }

    } catch (error) {
        console.error("REPORT ERROR:", error);

        return interaction.editReply({
            content: "Report load korte problem hoyeche. Website API, secret ebong sales data check koro.",
            embeds: []
        });
    }
});

if (!process.env.DISCORD_TOKEN ||
    !process.env.CLIENT_ID ||
    !process.env.GUILD_ID ||
    !process.env.IRISH_PUB_API_SECRET ||
    !process.env.API_BASE_URL) {
    console.error("Missing required .env settings.");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);