<?php
/**
 * Frontend Widget Injection & Page Rules.
 *
 * @package BGOS_AI_Chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class BGOS_Frontend {

    public function __construct() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_widget' ) );
    }

    /**
     * Check whether the widget is allowed on the current page.
     *
     * @return bool True if widget should be shown, false otherwise.
     */
    private function should_display_widget() {
        $enable_widget = get_option( 'bgos_enable_widget', '1' );
        if ( '1' !== $enable_widget ) {
            return false;
        }

        $agent_id = get_option( 'bgos_agent_id', '' );
        if ( empty( $agent_id ) ) {
            return false;
        }

        // Check if hidden for administrators.
        $hide_for_admins = get_option( 'bgos_hide_for_admins', '0' );
        if ( '1' === $hide_for_admins && current_user_can( 'manage_options' ) ) {
            return false;
        }

        // Check excluded pages list.
        $excluded_pages_raw = get_option( 'bgos_excluded_pages', '' );
        if ( ! empty( $excluded_pages_raw ) ) {
            $excluded_items = array_filter( array_map( 'trim', explode( ',', $excluded_pages_raw ) ) );
            $current_page_id = (string) get_queried_object_id();
            $current_url     = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

            foreach ( $excluded_items as $item ) {
                if ( empty( $item ) ) {
                    continue;
                }
                // Check Post ID match.
                if ( is_numeric( $item ) && $item === $current_page_id ) {
                    return false;
                }
                // Check URL substring match.
                if ( false !== strpos( $current_url, $item ) ) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Enqueue the floating chat widget script using WordPress standard enqueue APIs.
     * 100% locally packaged launcher - zero remote script execution in WordPress DOM.
     */
    public function enqueue_frontend_widget() {
        if ( ! $this->should_display_widget() ) {
            return;
        }

        $agent_id         = get_option( 'bgos_agent_id', '' );
        $server_url       = get_option( 'bgos_server_url', 'https://fieseros.com' );
        $widget_position  = get_option( 'bgos_widget_position', 'bottom-right' );
        $brand_color      = get_option( 'bgos_brand_color', '#009F50' );
        $greeting_message = get_option( 'bgos_greeting_message', '👋 Have questions or want to book an appointment? Chat with us!' );

        wp_enqueue_style(
            'bgos-frontend-style',
            BGOS_CHATBOT_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            BGOS_CHATBOT_VERSION
        );

        wp_enqueue_script(
            'bgos-widget-launcher',
            BGOS_CHATBOT_PLUGIN_URL . 'assets/js/bgos-widget.js',
            array(),
            BGOS_CHATBOT_VERSION,
            true
        );

        wp_localize_script(
            'bgos-widget-launcher',
            'bgosWidgetData',
            array(
                'agentId'         => $agent_id,
                'serverUrl'       => $server_url,
                'position'        => $widget_position,
                'brandColor'      => $brand_color,
                'greetingMessage' => $greeting_message,
            )
        );
    }
}
