"use strict";

/* =========================================
   FIREBASE CONFIGURATION
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyB41KBPbcp0N2SmKKZNWgTZdDw88eD_Ozo",
    authDomain: "irish-pub-staff.firebaseapp.com",
    projectId: "irish-pub-staff",
    storageBucket: "irish-pub-staff.firebasestorage.app",
    messagingSenderId: "307025748732",
    appId: "1:307025748732:web:75a27d4ac53c5b455c6d79",
    measurementId: "G-X9SVS1RX94"
};

/* =========================================
   SETTINGS
========================================= */

const TAX_RATE = 0.05;

const MENU = [
    { id: "smores", name: "S'mores", price: 40, category: "Food", emoji: "🍫" },
    { id: "skittles", name: "Skittles", price: 45, category: "Food", emoji: "🍬" },
    { id: "hotdog", name: "Hot Dog", price: 60, category: "Food", emoji: "🌭" },
    { id: "ham-sandwich", name: "Ham Sandwich", price: 60, category: "Food", emoji: "🥪" },
    { id: "nachos", name: "Nachos", price: 50, category: "Food", emoji: "🧀" },
    { id: "toyto-chips", name: "Toyto Chips", price: 20, category: "Food", emoji: "🍟" },
    { id: "shepherd-pie", name: "Shepherd's Pie", price: 75, category: "Food", emoji: "🥧" },
    { id: "fish-chips", name: "Fish And Chips", price: 80, category: "Food", emoji: "🐟" },
    { id: "fries", name: "Fries", price: 80, category: "Food", emoji: "🍟" },

    { id: "irish-coffee", name: "Irish Coffee", price: 50, category: "Drinks", emoji: "☕" },
    { id: "guinness", name: "Guinness", price: 40, category: "Drinks", emoji: "🍺" },
    { id: "jameson", name: "Jameson", price: 180, category: "Drinks", emoji: "🥃" },
    { id: "whiskey", name: "Whiskey", price: 170, category: "Drinks", emoji: "🥃" },
    { id: "rum", name: "Rum", price: 90, category: "Drinks", emoji: "🍸" },
    { id: "vodka", name: "Vodka", price: 90, category: "Drinks", emoji: "🍸" },
    { id: "tequila", name: "Tequila", price: 80, category: "Drinks", emoji: "🥂" },
    { id: "absinthe", name: "Absinthe", price: 140, category: "Drinks", emoji: "🍹" },
    { id: "beer", name: "Beer", price: 120, category: "Drinks", emoji: "🍺" },
    { id: "cider", name: "Cider", price: 100, category: "Drinks", emoji: "🍻" },
    { id: "sweet-tea", name: "Sweet Tea", price: 50, category: "Drinks", emoji: "🧋" },
    { id: "green-cow", name: "Green Cow", price: 60, category: "Drinks", emoji: "🥤" },
    { id: "water", name: "Water", price: 20, category: "Drinks", emoji: "💧" },
    { id: "delicious-smoothie", name: "Delicious Smoothie", price: 80, category: "Drinks", emoji: "🥤" },
    { id: "suspicious-smoothie", name: "Suspicious Smoothie", price: 80, category: "Drinks", emoji: "🧪" },
    { id: "sprunk", name: "Sprunk", price: 70, category: "Drinks", emoji: "🥤" },
    { id: "coca-cola", name: "Coca Cola", price: 60, category: "Drinks", emoji: "🥤" }
];

let auth = null;
let currentUser = null;
let staffProfile = null;
let currentShift = null;
let cart = [];
let activeFilter = "All";
let registerMode = false;
let timerInterval = null;
let mySales = [];
let myDashboard = {};

/* =========================================
   HELPERS
========================================= */

const $ = selector => document.querySelector(selector);

function bind(selector, event, callback) {
    const element = $(selector);
    if (element) {
        element.addEventListener(event, callback);
    }
}

function money(value) {
    return "RM " + Number(value || 0).toFixed(2);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function setMessage(selector, message, isError = false) {
    const element = $(selector);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#f08c8c" : "#d8b76a";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur"
    });
}

function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(remainingSeconds).padStart(2, "0")
    ].join(":");
}

function hoursAndMinutes(milliseconds) {
    const minutes = Math.floor(Math.max(0, milliseconds) / 60000);
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getSaleTotal(sale) {
    return Number(sale?.total ?? sale?.grandTotal ?? 0);
}

function getSaleTime(sale) {
    return sale?.createdAt || sale?.timestamp || sale?.date || null;
}

function getShiftStart(shift) {
    if (!shift) return null;

    const value = shift.startTime || shift.startedAt || shift.start;

    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

/* =========================================
   API HELPER
========================================= */

async function api(url, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
    }

    console.log("API REQUEST:", url);

    const response = await fetch(url, {
        ...options,
        headers
    });

    const contentType = response.headers.get("content-type") || "";
    let result;

    if (contentType.includes("application/json")) {
        result = await response.json();
    } else {
        const responseText = await response.text();

        throw new Error(
            `Server returned non-JSON response (${response.status}): ` +
            responseText.slice(0, 120)
        );
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || result.error || `Request failed (${response.status})`
        );
    }

    return result;
}

/* =========================================
   AUTH SCREEN
========================================= */

function showAuthScreen() {
    const authScreen = $("#authScreen");
    const appScreen = $("#appScreen");

    if (authScreen) authScreen.classList.remove("hidden");
    if (appScreen) appScreen.classList.add("hidden");

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showApp() {
    const authScreen = $("#authScreen");
    const appScreen = $("#appScreen");

    if (authScreen) authScreen.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");

    renderMenu();
    renderCart();
    navigate("home");
}

/* =========================================
   FIREBASE INITIALIZATION
========================================= */

function initializeFirebase() {
    if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.projectId ||
        !firebaseConfig.appId
    ) {
        setMessage("#authMessage", "Firebase config is missing.", true);
        return;
    }

    if (!window.firebase) {
        setMessage(
            "#authMessage",
            "Firebase SDK load হয়নি। index.html-এ Firebase scripts check করো।",
            true
        );
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        auth = firebase.auth();

        auth.onAuthStateChanged(async user => {
            currentUser = user;

            if (!user) {
                staffProfile = null;
                currentShift = null;
                showAuthScreen();
                return;
            }

            try {
                const profile = await api("/api/me");

                staffProfile = profile.staff || profile;

                if (profile.allowed === false) {
                    throw new Error(
                        "Your email is not approved by the owner."
                    );
                }

                const emailElement = $("#staffEmail");
                const roleElement = $("#staffRole");
                const avatarElement = $("#avatar");

                if (emailElement) {
                    emailElement.textContent =
                        staffProfile.email || user.email || "Staff";
                }

                if (roleElement) {
                    roleElement.textContent =
                        staffProfile.role || "Staff Member";
                }

                if (avatarElement) {
                    avatarElement.textContent =
                        (staffProfile.name || user.displayName || "S")
                            .charAt(0)
                            .toUpperCase();
                }

                showApp();

                await refreshAll();

            } catch (error) {
                console.error("Staff profile error:", error);

                setMessage(
                    "#authMessage",
                    error.message || "Unable to load staff profile.",
                    true
                );

                await auth.signOut();
            }
        });

    } catch (error) {
        console.error("Firebase initialization error:", error);
        setMessage("#authMessage", error.message, true);
    }
}

/* =========================================
   LOGIN / SIGNUP
========================================= */

/* =========================================
   LOGIN / SIGNUP
========================================= */

let creatingAccount = false;

function switchAuthMode() {
    registerMode = !registerMode;

    const loginForm = $("#authForm");
    const signupForm = $("#signupForm");
    const signupButton = $("#showSignup");

    if (loginForm) {
        loginForm.classList.toggle("hidden", registerMode);
    }

    if (signupForm) {
        signupForm.classList.toggle("hidden", !registerMode);
    }

    if (signupButton) {
        signupButton.textContent = registerMode
            ? "Back to login"
            : "Create account";
    }

    setMessage("#authMessage", "");
    setMessage("#signupMessage", "");
}

bind("#showSignup", "click", switchAuthMode);
bind("#showLogin", "click", switchAuthMode);


/* =========================================
   LOGIN
========================================= */

bind("#authForm", "submit", async event => {
    event.preventDefault();

    if (!auth) {
        setMessage("#authMessage", "Firebase is not ready.", true);
        return;
    }

    const email = ($("#email")?.value || "").trim().toLowerCase();
    const password = $("#password")?.value || "";
    const button = $("#authButton");

    if (!email.endsWith("@gmail.com")) {
        setMessage("#authMessage", "শুধু Gmail ব্যবহার করো।", true);
        return;
    }

    if (button) button.disabled = true;

    setMessage("#authMessage", "Logging in...");

    try {
        await auth.signInWithEmailAndPassword(email, password);

    } catch (error) {
        console.error("Login error:", error);

        const messages = {
            "auth/invalid-credential": "Gmail অথবা Password ভুল।",
            "auth/user-not-found": "এই Gmail দিয়ে account পাওয়া যায়নি।",
            "auth/wrong-password": "Password ভুল।",
            "auth/invalid-email": "Gmail address সঠিক নয়।",
            "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে। পরে চেষ্টা করো।"
        };

        setMessage(
            "#authMessage",
            messages[error.code] || error.message || "Login failed.",
            true
        );

    } finally {
        if (button) button.disabled = false;
    }
});


/* =========================================
   STAFF REGISTRATION
========================================= */

bind("#signupForm", "submit", async event => {
    event.preventDefault();

    if (!auth) {
        setMessage("#signupMessage", "Firebase is not ready.", true);
        return;
    }

    const name = ($("#signupRealName")?.value || "").trim();
    const cityName = ($("#signupCityName")?.value || "").trim();
    const cid = ($("#signupCID")?.value || "").trim();
    const cityNumber = ($("#signupCityNumber")?.value || "").trim();
    const discord = ($("#signupDiscord")?.value || "").trim();
    const email = ($("#signupEmail")?.value || "").trim().toLowerCase();
    const password = $("#signupPassword")?.value || "";

    const button = $("#signupButton");

    if (!name || !cityName || !cid || !cityNumber ||
        !discord || !email || !password) {
        setMessage("#signupMessage", "সবগুলো Field পূরণ করো।", true);
        return;
    }

    if (!email.endsWith("@gmail.com")) {
        setMessage("#signupMessage", "শুধু Gmail address ব্যবহার করো।", true);
        return;
    }

    if (password.length < 6) {
        setMessage("#signupMessage", "Password কমপক্ষে ৬ অক্ষরের হতে হবে।", true);
        return;
    }

    if (button) button.disabled = true;

    creatingAccount = true;
    setMessage("#signupMessage", "Account তৈরি হচ্ছে...");

    let newUser = null;

    try {
        const credential = await auth.createUserWithEmailAndPassword(
            email,
            password
        );

        newUser = credential.user;

        await newUser.updateProfile({
            displayName: name
        });

        const token = await newUser.getIdToken();

        /*
         * এই API route server.js-এ যোগ করতে হবে।
         * Route তৈরি না হওয়া পর্যন্ত Registration সম্পূর্ণ হবে না।
         */

        const response = await fetch("/api/auth/register-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                cityName,
                cid,
                cityNumber,
                discord,
                email
            })
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || "Registration information save হয়নি।"
            );
        }

        await newUser.sendEmailVerification();
        await auth.signOut();

        registerMode = false;

        const loginForm = $("#authForm");
        const signupForm = $("#signupForm");

        if (loginForm) loginForm.classList.remove("hidden");
        if (signupForm) signupForm.classList.add("hidden");

        setMessage(
            "#authMessage",
            "Registration submitted! Gmail verify করো এবং Owner approval-এর জন্য অপেক্ষা করো।"
        );

    } catch (error) {
        console.error("Registration error:", error);

        /*
         * Firebase account তৈরি হওয়ার পর server request ব্যর্থ হলে
         * account স্বয়ংক্রিয়ভাবে delete করা হচ্ছে না।
         */

        setMessage(
            "#signupMessage",
            error.message || "Registration failed. আবার চেষ্টা করো।",
            true
        );

        if (newUser && auth.currentUser) {
            await auth.signOut().catch(() => {});
        }

    } finally {
        creatingAccount = false;

        if (button) button.disabled = false;
    }
});

/* =========================================
   NAVIGATION
========================================= */

function navigate(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.add("hidden");
    });

    const target = $(`#page-${page}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const titles = {
        home: "Welcome Back!",
        food: "Food & Drinks",
        sales: "Sales History",
        dashboard: "My Dashboard"
    };

    const pageTitle = $("#pageTitle");
    if (pageTitle) pageTitle.textContent = titles[page] || "Irish Pub";

    if (page === "sales") loadSales();
    if (page === "dashboard") loadDashboard();
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
});

/* =========================================
   SHIFT UI AND TIMER
========================================= */

function findShiftButton() {
    return $(
        "#shiftButton, #shiftToggle, #shiftAction, " +
        "#startShiftButton, #shiftStartButton, " +
        "#endShiftButton, #shiftEndButton, " +
        "[data-shift-toggle]"
        
    );
}

function updateShiftUI() {
    const active = Boolean(currentShift);
    const startDate = getShiftStart(currentShift);

    const statusElements = [
        "#shiftStatus",
        "#shiftBadge",
        "#shiftState",
        "[data-shift-status]"
    ];

    statusElements.forEach(selector => {
        const element = $(selector);

        if (element) {
            element.textContent = active ? "ON DUTY" : "OFF DUTY";
            element.classList.toggle("active", active);
            element.classList.toggle("on-duty", active);
            element.classList.toggle("off-duty", !active);
        }
    });

    const button = findShiftButton();

    if (button) {
        button.textContent = active ? "END SHIFT" : "START SHIFT";
        button.disabled = !staffProfile || !staffProfile.username;

        button.classList.toggle("active", active);
    }

    const startButton = $("#startShiftButton, #shiftStartButton");
    const endButton = $("#endShiftButton, #shiftEndButton");

    if (startButton && startButton !== button) {
        startButton.disabled = active || !staffProfile;
        startButton.classList.toggle("hidden", active);
    }

    if (endButton && endButton !== button) {
        endButton.disabled = !active;
        endButton.classList.toggle("hidden", !active);
    }

    const startTimeElement = $("#shiftStartTime");
    if (startTimeElement) {
        startTimeElement.textContent = startDate
            ? formatDate(startDate)
            : "Not started";
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function updateTimer() {
        const timer = $(
            "#shiftTimer, #shiftDuration, #shiftClock, " +
            "[data-shift-timer]"
        );

        if (!timer) return;

        if (!active || !startDate) {
            timer.textContent = "00:00:00";
            return;
        }

        timer.textContent = formatDuration(Date.now() - startDate.getTime());
    }

    updateTimer();

    if (active && startDate) {
        timerInterval = setInterval(updateTimer, 1000);
    }

    const dashboardShift = $("#dashboardShift");
    if (dashboardShift) {
        dashboardShift.textContent = active ? "ON DUTY" : "OFF DUTY";
    }
}

async function refreshShift() {
    if (!staffProfile?.username) {
        currentShift = null;
        updateShiftUI();
        return;
    }

    try {
        const username = encodeURIComponent(staffProfile.username);

        const result = await api(
            `/api/shift/current?username=${username}`
        );

        currentShift = result.shift || result.currentShift || null;

        if (!getShiftStart(currentShift)) {
            currentShift = null;
        }

        updateShiftUI();

    } catch (error) {
        console.error("Shift load error:", error);
    }
}

async function startShift() {
    if (!currentUser || !staffProfile?.username) {
        setMessage("#shiftMessage", "Login first.", true);
        return;
    }

    if (currentShift) {
        setMessage("#shiftMessage", "Your shift is already active.", true);
        return;
    }

    const button = findShiftButton();
    if (button) button.disabled = true;

    try {
        const result = await api("/api/shift/start", {
            method: "POST",
            body: JSON.stringify({
                username: staffProfile.username
            })
        });

        currentShift =
            result.shift ||
            result.currentShift ||
            result.data ||
            null;

        if (!currentShift) {
            await refreshShift();
        } else {
            updateShiftUI();
        }

        if (!currentShift) {
            setMessage(
                "#shiftMessage",
                "Server did not return an active shift. Refresh and check.",
                true
            );
            return;
        }

        setMessage("#shiftMessage", "Shift started successfully.");

        await loadDashboard();

    } catch (error) {
        console.error("Start shift error:", error);
        setMessage("#shiftMessage", error.message, true);

    } finally {
        if (button) button.disabled = false;
    }
}

async function endShift() {
const button = document.querySelector("#endShift");

if (!currentUser || !staffProfile?.username) {
    setMessage("#shiftMessage", "Please login first.", true);
    return;
}

if (button) {
    button.disabled = true;
    button.textContent = "ENDING SHIFT...";
}

try {
    // Check the latest shift status first
    await refreshShift();

    if (!currentShift) {
        setMessage("#shiftMessage", "No active shift found.", true);
        return;
    }

    setMessage("#shiftMessage", "Ending shift...");

    const result = await api("/api/shift/end", {
        method: "POST",
        body: JSON.stringify({})
    });

    if (!result.success) {
        throw new Error(result.message || "Could not end shift.");
    }

    currentShift = null;

    setMessage(
        "#shiftMessage",
        result.message || "Shift ended successfully!"
    );

    updateShiftUI();

    if (typeof refreshAll === "function") {
        await refreshAll();
    }

} catch (error) {
    console.error("END SHIFT ERROR:", error);

    setMessage(
        "#shiftMessage",
        error.message || "Failed to end shift.",
        true
    );

} finally {
    if (button) {
        button.disabled = false;
        button.textContent = "END SHIFT";
    }
}

}


function toggleShift() {
    if (currentShift) {
        endShift();
    } else {
        startShift();
    }
}

/*
 * Bind common button IDs. If your HTML uses different IDs,
 * the button selector must be matched to your actual HTML.
 */
[
    "#shiftButton",
    "#shiftToggle",
    "#shiftAction",
    "[data-shift-toggle]"
].forEach(selector => {
    bind(selector, "click", toggleShift);
});

[
"#startShift",
"#startShiftButton",
"#shiftStartButton"
].forEach(selector => {
bind(selector, "click", startShift);
});

[
"#endShift",
"#endShiftButton",
"#shiftEndButton"
].forEach(selector => {
bind(selector, "click", endShift);
});


/* =========================================
   MENU
========================================= */

function renderMenu() {
    const menuGrid = $("#menuGrid");
    if (!menuGrid) return;

    const items = MENU.filter(item =>
        activeFilter === "All" || item.category === activeFilter
    );

    menuGrid.innerHTML = items.map(item => `
        <article
            class="menu-item"
            data-add="${item.id}"
            role="button"
            tabindex="0"
            aria-label="Add ${escapeHTML(item.name)} to order"
        >
            <span class="menu-emoji">${item.emoji}</span>

            <h3>${escapeHTML(item.name)}</h3>

            <p>${money(item.price)}</p>

            <button type="button" tabindex="-1">
                + ADD TO ORDER
            </button>
        </article>
    `).join("");
}

bind("#menuGrid", "click", event => {
    const button = event.target.closest("[data-add]");
    if (!button) return;

    addToCart(button.dataset.add);
});

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "All";

        document.querySelectorAll(".filter-btn").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        renderMenu();
    });
});

function addToCart(id) {
    const item = MENU.find(menuItem => menuItem.id === id);
    if (!item) return;

    const existing = cart.find(cartItem => cartItem.id === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }

    renderCart();
}

function changeQuantity(id, amount) {
    const item = cart.find(cartItem => cartItem.id === id);
    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== id);
    }

    renderCart();
}

function renderCart() {
    const container = $("#cartItems");
    if (!container) return;

    const count = cart.reduce((total, item) => total + item.quantity, 0);

    const subtotal = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    if ($("#cartCount")) $("#cartCount").textContent = count;
    if ($("#cartSubtotal")) $("#cartSubtotal").textContent = money(subtotal);
    if ($("#cartTax")) $("#cartTax").textContent = money(tax);
    if ($("#cartTotal")) $("#cartTotal").textContent = money(total);

    if (!cart.length) {
        container.innerHTML =
            '<p class="empty-state">Your cart is empty.</p>';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-row">
            <div>
                <h4>${escapeHTML(item.name)}</h4>
                <small>${money(item.price)} each</small>

                <div class="quantity-control">
                    <button type="button" data-minus="${item.id}">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-plus="${item.id}">+</button>
                </div>
            </div>

            <strong>${money(item.price * item.quantity)}</strong>
        </div>
    `).join("");
}

bind("#cartItems", "click", event => {
    const minus = event.target.closest("[data-minus]");
    const plus = event.target.closest("[data-plus]");

    if (minus) changeQuantity(minus.dataset.minus, -1);
    if (plus) changeQuantity(plus.dataset.plus, 1);
});

bind("#clearCart", "click", () => {
    cart = [];
    renderCart();
    setMessage("#checkoutMessage", "");
});

/* =========================================
   CHECKOUT
========================================= */

bind("#checkoutButton", "click", async () => {
    if (!currentUser) {
        setMessage("#checkoutMessage", "Please login first.", true);
        return;
    }

    if (!cart.length) {
        setMessage("#checkoutMessage", "Cart is empty.", true);
        return;
    }

    if (!currentShift) {
        setMessage(
            "#checkoutMessage",
            "Start your shift before recording sales.",
            true
        );
        return;
    }

    const button = $("#checkoutButton");
    if (button) button.disabled = true;

    setMessage("#checkoutMessage", "Recording sale...");

    try {
        const result = await api("/api/sales", {
            method: "POST",
            body: JSON.stringify({
                items: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            })
        });

        cart = [];
        renderCart();

        const sale = result.sale || result;

        setMessage(
            "#checkoutMessage",
            `Sale completed successfully. Total: ${money(getSaleTotal(sale))}`
        );

        await refreshAll();

    } catch (error) {
        console.error("Checkout error:", error);
        setMessage("#checkoutMessage", error.message, true);

    } finally {
        if (button) button.disabled = false;
    }
});

/* =========================================
   SALES HISTORY
========================================= */

async function loadSales() {
    try {
        const result = await api("/api/sales");

        mySales = Array.isArray(result)
            ? result
            : Array.isArray(result.sales)
                ? result.sales
                : [];

        renderSales();

    } catch (error) {
        console.error("Load sales error:", error);

        const salesTable = $("#salesTable");

        if (salesTable) {
            salesTable.innerHTML =
                `<p class="empty-state">${escapeHTML(error.message)}</p>`;
        }
    }
}

function renderSales() {
    const total = mySales.reduce(
        (sum, sale) => sum + getSaleTotal(sale),
        0
    );

    if ($("#historyTotal")) {
        $("#historyTotal").textContent = money(total);
    }

    if ($("#historyCount")) {
        $("#historyCount").textContent = mySales.length;
    }

    const salesTable = $("#salesTable");
    const recentSales = $("#recentSales");

    if (!mySales.length) {
        if (salesTable) {
            salesTable.innerHTML =
                '<p class="empty-state">No sales recorded yet.</p>';
        }

        if (recentSales) {
            recentSales.innerHTML =
                '<p class="empty-state">No sales recorded yet.</p>';
        }

        return;
    }

    const rows = mySales.map(sale => {
        const items = Array.isArray(sale.items)
            ? sale.items.map(item =>
                `${escapeHTML(item.name || item.id || "Item")} × ${Number(item.quantity || 1)}`
            ).join(", ")
            : "Sale";

        return `
            <tr>
                <td>${escapeHTML(sale.id || sale.saleId || "—")}</td>
                <td>${escapeHTML(formatDate(getSaleTime(sale)))}</td>
                <td>${items}</td>
                <td>${money(getSaleTotal(sale))}</td>
            </tr>
        `;
    }).join("");

    const table = `
        <table>
            <thead>
                <tr>
                    <th>Sale ID</th>
                    <th>Date & Time</th>
                    <th>Items</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    if (salesTable) salesTable.innerHTML = table;

    if (recentSales) {
        const recentRows = mySales.slice(0, 5).map(sale => {
            const items = Array.isArray(sale.items)
                ? sale.items.map(item =>
                    `${escapeHTML(item.name || item.id || "Item")} × ${Number(item.quantity || 1)}`
                ).join(", ")
                : "Sale";

            return `
                <tr>
                    <td>${escapeHTML(formatDate(getSaleTime(sale)))}</td>
                    <td>${items}</td>
                    <td>${money(getSaleTotal(sale))}</td>
                </tr>
            `;
        }).join("");

        recentSales.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Items</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>${recentRows}</tbody>
            </table>
        `;
    }
}

bind("#refreshSales", "click", loadSales);

/* =========================================
   DASHBOARD
========================================= */

async function loadDashboard() {
try {
const result = await api("/api/dashboard");
myDashboard = result.dashboard || result;

    // Total Sales
    if ($("#dashboardSales")) {
        $("#dashboardSales").textContent =
            money(Number(myDashboard.totalSales) || 0);
    }

    // Total Duty Time
    if ($("#dashboardHours")) {
        $("#dashboardHours").textContent =
            hoursAndMinutes(
                (Number(myDashboard.totalDutyTime) || 0) * 1000
            );
    }

    // Total Transactions
    if ($("#dashboardTransactions")) {
        $("#dashboardTransactions").textContent =
            Number(myDashboard.totalOrders) || 0;
    }

    // Current Shift Status
    if ($("#dashboardShift")) {
        $("#dashboardShift").textContent =
            currentShift ? "ON DUTY" : "OFF DUTY";
    }

    // Today's Sales
    if ($("#homeSales")) {
        $("#homeSales").textContent =
            money(Number(myDashboard.todaySales) || 0);
    }

    // Today's Duty Time
    // Uses the current user's active shift time when available.
    if ($("#homeHours")) {
        let todaySeconds = 0;

        if (
            currentShift &&
            currentShift.startedAt
        ) {
            const start = new Date(currentShift.startedAt).getTime();
            const now = Date.now();

            if (Number.isFinite(start) && now > start) {
                todaySeconds = Math.floor((now - start) / 1000);
            }
        }

        $("#homeHours").textContent =
            hoursAndMinutes(todaySeconds * 1000);
    }

} catch (error) {
    console.error("Dashboard error:", error);
}

}

bind("#refreshDashboard", "click", async () => {
await refreshShift();
await loadDashboard();
});


/* =========================================
   REFRESH DATA
========================================= */

async function refreshAll() {
    await refreshShift();
    await loadDashboard();
    await loadSales();
}

/* =========================================
   LOGOUT
========================================= */

bind("#logoutButton", "click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;

    try {
        if (auth) await auth.signOut();
    } catch (error) {
        console.error("Logout error:", error);
    }

    currentUser = null;
    staffProfile = null;
    currentShift = null;
    cart = [];

    showAuthScreen();
});

/* =========================================
   START APPLICATION
========================================= */

initializeFirebase();

function connectShiftButtons() {
const startButton = document.getElementById("startShift");
const endButton = document.getElementById("endShift");

if (startButton && !startButton.dataset.listenerAdded) {
    startButton.dataset.listenerAdded = "true";

    startButton.addEventListener("click", async function (event) {
        event.preventDefault();

        console.log("START SHIFT BUTTON CLICKED");

        if (typeof startShift === "function") {
            await startShift();
        } else {
            console.error("startShift() function not found!");
            alert("Start Shift function not found.");
        }
    });
}

if (endButton && !endButton.dataset.listenerAdded) {
    endButton.dataset.listenerAdded = "true";

    endButton.addEventListener("click", async function (event) {
        event.preventDefault();

        console.log("END SHIFT BUTTON CLICKED");

        if (typeof endShift === "function") {
            await endShift();
        } else {
            console.error("endShift() function not found!");
            alert("End Shift function not found.");
        }
    });
}


}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", connectShiftButtons);
} else {
connectShiftButtons();
}
