document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // IRISH PUB — PREMIUM WEBSITE SCRIPT
    // =========================================================


    // =========================================================
    // NAVBAR SCROLL
    // =========================================================

    const nav = document.querySelector(".navbar");

    function updateNavbar() {

        if (!nav) return;

        if (window.scrollY > 50) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }

    }

    window.addEventListener("scroll", updateNavbar, {
        passive: true
    });

    updateNavbar();


    // =========================================================
    // SMOOTH ANCHOR SCROLL
    // =========================================================

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            const navbarHeight =
                nav ? nav.offsetHeight : 0;

            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                navbarHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });

        });

    });


    // =========================================================
    // SCROLL REVEAL
    // =========================================================

    const revealElements =
        document.querySelectorAll(
            ".section-label, " +
            ".section h2, " +
            ".section-description, " +
            ".about-image, " +
            ".about-content, " +
            ".menu-card, " +
            ".staff-box, " +
            ".gallery-item, " +
            ".application-info, " +
            ".application-form-wrapper, " +
            ".contact-info"
        );


    revealElements.forEach(function (element) {

        element.classList.add("reveal-element");

    });


    if ("IntersectionObserver" in window) {

        const revealObserver =
            new IntersectionObserver(
                function (entries, observer) {

                    entries.forEach(function (entry) {

                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add(
                            "show-element"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.12,
                    rootMargin: "0px 0px -50px 0px"
                }
            );


        revealElements.forEach(function (element) {

            revealObserver.observe(element);

        });

    } else {

        revealElements.forEach(function (element) {

            element.classList.add(
                "show-element"
            );

        });

    }


    // =========================================================
    // STAGGER MENU CARDS
    // =========================================================

    const menuCards =
        document.querySelectorAll(".menu-card");

    menuCards.forEach(function (card, index) {

        card.style.transitionDelay =
            `${Math.min(index * 0.04, 0.25)}s`;

    });


    // =========================================================
    // STAGGER STAFF CARDS
    // =========================================================

    const staffCards =
        document.querySelectorAll(".staff-box");

    staffCards.forEach(function (card, index) {

        card.style.transitionDelay =
            `${Math.min(index * 0.08, 0.3)}s`;

    });


    // =========================================================
    // STAGGER GALLERY
    // =========================================================

    const galleryItems =
        document.querySelectorAll(".gallery-item");

    galleryItems.forEach(function (item, index) {

        item.style.transitionDelay =
            `${Math.min(index * 0.05, 0.25)}s`;

    });


    // =========================================================
    // ACTIVE NAVIGATION
    // =========================================================

    const sections =
        document.querySelectorAll("section[id]");

    const navLinks =
        document.querySelectorAll(
            '.navbar nav a[href^="#"]'
        );


    if (
        sections.length &&
        navLinks.length &&
        "IntersectionObserver" in window
    ) {

        const sectionObserver =
            new IntersectionObserver(
                function (entries) {

                    entries.forEach(function (entry) {

                        if (!entry.isIntersecting) {
                            return;
                        }

                        const id =
                            entry.target.getAttribute("id");

                        navLinks.forEach(function (link) {

                            link.classList.remove(
                                "active-nav"
                            );

                            if (
                                link.getAttribute("href") ===
                                `#${id}`
                            ) {

                                link.classList.add(
                                    "active-nav"
                                );

                            }

                        });

                    });

                },
                {
                    rootMargin: "-35% 0px -55% 0px",
                    threshold: 0
                }
            );


        sections.forEach(function (section) {

            sectionObserver.observe(section);

        });

    }


    // =========================================================
    // PREMIUM BACKGROUND PARALLAX
    // =========================================================

    const canUseParallax =
        window.matchMedia(
            "(min-width: 769px) and (prefers-reduced-motion: no-preference)"
        ).matches;


    if (canUseParallax) {

        let ticking = false;

        function updateParallax() {

            const scrollY =
                window.scrollY;

            const background =
                document.body;

            if (!background) {
                ticking = false;
                return;
            }

            const movement =
                Math.min(scrollY * 0.035, 35);

            background.style.setProperty(
                "--irish-parallax",
                `${movement}px`
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
            {
                passive: true
            }
        );

    }


    // =========================================================
    // HERO MOUSE DEPTH EFFECT
    // =========================================================

    const hero =
        document.querySelector(".hero");

    const heroContent =
        document.querySelector(".hero-content");


    if (
        hero &&
        heroContent &&
        window.matchMedia(
            "(min-width: 769px) and (prefers-reduced-motion: no-preference)"
        ).matches
    ) {

        hero.addEventListener(
            "mousemove",
            function (event) {

                const rect =
                    hero.getBoundingClientRect();

                const x =
                    (event.clientX - rect.left) /
                    rect.width -
                    0.5;

                const y =
                    (event.clientY - rect.top) /
                    rect.height -
                    0.5;

                const moveX =
                    x * 8;

                const moveY =
                    y * 6;

                heroContent.style.transform =
                    `translate3d(${moveX}px, ${moveY}px, 0)`;

            }
        );


        hero.addEventListener(
            "mouseleave",
            function () {

                heroContent.style.transform =
                    "translate3d(0, 0, 0)";

            }
        );

    }


    // =========================================================
    // IMAGE LOADING EFFECT
    // =========================================================

    const images =
        document.querySelectorAll("img");


    images.forEach(function (image) {

        if (image.complete) {

            image.classList.add(
                "image-loaded"
            );

        } else {

            image.addEventListener(
                "load",
                function () {

                    image.classList.add(
                        "image-loaded"
                    );

                },
                {
                    once: true
                }
            );

        }

    });


    // =========================================================
    // APPLICATION FORM
    // =========================================================

    const applicationForm =
        document.getElementById(
            "applicationForm"
        );

    const applicationMessage =
        document.getElementById(
            "applicationMessage"
        );


    if (applicationForm) {

        applicationForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const submitButton =
                    applicationForm.querySelector(
                        'button[type="submit"]'
                    );


                // =================================================
                // AGREEMENT CHECK
                // =================================================

                const agreement =
                    document.getElementById(
                        "agreement"
                    );


                if (
                    agreement &&
                    !agreement.checked
                ) {

                    if (applicationMessage) {

                        applicationMessage.textContent =
                            "Please confirm the agreement before submitting.";

                        applicationMessage.style.color =
                            "#ff5555";

                    }

                    return;

                }


                // =================================================
                // GET FORM DATA
                // =================================================

                const fullNameElement =
                    document.getElementById(
                        "fullName"
                    );

                const rpNameElement =
                    document.getElementById(
                        "rpName"
                    );

                const cidElement =
                    document.getElementById(
                        "cid"
                    );

                const phoneElement =
                    document.getElementById(
                        "phone"
                    );

                const ageElement =
                    document.getElementById(
                        "age"
                    );

                const discordElement =
                    document.getElementById(
                        "discord"
                    );

                const experienceElement =
                    document.getElementById(
                        "experience"
                    );

                const reasonElement =
                    document.getElementById(
                        "reason"
                    );


                const data = {

                    fullName:
                        fullNameElement
                            ? fullNameElement.value.trim()
                            : "",

                    rpName:
                        rpNameElement
                            ? rpNameElement.value.trim()
                            : "",

                    cid:
                        cidElement
                            ? cidElement.value.trim()
                            : "",

                    phone:
                        phoneElement
                            ? phoneElement.value.trim()
                            : "",

                    age:
                        ageElement
                            ? ageElement.value.trim()
                            : "",

                    discord:
                        discordElement
                            ? discordElement.value.trim()
                            : "",

                    experience:
                        experienceElement
                            ? experienceElement.value.trim()
                            : "",

                    reason:
                        reasonElement
                            ? reasonElement.value.trim()
                            : ""

                };


                // =================================================
                // REQUIRED FIELD CHECK
                // =================================================

                if (
                    !data.fullName ||
                    !data.rpName ||
                    !data.cid ||
                    !data.phone ||
                    !data.age ||
                    !data.discord ||
                    !data.reason
                ) {

                    if (applicationMessage) {

                        applicationMessage.textContent =
                            "Please complete all required fields.";

                        applicationMessage.style.color =
                            "#ff5555";

                    }

                    return;

                }


                // =================================================
                // SUBMITTING STATE
                // =================================================

                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.innerHTML =
                        "<span>SUBMITTING...</span>";

                }


                if (applicationMessage) {

                    applicationMessage.textContent =
                        "Sending your application...";

                    applicationMessage.style.color =
                        "#C5A45D";

                }


                // =================================================
                // SEND TO SERVER
                // =================================================

                try {

                    const response =
                        await fetch(
                            "/api/apply",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(data)
                            }
                        );


                    // =================================================
                    // SAFE JSON RESPONSE
                    // =================================================

                    let result;

                    const contentType =
                        response.headers.get(
                            "content-type"
                        ) || "";


                    if (
                        contentType.includes(
                            "application/json"
                        )
                    ) {

                        result =
                            await response.json();

                    } else {

                        throw new Error(
                            "Server returned an invalid response."
                        );

                    }


                    console.log(
                        "Server response:",
                        result
                    );


                    // =================================================
                    // SUCCESS
                    // =================================================

                    if (
                        response.ok &&
                        result.success
                    ) {

                        if (applicationMessage) {

                            applicationMessage.textContent =
                                "Application submitted successfully! Our management team will review it.";

                            applicationMessage.style.color =
                                "#65d48b";

                        }


                        applicationForm.reset();


                        // Small success animation

                        applicationForm.classList.add(
                            "application-success"
                        );


                        setTimeout(
                            function () {

                                applicationForm.classList.remove(
                                    "application-success"
                                );

                            },
                            1200
                        );

                    }


                    // =================================================
                    // SERVER ERROR
                    // =================================================

                    else {

                        if (applicationMessage) {

                            applicationMessage.textContent =
                                result.message ||
                                "Application could not be submitted.";

                            applicationMessage.style.color =
                                "#ff5555";

                        }

                    }


                } catch (error) {

                    console.error(
                        "Application error:",
                        error
                    );


                    if (applicationMessage) {

                        applicationMessage.textContent =
                            "Unable to connect to the server.";

                        applicationMessage.style.color =
                            "#ff5555";

                    }

                }


                // =================================================
                // ENABLE BUTTON AGAIN
                // =================================================

                finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.innerHTML =
                            "<span>SUBMIT APPLICATION</span>";

                    }

                }

            }
        );

    }


    // =========================================================
    // FOOTER YEAR
    // =========================================================

    const yearElement =
        document.getElementById(
            "year"
        );


    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();

    }


    // =========================================================
    // PAGE LOADED
    // =========================================================

    document.body.classList.add(
        "page-loaded"
    );

});