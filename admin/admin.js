/**
 * Admin Panel Logic for Nori & Rice
 */

import {
    getMenuItems, saveMenuItem, deleteMenuItem, bulkSaveMenuItems,
    getCategories, saveCategory, deleteCategory,
    getOrders, updateOrderStatus, deleteOrder,
    getGlobalSettings, updateGlobalSettings,
    getTodayVisitors, getWhatsAppConversions, getQRScans,
    getActiveOffers, saveOffer, deleteOffer,
    getAllFeedback, updateFeedbackStatus, updateAdminPassword
} from '../database/services.js';
import { uploadToCloudinary } from '../js/cloudinary.js';

let currentData = [];
let categories = [];
let orders = [];
let feedback = [];
let currentOffers = [];
let selectedFiles = [];
let existingUrls = [];
let selectedOfferFile = null;
let existingOfferUrl = null;

let selectedCategoryFile = null;

const UPSELL_MAX_ITEMS = 6;
let upsellSelectedIds = [];
let upsellEnabled = true;

// Session Check
document.addEventListener('DOMContentLoaded', async () => {
    const session = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
    if (!session) {
        window.location.href = './index.html';
        return;
    }

    // Attach global functions to window for onclick handlers
    window.switchTab = switchTab;
    window.toggleSidebar = toggleSidebar;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.openOfferModal = openOfferModal;
    window.closeOfferModal = closeOfferModal;
    window.handleOfferImageSelect = handleOfferImageSelect;
    window.editItem = editItem;
    window.editOffer = editOffer;
    window.deleteItem = deleteItem;
    window.deleteOffer = handleDeleteOffer;
    window.toggleAvailability = toggleAvailability;
    window.handleAddCategory = handleAddCategory;
    window.handleDeleteCategory = handleDeleteCategory;
    window.handleImageSelection = handleImageSelection;
    window.removeImage = removeImage;
    window.calculateDiscountPrice = calculateDiscountPrice;
    window.calculateDiscountPercentage = calculateDiscountPercentage;
    window.addTypeTag = addTypeTag;
    window.removeTypeTag = removeTypeTag;
    window.addCustomVariant = addCustomVariant;
    window.toggleOrderDropdown = toggleOrderDropdown;
    window.reorderCategory = reorderCategory;
    window.filterMenuItemsByCategory = filterMenuItemsByCategory;
window.openAddonModal = openAddonModal;
window.closeAddonModal = closeAddonModal;
window.saveAddon = saveAddon;
    window.saveSettings = saveSettings;
    window.saveUpsellSettings = saveUpsellSettings;
    window.renderUpsellManager = renderUpsellManager;
    window.refreshUpsellMenuList = refreshUpsellMenuList;
    window.toggleUpsellItem = toggleUpsellItem;
    window.moveUpsellItem = moveUpsellItem;
    window.downloadQRCode = downloadQRCode;
    window.logout = logout;
    window.toggleNotifications = toggleNotifications;
    window.updateOrderStatusHandler = updateOrderStatusHandler;
    window.deleteOrderHandler = deleteOrderHandler;
    window.printOrderInvoice = printOrderInvoice;
    window.toggleFeedbackStatus = toggleFeedbackStatus;
    window.handleCategoryImageSelect = handleCategoryImageSelect;
    window.markAllNotificationsAsRead = markAllNotificationsAsRead;
    window.viewOrderDetails = viewOrderDetails;

    document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('offer-form').addEventListener('submit', handleOfferFormSubmit);

    const upsellSearch = document.getElementById('upsell-search');
    if (upsellSearch) {
        upsellSearch.addEventListener('input', () => renderUpsellManager());
    }

    const upsellGrid = document.getElementById('upsell-items-grid');
    if (upsellGrid && !upsellGrid.dataset.bound) {
        upsellGrid.dataset.bound = 'true';
        upsellGrid.addEventListener('click', (e) => {
            const row = e.target.closest('[data-upsell-pick]');
            if (!row) return;
            const itemId = row.getAttribute('data-upsell-pick');
            if (itemId) toggleUpsellItem(itemId);
        });
    }

    // Initial Load
    await refreshData();
    switchTab('dashboard');

    // Init Drag and Drop for Categories if Sortable is available
    initCategorySorting();
});

function logout() {
    localStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_session');
    window.location.href = './index.html';
}

function toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

function updateNotifications() {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const readNotifs = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    const unreadPending = pendingOrders.filter(o => !readNotifs.includes(o.id));

    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-items-list');

    if (badge) {
        if (unreadPending.length > 0) {
            badge.innerText = unreadPending.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (list) {
        if (unreadPending.length === 0) {
            list.innerHTML = `
                <div class="p-6 text-center text-slate-400 dark:text-slate-500 font-bold text-xs">
                    لا توجد تنبيهات جديدة
                </div>
            `;
        } else {
            list.innerHTML = unreadPending.map(ord => {
                const dateStr = new Date(ord.createdAt).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
                return `
                    <div class="p-4 hover:bg-slate-50 dark:hover:bg-white/5 flex gap-3 items-start transition-colors cursor-pointer" onclick="window.switchTab('orders'); window.toggleNotifications();">
                        <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-sm">shopping_cart</span>
                        </div>
                        <div class="flex-grow">
                            <p class="text-xs font-bold">طلب جديد من "${ord.customerName || 'زبون'}"</p>
                            <p class="text-[10px] text-slate-400 mt-1">${dateStr} • بقيمة ${ord.total || 0} جم</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function markAllNotificationsAsRead() {
    const pendingIds = orders.filter(o => o.status === 'pending').map(o => o.id);
    localStorage.setItem('read_notifications', JSON.stringify(pendingIds));
    updateNotifications();
    showNotification('تم تحديد كل الإشعارات كمقروءة ✔️');
}

async function refreshData() {
    showNotification('جاري تحديث البيانات... ⏳');
    try {
        const [menuItems, cats, ords, feed, settings, visitors, whatsapp, qrScans, offers] = await Promise.all([
            getMenuItems(),
            getCategories(),
            getOrders(),
            getAllFeedback(),
            getGlobalSettings(),
            getTodayVisitors(),
            getWhatsAppConversions(),
            getQRScans(),
            getActiveOffers()
        ]);

        currentData = menuItems || [];
        categories = cats || [];
        currentOffers = offers || [];
        orders = ords || [];
        feedback = feed || [];
        window.nori_categories = categories; // Global cache for reordering

        // Update Stats
        document.getElementById('stat-visitors').innerText = visitors || 0;
        document.getElementById('stat-items').innerText = currentData.length;
        document.getElementById('stat-qr-scans').innerText = qrScans || 0;
        document.getElementById('stat-whatsapp-main').innerText = whatsapp || 0;

        // Render UI
        renderCategories(categories);
        renderMenuGrid();
        renderOffersGrid();
        populateOfferItemSelect();
        renderOrders();
        renderFeedback();
        updateNotifications();
        if (settings) {
            populateSettingsForm(settings);
            upsellEnabled = settings.upsellEnabled !== false;
            upsellSelectedIds = Array.isArray(settings.upsellItemIds) ? [...settings.upsellItemIds] : [];
            if (upsellSelectedIds.length === 0) {
                upsellSelectedIds = currentData.filter(i => i.isUpsell).map(i => getMenuItemDocId(i)).filter(Boolean);
            }
            window.noriUpsellIds = upsellSelectedIds;
        }

        const upsellTab = document.getElementById('content-upsell');
        if (upsellTab && !upsellTab.classList.contains('hidden')) {
            openUpsellTab();
        }

        // Generate QR Code
        generateQRCode();

    } catch (error) {
        console.error("Error refreshing data:", error);
        showNotification('فشل تحديث البيانات ❌', 'error');
    }
}

function showNotification(msg, type = 'success') {
    const existing = document.getElementById('admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = `fixed bottom-10 left-10 z-[1000] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-bottom-5 duration-300 ${
        type === 'success' ? 'bg-[#c18c64] text-white shadow-amber-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
    }`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${msg}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-5');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * --- TABS & NAVIGATION ---
 */
function switchTab(tabId) {
    const tabs = ['dashboard', 'orders', 'menu', 'offers', 'upsell', 'qrcode', 'settings'];
    tabs.forEach(t => {
        const content = document.getElementById(`content-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        const mobileBtn = document.getElementById(`mobile-tab-${t}`);

        if (content) content.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        if (mobileBtn) mobileBtn.classList.remove('text-primary');
    });

    const activeContent = document.getElementById(`content-${tabId}`);
    const activeBtn = document.getElementById(`tab-${tabId}`);
    const activeMobileBtn = document.getElementById(`mobile-tab-${tabId}`);

    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');
    if (activeMobileBtn) activeMobileBtn.classList.add('text-primary');

    // Title updates
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (titleEl) {
        const titles = {
            dashboard: 'لوحة التحكم',
            orders: 'إدارة الطلبات',
            menu: 'إدارة المنيو',
            offers: 'إدارة العروض',
            upsell: 'إضافات مقترحة',
            qrcode: 'كود QR',
            settings: 'إعدادات النظام'
        };
        titleEl.innerText = titles[tabId] || 'لوحة التحكم';
    }

    if (tabId === 'upsell') {
        openUpsellTab();
    }

    if (window.innerWidth < 1024) toggleSidebar(true);
}

function escapeAdminHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getMenuItemDocId(item) {
    return item?.id || item?.internalId || null;
}

function findMenuItemByDocId(itemId) {
    return currentData.find(i => getMenuItemDocId(i) === itemId);
}

/**
 * --- UPSELL MANAGER (customer popup after add to cart) ---
 */
async function ensureUpsellMenuLoaded() {
    if (currentData && currentData.length > 0) return currentData;
    try {
        const items = await getMenuItems();
        currentData = items || [];
        return currentData;
    } catch (e) {
        console.error('Failed to load menu for upsell:', e);
        return [];
    }
}

async function refreshUpsellMenuList() {
    try {
        currentData = await getMenuItems() || [];
        renderUpsellManager();
        showNotification(`تم تحميل ${currentData.length} وجبة من المنيو`);
    } catch (e) {
        console.error(e);
        showNotification('تعذر تحميل المنيو', 'error');
    }
}

async function openUpsellTab() {
    const grid = document.getElementById('upsell-items-grid');
    if (grid) {
        grid.innerHTML = '<p class="col-span-full text-center text-slate-400 font-bold py-16">جاري تحميل الأطباق...</p>';
    }
    await ensureUpsellMenuLoaded();
    renderUpsellManager();
}

function renderUpsellManager() {
    const grid = document.getElementById('upsell-items-grid');
    const preview = document.getElementById('upsell-selected-preview');
    const countEl = document.getElementById('upsell-selected-count');
    const availableEl = document.getElementById('upsell-available-count');
    const enabledEl = document.getElementById('upsell-enabled');
    const searchEl = document.getElementById('upsell-search');

    if (!grid || !preview) return;

    if (enabledEl) enabledEl.checked = upsellEnabled;

    const query = (searchEl?.value || '').trim().toLowerCase();
    const allItems = (currentData || []).filter(item => getMenuItemDocId(item));

    const items = allItems.filter(item => {
        if (!query) return true;
        const ar = (item.name_ar || item.name || '').toLowerCase();
        const en = (item.name_en || item.name || '').toLowerCase();
        return ar.includes(query) || en.includes(query);
    });

    if (countEl) countEl.textContent = upsellSelectedIds.length;
    if (availableEl) availableEl.textContent = allItems.length;

    preview.innerHTML = upsellSelectedIds.length === 0
        ? `<p class="col-span-full text-center text-xs text-slate-400 font-bold py-6">لم تختر أي وجبة بعد — اضغط على الأطباق بالأسفل</p>`
        : upsellSelectedIds.map((id, index) => {
            const item = findMenuItemByDocId(id);
            if (!item) return '';
            const name = escapeAdminHtml(item.name_ar || item.name || '—');
            const img = escapeAdminHtml(item.images?.[0] || '../asseat/only logo remove background.png');
            const safeId = escapeAdminHtml(id);
            return `
                <div class="relative rounded-2xl overflow-hidden border-2 border-primary/40 bg-white dark:bg-slate-800 shadow-md">
                    <img src="${img}" class="w-full h-20 object-cover" alt="">
                    <div class="p-2">
                        <p class="text-[10px] font-black line-clamp-2 leading-tight">${name}</p>
                        <div class="flex justify-between mt-2 gap-1">
                            <button type="button" onclick="moveUpsellItem('${safeId}', -1)" class="flex-1 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-black" ${index === 0 ? 'disabled opacity-40' : ''}>↑</button>
                            <button type="button" onclick="moveUpsellItem('${safeId}', 1)" class="flex-1 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-black" ${index === upsellSelectedIds.length - 1 ? 'disabled opacity-40' : ''}>↓</button>
                            <button type="button" onclick="toggleUpsellItem('${safeId}')" class="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-black">×</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    if (allItems.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 px-4">
                <span class="material-symbols-outlined text-4xl text-slate-300 mb-3">restaurant_menu</span>
                <p class="text-slate-500 font-bold mb-4">لا توجد وجبات في المنيو بعد</p>
                <button type="button" onclick="switchTab('menu'); openModal();" class="btn-primary px-6 py-3 rounded-xl text-sm">إضافة وجبة للمنيو</button>
            </div>
        `;
        return;
    }

    if (items.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-slate-400 font-bold py-12">لا توجد نتائج لهذا البحث</p>';
        return;
    }

    grid.innerHTML = items.map(item => {
        const docId = getMenuItemDocId(item);
        const selected = upsellSelectedIds.includes(docId);
        const name = escapeAdminHtml(item.name_ar || item.name || '—');
        const img = escapeAdminHtml(item.images?.[0] || '../asseat/only logo remove background.png');
        const category = escapeAdminHtml(item.category || '');
        const disabled = !selected && upsellSelectedIds.length >= UPSELL_MAX_ITEMS;
        return `
            <div role="button" tabindex="0" data-upsell-pick="${escapeAdminHtml(docId)}"
                class="text-right p-4 rounded-2xl border-2 transition-all flex gap-3 items-center cursor-pointer select-none ${selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-200 dark:border-white/10 hover:border-primary/40 bg-white dark:bg-slate-800'} ${disabled ? 'opacity-40 pointer-events-none' : ''}">
                <img src="${img}" class="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100" alt="" loading="lazy">
                <div class="flex-grow min-w-0">
                    <p class="font-black text-sm leading-tight">${name}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${item.price || 0} جم · ${category}</p>
                </div>
                <span class="material-symbols-outlined text-2xl shrink-0 ${selected ? 'text-primary' : 'text-slate-300'}">${selected ? 'check_circle' : 'add_circle'}</span>
            </div>
        `;
    }).join('');
}

function toggleUpsellItem(itemId) {
    const idx = upsellSelectedIds.indexOf(itemId);
    if (idx >= 0) {
        upsellSelectedIds.splice(idx, 1);
    } else {
        if (upsellSelectedIds.length >= UPSELL_MAX_ITEMS) {
            showNotification(`الحد الأقصى ${UPSELL_MAX_ITEMS} أصناف في نافذة الإضافات`, 'error');
            return;
        }
        upsellSelectedIds.push(itemId);
    }
    renderUpsellManager();
}

function moveUpsellItem(itemId, direction) {
    const idx = upsellSelectedIds.indexOf(itemId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= upsellSelectedIds.length) return;
    const [removed] = upsellSelectedIds.splice(idx, 1);
    upsellSelectedIds.splice(newIdx, 0, removed);
    renderUpsellManager();
}

async function saveUpsellSettings() {
    const enabledEl = document.getElementById('upsell-enabled');
    upsellEnabled = enabledEl ? enabledEl.checked : true;

    try {
        await updateGlobalSettings({
            upsellEnabled,
            upsellItemIds: [...upsellSelectedIds],
            updatedAt: new Date().toISOString()
        });

        window.noriUpsellIds = [...upsellSelectedIds];
        showNotification('تم حفظ الإضافات المقترحة بنجاح');
        renderMenuGrid();
    } catch (e) {
        console.error(e);
        showNotification('فشل الحفظ', 'error');
    }
}

function toggleSidebar(forceClose = false) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isClosed = sidebar.classList.contains('translate-x-full');

    if (forceClose || !isClosed) {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden', 'opacity-0');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        document.body.style.overflow = 'hidden';
    }
}

/**
 * --- RENDERING ---
 */

function renderMenuGrid() {
    const grid = document.getElementById('menu-items-grid');
    if (!grid) return;

    if (currentData.length === 0) {
        const template = document.getElementById('empty-state-template');
        grid.innerHTML = template ? template.innerHTML : '<p class="text-center w-full py-10">لا توجد وجبات حالياً</p>';
        return;
    }

    // Sort by Category order, then Item order
    const catMap = new Map(categories.map(c => [c.name, c.order || 999]));
    const sortedItems = [...currentData].sort((a, b) => {
        const catA = catMap.get(a.category) ?? 999;
        const catB = catMap.get(b.category) ?? 999;
        if (catA !== catB) return catA - catB;
        return (a.order || 999) - (b.order || 999);
    });

    grid.innerHTML = sortedItems.map(item => `
        <div class="premium-card flex flex-col justify-between group overflow-hidden" data-category="${item.category}">
            <div class="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src="${item.images?.[0] || '../asseat/only logo.jpg'}" alt="${item.name_ar}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                
                <div class="absolute top-4 right-4 flex flex-wrap items-center gap-1.5 justify-end max-w-[85%]">
                    <span class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-[#c18c64] dark:text-secondary text-[9px] font-black px-2.5 py-1 rounded-xl shadow-md border border-white/10">
                        ${item.category}
                    </span>
                    ${item.featured ? `
                        <span class="bg-amber-500 text-[#0b272a] text-[9px] font-black px-2 py-1 rounded-xl shadow-md flex items-center gap-0.5">
                            <span class="material-symbols-outlined text-[12px] font-black">star</span> مميز
                        </span>
                    ` : ''}
                    ${(window.noriUpsellIds || []).includes(item.id) ? `
                        <span class="bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-xl shadow-md flex items-center gap-0.5">
                            <span class="material-symbols-outlined text-[12px] font-black">shopping_cart</span> إضافة مقترحة
                        </span>
                    ` : ''}
                </div>

                <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div>
                        <h3 class="text-white font-bold text-lg leading-tight drop-shadow">${item.name_ar}</h3>
                        <p class="text-slate-300 text-xs font-medium tracking-wide mt-0.5">${item.name}</p>
                    </div>
                    <div class="text-left bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
                        ${item.oldPrice ? `<p class="text-slate-300 line-through text-[10px] font-bold">${item.oldPrice} جم</p>` : ''}
                        <p class="text-amber-400 font-black text-lg">${item.price} <span class="text-xs font-bold">جم</span></p>
                    </div>
                </div>
            </div>

            <div class="p-6 space-y-4 flex-grow flex flex-col justify-between bg-white dark:bg-slate-900/50">
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    ${item.description_ar || item.description || 'لا يوجد وصف متاح لهذه الوجبة.'}
                </p>

                <!-- Options Summary Tags -->
                <div class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50 dark:border-white/5">
                    ${item.options?.sizes?.map(s => `<span class="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">${typeof s === 'string' ? s : s.name}</span>`).join('') || ''}
                    ${item.options?.methods?.map(m => `<span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">${typeof m === 'string' ? m : m.name}</span>`).join('') || ''}
                    ${item.options?.types?.map(t => `<span class="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">${t}</span>`).join('') || ''}
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5 gap-2">
                    <div class="flex items-center gap-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" onchange="toggleAvailability('${item.id}', this.checked)" class="sr-only peer" ${item.isAvailable !== false ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[#c18c64]"></div>
                        </label>
                        <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">${item.isAvailable !== false ? 'متاح للطلب' : 'غير متوفر'}</span>
                    </div>

                    <div class="flex gap-1.5">
                        <button onclick="editItem('${item.id}')" class="w-9 h-9 bg-slate-50 hover:bg-[#c18c64] hover:text-white dark:bg-white/5 dark:hover:bg-[#c18c64] text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onclick="deleteItem('${item.id}')" class="w-9 h-9 bg-rose-50 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-500 text-rose-500 rounded-xl flex items-center justify-center transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<div class="p-10 text-center text-slate-400 font-bold">لا توجد طلبات حالياً</div>';
        return;
    }

    tbody.innerHTML = orders.map(ord => {
        const dateStr = new Date(ord.createdAt).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
        const itemsList = ord.items?.map(i => `${i.name || i.name_ar} (x${i.quantity || 1})`).join(' + ') || 'عناصر مجمعة';

        return `
            <!-- Mobile Card View -->
            <div class="md:hidden p-6 border-b border-slate-100 dark:border-white/5 space-y-4 bg-white dark:bg-slate-900/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" onclick="viewOrderDetails('${ord.id}')">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300">#${ord.id.slice(-6)}</span>
                        <span class="text-[10px] text-slate-400 font-bold">${dateStr}</span>
                    </div>
                    <span class="material-symbols-outlined text-slate-400">chevron_left</span>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">${ord.customerName || 'زبون'}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${ord.customerPhone || ord.phone || ''} • ${ord.customerAddress || ord.address || 'بدون عنوان'}</p>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">${itemsList}</p>
                    ${ord.notes ? `<p class="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg">ملاحظة: ${ord.notes}</p>` : ''}
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5">
                    <div>
                        <span class="text-[10px] text-slate-400 font-black block uppercase">الإجمالي</span>
                        <span class="text-base font-black text-[#c18c64] dark:text-secondary">${ord.totalPrice || ord.total || 0} جم</span>
                    </div>
                    <div class="flex gap-2" onclick="event.stopPropagation()">
                        <button onclick="printOrderInvoice('${ord.id}')" class="px-3 py-2 bg-emerald-50 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center gap-1 transition-all shadow-sm text-xs font-black">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                        </button>
                        <button onclick="deleteOrderHandler('${ord.id}')" class="w-9 h-9 bg-rose-50 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Desktop Row View -->
            <div class="hidden md:grid grid-cols-5 items-center px-10 py-6 hover:bg-[#c18c64]/5 dark:hover:bg-[#c18c64]/5 transition-colors bg-white dark:bg-slate-900/50 cursor-pointer group" onclick="viewOrderDetails('${ord.id}')">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300">#${ord.id.slice(-6)}</span>
                    </div>
                    <span class="text-[11px] text-slate-400 font-bold mt-1">${dateStr}</span>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#c18c64] transition-colors">${ord.customerName || 'زبون'}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${ord.customerPhone || ord.phone || ''}</p>
                    <p class="text-[11px] text-slate-400 truncate max-w-[200px]" title="${ord.customerAddress || ord.address || ''}">${ord.customerAddress || ord.address || 'بدون عنوان'}</p>
                </div>
                <div class="pr-4">
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">${itemsList}</p>
                    ${ord.notes ? `<p class="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium bg-amber-50 dark:bg-amber-500/10 p-1.5 rounded-lg inline-block">ملاحظة: ${ord.notes}</p>` : ''}
                </div>
                <div class="font-black text-lg text-[#c18c64] dark:text-secondary pr-4">
                    ${ord.totalPrice || ord.total || 0} <span class="text-xs font-bold">جم</span>
                </div>
                <div class="flex items-center gap-3 pr-4" onclick="event.stopPropagation()">
                    <button onclick="viewOrderDetails('${ord.id}')" class="px-4 py-2.5 bg-[#c18c64]/10 hover:bg-[#c18c64] hover:text-white text-[#c18c64] rounded-xl flex items-center gap-1.5 transition-all shadow-sm text-xs font-black" title="تفاصيل العميل">
                        <span class="material-symbols-outlined text-[18px]">person_search</span>
                        <span>تفاصيل</span>
                    </button>
                    <button onclick="printOrderInvoice('${ord.id}')" class="w-10 h-10 bg-emerald-50 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center transition-all shadow-sm" title="طباعة الفاتورة">
                        <span class="material-symbols-outlined text-[20px]">print</span>
                    </button>
                    <button onclick="deleteOrderHandler('${ord.id}')" class="w-10 h-10 bg-rose-50 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center transition-all shadow-sm" title="حذف الطلب">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewOrderDetails(orderId) {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    // Get customer previous orders
    const customerPhone = ord.customerPhone || ord.phone || '';
    const customerOrders = orders.filter(o => (o.customerPhone || o.phone) === customerPhone);
    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);

    const itemsHtml = ord.items?.map(i => {
        let details = [];
        if (i.customizations?.size) details.push(`الحجم: ${i.customizations.size}`);
        if (i.customizations?.method) details.push(`الطريقة: ${i.customizations.method}`);
        if (i.customizations?.pieces) details.push(`${i.customizations.pieces} قطع`);
        if (i.customizations?.addons?.length) details.push(`إضافات: ${i.customizations.addons.join(', ')}`);
        return `
            <div class="flex justify-between items-start py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
                <div>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">${i.name || i.name_ar}</p>
                    ${details.length ? `<p class="text-[11px] text-slate-400 mt-0.5">${details.join(' | ')}</p>` : ''}
                </div>
                <div class="text-left">
                    <span class="text-xs font-bold text-slate-500">x${i.quantity || 1}</span>
                    <p class="text-sm font-black text-[#c18c64]">${(i.price || 0) * (i.quantity || 1)} جم</p>
                </div>
            </div>
        `;
    }).join('') || '<p class="text-slate-400 text-sm">لا يوجد تفاصيل</p>';

    const prevOrdersHtml = customerOrders.length > 1 ? customerOrders
        .filter(o => o.id !== orderId)
        .slice(0, 5)
        .map(o => {
            const d = new Date(o.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
            const items = o.items?.map(i => i.name || i.name_ar).join(', ') || '';
            return `
                <div class="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                    <div>
                        <p class="text-xs font-bold text-slate-600 dark:text-slate-300">${d}</p>
                        <p class="text-[11px] text-slate-400 truncate max-w-[200px]">${items}</p>
                    </div>
                    <span class="text-xs font-black text-[#c18c64]">${o.totalPrice || o.total || 0} جم</span>
                </div>
            `;
        }).join('') : '<p class="text-[11px] text-slate-400 py-2">أول طلب لهذا العميل</p>';

    const modal = document.createElement('div');
    modal.id = 'order-details-modal';
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-3xl">
                <div>
                    <h2 class="text-lg font-black text-slate-900 dark:text-white">تفاصيل الطلب #${ord.id.slice(-6)}</h2>
                    <p class="text-xs text-slate-400 font-bold mt-0.5">${new Date(ord.createdAt).toLocaleString('ar-EG')}</p>
                </div>
                <button onclick="document.getElementById('order-details-modal').remove()" class="w-10 h-10 bg-slate-50 dark:bg-white/5 hover:bg-red-50 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Customer Info -->
            <div class="p-6 border-b border-slate-100 dark:border-white/5">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">بيانات العميل</p>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-[#c18c64]/10 rounded-2xl flex items-center justify-center">
                        <span class="text-xl font-black text-[#c18c64]">${(ord.customerName || 'Z').charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-black text-slate-900 dark:text-white">${ord.customerName || 'زبون'}</h3>
                        <p class="text-xs text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">phone</span>
                            ${customerPhone || 'رقم غير متوفر'}
                        </p>
                        <p class="text-xs text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">location_on</span>
                            ${ord.customerAddress || ord.address || 'بدون عنوان'}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mt-4">
                    <div class="bg-[#c18c64]/5 rounded-2xl p-3 text-center">
                        <p class="text-xl font-black text-[#c18c64]">${customerOrders.length}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي الطلبات</p>
                    </div>
                    <div class="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-3 text-center">
                        <p class="text-xl font-black text-emerald-600">${totalSpent} جم</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي الإنفاق</p>
                    </div>
                </div>
            </div>

            <!-- Order Items -->
            <div class="p-6 border-b border-slate-100 dark:border-white/5">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">تفاصيل هذا الطلب</p>
                ${itemsHtml}
                <div class="flex justify-between items-center pt-3 mt-1">
                    <span class="text-sm font-black text-slate-600 dark:text-slate-300">المجموع الكلي</span>
                    <span class="text-xl font-black text-[#c18c64]">${ord.totalPrice || ord.total || 0} جم</span>
                </div>
                ${ord.notes ? `<div class="mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3 rounded-xl"><p class="text-xs text-amber-700 dark:text-amber-400 font-bold">📝 ملاحظة: ${ord.notes}</p></div>` : ''}
            </div>

            <!-- Previous Orders -->
            <div class="p-6">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">الطلبات السابقة لنفس العميل</p>
                ${prevOrdersHtml}
            </div>

            <div class="p-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button onclick="printOrderInvoice('${ord.id}'); document.getElementById('order-details-modal').remove()" class="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-colors">
                    <span class="material-symbols-outlined text-[18px]">print</span> طباعة الفاتورة
                </button>
                <button onclick="deleteOrderHandler('${ord.id}'); document.getElementById('order-details-modal').remove()" class="px-4 py-3 bg-rose-50 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 text-rose-500 rounded-2xl font-black text-sm transition-colors">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>
        </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

async function updateOrderStatusHandler(orderId, newStatus) {
    showNotification('جاري تحديث حالة الطلب... ⏳');
    const success = await updateOrderStatus(orderId, newStatus);
    if (success) {
        showNotification('تم تحديث حالة الطلب بنجاح ✨');
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) orders[idx].status = newStatus;
        renderOrders();
        updateNotifications();
    } else {
        showNotification('فشل تحديث الحالة ❌', 'error');
    }
}

async function deleteOrderHandler(orderId) {
    showConfirm(
        'حذف الطلب؟',
        'هل أنت متأكد من حذف هذا الطلب نهائياً من السجل؟',
        async () => {
            const success = await deleteOrder(orderId);
            if (success) {
                showNotification('تم حذف الطلب بنجاح 🗑️');
                orders = orders.filter(o => o.id !== orderId);
                renderOrders();
                updateNotifications();
            } else {
                showNotification('فشل حذف الطلب ❌', 'error');
            }
        }
    );
}

function renderFeedback() {
    const list = document.getElementById('comments-list');
    if (!list) return;

    if (feedback.length === 0) {
        list.innerHTML = '<div class="p-10 text-center text-slate-400 font-bold">لا توجد تعليقات حتى الآن</div>';
        return;
    }

    list.innerHTML = feedback.map(fb => {
        const dateStr = new Date(fb.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
        const stars = Array(5).fill(0).map((_, i) => `
            <span class="material-symbols-outlined text-base ${i < (fb.rating || 5) ? 'text-amber-400 fill-current' : 'text-slate-200 dark:text-slate-700'}">star</span>
        `).join('');

        return `
            <div class="p-6 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:border-[#c18c64]/20">
                <div class="space-y-3 flex-grow">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-[#c18c64]/10 text-[#c18c64] dark:text-secondary font-black flex items-center justify-center text-sm shadow-inner">
                            ${fb.name ? fb.name.charAt(0).toUpperCase() : 'Z'}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-slate-900 dark:text-white">${fb.name || 'زائر كريم'}</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">${fb.phone || fb.phoneNumber || 'رقم غير متوفر'}</p>
                            <div class="flex flex-wrap items-center gap-2 mt-2">
                                <div class="flex gap-0.5">${stars}</div>
                                <span class="text-[10px] text-slate-400 font-bold">${fb.rating || 0}/5</span>
                                <span class="text-[10px] text-slate-400 font-bold">• ${dateStr}</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                        "${fb.text || 'بدون نص'}"
                    </p>
                </div>
                <div class="flex items-center justify-between md:justify-end w-full md:w-auto pt-4 md:pt-0 border-t border-slate-100 dark:border-white/5 md:border-none gap-4">
                    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" onchange="toggleFeedbackStatus('${fb.id}', this.checked)" class="sr-only peer" ${fb.showOnHome ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                        </label>
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${fb.showOnHome ? 'مميز بالرئيسية' : 'إخفاء من الرئيسية'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleFeedbackStatus(feedbackId, status) {
    showNotification('جاري التحديث... ⏳');
    try {
        await updateFeedbackStatus(feedbackId, status);
        showNotification(status ? 'تم تمييز التعليق بالرئيسية 🌟' : 'تم إخفاء التعليق من الرئيسية 👁️‍🗨️');
        const idx = feedback.findIndex(f => f.id === feedbackId);
        if (idx !== -1) feedback[idx].showOnHome = status;
    } catch (e) {
        showNotification('فشل تحديث حالة التعليق ❌', 'error');
    }
}

/**
 * --- SETTINGS MANAGEMENT ---
 */

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

function populateSettingsForm(settings) {
    const fields = ['whatsapp', 'phone', 'social_fb', 'social_insta', 'social_tiktok', 'address_ar', 'startTime', 'endTime'];
    fields.forEach(f => {
        const el = document.getElementById(`setting-${f}`);
        if (el) {
            if (settings[f] !== undefined && settings[f] !== "undefined") {
                el.value = settings[f];
            } else {
                el.value = '';
            }
        }
    });
}

async function saveSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    try {
        btn.disabled = true;
        btn.innerText = 'جاري الحفظ... ⏳';

        const settingsData = {
            whatsapp: formatPhoneNumber(document.getElementById('setting-whatsapp').value),
            phone: formatPhoneNumber(document.getElementById('setting-phone').value),
            social_fb: document.getElementById('setting-social_fb').value,
            social_insta: document.getElementById('setting-social_insta').value,
            social_tiktok: document.getElementById('setting-social_tiktok').value,
            address_ar: document.getElementById('setting-address_ar').value,
            startTime: document.getElementById('setting-startTime').value,
            endTime: document.getElementById('setting-endTime').value,
            updatedAt: new Date().toISOString()
        };

        // Format hours string for frontend
        if (settingsData.startTime && settingsData.endTime) {
            settingsData.hours_ar = `يومياً من ${formatTime(settingsData.startTime)} إلى ${formatTime(settingsData.endTime)}`;
            settingsData.hours_en = `Daily from ${formatTimeEn(settingsData.startTime)} to ${formatTimeEn(settingsData.endTime)}`;
        }

        await updateGlobalSettings(settingsData);

        // Check if password change requested
        const newPass = document.getElementById('setting-new-password').value;
        if (newPass && newPass.trim().length > 0) {
            btn.innerText = 'جاري تحديث كلمة المرور... 🔒';
            const session = JSON.parse(localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session') || '{}');
            const currentUser = session.username || 'admin';
            const passSuccess = await updateAdminPassword(currentUser, newPass);
            if (passSuccess) {
                showNotification('تم تحديث الإعدادات وكلمة المرور بنجاح ✨');
                document.getElementById('setting-new-password').value = '';
            } else {
                showNotification('تم حفظ الإعدادات ولكن فشل تحديث كلمة المرور ⚠️', 'error');
            }
        } else {
            showNotification('تم حفظ الإعدادات بنجاح ✨');
        }

    } catch (error) {
        console.error(error);
        showNotification('حدث خطأ أثناء حفظ الإعدادات ❌', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function formatTime(timeStr) {
    let [h, m] = timeStr.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'مساءً' : 'صباحاً';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
}

function formatTimeEn(timeStr) {
    let [h, m] = timeStr.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
}

/**
 * --- WATERMARKING ---
 */
function applyWatermark(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Limit maximum dimension to 1000px to save storage/bandwidth (Free Plan Optimization)
            const MAX_DIM = 1000;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                } else {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const wm = new Image();
            wm.src = "../asseat/only logo remove background.png";
            wm.onload = () => {
                const wmWidth = canvas.width * 0.22;
                const wmHeight = (wm.height / wm.width) * wmWidth;
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 10;
                ctx.drawImage(wm, canvas.width - wmWidth - 25, canvas.height - wmHeight - 25, wmWidth, wmHeight);
                ctx.restore();

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.75); // Compressed JPEG to 75% quality for excellent visual balance and tiny file size!
            };
            wm.onerror = () => resolve(file); // fallback
        };
        img.onerror = () => resolve(file);
    });
}

/**
 * --- QR CODE GENERATOR ---
 */

function generateQRCode() {
    const container = document.getElementById('qrcode-container');
    const mobileContainer = document.getElementById('qrcode-container-mobile');
    
    if (!container && !mobileContainer) return;
    
    if (container) container.innerHTML = "";
    if (mobileContainer) mobileContainer.innerHTML = "";

    let menuUrl;
    try {
        menuUrl = new URL('../index.html?ref=qr', window.location.href).href;
    } catch {
        menuUrl = `${window.location.origin}/index.html?ref=qr`;
    }

    const urlHint = document.getElementById('qr-menu-url-hint');
    if (urlHint) urlHint.textContent = menuUrl;

    const qr = new QRCode(document.createElement('div'), {
        text: menuUrl,
        width: 1024,
        height: 1024,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const qrCanvas = qr._el.querySelector('canvas');
        if (!qrCanvas) return;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 1024;
        finalCanvas.height = 1024;
        const ctx = finalCanvas.getContext('2d');
        const size = finalCanvas.width;

        const modules = qr._oQRCode.modules;
        const moduleCount = modules.length;
        const moduleSize = size / moduleCount;

        ctx.fillStyle = "#0f172a";
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#0f172a";

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules[row][col]) {
                    const isEye = (row < 7 && col < 7) || (row < 7 && col > moduleCount - 8) || (row > moduleCount - 8 && col < 7);

                    if (isEye) {
                        if ((row === 0 && col === 0) || (row === 0 && col === moduleCount - 7) || (row === moduleCount - 7 && col === 0)) {
                            drawCornerEye(ctx, col * moduleSize, row * moduleSize, moduleSize * 7);
                        }
                    } else {
                        const x = col * moduleSize + moduleSize / 2;
                        const y = row * moduleSize + moduleSize / 2;
                        const radius = moduleSize * 0.4;

                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.src = "../asseat/only logo remove background.png";
        logo.onload = () => {
            const logoSize = size * 0.25;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;

            ctx.fillStyle = "white";
            drawRoundedRect(ctx, x, y, logoSize, logoSize, 20);
            ctx.drawImage(logo, x, y, logoSize, logoSize);

            const img = document.createElement('img');
            img.src = finalCanvas.toDataURL("image/png");
            img.style.width = "100%";
            
            if (container) {
                const imgDesktop = img.cloneNode(true);
                container.innerHTML = '';
                container.appendChild(imgDesktop);
                container.dataset.finalQr = imgDesktop.src;
            }
            if (mobileContainer) {
                const imgMobile = img.cloneNode(true);
                mobileContainer.innerHTML = '';
                mobileContainer.appendChild(imgMobile);
                mobileContainer.dataset.finalQr = imgMobile.src;
            }
        };
    }, 100);
}

function drawCornerEye(ctx, x, y, size) {
    const thickness = size / 7;
    ctx.fillStyle = "#0f172a";
    drawRoundedRect(ctx, x, y, size, size, size * 0.25);
    ctx.fillStyle = "white";
    drawRoundedRect(ctx, x + thickness, y + thickness, size - thickness * 2, size - thickness * 2, size * 0.15);
    ctx.fillStyle = "#0f172a";
    drawRoundedRect(ctx, x + thickness * 2, y + thickness * 2, size - thickness * 4, size - thickness * 4, size * 0.1);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

function downloadQRCode(type = 'desktop') {
    const id = type === 'mobile' ? 'qrcode-container-mobile' : 'qrcode-container';
    const container = document.getElementById(id);
    if (!container) return;
    
    const finalData = container.dataset.finalQr;
    if (!finalData) return;

    const link = document.createElement('a');
    link.download = 'nori-rice-qr.png';
    link.href = finalData;
    link.click();
}

function updateOrderDropdown(category, currentOrder = null) {
    const select = document.getElementById('item-order');
    if (!select) return;

    const itemsInCat = currentData.filter(i => i.category === category);
    const count = itemsInCat.length;
    const isEditing = document.getElementById('item-id').value;
    const max = isEditing ? count : count + 1;

    select.innerHTML = '<option value="">تلقائي (في النهاية)</option>';
    for (let i = 1; i <= Math.max(max, 1); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.innerText = `الترتيب رقم ${i}`;
        if (currentOrder == i) option.selected = true;
        select.appendChild(option);
    }
}

function openModal() {
    selectedFiles = [];
    existingUrls = [];
    document.getElementById('item-id').value = '';
    document.getElementById('item-form').reset();
    document.getElementById('modal-title').innerText = 'إضافة وجبة جديدة';
    document.getElementById('image-previews').innerHTML = '';
    const featuredEl = document.getElementById('item-featured');
    if (featuredEl) featuredEl.checked = false;
    document.getElementById('item-discount-pct').value = '';
    const hasDiscountEl = document.getElementById('item-has-discount');
    if (hasDiscountEl) hasDiscountEl.checked = false;
    const discountFieldsEl = document.getElementById('discount-fields');
    if (discountFieldsEl) discountFieldsEl.classList.add('hidden');
    updateOrderDropdown(document.getElementById('item-category').value);

    document.querySelectorAll('.custom-variant-label').forEach(el => el.remove());

    document.querySelectorAll('#options-sizes-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.parentElement.querySelector('.variant-price').value = '';
    });
    document.querySelectorAll('#options-methods-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.parentElement.querySelector('.variant-price').value = '';
    });
    currentTypeTags = [];
    renderTypeTags();

    document.getElementById('item-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('item-modal').classList.add('hidden'); }

// Addon modal functions
function openAddonModal(addon = null) {
    // Reset form fields safely
    const addonForm = document.getElementById('addon-form');
    if (addonForm) addonForm.reset();
    document.getElementById('addon-id').value = '';
    document.getElementById('addon-modal-title').innerText = addon ? 'تعديل إضافة مميزة' : 'إضافة إضافة مميزة';
    if (addon) {
        document.getElementById('addon-id').value = addon.id || '';
        document.getElementById('addon-name-ar').value = addon.nameAr || '';
        document.getElementById('addon-name-en').value = addon.nameEn || '';
        document.getElementById('addon-price').value = addon.price || '';
    }
    document.getElementById('addon-modal').classList.remove('hidden');
}
function closeAddonModal() {
    document.getElementById('addon-modal').classList.add('hidden');
}
function saveAddon(e) {
    e.preventDefault();
    const id = document.getElementById('addon-id').value;
    const nameAr = document.getElementById('addon-name-ar').value;
    const nameEn = document.getElementById('addon-name-en').value;
    const price = document.getElementById('addon-price').value;
    // Simple UI update: add item to list
    const list = document.getElementById('addons-list');
    if (list) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center p-2 border-b border-gray-200';
        itemDiv.innerHTML = `<span>${nameAr || nameEn}</span><span>${price} جم</span>`;
        list.appendChild(itemDiv);
    }
    console.log('Saving addon', { id, nameAr, nameEn, price });
    closeAddonModal();
    // TODO: persist to backend / local storage
}



async function handleFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    // Validation
    const nameAr = document.getElementById('item-name-ar').value.trim();
    const category = document.getElementById('item-category').value;
    const price = document.getElementById('item-price').value;
    
    if (!nameAr) {
        showNotification('يرجى إدخال اسم الوجبة بالعربي', 'error');
        return;
    }
    if (!category) {
        showNotification('يرجى اختيار القسم', 'error');
        return;
    }
    if (!price) {
        showNotification('يرجى إدخال السعر', 'error');
        return;
    }
    if (existingUrls.length === 0 && selectedFiles.length === 0) {
        showNotification('يرجى إضافة صورة واحدة على الأقل للوجبة', 'error');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = 'جاري رفع الصور...';

        let finalUrls = [...existingUrls];

        for (const file of selectedFiles) {
            submitBtn.innerText = `جاري معالجة الصور...`;
            const watermarkedFile = await applyWatermark(file);
            submitBtn.innerText = `جاري رفع الصور...`;
            const url = await uploadToCloudinary(watermarkedFile);
            finalUrls.push(url);
        }

        const id = document.getElementById('item-id').value;

        const selectedSizes = Array.from(document.querySelectorAll('#options-sizes-container input[type="checkbox"]:checked')).map(cb => {
            const val = cb.parentElement.querySelector('.variant-price').value;
            return { name: cb.value, price: val ? parseFloat(val) : null };
        });
        const selectedMethods = Array.from(document.querySelectorAll('#options-methods-container input[type="checkbox"]:checked')).map(cb => {
            const val = cb.parentElement.querySelector('.variant-price').value;
            return { name: cb.value, price: val ? parseFloat(val) : null };
        });

        const itemData = {
            name_ar: document.getElementById('item-name-ar').value,
            name: document.getElementById('item-name-en').value,
            category: document.getElementById('item-category').value,
            price: parseFloat(document.getElementById('item-price').value),
            oldPrice: document.getElementById('item-has-discount')?.checked && document.getElementById('item-old-price').value ? parseFloat(document.getElementById('item-old-price').value) : null,
            images: finalUrls,
            description_ar: document.getElementById('item-desc-ar').value,
            description: document.getElementById('item-desc-ar').value,
            ingredients_ar: document.getElementById('item-ingredients-ar').value,
            showOnHome: true,
            featured: document.getElementById('item-featured')?.checked || false,
            options: {
                sizes: selectedSizes,
                methods: selectedMethods,
                types: (document.getElementById('item-options-types')?.value || '').split(',').map(s => s.trim()).filter(s => s)
            },
            order: parseInt(document.getElementById('item-order').value) || 999,
            updatedAt: new Date().toISOString()
        };

        if (id) itemData.id = id;
        else {
            submitBtn.innerText = 'جاري تهيئة البيانات...';
            itemData.id = await saveMenuItem(itemData);
        }

        submitBtn.innerText = 'جاري ترتيب القائمة...';
        const newOrder = parseInt(document.getElementById('item-order').value);
        let categoryItems = currentData.filter(i => i.category === itemData.category && i.id !== itemData.id);

        categoryItems.sort((a, b) => (a.order || 999) - (b.order || 999));

        if (!isNaN(newOrder)) {
            categoryItems.splice(newOrder - 1, 0, itemData);
        } else {
            categoryItems.push(itemData);
        }

        const itemsToUpdate = categoryItems.map((item, index) => ({
            ...item,
            order: index + 1,
            updatedAt: new Date().toISOString()
        }));

        await bulkSaveMenuItems(itemsToUpdate);
        showNotification('تم حفظ البيانات وترتيب القائمة بنجاح ✨');
        closeModal();
        await refreshData();
    } catch (error) {
        console.error(error);
        showNotification('حدث خطأ أثناء الرفع أو الحفظ ❌', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

function handleImageSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        selectedFiles = [files[0]]; // Only keep the newest selected file
        existingUrls = []; // Clear any previously saved image
        updatePreviews();
    }
}

function removeImage(index, isExisting = false) {
    if (isExisting) {
        existingUrls.splice(index, 1);
    } else {
        selectedFiles.splice(index, 1);
    }
    updatePreviews();
}

function updatePreviews() {
    const container = document.getElementById('image-previews');
    if (!container) return;
    container.innerHTML = '';

    existingUrls.forEach((url, i) => {
        const div = document.createElement('div');
        div.className = "relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm";
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover">
            <button onclick="removeImage(${i}, true)" class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-xs">close</span>
            </button>
        `;
        container.appendChild(div);
    });

    selectedFiles.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div');
        div.className = "relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary shadow-sm animate-pulse-slow";
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover">
            <button onclick="removeImage(${i}, false)" class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-xs">close</span>
            </button>
            <div class="absolute inset-0 bg-primary/10 pointer-events-none"></div>
            <div class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-white text-[8px] font-black rounded uppercase shadow-sm">جديد</div>
        `;
        container.appendChild(div);
    });
}

function editItem(id) {
    const item = currentData.find(i => i.id === id);
    if (!item) return;

    openModal();

    document.getElementById('modal-title').innerText = 'تعديل الوجبة';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name-ar').value = item.name_ar || '';
    document.getElementById('item-name-en').value = item.name || '';
    document.getElementById('item-category').value = item.category || '';
    document.getElementById('item-price').value = item.price || 0;
    document.getElementById('item-old-price').value = item.oldPrice || '';

    const hasDiscountEl = document.getElementById('item-has-discount');
    const discountFieldsEl = document.getElementById('discount-fields');
    if (item.oldPrice && item.price && item.oldPrice > item.price) {
        const pct = Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100);
        document.getElementById('item-discount-pct').value = pct;
        if (hasDiscountEl) hasDiscountEl.checked = true;
        if (discountFieldsEl) discountFieldsEl.classList.remove('hidden');
    } else {
        document.getElementById('item-discount-pct').value = '';
        if (hasDiscountEl) hasDiscountEl.checked = false;
        if (discountFieldsEl) discountFieldsEl.classList.add('hidden');
    }

    document.getElementById('item-desc-ar').value = item.description_ar || item.description || '';
    document.getElementById('item-ingredients-ar').value = item.ingredients_ar || '';
    const featuredEl = document.getElementById('item-featured');
    if (featuredEl) featuredEl.checked = item.featured || false;
    updateOrderDropdown(item.category, item.order);

    if (item.options) {
        if (item.options.sizes) {
            item.options.sizes.forEach(sizeObj => {
                const sizeName = typeof sizeObj === 'string' ? sizeObj : sizeObj.name;
                const sizePrice = typeof sizeObj === 'object' ? sizeObj.price : null;

                let cb = document.querySelector(`#options-sizes-container input[value="${sizeName}"]`);
                if (!cb) {
                    injectVariantDOM('sizes', sizeName, sizePrice);
                } else {
                    cb.checked = true;
                    if (sizePrice !== null) {
                        cb.parentElement.querySelector('.variant-price').value = sizePrice;
                    }
                }
            });
        }
        if (item.options.methods) {
            item.options.methods.forEach(methodObj => {
                const methodName = typeof methodObj === 'string' ? methodObj : methodObj.name;
                const methodPrice = typeof methodObj === 'object' ? methodObj.price : null;

                let cb = document.querySelector(`#options-methods-container input[value="${methodName}"]`);
                if (!cb) {
                    injectVariantDOM('methods', methodName, methodPrice);
                } else {
                    cb.checked = true;
                    if (methodPrice !== null) {
                        cb.parentElement.querySelector('.variant-price').value = methodPrice;
                    }
                }
            });
        }
        currentTypeTags = item.options.types ? [...item.options.types] : [];
    } else {
        currentTypeTags = [];
    }
    renderTypeTags();

    existingUrls = [...(item.images || [])];
    updatePreviews();
}

/**
 * --- CATEGORY MANAGEMENT ---
 */

function renderCategories(categories = []) {
    const list = document.getElementById('categories-list');
    const filterBar = document.getElementById('admin-menu-filters');
    const select = document.getElementById('item-category');

    if (list && Array.isArray(categories)) {
        list.innerHTML = categories.map((cat, index) => `
            <div class="category-chip relative" data-id="${cat.id}">
                <div class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl hover:border-[#c18c64] transition-all shadow-sm group min-w-max">
                    <button onclick="window.toggleOrderDropdown(event, '${cat.id}')" class="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg text-[11px] font-black text-[#c18c64] dark:text-secondary hover:bg-[#c18c64] hover:text-white transition-all shadow-inner">
                        ${index + 1}
                    </button>
                    
                    <div id="dropdown-${cat.id}" class="order-dropdown hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div class="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-3xl shadow-2xl border border-white dark:border-white/10 p-6 scale-in-center">
                            <div class="flex justify-between items-center mb-6">
                                <div>
                                    <h4 class="text-sm font-black text-slate-900 dark:text-white">ترتيب القسم</h4>
                                    <p class="text-[10px] text-slate-400 font-bold mt-0.5">اختر المكان الجديد لـ "${cat.name}"</p>
                                </div>
                                <button onclick="window.toggleOrderDropdown(event, '${cat.id}')" class="text-slate-400 hover:text-rose-500 transition-colors">
                                    <span class="material-symbols-outlined text-[24px]">close</span>
                                </button>
                            </div>
                            <div class="grid grid-cols-4 gap-3">
                                ${categories.map((_, i) => `
                                    <button onclick="window.reorderCategory('${cat.id}', ${i})" class="aspect-square flex items-center justify-center rounded-2xl text-xs font-black transition-all ${i === index ? 'bg-[#c18c64] text-white shadow-lg shadow-amber-500/30' : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-[#c18c64]/10 hover:text-[#c18c64]'}">
                                        ${i + 1}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    ${cat.image ? `<img src="${cat.image}" class="w-7 h-7 rounded-lg object-cover ml-1 shadow-sm border border-slate-100 dark:border-white/10">` : ''}
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">${cat.name}</span>
                    <button onclick="handleDeleteCategory('${cat.id}')" class="text-slate-300 hover:text-rose-500 transition-colors mr-2">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    if (filterBar && Array.isArray(categories)) {
        const allBtn = `
            <div class="admin-filter-btn-wrapper flex items-center bg-[#c18c64] rounded-xl shadow-lg shadow-amber-500/20 overflow-hidden min-w-max">
                <button onclick="filterMenuItemsByCategory('all')" class="admin-filter-btn whitespace-nowrap px-6 py-2.5 text-[10px] font-black transition-all text-white" data-category="all">
                    الكل
                </button>
            </div>
        `;

        const categoryBtns = categories.map(cat => `
            <div class="admin-filter-btn-wrapper flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden min-w-max">
                <button onclick="filterMenuItemsByCategory('${cat.name}')" class="admin-filter-btn whitespace-nowrap px-5 py-2.5 text-[10px] font-black transition-all text-slate-600 dark:text-slate-300" data-category="${cat.name}">
                    ${cat.name}
                </button>
            </div>
        `).join('');

        filterBar.innerHTML = allBtn + categoryBtns;
    }

    if (select && Array.isArray(categories)) {
        select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

function populateOfferItemSelect() {
    const select = document.getElementById('offer-item-id');
    if (!select) return;

    const options = currentData.map(item => {
        const label = `${item.name_ar || item.name || 'بدون اسم'} - ${item.category || 'عام'}`;
        return `<option value="${item.id}">${label}</option>`;
    });

    select.innerHTML = [`<option value="">اختيار وجبة</option>`, ...options].join('');
}

function renderOffersGrid() {
    const grid = document.getElementById('offers-grid');
    if (!grid) return;

    if (!currentOffers.length) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 opacity-50">
                <span class="material-symbols-outlined text-6xl mb-4">local_offer</span>
                <p class="text-lg font-black">لا توجد عروض حالياً</p>
                <p class="text-sm text-slate-500">أضف عرض جديد ليظهر للعملاء فور فتح الموقع.</p>
            </div>
        `;
        return;
    }

    const now = new Date().toISOString();
    grid.innerHTML = currentOffers.map(offer => {
        const item = currentData.find(menu => menu.id === offer.itemId);
        const itemName = item ? item.name_ar || item.name : 'وجبة غير معروفة';
        const expiryLabel = offer.expiryDate && offer.expiryDate > now ? `ينتهي ${new Date(offer.expiryDate).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'منتهي';
        return `
            <div class="premium-card bg-white dark:bg-slate-900 p-0 overflow-hidden border border-slate-100 dark:border-white/10 shadow-xl">
                <div class="relative overflow-hidden h-64">
                    <img src="${offer.imageUrl || item?.images?.[0] || '../asseat/only logo.jpg'}" alt="${offer.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
                    <span class="absolute top-4 left-4 bg-amber-500 text-[#0b272a] text-[11px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-2xl shadow-lg">عرض حصري</span>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <h3 class="text-xl font-black text-slate-900 dark:text-white mb-2">${offer.title}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">الوجبة: ${itemName}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                            <p class="text-xs uppercase font-black text-slate-400">السعر قبل العرض</p>
                            <p class="text-lg font-black text-slate-900 dark:text-white">${offer.oldPrice ? offer.oldPrice + ' جم' : '-'} </p>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                            <p class="text-xs uppercase font-black text-slate-400">السعر بعد العرض</p>
                            <p class="text-lg font-black text-primary">${offer.newPrice} جم</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <span class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">${expiryLabel}</span>
                        <div class="flex gap-2">
                            <button onclick="editOffer('${offer.id}')" class="px-4 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg">تعديل</button>
                            <button onclick="deleteOffer('${offer.id}')" class="px-4 py-3 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg">حذف</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openOfferModal(offer = null) {
    selectedOfferFile = null;
    existingOfferUrl = null;
    document.getElementById('offer-form').reset();
    document.getElementById('offer-id').value = '';
    document.getElementById('offer-image-preview').innerHTML = `<span class="material-symbols-outlined text-slate-300 text-3xl">image</span>`;
    document.getElementById('offer-modal-title').innerText = offer ? 'تعديل العرض الترويجي' : 'إضافة عرض ترويجي';
    populateOfferItemSelect();

    if (offer) {
        document.getElementById('offer-id').value = offer.id;
        document.getElementById('offer-title').value = offer.title || '';
        document.getElementById('offer-description').value = offer.description || '';
        document.getElementById('offer-item-id').value = offer.itemId || '';
        document.getElementById('offer-expiry').value = offer.expiryDate ? offer.expiryDate.slice(0, 16) : '';
        document.getElementById('offer-old-price').value = offer.oldPrice || '';
        document.getElementById('offer-new-price').value = offer.newPrice || '';
        document.getElementById('offer-btn-text').value = offer.btnText || 'اطلب العرض الآن';
        if (offer.imageUrl) {
            existingOfferUrl = offer.imageUrl;
            document.getElementById('offer-image-preview').innerHTML = `<img src="${offer.imageUrl}" class="w-full h-full object-cover rounded-2xl">`;
        }
    }

    document.getElementById('offer-modal').classList.remove('hidden');
}

function closeOfferModal() {
    document.getElementById('offer-modal').classList.add('hidden');
}

function handleOfferImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    selectedOfferFile = file;
    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('offer-image-preview').innerHTML = `<img src="${reader.result}" class="w-full h-full object-cover rounded-2xl">`;
    };
    reader.readAsDataURL(file);
}

async function handleOfferFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = 'جاري حفظ العرض...';

        let imageUrl = existingOfferUrl || '';
        if (selectedOfferFile) {
            submitBtn.innerText = 'جاري رفع صورة العرض...';
            imageUrl = await uploadToCloudinary(selectedOfferFile);
        }

        const offerId = document.getElementById('offer-id').value;
        const offerData = {
            title: document.getElementById('offer-title').value.trim(),
            description: document.getElementById('offer-description').value.trim(),
            itemId: document.getElementById('offer-item-id').value || null,
            expiryDate: document.getElementById('offer-expiry').value || null,
            oldPrice: document.getElementById('offer-old-price').value ? parseFloat(document.getElementById('offer-old-price').value) : null,
            newPrice: parseFloat(document.getElementById('offer-new-price').value),
            btnText: document.getElementById('offer-btn-text').value.trim() || 'اطلب العرض الآن',
            imageUrl: imageUrl,
            updatedAt: new Date().toISOString()
        };
        if (offerId) {
            offerData.id = offerId;
        }

        const savedId = await saveOffer(offerData);
        offerData.id = savedId;
        showNotification('تم حفظ العرض بنجاح ✨');
        closeOfferModal();
        await refreshData();
    } catch (error) {
        console.error(error);
        showNotification('فشل حفظ العرض ❌', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

async function handleDeleteOffer(id) {
    if (!confirm('هل تريد حذف هذا العرض؟')) return;
    try {
        await deleteOffer(id);
        showNotification('تم حذف العرض بنجاح');
        await refreshData();
    } catch (error) {
        console.error(error);
        showNotification('فشل حذف العرض ❌', 'error');
    }
}

async function editOffer(id) {
    const offer = currentOffers.find(o => o.id === id);
    if (!offer) return;
    openOfferModal(offer);
}

function filterMenuItemsByCategory(category) {
    const grid = document.getElementById('menu-items-grid');
    if (!grid) return;

    const items = grid.querySelectorAll('.premium-card');
    const buttons = document.querySelectorAll('.admin-filter-btn');

    buttons.forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('bg-[#c18c64]', 'text-white', 'border-[#c18c64]', 'shadow-lg', 'shadow-amber-500/20');
            btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        } else {
            btn.classList.remove('bg-[#c18c64]', 'text-white', 'border-[#c18c64]', 'shadow-lg', 'shadow-amber-500/20');
            btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        }
    });

    items.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'all' || itemCategory === category) {
            item.style.display = 'flex';
            item.classList.add('animate-in');
        } else {
            item.style.display = 'none';
        }
    });
}

function handleCategoryImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        selectedCategoryFile = file;
        const statusEl = document.getElementById('category-image-status');
        if (statusEl) {
            statusEl.innerText = 'تم اختيار صورة 📸';
            statusEl.classList.add('text-[#c18c64]', 'dark:text-secondary');
        }
    }
}

async function handleAddCategory() {
    const nameInput = document.getElementById('new-category-name');
    const name = nameInput.value.trim();

    if (!name) return;

    const submitBtn = document.querySelector('button[onclick="handleAddCategory()"]');
    const originalBtnHtml = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin material-symbols-outlined text-[16px] md:text-[20px]">sync</span><span>جاري الإضافة...</span>';

        let imageUrl = null;
        if (selectedCategoryFile) {
            showNotification('جاري ضغط ومعالجة صورة القسم... ⏳');
            const compressedFile = await applyWatermark(selectedCategoryFile);
            showNotification('جاري رفع صورة القسم... ☁️');
            imageUrl = await uploadToCloudinary(compressedFile);
        }

        const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1;
        
        const categoryData = { name, order: nextOrder };
        if (imageUrl) {
            categoryData.image = imageUrl;
        }

        await saveCategory(categoryData);
        showNotification('تم إضافة القسم الجديد بنجاح ✅');
        
        nameInput.value = '';
        selectedCategoryFile = null;
        const statusEl = document.getElementById('category-image-status');
        if (statusEl) {
            statusEl.innerText = 'صورة القسم';
            statusEl.classList.remove('text-[#c18c64]', 'dark:text-secondary');
        }
        document.getElementById('category-image-upload').value = '';

        await refreshData();
    } catch (e) {
        console.error("Error adding category:", e);
        showNotification('حدث خطأ أثناء إضافة القسم', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    modal.classList.remove('hidden');

    const closeModal = () => modal.classList.add('hidden');

    document.getElementById('confirm-cancel').onclick = closeModal;
    document.getElementById('confirm-proceed').onclick = async () => {
        const btn = document.getElementById('confirm-proceed');
        const originalText = btn.innerText;
        btn.innerText = 'جاري...';
        btn.disabled = true;

        try {
            await onConfirm();
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            closeModal();
        }
    };
}

async function handleDeleteCategory(id) {
    showConfirm(
        'حذف القسم؟',
        'حذف هذا القسم قد يؤثر على الوجبات المرتبطة به. هل أنت متأكد؟',
        async () => {
            try {
                await deleteCategory(id);
                showNotification('تم حذف القسم بنجاح 🗑️');
                await refreshData();
            } catch (e) {
                showNotification('حدث خطأ أثناء الحذف', 'error');
            }
        }
    );
}

async function deleteItem(id) {
    showConfirm(
        'حذف الوجبة؟',
        'هل أنت متأكد من حذف هذه الوجبة نهائياً؟ لا يمكن التراجع عن هذا الفعل.',
        async () => {
            try {
                await deleteMenuItem(id);
                showNotification('تم حذف الوجبة نهائياً 🗑️');
                await refreshData();
            } catch (error) {
                console.error(error);
                showNotification('حدث خطأ أثناء الحذف ❌', 'error');
            }
        }
    );
}

function calculateDiscountPrice() {
    const oldPrice = parseFloat(document.getElementById('item-old-price').value) || 0;
    const discountPct = parseFloat(document.getElementById('item-discount-pct').value) || 0;
    const priceInput = document.getElementById('item-price');

    if (oldPrice > 0) {
        if (discountPct > 0) {
            const finalPrice = oldPrice - (oldPrice * (discountPct / 100));
            priceInput.value = Math.round(finalPrice);
        } else {
            priceInput.value = oldPrice;
        }
    }
}

function calculateDiscountPercentage() {
    const oldPrice = parseFloat(document.getElementById('item-old-price').value) || 0;
    const finalPrice = parseFloat(document.getElementById('item-price').value) || 0;
    const pctInput = document.getElementById('item-discount-pct');

    if (oldPrice > 0 && finalPrice > 0 && oldPrice > finalPrice) {
        const pct = ((oldPrice - finalPrice) / oldPrice) * 100;
        pctInput.value = Math.round(pct);
    } else if (oldPrice === finalPrice) {
        pctInput.value = 0;
    }
}

async function toggleAvailability(id, status) {
    try {
        await saveMenuItem({ id, isAvailable: status, available: status });
        showNotification(status ? 'الوجبة متاحة الآن ✨' : 'الوجبة غير متاحة حالياً 🛑');
        const idx = currentData.findIndex(i => i.id === id);
        if (idx !== -1) {
            currentData[idx].isAvailable = status;
            renderMenuGrid();
        }
    } catch (e) {
        showNotification('فشل تحديث الحالة', 'error');
        // Revert the checkbox on failure
        renderMenuGrid();
    }
}

let currentTypeTags = [];
function renderTypeTags() {
    const container = document.getElementById('types-tags-container');
    if (!container) return;
    container.innerHTML = '';
    currentTypeTags.forEach((tag, index) => {
        container.innerHTML += `
            <div class="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                ${tag}
                <button type="button" onclick="removeTypeTag(${index})" class="hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded-full w-4 h-4 flex justify-center items-center transition-colors">
                    <span class="material-symbols-outlined text-[12px]">close</span>
                </button>
            </div>
        `;
    });
    document.getElementById('item-options-types').value = currentTypeTags.join(',');
}
function addTypeTag() {
    const input = document.getElementById('type-input');
    const val = input.value.trim();
    if (val && !currentTypeTags.includes(val)) {
        currentTypeTags.push(val);
        input.value = '';
        renderTypeTags();
    }
}
function removeTypeTag(index) {
    currentTypeTags.splice(index, 1);
    renderTypeTags();
}

function addCustomVariant(type) {
    const nameInput = document.getElementById(type === 'sizes' ? 'custom-size-name' : 'custom-method-name');
    const priceInput = document.getElementById(type === 'sizes' ? 'custom-size-price' : 'custom-method-price');
    const name = nameInput.value.trim();
    const price = priceInput.value;

    if (!name) return;

    injectVariantDOM(type, name, price);

    nameInput.value = '';
    priceInput.value = '';
    nameInput.focus();
}

function injectVariantDOM(type, name, price) {
    const container = document.getElementById(type === 'sizes' ? 'options-sizes-container' : 'options-methods-container');
    const color = type === 'sizes' ? 'sky' : 'primary';

    if (document.querySelector(`#${container.id} input[value="${name}"]`)) return;

    const label = document.createElement('label');
    label.className = `custom-variant-label relative flex items-stretch bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden has-[:checked]:border-${color}-500 has-[:checked]:ring-1 has-[:checked]:ring-${color}-500 transition-all shadow-sm`;
    label.innerHTML = `
        <input type="checkbox" value="${name}" class="peer sr-only" checked>
        <span class="cursor-pointer px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 peer-checked:text-white peer-checked:bg-${color}-500 transition-colors flex items-center gap-1">
           ${name}
           <span onclick="this.parentElement.parentElement.remove()" class="material-symbols-outlined text-[16px] hover:text-red-300 ml-1 transition-colors relative top-px">close</span>
        </span>
        <input type="number" placeholder="${type === 'sizes' ? 'السعر' : '+ ج.م'}" value="${price !== null ? price : ''}" onclick="event.stopPropagation()" class="variant-price hidden peer-checked:block w-20 px-2 text-[11px] font-bold bg-slate-50 dark:bg-slate-900 border-none outline-none dark:text-white text-center border-r border-slate-200 dark:border-white/10">
    `;

    container.appendChild(label);
}

function toggleOrderDropdown(event, id) {
    event.preventDefault();
    event.stopPropagation();
    const allDropdowns = document.querySelectorAll('.order-dropdown');
    allDropdowns.forEach(d => {
        if (d.id !== `dropdown-${id}`) d.classList.add('hidden');
    });
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

async function reorderCategory(catId, newIndex) {
    let cats = [...(window.nori_categories || [])];
    const oldIndex = cats.findIndex(c => c.id === catId);
    if (oldIndex === -1 || oldIndex === newIndex) {
        document.querySelectorAll('.order-dropdown').forEach(d => d.classList.add('hidden'));
        return;
    }

    const [movedItem] = cats.splice(oldIndex, 1);
    cats.splice(newIndex, 0, movedItem);
    window.nori_categories = cats;
    renderCategories(cats);

    document.querySelectorAll('.order-dropdown').forEach(d => d.classList.add('hidden'));
    showNotification('جاري الحفظ... ⏳');

    try {
        const updates = cats.map((cat, index) => saveCategory({ id: cat.id, order: index }));
        await Promise.all(updates);
        showNotification('تم تحديث الترتيب بنجاح ✨');
        const freshCats = await getCategories();
        window.nori_categories = freshCats;
        renderCategories(freshCats);
    } catch (e) {
        showNotification('فشل الحفظ', 'error');
        refreshData();
    }
}

function initCategorySorting() {
    const list = document.getElementById('categories-list');
    if (list && typeof Sortable !== 'undefined') {
        Sortable.create(list, {
            animation: 150,
            ghostClass: 'opacity-50',
            onEnd: async () => {
                const chips = Array.from(list.querySelectorAll('.category-chip'));
                const newOrderIds = chips.map(chip => chip.dataset.id);
                
                let cats = [...(window.nori_categories || [])];
                let reorderedCats = newOrderIds.map(id => cats.find(c => c.id === id)).filter(Boolean);
                
                window.nori_categories = reorderedCats;
                renderCategories(reorderedCats);
                showNotification('جاري حفظ الترتيب... ⏳');

                try {
                    const updates = reorderedCats.map((cat, index) => saveCategory({ id: cat.id, order: index }));
                    await Promise.all(updates);
                    showNotification('تم تحديث ترتيب الأقسام بنجاح ✨');
                } catch (e) {
                    showNotification('فشل حفظ الترتيب', 'error');
                    refreshData();
                }
            }
        });
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.category-chip')) {
        document.querySelectorAll('.order-dropdown').forEach(d => d.classList.add('hidden'));
    }

    const itemModal = document.getElementById('item-modal');
    if (e.target === itemModal || e.target.closest('.absolute.inset-0.bg-slate-950\\/80')) {
        closeModal();
    }

    const confirmModal = document.getElementById('confirm-modal');
    if (e.target === confirmModal) {
        confirmModal.classList.add('hidden');
    }
});

function printOrderInvoice(orderId) {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
        showNotification('فشل فتح نافذة الطباعة! برجاء السماح بالنوافذ المنبثقة (Popups).', 'error');
        return;
    }

    const itemsHtml = ord.items?.map(i => {
        let details = '';
        if (i.size) details += ` (${i.size})`;
        if (i.method) details += ` [${i.method}]`;
        if (i.pieces) details += ` - ${i.pieces} قطع`;
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-family: 'Tajawal', sans-serif;">
                    <span style="font-weight: bold; font-size: 14px;">${i.name || i.name_ar}</span>
                    <span style="font-size: 11px; color: #666; display: block; margin-top: 2px;">${details}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-family: 'Tajawal', sans-serif; font-size: 14px;">${i.quantity || 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-family: 'Tajawal', sans-serif; font-size: 14px;">${i.price || 0} جم</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: bold;">${(i.price || 0) * (i.quantity || 1)} جم</td>
            </tr>
        `;
    }).join('') || '';

    const invoiceHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة طلب #${ord.id.slice(-6)}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
                body {
                    font-family: 'Tajawal', sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 30px;
                    direction: rtl;
                    background-color: #fff;
                }
                .invoice-box {
                    max-width: 600px;
                    margin: auto;
                    padding: 25px;
                    border: 1px dashed #cbd5e1;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
                    border-radius: 16px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 2px dashed #e2e8f0;
                    padding-bottom: 20px;
                }
                .logo {
                    max-height: 70px;
                    margin-bottom: 10px;
                }
                .title {
                    font-size: 22px;
                    font-weight: 900;
                    color: #0b272a;
                    margin: 5px 0;
                }
                .subtitle {
                    font-size: 11px;
                    color: #64748b;
                    letter-spacing: 2px;
                    margin-top: 0;
                }
                .info-table {
                    width: 100%;
                    margin-bottom: 25px;
                    font-size: 13px;
                    line-height: 22px;
                    border-collapse: collapse;
                }
                .info-table td {
                    padding: 6px 4px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: right;
                    font-size: 13px;
                    margin-bottom: 25px;
                }
                .items-table th {
                    background-color: #f8fafc;
                    padding: 12px 10px;
                    border-bottom: 2px solid #cbd5e1;
                    font-weight: 800;
                    color: #475569;
                }
                .total-section {
                    border-top: 2px dashed #e2e8f0;
                    padding-top: 15px;
                    text-align: left;
                    font-size: 15px;
                }
                .footer {
                    text-align: center;
                    margin-top: 35px;
                    font-size: 11px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;
                }
                @media print {
                    body { padding: 0; }
                    .invoice-box { border: none; box-shadow: none; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <img src="../asseat/only logo remove background.png" class="logo" onerror="this.style.display='none'">
                    <div class="title">نوري & رايس</div>
                    <div class="subtitle">NORI & RICE</div>
                    <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 800; color: #c18c64;">فاتورة طلب رقم #${ord.id.slice(-6)}</p>
                </div>
                
                <table class="info-table">
                    <tr>
                        <td style="font-weight: bold; width: 80px; color: #475569;">العميل:</td>
                        <td style="font-weight: 800; font-size: 14px;">${ord.customerName || 'زبون'}</td>
                        <td style="font-weight: bold; width: 80px; text-align: left; color: #475569;">التاريخ:</td>
                        <td style="text-align: left; font-weight: bold;">${new Date(ord.createdAt).toLocaleString('ar-EG')}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: #475569;">الهاتف:</td>
                        <td style="font-weight: bold;">${ord.customerPhone || ord.phone || '-'}</td>
                        <td style="font-weight: bold; text-align: left; color: #475569;">طريقة الدفع:</td>
                        <td style="text-align: left; font-weight: bold;">نقداً عند الاستلام</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: #475569;">العنوان:</td>
                        <td colspan="3" style="font-weight: bold;">${ord.customerAddress || ord.address || 'استلام من المطعم'}</td>
                    </tr>
                    ${ord.notes ? `
                    <tr>
                        <td style="font-weight: bold; color: #d4a17b;">ملاحظات:</td>
                        <td colspan="3" style="color: #64748b; font-style: italic; font-weight: bold;">${ord.notes}</td>
                    </tr>
                    ` : ''}
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align: right;">المنتج</th>
                            <th style="text-align: center; width: 60px;">الكمية</th>
                            <th style="text-align: left; width: 80px;">السعر</th>
                            <th style="text-align: left; width: 100px;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total-section">
                    <p style="margin: 6px 0; font-weight: bold; color: #475569;">المجموع الفرعي: <span style="color: #0f172a;">${ord.totalPrice || ord.total || 0} جم</span></p>
                    <p style="margin: 6px 0; font-size: 18px; color: #c18c64; font-weight: 900;">الإجمالي النهائي: <span>${ord.totalPrice || ord.total || 0} جم</span></p>
                </div>

                <div class="footer">
                    <p>شكراً لطلبكم من نوري & رايس! ❤️</p>
                    <p>www.noriandrice.com</p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
}
