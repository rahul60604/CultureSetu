"use strict";

/* =========================================================
   CultureSetu Frontend
   ========================================================= */

const API_BASE = "http://127.0.0.1:8000";

let currentPlace = null;
let map = null;
let mapMarkers = [];
let recognition = null;
let conversationContext = "";


/* =========================================================
   Utility Functions
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function safeText(value, fallback = "") {
    if (
        value === null ||
        value === undefined
    ) {
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

    const element =
        getElement(id);

    if (element) {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* =========================================================
   API Helper
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            options
        );

    if (!response.ok) {

        let errorMessage =
            `Request failed with status ${response.status}`;

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (error) {

            console.warn(
                "Could not parse API error response."
            );
        }

        throw new Error(
            errorMessage
        );
    }

    return await response.json();
}


/* =========================================================
   Language
   ========================================================= */

function getSelectedLanguage() {

    const languageSelect =
        getElement(
            "aiLanguageSelect"
        );

    if (!languageSelect) {
        return "English";
    }

    return languageSelect.value ||
        "English";
}


/* =========================================================
   Heritage Search
   ========================================================= */

async function searchHeritage() {

    const input =
        getElement(
            "searchInput"
        );

    if (!input) {
        return;
    }

    const query =
        input.value.trim();

    if (!query) {

        alert(
            "Please enter a heritage place name."
        );

        return;
    }

    const selectedLanguage =
        getSelectedLanguage();

    const searchButton =
        getElement(
            "searchButton"
        );

    if (searchButton) {

        searchButton.disabled =
            true;

        searchButton.textContent =
            "Searching...";
    }

    try {

        const data =
            await apiRequest(
                "/api/heritage/search",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        query: query,
                        language:
                            selectedLanguage
                    })
                }
            );

        if (data.place) {

            showHeritageDetails(
                data.place
            );

            updateAIStatus(
                `Found ${data.place.name}.`
            );

            scrollToSection(
                "heritageDetails"
            );

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

        alert(
            "Unable to search right now. Please make sure the backend server is running."
        );

    } finally {

        if (searchButton) {

            searchButton.disabled =
                false;

            searchButton.textContent =
                "Search";
        }
    }
}


/* =========================================================
   Heritage Details
   ========================================================= */

function showHeritageDetails(place) {

    if (!place) {
        return;
    }

    currentPlace = place;

    const detailsTitle =
        getElement(
            "detailsTitle"
        );

    const detailsPlaceName =
        getElement(
            "detailsPlaceName"
        );

    const detailsLocation =
        getElement(
            "detailsLocation"
        );

    const detailsCategory =
        getElement(
            "detailsCategory"
        );

    const detailsShortDescription =
        getElement(
            "detailsShortDescription"
        );

    const detailsImage =
        getElement(
            "detailsImage"
        );

    const detailsHistory =
        getElement(
            "detailsHistory"
        );

    const detailsCulture =
        getElement(
            "detailsCulture"
        );

    const detailsDance =
        getElement(
            "detailsDance"
        );

    const detailsArt =
        getElement(
            "detailsArt"
        );


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
            `${safeText(place.location)}${place.state ? `, ${place.state}` : ""}`;
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
            getImageUrl(
                place.image_url
            );

        detailsImage.alt =
            safeText(
                place.name,
                "Heritage Place"
            );

        detailsImage.onerror =
            function() {

                this.onerror = null;

                this.src =
                    "image/bg.jpg";
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

    addPlaceToPassport(
        place
    );
}


/* =========================================================
   Images
   ========================================================= */

function renderImages(images) {

    const container =
        getElement(
            "detailsImages"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !images ||
        images.length === 0
    ) {
        return;
    }

    images.forEach(
        (imageUrl, index) => {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                getImageUrl(
                    imageUrl
                );

            img.alt =
                `Heritage image ${index + 1}`;

            img.loading =
                "lazy";

            img.onerror =
                function() {

                    this.style.display =
                        "none";
                };

            container.appendChild(
                img
            );
        }
    );
}


/* =========================================================
   Videos
   ========================================================= */

function renderVideos(videos) {

    const container =
        getElement(
            "detailsVideos"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !videos ||
        videos.length === 0
    ) {
        return;
    }

    videos.forEach(
        video => {

            const wrapper =
                document.createElement(
                    "div"
                );

            wrapper.className =
                "heritage-video-item";

            const title =
                document.createElement(
                    "h4"
                );

            title.textContent =
                safeText(
                    video.title,
                    "Heritage Video"
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                safeText(
                    video.url,
                    "#"
                );

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Watch Video";

            wrapper.appendChild(
                title
            );

            wrapper.appendChild(
                link
            );

            container.appendChild(
                wrapper
            );
        }
    );
}


/* =========================================================
   Popular Places
   ========================================================= */

async function loadPopularPlaces(
    state = ""
) {

    const grid =
        getElement(
            "heritageGrid"
        );

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
            await apiRequest(
                endpoint
            );

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
            place => {

                const card =
                    createHeritageCard(
                        place
                    );

                grid.appendChild(
                    card
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


function createHeritageCard(
    place
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "heritage-card";

    card.style.cursor =
        "pointer";


    const image =
        document.createElement(
            "img"
        );

    image.src =
        getImageUrl(
            place.image_url
        );

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

            this.src =
                "image/bg.jpg";
        };


    const content =
        document.createElement(
            "div"
        );

    content.className =
        "heritage-card-content";


    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        safeText(
            place.name,
            "Heritage Place"
        );


    const location =
        document.createElement(
            "p"
        );

    location.textContent =
        `${safeText(place.location)}${place.state ? `, ${place.state}` : ""}`;


    const description =
        document.createElement(
            "p"
        );

    description.textContent =
        safeText(
            place.short_description ||
            place.description,
            "Discover this heritage destination."
        );


    content.appendChild(
        title
    );

    content.appendChild(
        location
    );

    content.appendChild(
        description
    );


    card.appendChild(
        image
    );

    card.appendChild(
        content
    );


    card.addEventListener(
        "click",
        () => {

            showHeritageDetails(
                place
            );

            scrollToSection(
                "heritageDetails"
            );
        }
    );


    return card;
}


/* =========================================================
   States
   ========================================================= */

async function loadStates() {

    try {

        const data =
            await apiRequest(
                "/api/states"
            );

        const states =
            data.states || [];

        const stateSelect =
            getElement(
                "stateSelect"
            );

        const stateList =
            getElement(
                "stateList"
            );


        if (stateSelect) {

            stateSelect.innerHTML =
                `<option value="">All States</option>`;

            states.forEach(
                state => {

                    const option =
                        document.createElement(
                            "option"
                        );

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
                state => {

                    const button =
                        document.createElement(
                            "button"
                        );

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
   AI Chat
   ========================================================= */

function openAIChat() {

    const modal =
        getElement(
            "aiChatModal"
        );

    const input =
        getElement(
            "aiChatInput"
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "active"
    );

    if (input) {

        setTimeout(
            () => {
                input.focus();
            },
            200
        );
    }
}


function closeAIChat() {

    const modal =
        getElement(
            "aiChatModal"
        );

    if (modal) {

        modal.classList.remove(
            "active"
        );
    }
}


function addAIChatMessage(
    message,
    type
) {

    const messages =
        getElement(
            "aiChatMessages"
        );

    if (!messages) {
        return;
    }

    const messageDiv =
        document.createElement(
            "div"
        );

    messageDiv.className =
        type === "user"
            ? "ai-message ai-user"
            : "ai-message ai-bot";

    messageDiv.textContent =
        safeText(
            message
        );

    messages.appendChild(
        messageDiv
    );

    messages.scrollTop =
        messages.scrollHeight;
}


async function sendAIChatMessage() {

    const input =
        getElement(
            "aiChatInput"
        );

    const messages =
        getElement(
            "aiChatMessages"
        );

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
        document.createElement(
            "div"
        );

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

                        question:
                            question,

                        language:
                            selectedLanguage,

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

            currentPlace =
                data.place;

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


        let errorMessage =
            "Unable to connect to the CultureSetu AI server.";


        if (
            selectedLanguage ===
            "Hindi"
        ) {

            errorMessage =
                "क्षमा करें, AI सर्वर से कनेक्शन नहीं हो सका।";

        } else if (
            selectedLanguage ===
            "Hinglish"
        ) {

            errorMessage =
                "Sorry, AI server se connection nahi ho saka.";
        }


        addAIChatMessage(
            errorMessage,
            "bot"
        );
    }
}


/* =========================================================
   AI Status
   ========================================================= */

function updateAIStatus(
    message
) {

    const status =
        getElement(
            "aiStatus"
        );

    if (status) {

        status.textContent =
            safeText(
                message
            );
    }
}


/* =========================================================
   AI Suggestions
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

                        place:
                            placeName,

                        state:
                            state
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
   Voice Search
   ========================================================= */

function initializeVoiceSearch() {

    const button =
        getElement(
            "voiceSearchBtn"
        );

    if (!button) {
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        button.disabled =
            true;

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

            button.classList.add(
                "active"
            );

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
                getElement(
                    "searchInput"
                );


            if (input) {

                input.value =
                    transcript;
            }


            updateAIStatus(
                `Voice search received: ${transcript}`
            );


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
   Text To Speech
   ========================================================= */

function speakText(text) {

    if (
        !("speechSynthesis" in window)
    ) {

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
   Image Search
   ========================================================= */

function initializeImageSearch() {

    const button =
        getElement(
            "imageSearchBtn"
        );

    const input =
        getElement(
            "imageInput"
        );


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


async function searchHeritageFromImage(
    file
) {

    if (
        !file.type.startsWith(
            "image/"
        )
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
   Map
   ========================================================= */

async function initializeMap() {

    const mapContainer =
        getElement(
            "heritageMap"
        );


    if (!mapContainer) {
        return;
    }


    if (
        typeof L ===
        "undefined"
    ) {

        console.error(
            "Leaflet library is not loaded."
        );

        return;
    }


    try {

        map =
            L.map(
                mapContainer
            ).setView(
                [22.9734, 78.6569],
                5
            );


        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(
            map
        );


        const data =
            await apiRequest(
                "/api/heritage/map"
            );


        if (!data.places) {
            return;
        }


        data.places.forEach(
            place => {

                const marker =
                    L.marker([
                        place.latitude,
                        place.longitude
                    ]).addTo(
                        map
                    );


                marker.bindPopup(`
                    <strong>${escapeHTML(place.name)}</strong><br>
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


    } catch (error) {

        console.error(
            "Map Error:",
            error
        );
    }
}


function escapeHTML(
    value
) {

    return safeText(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


async function searchPlaceDirectly(
    name
) {

    const input =
        getElement(
            "searchInput"
        );


    if (input) {

        input.value =
            name;
    }


    await searchHeritage();
}


/* =========================================================
   Heritage Passport
   ========================================================= */

const PASSPORT_KEY =
    "culturesetu_passport";


function getPassport() {

    try {

        const saved =
            localStorage.getItem(
                PASSPORT_KEY
            );


        if (!saved) {

            return {
                name: "",
                xp: 0,
                visitedPlaces: [],
                states: [],
                badges: []
            };
        }


        const passport =
            JSON.parse(
                saved
            );


        return {

            name:
                passport.name || "",

            xp:
                Number(
                    passport.xp
                ) || 0,

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


        return {
            name: "",
            xp: 0,
            visitedPlaces: [],
            states: [],
            badges: []
        };
    }
}


function savePassport(
    passport
) {

    localStorage.setItem(
        PASSPORT_KEY,
        JSON.stringify(
            passport
        )
    );
}


function createPassport() {

    const input =
        getElement(
            "passportName"
        );


    const name =
        input
            ? input.value.trim()
            : "";


    if (!name) {

        alert(
            "Please enter your name."
        );

        return;
    }


    const passport =
        getPassport();


    passport.name =
        name;


    savePassport(
        passport
    );


    updatePassportUI();


    const dashboard =
        getElement(
            "passportDashboard"
        );


    const overlay =
        getElement(
            "passportOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";
    }


    if (dashboard) {

        dashboard.style.display =
            "block";
    }
}


function addPlaceToPassport(
    place
) {

    if (
        !place ||
        !place.id
    ) {
        return;
    }


    const passport =
        getPassport();


    if (!passport.name) {
        return;
    }


    const exists =
        passport.visitedPlaces
            .some(
                item =>
                    item.id ===
                    place.id
            );


    if (!exists) {

        passport.visitedPlaces.push({

            id:
                place.id,

            name:
                place.name,

            state:
                place.state
        });


        passport.xp +=
            10;
    }


    if (
        place.state &&
        !passport.states.includes(
            place.state
        )
    ) {

        passport.states.push(
            place.state
        );

        passport.xp +=
            5;
    }


    updatePassportBadges(
        passport
    );


    savePassport(
        passport
    );


    updatePassportUI();
}


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


function updatePassportUI() {

    const passport =
        getPassport();


    const displayName =
        getElement(
            "displayPassportName"
        );


    const level =
        getElement(
            "passportLevel"
        );


    const xp =
        getElement(
            "passportXP"
        );


    const progress =
        getElement(
            "xpProgress"
        );


    const xpText =
        getElement(
            "xpText"
        );


    const placesCount =
        getElement(
            "placesCount"
        );


    const statesCount =
        getElement(
            "statesCount"
        );


    const badgesCount =
        getElement(
            "badgesCount"
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
            currentLevel;
    }


    if (xp) {

        xp.textContent =
            currentXP;
    }


    if (progress) {

        progress.style.width =
            `${levelXP}%`;
    }


    if (xpText) {

        xpText.textContent =
            `${levelXP} / 100 XP`;
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


function renderVisitedPlaces(
    passport
) {

    const container =
        getElement(
            "visitedPlaces"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    passport.visitedPlaces
        .forEach(
            place => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "visited-place";


                item.textContent =
                    `${place.name}${place.state ? ` — ${place.state}` : ""}`;


                container.appendChild(
                    item
                );
            }
        );
}


function renderPassportBadges(
    passport
) {

    const container =
        getElement(
            "passportBadges"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    passport.badges
        .forEach(
            badge => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "passport-badge";


                item.textContent =
                    badge;


                container.appendChild(
                    item
                );
            }
        );
}


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
        getElement(
            "passportDashboard"
        );


    const overlay =
        getElement(
            "passportOverlay"
        );


    if (dashboard) {

        dashboard.style.display =
            "none";
    }


    if (overlay) {

        overlay.style.display =
            "flex";
    }
}


/* =========================================================
   Button Initialization
   ========================================================= */

function initializeButtons() {

    const searchButton =
        getElement(
            "searchButton"
        );


    const searchInput =
        getElement(
            "searchInput"
        );


    const aiAssistantBtn =
        getElement(
            "aiAssistantBtn"
        );


    const closeAIChatButton =
        getElement(
            "closeAIChat"
        );


    const aiSendButton =
        getElement(
            "aiSendButton"
        );


    const aiChatInput =
        getElement(
            "aiChatInput"
        );


    const passportCreate =
        getElement(
            "passportCreate"
        );


    const startPassportBtn =
        getElement(
            "startPassportBtn"
        );


    const resetPassportBtn =
        getElement(
            "resetPassportBtn"
        );


    const voiceExplainBtn =
        getElement(
            "voiceExplainBtn"
        );


    const detailsPassportBtn =
        getElement(
            "detailsPassportBtn"
        );


    const detailsMapBtn =
        getElement(
            "detailsMapBtn"
        );


    /* Search */

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

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchHeritage();
                }
            }
        );
    }


    /* AI Assistant */

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

                if (
                    event.key ===
                    "Enter"
                ) {

                    sendAIChatMessage();
                }
            }
        );
    }


    /* Close AI Modal */

    const aiModal =
        getElement(
            "aiChatModal"
        );


    if (aiModal) {

        aiModal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    aiModal
                ) {

                    closeAIChat();
                }
            }
        );
    }


    /* Passport */

    if (passportCreate) {

        passportCreate.addEventListener(
            "click",
            createPassport
        );
    }


    if (startPassportBtn) {

        startPassportBtn.addEventListener(
            "click",
            function() {

                const passport =
                    getPassport();


                if (passport.name) {

                    updatePassportUI();


                    const dashboard =
                        getElement(
                            "passportDashboard"
                        );


                    const overlay =
                        getElement(
                            "passportOverlay"
                        );


                    if (overlay) {

                        overlay.style.display =
                            "none";
                    }


                    if (dashboard) {

                        dashboard.style.display =
                            "block";
                    }


                    return;
                }


                const overlay =
                    getElement(
                        "passportOverlay"
                    );


                if (overlay) {

                    overlay.style.display =
                        "flex";
                }
            }
        );
    }


    if (resetPassportBtn) {

        resetPassportBtn.addEventListener(
            "click",
            resetPassport
        );
    }


    /* Voice Explanation */

    if (voiceExplainBtn) {

        voiceExplainBtn.addEventListener(
            "click",
            explainCurrentPlace
        );
    }


    /* Add Place To Passport */

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


                addPlaceToPassport(
                    currentPlace
                );


                alert(
                    `${currentPlace.name} has been added to your Heritage Passport.`
                );
            }
        );
    }


    /* Map Button */

    if (detailsMapBtn) {

        detailsMapBtn.addEventListener(
            "click",
            function() {

                if (!currentPlace) {
                    return;
                }


                if (
                    currentPlace.latitude ===
                        null ||
                    currentPlace.longitude ===
                        null ||
                    currentPlace.latitude ===
                        undefined ||
                    currentPlace.longitude ===
                        undefined
                ) {

                    alert(
                        "Map coordinates are not available for this place."
                    );

                    return;
                }


                scrollToSection(
                    "heritageMap"
                );


                if (map) {

                    map.setView(
                        [
                            currentPlace.latitude,
                            currentPlace.longitude
                        ],
                        12
                    );
                }
            }
        );
    }


    /* AI Suggestion Buttons */

    const suggestionButtons =
        document.querySelectorAll(
            ".suggestion-btn"
        );


    suggestionButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    const topic =
                        this.textContent.trim();


                    openAIChat();


                    const input =
                        getElement(
                            "aiChatInput"
                        );


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
   Passport Initialization
   ========================================================= */

function initializePassport() {

    const passport =
        getPassport();


    const dashboard =
        getElement(
            "passportDashboard"
        );


    const overlay =
        getElement(
            "passportOverlay"
        );


    if (passport.name) {

        if (dashboard) {

            dashboard.style.display =
                "block";
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
    }


    updatePassportUI();
}


/* =========================================================
   Global Functions
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


/* =========================================================
   Application Initialization
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


        await loadStates();

        await loadPopularPlaces();

        await initializeMap();


        updateAIStatus(
            "CultureSetu AI is ready."
        );
    }
);