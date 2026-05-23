/**
 * =====================================================================
 * GEOLOCATION MODULE - Nori & Rice
 * =====================================================================
 * Modern ES6+ module for handling customer location detection
 * and coordinate management (Latitude & Longitude)
 * =====================================================================
 */

// --- Configuration & State ---
const GeoLocationState = {
    isLoading: false,
    isLocationDetected: false,
    latitude: null,
    longitude: null,
    accuracy: null,
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
    }
};

/**
 * ===================================================================
 * MAIN FUNCTION: Detect & Auto-Fill User Location
 * ===================================================================
 * - Requests browser permission for geolocation
 * - Fetches latitude & longitude coordinates
 * - Updates hidden input fields automatically
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
            enableHighAccuracy: true,      // Request high-precision coordinates
            timeout: 10000,                 // 10 seconds timeout
            maximumAge: 0                   // Don't use cached location
        };

        // --- Success Handler ---
        const onSuccess = (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // --- Store Location Data ---
            GeoLocationState.latitude = latitude;
            GeoLocationState.longitude = longitude;
            GeoLocationState.accuracy = accuracy;
            GeoLocationState.timestamp = new Date().toISOString();
            GeoLocationState.isLocationDetected = true;
            GeoLocationState.errorMessage = null;

            // --- Update Hidden Inputs ---
            updateHiddenLocationInputs(latitude, longitude, accuracy);

            // --- Update Button UI ---
            updateLocationButton(true);

            // --- Show Success Message ---
            showLocationSuccessMessage(latitude, longitude, accuracy);

            // --- Log for debugging ---
            console.info('✅ Location detected successfully:', {
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
                accuracy: `±${accuracy.toFixed(2)}m`
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
 * UPDATE HIDDEN INPUT FIELDS
 * ===================================================================
 * Automatically populates latitude and longitude hidden inputs
 * These values will be sent with the order form to Firebase
 */
function updateHiddenLocationInputs(latitude, longitude, accuracy) {
    const latitudeInput = document.getElementById('customer-latitude');
    const longitudeInput = document.getElementById('customer-longitude');
    const accuracyInput = document.getElementById('customer-location-accuracy');

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
 * Displays a friendly success message with location coordinates
 */
function showLocationSuccessMessage(latitude, longitude, accuracy) {
    const message = `
        ✅ تم تحديد موقعك بنجاح!\n
        📍 الإحداثيات: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n
        🎯 دقة التحديد: ±${accuracy.toFixed(2)} متراً
    `;

    // --- Use existing toast system if available ---
    if (typeof showToast === 'function') {
        showToast('✅ تم تحديد موقعك بنجاح! يمكنك الآن إكمال طلبك.', false);
    } else {
        alert(message);
    }
}

/**
 * ===================================================================
 * SHOW ERROR MESSAGE (Error Notification)
 * ===================================================================
 * Displays user-friendly error messages in Arabic
 * with instructions on how to fix the problem
 */
function showGeoLocationError(errorCode, customMessage = null) {
    const errorData = GeoErrorMessages[errorCode] || GeoErrorMessages['UNKNOWN_ERROR'];
    const finalMessage = customMessage || errorData.message;

    console.error('🚫 GeoLocation Error:', errorData);

    // --- Use existing toast system if available ---
    if (typeof showToast === 'function') {
        showToast(`${errorData.title}\n${finalMessage}`, true);
    } else {
        alert(`${errorData.title}\n${finalMessage}`);
    }
}

/**
 * ===================================================================
 * LOADING STATE MANAGEMENT
 * ===================================================================
 * Updates global state to show loading indicator
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
 * Checks if location has been properly detected
 * Returns true if coordinates are valid
 */
export function isLocationDetected() {
    return (
        GeoLocationState.isLocationDetected &&
        GeoLocationState.latitude !== null &&
        GeoLocationState.longitude !== null
    );
}

/**
 * ===================================================================
 * GET CURRENT LOCATION DATA
 * ===================================================================
 * Returns current stored location coordinates
 * Useful for manual validation before form submission
 */
export function getLocationData() {
    return {
        latitude: GeoLocationState.latitude,
        longitude: GeoLocationState.longitude,
        accuracy: GeoLocationState.accuracy,
        timestamp: GeoLocationState.timestamp,
        isDetected: GeoLocationState.isLocationDetected
    };
}

/**
 * ===================================================================
 * RESET LOCATION STATE
 * ===================================================================
 * Clears all stored location data and resets button state
 * Useful for clearing form or allowing re-detection
 */
export function resetLocationState() {
    GeoLocationState.latitude = null;
    GeoLocationState.longitude = null;
    GeoLocationState.accuracy = null;
    GeoLocationState.timestamp = null;
    GeoLocationState.isLocationDetected = false;
    GeoLocationState.errorMessage = null;
    GeoLocationState.isLoading = false;

    // --- Clear hidden inputs ---
    const latitudeInput = document.getElementById('customer-latitude');
    const longitudeInput = document.getElementById('customer-longitude');
    const accuracyInput = document.getElementById('customer-location-accuracy');

    if (latitudeInput) latitudeInput.value = '';
    if (longitudeInput) longitudeInput.value = '';
    if (accuracyInput) accuracyInput.value = '';

    // --- Reset button ---
    updateLocationButton(false);
}

/**
 * ===================================================================
 * INITIALIZE GEOLOCATION MODULE
 * ===================================================================
 * Attaches event listeners to the detection button
 * Called on page load or when customer modal opens
 */
export function initializeGeolocationModule() {
    const button = document.getElementById('detect-location-btn');
    if (button && !button.hasAttribute('data-geo-listener')) {
        button.addEventListener('click', () => detectUserLocation());
        button.setAttribute('data-geo-listener', 'true');
        console.info('✅ Geolocation module initialized');
    }
}
