document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // NAVBAR SCROLL
    // =========================

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


    // =========================
    // APPLICATION FORM
    // =========================

    const applicationForm = document.getElementById("applicationForm");
    const applicationMessage = document.getElementById("applicationMessage");

    if (applicationForm) {

        applicationForm.addEventListener("submit", async function (event) {

            event.preventDefault();


            const submitButton = applicationForm.querySelector(
                'button[type="submit"]'
            );


            // =========================
            // AGREEMENT CHECK
            // =========================

            const agreement = document.getElementById("agreement");

            if (agreement && !agreement.checked) {

                applicationMessage.textContent =
                    "Please confirm the agreement before submitting.";

                applicationMessage.style.color = "#ff5555";

                return;
            }


            // =========================
            // GET FORM DATA
            // =========================

            const data = {

                fullName: document.getElementById("fullName").value.trim(),

                rpName: document.getElementById("rpName").value.trim(),

                cid: document.getElementById("cid").value.trim(),

                phone: document.getElementById("phone").value.trim(),

                age: document.getElementById("age").value.trim(),

                discord: document.getElementById("discord").value.trim(),

                experience:
                    document.getElementById("experience").value.trim(),

                reason:
                    document.getElementById("reason").value.trim()

            };


            // =========================
            // REQUIRED FIELD CHECK
            // =========================

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


            // =========================
            // SUBMITTING
            // =========================

            submitButton.disabled = true;

            submitButton.textContent = "SUBMITTING...";

            applicationMessage.textContent =
                "Sending your application...";

            applicationMessage.style.color = "#C5A45D";


            // =========================
            // SEND TO SERVER
            // =========================

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


                // =========================
                // SUCCESS
                // =========================

                if (result.success) {

                    applicationMessage.textContent =
                        "Application submitted successfully! Our management team will review it.";

                    applicationMessage.style.color = "#65d48b";

                    applicationForm.reset();

                }


                // =========================
                // SERVER ERROR
                // =========================

                else {

                    applicationMessage.textContent =
                        result.message ||
                        "Application could not be submitted.";

                    applicationMessage.style.color = "#ff5555";

                }


            } catch (error) {

                console.error(
                    "Application error:",
                    error
                );

                applicationMessage.textContent =
                    "Unable to connect to the server.";

                applicationMessage.style.color = "#ff5555";

            }


            // =========================
            // ENABLE BUTTON AGAIN
            // =========================

            finally {

                submitButton.disabled = false;

                submitButton.textContent =
                    "SUBMIT APPLICATION";

            }

        });

    }


    // =========================
    // FOOTER YEAR
    // =========================

    const yearElement =
        document.getElementById("year");

    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();

    }

});