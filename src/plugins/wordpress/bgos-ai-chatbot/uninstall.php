<?php
/**
 * Fired when the plugin is deleted.
 *
 * @package BGOS_AI_Chatbot
 */

// If uninstall not called from WordPress, exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Delete options created by the plugin.
delete_option( 'bgos_agent_id' );
delete_option( 'bgos_server_url' );
delete_option( 'bgos_api_key' );
delete_option( 'bgos_enable_widget' );
delete_option( 'bgos_widget_position' );
delete_option( 'bgos_brand_color' );
delete_option( 'bgos_greeting_message' );
delete_option( 'bgos_excluded_pages' );
delete_option( 'bgos_hide_for_admins' );
delete_option( 'bgos_last_sync_timestamp' );
delete_option( 'bgos_last_sync_count' );
