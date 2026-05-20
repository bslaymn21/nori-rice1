 /**======================================================================
   NORI & RICE - LUXURY SUSHI LOUNGE CORE APPLICATION ENGINE
   ========================================================================== */

import {
    getMenuItems, getCategories, getGlobalSettings, getActiveOffers,
    getAllFeedback, saveFeedback, saveOrder, getCustomerByPhone, saveCustomer, trackVisitor
} from '../database/services.js';

// --- Global Variables & App State ---
let currentLanguage = 'ar'; // Always Arabic
let currentCustomer = JSON.parse(localStorage.getItem('nori_customer') || 'null');
let selectedCategory = 'all';
let cart = JSON.parse(localStorage.getItem('nori_cart') || '[]');
let activeItemForCustomization = null;
let customizationChoices = {
    pieces: 8,
    rice: 'white',
    addons: []
};

// --- Dynamic Admin Integration State ---
let currentMenuItems = [];
let currentCategories = [];
let globalSettings = null; // Store dynamic business settings
let isRestaurantOpen = true; // Global state for working hours
let promoTimerInterval = null;

// --- Shoppable 3D Flipbook State ---
let currentMenuMode = 'book';
let currentFlipbookPage = 1;
let maxFlipbookPages = 4;

// WhatsApp Contact (You can change it dynamically)
let RESTAURANT_WHATSAPP = "201012345678"; // Representative restaurant phone

// --- Category Unsplash Mapping (Ultra-Premium Visuals) ---
const categoryImages = {
    specialrolls: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=120&q=80",
    nigiri: "https://images.unsplash.com/photo-1633478062482-790e3b5dd810?auto=format&fit=crop&w=120&q=80",
    sashimi: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80",
    temaki: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=120&q=80",
    appetizers: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=120&q=80",
    drinks: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=120&q=80"
};

// --- Egypt Phone Formatting Helper logic ---
function formatPhoneNumber(phone) {
    if (!phone) return '';
    let trimmed = phone.trim();
    if (trimmed.startsWith('+2')) {
        return trimmed;
    }
    if (trimmed.startsWith('2')) {
        return '+' + trimmed;
    }
    if (trimmed.startsWith('0')) {
        return '+2' + trimmed;
    }
    return '+20' + trimmed;
}

// --- Cloudinary Quality & Format Auto-Optimization Helper ---
function optimizeCloudinaryUrl(url, width = 800) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width}/`);
    }
    return url;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Attach Global Window Bindings for inline HTML handlers
    window.switchView = switchView;
    window.toggleLanguage = toggleLanguage;
    window.toggleCart = toggleCart;
    window.setMenuMode = setMenuMode;
    window.flipbookPrevPage = flipbookPrevPage;
    window.flipbookNextPage = flipbookNextPage;
    window.openCustomizer = openCustomizer;
    window.addToOrderSimple = addToOrderSimple;
    window.openCustomerModal = openCustomerModal;
    window.closeCustomerModal = closeCustomerModal;
    window.submitNewComment = submitNewComment;
    window.setCommentRating = setCommentRating;
    window.closeCustomizer = closeCustomizer;
    window.sendCartOrderWhatsApp = sendCartOrderWhatsApp;
    window.selectCategory = selectCategory;
    window.slideCustomizerGallery = slideCustomizerGallery;
    window.selectCustomizerPiece = selectCustomizerPiece;
    window.selectCustomizerSize = selectCustomizerSize;
    window.selectCustomizerMethod = selectCustomizerMethod;
    window.toggleCustomizerAddon = toggleCustomizerAddon;
    window.addCustomizedToCart = addCustomizedToCart;
    window.adjustCartQty = adjustCartQty;
    window.closeUpsellModal = closeUpsellModal;
    window.openCartDrawerFromUpsell = openCartDrawerFromUpsell;
    window.triggerUpsellModal = triggerUpsellModal;
    window.closePromoModal = closePromoModal;

    // Load Dynamic Admin Data from Firebase
    try {
        const [menuItems, cats, settings, feed, offers] = await Promise.all([
            getMenuItems(),
            getCategories(),
            getGlobalSettings(),
            getAllFeedback(),
            getActiveOffers()
        ]);
        
        if (menuItems) {
            currentMenuItems = menuItems;
        }
        if (cats) {
            currentCategories = cats;
        }
        if (settings) {
            globalSettings = settings;
            if (settings.whatsapp) RESTAURANT_WHATSAPP = settings.whatsapp;
            if (settings.phone) {
                document.querySelectorAll('a[href^="tel:"]').forEach(el => el.href = `tel:${settings.phone}`);
                const contactPhone = document.getElementById('contact-phone');
                if (contactPhone) contactPhone.innerText = settings.phone;
            }
            if (settings.social_fb) {
                document.querySelectorAll('a[href*="facebook.com"]').forEach(el => el.href = settings.social_fb);
            }
            loadCustomerFromStorage();
            if (settings.social_insta) {
                document.querySelectorAll('a[href*="instagram.com"]').forEach(el => el.href = settings.social_insta);
            }
            if (settings.social_tiktok) {
                document.querySelectorAll('a[href*="tiktok.com"]').forEach(el => el.href = settings.social_tiktok);
            }
            if (typeof translations !== 'undefined') {
                if (settings.address_ar && translations.ar) translations.ar.address_value = settings.address_ar;
                if (settings.address_en && translations.en) translations.en.address_value = settings.address_en;
                if (settings.hours_ar && translations.ar) translations.ar.hours_value = settings.hours_ar;
                if (settings.hours_en && translations.en) translations.en.hours_value = settings.hours_en;
                applyLanguage(currentLanguage); // Actually render the loaded settings into the HTML
            }
        }
        if (feed && feed.length > 0) {
            const approvedFeed = feed.filter(f => f.showOnHome !== false).map(f => ({
                name: f.name || 'زائر كريم',
                name_en: f.name || 'Valued Guest',
                text: f.text || '',
                text_en: f.text || '',
                date: f.createdAt ? f.createdAt.split('T')[0] : '2026-05-18',
                rating: f.rating || 5
            }));
            if (approvedFeed.length > 0) {
                guestComments = approvedFeed;
                localStorage.setItem('nori_comments', JSON.stringify(guestComments));
            }
        }
        
        // Check for Promo Offers
        if (offers && offers.length > 0) {
            displayPromoOffer(offers[0]);
        }

        trackVisitor();
    } catch(e) {
        console.error("Error loading dynamic admin data:", e);
    }

    // Establish initial language settings
    applyLanguage(currentLanguage);

    // Initialize standard events
    initEvents();

    // Render dynamic Category Slider
    renderCategories();

    // Render Menu Items
    renderMenu();

    // Initialize 3D Flipbook state
    updateFlipbook();
    initFlipbookSwipes();

    // Set default menu mode by screen size
    const defaultMenuMode = window.innerWidth >= 768 ? 'book' : 'grid';
    setMenuMode(defaultMenuMode);

    window.addEventListener('resize', () => {
        const responsiveMode = window.innerWidth >= 768 ? 'book' : 'grid';
        if (responsiveMode !== currentMenuMode) {
            setMenuMode(responsiveMode);
        }
    });

    // Check Restaurant Working Hours
    checkRestaurantStatus();

    // Update Cart Badge and UI
    updateCartUI();
});

// --- Promo Offer Popup Logic ---
function displayPromoOffer(offer) {
    if (!offer) return;
    if (offer.expiryDate) {
        const initialDistance = new Date(offer.expiryDate).getTime() - Date.now();
        if (initialDistance <= 0) return; // Already expired, do not display!
    }
    const promoModal = document.getElementById('promo-modal');
    if (!promoModal) return;

    const titleEl = document.getElementById('promo-title');
    const imgEl = document.getElementById('promo-img');
    const newPriceEl = document.getElementById('promo-new-price');
    
    if (titleEl) titleEl.innerText = offer.title;
    if (imgEl) imgEl.src = offer.imageUrl;
    if (newPriceEl) newPriceEl.innerText = `${offer.newPrice} ج.م`;
    
    const oldPriceEl = document.getElementById('promo-old-price');
    const oldPriceContainer = document.getElementById('promo-old-price-container');
    if (offer.oldPrice && oldPriceEl && oldPriceContainer) {
        oldPriceEl.innerText = `${offer.oldPrice} ج.م`;
        oldPriceContainer.classList.remove('hidden');
    } else if (oldPriceContainer) {
        oldPriceContainer.classList.add('hidden');
    }

    const btnTextEl = document.getElementById('promo-btn-text');
    if (btnTextEl) {
        btnTextEl.innerText = offer.btnText || 'اطلب العرض الآن';
    }

    const descriptionEl = document.getElementById('promo-description');
    if (descriptionEl) {
        descriptionEl.innerText = offer.description || 'استغل العرض الحصري قبل انتهاء المهلة واحصل على أفضل تجربة سوشي مميزة.';
    }

    const actionBtn = document.getElementById('promo-action-btn');
    if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.classList.remove('bg-slate-500', 'cursor-not-allowed');
        actionBtn.classList.add('bg-primary');
        actionBtn.onclick = () => {
            if (offer.itemId) {
                openCustomizer(offer.itemId);
                closePromoModal();
            } else {
                // Default to WhatsApp
                const msg = `أود الاستفسار عن عرض: ${offer.title}`;
                window.open(`https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
            }
        };
    }

    // Start countdown timer if expiry is defined
    const timerTextEl = document.getElementById('promo-timer-text');
    const timerContainer = document.getElementById('promo-timer');
    if (offer.expiryDate) {
        if (promoTimerInterval) clearInterval(promoTimerInterval);
        if (timerContainer) {
            timerContainer.classList.remove('hidden');
            timerContainer.classList.remove('bg-slate-700', 'text-slate-200');
            timerContainer.classList.add('bg-red-600', 'text-white');
        }
        const actionBtn = document.getElementById('promo-action-btn');

        const updateTimer = () => {
            const now = Date.now();
            const distance = new Date(offer.expiryDate).getTime() - now;
            if (distance <= 0) {
                if (timerTextEl) timerTextEl.innerText = 'انتهى العرض';
                if (timerContainer) {
                    timerContainer.classList.remove('bg-red-600', 'text-white');
                    timerContainer.classList.add('bg-slate-700', 'text-slate-200');
                }
                if (actionBtn) {
                    actionBtn.disabled = true;
                    const btnTextEl = document.getElementById('promo-btn-text');
                    if (btnTextEl) btnTextEl.innerText = 'العرض انتهى';
                    actionBtn.classList.add('bg-slate-500', 'cursor-not-allowed');
                }
                closePromoModal(); // Hide the promo modal completely from home page
                clearInterval(promoTimerInterval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            const formatted = `${days > 0 ? days + 'ي ' : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            if (timerTextEl) timerTextEl.innerText = `ينتهي خلال ${formatted}`;
        };

        updateTimer();
        promoTimerInterval = setInterval(updateTimer, 1000);
    } else {
        if (timerContainer) {
            timerContainer.classList.add('hidden');
        }
        if (promoTimerInterval) {
            clearInterval(promoTimerInterval);
            promoTimerInterval = null;
        }
    }

    // Show after a small delay
    setTimeout(() => {
        promoModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }, 1500);
}

function closePromoModal() {
    const promoModal = document.getElementById('promo-modal');
    if (promoModal) {
        promoModal.classList.add('hidden');
        document.body.style.overflow = '';
        if (promoTimerInterval) {
            clearInterval(promoTimerInterval);
            promoTimerInterval = null;
        }
    }
}

// --- Working Hours Logic ---
function checkRestaurantStatus() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = (currentHour * 60) + currentMinutes;
    
    // Default fallback: 12:00 PM to 02:00 AM
    let startMinutes = 12 * 60; // 12:00 PM
    let endMinutes = 2 * 60;   // 02:00 AM

    if (globalSettings && globalSettings.startTime && globalSettings.endTime) {
        const [startH, startM] = globalSettings.startTime.split(':').map(Number);
        const [endH, endM] = globalSettings.endTime.split(':').map(Number);
        startMinutes = (startH * 60) + startM;
        endMinutes = (endH * 60) + endM;
    }

    // Logic for cross-midnight working hours
    if (startMinutes < endMinutes) {
        // Normal shift (e.g., 09:00 to 17:00)
        isRestaurantOpen = (currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes);
    } else {
        // Midnight crossing shift (e.g., 12:00 to 02:00)
        isRestaurantOpen = (currentTimeInMinutes >= startMinutes || currentTimeInMinutes < endMinutes);
    }

    updateClosedNotificationVisibility();

    // Always allow ordering even if closed (per user request)
    // Re-render menu to update states
    renderMenu();
    renderDynamicFlipbook();
}

function updateClosedNotificationVisibility() {
    const notification = document.getElementById('closed-notification');
    const drawer = document.getElementById('cart-drawer');
    if (!notification) return;

    const isCartOpen = drawer && drawer.classList.contains('open');
    if (!isRestaurantOpen && !isCartOpen) {
        notification.classList.remove('hidden');
    } else {
        notification.classList.add('hidden');
    }
}

// --- General Event Listeners ---
function initEvents() {
    // Nav Bar Click scrolls smoothly
    document.querySelectorAll('[data-scroll-to]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = el.getAttribute('data-scroll-to');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Flipbook arrow buttons
    const flipbookPrevButton = document.getElementById('flipbook-prev-button');
    const flipbookNextButton = document.getElementById('flipbook-next-button');
    if (flipbookPrevButton) {
        flipbookPrevButton.addEventListener('click', flipbookPrevPage);
    }
    if (flipbookNextButton) {
        flipbookNextButton.addEventListener('click', flipbookNextPage);
    }
}

// --- Remove Translation System ---
const lang = 'ar';

function toggleLanguage() {
    // Logic removed - Arabic only
}

function applyLanguage(l) {
    // Always apply Arabic regardless of input
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-mode');
    document.body.classList.remove('lang-en');
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations['ar'][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations['ar'][key];
            } else {
                el.innerHTML = translations['ar'][key];
            }
        }
    });

    renderDynamicFlipbook();
}

// --- Categories Render System ---
function renderCategories() {
    const categoryContainer = document.getElementById('category-track');
    if (!categoryContainer) return;

    const lang = currentLanguage;

    // Build the list dynamically from currentCategories, always including 'all'
    let uniqueCats = [{ id: 'all', name: translations[lang]['filter_all'] || 'الكل', dbName: 'all' }];
    
    if (currentCategories && currentCategories.length > 0) {
        currentCategories.forEach(cat => {
            // Check if there is translation for this category ID/name (e.g. specialrolls)
            let catName = cat.name;
            if (translations[lang][`filter_${cat.id}`]) {
                catName = translations[lang][`filter_${cat.id}`];
            } else if (translations[lang][`filter_${cat.name}`]) {
                catName = translations[lang][`filter_${cat.name}`];
            }
            uniqueCats.push({
                id: cat.id,
                name: catName,
                dbName: cat.name, // to match against item.category if saved as name
                image: cat.image
            });
        });
    }

    let html = '';
    uniqueCats.forEach(cat => {
        const isSelected = selectedCategory === cat.dbName || (selectedCategory === 'all' && cat.dbName === 'all');
        const imgUrl = cat.image 
            ? optimizeCloudinaryUrl(cat.image, 400) 
            : (categoryImages[cat.id] || categoryImages[cat.dbName] || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=120&q=80");

        let bubbleContent = '';
        if (cat.id === 'all') {
            // Render text in the bubble instead of an image
            bubbleContent = `<div class="w-full h-full rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-xs">${cat.name}</div>`;
        } else {
            bubbleContent = `<img src="${imgUrl}" alt="${cat.name}">`;
        }

        html += `
            <div class="category-card ${isSelected ? 'active' : ''}" onclick="selectCategory('${cat.dbName}')">
                <div class="category-img-wrapper">
                    ${bubbleContent}
                </div>
                <span class="category-title">${cat.id === 'all' ? '' : cat.name}</span>
            </div>
        `;
    });

    categoryContainer.innerHTML = html;
}

function selectCategory(cat) {
    selectedCategory = cat;

    // Update visual category cards active state
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });

    renderCategories();
    renderMenu();

    // Smoothly scroll down to menu section
    const menuSection = document.getElementById('menu-section');
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- Menu Rendering System ---
function renderMenu() {
    const menuContainer = document.getElementById('menu-items-grid');
    if (!menuContainer) return;

    const lang = currentLanguage;
    const currency = translations[lang].price_currency;
    const startsFrom = translations[lang].price_starting;

    let filteredItems = currentMenuItems;
    if (selectedCategory !== 'all') {
        filteredItems = currentMenuItems.filter(item => item.category === selectedCategory);
    }

    if (filteredItems.length === 0) {
        menuContainer.innerHTML = `
            <div class="col-span-full text-center py-16 opacity-50">
                <span class="material-symbols-outlined text-6xl mb-4">sentiment_dissatisfied</span>
                <p class="text-lg">No dishes found in this category.</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredItems.forEach(item => {
        const name = lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
        const desc = lang === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.description_ar);
        const orderText = translations[lang].ordered_count.replace('{n}', item.timesOrdered || '40');

        // Check dynamic tags
        let tagsHtml = '';
        if (item.isPopular) {
            tagsHtml += `<span class="px-3.5 py-1.5 bg-[#0b272a] text-[#d4a17b] border border-[#d4a17b]/40 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg backdrop-blur-md"><span class="material-symbols-outlined text-[14px]">star</span>${translations[lang].tag_bestseller}</span>`;
        }
        if (item.isSpecial) {
            tagsHtml += `<span class="px-3.5 py-1.5 bg-[#0b272a] text-[#c18c64] border border-[#c18c64]/40 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg backdrop-blur-md"><span class="material-symbols-outlined text-[14px]">local_fire_department</span>${translations[lang].tag_special}</span>`;
        }

        // Check if there is discount (Floating Price Tag on Top Left)
        let priceHtml = '';
        if (item.oldPrice) {
            priceHtml = `
                <div class="absolute top-4 left-4 bg-[#c18c64] text-[#0b272a] px-4 py-2 font-black border-2 border-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] text-xl rounded-xl flex items-center gap-2 z-10">
                    <span class="line-through opacity-60 text-xs mr-1">${item.oldPrice} ${currency}</span>
                    <span>${item.price} <span class="text-xs font-bold">${currency}</span></span>
                </div>
            `;
        } else {
            priceHtml = `
                <div class="absolute top-4 left-4 bg-[#c18c64] text-[#0b272a] px-4 py-2 font-black border-2 border-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] text-xl rounded-xl flex items-center gap-2 z-10">
                    <span>${item.price} <span class="text-xs font-bold">${currency}</span></span>
                </div>
            `;
        }

        const buttonText = item.options ? translations[lang].btn_customize : (lang === 'ar' ? 'عرض التفاصيل' : 'View Details');
        const buttonIcon = item.options ? 'tune' : 'visibility';
        const safeItemId = String(item.id).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const buttonAction = `openCustomizer('${safeItemId}')`;

        // Check for featured badge
        const featuredBadge = item.featured ? `
            <div class="absolute top-4 right-4 z-20 animate-pulse-slow">
                <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-[#0b272a] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-amber-400/30 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">star</span>
                    <span>مميز</span>
                </div>
            </div>
        ` : '';

        html += `
            <div class="bg-[#132f34] border-2 border-[#d4a17b]/40 rounded-3xl overflow-hidden flex flex-col group animate-slide-up shadow-[6px_6px_0px_0px_#d4a17b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-300 cursor-pointer">
                <!-- Thumbnail (No Dark Overlay for Vivid Food Display) -->
                <div class="relative aspect-[4/3] overflow-hidden cursor-pointer bg-[#0b272a]" onclick="${buttonAction}">
                    ${featuredBadge}
                    <img src="${optimizeCloudinaryUrl(item.images[0], 600)}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    
                    <!-- Floating Price Tag (Top Left) -->
                    ${priceHtml}
                    
                    <!-- Overlay Top Badges (Top Right) -->
                    <div class="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
                        ${tagsHtml}
                    </div>
                </div>
                
                <!-- Content -->
                <div class="p-6 flex-grow flex flex-col justify-between bg-[#132f34]">
                    <div>
                        <div class="flex justify-between items-start gap-2 mb-3">
                            <h3 class="text-2xl font-black text-white group-hover:text-primary transition-colors leading-tight">${name}</h3>
                            <span class="text-[10px] bg-[#0b272a] text-[#d4a17b] px-3 py-1 font-black border border-[#d4a17b]/40 rounded-lg shadow-sm uppercase flex-shrink-0">${item.category}</span>
                        </div>
                        <p class="text-sm text-slate-300 line-clamp-2 mb-4 leading-relaxed">${desc}</p>
                        
                        <!-- Popular ordering tracker info -->
                        <div class="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                            <span class="material-symbols-outlined text-[14px]">visibility</span>
                            <span>${orderText}</span>
                        </div>
                    </div>
                    
                    <!-- Full Width Prominent Button (Matching two.html) -->
                    <button onclick="event.stopPropagation(); ${buttonAction}" class="mt-auto w-full bg-primary text-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 font-black py-4 border-2 border-[#0b272a] transition-all uppercase rounded-2xl flex items-center justify-center gap-2 text-base">
                        <span class="material-symbols-outlined font-black text-lg">${buttonIcon}</span>
                        <span>${buttonText}</span>
                    </button>
                </div>
            </div>
        `;
    });

    menuContainer.innerHTML = html;
}

// --- Simple Item Add ---
function addToOrderSimple(itemId) {
    const item = currentMenuItems.find(i => i.id === itemId) || (typeof sushiMenu !== 'undefined' ? sushiMenu.find(i => i.id === itemId) : null);
    if (!item) return;

    const cartItem = {
        cartId: Date.now().toString(),
        id: item.id,
        name: currentLanguage === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar),
        price: item.price,
        quantity: 1,
        image: item.images[0],
        customizations: null
    };

    cart.push(cartItem);
    saveCart();
    updateCartUI();
    const resolvedName = currentLanguage === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
    showToast(currentLanguage === 'ar' ? `تم إضافة ${resolvedName} إلى السلة 🍣` : `Added ${resolvedName} to basket 🍣`);

    // Check if the item added is a drink or a sauce.
    // If it's a main sushi item, trigger the beautiful upsell popup!
    const category = (item.category || '').toLowerCase();
    const nameAr = (item.name_ar || '').toLowerCase();
    const nameEn = (item.name || '').toLowerCase();
    
    const isDrinkOrSauce = ['drinks', 'beverages', 'sauces'].includes(category) || 
                          ['صوص', 'sauce', 'بيبسي', 'pepsi', 'كولا', 'cola', 'مياه', 'water', 'سفن', '7up', 'سبرايت', 'sprite', 'ثومية', 'مايونيز', 'mayo'].some(kw => nameAr.includes(kw) || nameEn.includes(kw));

    if (!isDrinkOrSauce) {
        triggerUpsellModal(item);
    } else {
        toggleCart(true); // If they added a drink/sauce, just show the cart directly
    }
}

// --- Customizer modal System ---
function openCustomizer(itemId, preserveChoices = false, isUpdateOnly = false) {
    const item = currentMenuItems.find(i => i.id === itemId) || (typeof sushiMenu !== 'undefined' ? sushiMenu.find(i => i.id === itemId) : null);
    if (!item) return;

    // Record current scroll position of the customizer content if it's an update
    let currentScroll = 0;
    const scrollContainer = document.querySelector('#customizer-modal .md\\:w-\\[55\\%\\]');
    if (isUpdateOnly && scrollContainer) {
        currentScroll = scrollContainer.scrollTop;
    } else if (isUpdateOnly) {
        // Fallback for mobile/single column
        const mobileScrollContainer = document.querySelector('#customizer-content > div > div:last-child');
        if (mobileScrollContainer) currentScroll = mobileScrollContainer.scrollTop;
    }

    activeItemForCustomization = item;

    // Reset choices only on first open
    if (!preserveChoices) {
        customizationChoices = {
            pieces: item.options?.pieces ? item.options.pieces[0] : 8,
            addons: [],
            size: item.options?.sizes?.length ? (typeof item.options.sizes[0] === 'string' ? item.options.sizes[0] : item.options.sizes[0].name) : null,
            method: item.options?.methods?.length ? (typeof item.options.methods[0] === 'string' ? item.options.methods[0] : item.options.methods[0].name) : null
        };
    }

    const lang = currentLanguage;
    const modalOverlay = document.getElementById('customizer-modal');
    const container = document.getElementById('customizer-content');

    if (!modalOverlay || !container) return;

    const name = lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
    const desc = lang === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.description_ar);
    
    // Dynamic ingredients from Admin (ingredients_ar)
    const ingredientText = lang === 'ar' ? (item.ingredients_ar || item.ingredients) : (item.ingredients_en || item.ingredients);

    // 1. Piece options selector
    let piecesHtml = '';
    if (item.options?.pieces) {
        piecesHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].piece_count}</label>
                <div class="flex gap-3 flex-wrap">
                    ${item.options.pieces.map(pcs => `
                        <button onclick="selectCustomizerPiece(${pcs})" id="btn-pcs-${pcs}" class="flex-1 min-w-[90px] py-3 px-4 border-2 border-[#d4a17b]/40 rounded-2xl font-black text-sm text-center transition-all ${customizationChoices.pieces === pcs ? 'customizer-btn-active' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
                            ${pcs} ${translations[lang].pieces}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let sizesHtml = '';
    if (item.options?.sizes?.length) {
        sizesHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].size_options_title}</label>
                <div class="flex gap-3 flex-wrap">
                    ${item.options.sizes.map(sizeObj => {
                        const sizeName = typeof sizeObj === 'string' ? sizeObj : sizeObj.name;
                        const sizePrice = typeof sizeObj === 'object' ? sizeObj.price : null;
                        const safeSizeName = sizeName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `
                            <button onclick="selectCustomizerSize('${safeSizeName}')" id="btn-size-${sizeName.replace(/[^a-zA-Z0-9_-]/g, '_')}" class="flex-1 min-w-[110px] py-3 px-4 border-2 border-[#d4a17b]/40 rounded-2xl font-black text-sm text-center transition-all ${customizationChoices.size === sizeName ? 'customizer-btn-active' : 'bg-[#0b272a] text-slate-300 hover:border-secondary'}">
                                <div class="flex flex-col gap-1">
                                    <span>${sizeName}</span>
                                    ${sizePrice != null ? `<span class="text-[11px] font-black text-[#d4a17b]">${sizePrice} ${translations[lang].price_currency}</span>` : ''}
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    let methodsHtml = '';
    if (item.options?.methods?.length) {
        methodsHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].cooking_methods_title}</label>
                <div class="flex gap-3 flex-wrap">
                    ${item.options.methods.map(methodObj => {
                        const methodName = typeof methodObj === 'string' ? methodObj : methodObj.name;
                        const methodPrice = typeof methodObj === 'object' ? methodObj.price : null;
                        const safeMethodName = methodName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `
                            <button onclick="selectCustomizerMethod('${safeMethodName}')" id="btn-method-${methodName.replace(/[^a-zA-Z0-9_-]/g, '_')}" class="flex-1 min-w-[120px] py-3 px-4 border-2 border-[#d4a17b]/40 rounded-2xl font-black text-sm text-center transition-all ${customizationChoices.method === methodName ? 'customizer-btn-active' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
                                <div class="flex flex-col gap-1">
                                    <span>${methodName}</span>
                                    ${methodPrice != null ? `<span class="text-[11px] font-black text-secondary">+${methodPrice} ${translations[lang].price_currency}</span>` : `<span class="text-[11px] opacity-70">${translations[lang].free_label || ''}</span>`}
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    let addonsHtml = '';
    const addonOptions = item.options?.addons?.length ? item.options.addons : [
        { key: 'creamcheese', label: translations[lang].addon_creamcheese, price: 20 },
        { key: 'avocado', label: translations[lang].addon_avocado, price: 15 },
        { key: 'tempura', label: translations[lang].addon_tempura, price: 10 },
        { key: 'spicymayo', label: translations[lang].addon_spicymayo, price: 10 },
        { key: 'caviar', label: translations[lang].addon_caviar, price: 40 }
    ];

    if (addonOptions.length) {
        addonsHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].addons_title}</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${addonOptions.map(addon => {
                        const addonKey = typeof addon === 'string' ? addon : (addon.key || addon.name);
                        const addonLabel = typeof addon === 'string' ? (translations[lang][`addon_${addon}`] || addon) : (addon.label || addon.name);
                        const addonPrice = typeof addon === 'object' ? addon.price : null;
                        const safeAddonKey = String(addonKey).replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `
                            <button onclick="toggleCustomizerAddon('${safeAddonKey}')" id="card-addon-${addonKey.replace(/[^a-zA-Z0-9_-]/g, '_')}" class="flex items-center justify-between p-4 border-2 border-[#d4a17b]/40 rounded-2xl cursor-pointer transition-all ${customizationChoices.addons.includes(addonKey) ? 'customizer-btn-active' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
                                <span class="text-sm font-black">${addonLabel}</span>
                                ${addonPrice != null ? `<span class="text-xs font-black text-[#d4a17b]">+${addonPrice} ${translations[lang].price_currency}</span>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 2. Rice Type selector
    const riceOptions = [
        { key: 'white', label: translations[lang].rice_white, surcharge: 0 },
        { key: 'brown', label: translations[lang].rice_brown, surcharge: 15 },
        { key: 'black', label: translations[lang].rice_black, surcharge: 25 }
    ];

    const riceHtml = `
        <div class="mb-6">
            <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].rice_type}</label>
            <div class="flex flex-col gap-3">
                ${riceOptions.map(opt => `
                    <div onclick="selectCustomizerRice('${opt.key}')" id="card-rice-${opt.key}" class="flex items-center justify-between p-4 border-2 border-[#d4a17b]/40 rounded-2xl cursor-pointer transition-all ${customizationChoices.rice === opt.key ? 'customizer-btn-active' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-lg">${customizationChoices.rice === opt.key ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                            <span class="text-sm font-black">${opt.label}</span>
                        </div>
                        ${opt.surcharge > 0 ? `<span class="text-xs font-black text-primary">+${opt.surcharge} ${translations[lang].price_currency}</span>` : `<span class="text-xs font-black opacity-60">مجاناً</span>`}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="flex flex-col md:flex-row min-h-[500px] max-h-[90vh] bg-[#132f34] border-2 border-[#d4a17b]/40 rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_#d4a17b]">
            <!-- Image Gallery Slider (Left side - No Dark Overlay for Vivid Food Display) -->
            <div class="md:w-[45%] relative h-64 md:h-auto overflow-hidden group/gallery flex-shrink-0 bg-[#0b272a]">
                 <div id="customizer-gallery-slider" class="flex w-full h-full overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar">
                    ${item.images.map(img => `
                        <div class="w-full h-full flex-shrink-0 snap-center">
                            <img class="w-full h-full object-cover" src="${optimizeCloudinaryUrl(img, 800)}" alt="${name}">
                        </div>
                    `).join('')}
                 </div>
                 
                 <!-- Navigation Buttons (Desktop) -->
                 ${item.images.length > 1 ? `
                 <div class="hidden md:flex absolute inset-0 items-center justify-between px-4 pointer-events-none">
                    <button onclick="slideCustomizerGallery(-1)" class="w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                    <button onclick="slideCustomizerGallery(1)" class="w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                 </div>
                 ` : ''}
                 
                 <!-- Mobile Close Button -->
                 <button onclick="closeCustomizer()" class="md:hidden absolute top-4 right-4 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md z-20">
                    <span class="material-symbols-outlined">close</span>
                 </button>
            </div>
            
            <!-- Details & Customizer controls (Right side) -->
            <div class="md:w-[55%] p-6 md:p-10 flex flex-col justify-between overflow-y-auto no-scrollbar bg-[#132f34]">
                <div>
                     <!-- Desktop Close Button -->
                     <div class="hidden md:flex justify-end mb-4">
                        <button onclick="closeCustomizer()" class="text-slate-400 hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-2xl">close</span>
                        </button>
                     </div>
                     
                     <h2 class="text-2xl md:text-3xl font-bold text-primary mb-2">${name}</h2>
                     <p class="text-sm text-slate-300 mb-4 leading-relaxed">${desc}</p>
                     ${ingredientText ? `<p class="text-xs text-slate-400 mb-8 border-b border-white/5 pb-4"><span class="text-primary font-bold">${lang === 'ar' ? 'المكونات' : 'Ingredients'}:</span> ${ingredientText}</p>` : `<p class="text-xs text-slate-400 mb-8 border-b border-white/5 pb-4"><span class="text-primary font-bold">${lang === 'ar' ? 'المكونات' : 'Ingredients'}:</span> ${lang === 'ar' ? 'سوشي ممتاز محضر بعناية ومكونات طازجة.' : 'Premium sushi crafted with care and fresh ingredients.'}</p>`}

                     <div class="space-y-6">
                        ${piecesHtml}
                        ${sizesHtml}
                        ${methodsHtml}
                        ${addonsHtml}
                     </div>
                </div>
                
                <!-- Bottom computation & Add to Cart -->
                <div class="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/5 pt-6">
                    <div class="flex flex-col w-full sm:w-auto text-center sm:text-right">
                        <span class="text-xs text-slate-400 uppercase tracking-widest font-bold">${translations[lang].cart_total}</span>
                        <span id="customizer-computed-price" class="text-3xl font-black text-secondary">0 ${translations[lang].price_currency}</span>
                    </div>
                    
                    <button onclick="addCustomizedToCart()" class="w-full sm:w-2/3 bg-primary text-[#0b272a] font-black py-4 border-2 border-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase rounded-2xl flex items-center justify-center gap-2 text-base">
                        <span class="material-symbols-outlined font-black text-lg">add_shopping_cart</span>
                        <span>${translations[lang].btn_add_to_cart}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateCustomizerPrice();

    // Restore scroll position if it's an update
    if (isUpdateOnly && currentScroll > 0) {
        const newScrollContainer = document.querySelector('#customizer-modal .md\\:w-\\[55\\%\\]');
        const mobileScrollContainer = document.querySelector('#customizer-content > div > div:last-child');
        
        if (newScrollContainer) {
            newScrollContainer.scrollTop = currentScroll;
        }
        if (mobileScrollContainer) {
            mobileScrollContainer.scrollTop = currentScroll;
        }
    }
}

function closeCustomizer() {
    document.getElementById('customizer-modal').classList.remove('active');
    document.body.style.overflow = '';
    activeItemForCustomization = null;
}

function slideCustomizerGallery(direction) {
    const slider = document.getElementById('customizer-gallery-slider');
    if (!slider) return;
    const width = slider.offsetWidth;
    slider.scrollBy({ left: direction * width, behavior: 'smooth' });
}

function selectCustomizerPiece(pcs) {
    customizationChoices.pieces = pcs;
    openCustomizer(activeItemForCustomization.id, true, true);
}

function selectCustomizerSize(sizeName) {
    customizationChoices.size = sizeName;
    openCustomizer(activeItemForCustomization.id, true, true);
}

function selectCustomizerMethod(methodName) {
    customizationChoices.method = methodName;
    openCustomizer(activeItemForCustomization.id, true, true);
}

function toggleCustomizerAddon(addonKey) {
    const idx = customizationChoices.addons.indexOf(addonKey);
    if (idx > -1) {
        customizationChoices.addons.splice(idx, 1);
    } else {
        customizationChoices.addons.push(addonKey);
    }
    openCustomizer(activeItemForCustomization.id, true, true);
}

function updateCustomizerPrice() {
    if (!activeItemForCustomization) return;

    const item = activeItemForCustomization;

    // Base calculations
    let basePrice = item.price;

    if (item.options?.sizes?.length && customizationChoices.size) {
        const selectedSize = item.options.sizes.find(sz => (typeof sz === 'string' ? sz : sz.name) === customizationChoices.size);
        if (selectedSize && typeof selectedSize === 'object' && selectedSize.price != null) {
            basePrice = selectedSize.price;
        }
    } else if (item.options?.pieces && item.options.pieceMultiplier) {
        const multiplier = item.options.pieceMultiplier[customizationChoices.pieces] || 1.0;
        basePrice = Math.round(basePrice * multiplier);
    }

    // Surcharges for Cooking Method
    let methodSurcharge = 0;
    if (item.options?.methods?.length && customizationChoices.method) {
        const selectedMethod = item.options.methods.find(m => (typeof m === 'string' ? m : m.name) === customizationChoices.method);
        if (selectedMethod && typeof selectedMethod === 'object' && selectedMethod.price != null) {
            methodSurcharge = selectedMethod.price;
        }
    }

    // Surcharges for Addons
    let addonsSurcharge = 0;
    const addonPrices = {};
    if (item.options?.addons?.length) {
        item.options.addons.forEach(addon => {
            const addonKey = typeof addon === 'string' ? addon : (addon.key || addon.name);
            const addonPrice = typeof addon === 'object' ? addon.price : null;
            if (addonPrice != null) addonPrices[addonKey] = addonPrice;
        });
    } else {
        Object.assign(addonPrices, { creamcheese: 20, avocado: 15, tempura: 10, spicymayo: 10, caviar: 40 });
    }
    customizationChoices.addons.forEach(ad => {
        addonsSurcharge += (addonPrices[ad] || 0);
    });

    const finalComputed = basePrice + methodSurcharge + addonsSurcharge;

    const priceDisplay = document.getElementById('customizer-computed-price');
    if (priceDisplay) {
        priceDisplay.innerText = `${finalComputed} ${translations[currentLanguage].price_currency}`;
    }

    // Store price to add to cart
    customizationChoices.computedPrice = finalComputed;
}

function addCustomizedToCart() {
    const item = activeItemForCustomization;
    if (!item) return;

    const lang = currentLanguage;

    // Formulate readable details for cart
    const addonLabels = {
        creamcheese: translations[lang].addon_creamcheese,
        avocado: translations[lang].addon_avocado,
        tempura: translations[lang].addon_tempura,
        spicymayo: translations[lang].addon_spicymayo,
        caviar: translations[lang].addon_caviar
    };

    const cartItem = {
        cartId: Date.now().toString(),
        id: item.id,
        name: lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar),
        price: customizationChoices.computedPrice,
        quantity: 1,
        image: item.images[0],
        customizations: {
            pieces: customizationChoices.pieces,
            size: customizationChoices.size,
            method: customizationChoices.method,
            addons: customizationChoices.addons.map(ad => addonLabels[ad] || ad)
        }
    };

    cart.push(cartItem);
    saveCart();
    updateCartUI();
    closeCustomizer();

    showToast(lang === 'ar' ? `تم إضافة تخصيص السوشي بنجاح! 🍣` : `Sushi customization added successfully! 🍣`);
    triggerUpsellModal(item);
}

// --- Premium Upsell Modal System ---
function triggerUpsellModal(item) {
    const modal = document.getElementById('upsell-modal');
    const recGrid = document.getElementById('upsell-recommendations');
    if (!modal || !recGrid) return;

    const lang = currentLanguage;
    const currency = translations[lang].price_currency;

    // Filter drink & sauce recommendations
    const allItems = [...(currentMenuItems || []), ...(sushiMenu || [])];
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());
    const cartItemIds = new Set(cart.map(i => i.id));
    const candidates = uniqueItems.filter(i => !cartItemIds.has(i.id));

    const upsellCategories = ['drinks', 'beverages', 'sauces', 'sides', 'appetizers'];
    const upsellKeywords = ['صوص', 'sauce', 'بيبسي', 'pepsi', 'كولا', 'cola', 'مياه', 'water', 'بطاطس', 'fries', 'سفن', '7up', 'سبرايت', 'sprite', 'رانش', 'ranch', 'مايونيز', 'mayo', 'ثومية'];

    const upsellCandidates = candidates.filter(i => {
        const cat = (i.category || '').toLowerCase();
        const nameAr = (i.name_ar || '').toLowerCase();
        const nameEn = (i.name || '').toLowerCase();
        
        return upsellCategories.includes(cat) || upsellKeywords.some(kw => nameAr.includes(kw) || nameEn.includes(kw));
    });

    const recommendations = upsellCandidates.slice(0, 4);

    if (recommendations.length > 0) {
        recGrid.innerHTML = recommendations.map(recItem => {
            const recName = lang === 'ar' ? (recItem.name_ar || recItem.name) : (recItem.name || recItem.name_ar);
            const recImg = recItem.images?.[0] || '../asseat/only logo.jpg';
            return `
                <div class="flex flex-col justify-between items-center p-4 bg-[#132f34] border border-[#d4a17b]/30 rounded-3xl text-center shadow-lg hover:border-[#d4a17b] transition-all duration-300 animate-in fade-in zoom-in duration-200">
                    <div class="w-20 h-20 rounded-2xl overflow-hidden mb-3 shadow-md bg-[#0b272a] mx-auto border border-white/5">
                        <img src="${optimizeCloudinaryUrl(recImg, 400)}" class="w-full h-full object-cover" alt="${recName}">
                    </div>
                    <div class="w-full text-center mb-3 min-h-[38px] flex flex-col justify-center">
                        <h4 class="text-xs font-black text-white line-clamp-2 leading-tight">${recName}</h4>
                        <span class="text-xs font-black text-[#d4a17b] mt-1">${recItem.price} ${currency}</span>
                    </div>
                    <button onclick="addToOrderFromUpsell('${recItem.id}')" id="btn-upsell-${recItem.id}" class="w-full py-2.5 rounded-2xl bg-[#d4a17b] text-[#0b272a] hover:bg-white hover:text-[#0b272a] transition-all font-black text-xs flex items-center justify-center gap-1 active:scale-95 shadow-md">
                        <span class="material-symbols-outlined text-[14px] font-black">add</span>
                        <span>إضافة الوجبة</span>
                    </button>
                </div>
            `;
        }).join('');

        // Make sure standard global addToOrderFromUpsell function works
        window.addToOrderFromUpsell = async (itemId) => {
            const btn = document.getElementById(`btn-upsell-${itemId}`);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="animate-spin material-symbols-outlined text-[12px]">sync</span>';
            }

            const recItem = allItems.find(i => i.id === itemId);
            if (recItem) {
                // Add simple item to cart
                const cartItem = {
                    cartId: Date.now().toString(),
                    id: recItem.id,
                    name: currentLanguage === 'ar' ? (recItem.name_ar || recItem.name) : (recItem.name_en || recItem.name || recItem.name_ar),
                    price: recItem.price,
                    quantity: 1,
                    image: recItem.images[0],
                    customizations: null
                };
                cart.push(cartItem);
                saveCart();
                updateCartUI();
                showToast(currentLanguage === 'ar' ? `تم إضافة ${recItem.name_ar || recItem.name} 🥤` : `Added ${recItem.name_en || recItem.name} 🥤`);
                
                // Re-trigger/refresh upsell modal items dynamically
                triggerUpsellModal(item);
            }
        };

        // Open Upsell Modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 50);
    } else {
        // No recommendations, just show cart drawer immediately
        toggleCart(true);
    }
}

function closeUpsellModal() {
    const modal = document.getElementById('upsell-modal');
    if (!modal) return;

    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function openCartDrawerFromUpsell() {
    closeUpsellModal();
    setTimeout(() => {
        toggleCart(true);
    }, 300);
}

// --- Cart Core Logic ---
function saveCart() {
    localStorage.setItem('nori_cart', JSON.stringify(cart));
}

function loadCustomerFromStorage() {
    if (currentCustomer && currentCustomer.phone && currentCustomer.address) {
        const note = document.getElementById('customer-note');
        if (note) {
            note.innerText = `تم حفظ بياناتك سابقًا: ${currentCustomer.name} - ${currentCustomer.phone}. سيتم استخدام هذا العنوان ما لم تغيره.`;
        }
    }
}

function openCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (!modal) return;

    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const addressInput = document.getElementById('customer-address');
    const note = document.getElementById('customer-note');

    if (currentCustomer) {
        if (nameInput) nameInput.value = currentCustomer.name || '';
        if (phoneInput) phoneInput.value = currentCustomer.phone || '';
        if (addressInput) addressInput.value = currentCustomer.address || '';
        if (note) {
            note.innerText = `تم تسجيل بياناتك سابقًا. اضغط تأكيد لإرسال الطلب بنفس العنوان أو غيّر البيانات.`;
        }
    } else {
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        if (note) {
            note.innerText = 'يرجى كتابة الاسم ورقم الهاتف والعنوان بالكامل قبل إرسال الطلب.';
        }
    }

    const form = document.getElementById('customer-form');
    if (form && !form.hasAttribute('data-listener')) {
        form.addEventListener('submit', handleCustomerFormSubmit);
        form.setAttribute('data-listener', 'true');
    }

    modal.classList.remove('hidden');
}

function closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

async function handleCustomerFormSubmit(event) {
    event.preventDefault();

    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const addressInput = document.getElementById('customer-address');

    const name = nameInput?.value.trim();
    const phone = formatPhoneNumber(phoneInput?.value.trim());
    const address = addressInput?.value.trim();

    if (!name || !phone || !address) {
        showToast('يرجى ملء جميع البيانات قبل المتابعة.', true);
        return;
    }

    try {
        const customerData = { name, phone, address };
        const customerId = await saveCustomer(customerData);
        currentCustomer = { id: customerId, ...customerData };
        localStorage.setItem('nori_customer', JSON.stringify(currentCustomer));

        showToast('تم حفظ بياناتك بنجاح، جاري إرسال الطلب.');
        closeCustomerModal();
        await submitCartWithCustomer(currentCustomer);
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء حفظ بياناتك، حاول مرة أخرى.', true);
    }
}

async function submitCartWithCustomer(customer) {
    if (!customer || !customer.phone || !customer.address) {
        openCustomerModal();
        return;
    }

    const lang = currentLanguage;
    const currency = translations[lang].price_currency;
    const totalPrice = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    let msg = `🍣 *طلب وجبات سوشي جديدة - نوري & رايس* 🍣\n\n`;
    msg += `👤 الاسم: ${customer.name}\n`;
    msg += `📱 الهاتف: ${customer.phone}\n`;
    msg += `📍 العنوان: ${customer.address}\n\n`;

    cart.forEach((item, index) => {
        msg += `*${index + 1}. ${item.name}* (الكمية: ${item.quantity})\n`;
        msg += `• السعر: ${item.price} ${currency}\n`;

        if (item.customizations) {
            const cust = item.customizations;
            let details = [];
            if (cust.pieces) details.push(`${cust.pieces} قطع`);
            if (cust.size) details.push(`الحجم: ${cust.size}`);
            if (cust.method) details.push(`النوع: ${cust.method}`);

            msg += `• التخصيص: ${details.join(' | ')}\n`;

            if (cust.addons && cust.addons.length > 0) {
                msg += `• الإضافات: ${cust.addons.join(' + ')}\n`;
            }
        }
        msg += `\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *المجموع الكلي للطلب:* *${totalPrice} ${currency}*\n\n`;
    msg += `يرجى البدء في تحضير الطلب فوراً وتأكيد الاستلام. شكراً لكم! 🍣✨`;

    const whatsappUrl = `https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    try {
        await saveOrder({
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            items: cart,
            totalPrice,
            sentVia: 'whatsapp'
        });
    } catch (error) {
        console.error('Error saving order record:', error);
    }

    cart = [];
    saveCart();
    updateCartUI();
    toggleCart(false);
    showToast(lang === 'ar' ? 'تم إرسال طلب السوشي الخاص بك بنجاح! 🍣🚀' : 'Your sushi order was sent successfully! 🍣🚀');
}

async function sendCartOrderWhatsApp() {
    if (cart.length === 0) return;

    if (!currentCustomer || !currentCustomer.phone || !currentCustomer.address) {
        openCustomerModal();
        return;
    }

    openCustomerModal();
}

function toggleCart(forceOpen = false) {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;

    if (forceOpen) {
        drawer.classList.add('open');
        overlay.classList.add('active');
    } else {
        drawer.classList.toggle('open');
        overlay.classList.toggle('active');
    }
    
    // Update closed notification visibility based on cart state
    if (typeof updateClosedNotificationVisibility === 'function') {
        updateClosedNotificationVisibility();
    }
}

function updateCartUI() {
    const cartItemsWrapper = document.getElementById('cart-items-wrapper');
    const badge = document.getElementById('cart-badge');
    const mobileCount = document.getElementById('mobile-cart-count');
    const mobilePrice = document.getElementById('mobile-cart-price');
    const totalPriceDisplay = document.getElementById('cart-total-price');

    if (!cartItemsWrapper) return;

    const lang = currentLanguage;
    const currency = translations[lang].price_currency;

    if (cart.length === 0) {
        cartItemsWrapper.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 px-8 text-center opacity-40">
                <span class="material-symbols-outlined text-6xl mb-4 text-primary">shopping_basket</span>
                <p class="text-sm font-bold text-white">${translations[lang].cart_empty}</p>
            </div>
        `;
        if (badge) badge.classList.add('hidden');
        if (mobileCount) mobileCount.classList.add('hidden');
        if (mobilePrice) mobilePrice.innerText = `0 ${currency}`;
        if (totalPriceDisplay) totalPriceDisplay.innerText = `0 ${currency}`;
        return;
    }

    // Update count badges
    const totalCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalPrice = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    if (badge) {
        badge.classList.remove('hidden');
        badge.innerText = totalCount;
    }

    if (mobileCount) {
        mobileCount.classList.remove('hidden');
        mobileCount.innerText = totalCount;
    }

    if (totalPriceDisplay) {
        totalPriceDisplay.innerText = `${totalPrice} ${currency}`;
    }

    let html = '';
    cart.forEach(item => {
        // Generate customization badges
        let customHtml = '';
        if (item.customizations) {
            const cust = item.customizations;
            customHtml = `
                <div class="flex flex-wrap gap-1.5 mt-2">
                    ${cust.pieces ? `<span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-primary font-black">${cust.pieces} ${translations[lang].pieces}</span>` : ''}
                    ${cust.size ? `<span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-secondary font-black">${cust.size}</span>` : ''}
                    ${cust.method ? `<span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-sky-400 font-bold">${cust.method}</span>` : ''}
                    ${cust.addons && cust.addons.length > 0 ? cust.addons.map(ad => `<span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-slate-300 font-bold">${ad}</span>`).join('') : ''}
                </div>
            `;
        }

        html += `
            <div class="flex gap-4 p-5 bg-[#132f34] border-2 border-[#d4a17b]/40 rounded-3xl animate-slide-up shadow-[4px_4px_0px_0px_#d4a17b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                <!-- Thumbnail -->
                <div class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                    <img src="${optimizeCloudinaryUrl(item.image, 400)}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                
                <!-- Details -->
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start gap-2">
                            <h4 class="text-base font-bold text-white leading-tight">${item.name}</h4>
                            <button onclick="adjustCartQty('${item.cartId}', -${item.quantity})" class="text-slate-400 hover:text-red-500 transition-colors">
                                <span class="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                        ${customHtml}
                    </div>
                    <div class="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                        <span class="text-base font-black text-secondary">${item.price} ${currency}</span>
                        
                        <!-- Counter controls -->
                        <div class="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                            <button onclick="adjustCartQty('${item.cartId}', -1)" class="text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg select-none">-</button>
                            <span class="text-xs font-black text-white select-none w-4 text-center">${item.quantity}</span>
                            <button onclick="adjustCartQty('${item.cartId}', 1)" class="text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg select-none">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    cartItemsWrapper.innerHTML = html;
}

function adjustCartQty(cartId, adjustment) {
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;

    item.quantity += adjustment;

    if (item.quantity <= 0) {
        cart = cart.filter(i => i.cartId !== cartId);
        showToast(currentLanguage === 'ar' ? "تم إزالة الوجبة من سلتك" : "Dish removed from basket");
    }

    saveCart();
    updateCartUI();
}

// --- Toast System ---
function showToast(message, isError = false) {
    const toast = document.getElementById('site-toast');
    if (!toast) return;

    toast.innerText = message;
    toast.className = `fixed bottom-28 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl glass-panel text-sm font-bold z-[200] transition-all duration-300 shadow-2xl ${isError ? 'text-red-400 border-red-500/20' : 'text-primary border-primary/20'}`;

    // Fade in
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 15px) scale(0.9)';
    }, 3000);
}

// --- Shoppable 3D Flipbook Core Functions ---

function setMenuMode(mode) {
    currentMenuMode = mode;

    const bookWrapper = document.getElementById('book-menu-wrapper');
    const categorySlider = document.querySelector('.category-slider-container');
    const menuGrid = document.getElementById('menu-items-grid');

    const btnBook = document.getElementById('toggle-book-mode');
    const btnGrid = document.getElementById('toggle-grid-mode');

    if (mode === 'book') {
        if (bookWrapper) bookWrapper.classList.remove('hidden');
        if (categorySlider) categorySlider.classList.add('hidden');
        if (menuGrid) menuGrid.classList.add('hidden');

        if (btnBook) {
            btnBook.className = "px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center transition-all duration-300 active:scale-95 bg-primary text-white";
        }
        if (btnGrid) {
            btnGrid.className = "px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center transition-all duration-300 active:scale-95 text-slate-400 hover:text-white";
        }
    } else {
        if (bookWrapper) bookWrapper.classList.add('hidden');
        if (categorySlider) categorySlider.classList.remove('hidden');
        if (menuGrid) menuGrid.classList.remove('hidden');

        if (btnBook) {
            btnBook.className = "px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center transition-all duration-300 active:scale-95 text-slate-400 hover:text-white";
        }
        if (btnGrid) {
            btnGrid.className = "px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center transition-all duration-300 active:scale-95 bg-primary text-white";
        }

        renderCategories();
        renderMenu();
    }
}

function updateFlipbook() {
    for (let i = 1; i <= maxFlipbookPages; i++) {
        const page = document.getElementById(`book-page-${i}`);
        if (!page) continue;

        if (i < currentFlipbookPage) {
            // Flipped to the left
            page.classList.add('flipped');
            page.style.zIndex = i;

            // Enable pointer events on the back side if it is the immediately flipped page
            if (i === currentFlipbookPage - 1) {
                page.classList.add('active-page');
            } else {
                page.classList.remove('active-page');
            }
        } else {
            // Not flipped (on the right)
            page.classList.remove('flipped');
            page.style.zIndex = (maxFlipbookPages - i + 10);

            // Enable pointer events on the front side if it is the current top page
            if (i === currentFlipbookPage) {
                page.classList.add('active-page');
            } else {
                page.classList.remove('active-page');
            }
        }
    }

    // Update progress tracker
    // Element removed from HTML as per user request
}

function flipbookNextPage() {
    if (currentFlipbookPage < maxFlipbookPages) {
        currentFlipbookPage++;
        updateFlipbook();
    }
}

function flipbookPrevPage() {
    if (currentFlipbookPage > 1) {
        currentFlipbookPage--;
        updateFlipbook();
    }
}

function initFlipbookSwipes() {
    const book = document.getElementById('sushi-book');
    if (!book) return;

    let startX = 0;
    book.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    book.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].clientX - startX;
        if (Math.abs(diffX) > 50) {
            if (diffX < 0) {
                // Dragging right to left -> Page flips forward
                flipbookNextPage();
            } else {
                // Dragging left to right -> Page flips backward
                flipbookPrevPage();
            }
        }
    }, { passive: true });
}

// SPA Routing system for View switching (Menu vs Contact vs Comments)
function switchView(viewName) {
    const homeView = document.getElementById('home-view');
    const contactView = document.getElementById('contact-view');
    const commentsView = document.getElementById('comments-view');
    const heroSection = document.getElementById('hero-section');

    const navHome = document.getElementById('nav-home');
    const navComments = document.getElementById('nav-comments');
    const navContact = document.getElementById('nav-contact');

    const mNavHome = document.getElementById('m-nav-home');
    const mNavComments = document.getElementById('m-nav-comments');
    const mNavContact = document.getElementById('m-nav-contact');

    const flipbookWrapper = document.getElementById('book-menu-wrapper');

    // Get current view before hiding
    const currentView = homeView?.classList.contains('hidden') ? (contactView?.classList.contains('hidden') ? 'comments' : 'contact') : 'home';
    
    // If clicking same view, do nothing
    if (viewName === currentView) return;

    // Hide all views
    if (homeView) homeView.classList.add('hidden');
    if (contactView) contactView.classList.add('hidden');
    if (commentsView) commentsView.classList.add('hidden');
    if (heroSection) heroSection.classList.add('hidden');
    if (flipbookWrapper) flipbookWrapper.classList.add('hidden');

    // Reset Nav States
    [navHome, navComments, navContact].forEach(el => {
        if (el) el.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
    });
    [mNavHome, mNavComments, mNavContact].forEach(el => {
        if (el) {
            el.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = el.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
    });

    if (viewName === 'home') {
        if (homeView) homeView.classList.remove('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
        if (flipbookWrapper) flipbookWrapper.classList.remove('hidden');
        if (navHome) navHome.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        if (mNavHome) {
            mNavHome.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const ind = mNavHome.querySelector('.m-nav-indicator');
            if (ind) ind.classList.remove('hidden');
        }
    } else if (viewName === 'comments') {
        if (commentsView) commentsView.classList.remove('hidden');
        if (navComments) navComments.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        if (mNavComments) {
            mNavComments.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const ind = mNavComments.querySelector('.m-nav-indicator');
            if (ind) ind.classList.remove('hidden');
        }
        renderComments();
    } else if (viewName === 'contact') {
        if (contactView) contactView.classList.remove('hidden');
        if (navContact) navContact.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        if (mNavContact) {
            mNavContact.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const ind = mNavContact.querySelector('.m-nav-indicator');
            if (ind) ind.classList.remove('hidden');
        }
    }
    // Only scroll to top on actual view switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
//   COMMENTS & REVIEWS SYSTEM
// ==========================================================================

let guestComments = [];

function renderComments() {
    const container = document.getElementById('comments-list-container');
    if (!container) return;

    const lang = currentLanguage;

    if (guestComments.length === 0) {
        const noCommentsText = translations[lang].no_comments || (lang === 'ar' ? 'لا توجد تعليقات حتى الآن. كن أول من يشاركنا رأيه!' : 'No comments yet. Be the first to share your experience!');
        container.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center py-12 opacity-50">
                <p class="text-sm font-bold text-white">${noCommentsText}</p>
            </div>
        `;
        return;
    }

    let html = '';
    guestComments.forEach(c => {
        const authorName = ((lang === 'ar' && c.name) ? c.name : (c.name_en || c.name)) || 'ضيف كريم';
        const commentText = ((lang === 'ar' && c.text) ? c.text : (c.text_en || c.text)) || '';
        const authorInitial = authorName ? authorName.charAt(0) : 'ض';
        const displayDate = (c.date && c.date !== 'undefined') ? c.date : '';

        html += `
            <div class="bg-white/5 border border-white/10 rounded-3xl p-6 glass-panel flex flex-col justify-between shadow-xl animate-slide-up">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
                                ${authorInitial}
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-white">${authorName}</h4>
                                <span class="text-[10px] text-slate-500">${displayDate}</span>
                            </div>
                        </div>
                        <div class="flex text-amber-400 text-sm">
                            ${'<span class="material-symbols-outlined text-base">star</span>'.repeat(c.rating || 5)}
                        </div>
                    </div>
                    <p class="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">${commentText}</p>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function submitNewComment(e) {
    e.preventDefault();
    const nameInput = document.getElementById('comment-author-name');
    const textInput = document.getElementById('comment-author-text');
    const phoneInput = document.getElementById('comment-author-phone');
    const ratingInput = document.getElementById('comment-rating-val');

    if (!nameInput || !textInput) return;

    const selectedRating = ratingInput ? parseInt(ratingInput.value) : 5;

    const newComment = {
        name: nameInput.value,
        text: textInput.value,
        phone: phoneInput ? formatPhoneNumber(phoneInput.value) : '',
        rating: selectedRating,
        showOnHome: false, // Wait for admin approval
        status: 'pending'
    };

    try {
        if (typeof saveFeedback === 'function') {
            await saveFeedback(newComment);
        } else {
            console.warn("saveFeedback not found. Comment not saved to DB.");
        }

        // Add locally for instant preview, but indicate it's under review
        guestComments.unshift({
            name: nameInput.value,
            text: textInput.value,
            date: new Date().toISOString().split('T')[0],
            rating: selectedRating
        });

        // Clear inputs
        nameInput.value = '';
        textInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (ratingInput) {
            setCommentRating(5); // Reset to 5 stars default
        }

        renderComments();
        
        // Show success message that comment is under review
        showToast("تم إرسال تقييمك بنجاح، سيظهر بعد المراجعة.");
    } catch (error) {
        console.error("Error submitting comment:", error);
        showToast("حدث خطأ أثناء الإرسال، حاول مرة أخرى.");
    }
}

function setCommentRating(stars) {
    const hiddenVal = document.getElementById('comment-rating-val');
    if (hiddenVal) hiddenVal.value = stars;

    const starContainer = document.getElementById('interactive-star-rating');
    if (!starContainer) return;

    const starSpans = starContainer.querySelectorAll('span');
    starSpans.forEach((span, idx) => {
        if (idx < stars) {
            span.classList.add('text-amber-400');
            span.classList.remove('text-slate-600');
        } else {
            span.classList.remove('text-amber-400');
            span.classList.add('text-slate-600');
        }
    });
}

function getCategoryDisplayName(key, lang) {
    if (!key) return lang === 'ar' ? 'قسم جديد' : 'New Category';

    const category = (currentCategories || []).find(cat =>
        cat.id === key || cat.name === key || cat.dbName === key || cat.name_ar === key || cat.name_en === key
    );

    if (category) {
        if (lang === 'ar') return category.name_ar || category.name || key;
        return category.name_en || category.name || category.name_ar || key;
    }

    return key;
}

function buildMenuPages(activeItems) {
    const pages = [];
    const seen = new Set();
    const categoryOrder = [];

    if (Array.isArray(currentCategories) && currentCategories.length) {
        currentCategories.forEach(cat => {
            const key = cat.name || cat.id;
            if (key && !seen.has(key)) {
                seen.add(key);
                categoryOrder.push(key);
            }
        });
    }

    activeItems.forEach(item => {
        const key = item.category || 'other';
        if (!seen.has(key)) {
            seen.add(key);
            categoryOrder.push(key);
        }
    });

    categoryOrder.forEach(categoryKey => {
        const categoryItems = activeItems.filter(item => (item.category || 'other') === categoryKey);
        for (let i = 0; i < categoryItems.length; i += 3) {
            pages.push({
                category: categoryKey,
                items: categoryItems.slice(i, i + 3),
                segment: Math.floor(i / 3) + 1,
                totalSegments: Math.ceil(categoryItems.length / 3)
            });
        }
    });

    return pages;
}

function renderDynamicFlipbook() {
    const book = document.getElementById('sushi-book');
    if (!book) return;

    // Keep only book-page-1
    const coverPage = document.getElementById('book-page-1');
    book.innerHTML = '';
    if (coverPage) {
        book.appendChild(coverPage);
    }

    const lang = currentLanguage;
    const currency = translations[lang] ? translations[lang].price_currency : 'جم';

    // Filter available items
    const activeItems = currentMenuItems.filter(item => item.available !== false);
    const menuPages = buildMenuPages(activeItems);

    if (menuPages.length > 0) {
        menuPages.forEach((pageData, index) => {
            const pageNum = index + 2;
            const pageElement = document.createElement('div');
            pageElement.className = 'book-page';
            pageElement.id = `book-page-${pageNum}`;

            const categoryTitle = getCategoryDisplayName(pageData.category, lang);
            const categoryMeta = pageData.totalSegments > 1
                ? `${categoryTitle} · ${lang === 'ar' ? 'الجزء' : 'Part'} ${pageData.segment}/${pageData.totalSegments}`
                : categoryTitle;

            const frontItemsHtml = pageData.items.map(item => renderBookItemHtml(item, lang, currency)).join('');
            const frontHtml = `
                <div class="page-front p-6 md:p-8 bg-[#132f34] border-y-2 border-r-2 border-[#d4a17b]/40 rounded-r-3xl shadow-[8px_8px_0px_0px_#d4a17b] flex flex-col justify-between">
                    <div class="text-start flex-grow">
                        <div class="flex justify-between items-start mb-6 border-b border-[#d4a17b]/20 pb-4">
                            <div>
                                <span class="text-xs text-[#d4a17b] font-black uppercase tracking-wider">${lang === 'ar' ? 'القائمة' : 'MENU'}</span>
                                <h3 class="text-xl md:text-2xl font-black text-white font-serif mt-0.5">${categoryMeta}</h3>
                            </div>
                        </div>
                        <div class="space-y-4">
                            ${frontItemsHtml}
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] text-[#d4a17b] font-bold border-t border-[#d4a17b]/20 pt-4">
                        <span>NORI &amp; RICE</span>
                        <span>PAGE ${pageNum * 2 - 2}</span>
                    </div>
                </div>
            `;

            let backHtml = '';
            if (index < menuPages.length - 1) {
                const nextTitle = getCategoryDisplayName(menuPages[index + 1].category, lang);
                backHtml = `
                    <div class="page-back flex flex-col justify-between p-6 md:p-8 bg-[#0b272a] border-y-2 border-l-2 border-[#d4a17b]/40 rounded-l-3xl shadow-inner">
                        <div class="my-auto text-center">
                            <span class="text-xs text-[#d4a17b] font-black uppercase tracking-wider">${lang === 'ar' ? 'التالي في القائمة' : 'NEXT IN THE MENU'}</span>
                            <h3 class="text-2xl font-black text-white font-serif mt-4 mb-3">${nextTitle}</h3>
                            <p class="text-xs text-slate-300 leading-relaxed max-w-[260px] mx-auto">
                                ${lang === 'ar' ? 'اقلب الصفحة لمشاهدة المزيد من الأطباق من نفس القائمة.' : 'Flip the page to discover more dishes from the next menu.'}
                            </p>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-[#d4a17b] font-bold border-t border-[#d4a17b]/20 pt-4">
                            <span>NORI &amp; RICE</span>
                            <span>PAGE ${pageNum * 2 - 1}</span>
                        </div>
                    </div>
                `;
            } else {
                backHtml = renderBackCoverHtml(lang);
            }

            pageElement.innerHTML = frontHtml + backHtml;
            book.appendChild(pageElement);
        });
    } else {
        const pageElement = document.createElement('div');
        pageElement.className = 'book-page';
        pageElement.id = 'book-page-2';

        const frontHtml = `
            <div class="page-front p-6 md:p-8 bg-[#132f34] border-y-2 border-r-2 border-[#d4a17b]/40 rounded-r-3xl shadow-[8px_8px_0px_0px_#d4a17b] flex flex-col justify-between">
                <div class="my-auto text-center py-12">
                    <span class="material-symbols-outlined text-4xl text-[#d4a17b]/60 mb-2">restaurant_menu</span>
                    <p class="text-sm text-slate-400 font-bold">${lang === 'ar' ? 'جاري تجهيز قائمة الطعام...' : 'Preparing the menu...'}</p>
                </div>
                <div class="flex justify-between items-center text-[10px] text-[#d4a17b] font-bold border-t border-[#d4a17b]/20 pt-4">
                    <span>NORI &amp; RICE</span>
                    <span>PAGE 2</span>
                </div>
            </div>
        `;
        const backHtml = renderBackCoverHtml(lang);
        pageElement.innerHTML = frontHtml + backHtml;
        book.appendChild(pageElement);
    }

    maxFlipbookPages = book.querySelectorAll('.book-page').length;
    currentFlipbookPage = Math.min(currentFlipbookPage, maxFlipbookPages);
    updateFlipbook();
}

function renderBookItemHtml(item, lang, currency) {
    const name = lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
    const desc = lang === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.description_ar);
    const imageSrc = item.images && item.images.length > 0 ? item.images[0] : '';

    const hasOptions = !!item.options;
    const safeItemId = String(item.id).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const buttonText = hasOptions ? (lang === 'ar' ? 'تخصيص' : 'Customize') : (lang === 'ar' ? 'عرض التفاصيل' : 'View Details');
    const buttonIcon = hasOptions ? 'tune' : 'visibility';
    const buttonAction = `openCustomizer('${safeItemId}')`;

    return `
        <div onclick="${buttonAction}" class="group cursor-pointer flex gap-4 p-4 rounded-2xl bg-[#0b272a] border-2 border-[#d4a17b]/40 hover:shadow-[4px_4px_0px_0px_#d4a17b] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <div class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative border border-[#d4a17b]/30">
                <img src="${optimizeCloudinaryUrl(imageSrc, 400)}" class="w-full h-full object-cover" alt="${name}">
            </div>
            <div class="flex-grow flex flex-col justify-between text-start min-w-0">
                <div>
                    <h4 class="text-sm font-bold text-white leading-tight truncate">${name}</h4>
                    <p class="text-[10px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">${desc || ''}</p>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs font-black text-[#d4a17b]">${item.price} ${currency}</span>
                    <button onclick="event.stopPropagation(); ${buttonAction}" class="px-3 py-1.5 rounded-xl bg-primary text-[#0b272a] shadow-[2px_2px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 font-black text-[9px] border border-[#0b272a] transition-all flex items-center gap-1">
                        <span class="material-symbols-outlined text-[10px]">${buttonIcon}</span>
                        <span>${buttonText}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderBackCoverHtml(lang) {
    return `
        <div class="page-back cover-back flex flex-col justify-between items-center text-center p-8 bg-[#0b272a] border-y-2 border-l-2 border-[#d4a17b]/40 rounded-l-3xl shadow-inner">
            <div class="w-full"></div>
            <div class="my-auto">
                <div class="w-16 h-16 border-2 border-[#d4a17b]/40 rounded-full flex items-center justify-center mx-auto mb-6 text-[#d4a17b] shadow-md bg-[#132f34]">
                    <span class="material-symbols-outlined text-3xl">restaurant</span>
                </div>
                <h3 class="text-2xl font-black text-white font-serif tracking-widest">NORI &amp; RICE</h3>
                <p class="text-[9px] tracking-[5px] text-[#d4a17b] font-black uppercase mt-2">${lang === 'ar' ? 'تجربة لاونج طوكيو الفاخرة' : 'TOKYO LOUNGE EXPERIENCE'}</p>
                <div class="w-12 h-0.5 bg-[#d4a17b] mx-auto my-6 rounded-full shadow-md"></div>
                <p class="text-xs text-slate-300 leading-relaxed max-w-[240px] mx-auto">
                    ${lang === 'ar' ? 'صُمم هذا الكتالوج التفاعلي بحب ليوفر لكم تجربة طعام استثنائية تحاكي الفخامة اليابانية.' : 'This interactive catalog was crafted with love to provide an exceptional dining experience matching Japanese luxury.'}
                </p>
            </div>
            <div class="flex flex-col items-center gap-1 bg-[#132f34] px-6 py-2.5 rounded-2xl border border-[#d4a17b]/30 shadow-md">
                <span class="text-[10px] text-[#d4a17b] font-black tracking-widest">WWW.NORIANDRICE.COM</span>
            </div>
        </div>
    `;
}
