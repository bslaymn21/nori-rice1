/**
 * Database Services for Nori & Rice (Fetching & Uploading Data)
 */

import { db } from './config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MENU ---

/**
 * Fetch all menu items
 */
export async function getMenuItems() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, internalId: data.id || null };
        });
    } catch (error) {
        console.error("Error getting menu items: ", error);
        return []; // Fallback to empty
    }
}

/**
 * Add or update a menu item
 */
export async function saveMenuItem(itemData) {
    try {
        if (itemData.id && typeof itemData.id === 'string') {
            const docRef = doc(db, "menu", itemData.id);
            await setDoc(docRef, itemData, { merge: true });
            return itemData.id;
        } else {
            const docRef = await addDoc(collection(db, "menu"), itemData);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving menu item: ", error);
        throw error;
    }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id) {
    try {
        await deleteDoc(doc(db, "menu", id));
    } catch (error) {
        console.error("Error deleting item: ", error);
        throw error;
    }
}
/**
 * Bulk update menu items (for reordering)
 */
export async function bulkSaveMenuItems(items) {
    try {
        const batch = writeBatch(db);
        items.forEach(item => {
            const docRef = doc(db, "menu", item.id);
            const { id, ...data } = item;
            batch.set(docRef, data, { merge: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error in bulk update: ", error);
        throw error;
    }
}

// --- CATEGORIES ---

/**
 * Fetch all categories
 */
export async function getCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory so that categories without 'order' field still show up
        return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
        console.error("Error getting categories: ", error);
        return [];
    }
}

/**
 * Add or update a category
 */
export async function saveCategory(categoryData) {
    try {
        if (categoryData.id) {
            const docRef = doc(db, "categories", categoryData.id);
            await setDoc(docRef, categoryData, { merge: true });
            return categoryData.id;
        } else {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving category: ", error);
        throw error;
    }
}

/**
 * Delete a category
 */
export async function deleteCategory(id) {
    try {
        await deleteDoc(doc(db, "categories", id));
    } catch (error) {
        console.error("Error deleting category: ", error);
        throw error;
    }
}
// --- ORDERS ---

/**
 * Upload a new order
 */
export async function addOrder(orderData) {
    try {
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding order: ", error);
        throw error;
    }
}

// --- SETTINGS ---

/**
 * Fetch global site settings
 */
export async function getGlobalSettings() {
    try {
        const docRef = doc(db, "settings", "business");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error getting settings: ", error);
        return null;
    }
}

/**
 * Update global site settings
 */
export async function updateGlobalSettings(settingsData) {
    try {
        const docRef = doc(db, "settings", "business");
        await setDoc(docRef, settingsData, { merge: true });
    } catch (error) {
        console.error("Error updating settings: ", error);
        throw error;
    }
}
// --- STATS & ANALYTICS ---

/**
 * Increment site visitors for today
 */
export async function trackVisitor() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, "stats", "visitors_" + today);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            await updateDoc(docRef, { count: (docSnap.data().count || 0) + 1 });
        } else {
            await setDoc(docRef, { count: 1, date: today });
        }
    } catch (error) {
        console.error("Error tracking visitor: ", error);
    }
}

/**
 * Get total visitors for today
 */
export async function getTodayVisitors() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, "stats", "visitors_" + today);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().count : 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Track successful WhatsApp order sent
 */
export async function trackWhatsAppOrder() {
    try {
        const docRef = doc(db, "stats", "conversions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, { whatsappSent: (docSnap.data().whatsappSent || 0) + 1 });
        } else {
            await setDoc(docRef, { whatsappSent: 1 });
        }
    } catch (error) {
        console.error("Error tracking WhatsApp order: ", error);
    }
}

/**
 * Get total WhatsApp conversions
 */
export async function getWhatsAppConversions() {
    try {
        const docRef = doc(db, "stats", "conversions");
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().whatsappSent : 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Track QR Code Scan
 */
export async function trackQRScan() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, "stats", "qr_scans_" + today);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, { count: (docSnap.data().count || 0) + 1 });
        } else {
            await setDoc(docRef, { count: 1 });
        }
    } catch (error) {
        console.error("Error tracking QR scan: ", error);
    }
}

/**
 * Get Today's QR Scans
 */
export async function getQRScans() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, "stats", "qr_scans_" + today);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().count : 0;
    } catch (error) {
        return 0;
    }
}

// --- OFFERS ---

/**
 * Fetch active offers
 */
export async function getActiveOffers() {
    try {
        const querySnapshot = await getDocs(collection(db, "offers"));
        const now = new Date().toISOString();
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(offer => !offer.expiryDate || offer.expiryDate > now);
    } catch (error) {
        console.error("Error getting offers: ", error);
        return [];
    }
}

/**
 * Save or update an offer
 */
export async function saveOffer(offerData) {
    try {
        if (offerData.id) {
            const docRef = doc(db, "offers", offerData.id);
            const dataToSave = { ...offerData };
            return await setDoc(docRef, dataToSave, { merge: true }) && offerData.id;
        } else {
            const { id, ...dataToSave } = offerData;
            const docRef = await addDoc(collection(db, "offers"), dataToSave);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving offer: ", error);
        throw error;
    }
}

/**
 * Delete an offer
 */
export async function deleteOffer(id) {
    try {
        await deleteDoc(doc(db, "offers", id));
    } catch (error) {
        console.error("Error deleting offer: ", error);
        throw error;
    }
}

// --- FEEDBACK & COMMENTS ---

/**
 * Save user feedback
 */
export async function saveFeedback(feedbackData) {
    try {
        await addDoc(collection(db, "feedback"), {
            ...feedbackData,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error saving feedback: ", error);
        throw error;
    }
}

/**
 * Get all feedback
 */
export async function getAllFeedback() {
    try {
        const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id };
        });
    } catch (error) {
        console.error("Error getting feedback: ", error);
        return [];
    }
}

/**
 * Update feedback visibility
 */
export async function updateFeedbackStatus(feedbackId, showOnHome) {
    try {
        const docRef = doc(db, "feedback", feedbackId);
        await updateDoc(docRef, { showOnHome: showOnHome });
    } catch (error) {
        console.error("Error updating feedback status: ", error);
        throw error;
    }
}

// --- ORDERS ---

/**
 * Save a new order to Firestore
 */
export async function saveOrder(orderData) {
    try {
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving order: ", error);
        throw error;
    }
}

/**
 * Save or update customer data in Firestore
 */
export async function saveCustomer(customerData) {
    try {
        const normalizedPhone = customerData.phone.replace(/[^0-9\+]/g, '');
        const existing = await getCustomerByPhone(normalizedPhone);
        const payload = {
            name: customerData.name,
            phone: normalizedPhone,
            address: customerData.address,
            updatedAt: new Date().toISOString()
        };

        if (existing && existing.id) {
            const docRef = doc(db, "customers", existing.id);
            await setDoc(docRef, { ...existing, ...payload }, { merge: true });
            return existing.id;
        }

        const docRef = await addDoc(collection(db, "customers"), payload);
        return docRef.id;
    } catch (error) {
        console.error("Error saving customer: ", error);
        throw error;
    }
}

/**
 * Get existing customer data by phone number
 */
export async function getCustomerByPhone(phone) {
    try {
        const normalizedPhone = phone.replace(/[^0-9\+]/g, '');
        const q = query(collection(db, "customers"), where("phone", "==", normalizedPhone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching customer by phone: ", error);
        return null;
    }
}

/**
 * Fetch all orders for admin
 */
export async function getOrders() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, internalId: data.id || null };
        });
    } catch (error) {
        console.error("Error getting orders: ", error);
        return [];
    }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId, newStatus) {
    try {
        const docRef = doc(db, "orders", orderId);
        await updateDoc(docRef, { status: newStatus });
        return true;
    } catch (error) {
        console.error("Error updating order: ", error);
        return false;
    }
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId) {
    try {
        await deleteDoc(doc(db, "orders", orderId));
        return true;
    } catch (error) {
        console.error("Error deleting order: ", error);
        return false;
    }
}
/**
 * Custom Admin Auth (Firestore based)
 */
export async function verifyAdmin(username, password) {
    try {
        const docRef = doc(db, "admins", username);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().password === password) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Auth error:", error);
        return null;
    }
}

export async function updateAdminPassword(username, newPassword) {
    try {
        const docRef = doc(db, "admins", username);
        await updateDoc(docRef, { password: newPassword });
        return true;
    } catch (error) {
        // If doc doesn't exist, create it (fallback)
        try {
            const docRef = doc(db, "admins", username);
            await setDoc(docRef, { username, password: newPassword });
            return true;
        } catch (e) {
            return false;
        }
    }
}

// Ensure the default admin and standard settings/categories exist
export async function initAdminAccount() {
    try {
        // 1. Initialize Default Admin Credentials
        const docRef = doc(db, "admins", "admin");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            await setDoc(docRef, { username: "admin", password: "admin123", role: "owner" });
            console.log("Initialized default admin account: admin / admin123");
        }

        // 2. Initialize Default Business Settings
        const settingsRef = doc(db, "settings", "business");
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
            await setDoc(settingsRef, {
                whatsapp: "201012345678",
                phone: "+201012345678",
                address_ar: "القاهرة، مصر",
                address_en: "Cairo, Egypt",
                hours_ar: "يومياً من 1 ظهراً حتى 1 صباحاً",
                hours_en: "Daily from 1 PM to 1 AM",
                social_insta: "https://instagram.com",
                social_tiktok: "https://tiktok.com"
            });
            console.log("Initialized default business settings");
        }

        // 3. Initialize Default Categories
        const catsRef = collection(db, "categories");
        const catsSnap = await getDocs(catsRef);
        if (catsSnap.empty) {
            const defaultCats = [
                { id: "specialrolls", name: "specialrolls", name_ar: "رولز مميزة", order: 1 },
                { id: "nigiri", name: "nigiri", name_ar: "نيجيري وجونكان", order: 2 },
                { id: "sashimi", name: "sashimi", name_ar: "ساشيمي", order: 3 },
                { id: "temaki", name: "temaki", name_ar: "تيماكي مخروطي", order: 4 },
                { id: "appetizers", name: "appetizers", name_ar: "مقبلات ورامن", order: 5 },
                { id: "drinks", name: "drinks", name_ar: "مشروبات وحلويات", order: 6 }
            ];
            for (const cat of defaultCats) {
                await setDoc(doc(db, "categories", cat.id), cat);
            }
            console.log("Initialized default categories");
        }
    } catch (e) {
        console.error("Error in database initialization:", e);
    }
}
