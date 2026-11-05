<?php
/**
 * Shortcode [bgos_chat] implementation.
 *
 * @package BGOS_AI_Chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class BGOS_Shortcode {

    public function __construct() {
        add_shortcode( 'bgos_chat', array( $this, 'render_shortcode' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'register_frontend_styles' ) );
    }

    /**
     * Register frontend styles for shortcode containers.
     */
    public function register_frontend_styles() {
        wp_register_style(
            'bgos-frontend-style',
            BGOS_CHATBOT_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            BGOS_CHATBOT_VERSION
        );
    }

    /**
     * Render the shortcode.
     *
     * @param array $atts Shortcode attributes.
     * @return string HTML output.
     */
    public function render_shortcode( $atts ) {
        $default_agent = get_option( 'bgos_agent_id', '' );
        $server_url    = get_option( 'bgos_server_url', 'https://fieseros.com' );

        $atts = shortcode_atts(
            array(
                'agent'  => $default_agent,
                'height' => '620px',
                'width'  => '100%',
            ),
            $atts,
            'bgos_chat'
        );

        $agent_id = sanitize_text_field( $atts['agent'] );
        $height   = sanitize_text_field( $atts['height'] );
        $width    = sanitize_text_field( $atts['width'] );

        if ( empty( $agent_id ) ) {
            if ( current_user_can( 'manage_options' ) ) {
                return '<div class="bgos-shortcode-notice">' .
                    sprintf(
                        /* translators: %s: settings URL */
                        esc_html__( '[BGOS AI Chatbot] Please configure your Agent ID in the %s to display the chatbot.', 'bgos-ai-chatbot' ),
                        '<a href="' . esc_url( admin_url( 'admin.php?page=bgos-ai-chatbot' ) ) . '">' . esc_html__( 'settings page', 'bgos-ai-chatbot' ) . '</a>'
                    ) .
                '</div>';
            }
            return '';
        }

        wp_enqueue_style( 'bgos-frontend-style' );

        $iframe_url = rtrim( $server_url, '/' ) . '/intake/' . rawurlencode( $agent_id ) . '?embed=1';

        $output  = '<div class="bgos-inline-chat-wrapper" style="width: ' . esc_attr( $width ) . '; height: ' . esc_attr( $height ) . ';">';
        $output .= '<iframe src="' . esc_url( $iframe_url ) . '" ';
        $output .= 'title="' . esc_attr__( 'BGOS AI Chatbot & Booking Assistant', 'bgos-ai-chatbot' ) . '" ';
        $output .= 'class="bgos-inline-chat-iframe" ';
        $output .= 'allow="clipboard-write; microphone" ';
        $output .= 'style="width: 100%; height: 100%; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">';
        $output .= '</iframe>';
        $output .= '</div>';

        return $output;
    }
}
