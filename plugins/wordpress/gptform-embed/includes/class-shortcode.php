<?php
/**
 * GPTForm Embed — Shortcode handler.
 *
 * Usage:
 *   [gptform id="abc123"]
 *   [gptform slug="my-booking-form" theme="dark"]
 *   [gptform id="abc123" mode="iframe" height="600px"]
 *   [gptform id="abc123" primary_color="#ff0000" branding="false"]
 */
class GPTForm_Shortcode {

    public static function init() {
        add_shortcode('gptform', array(__CLASS__, 'render'));
    }

    public static function render($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'slug' => '',
            'mode' => get_option('gptform_embed_mode', 'js'),
            'theme' => '',
            'primary_color' => '',
            'border_radius' => '',
            'background_color' => '',
            'height' => '500px',
            'branding' => get_option('gptform_embed_branding', '1') === '1' ? 'true' : 'false',
            'redirect_url' => '',
            'success_title' => '',
            'success_message' => '',
        ), $atts, 'gptform');

        // Determine form ID (either 'id' or 'slug' attribute)
        $form_id = !empty($atts['id']) ? $atts['id'] : $atts['slug'];
        if (empty($form_id)) {
            return '<!-- GPTForm: No form ID or slug specified -->';
        }

        $core = GPTForm_Embed::instance();

        // Build embed options
        $options = array(
            'mode' => $atts['mode'],
            'theme' => $atts['theme'],
            'primary_color' => $atts['primary_color'],
            'border_radius' => $atts['border_radius'],
            'background_color' => $atts['background_color'],
            'height' => $atts['height'],
            'branding' => $atts['branding'] === 'true',
            'redirect_url' => $atts['redirect_url'],
            'success_title' => $atts['success_title'],
            'success_message' => $atts['success_message'],
        );

        return $core->render_embed($form_id, $options);
    }
}
