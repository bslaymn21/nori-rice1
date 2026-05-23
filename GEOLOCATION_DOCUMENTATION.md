# 📍 دليل استخدام ميزة تحديد الموقع التلقائي - Nori & Rice

## 📌 نظرة عامة
تم إضافة ميزة حديثة لتحديد موقع العميل الحالي تلقائياً باستخدام **Geolocation API** في صفحة checkout (نموذج بيانات العميل). هذه الميزة توفر:

✅ **تحديد الموقع تلقائياً** بدون الحاجة لفتح Google Maps
✅ **معالجة الأخطاء بالعربية** مع تنبيهات واضحة
✅ **حفظ الإحداثيات في Firebase** (latitude & longitude)
✅ **عرض الموقع في رسالة WhatsApp** المرسلة للمطعم
✅ **تواجد خيار التعديل اليدوي** للعنوان

---

## 🎯 كيفية العمل

### 1. **عند فتح نموذج إدخال البيانات:**
- يظهر زر جديد في الفورم: **"تحديد موقعي الحالي تلقائياً"** 📍
- اللون الافتراضي: **ذهبي (Secondary Color)**

### 2. **عند ضغط العميل على الزر:**
- ✏️ يطلب المتصفح إذن الموقع من العميل
- ⏳ يظهر مؤشر تحميل (Loading State)
- 🎯 يتم جلب الإحداثيات (Latitude & Longitude) بدقة عالية

### 3. **عند النجاح:**
- ✅ الزر يتحول إلى **"تم تحديد موقعك بنجاح ✅"**
- 🟢 لون الزر يتغير إلى **أخضر (Emerald)**
- 📊 يظهر إشعار بالإحداثيات والدقة
- 💾 البيانات تُحفظ تلقائياً في حقول مخفية

### 4. **عند الفشل:**
- ❌ يظهر رسالة خطأ بالعربية
- 🔧 تعليمات واضحة كيفية حل المشكلة
- 👤 يبقى الخيار لكتابة العنوان يدوياً

---

## 📁 الملفات المنشأة/المحدثة

### 1. **`js/geolocation.js`** (ملف جديد - 350 سطر)
وحدة حديثة ES6+ تتعامل مع كل العمليات المتعلقة بالموقع:

```javascript
// الدوال الرئيسية المُصدَّرة:
- detectUserLocation()        // تحديد الموقع
- isLocationDetected()        // التحقق من نجاح التحديد
- getLocationData()          // الحصول على الإحداثيات
- resetLocationState()       // إعادة تعيين البيانات
- initializeGeolocationModule() // تهيئة الزر
```

**المميزات:**
- ✅ معالجة شاملة للأخطاء (5 أنواع من الأخطاء)
- ✅ رسائل تنبيه باللغة العربية
- ✅ دقة عالية في التحديد (enableHighAccuracy: true)
- ✅ Timeout بـ 10 ثوان لتجنب التعليق

### 2. **`index.html`** (محدّث)
إضافات جديدة في نموذج العميل:

```html
<!-- 1. حقول مخفية لتخزين الإحداثيات -->
<input type="hidden" id="customer-latitude" name="latitude">
<input type="hidden" id="customer-longitude" name="longitude">
<input type="hidden" id="customer-location-accuracy" name="accuracy">

<!-- 2. زر تحديد الموقع -->
<button type="button" id="detect-location-btn" class="...">
    <span class="material-symbols-outlined">location_on</span>
    <span>تحديد موقعي الحالي تلقائياً</span>
</button>
```

### 3. **`js/app.js`** (محدّث)
تحديثات في 3 أماكن:

```javascript
// أ) إضافة الاستيراد في البداية
import {
    detectUserLocation, isLocationDetected, getLocationData,
    resetLocationState, initializeGeolocationModule
} from './geolocation.js';

// ب) في openCustomerModal() - تهيئة الزر
initializeGeolocationModule();

// ج) في handleCustomerFormSubmit() - إضافة بيانات الموقع
const locationData = getLocationData();
if (locationData.isDetected) {
    customerData.latitude = locationData.latitude;
    customerData.longitude = locationData.longitude;
    customerData.accuracy = locationData.accuracy;
}

// د) في submitCartWithCustomer() - إضافة الموقع لرسالة WhatsApp
msg += `📡 الإحداثيات: ${customer.latitude}, ${customer.longitude}\n`;
msg += `🎯 دقة التحديد: ±${customer.accuracy}م\n`;
```

### 4. **`database/services.js`** (محدّث)
تحديث `saveCustomer()` لحفظ بيانات الموقع:

```javascript
// إضافة حقول الموقع عند الحفظ
if (customerData.latitude && customerData.longitude) {
    payload.latitude = customerData.latitude;
    payload.longitude = customerData.longitude;
    payload.accuracy = customerData.accuracy;
    payload.locationDetectedAt = customerData.locationDetectedAt;
}
```

---

## 🔐 معالجة الأخطاء

### الرسائل المعروضة للعميل:

| الخطأ | الرسالة | الحل |
|------|--------|------|
| **رفض الإذن** | ❌ تم رفض إذن الموقع | فعّل الموقع من إعدادات المتصفح |
| **الموقع غير متاح** | ⚠️ الموقع غير متاح | فعّل خدمات الموقع على جهازك |
| **انتهت المهلة** | ⏱️ انتهت المهلة الزمنية | حاول مرة أخرى |
| **خطأ مجهول** | ❌ خطأ غير متوقع | حاول مرة أخرى |

---

## 💾 بيانات Firebase

### هيكل جدول `customers`:

```json
{
    "id": "customer_doc_id",
    "name": "محمد أحمد",
    "phone": "+201012345678",
    "address": "شارع البحر، عمارة 5",
    "latitude": 31.2156,
    "longitude": 29.9555,
    "accuracy": 25.5,
    "locationDetectedAt": "2026-05-23T15:30:45.123Z",
    "updatedAt": "2026-05-23T15:30:45.123Z"
}
```

### هيكل جدول `orders`:

```json
{
    "id": "order_doc_id",
    "customerId": "customer_doc_id",
    "customerName": "محمد أحمد",
    "customerPhone": "+201012345678",
    "customerAddress": "شارع البحر، عمارة 5",
    "latitude": 31.2156,
    "longitude": 29.9555,
    "accuracy": 25.5,
    "locationDetectedAt": "2026-05-23T15:30:45.123Z",
    "items": [...],
    "totalPrice": 250,
    "sentVia": "whatsapp",
    "createdAt": "2026-05-23T15:30:45.123Z",
    "status": "pending"
}
```

---

## 🎨 التصميم و UX

### حالات الزر:

1. **الحالة الافتراضية:**
   - 🟡 خلفية ذهبية (Secondary Color)
   - 📍 أيقونة موقع
   - النص: "تحديد موقعي الحالي تلقائياً"

2. **حالة التحميل:**
   - 💫 مؤشر ساعة رملية دوّارة
   - النص: "جاري تحديد موقعك..."
   - الزر معطّل (disabled)

3. **حالة النجاح:**
   - 🟢 خلفية خضراء (Emerald)
   - ✅ أيقونة تأكيد
   - النص: "تم تحديد موقعك بنجاح ✅"
   - الزر معطّل (لا يمكن الضغط مجدداً)
   - رسالة نجاح توضح الإحداثيات والدقة

---

## 🔧 كيفية الاستخدام من قبل الفريق الإداري (Admin)

### في لوحة التحكم (Admin Dashboard):
يمكن للإداريين:
- ✅ عرض الخريطة بالموقع الدقيق للعميل
- ✅ تصدير التقارير مع الإحداثيات
- ✅ تتبع أماكن التوصيل الشهيرة

### في رسائل WhatsApp:
ستظهر رسالة كاملة تتضمن:
```
🍣 *طلب وجبات سوشي جديدة - نوري & رايس* 🍣

👤 الاسم: محمد أحمد
📱 الهاتف: +201012345678
📍 العنوان: شارع البحر، عمارة 5
📡 الإحداثيات: 31.215623, 29.955512
🎯 دقة التحديد: ±25.50م

[تفاصيل الطلب...]
💰 المجموع الكلي: 250 ج.م
```

---

## ⚙️ متطلبات البراوزر

هذه الميزة تعمل على:
- ✅ جميع المتصفحات الحديثة
- ✅ iOS Safari 13+
- ✅ Chrome/Edge على كل الأنظمة
- ✅ Firefox على كل الأنظمة

**ملاحظة:** المستخدم يجب أن يعطي إذن للموقع أول مرة (يظهر popup).

---

## 🚀 الميزات المستقبلية (مقترحات)

1. **تحديد الموقع تلقائياً عند فتح النموذج** (Opt-in)
2. **عرض خريطة تفاعلية** مع تأكيد الموقع
3. **حفظ المواقع المفضلة** للعميل
4. **تنبيهات للمطعم** عند تسليم الطلب (GPS Tracking)
5. **حساب وقت التسليم** بناءً على المسافة

---

## 📋 ملاحظات تقنية

### Performance:
- ✅ الوحدة تستخدم ES6 Modules (Code Splitting)
- ✅ لا توجد مكتبات خارجية إضافية
- ✅ حجم الملف: ~10KB بدون ضغط

### Security:
- ✅ البيانات تُرسل عبر HTTPS فقط
- ✅ لا يتم تخزين الموقع محلياً في LocalStorage
- ✅ لا يوجد تتبع دائم (persistent tracking)

### Browser Permissions:
- ✅ يطلب إذن الموقع من المتصفح فقط عند الضغط على الزر
- ✅ المستخدم يمكنه الرفض في أي وقت
- ✅ التطبيق يعمل بدون الموقع (العنوان اليدوي)

---

## 📞 للمساعدة والتطوير

للمزيد من التحسينات أو إضافة ميزات:
1. تعديل رسائل الأخطاء في `GeoErrorMessages`
2. تغيير دقة التحديد في خيارات `options`
3. إضافة حفظ الموقع المفضل
4. ربط مع Google Maps للتأكيد الإضافي

---

**تم الإنجاز بنجاح! 🎉**

آخر تحديث: 23 مايو 2026
