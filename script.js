//DOM ELEMENTS
const cityInput     = document.getElementById("cityInput")
const searchBtn     = document.getElementById("searchBtn")
const weatherResult = document.getElementById("weatherResult")
const cityNameEl = document.getElementById("cityName")
const tempEl = document.getElementById("temperature")
const descEl = document.getElementById("condition")
const errorEl = document.getElementById("error")
const errorContainer = errorEl.parentElement;
const iconEl = document.getElementById('icon');
const feelsLikeEl = document.getElementById('feels-like');
const minMaxEl = document.getElementById('minmax');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind')
const unitRadios = document.querySelectorAll('input[name="units"]');
const geoBtn = document.getElementById('geo-btn');
const windDirEl = document.getElementById('wind-dir');


//SETTING UP DATA
const API_KEY = '525486001d4718eb3b8daa4148ed8fc4';
let currentUnits = localStorage.getItem('units') || 'metric';
let lastCity = '';

unitRadios.forEach(r => r.checked = (r.value === currentUnits ));
searchBtn.addEventListener('click',()=>{handleSearch();});
geoBtn.addEventListener('click',()=>{
    if(!('geolocation' in navigator)){
        showError('Geolocation is not supported in oyour browser');
        return;
    }

    clearError();
    setGeoLoading(true);

    const options = {
        enableHighAccuracy:true,
        timeout:10000,
        maximumAge:300000
    };

    navigator.geolocation.getCurrentPosition(
        (pos)=>{
            setGeoLoading(false);
            const {latitude,longitude} = pos.coords;
            handleSearchByCoords(latitude,longitude);
        },
        (err)=>{
            setGeoLoading(false);
            switch(err.code){
                case err.PERMISSION_DENIED:
                    showError('Location permission denied. You can still search by city.');
                    break;
                case err.POSITION_UNAVAILABLE:
                    showError('Location information is unavailable.');
                    break;
                case err.TIMEOUT:
                    showError('Getting location timed out. Try again.');
                    break;
                default:
                    showError('Failed to get your location.');
            }
        },
        options
    );
});

cityInput.addEventListener('keydown',(e)=>{
    if(e.key === 'Enter'){
        handleSearch(); 
    }
});
unitRadios.forEach(radio=>{
    radio.addEventListener('change',()=>{
        currentUnits = radio.value;
        localStorage.setItem('units',currentUnits);
        if(lastCity) handleSearch(lastCity);
    });
});

async function handleSearch(cityArg){
    const raw = typeof(cityArg) === 'string' && cityArg.trim() ? cityArg : cityInput.value;
    const city = raw.trim();

    if(!city) {
        console.log('Type a city.');
        return;
    }

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnits}`;

    //PRE-RESET prevents stale ui durin slow/failed requests...
    clearError();
    weatherResult.classList.add('hidden');

    //LOCK THE BUTTON
    setLoading(true);

    const tempSymbol = (currentUnits === 'metric')?'°C':'°F';
    const windUnit   = (currentUnits === 'metric')?'m/s':'mph';
    const controller = new AbortController();
    const timeoutId  = setTimeout(()=>controller.abort(),2000);

    
    try{

        //MAKING THE REQUEST TO THE SERVER
        const response = await fetch(apiUrl,{signal: controller.signal});

        if(response.status === 401) throw new Error('Invalid API key.');
        if(response.status === 404) throw new Error('City not found.');
        if(response.status === 429) throw new Error('Too many requests. Try later.');
        if(!response.ok) throw new Error(`Server error (${response.status})`);
        

        const data = await response.json();

        //SHOWING THE DATA REQUESTED

        cityNameEl.textContent = data.name;
        const iconCode = data.weather[0].icon;
        iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        iconEl.alt = data.weather[0].description;
        tempEl.textContent = `${Math.round(data.main.temp)}${tempSymbol}`;
        descEl.textContent = data.weather[0].description;

        feelsLikeEl.textContent = ` ${Math.round(data.main.feels_like)}${tempSymbol}`;
        minMaxEl.textContent = ` ${Math.round(data.main.temp_min)} / ${Math.round(data.main.temp_max)}${tempSymbol}`;
        humidityEl.textContent = ` ${Math.round(data.main.humidity)}%`;
        windEl.textContent = ` ${Math.round(data.wind.speed)} ${windUnit}`;
        windDirEl.textContent = ` ${degToCompass(data.wind.deg)}`;

        lastCity = data.name;

        //SHOWING THE INFO MAKING VISIBLE THE CONTAINERS
        weatherResult.classList.remove('hidden');
        clearError();

    }catch(error){

        if(error.name === 'AbortError'){
            showError('Request timed out. Check your connection and try again.')
        }else if(String(error.message).includes('Failed to fetch')){
            showError('Network Error. Are you offline?');
        }else {
            showError(error.message || 'Something went wrong.')
        }
        weatherResult.classList.add('hidden');
    }
    finally{
        //Always restore the button
        setLoading(false); 
        clearTimeout(timeoutId);
        cityInput.value = '';
    }

}

async function handleSearchByCoords(lat,lon){
    clearError();
    weatherResult.classList.add('hidden');
    setGeoLoading(true);


    const tempSymbol = (currentUnits === 'metric')?'°C':'°F';
    const windUnit   = (currentUnits === 'metric')?'m/s':'mph';

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnits}`;
    
    const controller = new AbortController();
    const timeoutId  = setTimeout(()=>controller.abort(),1000);

    try{

        //MAKING THE REQUEST TO THE SERVER
        const response = await fetch(url,{signal: controller.signal});

        if(response.status === 401) throw new Error('Invalid API key.');
        if(response.status === 404) throw new Error('City not found.');
        if(response.status === 429) throw new Error('Too many requests. Try later.');
        if(!response.ok) throw new Error(`Server error (${response.status})`);
        

        const data = await response.json();

        //SHOWING THE DATA REQUESTED

        cityNameEl.textContent = data.name;
        const iconCode = data.weather[0].icon;
        iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        iconEl.alt = data.weather[0].description;
        tempEl.textContent = `${Math.round(data.main.temp)}${tempSymbol}`;
        descEl.textContent = data.weather[0].description;

        feelsLikeEl.textContent = ` ${Math.round(data.main.feels_like)}${tempSymbol}`;
        minMaxEl.textContent = ` ${Math.round(data.main.temp_min)} / ${Math.round(data.main.temp_max)}${tempSymbol}`;
        humidityEl.textContent = ` ${Math.round(data.main.humidity)}%`;
        windEl.textContent = ` ${Math.round(data.wind.speed)} ${windUnit}`;
        windDirEl.textContent = ` ${degToCompass(data.wind.deg)}`;

        lastCity = data.name;

        //SHOWING THE INFO MAKING VISIBLE THE CONTAINERS
        weatherResult.classList.remove('hidden');
        clearError();

    }catch(error){

        if(error.name === 'AbortError'){
            showError('Request timed out. Check your connection and try again.')
        }else if(String(error.message).includes('Failed to fetch')){
            showError('Network Error. Are you offline?');
        }else {
            showError(error.message || 'Something went wrong.')
        }
        weatherResult.classList.add('hidden');
    }
    finally{
        //Always restore the button
        setGeoLoading(false); 
        clearTimeout(timeoutId);
    }

}
function showError(message){
    errorEl.textContent = message;
    errorContainer.classList.remove('hidden');
}

function clearError(){
    errorEl.textContent = "";
    errorContainer.classList.add('hidden');
}

function setLoading(on){
    if(on){
        searchBtn.disabled=true;
        searchBtn.setAttribute('aria-bussy','true');
        searchBtn.dataset.etiqueta = searchBtn.textContent;
        searchBtn.textContent = "Searching...";
    }else{
        searchBtn.disabled = false;
        searchBtn.removeAttribute('aria-busy');
        searchBtn.textContent = searchBtn.dataset.etiqueta || 'Search';
        delete searchBtn.dataset.etiqueta;
    }
}

function setGeoLoading(on){
    if(on){
        geoBtn.disabled = true;
        geoBtn.setAttribute('aria-bussy','true');
        geoBtn.dataset.etiqueta = geoBtn.textContent;
        geoBtn.textContent = 'Getting location...';
    }else{
        geoBtn.disabled = false;
        geoBtn.removeAttribute('aria-bussy');
        geoBtn.textContent = geoBtn.dataset.etiqueta || 'Use my location';
        delete geoBtn.dataset.etiqueta;
    }
}

function degToCompass(deg){
    const directions = ['North','NorthEast','East','SouthEast','South','SouthWest','West','NorthWest'];
    const index = Math.round(deg/45) %8;
    return directions[index];
}