/* ==========================================================================
   NORI & RICE - LUXURY SUSHI LOUNGE CORE APPLICATION ENGINE
   ========================================================================== */

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

// --- Shoppable 3D Flipbook State ---
let currentMenuMode = 'book';
let currentFlipbookPage = 1;
const maxFlipbookPages = 4;

// WhatsApp Contact (You can change it dynamically)
const RESTAURANT_WHATSAPP = "201012345678"; // Representative restaurant phone

// --- Category Unsplash Mapping (Ultra-Premium Visuals) ---
const categoryImages = {
    specialrolls: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=120&q=80",
    nigiri: "https://images.unsplash.com/photo-1633478062482-790e3b5dd810?auto=format&fit=crop&w=120&q=80",
    sashimi: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80",
    temaki: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=120&q=80",
    appetizers: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=120&q=80",
    drinks: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=120&q=80"
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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
}

// --- Categories Render System ---
function renderCategories() {
    const categoryContainer = document.getElementById('category-track');
    if (!categoryContainer) return;
    
    const lang = currentLanguage;
    
    // Unique list of categories in menu
    const uniqueCats = ['all', 'specialrolls', 'nigiri', 'sashimi', 'temaki', 'appetizers', 'drinks'];
    
    let html = '';
    uniqueCats.forEach(cat => {
        const isSelected = selectedCategory === cat;
        const catName = translations[lang][`filter_${cat}`] || cat;
        const imgUrl = categoryImages[cat] || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=120&q=80";
        
        html += `
            <div class="category-card ${isSelected ? 'active' : ''}" onclick="selectCategory('${cat}')">
                <div class="category-img-wrapper">
                    <img src="${imgUrl}" alt="${catName}">
                </div>
                <span class="category-title">${catName}</span>
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
    
    let filteredItems = sushiMenu;
    if (selectedCategory !== 'all') {
        filteredItems = sushiMenu.filter(item => item.category === selectedCategory);
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
        const name = lang === 'ar' ? item.name : item.name_en;
        const desc = lang === 'ar' ? item.description : item.description_en;
        const orderText = translations[lang].ordered_count.replace('{n}', item.timesOrdered || '40');
        
        // Check dynamic tags
        let tagsHtml = '';
        if (item.isPopular) {
            tagsHtml += `<span class="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">star</span>${translations[lang].tag_bestseller}</span>`;
        }
        if (item.isSpecial) {
            tagsHtml += `<span class="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-black flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">local_fire_department</span>${translations[lang].tag_special}</span>`;
        }

        // Check if there is discount
        let priceHtml = '';
        if (item.oldPrice) {
            const discountPct = Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100);
            priceHtml = `
                <div class="flex flex-col">
                    <span class="text-xs text-slate-500 line-through">${item.oldPrice} ${currency}</span>
                    <span class="text-2xl font-black text-primary">${item.price} <span class="text-xs font-bold">${currency}</span></span>
                </div>
                <span class="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black animate-pulse">-${discountPct}%</span>
            `;
        } else {
            priceHtml = `
                <div class="flex flex-col">
                    <span class="text-2xl font-black text-primary">${item.price} <span class="text-xs font-bold">${currency}</span></span>
                </div>
            `;
        }

        const buttonText = item.options ? translations[lang].btn_customize : translations[lang].btn_add_order;
        const buttonAction = item.options ? `openCustomizer('${item.id}')` : `addToOrderSimple('${item.id}')`;
        
        html += `
            <div class="glass-card overflow-hidden flex flex-col group animate-slide-up">
                <!-- Thumbnail -->
                <div class="relative aspect-[4/3] overflow-hidden cursor-pointer" onclick="openCustomizer('${item.id}')">
                    <img src="${item.images[0]}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                    
                    <!-- Overlay Top Badges -->
                    <div class="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                        <div class="flex flex-col gap-1.5">${tagsHtml}</div>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="p-5 flex-grow flex flex-col">
                    <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">${name}</h3>
                    <p class="text-sm text-slate-400 line-clamp-2 mb-4 flex-grow">${desc}</p>
                    
                    <!-- Popular ordering tracker info -->
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4 border-b border-white/5 pb-3">
                        <span class="material-symbols-outlined text-[13px]">visibility</span>
                        <span>${orderText}</span>
                    </div>
                    
                    <!-- Footer Actions -->
                    <div class="flex justify-between items-center mt-auto">
                        <div class="flex items-center gap-2">${priceHtml}</div>
                        
                        <button onclick="${buttonAction}" class="px-5 py-3 rounded-xl bg-primary hover:bg-white hover:text-black text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-300 active:scale-95 salmon-glow hover:shadow-white/10">
                            <span class="material-symbols-outlined text-sm">${item.options ? 'tune' : 'shopping_basket'}</span>
                            <span>${buttonText}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    menuContainer.innerHTML = html;
}

// --- Simple Item Add ---
function addToOrderSimple(itemId) {
    const item = sushiMenu.find(i => i.id === itemId);
    if (!item) return;
    
    const cartItem = {
        cartId: Date.now().toString(),
        id: item.id,
        name: currentLanguage === 'ar' ? item.name : item.name_en,
        price: item.price,
        quantity: 1,
        image: item.images[0],
        customizations: null
    };
    
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast(currentLanguage === 'ar' ? `تم إضافة ${item.name} إلى السلة 🍣` : `Added ${item.name_en} to basket 🍣`);
    toggleCart(true); // Open drawer automatically
}

// --- Customizer modal System ---
function openCustomizer(itemId) {
    const item = sushiMenu.find(i => i.id === itemId);
    if (!item) return;
    
    activeItemForCustomization = item;
    
    // Reset choices
    customizationChoices = {
        pieces: item.options.pieces ? item.options.pieces[0] : 8,
        rice: 'white',
        addons: []
    };
    
    const lang = currentLanguage;
    const modalOverlay = document.getElementById('customizer-modal');
    const container = document.getElementById('customizer-content');
    
    if (!modalOverlay || !container) return;
    
    const name = lang === 'ar' ? item.name : item.name_en;
    const desc = lang === 'ar' ? item.description : item.description_en;
    
    // 1. Piece options selector
    let piecesHtml = '';
    if (item.options.pieces) {
        piecesHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].piece_count}</label>
                <div class="flex gap-3">
                    ${item.options.pieces.map(pcs => `
                        <button onclick="selectCustomizerPiece(${pcs})" id="btn-pcs-${pcs}" class="option-chip ${customizationChoices.pieces === pcs ? 'active' : ''}">
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
            <div class="flex flex-col gap-2">
                ${riceOptions.map(opt => `
                    <div onclick="selectCustomizerRice('${opt.key}')" id="card-rice-${opt.key}" class="addon-card ${customizationChoices.rice === opt.key ? 'selected' : ''}">
                        <div class="flex items-center gap-3">
                            <div class="checkbox"></div>
                            <span class="text-sm font-bold text-white">${opt.label}</span>
                        </div>
                        ${opt.surcharge > 0 ? `<span class="text-xs text-primary font-black">+${opt.surcharge} ${translations[lang].price_currency}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 3. Premium Addons selector
    const addonOptions = [
        { key: 'creamcheese', label: translations[lang].addon_creamcheese, price: 20 },
        { key: 'avocado', label: translations[lang].addon_avocado, price: 15 },
        { key: 'tempura', label: translations[lang].addon_tempura, price: 10 },
        { key: 'spicymayo', label: translations[lang].addon_spicymayo, price: 10 },
        { key: 'caviar', label: translations[lang].addon_caviar, price: 40 }
    ];
    
    const addonsHtml = `
        <div class="mb-6">
            <label class="block text-sm font-bold text-slate-300 mb-3">${translations[lang].addons_title}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${addonOptions.map(opt => `
                    <div onclick="toggleCustomizerAddon('${opt.key}')" id="card-addon-${opt.key}" class="addon-card">
                        <div class="flex items-center gap-3">
                            <div class="checkbox"></div>
                            <span class="text-sm font-bold text-white">${opt.label}</span>
                        </div>
                        <span class="text-xs text-primary font-black">+${opt.price} ${translations[lang].price_currency}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = `
        <div class="flex flex-col md:flex-row h-full max-h-[85vh] md:max-h-[80vh]">
            <!-- Gallery Slider (Left side) -->
            <div class="md:w-[45%] relative h-56 md:h-auto overflow-hidden">
                <img src="${item.images[0]}" alt="${name}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div class="absolute bottom-5 left-5 right-5 z-10">
                    <h2 class="text-2xl font-black text-white mb-1">${name}</h2>
                    <p class="text-xs text-slate-300 line-clamp-2">${desc}</p>
                    ${item.ingredients ? `<p class="text-[10px] text-slate-400 mt-1.5"><span class="text-primary font-bold">المكونات:</span> ${item.ingredients}</p>` : `<p class="text-[10px] text-slate-400 mt-1.5"><span class="text-primary font-bold">المكونات:</span> سوشي ممتاز محضر بعناية ومكونات طازجة.</p>`}
                </div>
            </div>
            
            <!-- Customizer controls (Right side) -->
            <div class="md:w-[55%] p-6 md:p-8 flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-white">${translations[lang].customize_title}</h3>
                        <button onclick="closeCustomizer()" class="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
                            <span class="material-symbols-outlined text-white">close</span>
                        </button>
                    </div>
                    
                    ${piecesHtml}
                    ${riceHtml}
                    ${addonsHtml}
                </div>
                
                <!-- Bottom computation -->
                <div class="border-t border-white/5 pt-5 mt-4 flex items-center justify-between gap-6">
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400 uppercase tracking-widest font-bold">${translations[lang].cart_total}</span>
                        <span id="customizer-computed-price" class="text-3xl font-black text-secondary">0 ${translations[lang].price_currency}</span>
                    </div>
                    
                    <button onclick="addCustomizedToCart()" class="flex-grow py-4 rounded-2xl bg-primary hover:bg-white hover:text-black text-white font-bold text-base transition-all duration-300 active:scale-95 salmon-glow flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined">shopping_basket</span>
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

function selectCustomizerPiece(pcs) {
    customizationChoices.pieces = pcs;
    
    // Update visual elements
    activeItemForCustomization.options.pieces.forEach(p => {
        const btn = document.getElementById(`btn-pcs-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === pcs);
        }
    });
    
    updateCustomizerPrice();
}

function selectCustomizerRice(riceKey) {
    customizationChoices.rice = riceKey;
    
    ['white', 'brown', 'black'].forEach(k => {
        const card = document.getElementById(`card-rice-${k}`);
        if (card) {
            card.classList.toggle('selected', k === riceKey);
        }
    });
    
    updateCustomizerPrice();
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
        name: lang === 'ar' ? item.name : item.name_en,
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
    toggleCart(true);
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
                    <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] text-primary font-black">${cust.pieces} ${translations[lang].pieces}</span>
                    <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] text-secondary font-black">${cust.rice}</span>
                    ${cust.addons.map(ad => `<span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] text-slate-300 font-bold">${ad}</span>`).join('')}
                </div>
            `;
        }
        
        html += `
            <div class="flex gap-4 p-4 bg-white/2 border border-white/5 rounded-2xl animate-slide-up">
                <!-- Thumbnail -->
                <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                
                <!-- Details -->
                <div class="flex-grow">
                    <h4 class="text-sm font-bold text-white leading-tight">${item.name}</h4>
                    ${customHtml}
                    <div class="flex justify-between items-center mt-3">
                        <span class="text-sm font-black text-secondary">${item.price} ${currency}</span>
                        
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
                <span class="text-[9px] tracking-[4px] text-slate-400 mt-2">NORI-${tableCode}-${Math.floor(Math.random()*9000)+1000}</span>
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
    const ticketNo = `NR-B${bookingState.selectedTableId}-${Math.floor(Math.random()*89999)+10000}`;
    
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

// SPA Routing system for View switching (Menu vs Contact)
function switchView(viewName) {
    const homeView = document.getElementById('home-view');
    const contactView = document.getElementById('contact-view');
    const heroSection = document.getElementById('hero-section');
    
    const navHome = document.getElementById('nav-home');
    const navContact = document.getElementById('nav-contact');
    
    const mNavHome = document.getElementById('m-nav-home');
    const mNavContact = document.getElementById('m-nav-contact');
    
    if (viewName === 'home') {
        if (homeView) homeView.classList.remove('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
        if (contactView) contactView.classList.add('hidden');
        
        if (navHome) {
            navHome.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        }
        if (navContact) {
            navContact.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        }
        
        // Update Mobile Bottom Nav Active state
        if (mNavHome) {
            mNavHome.className = "m-nav-item active flex flex-col items-center justify-center relative w-20 h-full text-primary";
            const indicator = mNavHome.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.remove('hidden');
        }
        if (mNavContact) {
            mNavContact.className = "m-nav-item flex flex-col items-center justify-center relative w-20 h-full text-slate-400";
            const indicator = mNavContact.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'contact') {
        if (homeView) homeView.classList.add('hidden');
        if (heroSection) heroSection.classList.add('hidden');
        if (contactView) contactView.classList.remove('hidden');
        
        if (navHome) {
            navHome.className = "text-sm font-bold text-slate-400 hover:text-primary transition-colors";
        }
        if (navContact) {
            navContact.className = "text-sm font-bold text-white hover:text-primary transition-colors";
        }
        
        // Update Mobile Bottom Nav Active state
        if (mNavHome) {
            mNavHome.className = "m-nav-item flex flex-col items-center justify-center relative w-20 h-full text-slate-400";
            const indicator = mNavHome.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
        if (mNavContact) {
            mNavContact.className = "m-nav-item active flex flex-col items-center justify-center relative w-20 h-full text-primary";
            const indicator = mNavContact.querySelector('.m-nav-indicator');
            if (indicator) indicator.classList.remove('hidden');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
