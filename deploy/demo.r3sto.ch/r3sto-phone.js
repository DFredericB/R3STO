/**
 * R3STO Phone Input v2.0 — Composant téléphone unifié professionnel
 *
 * Features:
 *  - Drapeau + indicatif auto selon pays du restaurant
 *  - 40+ pays avec formatage local
 *  - Détection IP automatique du pays (optionnel)
 *  - Recherche pays dans le dropdown
 *  - Mode compact pour modales
 *  - API: getValue, getE164, setValue, setCountry
 *
 * Usage:
 *  var phone = R3Phone.init('#container', { country: 'CH', onInput: fn })
 *  phone.getE164()  // → '+41781234567'
 */
;(function (root) {
  'use strict'

  // ══════════════════════════════════════════════════
  //  DONNÉES PAYS — triés par usage restaurant
  // ══════════════════════════════════════════════════
  var C = {
    // ── Europe francophone ──
    CH:  { d:'+41',  f:'🇨🇭', n:'Suisse',         fmt:'## ### ## ##',       ph:'78 123 45 67',    mx:9  },
    FR:  { d:'+33',  f:'🇫🇷', n:'France',         fmt:'# ## ## ## ##',      ph:'6 12 34 56 78',   mx:9  },
    BE:  { d:'+32',  f:'🇧🇪', n:'Belgique',       fmt:'### ## ## ##',       ph:'470 12 34 56',    mx:9  },
    LU:  { d:'+352', f:'🇱🇺', n:'Luxembourg',     fmt:'### ### ###',        ph:'621 123 456',     mx:9  },
    MC:  { d:'+377', f:'🇲🇨', n:'Monaco',         fmt:'## ## ## ##',        ph:'06 12 34 56',     mx:8  },
    // ── Europe DACH ──
    DE:  { d:'+49',  f:'🇩🇪', n:'Allemagne',      fmt:'### #######',        ph:'170 1234567',     mx:11 },
    AT:  { d:'+43',  f:'🇦🇹', n:'Autriche',       fmt:'### #######',        ph:'664 1234567',     mx:11 },
    LI:  { d:'+423', f:'🇱🇮', n:'Liechtenstein',   fmt:'### ## ##',          ph:'660 12 34',       mx:7  },
    // ── Europe sud ──
    IT:  { d:'+39',  f:'🇮🇹', n:'Italie',         fmt:'### ### ####',       ph:'312 345 6789',    mx:10 },
    ES:  { d:'+34',  f:'🇪🇸', n:'Espagne',        fmt:'### ## ## ##',       ph:'612 34 56 78',    mx:9  },
    PT:  { d:'+351', f:'🇵🇹', n:'Portugal',       fmt:'### ### ###',        ph:'912 345 678',     mx:9  },
    GR:  { d:'+30',  f:'🇬🇷', n:'Grèce',          fmt:'### ### ####',       ph:'691 234 5678',    mx:10 },
    MT:  { d:'+356', f:'🇲🇹', n:'Malte',          fmt:'#### ####',          ph:'9912 3456',       mx:8  },
    CY:  { d:'+357', f:'🇨🇾', n:'Chypre',         fmt:'## ### ###',         ph:'96 123 456',      mx:8  },
    AD:  { d:'+376', f:'🇦🇩', n:'Andorre',        fmt:'### ###',            ph:'312 345',         mx:6  },
    SM:  { d:'+378', f:'🇸🇲', n:'Saint-Marin',    fmt:'### ### ####',       ph:'066 123 4567',    mx:10 },
    VA:  { d:'+379', f:'🇻🇦', n:'Vatican',        fmt:'## #### ####',       ph:'06 6982 0001',    mx:10 },
    GI:  { d:'+350', f:'🇬🇮', n:'Gibraltar',      fmt:'#### ####',          ph:'5700 1234',       mx:8  },
    // ── Europe nord / ouest ──
    GB:  { d:'+44',  f:'🇬🇧', n:'Royaume-Uni',    fmt:'#### ######',        ph:'7911 123456',     mx:10 },
    IE:  { d:'+353', f:'🇮🇪', n:'Irlande',        fmt:'## ### ####',        ph:'85 123 4567',     mx:9  },
    NL:  { d:'+31',  f:'🇳🇱', n:'Pays-Bas',       fmt:'# ## ## ## ##',      ph:'6 12 34 56 78',   mx:9  },
    DK:  { d:'+45',  f:'🇩🇰', n:'Danemark',       fmt:'## ## ## ##',        ph:'20 12 34 56',     mx:8  },
    SE:  { d:'+46',  f:'🇸🇪', n:'Suède',          fmt:'## ### ## ##',       ph:'70 123 45 67',    mx:9  },
    NO:  { d:'+47',  f:'🇳🇴', n:'Norvège',        fmt:'### ## ###',         ph:'412 34 567',      mx:8  },
    FI:  { d:'+358', f:'🇫🇮', n:'Finlande',       fmt:'## ### ####',        ph:'40 123 4567',     mx:9  },
    IS:  { d:'+354', f:'🇮🇸', n:'Islande',        fmt:'### ####',           ph:'611 1234',        mx:7  },
    // ── Europe est ──
    PL:  { d:'+48',  f:'🇵🇱', n:'Pologne',        fmt:'### ### ###',        ph:'512 345 678',     mx:9  },
    CZ:  { d:'+420', f:'🇨🇿', n:'Tchéquie',       fmt:'### ### ###',        ph:'601 234 567',     mx:9  },
    SK:  { d:'+421', f:'🇸🇰', n:'Slovaquie',      fmt:'### ### ###',        ph:'901 234 567',     mx:9  },
    HU:  { d:'+36',  f:'🇭🇺', n:'Hongrie',        fmt:'## ### ####',        ph:'20 123 4567',     mx:9  },
    RO:  { d:'+40',  f:'🇷🇴', n:'Roumanie',       fmt:'### ### ###',        ph:'721 234 567',     mx:9  },
    BG:  { d:'+359', f:'🇧🇬', n:'Bulgarie',       fmt:'## ### ####',        ph:'88 123 4567',     mx:9  },
    HR:  { d:'+385', f:'🇭🇷', n:'Croatie',        fmt:'## ### ####',        ph:'91 234 5678',     mx:9  },
    SI:  { d:'+386', f:'🇸🇮', n:'Slovénie',       fmt:'## ### ###',         ph:'31 234 567',      mx:8  },
    RS:  { d:'+381', f:'🇷🇸', n:'Serbie',         fmt:'## ### ####',        ph:'60 123 4567',     mx:9  },
    BA:  { d:'+387', f:'🇧🇦', n:'Bosnie',         fmt:'## ### ###',         ph:'61 234 567',      mx:8  },
    ME:  { d:'+382', f:'🇲🇪', n:'Monténégro',     fmt:'## ### ###',         ph:'67 123 456',      mx:8  },
    MK:  { d:'+389', f:'🇲🇰', n:'Macédoine du N.', fmt:'## ### ###',        ph:'72 123 456',      mx:8  },
    AL:  { d:'+355', f:'🇦🇱', n:'Albanie',        fmt:'## ### ####',        ph:'66 123 4567',     mx:9  },
    XK:  { d:'+383', f:'🇽🇰', n:'Kosovo',         fmt:'## ### ###',         ph:'44 123 456',      mx:8  },
    EE:  { d:'+372', f:'🇪🇪', n:'Estonie',        fmt:'#### ####',          ph:'5123 4567',       mx:8  },
    LV:  { d:'+371', f:'🇱🇻', n:'Lettonie',       fmt:'## ### ###',         ph:'21 234 567',      mx:8  },
    LT:  { d:'+370', f:'🇱🇹', n:'Lituanie',       fmt:'### ## ###',         ph:'612 34 567',      mx:8  },
    UA:  { d:'+380', f:'🇺🇦', n:'Ukraine',        fmt:'## ### ## ##',       ph:'50 123 45 67',    mx:9  },
    BY:  { d:'+375', f:'🇧🇾', n:'Biélorussie',    fmt:'## ### ## ##',       ph:'29 123 45 67',    mx:9  },
    MD:  { d:'+373', f:'🇲🇩', n:'Moldavie',       fmt:'### ## ###',         ph:'621 12 345',      mx:8  },
    GE:  { d:'+995', f:'🇬🇪', n:'Géorgie',        fmt:'### ## ## ##',       ph:'555 12 34 56',    mx:9  },
    AM:  { d:'+374', f:'🇦🇲', n:'Arménie',        fmt:'## ### ###',         ph:'77 123 456',      mx:8  },
    AZ:  { d:'+994', f:'🇦🇿', n:'Azerbaïdjan',    fmt:'## ### ## ##',       ph:'50 123 45 67',    mx:9  },
    RU:  { d:'+7',   f:'🇷🇺', n:'Russie',         fmt:'### ### ## ##',      ph:'912 345 67 89',   mx:10 },
    KZ:  { d:'+7',   f:'🇰🇿', n:'Kazakhstan',     fmt:'### ### ## ##',      ph:'701 234 56 78',   mx:10 },
    // ── Amérique ──
    US:  { d:'+1',   f:'🇺🇸', n:'États-Unis',     fmt:'(###) ###-####',     ph:'(555) 123-4567',  mx:10 },
    CA:  { d:'+1',   f:'🇨🇦', n:'Canada',         fmt:'(###) ###-####',     ph:'(514) 123-4567',  mx:10 },
    MX:  { d:'+52',  f:'🇲🇽', n:'Mexique',        fmt:'## #### ####',       ph:'55 1234 5678',    mx:10 },
    GT:  { d:'+502', f:'🇬🇹', n:'Guatemala',      fmt:'#### ####',          ph:'5123 4567',       mx:8  },
    BZ:  { d:'+501', f:'🇧🇿', n:'Belize',         fmt:'### ####',           ph:'622 1234',        mx:7  },
    HN:  { d:'+504', f:'🇭🇳', n:'Honduras',       fmt:'#### ####',          ph:'9123 4567',       mx:8  },
    SV:  { d:'+503', f:'🇸🇻', n:'El Salvador',    fmt:'#### ####',          ph:'7012 3456',       mx:8  },
    NI:  { d:'+505', f:'🇳🇮', n:'Nicaragua',      fmt:'#### ####',          ph:'8123 4567',       mx:8  },
    CR:  { d:'+506', f:'🇨🇷', n:'Costa Rica',     fmt:'#### ####',          ph:'8312 3456',       mx:8  },
    PA:  { d:'+507', f:'🇵🇦', n:'Panama',         fmt:'#### ####',          ph:'6123 4567',       mx:8  },
    CU:  { d:'+53',  f:'🇨🇺', n:'Cuba',           fmt:'# ### ####',         ph:'5 123 4567',      mx:8  },
    DO:  { d:'+1',   f:'🇩🇴', n:'Rép. Dominicaine', fmt:'(###) ###-####',   ph:'(809) 123-4567',  mx:10 },
    HT:  { d:'+509', f:'🇭🇹', n:'Haïti',          fmt:'## ## ####',         ph:'34 12 5678',      mx:8  },
    JM:  { d:'+1',   f:'🇯🇲', n:'Jamaïque',       fmt:'(###) ###-####',     ph:'(876) 123-4567',  mx:10 },
    TT:  { d:'+1',   f:'🇹🇹', n:'Trinité-et-Tobago', fmt:'(###) ###-####', ph:'(868) 123-4567',  mx:10 },
    BB:  { d:'+1',   f:'🇧🇧', n:'Barbade',        fmt:'(###) ###-####',     ph:'(246) 123-4567',  mx:10 },
    PR:  { d:'+1',   f:'🇵🇷', n:'Porto Rico',     fmt:'(###) ###-####',     ph:'(787) 123-4567',  mx:10 },
    BR:  { d:'+55',  f:'🇧🇷', n:'Brésil',         fmt:'## #####-####',      ph:'11 91234-5678',   mx:11 },
    AR:  { d:'+54',  f:'🇦🇷', n:'Argentine',      fmt:'## ####-####',       ph:'11 1234-5678',    mx:10 },
    CL:  { d:'+56',  f:'🇨🇱', n:'Chili',          fmt:'# #### ####',        ph:'9 1234 5678',     mx:9  },
    CO:  { d:'+57',  f:'🇨🇴', n:'Colombie',       fmt:'### ### ####',       ph:'301 234 5678',    mx:10 },
    PE:  { d:'+51',  f:'🇵🇪', n:'Pérou',          fmt:'### ### ###',        ph:'912 345 678',     mx:9  },
    VE:  { d:'+58',  f:'🇻🇪', n:'Venezuela',      fmt:'### ### ####',       ph:'412 123 4567',    mx:10 },
    EC:  { d:'+593', f:'🇪🇨', n:'Équateur',       fmt:'## ### ####',        ph:'99 123 4567',     mx:9  },
    BO:  { d:'+591', f:'🇧🇴', n:'Bolivie',        fmt:'# ### ####',         ph:'7 123 4567',      mx:8  },
    PY:  { d:'+595', f:'🇵🇾', n:'Paraguay',       fmt:'### ### ###',        ph:'961 234 567',     mx:9  },
    UY:  { d:'+598', f:'🇺🇾', n:'Uruguay',        fmt:'## ### ###',         ph:'94 123 456',      mx:8  },
    GY:  { d:'+592', f:'🇬🇾', n:'Guyana',         fmt:'### ####',           ph:'621 1234',        mx:7  },
    SR:  { d:'+597', f:'🇸🇷', n:'Suriname',       fmt:'### ####',           ph:'741 2345',        mx:7  },
    GF:  { d:'+594', f:'🇬🇫', n:'Guyane française', fmt:'### ## ## ##',     ph:'694 12 34 56',    mx:9  },
    // ── Afrique ──
    MA:  { d:'+212', f:'🇲🇦', n:'Maroc',          fmt:'## ## ## ## ##',      ph:'06 12 34 56 78',  mx:10 },
    TN:  { d:'+216', f:'🇹🇳', n:'Tunisie',        fmt:'## ### ###',         ph:'20 123 456',      mx:8  },
    DZ:  { d:'+213', f:'🇩🇿', n:'Algérie',        fmt:'### ## ## ##',       ph:'551 23 45 67',    mx:9  },
    LY:  { d:'+218', f:'🇱🇾', n:'Libye',          fmt:'## ### ####',        ph:'91 234 5678',     mx:9  },
    EG:  { d:'+20',  f:'🇪🇬', n:'Égypte',         fmt:'### ### ####',       ph:'100 123 4567',    mx:10 },
    SD:  { d:'+249', f:'🇸🇩', n:'Soudan',         fmt:'## ### ####',        ph:'91 234 5678',     mx:9  },
    SN:  { d:'+221', f:'🇸🇳', n:'Sénégal',        fmt:'## ### ## ##',       ph:'77 123 45 67',    mx:9  },
    CI:  { d:'+225', f:'🇨🇮', n:'Côte d\'Ivoire',  fmt:'## ## ## ## ##',    ph:'07 12 34 56 78',  mx:10 },
    ML:  { d:'+223', f:'🇲🇱', n:'Mali',           fmt:'## ## ## ##',        ph:'76 12 34 56',     mx:8  },
    BF:  { d:'+226', f:'🇧🇫', n:'Burkina Faso',   fmt:'## ## ## ##',        ph:'70 12 34 56',     mx:8  },
    GN:  { d:'+224', f:'🇬🇳', n:'Guinée',         fmt:'### ## ## ##',       ph:'621 12 34 56',    mx:9  },
    NE:  { d:'+227', f:'🇳🇪', n:'Niger',          fmt:'## ## ## ##',        ph:'93 12 34 56',     mx:8  },
    NG:  { d:'+234', f:'🇳🇬', n:'Nigeria',        fmt:'### ### ####',       ph:'802 123 4567',    mx:10 },
    GH:  { d:'+233', f:'🇬🇭', n:'Ghana',          fmt:'## ### ####',        ph:'24 123 4567',     mx:9  },
    TG:  { d:'+228', f:'🇹🇬', n:'Togo',           fmt:'## ## ## ##',        ph:'90 12 34 56',     mx:8  },
    BJ:  { d:'+229', f:'🇧🇯', n:'Bénin',          fmt:'## ## ## ##',        ph:'97 12 34 56',     mx:8  },
    MR:  { d:'+222', f:'🇲🇷', n:'Mauritanie',     fmt:'## ## ## ##',        ph:'36 12 34 56',     mx:8  },
    GM:  { d:'+220', f:'🇬🇲', n:'Gambie',         fmt:'### ####',           ph:'301 2345',        mx:7  },
    GW:  { d:'+245', f:'🇬🇼', n:'Guinée-Bissau',  fmt:'### ####',           ph:'955 1234',        mx:7  },
    CV:  { d:'+238', f:'🇨🇻', n:'Cap-Vert',       fmt:'### ## ##',          ph:'991 12 34',       mx:7  },
    SL:  { d:'+232', f:'🇸🇱', n:'Sierra Leone',   fmt:'## ### ###',         ph:'76 123 456',      mx:8  },
    LR:  { d:'+231', f:'🇱🇷', n:'Liberia',        fmt:'### ### ####',       ph:'770 123 4567',    mx:10 },
    CM:  { d:'+237', f:'🇨🇲', n:'Cameroun',       fmt:'### ## ## ##',       ph:'671 23 45 67',    mx:9  },
    GA:  { d:'+241', f:'🇬🇦', n:'Gabon',          fmt:'# ## ## ##',         ph:'6 12 34 56',      mx:7  },
    CG:  { d:'+242', f:'🇨🇬', n:'Congo',          fmt:'## ### ####',        ph:'06 123 4567',     mx:9  },
    CD:  { d:'+243', f:'🇨🇩', n:'RD Congo',       fmt:'### ### ###',        ph:'812 345 678',     mx:9  },
    CF:  { d:'+236', f:'🇨🇫', n:'Centrafrique',   fmt:'## ## ## ##',        ph:'70 12 34 56',     mx:8  },
    TD:  { d:'+235', f:'🇹🇩', n:'Tchad',          fmt:'## ## ## ##',        ph:'66 12 34 56',     mx:8  },
    GQ:  { d:'+240', f:'🇬🇶', n:'Guinée équat.',  fmt:'### ### ###',        ph:'222 123 456',     mx:9  },
    ST:  { d:'+239', f:'🇸🇹', n:'São Tomé',       fmt:'### ####',           ph:'981 2345',        mx:7  },
    KE:  { d:'+254', f:'🇰🇪', n:'Kenya',          fmt:'### ### ###',        ph:'712 345 678',     mx:9  },
    TZ:  { d:'+255', f:'🇹🇿', n:'Tanzanie',       fmt:'### ### ###',        ph:'712 345 678',     mx:9  },
    UG:  { d:'+256', f:'🇺🇬', n:'Ouganda',        fmt:'### ### ###',        ph:'712 345 678',     mx:9  },
    RW:  { d:'+250', f:'🇷🇼', n:'Rwanda',         fmt:'### ### ###',        ph:'781 234 567',     mx:9  },
    BI:  { d:'+257', f:'🇧🇮', n:'Burundi',        fmt:'## ## ## ##',        ph:'79 12 34 56',     mx:8  },
    ET:  { d:'+251', f:'🇪🇹', n:'Éthiopie',       fmt:'## ### ####',        ph:'91 123 4567',     mx:9  },
    ER:  { d:'+291', f:'🇪🇷', n:'Érythrée',       fmt:'# ### ###',          ph:'7 123 456',       mx:7  },
    DJ:  { d:'+253', f:'🇩🇯', n:'Djibouti',       fmt:'## ## ## ##',        ph:'77 12 34 56',     mx:8  },
    SO:  { d:'+252', f:'🇸🇴', n:'Somalie',        fmt:'## ### ####',        ph:'61 234 5678',     mx:9  },
    MG:  { d:'+261', f:'🇲🇬', n:'Madagascar',     fmt:'## ## ### ##',       ph:'32 12 345 67',    mx:9  },
    KM:  { d:'+269', f:'🇰🇲', n:'Comores',        fmt:'### ## ##',          ph:'321 23 45',       mx:7  },
    SC:  { d:'+248', f:'🇸🇨', n:'Seychelles',     fmt:'# ## ## ##',         ph:'2 51 23 45',      mx:7  },
    MU:  { d:'+230', f:'🇲🇺', n:'Maurice',        fmt:'#### ####',          ph:'5251 2345',       mx:8  },
    ZA:  { d:'+27',  f:'🇿🇦', n:'Afrique du Sud', fmt:'## ### ####',        ph:'82 123 4567',     mx:9  },
    MZ:  { d:'+258', f:'🇲🇿', n:'Mozambique',     fmt:'## ### ####',        ph:'82 123 4567',     mx:9  },
    ZW:  { d:'+263', f:'🇿🇼', n:'Zimbabwe',       fmt:'## ### ####',        ph:'71 234 5678',     mx:9  },
    ZM:  { d:'+260', f:'🇿🇲', n:'Zambie',         fmt:'## ### ####',        ph:'97 123 4567',     mx:9  },
    MW:  { d:'+265', f:'🇲🇼', n:'Malawi',         fmt:'# #### ####',        ph:'9 9123 4567',     mx:9  },
    BW:  { d:'+267', f:'🇧🇼', n:'Botswana',       fmt:'## ### ###',         ph:'71 234 567',      mx:8  },
    NA:  { d:'+264', f:'🇳🇦', n:'Namibie',        fmt:'## ### ####',        ph:'81 123 4567',     mx:9  },
    SZ:  { d:'+268', f:'🇸🇿', n:'Eswatini',       fmt:'#### ####',          ph:'7612 3456',       mx:8  },
    LS:  { d:'+266', f:'🇱🇸', n:'Lesotho',        fmt:'#### ####',          ph:'5012 3456',       mx:8  },
    AO:  { d:'+244', f:'🇦🇴', n:'Angola',         fmt:'### ### ###',        ph:'923 456 789',     mx:9  },
    RE:  { d:'+262', f:'🇷🇪', n:'La Réunion',     fmt:'### ## ## ##',       ph:'692 12 34 56',    mx:9  },
    YT:  { d:'+262', f:'🇾🇹', n:'Mayotte',        fmt:'### ## ## ##',       ph:'639 12 34 56',    mx:9  },
    // ── Moyen-Orient ──
    TR:  { d:'+90',  f:'🇹🇷', n:'Turquie',        fmt:'### ### ## ##',      ph:'532 123 45 67',   mx:10 },
    LB:  { d:'+961', f:'🇱🇧', n:'Liban',          fmt:'## ### ###',         ph:'71 123 456',      mx:8  },
    AE:  { d:'+971', f:'🇦🇪', n:'Émirats arabes',  fmt:'## ### ####',       ph:'50 123 4567',     mx:9  },
    SA:  { d:'+966', f:'🇸🇦', n:'Arabie saoudite', fmt:'## ### ####',       ph:'50 123 4567',     mx:9  },
    QA:  { d:'+974', f:'🇶🇦', n:'Qatar',          fmt:'#### ####',          ph:'5512 3456',       mx:8  },
    KW:  { d:'+965', f:'🇰🇼', n:'Koweït',         fmt:'#### ####',          ph:'5012 3456',       mx:8  },
    BH:  { d:'+973', f:'🇧🇭', n:'Bahreïn',        fmt:'#### ####',          ph:'3612 3456',       mx:8  },
    OM:  { d:'+968', f:'🇴🇲', n:'Oman',           fmt:'#### ####',          ph:'9212 3456',       mx:8  },
    YE:  { d:'+967', f:'🇾🇪', n:'Yémen',          fmt:'### ### ###',        ph:'712 345 678',     mx:9  },
    JO:  { d:'+962', f:'🇯🇴', n:'Jordanie',       fmt:'# #### ####',        ph:'7 9012 3456',     mx:9  },
    IQ:  { d:'+964', f:'🇮🇶', n:'Irak',           fmt:'### ### ####',       ph:'790 123 4567',    mx:10 },
    SY:  { d:'+963', f:'🇸🇾', n:'Syrie',          fmt:'### ### ###',        ph:'944 123 456',     mx:9  },
    PS:  { d:'+970', f:'🇵🇸', n:'Palestine',      fmt:'### ## ####',        ph:'599 12 3456',     mx:9  },
    IL:  { d:'+972', f:'🇮🇱', n:'Israël',         fmt:'## ### ####',        ph:'50 123 4567',     mx:9  },
    IR:  { d:'+98',  f:'🇮🇷', n:'Iran',           fmt:'### ### ####',       ph:'912 345 6789',    mx:10 },
    // ── Asie ──
    UZ:  { d:'+998', f:'🇺🇿', n:'Ouzbékistan',    fmt:'## ### ## ##',       ph:'90 123 45 67',    mx:9  },
    TM:  { d:'+993', f:'🇹🇲', n:'Turkménistan',   fmt:'## ## ## ##',        ph:'65 12 34 56',     mx:8  },
    TJ:  { d:'+992', f:'🇹🇯', n:'Tadjikistan',    fmt:'## ### ####',        ph:'90 123 4567',     mx:9  },
    KG:  { d:'+996', f:'🇰🇬', n:'Kirghizistan',   fmt:'### ### ###',        ph:'700 123 456',     mx:9  },
    AF:  { d:'+93',  f:'🇦🇫', n:'Afghanistan',    fmt:'## ### ####',        ph:'70 123 4567',     mx:9  },
    IN:  { d:'+91',  f:'🇮🇳', n:'Inde',           fmt:'##### #####',        ph:'98765 43210',     mx:10 },
    PK:  { d:'+92',  f:'🇵🇰', n:'Pakistan',       fmt:'### ### ####',       ph:'300 123 4567',    mx:10 },
    BD:  { d:'+880', f:'🇧🇩', n:'Bangladesh',     fmt:'#### ### ###',       ph:'1712 345 678',    mx:10 },
    LK:  { d:'+94',  f:'🇱🇰', n:'Sri Lanka',      fmt:'## ### ####',        ph:'71 234 5678',     mx:9  },
    NP:  { d:'+977', f:'🇳🇵', n:'Népal',          fmt:'### ### ####',       ph:'984 123 4567',    mx:10 },
    MV:  { d:'+960', f:'🇲🇻', n:'Maldives',       fmt:'### ####',           ph:'791 2345',        mx:7  },
    BT:  { d:'+975', f:'🇧🇹', n:'Bhoutan',        fmt:'## ### ###',         ph:'17 123 456',      mx:8  },
    MM:  { d:'+95',  f:'🇲🇲', n:'Myanmar',        fmt:'## ### ####',        ph:'97 123 4567',     mx:9  },
    TH:  { d:'+66',  f:'🇹🇭', n:'Thaïlande',      fmt:'## ### ####',        ph:'81 234 5678',     mx:9  },
    SG:  { d:'+65',  f:'🇸🇬', n:'Singapour',      fmt:'#### ####',          ph:'8123 4567',       mx:8  },
    VN:  { d:'+84',  f:'🇻🇳', n:'Viêt Nam',       fmt:'### ### ####',       ph:'912 345 6789',    mx:10 },
    MY:  { d:'+60',  f:'🇲🇾', n:'Malaisie',       fmt:'## ### ####',        ph:'12 345 6789',     mx:9  },
    ID:  { d:'+62',  f:'🇮🇩', n:'Indonésie',      fmt:'### ### ####',       ph:'812 345 6789',    mx:10 },
    PH:  { d:'+63',  f:'🇵🇭', n:'Philippines',    fmt:'### ### ####',       ph:'917 123 4567',    mx:10 },
    KH:  { d:'+855', f:'🇰🇭', n:'Cambodge',       fmt:'## ### ####',        ph:'12 345 6789',     mx:9  },
    LA:  { d:'+856', f:'🇱🇦', n:'Laos',           fmt:'## ## ### ###',      ph:'20 12 345 678',   mx:9  },
    BN:  { d:'+673', f:'🇧🇳', n:'Brunei',         fmt:'### ####',           ph:'712 3456',        mx:7  },
    TL:  { d:'+670', f:'🇹🇱', n:'Timor oriental', fmt:'#### ####',          ph:'7712 3456',       mx:8  },
    JP:  { d:'+81',  f:'🇯🇵', n:'Japon',          fmt:'## #### ####',       ph:'90 1234 5678',    mx:10 },
    CN:  { d:'+86',  f:'🇨🇳', n:'Chine',          fmt:'### #### ####',      ph:'138 1234 5678',   mx:11 },
    KR:  { d:'+82',  f:'🇰🇷', n:'Corée du Sud',   fmt:'## #### ####',       ph:'10 1234 5678',    mx:10 },
    HK:  { d:'+852', f:'🇭🇰', n:'Hong Kong',      fmt:'#### ####',          ph:'5123 4567',       mx:8  },
    TW:  { d:'+886', f:'🇹🇼', n:'Taïwan',         fmt:'### ### ###',        ph:'912 345 678',     mx:9  },
    MO:  { d:'+853', f:'🇲🇴', n:'Macao',          fmt:'#### ####',          ph:'6612 3456',       mx:8  },
    MN:  { d:'+976', f:'🇲🇳', n:'Mongolie',       fmt:'#### ####',          ph:'8812 3456',       mx:8  },
    // ── Océanie ──
    AU:  { d:'+61',  f:'🇦🇺', n:'Australie',      fmt:'### ### ###',        ph:'412 345 678',     mx:9  },
    NZ:  { d:'+64',  f:'🇳🇿', n:'Nouvelle-Zélande', fmt:'## ### ####',      ph:'21 123 4567',     mx:9  },
    FJ:  { d:'+679', f:'🇫🇯', n:'Fidji',          fmt:'### ####',           ph:'701 2345',        mx:7  },
    PG:  { d:'+675', f:'🇵🇬', n:'Papouasie-N.-G.', fmt:'### ####',          ph:'681 2345',        mx:7  },
    WS:  { d:'+685', f:'🇼🇸', n:'Samoa',          fmt:'## ####',            ph:'72 1234',         mx:7  },
    TO:  { d:'+676', f:'🇹🇴', n:'Tonga',          fmt:'### ####',           ph:'771 5678',        mx:7  },
    VU:  { d:'+678', f:'🇻🇺', n:'Vanuatu',        fmt:'### ####',           ph:'591 2345',        mx:7  },
    NC:  { d:'+687', f:'🇳🇨', n:'Nouvelle-Calédonie', fmt:'## ## ##',       ph:'75 12 34',        mx:6  },
    PF:  { d:'+689', f:'🇵🇫', n:'Polynésie française', fmt:'## ## ##',      ph:'87 12 34',        mx:6  },
  }

  // COMPAT: anciennes clés → nouvelles
  var COUNTRIES = {}
  var ALL_CODES = []
  for (var k in C) {
    if (!C.hasOwnProperty(k)) continue
    COUNTRIES[k] = { dial: C[k].d, flag: C[k].f, name: C[k].n, fmt: C[k].fmt, ph: C[k].ph, max: C[k].mx }
    ALL_CODES.push(k)
  }

  // ══════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════
  function digits(v) { return (v || '').replace(/\D/g, '') }

  function formatPhone(raw, fmt) {
    var d = digits(raw), i = 0, out = ''
    for (var c = 0; c < fmt.length && i < d.length; c++) {
      out += fmt[c] === '#' ? d[i++] : fmt[c]
    }
    return out
  }

  function toE164(local, cc) {
    var c = COUNTRIES[cc] || COUNTRIES.CH
    var d = digits(local)
    if (!d) return ''
    if (d[0] === '0') d = d.slice(1)
    return c.dial + d
  }

  function fromE164(e164, cc) {
    var c = COUNTRIES[cc] || COUNTRIES.CH
    if (!e164) return ''
    if (e164.indexOf(c.dial) === 0) return e164.slice(c.dial.length)
    return e164.replace(/^\+\d{1,3}/, '')
  }

  // Détection IP → pays (async, facultatif)
  function detectCountry(cb) {
    try {
      var x = new XMLHttpRequest()
      x.open('GET', 'https://ipapi.co/json/', true)
      x.timeout = 3000
      x.onload = function () {
        try {
          var r = JSON.parse(x.responseText)
          var cc = (r.country_code || '').toUpperCase()
          cb(COUNTRIES[cc] ? cc : null)
        } catch (e) { cb(null) }
      }
      x.onerror = x.ontimeout = function () { cb(null) }
      x.send()
    } catch (e) { cb(null) }
  }

  // ══════════════════════════════════════════════════
  //  STYLES (injection unique)
  // ══════════════════════════════════════════════════
  var injected = false
  function injectStyles() {
    if (injected) return; injected = true
    var s = document.createElement('style')
    s.id = 'r3phone-css'
    s.textContent = [
      // Wrap
      '.r3p{display:flex;align-items:stretch;border-radius:8px;overflow:visible;border:1.5px solid var(--border,#2a3a52);background:var(--surf3,#1a2840);transition:border-color .15s;position:relative}',
      '.r3p:focus-within{border-color:var(--ac,#5b9cf6)}',
      // Flag
      '.r3p-f{display:flex;align-items:center;gap:4px;padding:0 8px;cursor:pointer;background:transparent;border:none;border-right:1px solid var(--border,#2a3a52);font-size:16px;color:var(--text,#e8ecf1);flex-shrink:0;min-height:44px;transition:background .12s}',
      '.r3p-f:hover{background:rgba(91,156,246,.06)}',
      '.r3p-c .r3p-f{min-height:36px;font-size:14px;padding:0 6px}',
      // Caret
      '.r3p-v{font-size:8px;opacity:.45;margin-left:1px}',
      // Dial code
      '.r3p-d{display:flex;align-items:center;padding:0 6px;font-size:12px;color:var(--t3,#6b7f99);font-family:var(--fm,"DM Mono",monospace);font-weight:600;flex-shrink:0;user-select:none}',
      '.r3p-c .r3p-d{font-size:11px;padding:0 4px}',
      // Input
      '.r3p-i{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--text,#e8ecf1);font-size:14px;font-family:var(--fm,"DM Mono",monospace);font-weight:500;padding:0 10px;height:44px;box-sizing:border-box}',
      '.r3p-i::placeholder{color:var(--t4,#4a5f7a)}',
      '.r3p-c .r3p-i{height:36px;font-size:13px;padding:0 8px}',
      // Light theme overrides
      '.r3p.light{border-color:var(--border,#d5dbe3);background:var(--bg,#fff)}',
      '.r3p.light:focus-within{border-color:var(--blue-mid,#1c4f90)}',
      '.r3p.light .r3p-f{border-right-color:var(--border,#d5dbe3)}',
      '.r3p.light .r3p-f:hover{background:rgba(28,79,144,.04)}',
      '.r3p.light .r3p-d{color:var(--muted,#6e7d91)}',
      '.r3p.light .r3p-i{color:var(--text,#1a2033)}',
      '.r3p.light .r3p-i::placeholder{color:var(--muted,#a0abb8)}',
      // Dropdown
      '.r3p-dd{display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:9999;border-radius:10px;box-shadow:0 10px 36px rgba(0,0,0,.45);max-height:260px;width:260px;flex-direction:column;overflow:hidden}',
      '.r3p-dd{background:var(--surf2,#111e33);border:1.5px solid var(--border,#2a3a52)}',
      '.r3p.light .r3p-dd{background:#fff;border-color:var(--border,#d5dbe3);box-shadow:0 10px 36px rgba(0,0,0,.1)}',
      '.r3p-dd.open{display:flex}',
      // Search
      '.r3p-ds{width:100%;padding:9px 12px;border:none;border-bottom:1px solid var(--border,#2a3a52);background:var(--surf3,#1a2840);color:var(--text,#e8ecf1);font-size:12px;outline:none;box-sizing:border-box}',
      '.r3p-ds::placeholder{color:var(--t4,#4a5f7a)}',
      '.r3p.light .r3p-ds{background:var(--bg,#f7f8fa);color:var(--text,#1a2033);border-bottom-color:var(--border,#d5dbe3)}',
      // Items
      '.r3p-dl{overflow-y:auto;flex:1;scrollbar-width:thin}',
      '.r3p-di{display:flex;align-items:center;gap:9px;width:100%;padding:7px 12px;border:none;cursor:pointer;background:transparent;color:var(--text,#e8ecf1);font-size:13px;text-align:left;transition:background .08s}',
      '.r3p-di:hover{background:rgba(91,156,246,.08)}',
      '.r3p-di.on{background:rgba(91,156,246,.14);color:#7bb8ff}',
      '.r3p.light .r3p-di{color:var(--text,#1a2033)}',
      '.r3p.light .r3p-di:hover{background:rgba(28,79,144,.05)}',
      '.r3p.light .r3p-di.on{background:rgba(28,79,144,.08);color:var(--blue-mid,#1c4f90)}',
      '.r3p-di em{font-size:17px;font-style:normal;flex-shrink:0}',
      '.r3p-di b{font-size:12px;min-width:24px}',
      '.r3p-di span{font-size:11px;flex:1}',
      '.r3p-di small{font-size:11px;font-family:var(--fm,"DM Mono",monospace);color:var(--t3,#6b7f99);font-weight:600}',
    ].join('\n')
    document.head.appendChild(s)
  }

  // ══════════════════════════════════════════════════
  //  CREATE
  // ══════════════════════════════════════════════════
  function create(container, opts) {
    opts = opts || {}
    injectStyles()

    var cc = opts.country || 'CH'
    var c = COUNTRIES[cc] || COUNTRIES.CH
    var compact = !!opts.compact
    var light = !!opts.light
    var showSel = opts.selector !== false
    var localDigits = ''
    var onInput = opts.onInput || function () {}
    var onE164 = opts.onE164 || function () {}
    var onCountry = opts.onCountry || function () {}

    // ── Wrap ─────────────────────────────────────
    var wrap = document.createElement('div')
    wrap.className = 'r3p' + (compact ? ' r3p-c' : '') + (light ? ' light' : '')

    // ── Flag button ──────────────────────────────
    var fb = document.createElement('button')
    fb.type = 'button'; fb.className = 'r3p-f'
    fb.innerHTML = '<em>' + c.flag + '</em>' + (showSel ? '<span class="r3p-v">▾</span>' : '')
    wrap.appendChild(fb)

    // ── Dial ─────────────────────────────────────
    var dd = document.createElement('div')
    dd.className = 'r3p-d'; dd.textContent = c.dial
    wrap.appendChild(dd)

    // ── Input ────────────────────────────────────
    var inp = document.createElement('input')
    inp.type = 'tel'; inp.inputMode = 'tel'
    inp.className = 'r3p-i'; inp.placeholder = c.ph
    inp.autocomplete = 'tel-national'
    wrap.appendChild(inp)

    // ── Dropdown ─────────────────────────────────
    var drop = null, searchInp = null, listEl = null
    if (showSel) {
      drop = document.createElement('div'); drop.className = 'r3p-dd'
      searchInp = document.createElement('input')
      searchInp.type = 'text'; searchInp.className = 'r3p-ds'
      searchInp.placeholder = '🔍 Rechercher un pays…'
      searchInp.autocomplete = 'off'
      drop.appendChild(searchInp)
      listEl = document.createElement('div'); listEl.className = 'r3p-dl'
      drop.appendChild(listEl)
      wrap.appendChild(drop)

      function renderList(filter) {
        listEl.innerHTML = ''
        var f = (filter || '').toLowerCase()
        ALL_CODES.forEach(function (code) {
          var co = COUNTRIES[code]
          var searchable = (code + ' ' + co.name + ' ' + co.dial).toLowerCase()
          if (f && searchable.indexOf(f) === -1) return
          var it = document.createElement('button')
          it.type = 'button'; it.className = 'r3p-di' + (code === cc ? ' on' : '')
          it.innerHTML = '<em>' + co.flag + '</em><b>' + code + '</b><span>' + co.name + '</span><small>' + co.dial + '</small>'
          it.addEventListener('click', function () { setCountry(code); drop.classList.remove('open') })
          listEl.appendChild(it)
        })
      }

      searchInp.addEventListener('input', function () { renderList(searchInp.value) })

      fb.addEventListener('click', function (e) {
        e.stopPropagation()
        var open = drop.classList.toggle('open')
        if (open) { searchInp.value = ''; renderList(); searchInp.focus() }
      })

      document.addEventListener('click', function (e) {
        if (drop && !wrap.contains(e.target)) drop.classList.remove('open')
      })

      renderList()
    }

    // ── Country switcher ─────────────────────────
    function setCountry(code) {
      if (!COUNTRIES[code]) return
      cc = code; c = COUNTRIES[cc]
      fb.querySelector('em').textContent = c.flag
      dd.textContent = c.dial
      inp.placeholder = c.ph
      updateDisplay()
      onCountry(cc)
    }

    // ── Format + emit ────────────────────────────
    function updateDisplay() {
      inp.value = formatPhone(localDigits, c.fmt)
      onInput(localDigits)
      onE164(localDigits ? toE164(localDigits, cc) : '')
    }

    inp.addEventListener('input', function () {
      localDigits = digits(inp.value).slice(0, c.max)
      updateDisplay()
    })

    // ── Auto-detect ──────────────────────────────
    if (opts.autoDetect) {
      detectCountry(function (detected) {
        if (detected && !localDigits) setCountry(detected)
      })
    }

    // ── Mount ────────────────────────────────────
    var target = typeof container === 'string' ? document.querySelector(container) : container
    if (target) target.appendChild(wrap)

    // ── Public API ───────────────────────────────
    return {
      el: wrap,
      input: inp,
      getValue: function () { return localDigits },
      getFormatted: function () { return formatPhone(localDigits, c.fmt) },
      getE164: function () { return toE164(localDigits, cc) },
      getCountry: function () { return cc },
      getDial: function () { return c.dial },
      setValue: function (v) { localDigits = digits(v).slice(0, c.max); updateDisplay() },
      setE164: function (e164) { localDigits = digits(fromE164(e164, cc)).slice(0, c.max); updateDisplay() },
      setCountry: setCountry,
      isValid: function () { return digits(localDigits).length >= 7 },
      focus: function () { inp.focus() },
      destroy: function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap) },
    }
  }

  // ══════════════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════════════
  root.R3Phone = {
    version: '2.0.0',
    create: create,
    init: function (sel, opts) { return create(sel, opts) },
    COUNTRIES: COUNTRIES,
    ALL_CODES: ALL_CODES,
    toE164: toE164,
    fromE164: fromE164,
    formatPhone: formatPhone,
    digits: digits,
    detectCountry: detectCountry,
  }

})(window)
