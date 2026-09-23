<?php
/**
 * Plugin Name: GPTForm Embed
 * Plugin URI: https://fieseros.com/gptform
 * Description: Embed GPTForm AI-powered forms on your WordPress site using a simple shortcode. Requires a free GPTForm account.
 * Version: 1.0.0
 * Author: Fieseros
 * Author URI: https://fieseros.com
 * License: GPL-2.0+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: gptform-embed
 * Domain Path: /languages
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

define('GPTFORM_EMBED_VERSION', '1.0.0');
define('GPTFORM_EMBED_PATH', plugin_dir_path(__FILE__));
define('GPTFORM_EMBED_URL', plugin_dir_url(__FILE__));

// Default API domain — users can override in settings
if (!defined('GPTFORM_DEFAULT_DOMAIN')) {
    define('GPTFORM_DEFAULT_DOMAIN', 'https://fieseros.com');
}

// Include required files
require_once GPTFORM_EMBED_PATH . 'includes/class-gptform.php';
require_once GPTFORM_EMBED_PATH . 'includes/class-shortcode.php';
require_once GPTFORM_EMBED_PATH . 'includes/class-widget.php';
require_once GPTFORM_EMBED_PATH . 'includes/class-settings.php';

/**
 * Main plugin initialization.
 */
function gptform_embed_init() {
    // Load text domain for translations
    load_plugin_textdomain('gptform-embed', false, dirname(plugin_basename(__FILE__)) . '/languages');

    // Initialize core classes
    $core = GPTForm_Embed::instance();
    $core->init();

    // Initialize shortcode
    GPTForm_Shortcode::init();

    // Initialize widget
    GPTForm_Widget::init();

    // Initialize settings
    GPTForm_Settings::init();
}
add_action('plugins_loaded', 'gptform_embed_init');

/**
 * Activation hook — set default options.
 */
function gptform_embed_activate() {
    if (!get_option('gptform_embed_domain')) {
        add_option('gptform_embed_domain', GPTFORM_DEFAULT_DOMAIN);
    }
    if (!get_option('gptform_embed_mode')) {
        add_option('gptform_embed_mode', 'js');
    }
    if (!get_option('gptform_embed_branding')) {
        add_option('gptform_embed_branding', '1');
    }
}
register_activation_hook(__FILE__, 'gptform_embed_activate');

/**
 * Enqueue embed script on pages that contain the shortcode.
 * Uses a flag to only load the script when needed.
 */
function gptform_embed_enqueue_script() {
    $domain = get_option('gptform_embed_domain', GPTFORM_DEFAULT_DOMAIN);
    wp_enqueue_script('gptform-embed-sdk', $domain . '/embed.js', array(), GPTFORM_EMBED_VERSION, true);
}
add_action('wp_enqueue_scripts', 'gptform_embed_enqueue_script');
