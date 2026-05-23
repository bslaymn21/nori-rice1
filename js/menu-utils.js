/**
 * Shared menu field resolution (admin + customer site)
 */

export function resolveItemName(item, lang = 'ar') {
    if (!item) return '';
    if (lang === 'ar') return item.name_ar || item.name || item.name_en || '';
    return item.name_en || item.name || item.name_ar || '';
}

export function resolveItemDescription(item, lang = 'ar') {
    if (!item) return '';
    if (lang === 'ar') {
        return item.description_ar || item.description || item.description_en || '';
    }
    return item.description_en || item.description || item.description_ar || '';
}

/** Admin uses isAvailable; legacy items may use `available` only */
export function isMenuItemAvailable(item) {
    if (!item) return false;
    if (item.isAvailable === false || item.available === false) return false;
    return true;
}

export function getItemPrimaryImage(item) {
    return item?.images?.[0] || '';
}

export function getCategoryDisplayName(key, lang, categories = []) {
    if (!key) return lang === 'ar' ? 'قسم جديد' : 'New Category';

    const category = categories.find(cat =>
        cat.id === key || cat.name === key || cat.dbName === key || cat.name_ar === key || cat.name_en === key
    );

    if (category) {
        if (lang === 'ar') return category.name_ar || category.name || key;
        return category.name_en || category.name || category.name_ar || key;
    }

    return key;
}

export function getPublicMenuUrl(ref = 'qr') {
    try {
        const base = new URL('../index.html', window.location.href);
        base.searchParams.set('ref', ref);
        return base.href;
    } catch {
        const origin = window.location.origin || '';
        return `${origin}/index.html?ref=${encodeURIComponent(ref)}`;
    }
}
