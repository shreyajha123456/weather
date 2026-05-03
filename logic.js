// ======================== DOM Elements ========================
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const geoBtn = document.getElementById('geoLocationBtn');
    const weatherBody = document.getElementById('weatherBody');
    const notFoundDiv = document.getElementById('locationNotFound');

    // weather dynamic elements
    const weatherIcon = document.getElementById('weatherIcon');
    const cityNameSpan = document.getElementById('cityName');
    const tempSpan = document.getElementById('tempValue');
    const descSpan = document.getElementById('descText');
    const feelsLikeSpan = document.getElementById('feelsLike');
    const humiditySpan = document.getElementById('humidityVal');
    const windSpan = document.getElementById('windVal');

    // API KEY (provided)
    const API_KEY = "e7f0f0d1cff18d582a46ae90388537ce";
    const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    // Helper: show loading state on search button
    function setButtonLoading(button, isLoading, normalIcon = true) {
        if (isLoading) {
            button.disabled = true;
            button.style.opacity = "0.7";
            if (normalIcon && button.querySelector('i')) {
                const originalIcon = button.innerHTML;
                button.setAttribute('data-original', originalIcon);
                button.innerHTML = '<div class="loading-spinner"></div>';
            }
        } else {
            button.disabled = false;
            button.style.opacity = "1";
            if (button.hasAttribute('data-original')) {
                button.innerHTML = button.getAttribute('data-original');
                button.removeAttribute('data-original');
            } else {
                if (button.querySelector('.loading-spinner')) {
                    button.innerHTML = '<i class="fas fa-search"></i>';
                } else if (button.id === 'geoLocationBtn' && button.querySelector('.loading-spinner')) {
                    button.innerHTML = '<i class="fas fa-location-dot"></i>';
                }
            }
        }
    }

    // unified error / UI reset
    function showNotFound(show) {
        if (show) {
            weatherBody.style.display = 'none';
            notFoundDiv.style.display = 'flex';
        } else {
            weatherBody.style.display = 'flex';
            notFoundDiv.style.display = 'none';
        }
    }

    // convert wind speed m/s to km/h
    function formatWindSpeed(speedMps) {
        const kmh = speedMps * 3.6;
        return `${kmh.toFixed(1)} km/h`;
    }

    // update UI with weather data
    function updateWeatherUI(data) {
        // Extract essential data
        const city = data.name;
        const country = data.sys.country;
        const tempKelvin = data.main.temp;
        const tempCelsius = Math.round(tempKelvin - 273.15);
        const feelsLikeKelvin = data.main.feels_like;
        const feelsLikeCelsius = Math.round(feelsLikeKelvin - 273.15);
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windMps = data.wind.speed;
        const iconCode = data.weather[0].icon;
        
        // Use high-res icon from OpenWeather
        weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        weatherIcon.alt = description;
        
        cityNameSpan.textContent = `${city}, ${country}`;
        tempSpan.innerHTML = `${tempCelsius}<sup>°C</sup>`;
        descSpan.textContent = description;
        feelsLikeSpan.innerHTML = `🌡️ Feels like ${feelsLikeCelsius}°C`;
        humiditySpan.textContent = `${humidity}%`;
        windSpan.textContent = formatWindSpeed(windMps);
        
        // subtle dynamic effect: container border glow? optional (cosmetic)
        weatherBody.style.animation = 'none';
        weatherBody.offsetHeight; // reflow
        weatherBody.style.animation = 'fadeSlideUp 0.4s ease-out';
    }

    // core fetch function by city name
    async function fetchWeatherByCity(cityName) {
        if (!cityName || cityName.trim() === "") {
            // empty input visual feedback
            cityInput.placeholder = "Enter a city name!";
            cityInput.style.border = "1px solid #dc7f6e";
            setTimeout(() => { cityInput.style.border = ""; cityInput.placeholder = "e.g., Tokyo, London, Paris"; }, 1000);
            return false;
        }
        
        const trimmedCity = cityName.trim();
        const url = `${BASE_URL}?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.cod === "404" || data.cod !== 200) {
                showNotFound(true);
                return false;
            }
            
            // successful data
            showNotFound(false);
            updateWeatherUI(data);
            return true;
        } catch (err) {
            console.error("Network / fetch error: ", err);
            // show error not found style with custom msg
            showNotFound(true);
            const notFoundMsg = document.querySelector('#locationNotFound p');
            if (notFoundMsg) notFoundMsg.innerText = "Network issue · check connection";
            setTimeout(() => {
                if (notFoundMsg) notFoundMsg.innerText = "Try another city or check your spelling";
            }, 2500);
            return false;
        }
    }

    // fetch by coordinates (geolocation)
    async function fetchWeatherByCoords(lat, lon) {
        const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (response.ok && data.cod === 200) {
                showNotFound(false);
                updateWeatherUI(data);
                return true;
            } else {
                showNotFound(true);
                return false;
            }
        } catch (err) {
            console.error("coord fetch error", err);
            showNotFound(true);
            return false;
        }
    }

    // geolocation handler with permission & loading
    function getUserLocationWeather() {
        if (!navigator.geolocation) {
            alert("Geolocation not supported by your browser.");
            return;
        }
        // set geo button loading state
        const originalGeoHtml = geoBtn.innerHTML;
        geoBtn.disabled = true;
        geoBtn.innerHTML = '<div class="loading-spinner" style="border-top-color:#1f6392;"></div>';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await fetchWeatherByCoords(latitude, longitude);
                geoBtn.disabled = false;
                geoBtn.innerHTML = originalGeoHtml;
            },
            (error) => {
                console.warn("Geolocation error", error);
                geoBtn.disabled = false;
                geoBtn.innerHTML = originalGeoHtml;
                let errorMsg = "Location access denied. Please search manually.";
                if (error.code === 1) errorMsg = "📍 Permission denied. Use search bar.";
                else if (error.code === 2) errorMsg = "Position unavailable.";
                showNotFound(true);
                const notifDiv = document.querySelector('#locationNotFound p');
                if (notifDiv) notifDiv.innerText = errorMsg;
                setTimeout(() => {
                    if (notifDiv && notifDiv.innerText === errorMsg) 
                        notifDiv.innerText = "Try another city or check your spelling";
                }, 3000);
            }
        );
    }

    // event: search button + loading state
    async function handleSearch() {
        const city = cityInput.value;
        if (!city.trim()) {
            cityInput.placeholder = "🌍 Enter location first!";
            cityInput.classList.add('shake');
            setTimeout(() => cityInput.classList.remove('shake'), 500);
            return;
        }
        // set loading on search button
        const searchButtonElem = searchBtn;
        const originalBtnHtml = searchButtonElem.innerHTML;
        searchButtonElem.disabled = true;
        searchButtonElem.innerHTML = '<div class="loading-spinner"></div>';
        
        await fetchWeatherByCity(city);
        
        searchButtonElem.disabled = false;
        searchButtonElem.innerHTML = originalBtnHtml;
    }

    // keyboard enter support
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });
    
    searchBtn.addEventListener('click', handleSearch);
    geoBtn.addEventListener('click', getUserLocationWeather);
    
    // optional add a subtle shake animation for empty field
    const styleShake = document.createElement('style');
    styleShake.textContent = `
        .shake {
            animation: shakeAnim 0.3s ease-in-out 0s 2;
        }
        @keyframes shakeAnim {
            0%,100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(styleShake);
    
    // ========== DEFAULT LOAD: show beautiful default city ==========
    async function initDefaultWeather() {
        // start with a famous location that works (Tokyo)
        weatherBody.style.display = 'flex';
        notFoundDiv.style.display = 'none';
        // set loading on searchBtn (optional visual), but we don't want to block UI
        const defaultCity = "New York";
        cityInput.value = defaultCity;
        // fetch default data
        const url = `${BASE_URL}?q=${encodeURIComponent(defaultCity)}&appid=${API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.cod === 200) {
                updateWeatherUI(data);
                showNotFound(false);
            } else {
                // fallback to London
                const fallback = await fetch(`${BASE_URL}?q=London&appid=${API_KEY}`);
                const fallData = await fallback.json();
                if (fallData.cod === 200) {
                    updateWeatherUI(fallData);
                    cityInput.value = "London";
                    showNotFound(false);
                } else {
                    showNotFound(true);
                }
            }
        } catch (err) {
            console.log("initial fetch", err);
            showNotFound(true);
        }
    }
    
    initDefaultWeather();
    
    // progressive improvement: image load error fallback (just in case)
    weatherIcon.addEventListener('error', () => {
        weatherIcon.src = "https://openweathermap.org/img/wn/10d@4x.png";
    });
    
    // handle if api returns undefined main etc but data validation already covered
    // additionally ensure wind/humidity span numeric
    // also fix dynamic feelslike unit
    // add remove loading internal errors
    // Simple fix: when we fetch city via handleSearch and error not found, display notFoundMessage
    // Adjust not found message each time we trigger error
    function resetNotFoundMsg() {
        const pMsg = document.querySelector('#locationNotFound p');
        if (pMsg && pMsg.innerText !== "Try another city or check your spelling") {
            pMsg.innerText = "Try another city or check your spelling";
        }
    }
    
    // override showNotFound to also reset message after showing
    const originalShowNotFound = showNotFound;
    window.showNotFound = function(show) {
        originalShowNotFound(show);
        if (show) resetNotFoundMsg();
    }.bind(this);
    showNotFound = window.showNotFound;
    
    // fine polishing: adjust temp display for dynamic
    // also weather body initially not hidden? we made default fetch so it's fine. 
    // small fix for location not found after manual fetch
    const checkWeatherWrapper = async (city) => {
        const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if(data.cod === "404" || data.cod !== 200) {
                showNotFound(true);
                return false;
            }
            showNotFound(false);
            updateWeatherUI(data);
            return true;
        } catch(e) {
            showNotFound(true);
            return false;
        }
    };
    // Link for later but we keep fine
    console.log("✨ weather ready — modern & polished");
});
