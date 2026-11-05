<?php
/**
 * Knowledge Base Synchronizer.
 * Syncs published WordPress content & WooCommerce products to the BGOS AI agent.
 *
 * @package BGOS_AI_Chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class BGOS_Sync {

    public function __construct() {
        add_action( 'wp_ajax_bgos_sync_knowledge_base', array( $this, 'ajax_sync_knowledge_base' ) );
    }

    /**
     * AJAX handler to sync website content into BGOS AI Knowledge Base.
     */
    public function ajax_sync_knowledge_base() {
        check_ajax_referer( 'bgos_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'Permission denied.', 'bgos-ai-chatbot' ) ) );
        }

        $agent_id   = get_option( 'bgos_agent_id', '' );
        $server_url = get_option( 'bgos_server_url', 'https://fieseros.com' );
        $api_key    = get_option( 'bgos_api_key', '' );

        if ( empty( $agent_id ) ) {
            wp_send_json_error( array( 'message' => __( 'Agent ID is missing. Please save your settings first.', 'bgos-ai-chatbot' ) ) );
        }

        // Collect published pages and posts.
        $post_types = array( 'page', 'post' );
        if ( post_type_exists( 'product' ) ) {
            $post_types[] = 'product';
        }

        $query_args = array(
            'post_type'      => $post_types,
            'post_status'    => 'publish',
            'posts_per_page' => 50, // Batch limit
            'orderby'        => 'modified',
            'order'          => 'DESC',
        );

        $posts = get_posts( $query_args );

        if ( empty( $posts ) ) {
            wp_send_json_error( array( 'message' => __( 'No published content found to sync.', 'bgos-ai-chatbot' ) ) );
        }

        $sync_items = array();
        $site_name  = get_bloginfo( 'name' );

        foreach ( $posts as $p ) {
            $content = wp_strip_all_tags( strip_shortcodes( $p->post_content ) );
            $content = preg_replace( '/\s+/', ' ', $content );
            $content = trim( substr( $content, 0, 3000 ) );

            $item_text = sprintf(
                "Document: %s\nType: %s\nURL: %s\nSite: %s\nContent: %s",
                esc_html( $p->post_title ),
                esc_html( $p->post_type ),
                esc_url( get_permalink( $p->ID ) ),
                esc_html( $site_name ),
                $content
            );

            $sync_items[] = array(
                'title'   => $p->post_title,
                'url'     => get_permalink( $p->ID ),
                'type'    => $p->post_type,
                'content' => $item_text,
            );
        }

        // Aggregate content into a structured markdown training document.
        $document_text = "# Website Knowledge Base: " . esc_html( $site_name ) . "\n\n";
        foreach ( $sync_items as $item ) {
            $document_text .= "## " . esc_html( $item['title'] ) . " (" . esc_html( $item['type'] ) . ")\n";
            $document_text .= "Link: " . esc_url( $item['url'] ) . "\n\n";
            $document_text .= $item['content'] . "\n\n---\n\n";
        }

        // Send to BGOS train endpoint.
        $train_endpoint = rtrim( $server_url, '/' ) . '/api/forms/agents/' . rawurlencode( $agent_id ) . '/train';

        $headers = array(
            'Content-Type' => 'application/json',
            'User-Agent'   => 'WordPress/' . get_bloginfo( 'version' ) . '; BGOS/' . BGOS_CHATBOT_VERSION,
        );

        if ( ! empty( $api_key ) ) {
            $headers['Authorization'] = 'Bearer ' . $api_key;
        }

        $body = wp_json_encode( array(
            'type'         => 'doc',
            'docName'      => 'WordPress_Sync_' . sanitize_title( $site_name ) . '.md',
            'documentText' => $document_text,
            'source'       => 'wordpress_plugin',
            'itemCount'    => count( $sync_items ),
        ) );

        $response = wp_remote_post( $train_endpoint, array(
            'headers' => $headers,
            'body'    => $body,
            'timeout' => 25,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => $response->get_error_message() ) );
        }

        $status_code = wp_remote_retrieve_response_code( $response );
        if ( $status_code >= 200 && $status_code < 300 ) {
            $count = count( $sync_items );
            update_option( 'bgos_last_sync_timestamp', current_time( 'timestamp' ) );
            update_option( 'bgos_last_sync_count', $count );

            wp_send_json_success( array(
                'message' => sprintf(
                    /* translators: %d: number of documents synced */
                    __( 'Success! %d pages and posts were successfully synced to your AI Agent’s knowledge base.', 'bgos-ai-chatbot' ),
                    $count
                ),
                'count'   => $count,
            ) );
        } else {
            wp_send_json_error( array(
                'message' => sprintf(
                    /* translators: %d: HTTP status code */
                    __( 'Server returned error status code: %d. Check your Agent ID and API Key.', 'bgos-ai-chatbot' ),
                    $status_code
                ),
            ) );
        }
    }
}
