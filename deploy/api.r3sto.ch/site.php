<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class SiteHandler {

    /**
     * Check if a subdomain slug is available
     */
    public static function checkSlug($slug) {
        $slug = self::sanitizeSlug($slug);

        if (empty($slug) || strlen($slug) < 3) {
            return ['available' => false, 'error' => 'Le slug doit contenir au moins 3 caractères', 'code' => 400];
        }

        if (strlen($slug) > 40) {
            return ['available' => false, 'error' => 'Le slug ne doit pas dépasser 40 caractères', 'code' => 400];
        }

        // Reserved slugs
        $reserved = ['api', 'app', 'admin', 'auth', 'bill', 'billing', 'booking', 'demo',
                      'delivery', 'menu', 'www', 'mail', 'ftp', 'test', 'staging', 'dev',
                      'r3sto', 'support', 'help', 'docs', 'status', 'blog'];
        if (in_array($slug, $reserved)) {
            return ['available' => false, 'slug' => $slug, 'reason' => 'reserved', 'code' => 200];
        }

        try {
            $existing = Database::fetchOne(
                'SELECT id FROM site_configs WHERE slug = ?',
                [$slug]
            );

            return [
                'available' => !$existing,
                'slug' => $slug,
                'domain' => $slug . '.r3sto.ch',
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['available' => false, 'error' => 'Erreur de vérification', 'code' => 500];
        }
    }

    /**
     * Auto-suggest slugs from restaurant name
     */
    public static function suggestSlugs($data) {
        $name = isset($data['name']) ? trim($data['name']) : '';
        if (empty($name)) {
            return ['error' => 'Nom du restaurant requis', 'code' => 400];
        }

        $city = isset($data['city']) ? trim($data['city']) : '';

        // Generate slug candidates
        $candidates = [];

        // Base slug from name
        $base = self::sanitizeSlug($name);
        if (strlen($base) >= 3) {
            $candidates[] = $base;
        }

        // Shortened versions
        $words = explode('-', $base);
        if (count($words) > 1) {
            // First two words
            $candidates[] = implode('-', array_slice($words, 0, 2));
            // Initials + last word
            $initials = '';
            for ($i = 0; $i < count($words) - 1; $i++) {
                $initials .= substr($words[$i], 0, 1);
            }
            $candidates[] = $initials . '-' . end($words);
        }

        // With city
        if (!empty($city)) {
            $citySlug = self::sanitizeSlug($city);
            $candidates[] = $base . '-' . $citySlug;
            if (count($words) > 0) {
                $candidates[] = $words[0] . '-' . $citySlug;
            }
        }

        // Remove duplicates and too short
        $candidates = array_values(array_unique(array_filter($candidates, function($s) {
            return strlen($s) >= 3 && strlen($s) <= 40;
        })));

        // Check availability for each
        $suggestions = [];
        try {
            foreach (array_slice($candidates, 0, 5) as $slug) {
                $existing = Database::fetchOne(
                    'SELECT id FROM site_configs WHERE slug = ?',
                    [$slug]
                );
                $reserved = in_array($slug, ['api','app','admin','auth','bill','billing','booking',
                    'demo','delivery','menu','www','mail','ftp','test','staging','dev','r3sto',
                    'support','help','docs','status','blog']);

                $suggestions[] = [
                    'slug' => $slug,
                    'domain' => $slug . '.r3sto.ch',
                    'available' => !$existing && !$reserved
                ];
            }
        } catch (Exception $e) {
            return ['error' => 'Erreur de vérification', 'code' => 500];
        }

        return ['suggestions' => $suggestions, 'code' => 200];
    }

    /**
     * Save site configuration (create or update)
     */
    public static function saveSiteConfig($userId, $restaurantId, $data) {
        // Verify restaurant ownership and plan
        $restaurant = Database::fetchOne(
            'SELECT id, plan, name, city FROM restaurants WHERE id = ? AND owner_id = ?',
            [$restaurantId, $userId]
        );

        if (!$restaurant) {
            return ['error' => 'Restaurant non trouvé', 'code' => 404];
        }

        // Site Vitrine requires Resto or Gastro plan
        if ($restaurant['plan'] === 'bistro') {
            return ['error' => 'La fonctionnalité Site Vitrine nécessite un plan Resto ou Gastro', 'code' => 403];
        }

        // Validate slug if provided
        $slug = isset($data['slug']) ? self::sanitizeSlug($data['slug']) : null;
        if ($slug !== null) {
            if (strlen($slug) < 3 || strlen($slug) > 40) {
                return ['error' => 'Le slug doit contenir entre 3 et 40 caractères', 'code' => 400];
            }

            // Check slug uniqueness (excluding current restaurant)
            $existing = Database::fetchOne(
                'SELECT id FROM site_configs WHERE slug = ? AND restaurant_id != ?',
                [$slug, $restaurantId]
            );
            if ($existing) {
                return ['error' => 'Ce sous-domaine est déjà utilisé', 'code' => 409];
            }
        }

        // Validate theme
        $validThemes = ['dark-elegant', 'light-fresh', 'warm-bistro', 'modern-minimal', 'zen-japanese'];
        $theme = isset($data['theme']) ? $data['theme'] : 'modern-minimal';
        if (!in_array($theme, $validThemes)) {
            $theme = 'modern-minimal';
        }

        // Build config JSON
        $config = [
            'theme' => $theme,
            'tagline' => isset($data['tagline']) ? trim($data['tagline']) : '',
            'description' => isset($data['description']) ? trim($data['description']) : '',
            'cuisine' => isset($data['cuisine']) ? trim($data['cuisine']) : '',
            'founded' => isset($data['founded']) ? trim($data['founded']) : '',
            'priceRange' => isset($data['priceRange']) ? trim($data['priceRange']) : '',
            'heroImage' => isset($data['heroImage']) ? trim($data['heroImage']) : '',
            'logo' => isset($data['logo']) ? trim($data['logo']) : '',
            'phone' => isset($data['phone']) ? trim($data['phone']) : ($restaurant['city'] ?? ''),
            'email' => isset($data['email']) ? trim($data['email']) : '',
            'address' => isset($data['address']) ? trim($data['address']) : '',
            'city' => isset($data['city']) ? trim($data['city']) : ($restaurant['city'] ?? ''),
            'mapQuery' => isset($data['mapQuery']) ? trim($data['mapQuery']) : '',
            'languages' => isset($data['languages']) ? $data['languages'] : ['fr'],
            'defaultLang' => isset($data['defaultLang']) ? $data['defaultLang'] : 'fr',
            'social' => isset($data['social']) ? $data['social'] : [],
            'sections' => isset($data['sections']) ? $data['sections'] : [],
            'services' => isset($data['services']) ? $data['services'] : [],
            'footerHours' => isset($data['footerHours']) ? $data['footerHours'] : [],
            'bookingUrl' => isset($data['bookingUrl']) ? $data['bookingUrl'] : '',
            'deliveryUrl' => isset($data['deliveryUrl']) ? $data['deliveryUrl'] : '',
        ];

        $configJson = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        try {
            // Check if config exists
            $existingConfig = Database::fetchOne(
                'SELECT id FROM site_configs WHERE restaurant_id = ?',
                [$restaurantId]
            );

            if ($existingConfig) {
                // Update
                $fields = ['config_json = ?', 'theme = ?'];
                $params = [$configJson, $theme];

                if ($slug !== null) {
                    $fields[] = 'slug = ?';
                    $params[] = $slug;
                }

                $params[] = $restaurantId;
                Database::update(
                    'UPDATE site_configs SET ' . implode(', ', $fields) . ' WHERE restaurant_id = ?',
                    $params
                );
            } else {
                // Insert — slug required for new config
                if (empty($slug)) {
                    return ['error' => 'Le sous-domaine est requis pour créer un site', 'code' => 400];
                }

                Database::insert(
                    'INSERT INTO site_configs (restaurant_id, slug, theme, config_json, status) VALUES (?, ?, ?, ?, ?)',
                    [$restaurantId, $slug, $theme, $configJson, 'draft']
                );
            }

            // Fetch updated record
            $saved = Database::fetchOne(
                'SELECT id, restaurant_id, slug, theme, config_json, status, published_at, created_at, updated_at
                 FROM site_configs WHERE restaurant_id = ?',
                [$restaurantId]
            );

            return [
                'id' => (int)$saved['id'],
                'restaurant_id' => (int)$saved['restaurant_id'],
                'slug' => $saved['slug'],
                'domain' => $saved['slug'] . '.r3sto.ch',
                'theme' => $saved['theme'],
                'config' => json_decode($saved['config_json'], true),
                'status' => $saved['status'],
                'published_at' => $saved['published_at'],
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Erreur de sauvegarde: ' . $e->getMessage(), 'code' => 500];
        }
    }

    /**
     * Get site configuration for a restaurant
     */
    public static function getSiteConfig($userId, $restaurantId) {
        $restaurant = Database::fetchOne(
            'SELECT id, plan, name FROM restaurants WHERE id = ? AND owner_id = ?',
            [$restaurantId, $userId]
        );

        if (!$restaurant) {
            return ['error' => 'Restaurant non trouvé', 'code' => 404];
        }

        try {
            $config = Database::fetchOne(
                'SELECT id, restaurant_id, slug, theme, config_json, status, published_at, created_at, updated_at
                 FROM site_configs WHERE restaurant_id = ?',
                [$restaurantId]
            );

            if (!$config) {
                return ['config' => null, 'restaurant' => $restaurant['name'], 'code' => 200];
            }

            return [
                'id' => (int)$config['id'],
                'restaurant_id' => (int)$config['restaurant_id'],
                'slug' => $config['slug'],
                'domain' => $config['slug'] . '.r3sto.ch',
                'theme' => $config['theme'],
                'config' => json_decode($config['config_json'], true),
                'status' => $config['status'],
                'published_at' => $config['published_at'],
                'restaurant' => $restaurant['name'],
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Erreur de chargement', 'code' => 500];
        }
    }

    /**
     * Publish the site — generate HTML and write to server directory
     */
    public static function publishSite($userId, $restaurantId) {
        $restaurant = Database::fetchOne(
            'SELECT id, plan, name, city, address, phone FROM restaurants WHERE id = ? AND owner_id = ?',
            [$restaurantId, $userId]
        );

        if (!$restaurant) {
            return ['error' => 'Restaurant non trouvé', 'code' => 404];
        }

        if ($restaurant['plan'] === 'bistro') {
            return ['error' => 'Plan Resto ou Gastro requis', 'code' => 403];
        }

        $siteConfig = Database::fetchOne(
            'SELECT id, slug, theme, config_json, status FROM site_configs WHERE restaurant_id = ?',
            [$restaurantId]
        );

        if (!$siteConfig) {
            return ['error' => 'Aucune configuration trouvée. Configurez votre site d\'abord.', 'code' => 400];
        }

        $slug = $siteConfig['slug'];
        $config = json_decode($siteConfig['config_json'], true);
        $config['theme'] = $siteConfig['theme'];
        $config['name'] = $restaurant['name'];

        // Fill in restaurant defaults for missing config fields
        if (empty($config['city'])) $config['city'] = $restaurant['city'] ?? '';
        if (empty($config['address'])) $config['address'] = $restaurant['address'] ?? '';
        if (empty($config['phone'])) $config['phone'] = $restaurant['phone'] ?? '';

        try {
            // Generate HTML
            $html = self::generateSiteHTML($slug, $config, $restaurant);

            // Write to server directory
            $siteDir = '/home/clients/pl7wy9/sites/' . $slug . '.r3sto.ch';

            // Create directory if it doesn't exist
            if (!is_dir($siteDir)) {
                @mkdir($siteDir, 0755, true);
            }

            // Write index.html
            $written = @file_put_contents($siteDir . '/index.html', $html);

            if ($written === false) {
                // Fallback: try writing to a staging area
                $stagingDir = sys_get_temp_dir() . '/r3sto_sites/' . $slug;
                @mkdir($stagingDir, 0755, true);
                $written = file_put_contents($stagingDir . '/index.html', $html);

                if ($written === false) {
                    return ['error' => 'Impossible d\'écrire le fichier', 'code' => 500];
                }

                // Update status
                Database::update(
                    'UPDATE site_configs SET status = ?, published_at = NOW() WHERE restaurant_id = ?',
                    ['staged', $restaurantId]
                );

                return [
                    'published' => true,
                    'status' => 'staged',
                    'slug' => $slug,
                    'domain' => $slug . '.r3sto.ch',
                    'note' => 'Site généré en staging. Le sous-domaine doit être créé sur Infomaniak.',
                    'staging_path' => $stagingDir . '/index.html',
                    'size' => $written,
                    'code' => 200
                ];
            }

            // Write .htaccess for clean URLs
            $htaccess = "RewriteEngine On\nRewriteBase /\n\n# Force HTTPS\nRewriteCond %{HTTPS} off\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\n# SPA fallback\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^ index.html [L]\n";
            @file_put_contents($siteDir . '/.htaccess', $htaccess);

            // Update status
            Database::update(
                'UPDATE site_configs SET status = ?, published_at = NOW() WHERE restaurant_id = ?',
                ['published', $restaurantId]
            );

            return [
                'published' => true,
                'status' => 'published',
                'slug' => $slug,
                'domain' => $slug . '.r3sto.ch',
                'url' => 'https://' . $slug . '.r3sto.ch',
                'size' => $written,
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Erreur de publication: ' . $e->getMessage(), 'code' => 500];
        }
    }

    /**
     * Generate complete HTML for the restaurant site
     */
    private static function generateSiteHTML($slug, $config, $restaurant) {
        $name = self::esc($config['name'] ?? $restaurant['name']);
        $tagline = self::esc($config['tagline'] ?? '');
        $description = self::esc($config['description'] ?? '');
        $cuisine = self::esc($config['cuisine'] ?? '');
        $city = self::esc($config['city'] ?? '');
        $address = self::esc($config['address'] ?? '');
        $phone = self::esc($config['phone'] ?? '');
        $email = self::esc($config['email'] ?? '');
        $founded = self::esc($config['founded'] ?? '');
        $priceRange = self::esc($config['priceRange'] ?? '');
        $theme = self::esc($config['theme'] ?? 'modern-minimal');
        $heroImage = self::esc($config['heroImage'] ?? '');
        $logo = self::esc($config['logo'] ?? '');
        $mapQuery = self::esc($config['mapQuery'] ?? $name . ' ' . $city);
        $bookingUrl = self::esc($config['bookingUrl'] ?? 'https://booking.r3sto.ch/?r=' . $slug);
        $deliveryUrl = self::esc($config['deliveryUrl'] ?? 'https://delivery.r3sto.ch/?r=' . $slug);
        $defaultLang = $config['defaultLang'] ?? 'fr';
        $languages = $config['languages'] ?? ['fr'];
        $sections = $config['sections'] ?? [];
        $social = $config['social'] ?? [];
        $services = $config['services'] ?? [];
        $footerHours = $config['footerHours'] ?? [];

        // Build section flags
        $hasStory = !empty($sections['story']);
        $hasSpecialties = !empty($sections['specialties']['items']);
        $hasMenu = !empty($sections['menu']['categories']);
        $hasReviews = !empty($sections['reviews']['items']);
        $hasContact = !empty($sections['contact']);
        $hasReservation = !empty($sections['reservation']) || !empty($bookingUrl);

        // Build config JS object
        $jsConfig = json_encode([
            'id' => $slug,
            'name' => $config['name'] ?? $restaurant['name'],
            'cuisine' => $config['cuisine'] ?? '',
            'city' => $config['city'] ?? '',
            'address' => $config['address'] ?? '',
            'location' => $config['city'] ?? '',
            'phone' => $config['phone'] ?? '',
            'email' => $config['email'] ?? '',
            'founded' => $config['founded'] ?? '',
            'priceRange' => $config['priceRange'] ?? '',
            'mapQuery' => $config['mapQuery'] ?? '',
            'theme' => $config['theme'] ?? 'modern-minimal',
            'languages' => $languages,
            'defaultLang' => $defaultLang,
            'logo' => $config['logo'] ?? '',
            'heroImage' => $config['heroImage'] ?? '',
            'apiBase' => 'https://api.r3sto.ch',
            'bookingUrl' => $config['bookingUrl'] ?? '',
            'deliveryUrl' => $config['deliveryUrl'] ?? '',
            'services' => $services,
            'social' => $social,
            'footerHours' => $footerHours,
            'sections' => $sections,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // Language pills HTML
        $langPills = '';
        foreach ($languages as $lang) {
            $active = ($lang === $defaultLang) ? ' active' : '';
            $langPills .= '<button class="lang-pill' . $active . '" onclick="setLang(\'' . $lang . '\')">' . strtoupper($lang) . '</button>';
        }

        // Social links HTML
        $socialHTML = '';
        if (!empty($social['instagram'])) $socialHTML .= '<a href="' . self::esc($social['instagram']) . '" target="_blank" rel="noopener" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>';
        if (!empty($social['facebook'])) $socialHTML .= '<a href="' . self::esc($social['facebook']) . '" target="_blank" rel="noopener" aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>';
        if (!empty($social['tripadvisor'])) $socialHTML .= '<a href="' . self::esc($social['tripadvisor']) . '" target="_blank" rel="noopener" aria-label="TripAdvisor"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></a>';

        // Footer hours HTML
        $footerHoursHTML = '';
        foreach ($footerHours as $h) {
            $style = isset($h['style']) ? ' style="' . self::esc($h['style']) . '"' : '';
            $footerHoursHTML .= '<p' . $style . '>' . self::esc($h['text'] ?? '') . '</p>';
        }

        // Services HTML for booking widget
        $servicesHTML = '';
        foreach ($services as $i => $svc) {
            $active = ($i === 0) ? ' active' : '';
            $servicesHTML .= '<button class="svc-tab' . $active . '" data-svc="' . $i . '">' . self::esc($svc['name'] ?? '') . '</button>';
        }

        // Story section HTML
        $storyHTML = '';
        if ($hasStory) {
            $s = $sections['story'];
            $storyHTML = '<section class="section story" id="story"><div class="story-grid"><div class="story-img rv"><img src="' . self::esc($s['image'] ?? '') . '" alt="' . $name . '" loading="lazy"></div><div class="story-txt rv rv-r">' . (!empty($s['year']) ? '<span class="badge">' . self::esc($s['year']) . (!empty($s['badgeText']) ? ' — ' . self::esc($s['badgeText']) : '') . '</span>' : '') . '<span class="tag" data-i18n="storyTag">Notre histoire</span><h2 class="h2">' . self::esc($s['title'] ?? '') . '</h2><p class="corpo">' . self::esc($s['text'] ?? '') . '</p></div></div></section>';
        }

        // Specialties section HTML
        $specHTML = '';
        if ($hasSpecialties) {
            $sp = $sections['specialties'];
            $items = '';
            foreach (($sp['items'] ?? []) as $item) {
                $items .= '<div class="spec-card rv"><div class="spec-icon">' . self::esc($item['icon'] ?? '🍽') . '</div><h3>' . self::esc($item['name'] ?? '') . '</h3><p>' . self::esc($item['desc'] ?? '') . '</p>' . (!empty($item['price']) ? '<span class="spec-price">' . self::esc($item['price']) . '</span>' : '') . '</div>';
            }
            $specHTML = '<section class="section specs" id="specialties"><span class="tag" data-i18n="specTag">Spécialités</span><h2 class="h2">' . self::esc($sp['title'] ?? 'Nos spécialités') . '</h2>' . (!empty($sp['text']) ? '<p class="corpo">' . self::esc($sp['text']) . '</p>' : '') . '<div class="spec-grid">' . $items . '</div></section>';
        }

        // Menu section HTML
        $menuHTML = '';
        if ($hasMenu) {
            $m = $sections['menu'];
            $menuHTML = '<section class="section carte" id="menu"><span class="tag" data-i18n="menuTag">La carte</span><h2 class="h2">' . self::esc($m['title'] ?? 'Notre carte') . '</h2><div class="menu-tabs" id="menuTabs"></div><div class="menu-items" id="menuItems"></div></section>';
        }

        // Reviews section HTML
        $reviewsHTML = '';
        if ($hasReviews) {
            $rv = $sections['reviews'];
            $reviewCards = '';
            foreach (($rv['items'] ?? []) as $rev) {
                $stars = str_repeat('★', (int)($rev['stars'] ?? 5)) . str_repeat('☆', 5 - (int)($rev['stars'] ?? 5));
                $reviewCards .= '<div class="rev-card rv"><span class="rev-q">"</span><p>' . self::esc($rev['text'] ?? '') . '</p><div class="rev-author"><span class="rev-stars">' . $stars . '</span><strong>' . self::esc($rev['who'] ?? '') . '</strong>' . (!empty($rev['source']) ? '<span class="rev-src">' . self::esc($rev['source']) . '</span>' : '') . '</div></div>';
            }
            $score = self::esc($rv['score'] ?? '');
            $countText = self::esc($rv['countText'] ?? '');
            $reviewsHTML = '<section class="section reviews" id="reviews"><span class="tag">Avis</span><h2 class="h2">' . self::esc($rv['title'] ?? 'Ce que disent nos clients') . '</h2>' . (!empty($score) ? '<div class="rev-score"><span class="rev-big">' . $score . '</span><span class="rev-count">' . $countText . '</span></div>' : '') . '<div class="rev-grid">' . $reviewCards . '</div></section>';
        }

        // Contact section HTML
        $contactHTML = '';
        if ($hasContact) {
            $encodedQuery = urlencode($mapQuery);
            $contactHTML = '<section class="section contact" id="contact"><div class="contact-grid"><div class="contact-map"><iframe src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=' . $encodedQuery . '" width="100%" height="400" style="border:0;border-radius:12px" allowfullscreen loading="lazy"></iframe></div><div class="contact-info rv rv-r"><span class="tag">Contact</span><h2 class="h2">Nous trouver</h2>' . (!empty($address) ? '<p class="contact-line">📍 ' . $address . (!empty($city) ? ', ' . $city : '') . '</p>' : '') . (!empty($phone) ? '<p class="contact-line">📞 <a href="tel:' . preg_replace('/[^+0-9]/', '', $phone) . '">' . $phone . '</a></p>' : '') . (!empty($email) ? '<p class="contact-line">✉️ <a href="mailto:' . $email . '">' . $email . '</a></p>' : '') . '<a href="https://www.google.com/maps/search/?api=1&query=' . $encodedQuery . '" target="_blank" class="btn-outline" data-i18n="openMaps">Ouvrir dans Maps</a></div></div></section>';
        }

        // Now build the full HTML
        $html = '<!DOCTYPE html>
<html lang="' . $defaultLang . '" data-theme="' . $theme . '">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . $name . ($tagline ? ' — ' . $tagline : '') . '</title>
<meta name="description" content="' . ($description ?: $name . ' ' . $cuisine . ' ' . $city) . '">
<meta property="og:title" content="' . $name . '">
<meta property="og:description" content="' . ($tagline ?: $description) . '">
<meta property="og:type" content="restaurant">
<meta property="og:url" content="https://' . $slug . '.r3sto.ch">
<link rel="canonical" href="https://' . $slug . '.r3sto.ch">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
' . self::getThemeCSS() . '
' . self::getComponentCSS() . '
</head>
<body>

<!-- Navigation -->
<nav class="nav" id="nav">
<div class="nav-inner">
  <a href="#" class="nav-logo">' . ($logo ? '<img src="' . $logo . '" alt="' . $name . '" height="36">' : '<span class="nav-name">' . $name . '</span>') . '</a>
  <div class="nav-links" id="navLinks">
    ' . ($hasStory ? '<a href="#story" data-i18n="navStory">Histoire</a>' : '') . '
    ' . ($hasSpecialties ? '<a href="#specialties" data-i18n="navSpec">Spécialités</a>' : '') . '
    ' . ($hasMenu ? '<a href="#menu" data-i18n="navMenu">Carte</a>' : '') . '
    ' . ($hasReviews ? '<a href="#reviews" data-i18n="navReviews">Avis</a>' : '') . '
    ' . ($hasContact ? '<a href="#contact" data-i18n="navContact">Contact</a>' : '') . '
    <a href="#reservation" class="btn-accent nav-cta" data-i18n="bookTable">Réserver</a>
  </div>
  <div class="nav-right">
    <div class="lang-selector">' . $langPills . '</div>
    <button class="burger" id="burger" onclick="toggleMobileMenu()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</div>
</nav>

<!-- Hero -->
<header class="hero" id="hero"' . ($heroImage ? ' style="background-image:url(\'' . $heroImage . '\')"' : '') . '>
<div class="hero-overlay"></div>
<div class="hero-content">
  ' . ($logo ? '<img src="' . $logo . '" alt="' . $name . '" class="hero-logo">' : '') . '
  <h1 class="hero-title">' . $name . '</h1>
  ' . ($tagline ? '<p class="hero-tagline">' . $tagline . '</p>' : '') . '
  ' . ($city ? '<p class="hero-location">📍 ' . $city . '</p>' : '') . '
  <div class="hero-btns">
    <a href="#reservation" class="btn-accent" data-i18n="bookTable">Réserver une table</a>
    ' . ($hasMenu ? '<a href="#menu" class="btn-outline" data-i18n="seeMenu">Voir la carte</a>' : '') . '
  </div>
</div>
<div class="scroll-indicator"><span></span></div>
</header>

' . $storyHTML . '
' . $specHTML . '
' . $menuHTML . '
' . $reviewsHTML . '

<!-- Reservation -->
<section class="section reservation" id="reservation">
<div class="resa-grid">
  <div class="resa-visual"></div>
  <div class="resa-form rv rv-r">
    <span class="tag" data-i18n="resaTag">Réservation</span>
    <h2 class="h2" data-i18n="resaTitle">Réserver votre table</h2>
    <div class="widget">
      <div class="widget-dates" id="widgetDates"></div>
      ' . (!empty($servicesHTML) ? '<div class="widget-services">' . $servicesHTML . '</div>' : '') . '
      <div class="widget-guests">
        <button onclick="changeGuests(-1)">−</button>
        <span id="guestCount">2</span>
        <span data-i18n="guests">personnes</span>
        <button onclick="changeGuests(1)">+</button>
      </div>
      <div class="widget-slots" id="widgetSlots"></div>
      <button class="btn-accent widget-book" onclick="bookTable()" data-i18n="bookTable">Réserver</button>
    </div>
  </div>
</div>
</section>

' . $contactHTML . '

<!-- Footer -->
<footer class="footer">
<div class="footer-grid">
  <div class="footer-brand">
    ' . ($logo ? '<img src="' . $logo . '" alt="' . $name . '" height="40">' : '<h3>' . $name . '</h3>') . '
    ' . ($description ? '<p>' . $description . '</p>' : '') . '
    ' . (!empty($socialHTML) ? '<div class="footer-social">' . $socialHTML . '</div>' : '') . '
  </div>
  <div class="footer-nav">
    <h4 data-i18n="navTitle">Navigation</h4>
    ' . ($hasStory ? '<a href="#story" data-i18n="navStory">Histoire</a>' : '') . '
    ' . ($hasMenu ? '<a href="#menu" data-i18n="navMenu">Carte</a>' : '') . '
    <a href="#reservation" data-i18n="bookTable">Réserver</a>
    ' . ($hasContact ? '<a href="#contact" data-i18n="navContact">Contact</a>' : '') . '
  </div>
  <div class="footer-hours">
    <h4 data-i18n="hoursTitle">Horaires</h4>
    ' . $footerHoursHTML . '
  </div>
  <div class="footer-contact">
    <h4>Contact</h4>
    ' . (!empty($address) ? '<p>📍 ' . $address . '</p>' : '') . '
    ' . (!empty($phone) ? '<p>📞 ' . $phone . '</p>' : '') . '
    ' . (!empty($email) ? '<p>✉️ ' . $email . '</p>' : '') . '
  </div>
</div>
<div class="footer-bottom">
  <p>© ' . date('Y') . ' ' . $name . ' — Propulsé par <a href="https://r3sto.ch" target="_blank">R3STO</a></p>
</div>
</footer>

<script>
' . self::getSiteJS($jsConfig, $hasMenu) . '
</script>
</body>
</html>';

        return $html;
    }

    /**
     * Get theme CSS (all 5 themes via CSS custom properties)
     */
    private static function getThemeCSS() {
        return '<style>
:root{--ff-display:"Cormorant Garamond",serif;--ff-body:"Jost",sans-serif;--ff-ui:"DM Sans",sans-serif;--nav-h:64px}
[data-theme="dark-elegant"]{--bg:#0f0f0f;--bg2:#1a1a1a;--bg-deep:#050505;--bg-card:#1e1e1e;--accent:#c41e3a;--accent-dk:#9a1830;--accent-glow:rgba(196,30,58,.25);--text-primary:#f5f0eb;--text-body:#d4cfc8;--text-muted:#8a857e;--gold:#c9a84c;--gold-light:rgba(201,168,76,.15);--nav-bg:rgba(15,15,15,.92);--overlay-start:rgba(5,5,5,.55);--overlay-end:rgba(5,5,5,.85);--border:rgba(255,255,255,.08)}
[data-theme="light-fresh"]{--bg:#f7faf5;--bg2:#eef3ea;--bg-deep:#dfe8d8;--bg-card:#ffffff;--accent:#4a8c3f;--accent-dk:#367030;--accent-glow:rgba(74,140,63,.2);--text-primary:#1a2e15;--text-body:#3d4f38;--text-muted:#7a8a74;--gold:#b8963e;--gold-light:rgba(184,150,62,.12);--nav-bg:rgba(247,250,245,.95);--overlay-start:rgba(26,46,21,.3);--overlay-end:rgba(26,46,21,.7);--border:rgba(30,50,25,.1)}
[data-theme="warm-bistro"]{--bg:#faf6f1;--bg2:#f0e8dd;--bg-deep:#e5d9ca;--bg-card:#ffffff;--accent:#c4652a;--accent-dk:#a3511f;--accent-glow:rgba(196,101,42,.2);--text-primary:#2c1d10;--text-body:#5a4633;--text-muted:#8a7a6a;--gold:#c49a2a;--gold-light:rgba(196,154,42,.12);--nav-bg:rgba(250,246,241,.95);--overlay-start:rgba(44,29,16,.35);--overlay-end:rgba(44,29,16,.75);--border:rgba(60,40,20,.1)}
[data-theme="modern-minimal"]{--bg:#fafbfd;--bg2:#f0f2f5;--bg-deep:#e4e7ec;--bg-card:#ffffff;--accent:#2d6cb8;--accent-dk:#1f4f8a;--accent-glow:rgba(45,108,184,.18);--text-primary:#1a2332;--text-body:#3d4f66;--text-muted:#6b7d94;--gold:#b8963e;--gold-light:rgba(184,150,62,.1);--nav-bg:rgba(250,251,253,.96);--overlay-start:rgba(26,35,50,.3);--overlay-end:rgba(26,35,50,.7);--border:rgba(30,50,80,.1)}
[data-theme="zen-japanese"]{--bg:#f4f1ec;--bg2:#e8e3db;--bg-deep:#d8d0c4;--bg-card:#faf8f5;--accent:#6b8f71;--accent-dk:#4a6e50;--accent-glow:rgba(107,143,113,.2);--text-primary:#2a2520;--text-body:#4a443d;--text-muted:#7a746d;--gold:#c4a35a;--gold-light:rgba(196,163,90,.12);--nav-bg:rgba(244,241,236,.95);--overlay-start:rgba(42,37,32,.35);--overlay-end:rgba(42,37,32,.75);--border:rgba(50,40,30,.1)}
';
    }

    /**
     * Get component CSS
     */
    private static function getComponentCSS() {
        return '
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--ff-body);background:var(--bg);color:var(--text-body);line-height:1.6;overflow-x:hidden}
a{color:inherit;text-decoration:none}
.section{max-width:1100px;margin:0 auto;padding:80px 24px;text-align:center}
.tag{display:inline-block;font-family:var(--ff-ui);font-size:.7rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.h2{font-family:var(--ff-display);font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:var(--text-primary);line-height:1.2;margin-bottom:20px}
.h2 em{font-style:italic;color:var(--accent)}
.corpo{font-size:1.05rem;color:var(--text-body);max-width:600px;margin:0 auto 24px;line-height:1.7}
.btn-accent{display:inline-block;padding:12px 28px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:var(--ff-ui);font-size:.9rem;font-weight:600;cursor:pointer;transition:all .25s}
.btn-accent:hover{background:var(--accent-dk);transform:translateY(-1px)}
.btn-outline{display:inline-block;padding:12px 28px;background:transparent;color:var(--text-primary);border:1.5px solid var(--border);border-radius:8px;font-family:var(--ff-ui);font-size:.9rem;font-weight:500;cursor:pointer;transition:all .25s}
.btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.hidden{display:none!important}

/* Nav */
.nav{position:fixed;top:0;left:0;right:0;height:var(--nav-h);background:var(--nav-bg);backdrop-filter:blur(12px);z-index:100;transition:all .3s}
.nav.scrolled{box-shadow:0 1px 12px rgba(0,0,0,.08)}
.nav-inner{max-width:1200px;margin:0 auto;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.nav-logo img{height:36px}
.nav-name{font-family:var(--ff-display);font-size:1.3rem;font-weight:700;color:var(--text-primary)}
.nav-links{display:flex;align-items:center;gap:24px}
.nav-links a{font-family:var(--ff-ui);font-size:.85rem;font-weight:500;color:var(--text-muted);transition:color .2s}
.nav-links a:hover{color:var(--accent)}
.nav-cta{padding:8px 20px!important;font-size:.8rem!important;color:#fff!important}
.nav-right{display:flex;align-items:center;gap:12px}
.lang-selector{display:flex;gap:6px;align-items:center}
.lang-pill{padding:4px 10px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text-muted);border-radius:6px;font-family:var(--ff-ui);font-size:.7rem;font-weight:600;cursor:pointer;transition:all .2s}
.lang-pill.active{border-color:var(--accent);background:var(--accent-glow);color:var(--accent)}
.burger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
.burger span{display:block;width:22px;height:2px;background:var(--text-primary);border-radius:2px;transition:all .3s}

/* Hero */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center;background-color:var(--bg-deep)}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,var(--overlay-start),var(--overlay-end))}
.hero-content{position:relative;z-index:1;text-align:center;padding:24px;max-width:700px}
.hero-logo{height:60px;margin-bottom:20px}
.hero-title{font-family:var(--ff-display);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:12px}
.hero-tagline{font-size:1.1rem;color:rgba(255,255,255,.8);margin-bottom:8px}
.hero-location{font-size:.9rem;color:rgba(255,255,255,.6);margin-bottom:28px}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.scroll-indicator{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);opacity:.5}
.scroll-indicator span{display:block;width:24px;height:40px;border:2px solid rgba(255,255,255,.4);border-radius:12px;position:relative}
.scroll-indicator span::after{content:"";position:absolute;top:6px;left:50%;width:4px;height:8px;margin-left:-2px;background:rgba(255,255,255,.6);border-radius:2px;animation:scrollDown 1.5s infinite}
@keyframes scrollDown{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(14px)}}

/* Story */
.story-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;text-align:left;align-items:center}
.story-img img{width:100%;border-radius:12px;object-fit:cover;max-height:500px}
.badge{display:inline-block;padding:6px 14px;background:var(--gold-light);color:var(--gold);border-radius:6px;font-family:var(--ff-ui);font-size:.75rem;font-weight:600;margin-bottom:16px}

/* Specialties */
.spec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:32px}
.spec-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:32px 24px;transition:all .3s}
.spec-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
.spec-icon{font-size:2rem;margin-bottom:12px}
.spec-card h3{font-family:var(--ff-display);font-size:1.2rem;font-weight:600;color:var(--text-primary);margin-bottom:8px}
.spec-card p{font-size:.9rem;color:var(--text-muted);line-height:1.5}
.spec-price{display:inline-block;margin-top:12px;font-family:var(--ff-ui);font-weight:600;color:var(--accent)}

/* Menu */
.menu-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.menu-tab{padding:8px 18px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);border-radius:8px;font-family:var(--ff-ui);font-size:.8rem;font-weight:500;cursor:pointer;transition:all .2s}
.menu-tab.active{border-color:var(--accent);background:var(--accent-glow);color:var(--accent)}
.menu-items{max-width:700px;margin:0 auto;text-align:left}
.menu-item{display:flex;justify-content:space-between;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--border)}
.menu-item-name{font-family:var(--ff-display);font-size:1.05rem;font-weight:600;color:var(--text-primary)}
.menu-item-desc{font-size:.85rem;color:var(--text-muted);margin-top:2px}
.menu-item-price{font-family:var(--ff-ui);font-weight:600;color:var(--accent);white-space:nowrap;margin-left:16px}

/* Reviews */
.rev-score{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:28px}
.rev-big{font-family:var(--ff-display);font-size:3rem;font-weight:700;color:var(--gold)}
.rev-count{font-size:.9rem;color:var(--text-muted);text-align:left}
.rev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.rev-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:28px;text-align:left}
.rev-q{font-family:var(--ff-display);font-size:3rem;line-height:1;color:var(--accent);opacity:.3}
.rev-card p{font-size:.95rem;line-height:1.6;margin-bottom:16px}
.rev-author{display:flex;align-items:center;gap:8px;font-size:.85rem}
.rev-stars{color:var(--gold)}
.rev-src{color:var(--text-muted);font-size:.8rem}

/* Reservation */
.resa-grid{display:grid;grid-template-columns:1fr 1fr;min-height:500px}
.resa-visual{background:var(--bg-deep);background-size:cover;background-position:center;border-radius:12px 0 0 12px}
.resa-form{padding:48px 36px;text-align:left}
.widget{margin-top:24px}
.widget-dates{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px}
.widget-date{min-width:64px;padding:10px 8px;text-align:center;border:1.5px solid var(--border);border-radius:8px;background:transparent;cursor:pointer;transition:all .2s;font-family:var(--ff-ui);font-size:.75rem}
.widget-date.active{border-color:var(--accent);background:var(--accent-glow);color:var(--accent)}
.widget-date .wd-day{display:block;font-weight:600;font-size:.8rem;color:var(--text-primary)}
.widget-date .wd-num{display:block;font-size:1.1rem;font-weight:700;color:var(--text-primary);margin:2px 0}
.widget-services{display:flex;gap:8px;margin-bottom:16px}
.svc-tab{padding:8px 16px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);border-radius:8px;font-family:var(--ff-ui);font-size:.8rem;font-weight:500;cursor:pointer;transition:all .2s}
.svc-tab.active{border-color:var(--accent);background:var(--accent-glow);color:var(--accent)}
.widget-guests{display:flex;align-items:center;gap:12px;margin-bottom:16px;font-family:var(--ff-ui)}
.widget-guests button{width:36px;height:36px;border:1.5px solid var(--border);background:transparent;border-radius:8px;font-size:1.1rem;cursor:pointer;color:var(--text-primary)}
.widget-guests span{font-size:1rem;font-weight:600}
.widget-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
.widget-slot{padding:10px;text-align:center;border:1.5px solid var(--border);border-radius:8px;background:transparent;font-family:var(--ff-ui);font-size:.8rem;cursor:pointer;transition:all .2s}
.widget-slot.active{border-color:var(--accent);background:var(--accent-glow);color:var(--accent)}
.widget-slot.closed{opacity:.35;cursor:not-allowed}
.widget-book{width:100%;padding:14px;font-size:1rem}

/* Contact */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;text-align:left}
.contact-info .contact-line{margin-bottom:12px;font-size:.95rem}
.contact-info a{color:var(--accent)}

/* Footer */
.footer{background:var(--bg2);padding:60px 24px 24px}
.footer-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:36px}
.footer-brand img{height:40px;margin-bottom:12px}
.footer-brand h3{font-family:var(--ff-display);font-size:1.3rem;margin-bottom:12px;color:var(--text-primary)}
.footer-brand p{font-size:.85rem;color:var(--text-muted);line-height:1.6;margin-bottom:16px}
.footer-social{display:flex;gap:12px}
.footer-social a{width:36px;height:36px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);transition:all .2s}
.footer-social a:hover{border-color:var(--accent);color:var(--accent)}
.footer-nav,.footer-hours,.footer-contact{font-size:.85rem}
.footer-nav h4,.footer-hours h4,.footer-contact h4{font-family:var(--ff-ui);font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--text-primary);margin-bottom:16px}
.footer-nav a{display:block;color:var(--text-muted);margin-bottom:10px;transition:color .2s}
.footer-nav a:hover{color:var(--accent)}
.footer-hours p,.footer-contact p{color:var(--text-muted);margin-bottom:8px;line-height:1.5}
.footer-bottom{max-width:1100px;margin:36px auto 0;padding-top:20px;border-top:1px solid var(--border);text-align:center;font-size:.8rem;color:var(--text-muted)}
.footer-bottom a{color:var(--accent)}

/* Reveal animations */
.rv{opacity:0;transform:translateY(24px);transition:opacity .6s,transform .6s}
.rv-r{transform:translateX(24px)}
.rv.visible{opacity:1;transform:none}
.d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}

/* Responsive */
@media(max-width:1080px){
.story-grid,.resa-grid,.contact-grid{grid-template-columns:1fr}
.resa-visual{min-height:200px;border-radius:12px 12px 0 0}
.footer-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:580px){
.nav-links{display:none;position:absolute;top:var(--nav-h);left:0;right:0;flex-direction:column;background:var(--nav-bg);padding:20px;gap:16px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
.nav-links.open{display:flex}
.burger{display:flex}
.widget-slots{grid-template-columns:repeat(3,1fr)}
.footer-grid{grid-template-columns:1fr}
.hero-btns{flex-direction:column;align-items:center}
}
</style>';
    }

    /**
     * Get site JavaScript
     */
    private static function getSiteJS($jsConfig, $hasMenu) {
        return '
(function(){
var C=' . $jsConfig . ';
var lang=C.defaultLang||"fr";
var guests=2;
var selectedDate=0,selectedSlot=null,selectedSvc=0;

/* I18N */
var I18N={
  fr:{bookTable:"Réserver une table",seeMenu:"Voir la carte",fullMenu:"Carte complète",storyTag:"Notre histoire",specTag:"Spécialités",menuTag:"La carte",resaTag:"Réservation",resaTitle:"Réserver votre table",guests:"personnes",navStory:"Histoire",navSpec:"Spécialités",navMenu:"Carte",navReviews:"Avis",navContact:"Contact",navTitle:"Navigation",hoursTitle:"Horaires",openMaps:"Ouvrir dans Maps",openNow:"Ouvert",closedToday:"Fermé aujourd\'hui"},
  en:{bookTable:"Book a table",seeMenu:"See the menu",fullMenu:"Full menu",storyTag:"Our story",specTag:"Specialties",menuTag:"The menu",resaTag:"Reservation",resaTitle:"Reserve your table",guests:"guests",navStory:"Story",navSpec:"Specialties",navMenu:"Menu",navReviews:"Reviews",navContact:"Contact",navTitle:"Navigation",hoursTitle:"Hours",openMaps:"Open in Maps",openNow:"Open",closedToday:"Closed today"},
  de:{bookTable:"Tisch reservieren",seeMenu:"Speisekarte",fullMenu:"Vollständige Karte",storyTag:"Unsere Geschichte",specTag:"Spezialitäten",menuTag:"Die Karte",resaTag:"Reservierung",resaTitle:"Reservieren Sie Ihren Tisch",guests:"Gäste",navStory:"Geschichte",navSpec:"Spezialitäten",navMenu:"Karte",navReviews:"Bewertungen",navContact:"Kontakt",navTitle:"Navigation",hoursTitle:"Öffnungszeiten",openMaps:"In Maps öffnen",openNow:"Geöffnet",closedToday:"Heute geschlossen"},
  it:{bookTable:"Prenota un tavolo",seeMenu:"Vedi il menu",fullMenu:"Menu completo",storyTag:"La nostra storia",specTag:"Specialità",menuTag:"Il menu",resaTag:"Prenotazione",resaTitle:"Prenota il tuo tavolo",guests:"ospiti",navStory:"Storia",navSpec:"Specialità",navMenu:"Menu",navReviews:"Recensioni",navContact:"Contatto",navTitle:"Navigazione",hoursTitle:"Orari",openMaps:"Apri in Maps",openNow:"Aperto",closedToday:"Chiuso oggi"}
};

function setLang(l){
  lang=l;
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    var k=el.getAttribute("data-i18n");
    if(I18N[l]&&I18N[l][k])el.textContent=I18N[l][k];
  });
  document.querySelectorAll(".lang-pill").forEach(function(p){
    p.classList.toggle("active",p.textContent.trim().toLowerCase()===l);
  });
  document.documentElement.lang=l;
}
window.setLang=setLang;

/* Mobile menu */
function toggleMobileMenu(){
  document.getElementById("navLinks").classList.toggle("open");
  document.getElementById("burger").classList.toggle("open");
}
window.toggleMobileMenu=toggleMobileMenu;

/* Nav scroll */
window.addEventListener("scroll",function(){
  document.getElementById("nav").classList.toggle("scrolled",window.scrollY>50);
});

/* Reveal animation */
function initReveal(){
  var els=document.querySelectorAll(".rv");
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target);}});
  },{threshold:0.15});
  els.forEach(function(el){obs.observe(el);});
}

/* Booking widget */
function initWidget(){
  var dc=document.getElementById("widgetDates");
  if(!dc)return;
  var now=new Date();
  var days=' . ('"dim,lun,mar,mer,jeu,ven,sam"' ) . '.split(",");
  for(var i=0;i<7;i++){
    var d=new Date(now);d.setDate(d.getDate()+i);
    var btn=document.createElement("button");
    btn.className="widget-date"+(i===0?" active":"");
    btn.setAttribute("data-idx",i);
    btn.innerHTML=\'<span class="wd-day">\'+days[d.getDay()]+\'</span><span class="wd-num">\'+d.getDate()+\'</span>\';
    btn.onclick=function(){
      selectedDate=parseInt(this.getAttribute("data-idx"));
      dc.querySelectorAll(".widget-date").forEach(function(b){b.classList.remove("active")});
      this.classList.add("active");
      renderSlots();
    };
    dc.appendChild(btn);
  }
  renderSlots();
}

function renderSlots(){
  var sc=document.getElementById("widgetSlots");
  if(!sc)return;
  sc.innerHTML="";
  var svc=C.services&&C.services[selectedSvc];
  var startH=svc?parseInt(svc.hours||"12"):12;
  for(var i=0;i<12;i++){
    var h=startH+Math.floor(i/4);
    var m=(i%4)*15;
    var t=(h<10?"0":"")+h+":"+(m<10?"0":"")+m;
    var btn=document.createElement("button");
    btn.className="widget-slot";
    btn.textContent=t;
    btn.setAttribute("data-t",t);
    btn.onclick=function(){
      selectedSlot=this.getAttribute("data-t");
      sc.querySelectorAll(".widget-slot").forEach(function(b){b.classList.remove("active")});
      this.classList.add("active");
    };
    sc.appendChild(btn);
  }
}

/* Service tabs */
document.querySelectorAll(".svc-tab").forEach(function(tab){
  tab.addEventListener("click",function(){
    selectedSvc=parseInt(this.getAttribute("data-svc"));
    document.querySelectorAll(".svc-tab").forEach(function(t){t.classList.remove("active")});
    this.classList.add("active");
    renderSlots();
  });
});

/* Guests */
function changeGuests(d){
  guests=Math.max(1,Math.min(20,guests+d));
  document.getElementById("guestCount").textContent=guests;
}
window.changeGuests=changeGuests;

/* Book */
function bookTable(){
  if(C.bookingUrl){
    var url=C.bookingUrl;
    if(selectedSlot)url+=(url.indexOf("?")>-1?"&":"?")+"time="+selectedSlot+"&guests="+guests;
    window.open(url,"_blank");
  }else{
    alert("Réservation bientôt disponible");
  }
}
window.bookTable=bookTable;

' . ($hasMenu ? '
/* Menu rendering */
function renderMenu(){
  var sec=C.sections&&C.sections.menu;
  if(!sec||!sec.categories)return;
  var tabs=document.getElementById("menuTabs");
  var items=document.getElementById("menuItems");
  if(!tabs||!items)return;
  tabs.innerHTML="";items.innerHTML="";
  sec.categories.forEach(function(cat,i){
    var btn=document.createElement("button");
    btn.className="menu-tab"+(i===0?" active":"");
    btn.textContent=cat.name;
    btn.onclick=function(){
      tabs.querySelectorAll(".menu-tab").forEach(function(b){b.classList.remove("active")});
      btn.classList.add("active");
      showCat(i);
    };
    tabs.appendChild(btn);
  });
  function showCat(idx){
    items.innerHTML="";
    var cat=sec.categories[idx];
    if(!cat||!cat.items)return;
    cat.items.forEach(function(it){
      var d=document.createElement("div");
      d.className="menu-item";
      d.innerHTML=\'<div><div class="menu-item-name">\'+esc(it.name)+\'</div>\'+(it.desc?\'<div class="menu-item-desc">\'+esc(it.desc)+\'</div>\':"")+\'</div>\'+(it.price?\'<span class="menu-item-price">\'+esc(it.price)+\'</span>\':"\");
      items.appendChild(d);
    });
  }
  showCat(0);
}
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
' : '') . '

/* Smooth scroll for anchor links */
document.querySelectorAll(\'a[href^="#"]\').forEach(function(a){
  a.addEventListener("click",function(e){
    var t=document.querySelector(this.getAttribute("href"));
    if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth"});
    var nl=document.getElementById("navLinks");if(nl)nl.classList.remove("open");}
  });
});

/* Init */
document.addEventListener("DOMContentLoaded",function(){
  initReveal();
  initWidget();
  ' . ($hasMenu ? 'renderMenu();' : '') . '
  setLang(lang);
});
})();';
    }

    /**
     * Sanitize a string into a URL-safe slug
     */
    private static function sanitizeSlug($str) {
        // Transliterate accented chars
        $str = mb_strtolower(trim($str), 'UTF-8');
        $map = ['à'=>'a','â'=>'a','ä'=>'a','é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
                 'î'=>'i','ï'=>'i','ô'=>'o','ö'=>'o','ù'=>'u','û'=>'u','ü'=>'u',
                 'ç'=>'c','ñ'=>'n','ß'=>'ss','æ'=>'ae','œ'=>'oe'];
        $str = strtr($str, $map);
        // Replace non-alphanumeric with dash
        $str = preg_replace('/[^a-z0-9]+/', '-', $str);
        // Clean up dashes
        $str = trim(preg_replace('/-+/', '-', $str), '-');
        return $str;
    }

    /**
     * HTML-escape a string
     */
    private static function esc($str) {
        return htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
