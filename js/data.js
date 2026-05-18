const sushiMenu = [
    // --- Special Rolls ---
    {
        id: "volcano_roll",
        category: "specialrolls",
        name: "فولكانو رول الأسطوري",
        name_en: "Volcano Lava Roll",
        description: "مزيج ساخن من كابوريا الثلج، الأفوكادو، مغطى بسلمون مشوي وقطع الروبيان المقرمش مع مايونيز ياباني حار وصوص الترياكي الحلو.",
        description_en: "A warm explosion of snow crab, avocado, topped with baked salmon, crispy shrimp bites, spicy Japanese mayo, and sweet teriyaki drizzle.",
        price: 240,
        oldPrice: 290,
        isPopular: true,
        isSpecial: true,
        timesOrdered: 184,
        images: [
            "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [4, 8, 12],
            pieceMultiplier: { 4: 0.5, 8: 1.0, 12: 1.4 }
        }
    },
    {
        id: "dragon_roll",
        category: "specialrolls",
        name: "دراجون رول الذهبي",
        name_en: "Golden Dragon Roll",
        description: "روبيان تمبورا مقرمش وخيار بالداخل، مغطى بشرائح رفيعة من ثعبان البحر (أوناغي) الفاخر والأفوكادو الطازج ورقائق الذهب القابلة للأكل.",
        description_en: "Crispy shrimp tempura and cucumber inside, wrapped in premium sliced freshwater eel (Unagi), fresh avocado, and edible gold flakes.",
        price: 260,
        isPopular: true,
        isSpecial: false,
        timesOrdered: 142,
        images: [
            "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [4, 8, 12],
            pieceMultiplier: { 4: 0.5, 8: 1.0, 12: 1.4 }
        }
    },
    {
        id: "tiger_tempura",
        category: "specialrolls",
        name: "تايجر تمبورا المقرمش",
        name_en: "Crunchy Tiger Tempura",
        description: "رول روبيان تمبورا وجبن كريمي مقلي بالكامل بطبقة البانكو اليابانية المقرمشة، يعلوه صوص الشيف الخاص وشرائح هالبينو حارة.",
        description_en: "Shrimp tempura and rich cream cheese roll, fully deep-fried in Japanese panko crust, finished with chef's signature sauce and fresh jalapeño.",
        price: 195,
        oldPrice: 230,
        isPopular: false,
        isSpecial: true,
        timesOrdered: 98,
        images: [
            "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [4, 8, 12],
            pieceMultiplier: { 4: 0.5, 8: 1.0, 12: 1.4 }
        }
    },

    // --- Nigiri & Gunkan ---
    {
        id: "salmon_nigiri",
        category: "nigiri",
        name: "نيجيري سلمون ملكي",
        name_en: "Royal Salmon Nigiri",
        description: "شرائح سميكة من السلمون الأسكتلندي الطازج الفاخر موضوعة بعناية فوق أرز السوشي المتبل بخل الأرز الياباني الأصلي.",
        description_en: "Thick slices of fresh Scottish salmon masterfully placed over premium seasoned sushi rice, served with fresh wasabi and pickled ginger.",
        price: 90,
        timesOrdered: 245,
        images: [
            "https://images.unsplash.com/photo-1633478062482-790e3b5dd810?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [2, 4],
            pieceMultiplier: { 2: 1.0, 4: 1.8 }
        }
    },
    {
        id: "unagi_nigiri",
        category: "nigiri",
        name: "نيجيري ثعبان البحر (أوناغي)",
        name_en: "Unagi Eel Nigiri",
        description: "شرائح أوناغي مشوية على الفحم ببطء ومتبلة بصوص الكاباياكي الحلو، ملفوفة بشريط ناعم من نوري المحمص.",
        description_en: "Charcoal-grilled freshwater eel (Unagi) glazed with sweet kabayaki sauce, bound with a delicate sash of toasted nori sea-vegetable.",
        price: 110,
        isPopular: true,
        timesOrdered: 87,
        images: [
            "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [2, 4],
            pieceMultiplier: { 2: 1.0, 4: 1.8 }
        }
    },

    // --- Sashimi ---
    {
        id: "salmon_sashimi",
        category: "sashimi",
        name: "ساشيمي سلمون كلاسيكي",
        name_en: "Classic Salmon Sashimi",
        description: "5 قطع من شرائح السلمون الأسكتلندي الطازج عالية الجودة (Grade A) مقطعة على الطريقة اليابانية التقليدية، تقدم على ثلج مجروش.",
        description_en: "5 exquisite, thick-cut slices of fresh premium grade Scottish salmon, served chilled over crushed ice with daikon radish and shiso leaf.",
        price: 180,
        timesOrdered: 165,
        images: [
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [5, 10],
            pieceMultiplier: { 5: 1.0, 10: 1.8 }
        }
    },
    {
        id: "maguro_sashimi",
        category: "sashimi",
        name: "ساشيمي تونا حمراء (ماجورو)",
        name_en: "Bluefin Tuna Sashimi (Maguro)",
        description: "5 قطع من التونة ذات الزعانف الزرقاء الفاخرة، غنية بالنكهة ولونها أحمر ياقوتي ساحر، مقطعة يدوياً بدقة واحترافية.",
        description_en: "5 prime cuts of premium Bluefin tuna (Maguro), naturally rich ruby red with absolute melt-in-your-mouth texture.",
        price: 210,
        isSpecial: true,
        timesOrdered: 120,
        images: [
            "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80"
        ],
        options: {
            pieces: [5, 10],
            pieceMultiplier: { 5: 1.0, 10: 1.8 }
        }
    },

    // --- Temaki ---
    {
        id: "spicy_salmon_temaki",
        category: "temaki",
        name: "تيماكي سلمون حار",
        name_en: "Spicy Salmon Handroll",
        description: "مخروط مقرمش من نوري محمص محشو بأرز السوشي، قطع سلمون فاخرة مقطعة مكعبات مع بصل أخضر وصوص حار وأفوكادو.",
        description_en: "A crispy hand-rolled cone of toasted nori packed with warm sushi rice, premium diced salmon, scallions, spicy house mayo, and fresh avocado.",
        price: 110,
        timesOrdered: 76,
        images: [
            "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80"
        ]
    },

    // --- Appetizers & Ramen ---
    {
        id: "edamame_truffle",
        category: "appetizers",
        name: "إدامامي بملح الترافل",
        name_en: "Truffle Salt Edamame",
        description: "قرون الصويا الخضراء الطازجة المطهوة على البخار ببطء، مغطاة بملح البحر النقي وقطرات من زيت الترافل الأسود الفاخر.",
        description_en: "Young soybean pods steamed to order, tossed in premium sea salt flakes and premium earthy black truffle aromatic oil infusion.",
        price: 75,
        timesOrdered: 320,
        images: [
            "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        id: "shoyu_ramen",
        category: "appetizers",
        name: "رامن الشويو بالدجاج الفاخر",
        name_en: "Luxury Shoyu Chicken Ramen",
        description: "نودلز الرامن اليابانية الطازجة في مرق الصويا الغني المطهو لمدة 12 ساعة، مع شرائح دجاج مشوية، بيض رامن متبل، فطر شيتاكي ونوري.",
        description_en: "Fresh ramen noodles in a savory 12-hour slow-cooked shoyu broth, grilled chicken tenderloin, marinated half soft-boiled egg, shiitake mushrooms, and nori.",
        price: 185,
        isPopular: true,
        timesOrdered: 215,
        images: [
            "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=800&q=80"
        ]
    },

    // --- Drinks & Desserts ---
    {
        id: "mochi_ice_cream",
        category: "drinks",
        name: "موتشي آيس كريم الياباني",
        name_en: "Premium Assorted Mochi",
        description: "3 قطع من حلوى الموتشي اليابانية المصنوعة من أرز الدبق اللزج، محشوة بالآيس كريم الفاخر بنكهات (الماتشا، الفانيليا، المانجو).",
        description_en: "3 soft, pillowy Japanese glutinous rice cakes filled with luxury ice cream. Includes 3 premium flavors: Kyoto Matcha, Vanilla Bean, and Fresh Mango.",
        price: 95,
        timesOrdered: 412,
        images: [
            "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        id: "iced_strawberry_matcha",
        category: "drinks",
        name: "آيسد ستروبري ماتشا لاتيه",
        name_en: "Iced Strawberry Matcha Latte",
        description: "مشروب الماتشا اليابانية العضوية الفاخرة (Ceremonial Grade)، يقدم بارداً مع حليب الشوفان الكريمي وصوص الفراولة الطازجة المحضر منزلياً.",
        description_en: "Ceremonial Grade organic Japanese Uji Matcha, layered beautifully over chilled creamy oat milk and fresh handmade crushed strawberry puree.",
        price: 85,
        isPopular: true,
        timesOrdered: 345,
        images: [
            "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80"
        ]
    }
];

const bookingLayout = {
    sakura_hall: {
        id: "sakura_hall",
        name_ar: "صالة ساكورا الرئيسية",
        name_en: "Sakura Main Hall",
        tables: [
            { id: "T1", type: "table", seats: 2, view: "premium", x: 20, y: 25, status: "available" },
            { id: "T2", type: "table", seats: 4, view: "standard", x: 20, y: 65, status: "reserved" },
            { id: "T3", type: "table", seats: 4, view: "premium", x: 50, y: 25, status: "available" },
            { id: "T4", type: "table", seats: 6, view: "premium", x: 50, y: 65, status: "available" },
            { id: "T5", type: "table", seats: 2, view: "standard", x: 80, y: 25, status: "reserved" },
            { id: "T6", type: "table", seats: 4, view: "standard", x: 80, y: 65, status: "available" }
        ]
    },
    vip_suite: {
        id: "vip_suite",
        name_ar: "جناح الشوغن VIP",
        name_en: "Shogun VIP Suite",
        tables: [
            { id: "R1", type: "room", name_ar: "غرفة إيدو الملكية", name_en: "Edo Royal Room", seats: 8, view: "premium", x: 25, y: 45, status: "available" },
            { id: "R2", type: "room", name_ar: "غرفة الساموراي الخاصة", name_en: "Samurai Private Room", seats: 6, view: "premium", x: 55, y: 45, status: "reserved" },
            { id: "R3", type: "room", name_ar: "غرفة الجيشا التقليدية", name_en: "Geisha Traditional Room", seats: 6, view: "standard", x: 85, y: 45, status: "available" }
        ]
    },
    sushi_bar: {
        id: "sushi_bar",
        name_ar: "لاونج السوشي بار المباشر",
        name_en: "Live Sushi Bar Lounge",
        tables: [
            { id: "B1", type: "bar", seats: 1, view: "premium", x: 15, y: 50, status: "available" },
            { id: "B2", type: "bar", seats: 1, view: "premium", x: 30, y: 50, status: "available" },
            { id: "B3", type: "bar", seats: 1, view: "premium", x: 45, y: 50, status: "reserved" },
            { id: "B4", type: "bar", seats: 1, view: "premium", x: 60, y: 50, status: "available" },
            { id: "B5", type: "bar", seats: 1, view: "premium", x: 75, y: 50, status: "available" },
            { id: "B6", type: "bar", seats: 1, view: "premium", x: 90, y: 50, status: "reserved" }
        ]
    },
    zen_garden: {
        id: "zen_garden",
        name_ar: "حديقة الزين الخارجية",
        name_en: "Zen Outdoor Garden",
        tables: [
            { id: "G1", type: "table", seats: 2, view: "premium", x: 20, y: 30, status: "available" },
            { id: "G2", type: "table", seats: 4, view: "premium", x: 40, y: 60, status: "available" },
            { id: "G3", type: "table", seats: 4, view: "standard", x: 60, y: 30, status: "reserved" },
            { id: "G4", type: "table", seats: 6, view: "premium", x: 80, y: 60, status: "available" }
        ]
    }
};
