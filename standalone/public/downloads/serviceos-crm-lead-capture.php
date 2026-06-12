<?php
/**
 * Plugin Name: ServiceOS CRM Lead Capture
 * Plugin URI: https://serviceos.com/wordpress
 * Description: Captures form submissions from Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms — sends them as leads to your ServiceOS CRM.
 * Version: 2.0.0
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
define( 'SOS_CRM_VERSION', '2.0.0' );
define( 'SOS_CRM_OPTION_KEY', 'serviceos_crm_settings' );
define( 'SOS_CRM_LOG_OPTION', 'serviceos_crm_logs' );

// ─── Activation / Deactivation ──────────────────────────────────────────────
register_activation_hook( __FILE__, 'sos_crm_activate' );
register_deactivation_hook( __FILE__, 'sos_crm_deactivate' );

function sos_crm_activate() {
    $defaults = array(
        'api_url'    => '',
        'api_key'    => '',
        'tenant_id'  => '',
        'enabled'    => true,
        'cf7_enabled'    => true,
        'wpforms_enabled' => true,
        'gravity_enabled' => true,
        'fluent_enabled'  => true,
        'elementor_enabled' => true,
        'debug_mode' => false,
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
        'api_url'    => '',
        'api_key'    => '',
        'tenant_id'  => '',
        'enabled'    => true,
        'cf7_enabled'    => true,
        'wpforms_enabled' => true,
        'gravity_enabled' => true,
        'fluent_enabled'  => true,
        'elementor_enabled' => true,
        'debug_mode' => false,
    ) );
}

function sos_crm_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    $settings = sos_crm_get_settings();
    $logs = get_option( SOS_CRM_LOG_OPTION, array() );

    // Handle form save
    if ( isset( $_POST['sos_crm_save'] ) && check_admin_referer( 'sos_crm_settings', 'sos_crm_nonce' ) ) {
        $settings['api_url']   = esc_url_raw( $_POST['api_url'] );
        $settings['api_key']   = sanitize_text_field( $_POST['api_key'] );
        $settings['tenant_id'] = sanitize_text_field( $_POST['tenant_id'] );
        $settings['enabled']   = isset( $_POST['enabled'] );
        $settings['cf7_enabled']      = isset( $_POST['cf7_enabled'] );
        $settings['wpforms_enabled']  = isset( $_POST['wpforms_enabled'] );
        $settings['gravity_enabled']  = isset( $_POST['gravity_enabled'] );
        $settings['fluent_enabled']   = isset( $_POST['fluent_enabled'] );
        $settings['elementor_enabled'] = isset( $_POST['elementor_enabled'] );
        $settings['debug_mode']       = isset( $_POST['debug_mode'] );
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
        <h1>🚀 ServiceOS CRM — WordPress Lead Capture</h1>

        <?php if ( ! $is_configured ) : ?>
        <div class="notice notice-info">
            <p><strong>Get started:</strong> Copy your <strong>API URL</strong> and <strong>API Key</strong> from your ServiceOS Settings → WordPress Integration page, then paste them below.</p>
        </div>
        <?php endif; ?>

        <form method="post">
            <?php wp_nonce_field( 'sos_crm_settings', 'sos_crm_nonce' ); ?>

            <table class="form-table">
                <tr>
                    <th scope="row"><label for="api_url">API URL</label></th>
                    <td>
                        <input type="url" name="api_url" id="api_url" value="<?php echo esc_attr( $settings['api_url'] ); ?>" class="regular-text" placeholder="https://your-serviceos.com/api/wordpress/leads" />
                        <p class="description">Your ServiceOS WordPress Lead Capture endpoint URL</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="api_key">API Key</label></th>
                    <td>
                        <input type="password" name="api_key" id="api_key" value="<?php echo esc_attr( $settings['api_key'] ); ?>" class="regular-text" placeholder="sos_wp_..." />
                        <p class="description">API key from ServiceOS Settings → WordPress Integration</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="tenant_id">Tenant ID <small>(optional)</small></label></th>
                    <td>
                        <input type="text" name="tenant_id" id="tenant_id" value="<?php echo esc_attr( $settings['tenant_id'] ); ?>" class="regular-text" placeholder="e.g., cm3x..." />
                        <p class="description">Your ServiceOS tenant ID (for multi-tenant setups)</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Master Switch</th>
                    <td>
                        <label><input type="checkbox" name="enabled" <?php checked( $settings['enabled'] ); ?> /> <strong>Enable lead capture</strong></label>
                    </td>
                </tr>
            </table>

            <h2 class="title">Supported Form Plugins</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Contact Form 7</th>
                    <td><label><input type="checkbox" name="cf7_enabled" <?php checked( $settings['cf7_enabled'] ); ?> /> Capture CF7 submissions</label></td>
                </tr>
                <tr>
                    <th scope="row">WPForms</th>
                    <td><label><input type="checkbox" name="wpforms_enabled" <?php checked( $settings['wpforms_enabled'] ); ?> /> Capture WPForms submissions</label></td>
                </tr>
                <tr>
                    <th scope="row">Gravity Forms</th>
                    <td><label><input type="checkbox" name="gravity_enabled" <?php checked( $settings['gravity_enabled'] ); ?> /> Capture Gravity Forms submissions</label></td>
                </tr>
                <tr>
                    <th scope="row">Fluent Forms</th>
                    <td><label><input type="checkbox" name="fluent_enabled" <?php checked( $settings['fluent_enabled'] ); ?> /> Capture Fluent Forms submissions</label></td>
                </tr>
                <tr>
                    <th scope="row">Elementor Forms</th>
                    <td><label><input type="checkbox" name="elementor_enabled" <?php checked( $settings['elementor_enabled'] ); ?> /> Capture Elementor Forms submissions</label></td>
                </tr>
                <tr>
                    <th scope="row">Debug Mode</th>
                    <td><label><input type="checkbox" name="debug_mode" <?php checked( $settings['debug_mode'] ); ?> /> Log all payloads (for troubleshooting)</label></td>
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

        <h2>Integration Logs</h2>
        <form method="post">
            <?php wp_nonce_field( 'sos_crm_settings', 'sos_crm_nonce' ); ?>
            <button type="submit" name="sos_crm_clear_logs" class="button button-small">Clear Logs</button>
        </form>
        <table class="widefat striped" style="margin-top:10px; max-width:800px;">
            <thead><tr><th>Time</th><th>Form</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
            <?php if ( empty( $logs ) ) : ?>
                <tr><td colspan="4" style="text-align:center;color:#999;">No logs yet. Submit a form to see activity here.</td></tr>
            <?php else : ?>
                <?php foreach ( array_slice( array_reverse( $logs ), 0, 50 ) as $log ) : ?>
                <tr>
                    <td style="white-space:nowrap;"><?php echo esc_html( $log['time'] ); ?></td>
                    <td><?php echo esc_html( $log['form'] ); ?></td>
                    <td style="color:<?php echo $log['success'] ? 'green' : 'red'; ?>;font-weight:bold;"><?php echo $log['success'] ? '✅' : '❌'; ?></td>
                    <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;"><?php echo esc_html( $log['detail'] ); ?></td>
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

// ─── Core: Send Lead to ServiceOS ──────────────────────────────────────────
function sos_crm_send_lead( $data, $form_name = 'Unknown' ) {
    $settings = sos_crm_get_settings();

    if ( empty( $settings['api_url'] ) || empty( $settings['api_key'] ) || ! $settings['enabled'] ) {
        return array( 'success' => false, 'message' => 'Plugin not configured or disabled' );
    }

    // Add metadata
    $data['_form_plugin'] = $form_name;
    $data['_source'] = 'wordpress';
    $data['_timestamp'] = current_time( 'mysql' );
    if ( ! empty( $settings['tenant_id'] ) ) {
        $data['_tenant_id'] = $settings['tenant_id'];
    }

    $response = wp_remote_post( $settings['api_url'], array(
        'timeout' => 15,
        'headers' => array(
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $settings['api_key'],
        ),
        'body' => wp_json_encode( $data ),
    ) );

    if ( is_wp_error( $response ) ) {
        $error_msg = $response->get_error_message();
        sos_crm_log( $form_name, false, $error_msg );
        return array( 'success' => false, 'message' => $error_msg );
    }

    $code = wp_remote_retrieve_response_code( $response );
    $body = wp_remote_retrieve_body( $response );
    $result = json_decode( $body, true );

    if ( $code >= 200 && $code < 300 && ! empty( $result['success'] ) ) {
        $msg = isset( $result['leadId'] ) ? "Lead created (ID: {$result['leadId']})" : 'Lead created';
        sos_crm_log( $form_name, true, $msg );
        return array( 'success' => true, 'message' => $msg, 'lead_id' => $result['leadId'] ?? null );
    } else {
        $error = $result['error'] ?? "HTTP {$code}";
        sos_crm_log( $form_name, false, $error );
        return array( 'success' => false, 'message' => $error );
    }
}

// ─── Logging ────────────────────────────────────────────────────────────────
function sos_crm_log( $form, $success, $detail ) {
    $settings = sos_crm_get_settings();
    // Only log in debug mode or on failure
    if ( ! $settings['debug_mode'] && $success ) return;

    $logs = get_option( SOS_CRM_LOG_OPTION, array() );
    $logs[] = array(
        'time'    => current_time( 'mysql' ),
        'form'    => $form,
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
function sos_crm_test_connection( $api_url, $api_key ) {
    if ( empty( $api_url ) || empty( $api_key ) ) {
        return array( 'success' => false, 'message' => 'API URL and Key are required.' );
    }

    $response = wp_remote_get( $api_url, array(
        'timeout' => 10,
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_key,
        ),
    ) );

    if ( is_wp_error( $response ) ) {
        return array( 'success' => false, 'message' => 'Connection failed: ' . $response->get_error_message() );
    }

    $code = wp_remote_retrieve_response_code( $response );
    $body = wp_remote_retrieve_body( $response );
    $result = json_decode( $body, true );

    if ( $code === 200 && ! empty( $result['status'] ) ) {
        return array(
            'success' => true,
            'message' => 'Connected! ServiceOS is ready to receive leads. ' . ( $result['message'] ?? '' ),
        );
    } else {
        return array(
            'success' => false,
            'message' => "HTTP {$code}: " . ( $result['error'] ?? $body ),
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM PLUGIN HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Contact Form 7 ─────────────────────────────────────────────────────
// Use wpcf7_before_send_mail instead of wpcf7_mail_sent to capture leads
// even when email delivery fails (common with misconfigured WordPress mail)
add_action( 'wpcf7_before_send_mail', 'sos_crm_cf7_hook', 10, 1 );

function sos_crm_cf7_hook( $contact_form ) {
    $settings = sos_crm_get_settings();
    if ( ! $settings['enabled'] || ! $settings['cf7_enabled'] ) return;

    $submission = WPCF7_Submission::get_instance();
    if ( ! $submission ) return;

    $data = $submission->get_posted_data();
    $form_name = 'CF7: ' . $contact_form->title();

    // Add page URL
    $data['_page_url'] = $submission->get_meta( 'url' );
    $data['_form_name'] = $form_name;

    sos_crm_send_lead( $data, $form_name );
}

// ─── 2. WPForms ─────────────────────────────────────────────────────────────
add_action( 'wpforms_process_complete', 'sos_crm_wpforms_hook', 10, 4 );

function sos_crm_wpforms_hook( $fields, $entry, $form_data, $entry_id ) {
    $settings = sos_crm_get_settings();
    if ( ! $settings['enabled'] || ! $settings['wpforms_enabled'] ) return;

    $data = array();
    foreach ( $fields as $field ) {
        $key = sanitize_title( $field['name'] ?? $field['label'] ?? '' );
        $data[ $key ] = $field['value'] ?? '';
    }

    $form_name = 'WPForms: ' . ( $form_data['settings']['form_title'] ?? 'Unknown' );
    $data['_form_name'] = $form_name;
    $data['_page_url'] = $entry['meta']['page_url'] ?? '';

    sos_crm_send_lead( $data, $form_name );
}

// ─── 3. Gravity Forms ───────────────────────────────────────────────────────
add_action( 'gform_after_submission', 'sos_crm_gravity_hook', 10, 2 );

function sos_crm_gravity_hook( $entry, $form ) {
    $settings = sos_crm_get_settings();
    if ( ! $settings['enabled'] || ! $settings['gravity_enabled'] ) return;

    $data = array();
    foreach ( $form['fields'] as $field ) {
        $value = rgars( $entry, (string) $field->id );
        if ( ! empty( $value ) ) {
            $key = sanitize_title( $field->label ?? $field->id );
            $data[ $key ] = $value;
        }
    }

    $form_name = 'Gravity: ' . ( $form['title'] ?? 'Unknown' );
    $data['_form_name'] = $form_name;
    $data['_page_url'] = $entry['source_url'] ?? '';

    sos_crm_send_lead( $data, $form_name );
}

// ─── 4. Fluent Forms ────────────────────────────────────────────────────────
add_action( 'fluentform/submission_inserted', 'sos_crm_fluent_hook', 10, 3 );

function sos_crm_fluent_hook( $entry_id, $form_data, $entry ) {
    $settings = sos_crm_get_settings();
    if ( ! $settings['enabled'] || ! $settings['fluent_enabled'] ) return;

    $data = array();
    if ( ! empty( $form_data['fields'] ) ) {
        foreach ( $form_data['fields'] as $field ) {
            $key = sanitize_title( $field['label'] ?? $field['name'] ?? '' );
            $data[ $key ] = $field['value'] ?? '';
        }
    }

    $form_name = 'Fluent: ' . ( $form_data['title'] ?? 'Unknown' );
    $data['_form_name'] = $form_name;

    sos_crm_send_lead( $data, $form_name );
}

// ─── 5. Elementor Forms ─────────────────────────────────────────────────────
add_action( 'elementor_pro/forms/new_record', 'sos_crm_elementor_hook', 10, 2 );

function sos_crm_elementor_hook( $record, $handler ) {
    $settings = sos_crm_get_settings();
    if ( ! $settings['enabled'] || ! $settings['elementor_enabled'] ) return;

    $data = array();
    $fields = $record->get( 'fields' );
    foreach ( $fields as $id => $field ) {
        $key = sanitize_title( $field['title'] ?? $id );
        $data[ $key ] = $field['value'] ?? '';
    }

    $form_name = 'Elementor: ' . ( $record->get_form_settings( 'form_name' ) ?? 'Unknown' );
    $data['_form_name'] = $form_name;

    sos_crm_send_lead( $data, $form_name );
}

// ─── Settings link on plugins page ──────────────────────────────────────────
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'sos_crm_action_links' );

function sos_crm_action_links( $links ) {
    $url = admin_url( 'options-general.php?page=serviceos-crm' );
    array_unshift( $links, '<a href="' . esc_url( $url ) . '">Settings</a>' );
    return $links;
}
