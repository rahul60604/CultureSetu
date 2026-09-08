// ============================================================
// CULTURESETU - MAIN JAVASCRIPT
// AI Powered Cultural Heritage Platform
// Frontend → FastAPI → AI / Database / External APIs
// ============================================================


// ============================================================
// 0. CONFIGURATION
// ============================================================

const API_BASE = "https://culturesetu.onrender.com";


// ============================================================
// 1. COMMON HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function setAIStatus(message, show = true) {

    const status = $("aiStatus");

    if (!status) {
        return;
    }

    status.innerText = message;

    if (show) {

        status.classList.add("show");

        setTimeout(() => {
            status.classList.remove("show");
        }, 4000);
    }
}


async function apiRequest(url, options = {}) {

    try {

        const response = await fetch(API_BASE + url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        return await response.json();

    } catch (error) {

        console.error("API Error:", error);

        setAIStatus(
            "AI server se connection nahi ho pa raha.",
            true
        );

        throw error;
    }
}


// ============================================================
// 2. TEXT SEARCH
// ============================================================

const searchInput = $("searchInput");

const searchButton =
    $("searchButton") ||
    document.querySelector(".search-btn");


async function searchHeritage(query) {

    if (!query || !query.trim()) {

        setAIStatus(
            "Please place, heritage, artist ya community search karein."
        );

        return;
    }


    query = query.trim();

    setAIStatus(
        "🤖 CultureSetu AI search kar raha hai..."
    );


    try {

        const data = await apiRequest(
            "/api/heritage/search",
            {
                method: "POST",

                body: JSON.stringify({
                    query: query
                })
            }
        );


        console.log(
            "AI Search Result:",
            data
        );


        if (data.place) {

            showHeritageDetails(
                data.place
            );

        } else {

            showHeritageDetails(
                data
            );

        }


        setAIStatus(
            "✅ AI result ready"
        );


    } catch (error) {

        console.error(
            "Search failed:",
            error
        );

        setAIStatus(
            "Search failed. Backend check karein."
        );
    }
}


// Search button

if (searchButton) {

    searchButton.addEventListener(
        "click",
        function () {

            const query =
                searchInput
                    ? searchInput.value.trim()
                    : "";

            searchHeritage(query);

        }
    );
}


// Enter key

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                if (searchButton) {
                    searchButton.click();
                }

            }

        }
    );
}


// ============================================================
// 3. VOICE SEARCH
// ============================================================

const voiceButton =
    $("voiceSearchBtn") ||
    document.querySelector(".voice-btn");


let speechRecognition = null;


function startVoiceSearch() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice Search is not supported in this browser."
        );

        return;
    }


    speechRecognition =
        new SpeechRecognition();


    // Hindi + Indian English
    speechRecognition.lang = "hi-IN";

    speechRecognition.continuous = false;

    speechRecognition.interimResults = false;


    if (voiceButton) {

        const small =
            voiceButton.querySelector("small");

        if (small) {
            small.innerText = "Listening...";
        }

    }


    setAIStatus(
        "🎙️ Listening..."
    );


    speechRecognition.start();


    speechRecognition.onresult =
        function (event) {

            const speechText =
                event.results[0][0].transcript;


            console.log(
                "Voice:",
                speechText
            );


            if (searchInput) {
                searchInput.value =
                    speechText;
            }


            if (voiceButton) {

                const small =
                    voiceButton.querySelector("small");

                if (small) {
                    small.innerText =
                        "Speak and search";
                }

            }


            setAIStatus(
                "🤖 AI voice query process kar raha hai..."
            );


            searchHeritage(
                speechText
            );

        };


    speechRecognition.onerror =
        function (event) {

            console.error(
                "Voice Error:",
                event.error
            );


            if (voiceButton) {

                const small =
                    voiceButton.querySelector("small");

                if (small) {
                    small.innerText =
                        "Speak and search";
                }

            }


            setAIStatus(
                "Voice ko samajhne me problem hui."
            );

        };


    speechRecognition.onend =
        function () {

            if (voiceButton) {

                const small =
                    voiceButton.querySelector("small");

                if (small) {
                    small.innerText =
                        "Speak and search";
                }

            }

        };
}


if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        startVoiceSearch
    );

}


// ============================================================
// 4. IMAGE SEARCH
// ============================================================

const imageSearchButton =
    $("imageSearchBtn");


const imageInput =
    $("imageInput");


if (imageSearchButton && imageInput) {

    imageSearchButton.addEventListener(
        "click",
        function () {

            imageInput.click();

        }
    );


    imageInput.addEventListener(
        "change",
        async function () {

            const file =
                imageInput.files[0];


            if (!file) {
                return;
            }


            // 5 MB limit

            if (file.size > 5 * 1024 * 1024) {

                alert(
                    "Image maximum 5MB ki honi chahiye."
                );

                imageInput.value = "";

                return;
            }


            setAIStatus(
                "📷 AI image ko identify kar raha hai..."
            );


            try {

                const formData =
                    new FormData();

                formData.append(
                    "image",
                    file
                );


                const response =
                    await fetch(
                        API_BASE +
                        "/api/heritage/image-search",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Image API failed"
                    );

                }


                const data =
                    await response.json();


                console.log(
                    "Image AI:",
                    data
                );


                if (data.place) {

                    showHeritageDetails(
                        data.place
                    );

                } else {

                    showHeritageDetails(
                        data
                    );

                }


                setAIStatus(
                    "✅ Image successfully identified."
                );


            } catch (error) {

                console.error(
                    "Image Search Error:",
                    error
                );


                setAIStatus(
                    "Image AI backend available nahi hai."
                );

            }

        }
    );

}


// ============================================================
// 5. AI ASSISTANT
// ============================================================

const aiAssistantButton =
    $("aiAssistantBtn") ||
    document.querySelector(".ai-btn");


async function askCultureSetuAI(question) {

    if (!question || !question.trim()) {
        return;
    }


    setAIStatus(
        "🤖 CultureSetu AI soch raha hai..."
    );


    try {

        const data =
            await apiRequest(
                "/api/ai/chat",
                {
                    method: "POST",

                    body: JSON.stringify({
                        question:
                            question.trim()
                    })
                }
            );


        console.log(
            "AI Assistant:",
            data
        );


        const answer =
            data.answer ||
            data.response ||
            data.message ||
            "AI response nahi mila.";


        showAIAnswer(
            answer
        );


        setAIStatus(
            "✅ AI response ready"
        );


    } catch (error) {

        console.error(
            "AI Assistant Error:",
            error
        );


        setAIStatus(
            "AI Assistant backend se connect nahi hua."
        );

    }
}


function showAIAnswer(answer) {

    // Existing chat container ho to use karo

    const chat =
        document.querySelector(".ai-chat");


    if (chat) {

        const message =
            document.createElement("div");


        message.className =
            "ai-message";


        message.innerHTML = `
            <strong>🏛️ CultureSetu AI</strong>
            <p>${escapeHTML(answer)}</p>
        `;


        chat.appendChild(
            message
        );


        chat.scrollTop =
            chat.scrollHeight;


        return;
    }


    // Fallback

    alert(
        "CultureSetu AI:\n\n" +
        answer
    );
}


if (aiAssistantButton) {

    aiAssistantButton.addEventListener(
        "click",
        function () {

            const question =
                prompt(
                    "Ask CultureSetu AI about India's heritage:"
                );


            if (
                question === null ||
                question.trim() === ""
            ) {
                return;
            }


            askCultureSetuAI(
                question
            );

        }
    );

}


// ============================================================
// 6. STATE EXPLORER
// ============================================================

const stateSelect =
    $("stateSelect");


async function loadStateHeritage(
    stateName
) {

    if (!stateName) {
        return;
    }


    setAIStatus(
        `🤖 ${stateName} ka heritage AI se load ho raha hai...`
    );


    try {

        await loadPopularHeritage(
            stateName
        );


        // Search state itself

        await searchHeritage(
            stateName
        );


    } catch (error) {

        console.error(
            "State Error:",
            error
        );

    }
}


if (stateSelect) {

    stateSelect.addEventListener(
        "change",
        function () {

            const selectedOption =
                stateSelect.options[
                    stateSelect.selectedIndex
                ];


            const stateName =
                selectedOption.text.trim();


            if (
                !stateSelect.value ||
                stateName === "Select State"
            ) {
                return;
            }


            loadStateHeritage(
                stateName
            );

        }
    );

}


// ============================================================
// 7. LOAD STATES FROM BACKEND
// ============================================================

async function loadStates() {

    const stateList =
        $("stateList");


    try {

        const data =
            await apiRequest(
                "/api/states"
            );


        console.log(
            "States:",
            data
        );


        const states =
            Array.isArray(data)
                ? data
                : data.states || [];


        // Fill dropdown

        if (stateSelect) {

            const currentValue =
                stateSelect.value;


            stateSelect.innerHTML =
                `
                <option value="">
                    Select State
                </option>
                `;


            states.forEach(
                function (state) {

                    const name =
                        typeof state === "string"
                            ? state
                            : state.name;


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        name;


                    option.textContent =
                        name;


                    stateSelect.appendChild(
                        option
                    );

                }
            );


            stateSelect.value =
                currentValue;

        }


        // State chips/list

        if (stateList) {

            stateList.innerHTML =
                "";


            states.forEach(
                function (state) {

                    const name =
                        typeof state === "string"
                            ? state
                            : state.name;


                    const button =
                        document.createElement(
                            "button"
                        );


                    button.className =
                        "state-btn";


                    button.type =
                        "button";


                    button.dataset.state =
                        name;


                    button.innerHTML =
                        `🏛️ ${escapeHTML(name)}`;


                    button.addEventListener(
                        "click",
                        function () {

                            if (stateSelect) {

                                stateSelect.value =
                                    name;

                            }


                            loadStateHeritage(
                                name
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
            "State loading failed:",
            error
        );

    }
}


// ============================================================
// 8. AI POWERED POPULAR HERITAGE
// ============================================================

async function loadPopularHeritage(
    state = ""
) {

    const heritageGrid =
        $("heritageGrid");


    if (!heritageGrid) {
        return;
    }


    heritageGrid.innerHTML = `
        <div class="loading">
            🤖 AI is finding important heritage places...
        </div>
    `;


    try {

        let url =
            "/api/heritage/popular";


        if (state) {

            url +=
                "?state=" +
                encodeURIComponent(
                    state
                );

        }


        const data =
            await apiRequest(
                url
            );


        console.log(
            "Popular Heritage:",
            data
        );


        const places =
            Array.isArray(data)
                ? data
                : data.places || data.results || [];


        if (places.length === 0) {

            heritageGrid.innerHTML = `
                <p class="muted">
                    No heritage places found.
                </p>
            `;

            return;
        }


        heritageGrid.innerHTML =
            places.map(
                function (place) {

                    return `
                        <article
                            class="heritage-card"
                        >

                            <img
                                src="${
                                    escapeHTML(
                                        place.image_url ||
                                        "bg.jpg"
                                    )
                                }"
                                alt="${
                                    escapeHTML(
                                        place.name
                                    )
                                }"
                                loading="lazy"
                                onerror="this.src='bg.jpg'"
                            >

                            <div
                                class="heritage-card-content"
                            >

                                <h3>
                                    ${
                                        escapeHTML(
                                            place.name
                                        )
                                    }
                                </h3>

                                <p>
                                    📍 ${
                                        escapeHTML(
                                            place.location ||
                                            place.state ||
                                            ""
                                        )
                                    }
                                </p>

                                <span class="category">
                                    ${
                                        escapeHTML(
                                            place.category ||
                                            "Heritage"
                                        )
                                    }
                                </span>

                                <p class="mt-1">
                                    ${
                                        escapeHTML(
                                            place.short_description ||
                                            ""
                                        )
                                    }
                                </p>

                                <button
                                    class="explore-btn"
                                    type="button"
                                    data-place="${
                                        escapeHTML(
                                            place.name
                                        )
                                    }"
                                >
                                    Explore →
                                </button>

                            </div>

                        </article>
                    `;

                }
            ).join("");


        // Explore buttons

        heritageGrid
            .querySelectorAll(
                ".explore-btn"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            searchHeritage(
                                button.dataset.place
                            );

                        }
                    );

                }
            );


    } catch (error) {

        console.error(
            "Popular Heritage Error:",
            error
        );


        heritageGrid.innerHTML = `
            <div class="loading">
                AI heritage data load nahi hua.
                <br>
                FastAPI backend check karein.
            </div>
        `;

    }
}


// ============================================================
// 9. HERITAGE DETAILS
// ============================================================

function showHeritageDetails(
    place
) {

    if (!place) {
        return;
    }


    console.log(
        "Showing details:",
        place
    );


    const detailsSection =
        $("heritageDetails");


    if (detailsSection) {

        detailsSection.style.display =
            "block";

    }


    // Title

    if ($("detailsTitle")) {

        $("detailsTitle").innerText =
            place.name ||
            "Heritage Place";

    }


    // Location

    if ($("detailsLocation")) {

        $("detailsLocation").innerText =
            place.location ||
            place.state ||
            "";

    }


    // Main image

    if ($("detailsImage")) {

        $("detailsImage").src =
            place.image_url ||
            "bg.jpg";


        $("detailsImage").alt =
            place.name ||
            "Heritage";

    }


    // Category

    if ($("detailsCategory")) {

        $("detailsCategory").innerText =
            place.category ||
            "Cultural Heritage";

    }


    if ($("detailsPlaceName")) {

        $("detailsPlaceName").innerText =
            place.name ||
            "";

    }


    // Short description

    if ($("detailsShortDescription")) {

        $("detailsShortDescription").innerText =
            place.short_description ||
            place.description ||
            "";

    }


    // History

    if ($("detailsHistory")) {

        $("detailsHistory").innerText =
            place.history ||
            "History information not available.";

    }


    // Culture

    if ($("detailsCulture")) {

        $("detailsCulture").innerText =
            place.culture ||
            "Culture information not available.";

    }


    // Dance

    if ($("detailsDance")) {

        $("detailsDance").innerText =
            place.dance ||
            "Traditional dance information not available.";

    }


    // Art

    if ($("detailsArt")) {

        $("detailsArt").innerText =
            place.art ||
            "Traditional art information not available.";

    }


    // Gallery

    renderDetailsImages(
        place.images ||
        place.gallery ||
        []
    );


    // Videos

    renderDetailsVideos(
        place.videos ||
        []
    );


    // Map

    updateMapForPlace(
        place
    );


    // Add to passport

    const passportState =
        place.state ||
        extractState(
            place.location
        );


    window.currentHeritagePlace = {
        name:
            place.name ||
            "",
        state:
            passportState ||
            ""
    };


    // AI suggestions

    loadAISuggestions(
        place
    );


    // Scroll to details

    if (detailsSection) {

        setTimeout(
            function () {

                detailsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            100
        );

    }

}


// ============================================================
// 10. EXTRACT STATE
// ============================================================

function extractState(
    location
) {

    if (!location) {
        return "";
    }


    const parts =
        location
            .split(",")
            .map(
                part =>
                    part.trim()
            );


    if (parts.length >= 2) {

        return parts[
            parts.length - 1
        ];

    }


    return "";
}


// ============================================================
// 11. DETAILS IMAGES
// ============================================================

function renderDetailsImages(
    images
) {

    const container =
        $("detailsImages");


    if (!container) {
        return;
    }


    if (!Array.isArray(images) ||
        images.length === 0) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML =
        images.map(
            function (image) {

                const url =
                    typeof image === "string"
                        ? image
                        : image.url ||
                          image.image_url;


                return `
                    <img
                        src="${escapeHTML(url)}"
                        alt="Heritage image"
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                `;

            }
        ).join("");

}


// ============================================================
// 12. DETAILS VIDEOS
// ============================================================

function renderDetailsVideos(
    videos
) {

    const container =
        $("detailsVideos");


    if (!container) {
        return;
    }


    if (!Array.isArray(videos) ||
        videos.length === 0) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML =
        videos.map(
            function (video) {

                const title =
                    video.title ||
                    "Heritage Video";


                const url =
                    video.url ||
                    video.video_url ||
                    "#";


                return `
                    <a
                        href="${escapeHTML(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="media-card"
                    >

                        <div
                            style="
                                height:78px;
                                display:grid;
                                place-items:center;
                                background:#f1e7f3;
                                font-size:25px;
                            "
                        >
                            ▶️
                        </div>

                        <span>
                            ${escapeHTML(title)}
                        </span>

                    </a>
                `;

            }
        ).join("");

}


// ============================================================
// 13. AI SUGGESTIONS
// ============================================================

async function loadAISuggestions(
    place
) {

    const container =
        $("aiSuggestions");


    if (!container) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/api/ai/suggestions",
                {
                    method: "POST",

                    body: JSON.stringify({
                        place:
                            place.name,
                        state:
                            place.state ||
                            extractState(
                                place.location
                            )
                    })
                }
            );


        const suggestions =
            data.suggestions || [];


        if (!suggestions.length) {
            return;
        }


        container.innerHTML = `
            <h2>
                ✨ CultureSetu AI Suggests
            </h2>

            <div class="ai-chips">

                ${
                    suggestions.map(
                        function (item) {

                            return `
                                <button
                                    class="ai-chip suggestion-btn"
                                    type="button"
                                    data-query="${
                                        escapeHTML(
                                            typeof item === "string"
                                                ? item
                                                : item.title
                                        )
                                    }"
                                >
                                    ${
                                        escapeHTML(
                                            typeof item === "string"
                                                ? item
                                                : item.title
                                        )
                                    }
                                </button>
                            `;

                        }
                    ).join("")
                }

            </div>
        `;


        container
            .querySelectorAll(
                ".suggestion-btn"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            searchHeritage(
                                button.dataset.query
                            );

                        }
                    );

                }
            );


    } catch (error) {

        console.log(
            "AI suggestions API not available yet."
        );

    }

}


// ============================================================
// 14. HERITAGE MAP
// ============================================================

let heritageMap = null;

let mapMarkers = [];


// Initialize map

function initializeMap() {

    const mapElement =
        $("heritageMap");


    if (!mapElement) {
        return;
    }


    heritageMap =
        L.map(
            "heritageMap"
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
        heritageMap
    );


    setTimeout(
        function () {

            heritageMap.invalidateSize();

        },
        300
    );

}


// Start map

initializeMap();


// ============================================================
// 15. UPDATE MAP FOR AI RESULT
// ============================================================

function updateMapForPlace(
    place
) {

    if (!heritageMap) {
        return;
    }


    const lat =
        Number(
            place.latitude ??
            place.lat
        );


    const lng =
        Number(
            place.longitude ??
            place.lng
        );


    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {

        console.log(
            "Coordinates not available."
        );

        return;
    }


    // Remove old markers

    mapMarkers.forEach(
        function (marker) {

            heritageMap.removeLayer(
                marker
            );

        }
    );


    mapMarkers = [];


    // New marker

    const marker =
        L.marker(
            [lat, lng]
        ).addTo(
            heritageMap
        );


    marker.bindPopup(`
        <div>
            <strong>
                ${escapeHTML(
                    place.name ||
                    "Heritage Place"
                )}
            </strong>

            <br>

            <small>
                📍 ${escapeHTML(
                    place.location ||
                    ""
                )}
            </small>
        </div>
    `);


    mapMarkers.push(
        marker
    );


    // AUTO ZOOM

    heritageMap.setView(
        [lat, lng],
        14,
        {
            animate: true
        }
    );


    marker.openPopup();


    setTimeout(
        function () {

            heritageMap.invalidateSize();

        },
        300
    );

}


// ============================================================
// 16. LOAD MAP PLACES
// ============================================================

async function loadMapPlaces() {

    if (!heritageMap) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/api/heritage/map"
            );


        const places =
            data.places || data || [];


        places.forEach(
            function (place) {

                const lat =
                    Number(
                        place.latitude ??
                        place.lat
                    );


                const lng =
                    Number(
                        place.longitude ??
                        place.lng
                    );


                if (
                    Number.isNaN(lat) ||
                    Number.isNaN(lng)
                ) {
                    return;
                }


                const marker =
                    L.marker(
                        [lat, lng]
                    ).addTo(
                        heritageMap
                    );


                marker.bindPopup(`
                    <div>

                        <strong>
                            ${escapeHTML(
                                place.name
                            )}
                        </strong>

                        <br>

                        <small>
                            📍 ${escapeHTML(
                                place.location ||
                                ""
                            )}
                        </small>

                        <br><br>

                        <button
                            type="button"
                            class="map-history-btn"
                        >
                            View History
                        </button>

                    </div>
                `);


                marker.on(
                    "popupopen",
                    function () {

                        const popup =
                            marker.getPopup()
                                .getElement();


                        const button =
                            popup.querySelector(
                                ".map-history-btn"
                            );


                        if (button) {

                            button.onclick =
                                function () {

                                    searchHeritage(
                                        place.name
                                    );

                                };

                        }

                    }
                );


                mapMarkers.push(
                    marker
                );

            }
        );


    } catch (error) {

        console.log(
            "Map API not available yet."
        );

    }

}


// Load map data

loadMapPlaces();


// ============================================================
// 17. MAP BUTTON
// ============================================================

const mapButton =
    $("detailsMapBtn") ||
    document.querySelector(".map-btn");


if (mapButton) {

    mapButton.addEventListener(
        "click",
        function () {

            const place =
                window.currentHeritagePlace;


            if (
                place &&
                heritageMap
            ) {

                const marker =
                    mapMarkers[
                        mapMarkers.length - 1
                    ];


                if (marker) {

                    heritageMap.setView(
                        marker.getLatLng(),
                        14
                    );

                    marker.openPopup();

                }

            } else if (heritageMap) {

                heritageMap.setView(
                    [22.9734, 78.6569],
                    5
                );

            }


            if (heritageMap) {
                heritageMap.invalidateSize();
            }

        }
    );

}


// ============================================================
// 18. VOICE EXPLANATION
// ============================================================

const voiceExplainButton =
    $("voiceExplainBtn");


if (voiceExplainButton) {

    voiceExplainButton.addEventListener(
        "click",
        function () {

            const place =
                window.currentHeritagePlace;


            const title =
                $("detailsTitle")
                    ? $("detailsTitle").innerText
                    : "";


            const history =
                $("detailsHistory")
                    ? $("detailsHistory").innerText
                    : "";


            if (!title && !history) {

                alert(
                    "Pehle heritage place select karein."
                );

                return;
            }


            if (
                !("speechSynthesis" in window)
            ) {

                alert(
                    "Voice explanation supported nahi hai."
                );

                return;
            }


            speechSynthesis.cancel();


            const speech =
                new SpeechSynthesisUtterance(
                    title +
                    ". " +
                    history
                );


            speech.lang =
                "en-IN";


            speech.rate =
                0.9;


            speech.pitch =
                1;


            speechSynthesis.speak(
                speech
            );

        }
    );

}


// ============================================================
// 19. PASSPORT SYSTEM
// ============================================================

const passportBtn =
    $("createPassportBtn");


const passportOverlay =
    $("passportOverlay");


const closePassportBtn =
    $("closePassportBtn");


const passportCreate =
    $("passportCreate");


const passportDashboard =
    $("passportDashboard");


const passportName =
    $("passportName");


const startPassportBtn =
    $("startPassportBtn");


const displayPassportName =
    $("displayPassportName");


const passportLevel =
    $("passportLevel");


const passportXP =
    $("passportXP");


const xpProgress =
    $("xpProgress");


const xpText =
    $("xpText");


const placesCount =
    $("placesCount");


const statesCount =
    $("statesCount");


const badgesCount =
    $("badgesCount");


const visitedPlaces =
    $("visitedPlaces");


const passportBadges =
    $("passportBadges");


const resetPassportBtn =
    $("resetPassportBtn");


// ============================================================
// PASSPORT DATA
// ============================================================

let passportData =
    JSON.parse(
        localStorage.getItem(
            "cultureSetuPassport"
        )
    ) || {

        name: "",

        xp: 0,

        places: [],

        states: []

    };


// ============================================================
// PASSPORT ACHIEVEMENTS
// ============================================================

const passportAchievements = [

    {
        icon: "🥉",
        name: "First Explorer",
        description:
            "Explore 1 heritage place",
        requirement: 1
    },

    {
        icon: "🥈",
        name: "Heritage Explorer",
        description:
            "Explore 5 heritage places",
        requirement: 5
    },

    {
        icon: "🥇",
        name: "Culture Master",
        description:
            "Explore 10 heritage places",
        requirement: 10
    },

    {
        icon: "🏆",
        name: "Heritage Champion",
        description:
            "Explore 25 heritage places",
        requirement: 25
    }

];


// ============================================================
// SAVE PASSPORT
// ============================================================

function savePassport() {

    localStorage.setItem(
        "cultureSetuPassport",
        JSON.stringify(
            passportData
        )
    );

}


// ============================================================
// OPEN PASSPORT
// ============================================================

if (passportBtn && passportOverlay) {

    passportBtn.addEventListener(
        "click",
        function () {

            passportOverlay.classList.add(
                "active"
            );


            passportOverlay.classList.add(
                "show"
            );


            if (passportData.name) {

                if (passportCreate) {

                    passportCreate.style.display =
                        "none";

                }


                if (passportDashboard) {

                    passportDashboard.classList.add(
                        "active"
                    );

                    passportDashboard.style.display =
                        "block";

                }


                updatePassport();

            } else {

                if (passportCreate) {

                    passportCreate.style.display =
                        "block";

                }


                if (passportDashboard) {

                    passportDashboard.classList.remove(
                        "active"
                    );

                    passportDashboard.style.display =
                        "none";

                }

            }

        }
    );

}


// ============================================================
// CLOSE PASSPORT
// ============================================================

function closePassport() {

    if (!passportOverlay) {
        return;
    }


    passportOverlay.classList.remove(
        "active"
    );


    passportOverlay.classList.remove(
        "show"
    );

}


if (closePassportBtn) {

    closePassportBtn.addEventListener(
        "click",
        closePassport
    );

}


if (passportOverlay) {

    passportOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                passportOverlay
            ) {

                closePassport();

            }

        }
    );

}


// ============================================================
// CREATE PASSPORT
// ============================================================

if (startPassportBtn) {

    startPassportBtn.addEventListener(
        "click",
        function () {

            const name =
                passportName
                    ? passportName.value.trim()
                    : "";


            if (!name) {

                if (passportName) {
                    passportName.focus();
                }

                return;
            }


            passportData = {

                name: name,

                xp: 0,

                places: [],

                states: []

            };


            savePassport();


            if (passportCreate) {

                passportCreate.style.display =
                    "none";

            }


            if (passportDashboard) {

                passportDashboard.classList.add(
                    "active"
                );

                passportDashboard.style.display =
                    "block";

            }


            updatePassport();

        }
    );

}


// ============================================================
// PASSPORT ENTER KEY
// ============================================================

if (passportName) {

    passportName.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                startPassportBtn?.click();

            }

        }
    );

}


// ============================================================
// LEVEL SYSTEM
// ============================================================

function getLevel(xp) {

    return Math.floor(
        xp / 500
    ) + 1;

}


// ============================================================
// UPDATE PASSPORT
// ============================================================

function updatePassport() {

    const level =
        getLevel(
            passportData.xp
        );


    const currentLevelXP =
        passportData.xp % 500;


    const progress =
        (
            currentLevelXP / 500
        ) * 100;


    if (displayPassportName) {

        displayPassportName.innerText =
            passportData.name;

    }


    if (passportLevel) {

        passportLevel.innerText =
            "Level " + level;

    }


    if (passportXP) {

        passportXP.innerText =
            passportData.xp +
            " XP";

    }


    if (xpProgress) {

        xpProgress.style.width =
            progress + "%";

    }


    if (xpText) {

        xpText.innerText =
            currentLevelXP +
            " / 500 XP to next level";

    }


    if (placesCount) {

        placesCount.innerText =
            passportData.places.length;

    }


    if (statesCount) {

        statesCount.innerText =
            passportData.states.length;

    }


    updateVisitedPlaces();

    updateBadges();

}


// ============================================================
// VISITED PLACES
// ============================================================

function updateVisitedPlaces() {

    if (!visitedPlaces) {
        return;
    }


    if (
        passportData.places.length === 0
    ) {

        visitedPlaces.innerHTML = `
            <p class="empty-passport">
                No heritage places explored yet.
            </p>
        `;

        return;

    }


    visitedPlaces.innerHTML =
        passportData.places
            .map(
                function (place) {

                    return `
                        <div
                            class="visited-place"
                        >

                            <div
                                class="visited-place-icon"
                            >
                                🏛️
                            </div>

                            <div
                                class="visited-place-info"
                            >

                                <strong>
                                    ${escapeHTML(
                                        place.name
                                    )}
                                </strong>

                                <small>
                                    📍 ${escapeHTML(
                                        place.state
                                    )}
                                </small>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// ============================================================
// UPDATE BADGES
// ============================================================

function updateBadges() {

    if (!passportBadges) {
        return;
    }


    const totalPlaces =
        passportData.places.length;


    let unlockedBadges =
        0;


    passportBadges.innerHTML =
        passportAchievements
            .map(
                function (badge) {

                    const unlocked =
                        totalPlaces >=
                        badge.requirement;


                    if (unlocked) {
                        unlockedBadges++;
                    }


                    return `
                        <div
                            class="
                                badge
                                ${
                                    unlocked
                                        ? "unlocked"
                                        : ""
                                }
                            "
                        >

                            <span
                                class="badge-icon"
                            >
                                ${badge.icon}
                            </span>

                            <strong>
                                ${badge.name}
                            </strong>

                            <small>
                                ${badge.description}
                            </small>

                        </div>
                    `;

                }
            )
            .join("");


    if (badgesCount) {

        badgesCount.innerText =
            unlockedBadges;

    }

}


// ============================================================
// ADD HERITAGE TO PASSPORT
// ============================================================

function addHeritageToPassport(
    placeName,
    stateName
) {

    if (!placeName) {
        return;
    }


    const alreadyVisited =
        passportData.places.some(
            function (place) {

                return (
                    place.name.toLowerCase() ===
                    placeName.toLowerCase()
                );

            }
        );


    if (alreadyVisited) {

        alert(
            "🏛️ Already Explored!\n\n" +
            placeName +
            " is already in your passport."
        );

        return;

    }


    passportData.places.push({

        name:
            placeName,

        state:
            stateName ||
            "India"

    });


    // 100 XP

    passportData.xp += 100;


    if (
        stateName &&
        !passportData.states.includes(
            stateName
        )
    ) {

        passportData.states.push(
            stateName
        );

    }


    savePassport();

    updatePassport();


    alert(
        "🎉 Heritage Unlocked!\n\n" +
        placeName +
        "\n\n" +
        "+100 XP ⭐"
    );

}


// Make available globally

window.addHeritageToPassport =
    addHeritageToPassport;


// ============================================================
// 20. ADD CURRENT PLACE TO PASSPORT
// ============================================================

if ($("detailsPassportBtn")) {

    $("detailsPassportBtn")
        .addEventListener(
            "click",
            function () {

                const place =
                    window.currentHeritagePlace;


                if (!place) {

                    alert(
                        "Pehle heritage place select karein."
                    );

                    return;
                }


                addHeritageToPassport(
                    place.name,
                    place.state
                );

            }
        );

}


// ============================================================
// 21. RESET PASSPORT
// ============================================================

if (resetPassportBtn) {

    resetPassportBtn.addEventListener(
        "click",
        function () {

            const confirmReset =
                confirm(
                    "Are you sure you want to reset your Heritage Passport?"
                );


            if (!confirmReset) {
                return;
            }


            passportData = {

                name: "",

                xp: 0,

                places: [],

                states: []

            };


            localStorage.removeItem(
                "cultureSetuPassport"
            );


            if (passportDashboard) {

                passportDashboard.classList.remove(
                    "active"
                );

                passportDashboard.style.display =
                    "none";

            }


            if (passportCreate) {

                passportCreate.style.display =
                    "block";

            }


            if (passportName) {

                passportName.value =
                    "";

            }

        }
    );

}


// ============================================================
// 22. INITIAL PAGE LOAD
// ============================================================

window.addEventListener(
    "load",
    async function () {

        console.log(
            "🏛️ CultureSetu AI loaded."
        );


        // Load states

        loadStates();


        // AI Popular Heritage

        loadPopularHeritage();


        // Map resize

        if (heritageMap) {

            setTimeout(
                function () {

                    heritageMap.invalidateSize();

                },
                500
            );

        }


        // Passport

        if (passportData.name) {

            updatePassport();

            console.log(
                "🎫 CultureSetu Passport Loaded"
            );

        }

    }
);