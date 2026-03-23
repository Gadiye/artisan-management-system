// =============================================================================
// Central Constants File
// =============================================================================
// All shared business constants live here. Import from '@/lib/constants'.

// --- Product Types ---
export const PRODUCT_TYPES = [
    "SITTING_ANIMAL", "YOGA_BOWLS", "PER_DAY", "YOGA_ANIMALS", "CHOPSTICK_HOLDERS",
    "STANDING_ANIMAL", "BOTTLE_CORKS", "SANTA_YOGA_BOWLS", "SANTA_YOGA_ANIMALS",
    "HEAD_BOWLS", "DRINKING_BOWLS", "ANIMAL_MASKS", "CHOPSTICK_HEADS",
    "CHESS_UNITS", "STOOL_SET", "SALAD_SERVERS_PAIR", "WALKING_ANIMAL",
    "PLACE_CARD_HOLDER", "SANTA_ANIMALS", "SUGAR_SPOONS", "COCKTAIL_STICKS",
    "KEY_HOLDERS", "FLAT_MAGNETS", "PLAY_ANIMALS", "TRAINING_CHOPSTICKS",
    "CHOPSTICKS", "X_MAS_DECO", "FORKS", "BUTTER_KNIVES", "LETTER_OPENERS",
    "JAM_SCOOPERS", "NAPKIN_HOLDERS", "HAIR_COMBS", "PAPER_WEIGHTS",
] as const;

// --- Service Categories (work types assigned to artisans) ---
export const SERVICE_CATEGORIES = ["DRAWING", "CARVING", "CUTTING", "GOUGING", "SANDING", "PAINTING", "FINISHING"] as const;

// --- Service Stages (full production pipeline including DRAWING) ---
export const SERVICE_STAGES = ["DRAWING", "CARVING", "CUTTING", "GOUGING", "SANDING", "PAINTING", "FINISHING", "FINISHED"] as const;

// --- Production Stages (with labels, for UI display) ---
export const PRODUCTION_STAGES = [
    {
        "key": "DRAWING",
        "label": "Drawing"
    },
    {
        "key": "CARVING",
        "label": "Carving"
    },
    {
        "key": "CUTTING",
        "label": "Cutting"
    },
    {
        "key": "GOUGING",
        "label": "Gouging"
    },
    {
        "key": "SANDING",
        "label": "Sanding"
    },
    {
        "key": "PAINTING",
        "label": "Painting"
    },
    {
        "key": "FINISHING",
        "label": "Finishing"
    }
] as const;

// --- Size Categories ---
export const SIZE_CATEGORIES = [
    "SMALL", "MEDIUM", "LARGE", "WITH CLOTHES", "WITH DRESS", "WITH SUIT",
    "WITH OVERALL", "4IN", "8X8", "6X6", "5X4", "XMAS DRESS", "IN PAIRS",
    "12IN", "8IN", "N/A", "2D", "3D", "SHORT", "LONG", "THIN TIP",
    "THICK TIP", "NORMAL", "BOTTOMS UP",
] as const;

// --- Animal Types ---
export const ANIMAL_TYPES = [
    "LION", "ZEBRA", "GIRAFFE", "DONKEY", "LEOPARD", "CHEETAH", "ELEPHANT",
    "CAT", "HIPPO", "GAZELLE", "LIONESS", "BUFFALO", "RHINO", "GUINEA FOWL",
    "GORILLA", "SAMPLE",
] as const;

// --- Production Chain Map (which stages feed into which) ---
export const PRODUCTION_CHAIN_MAP: { [key: string]: string[] } = {
    "CUTTING": [
        "DRAWING"
    ],
    "GOUGING": [
        "CUTTING"
    ],
    "SANDING": [
        "CUTTING",
        "CARVING"
    ],
    "PAINTING": [
        "SANDING"
    ],
    "FINISHING": [
        "PAINTING"
    ],
    "FINISHED": [
        "FINISHING"
    ]
};

// --- Stage Colors (for inventory badges) ---
export const STAGE_COLORS: Record<string, string> = {
    "DRAWING": "bg-red-100 text-red-800",
    "CARVING": "bg-blue-100 text-blue-800",
    "CUTTING": "bg-orange-100 text-orange-800",
    "GOUGING": "bg-amber-100 text-amber-800",
    "SANDING": "bg-yellow-100 text-yellow-800",
    "PAINTING": "bg-purple-100 text-purple-800",
    "FINISHING": "bg-slate-600 text-white",
    "FINISHED": "bg-green-100 text-green-800"
};

export function getStageColor(stage: string): string {
    return STAGE_COLORS[stage] || "bg-gray-100 text-gray-800";
}
