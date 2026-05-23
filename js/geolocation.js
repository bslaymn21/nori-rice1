/**
 * =====================================================================
 * GEOLOCATION MODULE - Nori & Rice
 * =====================================================================
 * Modern ES6+ module for handling customer location detection
 * with Reverse Geocoding to get actual address names and Maps links
 * =====================================================================
 */

// --- Configuration & State ---
const GeoLocationState = {
    isLoading: false,
    isLocationDetected: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    placeName: null,
    mapsLink: null,
    timestamp: null,
    errorMessage: null
};

// --- Geolocation Error Messages (Arabic) ---
const GeoErrorMessages = {
    'PERMISSION_DENIED': {
        title: '❌ تم رفض إذن الموقع',
        message: 'يرجى تفعيل إذن الموقع من إعدادات المتصفح لتحديد موقعك تلقائياً.'
    },
    'POSITION_UNAVAILABLE': {
        title: '⚠️ الموقع غير متاح',
        message: 'لا يمكن الحصول على معلومات الموقع حالياً. تأكد من تفعيل خدمات الموقع على جهازك.'
    },
    'TIMEOUT': {
        title: '⏱️ انتهت المهلة الزمنية',
        message: 'استغرق تحديد الموقع وقتاً طويلاً. يرجى المحاولة مرة أخرى.'
    },
    'UNKNOWN_ERROR': {
        title: '❌ خطأ غير متوقع',
        message: 'حدث خطأ غير متوقع أثناء تحديد موقعك. يرجى المحاولة مرة أخرى.'
    },
    'GEOCODING_ERROR': {
        title: '⚠️ خطأ في تحديد اسم المكان',
        message: 'تم جلب موقعك لكن فشل تحديد اسم المكان. الرجاء إدخال العنوان يدوياً.'
    }
};

/**
 * ===================================================================
 * REVERSE GEOCODING: Convert Coordinates to Address Name
 * ===================================================================
 * Uses OpenStreetMap Nominatim API (Free, No API Key Required)
 * Gets the actual place name from latitude and longitude
 */
async function reverseGeocodeLocation(latitude, longitude) {
    try {
        // --- Use OpenStreetMap Nominatim API (Free Alternative) ---
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Nori-Rice-App/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding API Error');
        }

        const data = await response.json();
        const address = data.address || {};

        // --- Build comprehensive address string in Arabic context ---
        let placeName = '';

        // Priority: building → road → neighbourhood → city
        if (address.building) {
            placeName += address.building;
        }
        if (address.road) {
            placeName += (placeName ? ', ' : '') + address.road;
        }
        if (address.neighbourhood) {
            placeName += (placeName ? ', ' : '') + address.neighbourhood;
        }
        if (address.suburb) {
            placeName += (placeName ? ', ' : '') + address.suburb;
        }
        if (address.city) {
            placeName += (placeName ? ', ' : '') + address.city;
        }
        if (address.state || address.county) {
            placeName += (placeName ? ', ' : '') + (address.state || address.county);
        }

        // --- Fallback if no detailed address found ---
        if (!placeName && data.display_name) {
            placeName = data.display_name.split(',').slice(0, 3).join(',').trim();
        }

        console.info('✅ Place name detected:', placeName);
        return placeName || null;
    } catch (error) {
        console.warn('⚠️ Reverse Geocoding Error:', error.message);
        return null;
    }
}

/**
 * ===================================================================
 * GENERATE GOOGLE MAPS LINK
 * ===================================================================
 * Creates a shareable Google Maps link with the exact coordinates
 */
function generateMapsLink(latitude, longitude) {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
}

/**
 * ===================================================================
 * MAIN FUNCTION: Detect & Auto-Fill User Location with Place Name
 * ===================================================================
 * - Requests browser permission for geolocation
 * - Fetches latitude & longitude coordinates
 * - Performs Reverse Geocoding to get place name
 * - Auto-fills address field with actual place name
 * - Generates shareable Google Maps link
 * - Shows user-friendly messages in Arabic
 * - Updates UI (button text, color) on success
 */
export async function detectUserLocation() {
    // --- Validation: Check if Geolocation API is supported ---
    if (!navigator.geolocation) {
        showGeoLocationError(
            'UNKNOWN_ERROR',
            'متصفحك لا يدعم ميزة تحديد الموقع. يرجى تحديث المتصفح.'
        );
        return false;
    }

    // --- Set Loading State ---
    setGeoLoadingState(true);
    updateLocationButton(false);

    return new Promise((resolve) => {
        // --- Geolocation Options (HIGH ACCURACY) ---
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        // --- Success Handler ---
        const onSuccess = async (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            setGeoLoadingState(true); // Keep loading while geocoding

            // --- Perform Reverse Geocoding ---
            const placeName = await reverseGeocodeLocation(latitude, longitude);

            if (!placeName) {
                setGeoLoadingState(false);
                showGeoLocationError('GEOCODING_ERROR');
                updateLocationButton(false);
                resolve(false);
                return;
            }

            // --- Generate Google Maps Link ---
            const mapsLink = generateMapsLink(latitude, longitude);

            // --- Store Location Data ---
            GeoLocationState.latitude = latitude;
            GeoLocationState.longitude = longitude;
            GeoLocationState.accuracy = accuracy;
            GeoLocationState.placeName = placeName;
            GeoLocationState.mapsLink = mapsLink;
            GeoLocationState.timestamp = new Date().toISOString();
            GeoLocationState.isLocationDetected = true;
            GeoLocationState.errorMessage = null;

            // --- Update Hidden Inputs ---
            updateHiddenLocationInputs(latitude, longitude, accuracy, placeName, mapsLink);

            // --- Auto-fill Address Field with Place Name ---
            autoFillAddressField(placeName);

            // --- Update Button UI ---
            updateLocationButton(true);

            // --- Show Success Message with Place Name ---
            showLocationSuccessMessage(placeName, latitude, longitude, accuracy);

            // --- Log for debugging ---
            console.info('✅ Location detected successfully:', {
                placeName,
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
                accuracy: `±${accuracy.toFixed(2)}m`,
                mapsLink
            });

            setGeoLoadingState(false);
            resolve(true);
        };

        // --- Error Handler ---
        const onError = (error) => {
            setGeoLoadingState(false);
            GeoLocationState.isLocationDetected = false;
            GeoLocationState.errorMessage = error.message;

            // --- Map Browser Error Code to User-Friendly Message ---
            let errorCode = 'UNKNOWN_ERROR';
            if (error.code === 1) {
                errorCode = 'PERMISSION_DENIED';
            } else if (error.code === 2) {
                errorCode = 'POSITION_UNAVAILABLE';
            } else if (error.code === 3) {
                errorCode = 'TIMEOUT';
            }

            // --- Show Error Notification ---
            showGeoLocationError(errorCode);

            // --- Restore Button to Normal State ---
            updateLocationButton(false);

            // --- Log error ---
            console.warn('⚠️ Geolocation error:', { code: error.code, message: error.message });

            resolve(false);
        };

        // --- Request Location from Browser ---
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    });
}

/**
 * ===================================================================
 * AUTO-FILL ADDRESS FIELD
 * ===================================================================
 * Automatically populates the customer address field with place name
 */
function autoFillAddressField(placeName) {
    const addressInput = document.getElementById('customer-address');
    if (addressInput) {
        addressInput.value = placeName;
        addressInput.setAttribute('data-autofilled', 'true');
        console.info('📍 Address field auto-filled:', placeName);
    }
}

/**
 * ===================================================================
 * UPDATE HIDDEN INPUT FIELDS
 * ===================================================================
 * Automatically populates latitude, longitude, place name, and maps link
 * hidden inputs. These values will be sent with the order to Firebase
 */
function updateHiddenLocationInputs(latitude, longitude, accuracy, placeName, mapsLink) {
    const latitudeInput = document.getElementById('customer-latitude');
    const longitudeInput = document.getElementById('customer-longitude');
    const accuracyInput = document.getElementById('customer-location-accuracy');
    const placeNameInput = document.getElementById('customer-place-name');
    const mapsLinkInput = document.getElementById('customer-maps-link');

    if (latitudeInput) {
        latitudeInput.value = latitude.toString();
        latitudeInput.setAttribute('data-detected', 'true');
    }

    if (longitudeInput) {
        longitudeInput.value = longitude.toString();
        longitudeInput.setAttribute('data-detected', 'true');
    }

    if (accuracyInput) {
        accuracyInput.value = accuracy.toFixed(2);
    }

    if (placeNameInput) {
        placeNameInput.value = placeName;
        placeNameInput.setAttribute('data-detected', 'true');
    }

    if (mapsLinkInput) {
        mapsLinkInput.value = mapsLink;
    }

    console.info('📍 Hidden location inputs updated');
}

/**
 * ===================================================================
 * UPDATE LOCATION BUTTON APPEARANCE
 * ===================================================================
 * - On Success: Change text to "تم تحديد موقعك بنجاح ✅"
 * - On Success: Change background to green (#10b981)
 * - On Loading: Show spinner/disabled state
 * - On Error: Reset to original state
 */
function updateLocationButton(isSuccess) {
    const button = document.getElementById('detect-location-btn');
    if (!button) return;

    if (isSuccess) {
        // --- SUCCESS STATE ---
        button.classList.add('bg-emerald-500');
        button.classList.remove('bg-secondary', 'hover:bg-secondary/80');
        button.innerHTML = `
            <span class="material-symbols-outlined text-lg">check_circle</span>
            <span>تم تحديد موقعك بنجاح ✅</span>
        `;
        button.disabled = true;
        button.setAttribute('data-location-detected', 'true');

        // --- Add Success Animation ---
        button.classList.add('animate-pulse');
        setTimeout(() => button.classList.remove('animate-pulse'), 3000);
    } else {
        // --- NORMAL/ERROR STATE ---
        button.classList.remove('bg-emerald-500', 'animate-pulse');
        button.classList.add('bg-secondary');
        button.innerHTML = `
            <span class="material-symbols-outlined text-lg">location_on</span>
            <span>تحديد موقعي الحالي تلقائياً</span>
        `;
        button.disabled = false;
        button.removeAttribute('data-location-detected');
    }
}

/**
 * ===================================================================
 * SHOW SUCCESS MESSAGE (Toast Notification)
 * ===================================================================
 * Displays a friendly success message with place name and map link
 */
function showLocationSuccessMessage(placeName, latitude, longitude, accuracy) {
    const message = `✅ تم تحديد موقعك بنجاح! تم ملء العنوان تلقائياً. المكان: ${placeName}`;

    if (typeof showToast === 'function') {
        showToast(message, false);
    } else {
        console.info(message);
    }
}

/**
 * ===================================================================
 * SHOW ERROR MESSAGE (Error Notification)
 * ===================================================================
 * Displays user-friendly error messages in Arabic
 */
function showGeoLocationError(errorCode, customMessage = null) {
    const errorData = GeoErrorMessages[errorCode] || GeoErrorMessages['UNKNOWN_ERROR'];
    const finalMessage = customMessage || errorData.message;

    console.error('🚫 GeoLocation Error:', errorData);

    if (typeof showToast === 'function') {
        showToast(`${errorData.title} ${finalMessage}`, true);
    } else {
        console.warn(`${errorData.title} ${finalMessage}`);
    }
}

/**
 * ===================================================================
 * LOADING STATE MANAGEMENT
 * ===================================================================
 */
function setGeoLoadingState(isLoading) {
    GeoLocationState.isLoading = isLoading;
    const button = document.getElementById('detect-location-btn');

    if (isLoading && button) {
        button.disabled = true;
        button.classList.add('opacity-70', 'cursor-wait');
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <span class="material-symbols-outlined text-lg animate-spin">hourglass_empty</span>
            <span>جاري تحديد موقعك...</span>
        `;
        button.setAttribute('data-original-html', originalHTML);
    } else if (!isLoading && button && !GeoLocationState.isLocationDetected) {
        button.disabled = false;
        button.classList.remove('opacity-70', 'cursor-wait');
        const originalHTML = button.getAttribute('data-original-html');
        if (originalHTML) {
            button.innerHTML = originalHTML;
            button.removeAttribute('data-original-html');
        }
    }
}

/**
 * ===================================================================
 * VALIDATE LOCATION DATA
 * ===================================================================
 */
export function isLocationDetected() {
    return (
        GeoLocationState.isLocationDetected &&
        GeoLocationState.latitude !== null &&
        GeoLocationState.longitude !== null &&
        GeoLocationState.placeName !== null
    );
}

/**
 * ===================================================================
 * GET CURRENT LOCATION DATA
 * ===================================================================
 * Returns current stored location including place name and maps link
 */
export function getLocationData() {
    return {
        latitude: GeoLocationState.latitude,
        longitude: GeoLocationState.longitude,
        accuracy: GeoLocationState.accuracy,
        placeName: GeoLocationState.placeName,
        mapsLink: GeoLocationState.mapsLink,
        timestamp: GeoLocationState.timestamp,
        isDetected: GeoLocationState.isLocationDetected
    };
}

/**
 * ===================================================================
 * RESET LOCATION STATE
 * ===================================================================
 */
export function resetLocationState() {
    GeoLocationState.latitude = null;
    GeoLocationState.longitude = null;
    GeoLocationState.accuracy = null;
    GeoLocationState.placeName = null;
    GeoLocationState.mapsLink = null;
    GeoLocationState.timestamp = null;
    GeoLocationState.isLocationDetected = false;
    GeoLocationState.errorMessage = null;
    GeoLocationState.isLoading = false;

    // --- Clear hidden inputs ---
    const latitudeInput = document.getElementById('customer-latitude');
    const longitudeInput = document.getElementById('customer-longitude');
    const accuracyInput = document.getElementById('customer-location-accuracy');
    const placeNameInput = document.getElementById('customer-place-name');
    const mapsLinkInput = document.getElementById('customer-maps-link');

    if (latitudeInput) latitudeInput.value = '';
    if (longitudeInput) longitudeInput.value = '';
    if (accuracyInput) accuracyInput.value = '';
    if (placeNameInput) placeNameInput.value = '';
    if (mapsLinkInput) mapsLinkInput.value = '';

    // --- Reset button ---
    updateLocationButton(false);
}

/**
 * ===================================================================
 * INITIALIZE GEOLOCATION MODULE
 * ===================================================================
 */
export function initializeGeolocationModule() {
    const button = document.getElementById('detect-location-btn');
    if (button && !button.hasAttribute('data-geo-listener')) {
        button.addEventListener('click', () => detectUserLocation());
        button.setAttribute('data-geo-listener', 'true');
        console.info('✅ Geolocation module initialized');
    }
}
