/* ==========================================================================
   NORI & RICE - LUXURY SUSHI LOUNGE CORE APPLICATION ENGINE
   ========================================================================== */

import {
    getMenuItems, getCategories, getGlobalSettings,
    getAllFeedback, saveFeedback, saveOrder, trackVisitor
} from '../database/services.js';

// --- Global Variables & App State ---
let currentLanguage = localStorage.getItem('nori_language') || 'ar'; // Default Arabic
let selectedCategory = 'all';
let cart = JSON.parse(localStorage.getItem('nori_cart') || '[]');
let bookingState = {
    selectedZone: 'sakura_hall',
    selectedTableId: null,
    date: '',
    time: '',
    guests: 2,
    name: '',
    phone: '',
    notes: ''
};
let activeItemForCustomization = null;
let customizationChoices = {
    pieces: 8,
    rice: 'white',
    addons: []
};

// --- Dynamic Admin Integration State ---
let currentMenuItems = [];
let currentCategories = [];

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
    window.submitNewComment = submitNewComment;
    window.setCommentRating = setCommentRating;
    window.closeCustomizer = closeCustomizer;
    window.sendCartOrderWhatsApp = sendCartOrderWhatsApp;
    window.selectCategory = selectCategory;
    window.slideCustomizerGallery = slideCustomizerGallery;
    window.selectCustomizerPiece = selectCustomizerPiece;
    window.selectCustomizerRice = selectCustomizerRice;
    window.toggleCustomizerAddon = toggleCustomizerAddon;
    window.addCustomizedToCart = addCustomizedToCart;
    window.adjustCartQty = adjustCartQty;
    window.switchBookingZone = switchBookingZone;
    window.selectMapTable = selectMapTable;
    window.handleBookingInputsChange = handleBookingInputsChange;
    window.submitBooking = submitBooking;
    window.sendBookingWhatsApp = sendBookingWhatsApp;
    window.closeBookingSuccess = closeBookingSuccess;
    window.closeUpsellModal = closeUpsellModal;
    window.openCartDrawerFromUpsell = openCartDrawerFromUpsell;
    window.triggerUpsellModal = triggerUpsellModal;

    // Load Dynamic Admin Data from Firebase
    try {
        const [menuItems, cats, settings, feed] = await Promise.all([
            getMenuItems(),
            getCategories(),
            getGlobalSettings(),
            getAllFeedback()
        ]);
        
        if (menuItems) {
            currentMenuItems = menuItems;
        }
        if (cats) {
            currentCategories = cats;
        }
        if (settings) {
            if (settings.whatsapp) RESTAURANT_WHATSAPP = settings.whatsapp;
            if (settings.phone) {
                document.querySelectorAll('a[href^="tel:"]').forEach(el => el.href = `tel:${settings.phone}`);
                const contactPhone = document.getElementById('contact-phone');
                if (contactPhone) contactPhone.innerText = settings.phone;
            }
            if (settings.social_fb) {
                document.querySelectorAll('a[href*="facebook.com"]').forEach(el => el.href = settings.social_fb);
            }
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

    // Render Floor Table Booking Map
    renderFloorMap(bookingState.selectedZone);

    // Initialize 3D Flipbook state
    updateFlipbook();
    initFlipbookSwipes();
    setMenuMode('book');

    // Update Cart Badge and UI
    updateCartUI();

    // Pre-populate date picker with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('book-date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = tomorrow.toISOString().split('T')[0];
        bookingState.date = dateInput.value;
    }
});

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

    // Time slots selection
    document.querySelectorAll('.time-slot-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.time-slot-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            bookingState.time = chip.getAttribute('data-time');
            updateTicketSummary();
        });
    });
}

// --- Bilingual Translation Engine ---
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('nori_language', currentLanguage);
    applyLanguage(currentLanguage);

    // Re-render components with translated terms
    renderCategories();
    renderMenu();
    renderFloorMap(bookingState.selectedZone);
    updateCartUI();
    updateTicketSummary();
}

function applyLanguage(lang) {
    const isRtl = lang === 'ar';

    // Shift document direction and classes
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    if (isRtl) {
        document.body.classList.add('rtl-mode');
        document.body.classList.remove('lang-en');
    } else {
        document.body.classList.remove('rtl-mode');
        document.body.classList.add('lang-en');
    }

    // Update statically declared translations
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            // Check if element is input placeholder
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translations[lang][key];
            } else {
                element.innerHTML = translations[lang][key];
            }
        }
    });

    // Toggle visual state of language picker button
    const langBtnText = document.getElementById('lang-toggle-text');
    if (langBtnText) {
        langBtnText.innerText = lang === 'ar' ? 'English' : 'العربية';
    }

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

        const buttonText = item.options ? translations[lang].btn_customize : translations[lang].btn_add_order;
        const buttonAction = item.options ? `openCustomizer('${item.id}')` : `addToOrderSimple('${item.id}')`;

        html += `
            <div class="bg-[#132f34] border-2 border-[#d4a17b]/40 rounded-3xl overflow-hidden flex flex-col group animate-slide-up shadow-[6px_6px_0px_0px_#d4a17b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-300">
                <!-- Thumbnail (No Dark Overlay for Vivid Food Display) -->
                <div class="relative aspect-[4/3] overflow-hidden cursor-pointer bg-[#0b272a]" onclick="openCustomizer('${item.id}')">
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
                        <p class="text-sm text-slate-300 line-clamp-2 mb-6 h-10 leading-relaxed">${desc}</p>
                        
                        <!-- Popular ordering tracker info -->
                        <div class="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                            <span class="material-symbols-outlined text-[14px]">visibility</span>
                            <span>${orderText}</span>
                        </div>
                    </div>
                    
                    <!-- Full Width Prominent Button (Matching two.html) -->
                    <button onclick="${buttonAction}" class="mt-auto w-full bg-primary text-[#0b272a] font-black py-4 border-2 border-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase rounded-2xl flex items-center justify-center gap-2 text-base">
                        <span class="material-symbols-outlined font-black text-lg">${item.options ? 'tune' : 'add_shopping_cart'}</span>
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
function openCustomizer(itemId, preserveChoices = false) {
    const item = currentMenuItems.find(i => i.id === itemId) || (typeof sushiMenu !== 'undefined' ? sushiMenu.find(i => i.id === itemId) : null);
    if (!item) return;

    activeItemForCustomization = item;

    // Reset choices only on first open
    if (!preserveChoices) {
        customizationChoices = {
            pieces: item.options.pieces ? item.options.pieces[0] : 8,
            rice: 'white',
            addons: []
        };
    }

    const lang = currentLanguage;
    const modalOverlay = document.getElementById('customizer-modal');
    const container = document.getElementById('customizer-content');

    if (!modalOverlay || !container) return;

    const name = lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
    const desc = lang === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.description_ar);

    // 1. Piece options selector
    let piecesHtml = '';
    if (item.options.pieces) {
        piecesHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].piece_count}</label>
                <div class="flex gap-3">
                    ${item.options.pieces.map(pcs => `
                        <button onclick="selectCustomizerPiece(${pcs})" id="btn-pcs-${pcs}" class="flex-1 py-3 px-4 border-2 border-[#d4a17b]/40 rounded-2xl font-black text-sm text-center transition-all ${customizationChoices.pieces === pcs ? 'bg-primary text-[#0b272a] shadow-[4px_4px_0px_0px_#d4a17b] translate-x-0.5 translate-y-0.5' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
                            ${pcs} ${translations[lang].pieces}
                        </button>
                    `).join('')}
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
                    <div onclick="selectCustomizerRice('${opt.key}')" id="card-rice-${opt.key}" class="flex items-center justify-between p-4 border-2 border-[#d4a17b]/40 rounded-2xl cursor-pointer transition-all ${customizationChoices.rice === opt.key ? 'bg-primary text-[#0b272a] shadow-[4px_4px_0px_0px_#d4a17b] translate-x-0.5 translate-y-0.5' : 'bg-[#0b272a] text-slate-300 hover:border-primary'}">
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
                     ${item.ingredients ? `<p class="text-xs text-slate-400 mb-8 border-b border-white/5 pb-4"><span class="text-primary font-bold">المكونات:</span> ${item.ingredients}</p>` : `<p class="text-xs text-slate-400 mb-8 border-b border-white/5 pb-4"><span class="text-primary font-bold">المكونات:</span> سوشي ممتاز محضر بعناية ومكونات طازجة.</p>`}
                     
                     <div class="space-y-6">
                        ${piecesHtml}
                        ${riceHtml}
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
    openCustomizer(activeItemForCustomization.id, true);
}

function selectCustomizerRice(riceKey) {
    customizationChoices.rice = riceKey;
    openCustomizer(activeItemForCustomization.id, true);
}

function toggleCustomizerAddon(addonKey) {
    const idx = customizationChoices.addons.indexOf(addonKey);
    if (idx > -1) {
        customizationChoices.addons.splice(idx, 1);
    } else {
        customizationChoices.addons.push(addonKey);
    }

    const card = document.getElementById(`card-addon-${addonKey}`);
    if (card) {
        card.classList.toggle('selected', idx === -1);
    }

    updateCustomizerPrice();
}

function updateCustomizerPrice() {
    if (!activeItemForCustomization) return;

    const item = activeItemForCustomization;

    // Base calculations
    let basePrice = item.price;

    // Apply piece multiplier
    if (item.options.pieces && item.options.pieceMultiplier) {
        const multiplier = item.options.pieceMultiplier[customizationChoices.pieces] || 1.0;
        basePrice = Math.round(basePrice * multiplier);
    }

    // Surcharges for Rice
    let riceSurcharge = 0;
    if (customizationChoices.rice === 'brown') riceSurcharge = 15;
    if (customizationChoices.rice === 'black') riceSurcharge = 25;

    // Surcharges for Addons
    let addonsSurcharge = 0;
    const addonPrices = { creamcheese: 20, avocado: 15, tempura: 10, spicymayo: 10, caviar: 40 };
    customizationChoices.addons.forEach(ad => {
        addonsSurcharge += (addonPrices[ad] || 0);
    });

    const finalComputed = basePrice + riceSurcharge + addonsSurcharge;

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
    const riceLabels = {
        white: translations[lang].rice_white,
        brown: translations[lang].rice_brown,
        black: translations[lang].rice_black
    };
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
            rice: riceLabels[customizationChoices.rice],
            addons: customizationChoices.addons.map(ad => addonLabels[ad])
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

    if (mobilePrice) {
        mobilePrice.innerText = `${totalPrice} ${currency}`;
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
                    <span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-primary font-black">${cust.pieces} ${translations[lang].pieces}</span>
                    <span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-secondary font-black">${cust.rice}</span>
                    ${cust.addons ? cust.addons.map(ad => `<span class="px-2.5 py-1 bg-[#0b272a] border border-[#d4a17b]/40 rounded-lg text-[10px] text-slate-300 font-bold">${ad}</span>`).join('') : ''}
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

// --- Visual Floor Map Booking Engine (Awesome CSS SVG System) ---
function renderFloorMap(zoneKey) {
    const mapContainer = document.getElementById('floor-map-container');
    if (!mapContainer) return;

    // Clear and draw grid wall decorations
    mapContainer.innerHTML = `
        <div class="floor-map-decorations">
            <div class="map-sushi-bar-counter"></div>
        </div>
    `;

    const zone = bookingLayout[zoneKey];
    if (!zone) return;

    const lang = currentLanguage;

    // Render each table node based on absolute coordinates
    zone.tables.forEach(table => {
        const isSelected = bookingState.selectedTableId === table.id && bookingState.selectedZone === zoneKey;
        const seatsLabel = translations[lang].table_seats.replace('{n}', table.seats);

        let label = '';
        if (table.type === 'bar') {
            label = translations[lang].table_bar_seat.replace('{n}', table.id.replace('B', ''));
        } else if (table.type === 'room') {
            label = lang === 'ar' ? table.name_ar : table.name_en;
        } else {
            label = translations[lang].table_number.replace('{n}', table.id.replace('T', ''));
        }

        const element = document.createElement('div');
        element.className = `map-element ${isSelected ? 'selected' : ''}`;
        element.style.left = `${table.x}%`;
        element.style.top = `${table.y}%`;
        element.setAttribute('data-id', table.id);
        element.setAttribute('data-type', table.type);
        element.setAttribute('data-seats', table.seats);
        element.setAttribute('data-status', table.status);

        // Append visual chairs around shape
        let chairsHtml = '';
        for (let i = 0; i < table.seats; i++) {
            chairsHtml += `<div class="map-chair"></div>`;
        }

        element.innerHTML = `
            <div class="shape">
                ${chairsHtml}
            </div>
            <span class="label">${label}</span>
        `;

        // Handle Map click selection
        if (table.status === 'available') {
            element.addEventListener('click', () => {
                selectMapTable(table.id, zoneKey);
            });
        }

        mapContainer.appendChild(element);
    });
}

function switchBookingZone(zoneKey) {
    bookingState.selectedZone = zoneKey;
    bookingState.selectedTableId = null; // Reset selection on zone shift

    // Update dynamic buttons
    document.querySelectorAll('.zone-btn').forEach(btn => {
        const key = btn.getAttribute('data-zone');
        btn.classList.toggle('active', key === zoneKey);
    });

    renderFloorMap(zoneKey);
    updateTicketSummary();
}

function selectMapTable(tableId, zoneKey) {
    bookingState.selectedTableId = tableId;
    bookingState.selectedZone = zoneKey;

    // Refresh visual items
    document.querySelectorAll('.map-element').forEach(el => {
        el.classList.remove('selected');
    });

    const selectedEl = document.querySelector(`.map-element[data-id="${tableId}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }

    // Fetch details
    const table = bookingLayout[zoneKey].tables.find(t => t.id === tableId);
    if (table) {
        bookingState.guests = table.seats;

        // Auto-update inputs
        const guestsInput = document.getElementById('book-guests');
        if (guestsInput) guestsInput.value = table.seats;
    }

    updateTicketSummary();
    showToast(currentLanguage === 'ar' ? `تم تحديد الطاولة ${tableId} بنجاح 🛋️` : `Table ${tableId} selected successfully 🛋️`);
}

// --- Ticket Summary Real-Time updates ---
function handleBookingInputsChange() {
    bookingState.name = document.getElementById('book-name')?.value || '';
    bookingState.phone = document.getElementById('book-phone')?.value || '';
    bookingState.notes = document.getElementById('book-notes')?.value || '';
    bookingState.date = document.getElementById('book-date')?.value || '';
    bookingState.guests = parseInt(document.getElementById('book-guests')?.value || '2');

    updateTicketSummary();
}

function updateTicketSummary() {
    const summaryCard = document.getElementById('ticket-realtime-card');
    if (!summaryCard) return;

    const lang = currentLanguage;

    if (!bookingState.selectedTableId) {
        summaryCard.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-center opacity-40">
                <span class="material-symbols-outlined text-5xl mb-3 text-secondary">chair_alt</span>
                <h4 class="text-sm font-bold text-white">${translations[lang].table_select}</h4>
            </div>
        `;
        return;
    }

    const zoneName = translations[lang][`zone_${bookingState.selectedZone}`];
    const tableCode = bookingState.selectedTableId;
    const timeDisplay = bookingState.time || '--:--';
    const dateDisplay = bookingState.date || '----/--/--';

    summaryCard.innerHTML = `
        <div class="luxury-ticket">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xs uppercase tracking-widest text-primary font-black mb-1">${translations[lang].site_title.split('|')[0]}</h3>
                    <h4 class="text-lg font-bold text-white">${translations[lang].booking_success_title.split('!')[0]}</h4>
                </div>
                <div class="px-3 py-1 bg-secondary/15 text-secondary border border-secondary/20 rounded-md text-[10px] font-black uppercase">CONFIRMED TICKET</div>
            </div>
            
            <div class="ticket-divider"></div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_zone}</span>
                    <span class="text-sm font-bold text-white">${zoneName}</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_table}</span>
                    <span class="text-sm font-black text-secondary">${tableCode} (${bookingState.guests} ${translations[lang].pieces.replace('pcs', 'Seats')})</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_date_time}</span>
                    <span class="text-sm font-bold text-white">${dateDisplay} @ ${timeDisplay}</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_holder}</span>
                    <span class="text-sm font-bold text-white line-clamp-1">${bookingState.name || '----'}</span>
                </div>
            </div>
            
            <div class="ticket-divider"></div>
            
            <div class="ticket-barcode">
                <div class="barcode-lines"></div>
                <span class="text-[9px] tracking-[4px] text-slate-400 mt-2">NORI-${tableCode}-${Math.floor(Math.random() * 9000) + 1000}</span>
            </div>
        </div>
    `;
}

// --- Submit Booking & Send WhatsApp Ticket ---
function submitBooking() {
    const lang = currentLanguage;

    // Validation
    if (!bookingState.selectedTableId) {
        showToast(lang === 'ar' ? "يرجى تحديد الطاولة المفضلة من خريطة الصالة أولاً!" : "Please select your preferred table on the floor map first!", true);
        return;
    }

    bookingState.name = document.getElementById('book-name')?.value.trim() || '';
    bookingState.phone = document.getElementById('book-phone')?.value.trim() || '';
    bookingState.notes = document.getElementById('book-notes')?.value.trim() || '';

    if (!bookingState.name || !bookingState.phone) {
        showToast(lang === 'ar' ? "يرجى كتابة الاسم ورقم الهاتف لإكمال الحجز!" : "Please write your name and phone number to complete the booking!", true);
        return;
    }

    if (!bookingState.time) {
        showToast(lang === 'ar' ? "يرجى اختيار وقت الحضور!" : "Please choose your arrival time slot!", true);
        return;
    }

    // Success Modal trigger
    const successModal = document.getElementById('booking-success-modal');
    if (!successModal) return;

    // Generate unique random ticket number
    const ticketNo = `NR-B${bookingState.selectedTableId}-${Math.floor(Math.random() * 89999) + 10000}`;

    const detailsContainer = document.getElementById('success-ticket-details');
    if (detailsContainer) {
        const zoneName = translations[lang][`zone_${bookingState.selectedZone}`];
        detailsContainer.innerHTML = `
            <div class="luxury-ticket">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-xs uppercase tracking-widest text-primary font-black mb-0.5">${translations[lang].ticket_number}</h4>
                        <span class="text-lg font-black text-white">${ticketNo}</span>
                    </div>
                    <span class="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-black">VALID</span>
                </div>
                
                <div class="ticket-divider"></div>
                
                <div class="grid grid-cols-2 gap-4 text-start">
                    <div>
                        <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_holder}</span>
                        <span class="text-sm font-bold text-white">${bookingState.name}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_table}</span>
                        <span class="text-sm font-black text-secondary">${bookingState.selectedTableId} (${bookingState.guests} ${lang === 'ar' ? 'مقاعد' : 'Seats'})</span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_zone}</span>
                        <span class="text-sm font-bold text-white">${zoneName}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">${translations[lang].ticket_date_time}</span>
                        <span class="text-sm font-bold text-white">${bookingState.date} @ ${bookingState.time}</span>
                    </div>
                </div>
                
                <div class="ticket-divider"></div>
                
                <div class="ticket-barcode">
                    <div class="barcode-lines"></div>
                    <span class="text-[9px] tracking-[4px] text-slate-400 mt-2">${ticketNo}</span>
                </div>
            </div>
        `;
    }

    // Store Ticket Code temporarily for WhatsApp sender
    window.lastGeneratedTicketNo = ticketNo;

    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function sendBookingWhatsApp() {
    const lang = currentLanguage;
    const zoneName = translations[lang][`zone_${bookingState.selectedZone}`];
    const ticketNo = window.lastGeneratedTicketNo || '----';

    // Format message text
    let msg = `🎟️ *طلب حجز طاولة تفاعلي - نوري & رايس* 🎟️\n\n`;
    msg += `• *رقم التذكرة:* ${ticketNo}\n`;
    msg += `• *الاسم بالكامل:* ${bookingState.name}\n`;
    msg += `• *رقم الهاتف:* ${bookingState.phone}\n`;
    msg += `• *المنطقة المحجوزة:* ${zoneName}\n`;
    msg += `• *رقم الطاولة:* ${bookingState.selectedTableId}\n`;
    msg += `• *عدد المقاعد:* ${bookingState.guests} أشخاص\n`;
    msg += `• *التاريخ والوقت:* ${bookingState.date} @ ${bookingState.time}\n`;

    if (bookingState.notes) {
        msg += `• *ملاحظات خاصة:* ${bookingState.notes}\n`;
    }

    msg += `\nيرجى تأكيد الحجز وتثبيته في نظام اللاونج. شكراً لكم! ✨🍣`;

    // Encode url and trigger WhatsApp API
    const whatsappUrl = `https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
}

function closeBookingSuccess() {
    document.getElementById('booking-success-modal').classList.remove('active');
    document.body.style.overflow = '';

    // Reset booking state
    bookingState.selectedTableId = null;
    bookingState.time = '';

    // Clear elements
    document.querySelectorAll('.map-element').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.time-slot-chip').forEach(c => c.classList.remove('active'));
    document.getElementById('book-name').value = '';
    document.getElementById('book-phone').value = '';
    document.getElementById('book-notes').value = '';

    renderFloorMap(bookingState.selectedZone);
    updateTicketSummary();
}

// --- Submit Cart Order via WhatsApp ---
function sendCartOrderWhatsApp() {
    if (cart.length === 0) return;

    const lang = currentLanguage;
    const currency = translations[lang].price_currency;
    const totalPrice = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    let msg = `🍣 *طلب وجبات سوشي جديدة - نوري & رايس* 🍣\n\n`;

    cart.forEach((item, index) => {
        msg += `*${index + 1}. ${item.name}* (الكمية: ${item.quantity})\n`;
        msg += `• السعر: ${item.price} ${currency}\n`;

        if (item.customizations) {
            const cust = item.customizations;
            msg += `• التخصيص: ${cust.pieces} قطع | أرز: ${cust.rice}\n`;
            if (cust.addons.length > 0) {
                msg += `• الإضافات: ${cust.addons.join(' + ')}\n`;
            }
        }
        msg += `\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *المجموع الكلي للطلب:* *${totalPrice} ${currency}*\n\n`;
    msg += `يرجى البدء في تحضير الطلب فوراً وتأكيد الاستلام. شكراً لكم! 🍣✨`;

    // Send to WhatsApp API
    const whatsappUrl = `https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    // Clear Cart and trigger success feedback
    cart = [];
    saveCart();
    updateCartUI();
    toggleCart(false);

    showToast(lang === 'ar' ? "تم إرسال طلب السوشي الخاص بك بنجاح! 🍣🚀" : "Your sushi order was sent successfully! 🍣🚀");
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
    const pageNumText = document.getElementById('flipbook-page-num');
    const progressBar = document.getElementById('flipbook-progress');
    // Ensure pagination visibility matches view
    if (!document.getElementById('home-view').classList.contains('hidden')) {
        if (pageNumText) pageNumText.style.display = 'block';
        if (progressBar) progressBar.style.display = 'block';
    } else {
        if (pageNumText) pageNumText.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
    }
    if (pageNumText) {
        const lang = currentLanguage;
        const total = maxFlipbookPages;
        const current = Math.min(maxFlipbookPages, currentFlipbookPage);
        if (lang === 'ar') {
            pageNumText.innerText = `الصفحة: ${current} / ${total}`;
        } else {
            pageNumText.innerText = `Page: ${current} / ${total}`;
        }
    }

    if (progressBar) {
        const pct = ((Math.min(maxFlipbookPages, currentFlipbookPage) - 1) / (maxFlipbookPages - 1)) * 100;
        progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
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

    if (viewName === 'home') {
        if (homeView) homeView.classList.remove('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
        if (contactView) contactView.classList.add('hidden');
        if (commentsView) commentsView.classList.add('hidden');
        if (flipbookWrapper) flipbookWrapper.classList.remove('hidden');

        if (navHome) navHome.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        if (navComments) navComments.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        if (navContact) navContact.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";

        // Update Mobile Bottom Nav Active state
        if (mNavHome) {
            mNavHome.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const indicator = mNavHome.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.remove('hidden');
        }
        if (mNavComments) {
            mNavComments.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavComments.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        if (mNavContact) {
            mNavContact.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavContact.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'comments') {
        if (homeView) homeView.classList.add('hidden');
        if (heroSection) heroSection.classList.add('hidden');
        if (contactView) contactView.classList.add('hidden');
        if (commentsView) commentsView.classList.remove('hidden');
        if (flipbookWrapper) flipbookWrapper.classList.add('hidden');

        if (navHome) navHome.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        if (navComments) navComments.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        if (navContact) navContact.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";

        // Update Mobile Bottom Nav Active state
        if (mNavHome) {
            mNavHome.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavHome.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        if (mNavComments) {
            mNavComments.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const indicator = mNavComments.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.remove('hidden');
        }
        if (mNavContact) {
            mNavContact.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavContact.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }

        renderComments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'contact') {
        if (homeView) homeView.classList.add('hidden');
        if (heroSection) heroSection.classList.add('hidden');
        if (commentsView) commentsView.classList.add('hidden');
        if (contactView) contactView.classList.remove('hidden');
        if (flipbookWrapper) flipbookWrapper.classList.add('hidden');

        if (navHome) navHome.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        if (navComments) navComments.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        if (navContact) navContact.className = "text-sm font-bold text-white hover:text-primary transition-colors";

        // Update Mobile Bottom Nav Active state
        if (mNavHome) {
            mNavHome.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavHome.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        if (mNavComments) {
            mNavComments.className = "m-nav-item flex flex-col items-center justify-center relative w-16 h-full text-slate-400";
            const indicator = mNavComments.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        if (mNavContact) {
            mNavContact.className = "m-nav-item active flex flex-col items-center justify-center relative w-16 h-full text-primary";
            const indicator = mNavContact.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.remove('hidden');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
        phone: phoneInput ? phoneInput.value : '',
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

    // Chunk active items into page sides of up to 2 items
    const pageSides = [];
    for (let i = 0; i < activeItems.length; i += 2) {
        pageSides.push(activeItems.slice(i, i + 2));
    }

    const P = pageSides.length;
    let totalPages = 1; // Start with Cover page

    if (P > 0) {
        // We render dynamic pages
        // Each book page (starting from ID 2) contains up to 2 page sides (front and back)
        const bookPages = [];
        for (let j = 0; j < P; j += 2) {
            bookPages.push({
                frontSide: pageSides[j],
                backSide: pageSides[j + 1] || null // null means unoccupied, will place Back Cover here
            });
        }

        bookPages.forEach((bp, index) => {
            const pageNum = index + 2;
            const pageElement = document.createElement('div');
            pageElement.className = 'book-page';
            pageElement.id = `book-page-${pageNum}`;

            // Create front side
            let frontItemsHtml = bp.frontSide.map(item => renderBookItemHtml(item, lang, currency)).join('');
            let frontHtml = `
                <div class="page-front p-6 md:p-8 bg-[#132f34] border-y-2 border-r-2 border-[#d4a17b]/40 rounded-r-3xl shadow-[8px_8px_0px_0px_#d4a17b] flex flex-col justify-between">
                    <div class="text-start flex-grow">
                        <div class="flex justify-between items-start mb-6 border-b border-[#d4a17b]/20 pb-4">
                            <div>
                                <span class="text-xs text-[#d4a17b] font-black uppercase tracking-wider">${lang === 'ar' ? 'اختياراتنا الخاصة' : 'SPECIAL SELECTIONS'}</span>
                                <h3 class="text-xl md:text-2xl font-black text-white font-serif mt-0.5">${lang === 'ar' ? 'قائمة الطعام الفاخرة' : 'Signature Menu Selections'}</h3>
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

            // Create back side
            let backHtml = '';
            if (bp.backSide) {
                // Render back items
                let backItemsHtml = bp.backSide.map(item => renderBookItemHtml(item, lang, currency)).join('');
                backHtml = `
                    <div class="page-back flex flex-col justify-between p-6 md:p-8 bg-[#0b272a] border-y-2 border-l-2 border-[#d4a17b]/40 rounded-l-3xl shadow-inner">
                        <div class="text-start flex-grow">
                            <div class="flex justify-between items-start mb-6 border-b border-[#d4a17b]/20 pb-4">
                                <div>
                                    <span class="text-xs text-[#d4a17b] font-black uppercase tracking-wider">${lang === 'ar' ? 'نكهات أصيلة' : 'AUTHENTIC FLAVORS'}</span>
                                    <h3 class="text-xl md:text-2xl font-black text-white font-serif mt-0.5">${lang === 'ar' ? 'أطباق السوشي المميزة' : 'Exquisite Sushi Plates'}</h3>
                                </div>
                            </div>
                            <div class="space-y-4">
                                ${backItemsHtml}
                            </div>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-[#d4a17b] font-bold border-t border-[#d4a17b]/20 pt-4">
                            <span>NORI &amp; RICE</span>
                            <span>PAGE ${pageNum * 2 - 1}</span>
                        </div>
                    </div>
                `;
            } else {
                // If bp.backSide is null, then the back side of this page is the Back Cover!
                backHtml = renderBackCoverHtml(lang);
            }

            pageElement.innerHTML = frontHtml + backHtml;
            book.appendChild(pageElement);
            totalPages = pageNum;
        });

        // If bp.backSide of the last page was NOT null (meaning P was even), we need one more page for Back Cover!
        if (P % 2 === 0) {
            const pageNum = bookPages.length + 2;
            const pageElement = document.createElement('div');
            pageElement.className = 'book-page';
            pageElement.id = `book-page-${pageNum}`;

            // Front side is promo
            let promoHtml = `
                <div class="page-front p-6 md:p-8 bg-[#132f34] border-y-2 border-r-2 border-[#d4a17b]/40 rounded-r-3xl shadow-[8px_8px_0px_0px_#d4a17b] flex flex-col justify-between">
                    <div class="my-auto text-center space-y-6">
                        <div class="w-16 h-16 bg-[#d4a17b]/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
                            <span class="material-symbols-outlined text-3xl">star</span>
                        </div>
                        <h3 class="text-2xl font-black text-white font-serif">${lang === 'ar' ? 'شاركنا رأيك' : 'Share Your Experience'}</h3>
                        <p class="text-xs text-slate-300 leading-relaxed max-w-[240px] mx-auto text-center">
                            ${lang === 'ar' ? 'رأيكم يهمنا ويسعدنا دائماً. شاركنا تجربتك الفريدة لمساعدتنا في تقديم الأفضل.' : 'Your feedback is highly valued. Share your luxury dining experience with us!'}
                        </p>
                        <button onclick="switchView('comments')" class="px-6 py-3 rounded-xl bg-primary text-[#0b272a] font-black text-xs border border-[#0b272a] shadow-[4px_4px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all mx-auto">
                            ${lang === 'ar' ? 'تصفح آراء العملاء' : 'Browse Guest Reviews'}
                        </button>
                    </div>
                    <div class="flex justify-between items-center text-[10px] text-[#d4a17b] font-bold border-t border-[#d4a17b]/20 pt-4">
                        <span>NORI &amp; RICE</span>
                        <span>PAGE ${pageNum * 2 - 2}</span>
                    </div>
                </div>
            `;

            // Back side is Back Cover
            let backHtml = renderBackCoverHtml(lang);

            pageElement.innerHTML = promoHtml + backHtml;
            book.appendChild(pageElement);
            totalPages = pageNum;
        }
    } else {
        // If there are no dynamic items, we still render a simple Page 2 with a friendly notice and back cover
        const pageElement = document.createElement('div');
        pageElement.className = 'book-page';
        pageElement.id = 'book-page-2';

        let frontHtml = `
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
        let backHtml = renderBackCoverHtml(lang);

        pageElement.innerHTML = frontHtml + backHtml;
        book.appendChild(pageElement);
        totalPages = 2;
    }

    // Update global state of total flipbook pages
    maxFlipbookPages = totalPages;

    // Trigger flipbook update to reset visual state
    updateFlipbook();
}

function renderBookItemHtml(item, lang, currency) {
    const name = lang === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name || item.name_ar);
    const desc = lang === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.description_ar);
    const imageSrc = item.images && item.images.length > 0 ? item.images[0] : '';

    const hasOptions = !!item.options;
    const buttonAction = hasOptions ? `openCustomizer('${item.id}')` : `addToOrderSimple('${item.id}')`;
    const buttonText = hasOptions ? (lang === 'ar' ? 'تخصيص' : 'Customize') : (lang === 'ar' ? 'إضافة' : 'Add');
    const buttonIcon = hasOptions ? 'tune' : 'shopping_basket';

    return `
        <div class="group flex gap-4 p-4 rounded-2xl bg-[#0b272a] border-2 border-[#d4a17b]/40 hover:shadow-[4px_4px_0px_0px_#d4a17b] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
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
                    <button onclick="${buttonAction}" class="px-3 py-1.5 rounded-xl bg-primary text-[#0b272a] font-black text-[9px] border border-[#0b272a] shadow-[2px_2px_0px_0px_#0b272a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1">
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
