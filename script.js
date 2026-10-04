document.addEventListener("DOMContentLoaded", function () {

    const nav = document.querySelector(".navbar");

    window.addEventListener("scroll", function () {
        if (nav) {
            if (window.scrollY > 50) {
                nav.classList.add("scrolled");
            } else {
                nav.classList.remove("scrolled");
            }
        }
    });

    const applicationForm = document.getElementById("applicationForm");
    const applicationMessage = document.getElementById("applicationMessage");

    if (applicationForm) {

        applicationForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            const submitButton = applicationForm.querySelector(
                'button[type="submit"]'
            );

            const agreement = document.getElementById("agreement");

            if (agreement && !agreement.checked) {
                applicationMessage.textContent =
                    "Please confirm the agreement before submitting.";
                applicationMessage.style.color = "#ff5555";
                return;
            }

            const data = {
                fullName: document.getElementById("fullName").value.trim(),
                rpName: document.getElementById("rpName").value.trim(),
                cid: document.getElementById("cid").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                age: document.getElementById("age").value.trim(),
                discord: document.getElementById("discord").value.trim(),
                experience: document.getElementById("experience").value.trim(),
                reason: document.getElementById("reason").value.trim()
            };

            if (
                !data.fullName ||
                !data.rpName ||
                !data.cid ||
                !data.phone ||
                !data.age ||
                !data.discord ||
                !data.reason
            ) {
                applicationMessage.textContent =
                    "Please complete all required fields.";

                applicationMessage.style.color = "#ff5555";
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = "SUBMITTING...";

            applicationMessage.textContent =
                "Sending your application...";

            applicationMessage.style.color = "#C5A45D";

            try {

                const response = await fetch("/api/apply", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                console.log("Server response:", result);

                if (result.success) {

                    applicationMessage.textContent =
                        "Application submitted successfully! Our management team will review it.";

                    applicationMessage.style.color = "#65d48b";

                    applicationForm.reset();

                } else {

                    applicationMessage.textContent =
                        result.message || "Application could not be submitted.";

                    applicationMessage.style.color = "#ff5555";
                }

            } catch (error) {

                console.error("Application error:", error);

                applicationMessage.textContent =
                    "Unable to connect to the server.";

                applicationMessage.style.color = "#ff5555";

            } finally {

                submitButton.disabled = false;
                submitButton.textContent = "SUBMIT APPLICATION";
            }
        });
    }

    const yearElement = document.getElementById("year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
/* =====================================================
   IRISH PUB 3D SCROLL PARALLAX
===================================================== */

(function () {

    let ticking = false;

    function updateParallax() {

        const scrollY = window.scrollY;

        /*
         * Main website background
         * Slow movement = deep background
         */
        const pubMovement = scrollY * -0.055;

        /*
         * Hero background
         * Slightly different speed
         */
        const heroMovement = scrollY * 0.18;

        document.documentElement.style.setProperty(
            "--pub-parallax",
            pubMovement + "px"
        );

        document.documentElement.style.setProperty(
            "--hero-parallax",
            heroMovement + "px"
        );

        ticking = false;
    }


    window.addEventListener(
        "scroll",
        function () {

            if (!ticking) {

                window.requestAnimationFrame(
                    updateParallax
                );

                ticking = true;

            }

        },
        { passive: true }
    );


    updateParallax();

})();
/* =========================================
   IRISH PUB 3D PARALLAX BACKGROUND
   ========================================= */

(function () {

    let ticking = false;

    function updateParallax() {

        const scrollY = window.scrollY || window.pageYOffset;

        /*
         * Background moves slower than the page.
         * This creates the 3D depth effect.
         */
        const movement = scrollY * -0.08;

        document.documentElement.style.setProperty(
            "--pub-bg-y",
            movement + "px"
        );

        ticking = false;
    }

    window.addEventListener(
        "scroll",
        function () {

            if (!ticking) {

                window.requestAnimationFrame(updateParallax);

                ticking = true;
            }

        },
        { passive: true }
    );

    updateParallax();

})();
});