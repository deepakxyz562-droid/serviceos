<?php
/**
 * GPTForm Embed — Core class.
 * Handles API communication and schema caching.
 */
class GPTForm_Embed {

    private static $instance = null;
    private $domain;
    private $cache_group = 'gptform_embed';

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function init() {
        $this->domain = get_option('gptform_embed_domain', GPTFORM_DEFAULT_DOMAIN);
    }

    /**
     * Get the API domain.
     */
    public function get_domain() {
        return $this->domain ?: GPTFORM_DEFAULT_DOMAIN;
    }

    /**
     * Fetch form schema from the GPTForm API with caching.
     * Uses WordPress transients for 5-minute caching.
     *
     * @param string $form_id Form ID or slug
     * @return array|null Form data or null on failure
     */
    public function get_form($form_id) {
        $cache_key = $this->cache_group . '_form_' . $form_id;

        // Check cache first
        $cached = get_transient($cache_key);
        if (false !== $cached && is_array($cached)) {
            return $cached;
        }

        // Fetch from API
        $url = $this->get_domain() . '/api/public/forms/' . urlencode($form_id);
        $response = wp_remote_get($url, array(
            'timeout' => 10,
            'headers' => array('Accept' => 'application/json'),
        ));

        if (is_wp_error($response)) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE || !isset($data['schema'])) {
            return null;
        }

        // Cache for 5 minutes
        set_transient($cache_key, $data, 5 * MINUTE_IN_SECONDS);

        return $data;
    }

    /**
     * Render the embed HTML for a form.
     *
     * @param string $form_id Form ID or slug
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_embed($form_id, $atts = array()) {
        $atts = wp_parse_args($atts, array(
            'mode' => get_option('gptform_embed_mode', 'js'),
            'theme' => '',
            'primary_color' => '',
            'border_radius' => '',
            'background_color' => '',
            'height' => '500px',
            'branding' => get_option('gptform_embed_branding', '1') === '1',
            'redirect_url' => '',
            'success_title' => '',
            'success_message' => '',
        ));

        $container_id = 'gptform-' . sanitize_title($form_id) . '-' . wp_rand(1000, 9999);

        // Build data attributes
        $data_attrs = array();
        $data_attrs[] = 'data-form-id="' . esc_attr($form_id) . '"';
        if ($atts['mode']) $data_attrs[] = 'data-mode="' . esc_attr($atts['mode']) . '"';
        if ($atts['theme']) $data_attrs[] = 'data-theme="' . esc_attr($atts['theme']) . '"';
        if ($atts['primary_color']) $data_attrs[] = 'data-primary-color="' . esc_attr($atts['primary_color']) . '"';
        if ($atts['border_radius']) $data_attrs[] = 'data-border-radius="' . esc_attr($atts['border_radius']) . '"';
        if ($atts['background_color']) $data_attrs[] = 'data-background-color="' . esc_attr($atts['background_color']) . '"';
        if ($atts['height']) $data_attrs[] = 'data-height="' . esc_attr($atts['height']) . '"';
        if ($atts['redirect_url']) $data_attrs[] = 'data-redirect-url="' . esc_attr($atts['redirect_url']) . '"';
        if ($atts['success_title']) $data_attrs[] = 'data-success-title="' . esc_attr($atts['success_title']) . '"';
        if ($atts['success_message']) $data_attrs[] = 'data-success-message="' . esc_attr($atts['success_message']) . '"';
        if (!$atts['branding']) $data_attrs[] = 'data-branding="false"';

        // The embed.js SDK auto-initializes elements with class "gptform-embed"
        $html = '<div class="gptform-embed" id="' . esc_attr($container_id) . '" ' . implode(' ', $data_attrs) . '></div>';

        return $html;
    }

    /**
     * Generate iframe embed HTML (fallback mode).
     *
     * @param string $form_id Form ID or slug
     * @param array $atts Shortcode attributes
     * @return string HTML
     */
    public function render_iframe($form_id, $atts = array()) {
        $domain = $this->get_domain();
        $height = isset($atts['height']) ? $atts['height'] : '500px';
        $params = http_build_query(array_filter(array(
            'embed' => '1',
            'theme' => isset($atts['theme']) ? $atts['theme'] : null,
            'primaryColor' => isset($atts['primary_color']) ? $atts['primary_color'] : null,
        )));

        $url = $domain . '/form/' . urlencode($form_id) . ($params ? '?' . $params : '');

        $html = '<iframe src="' . esc_url($url) . '" ' .
            'frameborder="0" scrolling="no" loading="lazy" ' .
            'allow="camera; microphone" ' .
            'title="' . esc_attr__('GPTForm', 'gptform-embed') . '" ' .
            'style="width:100%;height:' . esc_attr($height) . ';border:none;display:block;">' .
            '</iframe>';

        if (get_option('gptform_embed_branding', '1') === '1') {
            $html .= '<div style="text-align:center;margin-top:8px;font-size:11px;">' .
                'Powered by <a href="' . esc_url($domain . '/gptform') . '" target="_blank" rel="noopener">GPTForm</a>' .
                '</div>';
        }

        return $html;
    }
}
