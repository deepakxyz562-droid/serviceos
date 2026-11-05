<?php
/**
 * Plugin Name:       BGOS AI Chatbot
 * Plugin URI:        https://fieseros.com/platform/wordpress
 * Description:       Intelligent AI Chatbot for 24/7 customer support, instant lead generation, automated appointment booking, and knowledge base sync for WordPress & WooCommerce.
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.4
 * Author:            Deepak Chandra
 * Author URI:        https://fieseros.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       bgos-ai-chatbot
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

define( 'BGOS_CHATBOT_VERSION', '1.0.0' );
define( 'BGOS_CHATBOT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BGOS_CHATBOT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'BGOS_CHATBOT_BASENAME', plugin_basename( __FILE__ ) );

// Load module classes.
require_once BGOS_CHATBOT_PLUGIN_DIR . 'includes/class-bgos-admin.php';
require_once BGOS_CHATBOT_PLUGIN_DIR . 'includes/class-bgos-frontend.php';
require_once BGOS_CHATBOT_PLUGIN_DIR . 'includes/class-bgos-shortcode.php';
require_once BGOS_CHATBOT_PLUGIN_DIR . 'includes/class-bgos-sync.php';

/**
 * Main BGOS AI Chatbot plugin bootstrap.
 */
class BGOS_AI_Chatbot_Plugin {

    /**
     * Singleton instance.
     *
     * @var BGOS_AI_Chatbot_Plugin|null
     */
    private static $instance = null;

    /**
     * Get singleton instance.
     *
     * @return BGOS_AI_Chatbot_Plugin
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor.
     */
    private function __construct() {
        $this->init_hooks();
    }

    /**
     * Initialize plugin hooks.
     */
    private function init_hooks() {
        // Initialize Admin & Settings.
        if ( is_admin() ) {
            new BGOS_Admin();
        }

        // Initialize Frontend Widget Injector.
        new BGOS_Frontend();

        // Initialize Shortcode [bgos_chat].
        new BGOS_Shortcode();

        // Initialize Knowledge Base Sync Handler.
        new BGOS_Sync();

        // Add action links on plugins.php list.
        add_filter( 'plugin_action_links_' . BGOS_CHATBOT_BASENAME, array( $this, 'add_plugin_action_links' ) );
    }

    /**
     * Add Settings and Documentation links to the Plugins page.
     *
     * @param array $links Existing links.
     * @return array Modified links.
     */
    public function add_plugin_action_links( $links ) {
        $custom_links = array(
            '<a href="' . esc_url( admin_url( 'admin.php?page=bgos-ai-chatbot' ) ) . '">' . esc_html__( 'Settings', 'bgos-ai-chatbot' ) . '</a>',
            '<a href="https://fieseros.com" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Dashboard', 'bgos-ai-chatbot' ) . '</a>',
        );
        return array_merge( $custom_links, $links );
    }
}

// Bootstrap plugin.
add_action( 'plugins_loaded', array( 'BGOS_AI_Chatbot_Plugin', 'get_instance' ) );
