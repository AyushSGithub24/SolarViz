// Solar Irradiation Calculator with Monthly Data

// Constants
const SOLAR_CONSTANT = 1367; // W/m^2
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Calculate day of the year
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// Calculate solar declination
function getSolarDeclination(dayOfYear) {
    return 23.45 * DEG_TO_RAD * Math.sin(((360 / 365) * (dayOfYear - 81)) * DEG_TO_RAD);
}

// Calculate hour angle
function getHourAngle(hours, minutes, longitude, timezone) {
    const solarTime = hours + minutes / 60 + (4 * (longitude - 15 * timezone)) / 60;
    return (solarTime - 12) * 15 * DEG_TO_RAD;
}

// Calculate solar elevation angle
function getSolarElevationAngle(latitude, solarDeclination, hourAngle) {
    return Math.asin(
        Math.sin(latitude * DEG_TO_RAD) * Math.sin(solarDeclination) +
        Math.cos(latitude * DEG_TO_RAD) * Math.cos(solarDeclination) * Math.cos(hourAngle)
    );
}

// Calculate solar irradiation
function getSolarIrradiation(solarElevationAngle) {
    if (solarElevationAngle <= 0) return 0;
    return SOLAR_CONSTANT * Math.sin(solarElevationAngle);
}

// Calculate average daily solar irradiation for a given day
function getAverageDailyIrradiation(latitude, longitude, date) {
    const dayOfYear = getDayOfYear(date);
    const solarDeclination = getSolarDeclination(dayOfYear);
    let totalIrradiation = 0;
    const measurements = 24;

    for (let hour = 0; hour < 24; hour++) {
        const hourAngle = getHourAngle(hour, 0, longitude, 0); // Assuming UTC
        const solarElevationAngle = getSolarElevationAngle(latitude, solarDeclination, hourAngle);
        totalIrradiation += getSolarIrradiation(solarElevationAngle);
    }

    return totalIrradiation / measurements;
}

// Calculate average monthly solar irradiation
function getAverageMonthlyIrradiation(latitude, longitude, year, month) {
    let totalIrradiation = 0;
    const date = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        date.setDate(day);
        totalIrradiation += getAverageDailyIrradiation(latitude, longitude, date);
    }

    return totalIrradiation / daysInMonth;
}

// Calculate monthly solar irradiation for a full year
function getMonthlyIrradiationForYear(latitude, longitude, year) {
    const monthlyData = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];

    for (let month = 0; month < 12; month++) {
        const averageIrradiation = getAverageMonthlyIrradiation(latitude, longitude, year, month);
        monthlyData.push({
            month: monthNames[month],
            irradiation: averageIrradiation
        });
    }

    return monthlyData;
}

// Event listener for the calculate button
document.getElementById('calculateBtn').addEventListener('click', function() {
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const year = new Date().getFullYear();

    if (isNaN(latitude) || isNaN(longitude)) {
        alert('Please enter valid latitude and longitude values.');
        return;
    }

    const monthlyData = getMonthlyIrradiationForYear(latitude, longitude, year);
    displayResults(monthlyData);
});

var map = L.map('map');
var marker;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function updateCoordinates(lat, lng) {
  document.getElementById('lat').textContent = lat.toFixed(6);
  document.getElementById('lng').textContent = lng.toFixed(6);
}

function updateMarker(lat, lng) {
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker([lat, lng]).addTo(map)
    // .bindPopup()
    // .openPopup();
  map.setView([lat, lng], 13);
  updateCoordinates(lat, lng);
}

map.on('click', function(e) {
  updateMarker(e.latlng.lat, e.latlng.lng);
});

const searchInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestions');

searchInput.addEventListener('input', debounce(handleSearch, 300));

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

async function handleSearch() {
  const query = searchInput.value.trim();
  if (query.length < 3) {
    suggestionsList.style.display = 'none';
    return;
  }

  if (isCoordinates(query)) {
    const [lat, lng] = query.split(',').map(coord => parseFloat(coord.trim()));
    updateMarker(lat, lng);
    suggestionsList.style.display = 'none';
  } else {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      displaySuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }
}

function isCoordinates(query) {
  const coordRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
  return coordRegex.test(query);
}

function displaySuggestions(suggestions) {
  suggestionsList.innerHTML = '';
  if (suggestions.length === 0) {
    suggestionsList.style.display = 'none';
    return;
  }

  suggestions.forEach(place => {
    const li = document.createElement('li');
    li.textContent = place.display_name;
    li.addEventListener('click', () => {
      updateMarker(parseFloat(place.lat), parseFloat(place.lon));
      searchInput.value = place.display_name;
      suggestionsList.style.display = 'none';
    });
    suggestionsList.appendChild(li);
  });

  suggestionsList.style.display = 'block';
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    updateMarker(lat, lng);
  }, function () {
    alert("Geolocation is not enabled or permission was denied.");
    updateMarker(51.505, -0.09);
  });
} else {
  alert("Geolocation is not supported by this browser.");
  updateMarker(51.505, -0.09);
}