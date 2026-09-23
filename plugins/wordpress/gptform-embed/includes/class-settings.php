<?php
/**
 * GPTForm Embed — Admin settings page.
 *
 * Settings page for configuring the API domain, default embed mode,
 * and branding preference.
 */
class GPTForm_Settings {

    public static function init() {
        add_action('admin_menu', array(__CLASS__, 'add_menu'));
        add_action('admin_init', array(__CLASS__, 'register_settings'));
    }

    public static function add_menu() {
        add_options_page(
            __('GPTForm Settings', 'gptform-embed'),
            __('GPTForm', 'gptform-embed'),
            'manage_options',
            'gptform-settings',
            array(__CLASS__, 'render_page')
        );
    }

    public static function register_settings() {
        register_setting('gptform_embed_settings', 'gptform_embed_domain', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => GPTFORM_DEFAULT_DOMAIN,
        ));
        register_setting('gptform_embed_settings', 'gptform_embed_mode', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'js',
        ));
        register_setting('gptform_embed_settings', 'gptform_embed_branding', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '1',
        ));
    }

    public static function render_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php settings_fields('gptform_embed_settings'); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="gptform_embed_domain"><?php _e('GPTForm Domain', 'gptform-embed'); ?></label>
                        </th>
                        <td>
                            <input type="url" id="gptform_embed_domain" name="gptform_embed_domain"
                                value="<?php echo esc_attr(get_option('gptform_embed_domain', GPTFORM_DEFAULT_DOMAIN)); ?>"
                                class="regular-text" placeholder="https://fieseros.com" />
                            <p class="description"><?php _e('The base URL of your GPTForm installation. Default: https://fieseros.com', 'gptform-embed'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="gptform_embed_mode"><?php _e('Default Embed Mode', 'gptform-embed'); ?></label>
                        </th>
                        <td>
                            <select id="gptform_embed_mode" name="gptform_embed_mode">
                                <option value="js" <?php selected(get_option('gptform_embed_mode', 'js'), 'js'); ?>><?php _e('JavaScript (Recommended)', 'gptform-embed'); ?></option>
                                <option value="iframe" <?php selected(get_option('gptform_embed_mode', 'js'), 'iframe'); ?>><?php _e('Iframe (Fallback)', 'gptform-embed'); ?></option>
                            </select>
                            <p class="description"><?php _e('JavaScript mode renders forms natively (better UX). Iframe is simpler but less flexible.', 'gptform-embed'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Branding', 'gptform-embed'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="gptform_embed_branding" value="1"
                                    <?php checked(get_option('gptform_embed_branding', '1'), '1'); ?> />
                                <?php _e('Show "Powered by GPTForm" on all embedded forms', 'gptform-embed'); ?>
                            </label>
                            <p class="description"><?php _e('Uncheck to hide the branding. Available on all plans.', 'gptform-embed'); ?></p>
                        </td>
                    </tr>
                </table>

                <h2><?php _e('Usage', 'gptform-embed'); ?></h2>
                <p><?php _e('Use the shortcode in any post or page:', 'gptform-embed'); ?></p>
                <pre style="background:#f0f0f1;padding:12px;border-radius:4px;overflow-x:auto;">[gptform id="YOUR_FORM_ID"]</pre>
                <p><?php _e('Or use a form slug:', 'gptform-embed'); ?></p>
                <pre style="background:#f0f0f1;padding:12px;border-radius:4px;overflow-x:auto;">[gptform slug="my-booking-form" theme="dark"]</pre>
                <p><?php _e('Advanced options:', 'gptform-embed'); ?></p>
                <pre style="background:#f0f0f1;padding:12px;border-radius:4px;overflow-x:auto;">[gptform id="abc123" mode="iframe" height="600px" primary_color="#ff0000" branding="false"]</pre>

                <p><?php _e('Or place a form in your sidebar via Appearance → Widgets → GPTForm Embed.', 'gptform-embed'); ?></p>

                <?php submit_button(__('Save Settings', 'gptform-embed')); ?>
            </form>
        </div>
        <?php
    }
}
