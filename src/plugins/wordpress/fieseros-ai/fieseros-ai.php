<?php
/**
 * Plugin Name: Fieseros AI — Chat, Smart Forms & Booking Assistant
 * Plugin URI: https://fieseros.com
 * Description: Connect your website with Fieseros AI Agent for 24/7 intelligent customer conversations, automated appointment booking, and smart lead forms.
 * Version: 1.0.0
 * Author: Fieseros
 * Author URI: https://fieseros.com
 * License: GPL-2.0+
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fieseros_AI_Plugin {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'inject_widget_script'));
        add_shortcode('fieseros_form', array($this, 'render_form_shortcode'));
    }

    public function add_admin_menu() {
        add_menu_page(
            'Fieseros AI',
            'Fieseros AI',
            'manage_options',
            'fieseros-ai',
            array($this, 'render_admin_page'),
            'dashicons-format-chat',
            65
        );
    }

    public function register_settings() {
        register_setting('fieseros_ai_options', 'fieseros_agent_id');
        register_setting('fieseros_ai_options', 'fieseros_api_key');
        register_setting('fieseros_ai_options', 'fieseros_enable_chat');
    }

    public function render_admin_page() {
        $agent_id = get_option('fieseros_agent_id', '');
        $enable_chat = get_option('fieseros_enable_chat', '1');
        ?>
        <div class="wrap" style="max-width: 800px;">
            <h1>Fieseros AI — Settings</h1>
            <p>Connect your WordPress site to your Fieseros AI Agent for 24/7 customer chat, automated booking, and smart forms.</p>

            <form method="post" action="options.php" style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ccd0d4; margin-top: 20px;">
                <?php settings_fields('fieseros_ai_options'); ?>
                <?php do_settings_sections('fieseros_ai_options'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="fieseros_agent_id">AI Agent ID / Form Slug</label></th>
                        <td>
                            <input name="fieseros_agent_id" type="text" id="fieseros_agent_id" value="<?php echo esc_attr($agent_id); ?>" class="regular-text" placeholder="e.g. agt_984120 or my-form-slug" />
                            <p class="description">Copy your Agent ID from your Fieseros Dashboard (under AI & Forms → Embed).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Floating Chat Widget</th>
                        <td>
                            <label>
                                <input name="fieseros_enable_chat" type="checkbox" value="1" <?php checked('1', $enable_chat); ?> />
                                Enable floating AI chat bubble on all website pages
                            </label>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save Fieseros Settings'); ?>
            </form>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-top: 24px;">
                <h3 style="margin-top: 0; color: #166534;">Embed Forms with Shortcodes</h3>
                <p style="font-size: 13px; color: #15803d;">You can embed any Fieseros Smart Form directly into any page or blog post using this shortcode:</p>
                <code style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #86efac; display: inline-block; font-size: 14px;">[fieseros_form id="YOUR_FORM_ID_OR_SLUG"]</code>
            </div>
        </div>
        <?php
    }

    public function inject_widget_script() {
        $agent_id = get_option('fieseros_agent_id', '');
        $enable_chat = get_option('fieseros_enable_chat', '1');

        if (empty($agent_id) || $enable_chat !== '1') {
            return;
        }

        echo '<script src="https://fieseros.com/embed/agent.js" data-agent="' . esc_attr($agent_id) . '" async></script>' . "\n";
    }

    public function render_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'height' => '580px',
        ), $atts, 'fieseros_form');

        if (empty($atts['id'])) {
            return '<p style="color:red;">[Fieseros Form: Missing ID]</p>';
        }

        $form_url = 'https://fieseros.com/form/' . urlencode($atts['id']);

        return sprintf(
            '<iframe src="%s" style="width:100%%; min-height:%s; border:none; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);"></iframe>',
            esc_url($form_url),
            esc_attr($atts['height'])
        );
    }
}

new Fieseros_AI_Plugin();
