"use strict";

/* =========================================================
   CultureSetu Frontend
========================================================= */

const API_BASE = "https://culturesetu.onrender.com";

let currentPlace = null;
let map = null;
let mapMarkers = [];
let recognition = null;
let conversationContext = "";

const PASSPORT_KEY = "culturesetu_passport";


/* =========================================================
   URL CLEANUP
========================================================= */

(function cleanTrackingParameters() {
    try {
        const url = new URL(window.location.href);

        const trackingParameters = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content"
        ];

        let changed = false;

        trackingParameters.forEach((parameter) => {
            if (url.searchParams.has(parameter)) {
                url.searchParams.delete(parameter);
                changed = true;
            }
        });

        if (changed) {
            window.history.replaceState(
                {},
                document.title,
                url.pathname + url.search + url.hash
            );
        }
    } catch (error) {
        console.warn("URL cleanup failed.", error);
    }
})();


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function safeText(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }

    return String(value);
}


function getImageUrl(url) {
    if (!url) {
        return "image/bg.jpg";
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:")
    ) {
        return url;
    }

    if (url.startsWith("/")) {
        return `${API_BASE}${url}`;
    }

    return url;
}


function scrollToSection(id) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function escapeHTML(value) {
    return safeText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   API
========================================================= */

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(
        `${API_BASE}${endpoint}`,
        options
    );

    if (!response.ok) {
        let errorMessage =
            `Request failed with status ${response.status}`;

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                errorMessage = errorData.detail;
            }
        } catch (error) {
            console.warn("Could not parse API error response.");
        }

        throw new Error(errorMessage);
    }

    return await response.json();
}


/* =========================================================
   LANGUAGE
========================================================= */

function getSelectedLanguage() {
    const languageSelect =
        getElement("aiLanguageSelect");

    if (!languageSelect) {
        return "English";
    }

    return languageSelect.value || "English";
}


/* =========================================================
   AI STATUS
========================================================= */

function updateAIStatus(message) {
    const status =
        getElement("aiStatus");

    if (!status) {
        return;
    }

    status.textContent = safeText(message);

    status.classList.add("show");

    clearTimeout(updateAIStatus.timer);

    updateAIStatus.timer = setTimeout(() => {
        status.classList.remove("show");
    }, 5000);
}


/* =========================================================
   HERITAGE SEARCH
========================================================= */

async function searchHeritage() {
    const input =
        getElement("searchInput");

    if (!input) {
        return;
    }

    const query =
        input.value.trim();

    if (!query) {
        alert("Please enter a heritage place name.");
        input.focus();
        return;
    }

    const selectedLanguage =
        getSelectedLanguage();

    const searchButton =
        getElement("searchButton");

    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = "Searching...";
    }

    updateAIStatus("Searching CultureSetu...");

    try {
        const data =
            await apiRequest(
                "/api/heritage/search",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        query: query,
                        language: selectedLanguage
                    })
                }
            );

        if (data.place) {
            showHeritageDetails(data.place);

            updateAIStatus(
                `Found ${data.place.name}.`
            );

            scrollToSection("heritageDetails");
        } else {
            alert(
                data.message ||
                "No matching heritage place was found."
            );
        }

    } catch (error) {
        console.error(
            "Heritage Search Error:",
            error
        );

        updateAIStatus(
            "Heritage search failed."
        );

        alert(
            "Unable to search right now. Please try again."
        );

    } finally {
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = "Search";
        }
    }
}


/* =========================================================
   HERITAGE DETAILS
========================================================= */

function showHeritageDetails(place) {
    if (!place) {
        return;
    }

    currentPlace = place;

    const detailsTitle =
        getElement("detailsTitle");

    const detailsPlaceName =
        getElement("detailsPlaceName");

    const detailsLocation =
        getElement("detailsLocation");

    const detailsCategory =
        getElement("detailsCategory");

    const detailsShortDescription =
        getElement("detailsShortDescription");

    const detailsImage =
        getElement("detailsImage");

    const detailsHistory =
        getElement("detailsHistory");

    const detailsCulture =
        getElement("detailsCulture");

    const detailsDance =
        getElement("detailsDance");

    const detailsArt =
        getElement("detailsArt");


    if (detailsTitle) {
        detailsTitle.textContent =
            safeText(
                place.name,
                "Heritage Place"
            );
    }


    if (detailsPlaceName) {
        detailsPlaceName.textContent =
            safeText(
                place.name,
                "Unknown Heritage Place"
            );
    }


    if (detailsLocation) {
        detailsLocation.textContent =
            `📍 ${safeText(place.location)}${place.state ? `, ${place.state}` : ""}`;
    }


    if (detailsCategory) {
        detailsCategory.textContent =
            safeText(
                place.category,
                "Heritage"
            );
    }


    if (detailsShortDescription) {
        detailsShortDescription.textContent =
            safeText(
                place.short_description ||
                place.description,
                "No description available."
            );
    }


    if (detailsImage) {
        detailsImage.src =
            getImageUrl(place.image_url);

        detailsImage.alt =
            safeText(
                place.name,
                "Heritage Place"
            );

        detailsImage.onerror =
            function() {
                this.onerror = null;
                this.src = "image/bg.jpg";
            };
    }


    if (detailsHistory) {
        detailsHistory.textContent =
            safeText(
                place.history,
                "Historical information is not available."
            );
    }


    if (detailsCulture) {
        detailsCulture.textContent =
            safeText(
                place.culture,
                "Cultural information is not available."
            );
    }


    if (detailsDance) {
        detailsDance.textContent =
            safeText(
                place.dance,
                "Dance information is not available."
            );
    }


    if (detailsArt) {
        detailsArt.textContent =
            safeText(
                place.art,
                "Art information is not available."
            );
    }


    renderImages(
        place.images || []
    );

    renderVideos(
        place.videos || []
    );

    loadAISuggestions(
        place.name,
        place.state
    );

    updateAIStatus(
        `Showing information about ${safeText(place.name)}.`
    );
}


/* =========================================================
   IMAGES
========================================================= */

function renderImages(images) {
    const container =
        getElement("detailsImages");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(images) || images.length === 0) {
        const message =
            document.createElement("p");

        message.textContent =
            "No additional images available.";

        container.appendChild(message);

        return;
    }

    images.forEach(
        (imageUrl, index) => {
            const img =
                document.createElement("img");

            img.src =
                getImageUrl(imageUrl);

            img.alt =
                `Heritage image ${index + 1}`;

            img.loading = "lazy";

            img.onerror =
                function() {
                    this.style.display = "none";
                };

            container.appendChild(img);
        }
    );
}


/* =========================================================
   VIDEOS
========================================================= */

function renderVideos(videos) {
    const container =
        getElement("detailsVideos");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(videos) || videos.length === 0) {
        const message =
            document.createElement("p");

        message.textContent =
            "No videos available.";

        container.appendChild(message);

        return;
    }

    videos.forEach(
        (video) => {
            const wrapper =
                document.createElement("div");

            wrapper.className =
                "heritage-video-item";

            const title =
                document.createElement("h4");

            title.textContent =
                safeText(
                    video.title,
                    "Heritage Video"
                );

            const link =
                document.createElement("a");

            link.href =
                safeText(video.url, "#");

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Watch Video";

            wrapper.appendChild(title);
            wrapper.appendChild(link);

            container.appendChild(wrapper);
        }
    );
}


/* =========================================================
   POPULAR HERITAGE PLACES
========================================================= */

async function loadPopularPlaces(state = "") {
    const grid =
        getElement("heritageGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML = `
        <div class="loading-message">
            Loading heritage places...
        </div>
    `;

    try {
        let endpoint =
            "/api/heritage/popular?limit=20";

        if (state) {
            endpoint +=
                `&state=${encodeURIComponent(state)}`;
        }

        const data =
            await apiRequest(endpoint);

        grid.innerHTML = "";

        if (
            !data.places ||
            data.places.length === 0
        ) {
            grid.innerHTML = `
                <div class="loading-message">
                    No heritage places found.
                </div>
            `;

            return;
        }

        data.places.forEach(
            (place) => {
                grid.appendChild(
                    createHeritageCard(place)
                );
            }
        );

    } catch (error) {
        console.error(
            "Popular Places Error:",
            error
        );

        grid.innerHTML = `
            <div class="loading-message">
                Unable to load heritage places.
            </div>
        `;
    }
}


function createHeritageCard(place) {
    const card =
        document.createElement("div");

    card.className =
        "heritage-card";

    card.style.cursor =
        "pointer";


    const imageWrapper =
        document.createElement("div");

    imageWrapper.className =
        "heritage-image";


    const image =
        document.createElement("img");

    image.src =
        getImageUrl(place.image_url);

    image.alt =
        safeText(
            place.name,
            "Heritage Place"
        );

    image.loading =
        "lazy";

    image.onerror =
        function() {
            this.onerror = null;
            this.src = "image/bg.jpg";
        };


    imageWrapper.appendChild(
        image
    );


    const content =
        document.createElement("div");

    content.className =
        "heritage-info";


    const category =
        document.createElement("span");

    category.textContent =
        safeText(
            place.category,
            "Heritage"
        );


    const title =
        document.createElement("h3");

    title.textContent =
        safeText(
            place.name,
            "Heritage Place"
        );


    const location =
        document.createElement("p");

    location.textContent =
        `${safeText(place.location)}${place.state ? `, ${place.state}` : ""}`;


    const description =
        document.createElement("p");

    description.textContent =
        safeText(
            place.short_description ||
            place.description,
            "Discover this heritage destination."
        );


    const button =
        document.createElement("button");

    button.className =
        "explore-btn";

    button.type =
        "button";

    button.textContent =
        "Explore";


    content.appendChild(category);
    content.appendChild(title);
    content.appendChild(location);
    content.appendChild(description);
    content.appendChild(button);

    card.appendChild(imageWrapper);
    card.appendChild(content);


    card.addEventListener(
        "click",
        () => {
            showHeritageDetails(place);
            scrollToSection("heritageDetails");
        }
    );


    return card;
}


/* =========================================================
   STATES
========================================================= */

async function loadStates() {
    try {
        const data =
            await apiRequest("/api/states");

        const states =
            data.states || [];

        const stateSelect =
            getElement("stateSelect");

        const stateList =
            getElement("stateList");


        if (stateSelect) {
            stateSelect.innerHTML =
                `<option value="">All States</option>`;

            states.forEach(
                (state) => {
                    const option =
                        document.createElement("option");

                    option.value =
                        state;

                    option.textContent =
                        state;

                    stateSelect.appendChild(
                        option
                    );
                }
            );

            stateSelect.addEventListener(
                "change",
                function() {
                    loadPopularPlaces(
                        this.value
                    );
                }
            );
        }


        if (stateList) {
            stateList.innerHTML = "";

            states.forEach(
                (state) => {
                    const button =
                        document.createElement("button");

                    button.type =
                        "button";

                    button.className =
                        "state-btn";

                    button.textContent =
                        state;

                    button.addEventListener(
                        "click",
                        () => {
                            if (stateSelect) {
                                stateSelect.value =
                                    state;
                            }

                            loadPopularPlaces(
                                state
                            );

                            scrollToSection(
                                "heritageGrid"
                            );
                        }
                    );

                    stateList.appendChild(
                        button
                    );
                }
            );
        }

    } catch (error) {
        console.error(
            "States Error:",
            error
        );
    }
}


/* =========================================================
   AI CHAT
========================================================= */

function openAIChat() {
    const modal =
        getElement("aiChatModal");

    const input =
        getElement("aiChatInput");

    if (!modal) {
        return;
    }

    modal.classList.add("active");

    if (input) {
        setTimeout(
            () => input.focus(),
            200
        );
    }
}


function closeAIChat() {
    const modal =
        getElement("aiChatModal");

    if (modal) {
        modal.classList.remove("active");
    }
}


function addAIChatMessage(
    message,
    type
) {
    const messages =
        getElement("aiChatMessages");

    if (!messages) {
        return;
    }

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        type === "user"
            ? "ai-message ai-user"
            : "ai-message ai-bot";

    messageDiv.textContent =
        safeText(message);

    messages.appendChild(
        messageDiv
    );

    messages.scrollTop =
        messages.scrollHeight;
}


async function sendAIChatMessage() {
    const input =
        getElement("aiChatInput");

    const messages =
        getElement("aiChatMessages");

    if (!input) {
        return;
    }

    const question =
        input.value.trim();

    if (!question) {
        return;
    }

    const selectedLanguage =
        getSelectedLanguage();

    addAIChatMessage(
        question,
        "user"
    );

    input.value = "";


    const thinkingMessage =
        document.createElement("div");

    thinkingMessage.className =
        "ai-message ai-bot";

    thinkingMessage.textContent =
        "Thinking...";


    if (messages) {
        messages.appendChild(
            thinkingMessage
        );

        messages.scrollTop =
            messages.scrollHeight;
    }


    try {
        const data =
            await apiRequest(
                "/api/ai/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        question: question,
                        language: selectedLanguage,
                        conversation_context:
                            conversationContext
                    })
                }
            );


        if (thinkingMessage) {
            thinkingMessage.remove();
        }


        const answer =
            safeText(
                data.answer,
                "Sorry, I could not generate an answer."
            );


        addAIChatMessage(
            answer,
            "bot"
        );


        conversationContext +=
            `User: ${question}\n` +
            `Assistant: ${answer}\n`;


        if (data.place) {
            showHeritageDetails(
                data.place
            );
        }

    } catch (error) {
        console.error(
            "AI Chat Error:",
            error
        );

        if (thinkingMessage) {
            thinkingMessage.remove();
        }

        addAIChatMessage(
            "Unable to connect to the CultureSetu AI server.",
            "bot"
        );
    }
}


/* =========================================================
   AI SUGGESTIONS
========================================================= */

async function loadAISuggestions(
    placeName,
    state = ""
) {
    if (!placeName) {
        return;
    }

    try {
        const data =
            await apiRequest(
                "/api/ai/suggestions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        place: placeName,
                        state: state
                    })
                }
            );

        console.log(
            "AI Suggestions:",
            data.suggestions || []
        );

    } catch (error) {
        console.error(
            "AI Suggestions Error:",
            error
        );
    }
}


/* =========================================================
   VOICE SEARCH
========================================================= */

function initializeVoiceSearch() {
    const button =
        getElement("voiceSearchBtn");

    if (!button) {
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {
        button.disabled = true;

        button.title =
            "Speech recognition is not supported by this browser.";

        return;
    }


    recognition =
        new SpeechRecognition();

    recognition.lang =
        "en-IN";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;


    recognition.onstart =
        function() {
            button.classList.add("active");

            updateAIStatus(
                "Listening..."
            );
        };


    recognition.onresult =
        function(event) {
            const transcript =
                event.results[0][0]
                    .transcript;

            const input =
                getElement("searchInput");

            if (input) {
                input.value =
                    transcript;
            }

            searchHeritage();
        };


    recognition.onerror =
        function(event) {
            console.error(
                "Speech Recognition Error:",
                event.error
            );

            updateAIStatus(
                "Voice search could not be completed."
            );
        };


    recognition.onend =
        function() {
            button.classList.remove(
                "active"
            );
        };


    button.addEventListener(
        "click",
        function() {
            try {
                recognition.start();
            } catch (error) {
                console.warn(
                    "Voice recognition is already running."
                );
            }
        }
    );
}


/* =========================================================
   TEXT TO SPEECH
========================================================= */

function speakText(text) {
    if (!("speechSynthesis" in window)) {
        alert(
            "Text-to-speech is not supported by this browser."
        );

        return;
    }

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            safeText(text)
        );

    utterance.lang =
        "en-IN";

    utterance.rate =
        0.95;

    utterance.pitch =
        1;

    window.speechSynthesis.speak(
        utterance
    );
}


function explainCurrentPlace() {
    if (!currentPlace) {
        alert(
            "Please search for a heritage place first."
        );

        return;
    }

    const explanation = `
${safeText(currentPlace.name)}.

Location:
${safeText(currentPlace.location)}, ${safeText(currentPlace.state)}.

${safeText(
        currentPlace.description ||
        currentPlace.short_description
    )}

History:
${safeText(currentPlace.history)}

Culture:
${safeText(currentPlace.culture)}

Traditional Dance:
${safeText(currentPlace.dance)}

Art:
${safeText(currentPlace.art)}
`;

    speakText(
        explanation
    );
}


/* =========================================================
   IMAGE SEARCH
========================================================= */

function initializeImageSearch() {
    const button =
        getElement("imageSearchBtn");

    const input =
        getElement("imageInput");

    if (!button || !input) {
        return;
    }


    button.addEventListener(
        "click",
        function() {
            input.click();
        }
    );


    input.addEventListener(
        "change",
        async function() {
            const file =
                input.files[0];

            if (!file) {
                return;
            }

            await searchHeritageFromImage(
                file
            );

            input.value = "";
        }
    );
}


async function searchHeritageFromImage(file) {
    if (
        !file ||
        !file.type.startsWith("image/")
    ) {
        alert(
            "Please select a valid image file."
        );

        return;
    }

    updateAIStatus(
        "Analyzing the image..."
    );


    const formData =
        new FormData();

    formData.append(
        "image",
        file
    );


    try {
        const data =
            await apiRequest(
                "/api/heritage/image-search",
                {
                    method: "POST",
                    body: formData
                }
            );


        if (data.place) {
            showHeritageDetails(
                data.place
            );

            scrollToSection(
                "heritageDetails"
            );
        }


        updateAIStatus(
            data.message ||
            "Image analysis completed."
        );

    } catch (error) {
        console.error(
            "Image Search Error:",
            error
        );

        updateAIStatus(
            "Image analysis failed."
        );

        alert(
            "Unable to identify the heritage place from the image."
        );
    }
}


/* =========================================================
   MAP
========================================================= */

function waitForLeaflet(
    timeout = 10000
) {
    return new Promise(
        (resolve, reject) => {
            const start =
                Date.now();

            const check =
                () => {
                    if (
                        typeof window.L !==
                        "undefined"
                    ) {
                        resolve();
                        return;
                    }

                    if (
                        Date.now() - start >=
                        timeout
                    ) {
                        reject(
                            new Error(
                                "Leaflet library did not load."
                            )
                        );

                        return;
                    }

                    setTimeout(
                        check,
                        100
                    );
                };

            check();
        }
    );
}


async function initializeMap() {
    const mapContainer =
        getElement("heritageMap");

    if (!mapContainer) {
        console.error(
            "Map container #heritageMap was not found."
        );

        return;
    }


    try {
        await waitForLeaflet();

    } catch (error) {
        console.error(
            error
        );

        mapContainer.innerHTML = `
            <div style="
                padding:20px;
                text-align:center;
                color:#666;
            ">
                Map library could not be loaded.
            </div>
        `;

        return;
    }


    try {
        if (map) {
            map.remove();
            map = null;
        }


        mapContainer.innerHTML = "";


        map =
            L.map(
                mapContainer,
                {
                    zoomControl: true
                }
            ).setView(
                [22.9734, 78.6569],
                5
            );


        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors",
                maxZoom: 19
            }
        ).addTo(map);


        mapContainer.style.height =
            "340px";

        mapContainer.style.minHeight =
            "340px";


        const data =
            await apiRequest(
                "/api/heritage/map"
            );


        if (
            !data ||
            !Array.isArray(data.places)
        ) {
            console.error(
                "Invalid map data received from API."
            );

            return;
        }


        mapMarkers = [];


        data.places.forEach(
            (place) => {
                const latitude =
                    Number(place.latitude);

                const longitude =
                    Number(place.longitude);


                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {
                    return;
                }


                const marker =
                    L.marker(
                        [
                            latitude,
                            longitude
                        ]
                    ).addTo(map);


                marker.bindPopup(`
                    <strong>
                        ${escapeHTML(place.name)}
                    </strong>
                    <br>
                    ${escapeHTML(place.location)}
                `);


                marker.on(
                    "click",
                    () => {
                        searchPlaceDirectly(
                            place.name
                        );
                    }
                );


                mapMarkers.push(
                    marker
                );
            }
        );


        setTimeout(
            () => {
                if (map) {
                    map.invalidateSize(
                        true
                    );
                }
            },
            300
        );


        setTimeout(
            () => {
                if (map) {
                    map.invalidateSize(
                        true
                    );
                }
            },
            1000
        );


        console.log(
            `Map initialized successfully with ${mapMarkers.length} places.`
        );

    } catch (error) {
        console.error(
            "Map Error:",
            error
        );

        updateAIStatus(
            "Map could not be loaded."
        );
    }
}


async function searchPlaceDirectly(name) {
    const input =
        getElement("searchInput");

    if (input) {
        input.value =
            name;
    }

    await searchHeritage();
}


/* =========================================================
   PASSPORT
========================================================= */

function emptyPassport() {
    return {
        name: "",
        xp: 0,
        visitedPlaces: [],
        states: [],
        badges: []
    };
}


function getPassport() {
    try {
        const saved =
            localStorage.getItem(
                PASSPORT_KEY
            );

        if (!saved) {
            return emptyPassport();
        }


        const passport =
            JSON.parse(saved);


        return {
            name:
                passport.name || "",

            xp:
                Number(passport.xp) || 0,

            visitedPlaces:
                Array.isArray(
                    passport.visitedPlaces
                )
                    ? passport.visitedPlaces
                    : [],

            states:
                Array.isArray(
                    passport.states
                )
                    ? passport.states
                    : [],

            badges:
                Array.isArray(
                    passport.badges
                )
                    ? passport.badges
                    : []
        };

    } catch (error) {
        console.error(
            "Passport Read Error:",
            error
        );

        return emptyPassport();
    }
}


function savePassport(passport) {
    try {
        localStorage.setItem(
            PASSPORT_KEY,
            JSON.stringify(passport)
        );

    } catch (error) {
        console.error(
            "Passport Save Error:",
            error
        );

        alert(
            "Unable to save your Heritage Passport."
        );
    }
}


/* =========================================================
   OPEN PASSPORT
========================================================= */

function openPassportOverlay() {
    const overlay =
        getElement("passportOverlay");

    const dashboard =
        getElement("passportDashboard");

    const createSection =
        getElement("passportCreate");


    if (!overlay) {
        return;
    }


    overlay.classList.add("active");

    overlay.style.display =
        "flex";


    const passport =
        getPassport();


    if (passport.name) {
        if (createSection) {
            createSection.style.display =
                "none";
        }

        if (dashboard) {
            dashboard.style.display =
                "block";
        }

        updatePassportUI();

    } else {
        if (createSection) {
            createSection.style.display =
                "block";
        }

        if (dashboard) {
            dashboard.style.display =
                "none";
        }
    }
}


function closePassportOverlay() {
    const overlay =
        getElement("passportOverlay");

    if (!overlay) {
        return;
    }

    overlay.classList.remove("active");

    overlay.style.display =
        "none";
}


/* =========================================================
   CREATE PASSPORT
========================================================= */

function createPassport() {
    const input =
        getElement("passportName");


    if (!input) {
        console.error(
            "Passport name input was not found."
        );

        return false;
    }


    const name =
        input.value.trim();


    if (!name) {
        alert(
            "Please enter your name."
        );

        input.focus();

        return false;
    }


    const passport =
        getPassport();


    passport.name =
        name;


    updatePassportBadges(
        passport
    );


    savePassport(
        passport
    );


    updatePassportUI();


    const overlay =
        getElement("passportOverlay");

    const dashboard =
        getElement("passportDashboard");

    const createSection =
        getElement("passportCreate");


    if (createSection) {
        createSection.style.display =
            "none";
    }


    if (dashboard) {
        dashboard.style.display =
            "block";

        dashboard.style.visibility =
            "visible";

        dashboard.style.opacity =
            "1";
    }


    if (overlay) {
        overlay.classList.add("active");

        overlay.style.display =
            "flex";
    }


    updateAIStatus(
        "Your Heritage Passport has been created."
    );


    return true;
}


/* =========================================================
   ADD PLACE TO PASSPORT
========================================================= */

function addPlaceToPassport(place) {
    if (!place || !place.id) {
        return {
            success: false,
            reason: "invalid"
        };
    }


    const passport =
        getPassport();


    if (!passport.name) {
        return {
            success: false,
            reason: "no_passport"
        };
    }


    const exists =
        passport.visitedPlaces.some(
            item =>
                item.id === place.id
        );


    if (exists) {
        return {
            success: false,
            reason: "already_added"
        };
    }


    passport.visitedPlaces.push({
        id: place.id,
        name: place.name,
        state: place.state
    });


    passport.xp += 10;


    if (
        place.state &&
        !passport.states.includes(
            place.state
        )
    ) {
        passport.states.push(
            place.state
        );

        passport.xp += 5;
    }


    updatePassportBadges(
        passport
    );


    savePassport(
        passport
    );


    updatePassportUI();


    return {
        success: true,
        reason: "added"
    };
}


/* =========================================================
   PASSPORT BADGES
========================================================= */

function updatePassportBadges(
    passport
) {
    const badges = [];

    const visitedCount =
        passport.visitedPlaces.length;

    const stateCount =
        passport.states.length;


    if (visitedCount >= 1) {
        badges.push(
            "First Heritage Visit"
        );
    }


    if (visitedCount >= 5) {
        badges.push(
            "Heritage Explorer"
        );
    }


    if (visitedCount >= 10) {
        badges.push(
            "Heritage Master"
        );
    }


    if (stateCount >= 3) {
        badges.push(
            "State Explorer"
        );
    }


    if (stateCount >= 5) {
        badges.push(
            "India Explorer"
        );
    }


    passport.badges =
        badges;
}


/* =========================================================
   PASSPORT UI
========================================================= */

function updatePassportUI() {
    const passport =
        getPassport();


    const displayName =
        getElement("displayPassportName");

    const level =
        getElement("passportLevel");

    const xp =
        getElement("passportXP");

    const progress =
        getElement("xpProgress");

    const xpText =
        getElement("xpText");

    const placesCount =
        getElement("placesCount");

    const statesCount =
        getElement("statesCount");

    const badgesCount =
        getElement("badgesCount");


    updatePassportBadges(
        passport
    );


    if (displayName) {
        displayName.textContent =
            passport.name ||
            "Heritage Explorer";
    }


    const currentXP =
        passport.xp;


    const currentLevel =
        Math.floor(
            currentXP / 100
        ) + 1;


    const levelXP =
        currentXP % 100;


    if (level) {
        level.textContent =
            `Level ${currentLevel}`;
    }


    if (xp) {
        xp.textContent =
            `${currentXP} XP`;
    }


    if (progress) {
        progress.style.width =
            `${levelXP}%`;
    }


    if (xpText) {
        xpText.textContent =
            `${levelXP} / 100 XP to next level`;
    }


    if (placesCount) {
        placesCount.textContent =
            passport.visitedPlaces.length;
    }


    if (statesCount) {
        statesCount.textContent =
            passport.states.length;
    }


    if (badgesCount) {
        badgesCount.textContent =
            passport.badges.length;
    }


    renderVisitedPlaces(
        passport
    );


    renderPassportBadges(
        passport
    );
}


/* =========================================================
   VISITED PLACES
========================================================= */

function renderVisitedPlaces(
    passport
) {
    const container =
        getElement("visitedPlaces");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !passport.visitedPlaces ||
        passport.visitedPlaces.length === 0
    ) {
        const empty =
            document.createElement("p");

        empty.className =
            "empty-passport";

        empty.textContent =
            "No heritage places explored yet.";

        container.appendChild(
            empty
        );

        return;
    }


    passport.visitedPlaces.forEach(
        (place) => {
            const item =
                document.createElement("div");

            item.className =
                "visited-place";


            const icon =
                document.createElement("span");

            icon.className =
                "visited-place-icon";

            icon.textContent =
                "🏛️";


            const info =
                document.createElement("div");

            info.className =
                "visited-place-info";


            const name =
                document.createElement("strong");

            name.textContent =
                safeText(
                    place.name,
                    "Heritage Place"
                );


            const state =
                document.createElement("small");

            state.textContent =
                safeText(
                    place.state,
                    ""
                );


            info.appendChild(name);
            info.appendChild(state);

            item.appendChild(icon);
            item.appendChild(info);

            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   PASSPORT BADGES UI
========================================================= */

function renderPassportBadges(
    passport
) {
    const container =
        getElement("passportBadges");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    const allBadges = [
        {
            name: "First Heritage Visit",
            icon: "🏛️",
            requirement: "Visit 1 place",
            unlocked:
                passport.visitedPlaces.length >= 1
        },
        {
            name: "Heritage Explorer",
            icon: "🧭",
            requirement: "Visit 5 places",
            unlocked:
                passport.visitedPlaces.length >= 5
        },
        {
            name: "Heritage Master",
            icon: "🏆",
            requirement: "Visit 10 places",
            unlocked:
                passport.visitedPlaces.length >= 10
        },
        {
            name: "State Explorer",
            icon: "🇮🇳",
            requirement: "Explore 3 states",
            unlocked:
                passport.states.length >= 3
        },
        {
            name: "India Explorer",
            icon: "🌏",
            requirement: "Explore 5 states",
            unlocked:
                passport.states.length >= 5
        }
    ];


    allBadges.forEach(
        (badge) => {
            const item =
                document.createElement("div");

            item.className =
                "badge";


            if (badge.unlocked) {
                item.classList.add(
                    "unlocked"
                );
            }


            const icon =
                document.createElement("span");

            icon.className =
                "badge-icon";

            icon.textContent =
                badge.icon;


            const title =
                document.createElement("strong");

            title.textContent =
                badge.name;


            const requirement =
                document.createElement("small");

            requirement.textContent =
                badge.unlocked
                    ? "Unlocked"
                    : badge.requirement;


            item.appendChild(icon);
            item.appendChild(title);
            item.appendChild(requirement);

            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   RESET PASSPORT
========================================================= */

function resetPassport() {
    const confirmed =
        confirm(
            "Are you sure you want to reset your Heritage Passport?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        PASSPORT_KEY
    );


    updatePassportUI();


    const dashboard =
        getElement("passportDashboard");

    const createSection =
        getElement("passportCreate");

    const overlay =
        getElement("passportOverlay");

    const input =
        getElement("passportName");


    if (dashboard) {
        dashboard.style.display =
            "none";
    }


    if (createSection) {
        createSection.style.display =
            "block";
    }


    if (input) {
        input.value =
            "";
    }


    if (overlay) {
        overlay.classList.add("active");

        overlay.style.display =
            "flex";
    }


    updateAIStatus(
        "Heritage Passport has been reset."
    );
}


/* =========================================================
   PASSPORT BUTTON
========================================================= */

function openPassportDashboard() {
    const passport =
        getPassport();

    const overlay =
        getElement("passportOverlay");

    const dashboard =
        getElement("passportDashboard");

    const createSection =
        getElement("passportCreate");


    if (!passport.name) {
        openPassportOverlay();
        return;
    }


    if (overlay) {
        overlay.classList.add("active");

        overlay.style.display =
            "flex";
    }


    if (createSection) {
        createSection.style.display =
            "none";
    }


    if (dashboard) {
        dashboard.style.display =
            "block";
    }


    updatePassportUI();
}


/* =========================================================
   BUTTON INITIALIZATION
========================================================= */

function initializeButtons() {
    const searchButton =
        getElement("searchButton");

    const searchInput =
        getElement("searchInput");

    const aiAssistantBtn =
        getElement("aiAssistantBtn");

    const closeAIChatButton =
        getElement("closeAIChat");

    const aiSendButton =
        getElement("aiSendButton");

    const aiChatInput =
        getElement("aiChatInput");

    const createPassportBtn =
        getElement("createPassportBtn");

    const startPassportBtn =
        getElement("startPassportBtn");

    const resetPassportBtn =
        getElement("resetPassportBtn");

    const closePassportBtn =
        getElement("closePassportBtn");

    const voiceExplainBtn =
        getElement("voiceExplainBtn");

    const detailsPassportBtn =
        getElement("detailsPassportBtn");

    const detailsMapBtn =
        getElement("detailsMapBtn");


    /* SEARCH */

    if (searchButton) {
        searchButton.addEventListener(
            "click",
            searchHeritage
        );
    }


    if (searchInput) {
        searchInput.addEventListener(
            "keydown",
            function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    searchHeritage();
                }
            }
        );
    }


    /* AI ASSISTANT */

    if (aiAssistantBtn) {
        aiAssistantBtn.addEventListener(
            "click",
            openAIChat
        );
    }


    if (closeAIChatButton) {
        closeAIChatButton.addEventListener(
            "click",
            closeAIChat
        );
    }


    if (aiSendButton) {
        aiSendButton.addEventListener(
            "click",
            sendAIChatMessage
        );
    }


    if (aiChatInput) {
        aiChatInput.addEventListener(
            "keydown",
            function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    sendAIChatMessage();
                }
            }
        );
    }


    const aiModal =
        getElement("aiChatModal");


    if (aiModal) {
        aiModal.addEventListener(
            "click",
            function(event) {
                if (event.target === aiModal) {
                    closeAIChat();
                }
            }
        );
    }


    /* =====================================================
       PASSPORT CREATE BUTTON
    ===================================================== */

    if (createPassportBtn) {
        createPassportBtn.addEventListener(
            "click",
            function(event) {
                event.preventDefault();

                openPassportDashboard();
            }
        );
    }


    /* =====================================================
       START JOURNEY BUTTON
    ===================================================== */

    if (startPassportBtn) {
        startPassportBtn.addEventListener(
            "click",
            function(event) {
                event.preventDefault();
                event.stopPropagation();

                const result =
                    createPassport();

                if (result) {
                    console.log(
                        "Heritage Passport created successfully."
                    );
                }
            }
        );
    }


    /* =====================================================
       CLOSE PASSPORT
    ===================================================== */

    if (closePassportBtn) {
        closePassportBtn.addEventListener(
            "click",
            function(event) {
                event.preventDefault();
                closePassportOverlay();
            }
        );
    }


    /* Close passport by clicking outside modal */

    const passportOverlay =
        getElement("passportOverlay");


    if (passportOverlay) {
        passportOverlay.addEventListener(
            "click",
            function(event) {
                if (
                    event.target ===
                    passportOverlay
                ) {
                    closePassportOverlay();
                }
            }
        );
    }


    /* =====================================================
       RESET
    ===================================================== */

    if (resetPassportBtn) {
        resetPassportBtn.addEventListener(
            "click",
            resetPassport
        );
    }


    /* =====================================================
       VOICE EXPLANATION
    ===================================================== */

    if (voiceExplainBtn) {
        voiceExplainBtn.addEventListener(
            "click",
            explainCurrentPlace
        );
    }


    /* =====================================================
       ADD PLACE TO PASSPORT
    ===================================================== */

    if (detailsPassportBtn) {
        detailsPassportBtn.addEventListener(
            "click",
            function() {
                if (!currentPlace) {
                    alert(
                        "Please search for a heritage place first."
                    );

                    return;
                }


                let passport =
                    getPassport();


                if (!passport.name) {
                    openPassportOverlay();

                    const input =
                        getElement("passportName");

                    if (input) {
                        setTimeout(
                            () => input.focus(),
                            200
                        );
                    }

                    updateAIStatus(
                        "Create your Heritage Passport first."
                    );

                    return;
                }


                const result =
                    addPlaceToPassport(
                        currentPlace
                    );


                if (
                    result.reason ===
                    "already_added"
                ) {
                    alert(
                        `${currentPlace.name} is already in your Heritage Passport.`
                    );

                    return;
                }


                if (result.success) {
                    alert(
                        `${currentPlace.name} has been added to your Heritage Passport. You earned XP.`
                    );

                    updateAIStatus(
                        `+10 XP earned for ${currentPlace.name}.`
                    );
                }
            }
        );
    }


    /* =====================================================
       DETAILS MAP BUTTON
    ===================================================== */

    if (detailsMapBtn) {
        detailsMapBtn.addEventListener(
            "click",
            function() {
                if (!currentPlace) {
                    alert(
                        "Please search for a heritage place first."
                    );

                    return;
                }


                const latitude =
                    Number(
                        currentPlace.latitude
                    );

                const longitude =
                    Number(
                        currentPlace.longitude
                    );


                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {
                    alert(
                        "Map coordinates are not available for this place."
                    );

                    return;
                }


                scrollToSection(
                    "heritageMap"
                );


                setTimeout(
                    () => {
                        if (!map) {
                            initializeMap()
                                .then(
                                    () => {
                                        if (map) {
                                            map.invalidateSize(true);

                                            map.setView(
                                                [
                                                    latitude,
                                                    longitude
                                                ],
                                                12
                                            );
                                        }
                                    }
                                );

                            return;
                        }


                        map.invalidateSize(
                            true
                        );


                        map.setView(
                            [
                                latitude,
                                longitude
                            ],
                            12
                        );


                        const marker =
                            mapMarkers.find(
                                (item) => {
                                    const position =
                                        item.getLatLng();

                                    return (
                                        Math.abs(
                                            position.lat -
                                            latitude
                                        ) < 0.0001 &&
                                        Math.abs(
                                            position.lng -
                                            longitude
                                        ) < 0.0001
                                    );
                                }
                            );


                        if (marker) {
                            marker.openPopup();
                        }

                    },
                    500
                );
            }
        );
    }


    /* =====================================================
       MAP SECTION BUTTON
    ===================================================== */

    const mapButton =
        document.querySelector(
            ".map-btn"
        );


    if (mapButton) {
        mapButton.addEventListener(
            "click",
            function() {
                scrollToSection(
                    "heritageMap"
                );

                setTimeout(
                    () => {
                        if (map) {
                            map.invalidateSize(
                                true
                            );
                        }
                    },
                    500
                );
            }
        );
    }


    /* =====================================================
       AI SUGGESTION BUTTONS
    ===================================================== */

    const suggestionButtons =
        document.querySelectorAll(
            ".suggestion-btn"
        );


    suggestionButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                function() {
                    const topic =
                        this.textContent.trim();

                    openAIChat();

                    const input =
                        getElement("aiChatInput");

                    if (input) {
                        input.value =
                            `Tell me about ${topic} in Indian culture and heritage.`;

                        sendAIChatMessage();
                    }
                }
            );
        }
    );
}


/* =========================================================
   PASSPORT INITIALIZATION
========================================================= */

function initializePassport() {
    const passport =
        getPassport();

    const dashboard =
        getElement("passportDashboard");

    const overlay =
        getElement("passportOverlay");

    const createSection =
        getElement("passportCreate");


    /*
       Do not automatically open the passport modal
       when the website loads.
    */

    if (passport.name) {
        if (dashboard) {
            dashboard.style.display =
                "none";
        }

        if (createSection) {
            createSection.style.display =
                "none";
        }

        if (overlay) {
            overlay.style.display =
                "none";
        }

    } else {
        if (dashboard) {
            dashboard.style.display =
                "none";
        }

        if (createSection) {
            createSection.style.display =
                "block";
        }

        if (overlay) {
            overlay.style.display =
                "none";
        }
    }


    updatePassportUI();
}


/* =========================================================
   WINDOW GLOBALS
========================================================= */

window.searchHeritage =
    searchHeritage;

window.openAIChat =
    openAIChat;

window.closeAIChat =
    closeAIChat;

window.sendAIChatMessage =
    sendAIChatMessage;

window.showHeritageDetails =
    showHeritageDetails;

window.searchHeritageFromImage =
    searchHeritageFromImage;

window.speakText =
    speakText;

window.explainCurrentPlace =
    explainCurrentPlace;

window.createPassport =
    createPassport;

window.resetPassport =
    resetPassport;

window.openPassportOverlay =
    openPassportOverlay;


/* =========================================================
   APPLICATION INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {
        console.log(
            "CultureSetu frontend initialized."
        );


        initializeButtons();

        initializeVoiceSearch();

        initializeImageSearch();

        initializePassport();


        /* Load states */

        try {
            await loadStates();

        } catch (error) {
            console.error(
                "Initial states loading failed:",
                error
            );
        }


        /* Load popular places */

        try {
            await loadPopularPlaces();

        } catch (error) {
            console.error(
                "Initial popular places loading failed:",
                error
            );
        }


        /* Initialize map independently */

        try {
            await initializeMap();

        } catch (error) {
            console.error(
                "Initial map loading failed:",
                error
            );
        }


        updateAIStatus(
            "CultureSetu AI is ready."
        );
    }
);