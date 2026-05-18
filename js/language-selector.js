// Language Selector Logic for Matamkom

document.addEventListener('DOMContentLoaded', () => {
    const preferredLang = localStorage.getItem('preferred_language') || 'ar';
    applyLanguage(preferredLang);
});

function showLanguageModal() {
    const modal = document.createElement('div');
    modal.id = 'language-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-6';
    
    modal.innerHTML = `
        <div class="bg-white dark:bg-abyss-container rounded-xl p-8 max-w-lg w-full shadow-2xl text-center space-y-6 border border-slate-200 dark:border-white/10 transition-colors">
            <div class="w-16 h-16 bg-primary dark:bg-abyss-primary/10 text-white dark:text-abyss-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="material-symbols-outlined text-3xl">language</span>
            </div>
            <div class="space-y-2">
                <h2 class="text-2xl font-bold text-primary dark:text-white font-h1" data-i18n="lang_modal_title">Welcome to Matamkom</h2>
                <p class="text-slate-500 dark:text-abyss-on-variant" data-i18n="lang_modal_desc">Please select your preferred language to continue</p>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-4">
                <button onclick="setLanguage('ar')" class="py-4 px-6 bg-slate-50 dark:bg-abyss-surface hover:bg-secondary dark:hover:bg-abyss-secondary text-secondary dark:text-abyss-secondary hover:text-white dark:hover:text-abyss-on-secondary rounded-xl font-bold text-xl transition-all bioluminescent-glow border border-slate-100 dark:border-white/5">
                    العربية
                </button>
                <button onclick="setLanguage('en')" class="py-4 px-6 bg-slate-50 dark:bg-abyss-surface hover:bg-primary dark:hover:bg-abyss-primary text-primary dark:text-abyss-primary hover:text-white dark:hover:text-abyss-on-primary rounded-xl font-bold text-xl transition-all bioluminescent-glow border border-slate-100 dark:border-white/5">
                    English
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initial translation for modal content
    translateElement(modal, 'en'); 
}

function setLanguage(lang) {
    localStorage.setItem('preferred_language', lang);
    const modal = document.getElementById('language-modal');
    if (modal) {
        modal.classList.add('animate-out', 'fade-out', 'zoom-out-95', 'duration-300');
        setTimeout(() => modal.remove(), 300);
    }
    applyLanguage(lang);
}

function applyLanguage(lang) {
    // Inject Dynamic Settings from Admin (if available)
    if (typeof getSiteSettings === 'function') {
        const settings = getSiteSettings();
        if (translations.en) {
            translations.en.contact_address_detail = settings.address_en || translations.en.contact_address_detail;
            translations.en.contact_time_lunch = settings.hours_en || translations.en.contact_time_lunch;
        }
        if (translations.ar) {
            translations.ar.contact_address_detail = settings.address_ar || translations.ar.contact_address_detail;
            translations.ar.contact_time_lunch = settings.hours_ar || translations.ar.contact_time_lunch;
        }
    }

    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    if (lang === 'ar') {
        html.classList.add('rtl-mode');
    } else {
        html.classList.remove('rtl-mode');
    }

    // Global translation check
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Custom Font adjustments
    if (lang === 'ar') {
        document.body.style.fontFamily = "'Noto Sans Arabic', 'Work Sans', sans-serif";
        document.querySelectorAll('h1, h2, h3, .font-h1').forEach(el => {
            el.style.fontFamily = "'Noto Kufi Arabic', 'Epilogue', sans-serif";
        });
    } else {
        document.body.style.fontFamily = ""; // Reset to CSS default
        document.querySelectorAll('h1, h2, h3, .font-h1').forEach(el => {
            el.style.fontFamily = "";
        });
    }
}

// Helper for mid-DOM translation
function translateElement(parent, lang) {
    parent.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
}

// Toggle function for header button
function toggleLanguage() {
    const currentLang = localStorage.getItem('preferred_language') || 'ar';
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
}
