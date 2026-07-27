<?php
/**
 * Plugin Name: ServiceOS CRM Lead Capture
 * Plugin URI: https://serviceos.com/wordpress
 * Description: Injects a universal JavaScript form capture script on every page. Works with Contact Form 7, WPForms, Gravity Forms, Ninja Forms, Fluent Forms, Elementor Forms, Formidable, MetForm, Everest Forms, HTML forms, and custom forms — automatically.
 * Version: 2.1.0
 * Author: ServiceOS
 * Author URI: https://serviceos.com
 * License: GPL v2 or later
 * Text Domain: serviceos-crm
 * Domain Path: /languages
 *
 * ServiceOS CRM Lead Capture – Connect WordPress Forms to Your CRM
 * Copyright (C) 2025 ServiceOS
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Constants ──────────────────────────────────────────────────────────────
define( 'SOS_CRM_VERSION', '2.1.0' );
define( 'SOS_CRM_OPTION_KEY', 'serviceos_crm_settings' );
define( 'SOS_CRM_LOG_OPTION', 'serviceos_crm_logs' );

// ─── Activation / Deactivation ──────────────────────────────────────────────
register_activation_hook( __FILE__, 'sos_crm_activate' );
register_deactivation_hook( __FILE__, 'sos_crm_deactivate' );

function sos_crm_activate() {
    $defaults = array(
        'api_url'         => '',
        'api_key'         => '',
        'tenant_id'       => '',
        'enabled'         => true,
        'intercept_ajax'  => false,
        'debug_mode'      => false,
    );
    if ( ! get_option( SOS_CRM_OPTION_KEY ) ) {
        add_option( SOS_CRM_OPTION_KEY, $defaults );
    }
    if ( ! get_option( SOS_CRM_LOG_OPTION ) ) {
        add_option( SOS_CRM_LOG_OPTION, array() );
    }
}

function sos_crm_deactivate() {
    // Keep settings on deactivation
}

// ─── Settings Page ──────────────────────────────────────────────────────────
add_action( 'admin_menu', 'sos_crm_admin_menu' );

function sos_crm_admin_menu() {
    add_options_page(
        'ServiceOS CRM',
        'ServiceOS CRM',
        'manage_options',
        'serviceos-crm',
        'sos_crm_settings_page'
    );
}

function sos_crm_get_settings() {
    return wp_parse_args( get_option( SOS_CRM_OPTION_KEY, array() ), array(
        'api_url'         => '',
        'api_key'         => '',
        'tenant_id'       => '',
        'enabled'         => true,
        'intercept_ajax'  => false,
        'debug_mode'      => false,
    ) );
}

function sos_crm_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    $settings = sos_crm_get_settings();
    $logs = get_option( SOS_CRM_LOG_OPTION, array() );

    // Handle form save
    if ( isset( $_POST['sos_crm_save'] ) && check_admin_referer( 'sos_crm_settings', 'sos_crm_nonce' ) ) {
        $settings['api_url']         = esc_url_raw( $_POST['api_url'] );
        $settings['api_key']         = sanitize_text_field( $_POST['api_key'] );
        $settings['tenant_id']       = sanitize_text_field( $_POST['tenant_id'] );
        $settings['enabled']         = isset( $_POST['enabled'] );
        $settings['intercept_ajax']  = isset( $_POST['intercept_ajax'] );
        $settings['debug_mode']      = isset( $_POST['debug_mode'] );
        update_option( SOS_CRM_OPTION_KEY, $settings );
        echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
        $settings = sos_crm_get_settings();
    }

    // Handle test connection
    $test_result = null;
    if ( isset( $_POST['sos_crm_test'] ) && check_admin_referer( 'sos_crm_settings', 'sos_crm_nonce' ) ) {
        $test_result = sos_crm_test_connection( $settings['api_url'], $settings['api_key'] );
    }

    // Handle clear logs
    if ( isset( $_POST['sos_crm_clear_logs'] ) && check_admin_referer( 'sos_crm_settings', 'sos_crm_nonce' ) ) {
        update_option( SOS_CRM_LOG_OPTION, array() );
        $logs = array();
        echo '<div class="notice notice-success"><p>Logs cleared.</p></div>';
    }

    $is_configured = ! empty( $settings['api_url'] ) && ! empty( $settings['api_key'] );
    ?>
    <div class="wrap">
        <h1>🚀 ServiceOS CRM — Universal Lead Capture</h1>
        <p style="color:#64748b;font-size:13px;max-width:800px;">Injects a universal JavaScript form capture script on every page. Works with Contact Form 7, WPForms, Gravity Forms, Ninja Forms, Fluent Forms, Elementor Forms, Formidable, MetForm, Everest Forms, HTML forms, and custom forms — automatically.</p>

        <?php if ( ! $is_configured ) : ?>
        <div class="notice notice-info">
            <p><strong>Get started:</strong> Copy your <strong>ServiceOS URL</strong> and <strong>API Key</strong> from your ServiceOS Settings → Integrations → Website Form Integration page, then paste them below.</p>
        </div>
        <?php endif; ?>

        <form method="post">
            <?php wp_nonce_field( 'sos_crm_settings', 'sos_crm_nonce' ); ?>

            <table class="form-table">
                <tr>
                    <th scope="row"><label for="api_url">ServiceOS URL</label></th>
                    <td>
                        <input type="url" name="api_url" id="api_url" value="<?php echo esc_attr( $settings['api_url'] ); ?>" class="regular-text" placeholder="https://app.yourcrm.com" />
                        <p class="description">Your ServiceOS base URL. The plugin loads /embed.js from this domain.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="api_key">API Key</label></th>
                    <td>
                        <input type="password" name="api_key" id="api_key" value="<?php echo esc_attr( $settings['api_key'] ); ?>" class="regular-text" placeholder="ff_prod_xxxxxxxxxxxx" />
                        <p class="description">API key from ServiceOS Settings → Integrations → Website Form Integration</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="tenant_id">Tenant ID <small>(optional)</small></label></th>
                    <td>
                        <input type="text" name="tenant_id" id="tenant_id" value="<?php echo esc_attr( $settings['tenant_id'] ); ?>" class="regular-text" placeholder="e.g., cm3x..." />
                        <p class="description">Your ServiceOS tenant ID (for multi-tenant setups). Auto-detected if your API key is tenant-scoped.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Master Switch</th>
                    <td>
                        <label><input type="checkbox" name="enabled" <?php checked( $settings['enabled'] ); ?> /> <strong>Inject universal capture script on every frontend page</strong></label>
                    </td>
                </tr>
                <tr>
                    <th scope="row">AJAX Interception</th>
                    <td>
                        <label><input type="checkbox" name="intercept_ajax" <?php checked( $settings['intercept_ajax'] ); ?> /> Also intercept AJAX form POSTs (fetch + XHR)</label>
                        <p class="description">Enable for forms that submit via AJAX without a page reload (Contact Form 7 REST mode, Elementor, custom React forms). Disabled by default.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Debug Mode</th>
                    <td>
                        <label><input type="checkbox" name="debug_mode" <?php checked( $settings['debug_mode'] ); ?> /> Log script load events (for troubleshooting)</label>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <button type="submit" name="sos_crm_save" class="button button-primary">Save Settings</button>
                <button type="submit" name="sos_crm_test" class="button button-secondary" style="margin-left:8px;" <?php disabled( ! $is_configured ); ?>>Test Connection</button>
            </p>
        </form>

        <?php if ( $test_result !== null ) : ?>
        <div class="notice <?php echo $test_result['success'] ? 'notice-success' : 'notice-error'; ?>">
            <p><strong><?php echo $test_result['success'] ? '✅ Connected!' : '❌ Connection Failed'; ?></strong></p>
            <p><?php echo esc_html( $test_result['message'] ); ?></p>
        </div>
        <?php endif; ?>

        <h2>📋 Supported Form Plugins</h2>
        <table class="widefat striped" style="max-width:800px; margin-top:8px;">
            <thead><tr><th>Form Plugin</th><th>Supported</th><th>Notes</th></tr></thead>
            <tbody>
                <tr><td><strong>Contact Form 7</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically. Enable AJAX interception for CF7 REST mode.</td></tr>
                <tr><td><strong>WPForms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically. AJAX mode supported.</td></tr>
                <tr><td><strong>Gravity Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically. AJAX mode supported.</td></tr>
                <tr><td><strong>Ninja Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically.</td></tr>
                <tr><td><strong>Fluent Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically.</td></tr>
                <tr><td><strong>Elementor Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Enable AJAX interception — Elementor submits via fetch/XHR.</td></tr>
                <tr><td><strong>Formidable Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically.</td></tr>
                <tr><td><strong>MetForm</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Enable AJAX interception — MetForm submits via XHR.</td></tr>
                <tr><td><strong>Everest Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Native submit captured automatically.</td></tr>
                <tr><td><strong>HTML Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Captured automatically — plain &lt;form&gt; elements.</td></tr>
                <tr><td><strong>Custom React / Vue / PHP Forms</strong></td><td><span style="color:#22c55e;">✓ Yes</span></td><td>Captured automatically. Use AJAX interception for SPA-style form POSTs.</td></tr>
                <tr><td><strong>JotForm (iframe)</strong></td><td><span style="color:#f59e0b;">⚠ Webhook only</span></td><td>JotForm iframe forms cannot be captured via JS. Use ServiceOS Webhook URL in JotForm's webhook settings.</td></tr>
            </tbody>
        </table>

        <h2>Integration Logs</h2>
        <form method="post">
            <?php wp_nonce_field( 'sos_crm_settings', 'sos_crm_nonce' ); ?>
            <button type="submit" name="sos_crm_clear_logs" class="button button-small">Clear Logs</button>
        </form>
        <table class="widefat striped" style="margin-top:10px; max-width:800px;">
            <thead><tr><th>Time</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
            <?php if ( empty( $logs ) ) : ?>
                <tr><td colspan="3" style="text-align:center;color:#999;">No logs yet. (Lead delivery is handled by the embed script client-side; this log tracks plugin-side events like script injection and connection tests.)</td></tr>
            <?php else : ?>
                <?php foreach ( array_slice( array_reverse( $logs ), 0, 50 ) as $log ) : ?>
                <tr>
                    <td style="white-space:nowrap;"><?php echo esc_html( $log['time'] ); ?></td>
                    <td style="color:<?php echo $log['success'] ? 'green' : 'red'; ?>;font-weight:bold;"><?php echo $log['success'] ? '✅' : '❌'; ?></td>
                    <td style="max-width:500px;"><?php echo esc_html( $log['detail'] ); ?></td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>

        <hr style="margin-top:30px;" />
        <h3>Field Mapping Reference</h3>
        <p>ServiceOS auto-maps these common form fields:</p>
        <table class="widefat" style="max-width:500px;">
            <thead><tr><th>Lead Field</th><th>Recognized Form Field Names</th></tr></thead>
            <tbody>
                <tr><td><strong>Name</strong></td><td>your-name, name, full_name, contact_name</td></tr>
                <tr><td><strong>Phone</strong></td><td>your-phone, phone, mobile, cell, telephone</td></tr>
                <tr><td><strong>Email</strong></td><td>your-email, email, email_address</td></tr>
                <tr><td><strong>Subject/Service</strong></td><td>your-subject, subject, service, inquiry_type</td></tr>
                <tr><td><strong>Message</strong></td><td>your-message, message, description, notes</td></tr>
                <tr><td><strong>Address</strong></td><td>your-address, address, street, location</td></tr>
            </tbody>
        </table>
    </div>
    <?php
}

// ─── Logging ────────────────────────────────────────────────────────────────
function sos_crm_log( $success, $detail ) {
    $settings = sos_crm_get_settings();
    // Only log in debug mode or on failure
    if ( ! $settings['debug_mode'] && $success ) return;

    $logs = get_option( SOS_CRM_LOG_OPTION, array() );
    $logs[] = array(
        'time'    => current_time( 'mysql' ),
        'success' => $success,
        'detail'  => $detail,
    );

    // Keep only last 200 entries
    if ( count( $logs ) > 200 ) {
        $logs = array_slice( $logs, -200 );
    }

    update_option( SOS_CRM_LOG_OPTION, $logs );
}

// ─── Test Connection ────────────────────────────────────────────────────────
//
// Tests the universal /api/forms/leads endpoint with ?key= query param auth.
// This is the same auth mechanism JotForm webhooks use.

function sos_crm_test_connection( $api_url, $api_key ) {
    if ( empty( $api_url ) || empty( $api_key ) ) {
        return array( 'success' => false, 'message' => 'ServiceOS URL and Key are required.' );
    }

    // Normalize base URL
    $api_base = rtrim( $api_url, '/' );
    if ( substr( $api_base, -16 ) === '/api/forms/leads' ) {
        $api_base = substr( $api_base, 0, -16 );
    }
    $test_url = $api_base . '/api/forms/leads?key=' . rawurlencode( $api_key );

    $response = wp_remote_get( $test_url, array(
        'timeout' => 10,
        'headers' => array( 'Content-Type' => 'application/json' ),
    ) );

    if ( is_wp_error( $response ) ) {
        return array( 'success' => false, 'message' => 'Connection failed: ' . $response->get_error_message() );
    }

    $code = wp_remote_retrieve_response_code( $response );
    $body = json_decode( wp_remote_retrieve_body( $response ), true );

    if ( $code === 200 && ! empty( $body['status'] ) && $body['status'] === 'connected' ) {
        return array(
            'success' => true,
            'message' => 'Connected! ServiceOS is ready to receive leads. ' . ( $body['message'] ?? '' ),
        );
    } else {
        return array(
            'success' => false,
            'message' => "HTTP {$code}: " . ( $body['error'] ?? wp_remote_retrieve_body( $response ) ),
        );
    }
}

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSAL EMBED SCRIPT LOADER
// ════════════════════════════════════════════════════════════════════════════
//
// This plugin no longer hooks into individual form plugins (wpcf7_mail_sent,
// wpforms_process_complete, gform_after_submission, fluentform/submission_inserted,
// elementor_pro/forms/new_record). Instead, it injects a single universal
// JavaScript file (embed.js) on every frontend page. That script listens to
// ALL <form> submit events, maps fields, and POSTs to /api/forms/leads.
// This works with every form plugin automatically.
//
// JotForm is a special case — it embeds forms in a cross-origin iframe, so
// the JS cannot capture those. JotForm users should use the ServiceOS webhook
// URL (?key= query param auth) directly in JotForm's webhook settings.

add_action( 'wp_enqueue_scripts', 'sos_crm_enqueue_embed_script' );

function sos_crm_enqueue_embed_script() {
    $settings = sos_crm_get_settings();

    // Skip in wp-admin and on AJAX endpoints
    if ( is_admin() || wp_doing_ajax() ) return;

    // Skip if disabled
    if ( empty( $settings['enabled'] ) ) return;

    // Skip if not configured
    if ( empty( $settings['api_url'] ) || empty( $settings['api_key'] ) ) return;

    // Normalize the API URL: strip any trailing /api/forms/leads so we can
    // use it as a base for /embed.js.
    $api_base = rtrim( $settings['api_url'], '/' );
    if ( substr( $api_base, -16 ) === '/api/forms/leads' ) {
        $api_base = substr( $api_base, 0, -16 );
    }

    $embed_url = $api_base . '/embed.js';

    // Register + enqueue the universal embed script
    wp_register_script( 'serviceos-embed', $embed_url, array(), SOS_CRM_VERSION, true );
    wp_enqueue_script( 'serviceos-embed' );

    // Pass config to the script via wp_localize_script. embed.js reads
    // window.SERVICEOS_CONFIG before init.
    $config = array(
        'apiKey'        => $settings['api_key'],
        'apiUrl'        => $api_base,
        'interceptAjax' => ! empty( $settings['intercept_ajax'] ),
        'showToast'     => false,
    );
    wp_localize_script( 'serviceos-embed', 'SERVICEOS_CONFIG', $config );

    if ( ! empty( $settings['debug_mode'] ) ) {
        sos_crm_log( true, 'Enqueued serviceos-embed script from: ' . $embed_url );
    }
}

// ─── Settings link on plugins page ──────────────────────────────────────────
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'sos_crm_action_links' );

function sos_crm_action_links( $links ) {
    $url = admin_url( 'options-general.php?page=serviceos-crm' );
    array_unshift( $links, '<a href="' . esc_url( $url ) . '">Settings</a>' );
    return $links;
}
