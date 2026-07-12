<?php
/**
 * Plugin Name: ServiceOS CRM Connector
 * Plugin URI: https://serviceos.com/wordpress
 * Description: Connect WordPress forms to ServiceOS CRM. Auto-captures leads from Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms with WhatsApp notifications.
 * Version: 2.0.0
 * Author: ServiceOS
 * Author URI: https://serviceos.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: serviceos-crm-connector
 * Domain Path: /languages
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// ─── Constants ────────────────────────────────────────────────────────────────

define('SERVICEOS_VERSION', '2.0.0');
define('SERVICEOS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SERVICEOS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SERVICEOS_OPTION_KEY', 'serviceos_crm_settings');
define('SERVICEOS_LOG_OPTION', 'serviceos_crm_logs');

// ─── Activation / Deactivation ────────────────────────────────────────────────

register_activation_hook(__FILE__, 'serviceos_activate');
register_deactivation_hook(__FILE__, 'serviceos_deactivate');

function serviceos_activate() {
    $defaults = array(
        'api_url'             => '',
        'api_key'             => '',
        'tenant_id'           => '',
        'enabled'             => true,
        'debug_mode'          => false,
        'webhook_secret'      => '',
        // Form plugin toggles
        'cf7_enabled'         => true,
        'wpforms_enabled'     => false,
        'gravity_enabled'     => false,
        'fluent_enabled'      => false,
        'elementor_enabled'   => false,
        // WhatsApp settings
        'whatsapp_notify'     => false,
        'whatsapp_number'     => '',
        'whatsapp_auto_reply' => false,
        'whatsapp_template'   => '',
        // Lead settings
        'default_service'     => '',
        'default_tags'        => '',
        'assign_to_id'        => '',
        'assign_to_name'      => '',
    );
    if (false === get_option(SERVICEOS_OPTION_KEY)) {
        add_option(SERVICEOS_OPTION_KEY, $defaults);
    }
    if (false === get_option(SERVICEOS_LOG_OPTION)) {
        add_option(SERVICEOS_LOG_OPTION, array());
    }
    // Set activation flag for redirect
    set_transient('serviceos_activated', true, 30);
}

function serviceos_deactivate() {
    delete_transient('serviceos_connection_test');
}

// ─── Activation Redirect ──────────────────────────────────────────────────────

add_action('admin_init', 'serviceos_activation_redirect');

function serviceos_activation_redirect() {
    if (get_transient('serviceos_activated')) {
        delete_transient('serviceos_activated');
        if (!isset($_GET['activate-multi'])) {
            wp_redirect(admin_url('admin.php?page=serviceos-crm&tab=setup'));
            exit;
        }
    }
}

// ─── Settings Page ────────────────────────────────────────────────────────────

add_action('admin_menu', 'serviceos_add_admin_menu');

function serviceos_add_admin_menu() {
    add_menu_page(
        'ServiceOS CRM',
        'ServiceOS CRM',
        'manage_options',
        'serviceos-crm',
        'serviceos_settings_page',
        'dashicons-businessperson',
        80
    );
}

add_action('admin_init', 'serviceos_settings_init');

function serviceos_settings_init() {
    register_setting('serviceos_crm', SERVICEOS_OPTION_KEY, 'serviceos_sanitize_settings');
}

function serviceos_sanitize_settings($input) {
    $sanitized = array();
    $sanitized['api_url']             = esc_url_raw(trim($input['api_url']));
    $sanitized['api_key']             = sanitize_text_field(trim($input['api_key']));
    $sanitized['tenant_id']           = sanitize_text_field(trim($input['tenant_id']));
    $sanitized['webhook_secret']      = sanitize_text_field(trim($input['webhook_secret']));
    $sanitized['enabled']             = !empty($input['enabled']);
    $sanitized['debug_mode']          = !empty($input['debug_mode']);
    $sanitized['cf7_enabled']         = !empty($input['cf7_enabled']);
    $sanitized['wpforms_enabled']     = !empty($input['wpforms_enabled']);
    $sanitized['gravity_enabled']     = !empty($input['gravity_enabled']);
    $sanitized['fluent_enabled']      = !empty($input['fluent_enabled']);
    $sanitized['elementor_enabled']   = !empty($input['elementor_enabled']);
    $sanitized['whatsapp_notify']     = !empty($input['whatsapp_notify']);
    $sanitized['whatsapp_number']     = sanitize_text_field(trim($input['whatsapp_number']));
    $sanitized['whatsapp_auto_reply'] = !empty($input['whatsapp_auto_reply']);
    $sanitized['whatsapp_template']   = sanitize_textarea_field(trim($input['whatsapp_template']));
    $sanitized['default_service']     = sanitize_text_field(trim($input['default_service']));
    $sanitized['default_tags']        = sanitize_text_field(trim($input['default_tags']));
    $sanitized['assign_to_id']        = sanitize_text_field(trim($input['assign_to_id']));
    $sanitized['assign_to_name']      = sanitize_text_field(trim($input['assign_to_name']));
    return $sanitized;
}

function serviceos_get_settings() {
    return get_option(SERVICEOS_OPTION_KEY, array());
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function serviceos_log($status, $message) {
    $settings = serviceos_get_settings();
    if (empty($settings['debug_mode']) && $status === 'debug') return;

    $logs = get_option(SERVICEOS_LOG_OPTION, array());
    $logs[] = array(
        'time'    => current_time('mysql'),
        'status'  => $status,
        'message' => $message,
    );
    if (count($logs) > 200) {
        $logs = array_slice($logs, -200);
    }
    update_option(SERVICEOS_LOG_OPTION, $logs);
}

// ─── Core: Send Lead to ServiceOS ─────────────────────────────────────────────

function serviceos_send_lead($data, $form_source = 'unknown') {
    $settings = serviceos_get_settings();

    if (empty($settings['enabled'])) {
        serviceos_log('debug', 'Integration disabled. Skipping.');
        return false;
    }

    if (empty($settings['api_url']) || empty($settings['api_key'])) {
        serviceos_log('error', 'API URL or API Key not configured.');
        return false;
    }

    // Add tenant_id
    if (!empty($settings['tenant_id'])) {
        $data['tenantId'] = $settings['tenant_id'];
    }

    // Add form source
    $data['_form_source'] = $form_source;

    // Add WhatsApp control fields
    if (!empty($settings['whatsapp_notify']) && !empty($settings['whatsapp_number'])) {
        $data['_notifyWhatsApp'] = true;
        $data['_whatsappNumber'] = $settings['whatsapp_number'];
        if (!empty($settings['whatsapp_message'])) {
            $data['_whatsappMessage'] = $settings['whatsapp_message'];
        }
    }
    if (!empty($settings['whatsapp_auto_reply'])) {
        $data['_autoReplyWhatsApp'] = true;
        if (!empty($settings['whatsapp_template'])) {
            $data['_autoReplyTemplate'] = $settings['whatsapp_template'];
        }
    }

    // Add lead settings
    if (!empty($settings['default_service'])) {
        $data['_defaultService'] = $settings['default_service'];
    }
    if (!empty($settings['default_tags'])) {
        $data['_defaultTags'] = $settings['default_tags'];
    }
    if (!empty($settings['assign_to_id'])) {
        $data['_assignToId'] = $settings['assign_to_id'];
        $data['_assignToName'] = $settings['assign_to_name'];
    }

    $api_url = trailingslashit($settings['api_url']) . 'webhooks/ingest';

    serviceos_log('debug', "Sending to: {$api_url} (source: {$form_source})");

    $headers = array(
        'Authorization' => 'Bearer ' . $settings['api_key'],
        'Content-Type'  => 'application/json',
    );

    // Sign the payload with webhook secret if configured
    $body = wp_json_encode($data);
    if (!empty($settings['webhook_secret'])) {
        $signature = hash_hmac('sha256', $body, $settings['webhook_secret']);
        $headers['X-Webhook-Signature'] = 'sha256=' . $signature;
    }

    $response = wp_remote_post($api_url, array(
        'headers' => $headers,
        'body'    => $body,
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        $error_msg = $response->get_error_message();
        serviceos_log('error', "Request failed: {$error_msg}");
        return false;
    }

    $code = wp_remote_retrieve_response_code($response);
    $result_body = wp_remote_retrieve_body($response);
    $result = json_decode($result_body, true);

    if (($code === 200 || $code === 201) && !empty($result['success'])) {
        $lead_name = isset($result['lead']['name']) ? $result['lead']['name'] : 'Unknown';
        $lead_id = isset($result['lead']['id']) ? $result['lead']['id'] : 'N/A';
        $lead_score = isset($result['lead']['score']) ? $result['lead']['score'] : 'N/A';
        $processing_time = isset($result['meta']['processingTimeMs']) ? $result['meta']['processingTimeMs'] . 'ms' : 'N/A';
        serviceos_log('success', "Lead created: {$lead_name} (ID: {$lead_id}, Score: {$lead_score}, Time: {$processing_time})");
        return $result;
    } else {
        $error = isset($result['message']) ? $result['message'] : (isset($result['error']) ? $result['error'] : "HTTP {$code}");
        serviceos_log('error', "Failed (HTTP {$code}): {$error}");
        return false;
    }
}

// ─── Hook: Contact Form 7 ─────────────────────────────────────────────────────

add_action('wpcf7_mail_sent', 'serviceos_cf7_handler');

function serviceos_cf7_handler($contact_form) {
    $settings = serviceos_get_settings();
    if (empty($settings['cf7_enabled'])) return;

    $submission = WPCF7_Submission::get_instance();
    if (!$submission) {
        serviceos_log('error', 'CF7: No submission instance found.');
        return;
    }

    $data = $submission->get_posted_data();
    $form_id = $contact_form->id();
    $form_title = $contact_form->title();

    // Remove CF7 internal fields
    foreach (array_keys($data) as $key) {
        if (strpos($key, '_wpcf7') === 0) unset($data[$key]);
    }

    $data['_form_title'] = $form_title;
    $data['_source_url'] = $submission->get_meta('url');
    $data['_ip_address'] = $submission->get_meta('remote_ip');
    $data['_user_agent'] = $submission->get_meta('user_agent');

    serviceos_log('debug', "CF7: Form #{$form_id} - {$form_title}");
    serviceos_send_lead($data, 'contact-form-7');
}

// ─── Hook: WPForms ────────────────────────────────────────────────────────────

add_action('wpforms_process_complete', 'serviceos_wpforms_handler', 10, 4);

function serviceos_wpforms_handler($fields, $entry, $form_data, $entry_id) {
    $settings = serviceos_get_settings();
    if (empty($settings['wpforms_enabled'])) return;

    $data = array();
    foreach ($fields as $field) {
        $key = sanitize_key($field['name']);
        if (empty($key)) $key = 'field_' . $field['id'];
        $data[$key] = $field['value'];
    }

    $data['_form_title'] = $form_data['settings']['form_title'];
    $data['_source_url'] = wp_get_referer();

    serviceos_log('debug', "WPForms: Form #{$form_data['id']} - {$form_data['settings']['form_title']}");
    serviceos_send_lead($data, 'wpforms');
}

// ─── Hook: Gravity Forms ──────────────────────────────────────────────────────

add_action('gform_after_submission', 'serviceos_gravity_handler', 10, 2);

function serviceos_gravity_handler($entry, $form) {
    $settings = serviceos_get_settings();
    if (empty($settings['gravity_enabled'])) return;

    $data = array();
    foreach ($form['fields'] as $field) {
        $value = rgars($entry, $field->id);
        if (!empty($value)) {
            $key = sanitize_key($field->label);
            if (empty($key)) $key = 'field_' . $field->id;
            $data[$key] = $value;
        }
    }

    $data['_form_title'] = $form['title'];
    $data['_source_url'] = rgars($entry, 'source_url');
    $data['_ip_address'] = rgars($entry, 'ip');

    serviceos_log('debug', "Gravity Forms: Form #{$form['id']} - {$form['title']}");
    serviceos_send_lead($data, 'gravity-forms');
}

// ─── Hook: Fluent Forms ───────────────────────────────────────────────────────

add_action('fluentform/submission_inserted', 'serviceos_fluent_handler', 10, 3);

function serviceos_fluent_handler($entry_id, $form_data, $form) {
    $settings = serviceos_get_settings();
    if (empty($settings['fluent_enabled'])) return;

    $data = array();
    $inputs = $form_data['inputs'] ?? array();
    foreach ($inputs as $key => $value) {
        if (is_string($value)) {
            $data[$key] = sanitize_text_field($value);
        }
    }

    $data['_form_title'] = $form->title;
    $data['_source_url'] = wp_get_referer();

    serviceos_log('debug', "Fluent Forms: Form #{$form->id} - {$form->title}");
    serviceos_send_lead($data, 'fluent-forms');
}

// ─── Hook: Elementor Forms ────────────────────────────────────────────────────

add_action('elementor_pro/forms/new_record', 'serviceos_elementor_handler', 10, 2);

function serviceos_elementor_handler($record, $ajax_handler) {
    $settings = serviceos_get_settings();
    if (empty($settings['elementor_enabled'])) return;

    $data = array();
    $fields = $record->get('fields');
    foreach ($fields as $field_key => $field) {
        $key = sanitize_key($field['title'] ?? $field_key);
        if (empty($key)) $key = $field_key;
        $data[$key] = $field['value'] ?? '';
    }

    $data['_form_title'] = $record->get_form_settings('form_name');
    $data['_source_url'] = $record->get('url') ?? wp_get_referer();
    $data['_ip_address'] = \ElementorPro\Core\Utils::get_client_ip();

    serviceos_log('debug', "Elementor Forms: {$data['_form_title']}");
    serviceos_send_lead($data, 'elementor-forms');
}

// ─── AJAX: Test Connection ────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_test_connection', 'serviceos_ajax_test_connection');

function serviceos_ajax_test_connection() {
    check_ajax_referer('serviceos_admin', 'nonce');
    $settings = serviceos_get_settings();
    $api_url = trailingslashit($settings['api_url']) . 'webhooks/ingest';
    $api_key = $settings['api_key'];

    $response = wp_remote_get($api_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
        ),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        wp_send_json_error($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code === 200) {
        set_transient('serviceos_connection_test', 'ok', HOUR_IN_SECONDS);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        wp_send_json_success(array(
            'message' => 'Connected!',
            'stats'   => isset($body['stats']) ? $body['stats'] : array(),
        ));
    } else {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        wp_send_json_error(isset($body['message']) ? $body['message'] : "HTTP {$code}");
    }
}

// ─── AJAX: Send Test Lead ─────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_test_lead', 'serviceos_ajax_test_lead');

function serviceos_ajax_test_lead() {
    check_ajax_referer('serviceos_admin', 'nonce');
    $data = array(
        'name'    => 'Test Lead from WordPress',
        'phone'   => '9999999999',
        'email'   => 'test@wordpress.local',
        'company' => 'Test Company',
        'message' => 'This is a test lead from the ServiceOS WordPress plugin.',
    );
    $result = serviceos_send_lead($data, 'test');
    if ($result) {
        wp_send_json_success($result);
    } else {
        wp_send_json_error('Failed to create test lead. Check logs.');
    }
}

// ─── AJAX: Clear Logs ─────────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_clear_logs', 'serviceos_ajax_clear_logs');

function serviceos_ajax_clear_logs() {
    check_ajax_referer('serviceos_admin', 'nonce');
    update_option(SERVICEOS_LOG_OPTION, array());
    wp_send_json_success();
}

// ─── Admin Bar Indicator ──────────────────────────────────────────────────────

add_action('admin_bar_menu', 'serviceos_admin_bar', 100);

function serviceos_admin_bar($wp_admin_bar) {
    $settings = serviceos_get_settings();
    if (empty($settings['enabled'])) return;

    $is_connected = get_transient('serviceos_connection_test') === 'ok';
    $wp_admin_bar->add_node(array(
        'id'     => 'serviceos-status',
        'title'  => $is_connected
            ? '<span style="color:#22c55e;">●</span> ServiceOS Connected'
            : '<span style="color:#ef4444;">●</span> ServiceOS Disconnected',
        'href'   => admin_url('admin.php?page=serviceos-crm'),
        'parent' => 'top-secondary',
    ));
}

// ─── Plugin Row Meta ──────────────────────────────────────────────────────────

add_filter('plugin_row_meta', 'serviceos_plugin_row_meta', 10, 2);

function serviceos_plugin_row_meta($links, $file) {
    if (plugin_basename(__FILE__) === $file) {
        $links[] = '<a href="https://serviceos.com/docs/wordpress" target="_blank">Documentation</a>';
        $links[] = '<a href="https://serviceos.com/support" target="_blank">Support</a>';
    }
    return $links;
}

// ─── Settings Page HTML ───────────────────────────────────────────────────────

function serviceos_settings_page() {
    $settings = serviceos_get_settings();
    $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'connect';

    // Detect which form plugins are active
    $cf7_active       = class_exists('WPCF7_ContactForm');
    $wpforms_active   = function_exists('wpforms');
    $gravity_active   = class_exists('GFForms');
    $fluent_active    = class_exists('FluentForm\App');
    $elementor_active = class_exists('\ElementorPro\Plugin');

    $any_form_active = $cf7_active || $wpforms_active || $gravity_active || $fluent_active || $elementor_active;

    $is_configured = !empty($settings['api_url']) && !empty($settings['api_key']);
    $is_connected = get_transient('serviceos_connection_test') === 'ok';
    ?>
    <div class="wrap serviceos-admin">
        <style>
            .serviceos-admin .nav-tab-wrapper { border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
            .serviceos-admin .nav-tab { font-size: 13px; padding: 8px 16px; }
            .serviceos-admin .nav-tab-active { border-bottom-color: #10b981; color: #10b981; }
            .serviceos-admin .sos-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .serviceos-admin .sos-card h3 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
            .serviceos-admin .sos-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .serviceos-admin .sos-badge-green { background: #dcfce7; color: #166534; }
            .serviceos-admin .sos-badge-red { background: #fee2e2; color: #991b1b; }
            .serviceos-admin .sos-badge-gray { background: #f1f5f9; color: #64748b; }
            .serviceos-admin .sos-field { margin-bottom: 16px; }
            .serviceos-admin .sos-field label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 13px; }
            .serviceos-admin .sos-field input[type="text"],
            .serviceos-admin .sos-field input[type="url"],
            .serviceos-admin .sos-field input[type="password"],
            .serviceos-admin .sos-field textarea { width: 100%; max-width: 500px; }
            .serviceos-admin .sos-field .description { font-size: 12px; color: #64748b; margin-top: 4px; }
            .serviceos-admin .sos-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 16px; background: #f8fafc; border-radius: 8px; }
            .serviceos-admin .sos-flow-item { padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; }
            .serviceos-admin .sos-flow-arrow { color: #94a3b8; font-size: 16px; }
            .serviceos-admin table { border-collapse: collapse; width: 100%; }
            .serviceos-admin table th, .serviceos-admin table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .serviceos-admin table th { background: #f8fafc; font-weight: 600; }
        </style>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#10b981;border-radius:10px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <div>
                <h1 style="margin:0;font-size:22px;">ServiceOS CRM Connector</h1>
                <p style="margin:0;color:#64748b;font-size:13px;">Capture form submissions as CRM leads with WhatsApp notifications</p>
            </div>
        </div>

        <nav class="nav-tab-wrapper">
            <a href="?page=serviceos-crm&tab=setup" class="nav-tab <?php echo $active_tab === 'setup' ? 'nav-tab-active' : ''; ?>">⚡ Setup</a>
            <a href="?page=serviceos-crm&tab=connect" class="nav-tab <?php echo $active_tab === 'connect' ? 'nav-tab-active' : ''; ?>">🔗 Connect</a>
            <a href="?page=serviceos-crm&tab=forms" class="nav-tab <?php echo $active_tab === 'forms' ? 'nav-tab-active' : ''; ?>">📋 Forms</a>
            <a href="?page=serviceos-crm&tab=whatsapp" class="nav-tab <?php echo $active_tab === 'whatsapp' ? 'nav-tab-active' : ''; ?>">💬 WhatsApp</a>
            <a href="?page=serviceos-crm&tab=field-mapping" class="nav-tab <?php echo $active_tab === 'field-mapping' ? 'nav-tab-active' : ''; ?>">🗺️ Field Map</a>
            <a href="?page=serviceos-crm&tab=logs" class="nav-tab <?php echo $active_tab === 'logs' ? 'nav-tab-active' : ''; ''; ?>">📊 Logs</a>
        </nav>

        <?php if ($active_tab === 'setup'): ?>
            <!-- ════════════════════ SETUP TAB ════════════════════ -->
            <div class="sos-card" style="border-color:#10b981;background:linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%);">
                <h3 style="font-size:16px;color:#166534;">⚡ Quick Setup — Get running in 2 minutes</h3>

                <div class="sos-flow" style="margin-bottom:20px;">
                    <div class="sos-flow-item" style="background:#dbeafe;color:#1e40af;">1. Get API Key</div>
                    <span class="sos-flow-arrow">→</span>
                    <div class="sos-flow-item" style="background:#e0e7ff;color:#3730a3;">2. Connect CRM</div>
                    <span class="sos-flow-arrow">→</span>
                    <div class="sos-flow-item" style="background:#fce7f3;color:#9d174d;">3. Enable Forms</div>
                    <span class="sos-flow-arrow">→</span>
                    <div class="sos-flow-item" style="background:#fef3c7;color:#92400e;">4. Done!</div>
                </div>

                <ol style="line-height:2;">
                    <li><strong>In ServiceOS</strong>, go to <code>Settings → API Keys</code> → click <strong>Generate New Key</strong></li>
                    <li><strong>Copy</strong> the API URL and API Key, paste them in the <a href="?page=serviceos-crm&tab=connect">Connect tab</a></li>
                    <li><strong>Enable</strong> your form plugin(s) in the <a href="?page=serviceos-crm&tab=forms">Forms tab</a></li>
                    <li><strong>Test</strong> by submitting a form — the lead will appear in your CRM instantly!</li>
                </ol>
            </div>

            <!-- Status Dashboard -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
                <div class="sos-card" style="text-align:center;padding:16px;">
                    <div style="font-size:24px;font-weight:700;color:<?php echo $is_connected ? '#22c55e' : '#ef4444'; ?>">
                        <?php echo $is_connected ? '✓' : '✗'; ?>
                    </div>
                    <div style="font-size:12px;color:#64748b;">CRM Connection</div>
                </div>
                <div class="sos-card" style="text-align:center;padding:16px;">
                    <div style="font-size:24px;font-weight:700;color:<?php echo $any_form_active ? '#22c55e' : '#f59e0b'; ?>">
                        <?php echo $any_form_active ? count(array_filter([$cf7_active, $wpforms_active, $gravity_active, $fluent_active, $elementor_active])) : '0'; ?>
                    </div>
                    <div style="font-size:12px;color:#64748b;">Form Plugins Active</div>
                </div>
                <div class="sos-card" style="text-align:center;padding:16px;">
                    <div style="font-size:24px;font-weight:700;color:<?php echo !empty($settings['whatsapp_notify']) ? '#22c55e' : '#94a3b8'; ?>">
                        <?php echo !empty($settings['whatsapp_notify']) ? 'ON' : 'OFF'; ?>
                    </div>
                    <div style="font-size:12px;color:#64748b;">WhatsApp Alerts</div>
                </div>
            </div>

        <?php elseif ($active_tab === 'connect'): ?>
            <!-- ════════════════════ CONNECT TAB ════════════════════ -->
            <form method="post" action="options.php">
                <?php settings_fields('serviceos_crm'); ?>

                <div class="sos-card">
                    <h3>🔗 API Connection</h3>

                    <?php if ($is_connected): ?>
                        <div style="padding:10px 16px;background:#dcfce7;border:1px solid #86efac;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                            <span style="color:#22c55e;font-size:16px;">✓</span>
                            <strong style="color:#166534;">Connected!</strong> Your WordPress site is linked to ServiceOS CRM.
                        </div>
                    <?php elseif ($is_configured): ?>
                        <div style="padding:10px 16px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                            <span style="color:#ef4444;font-size:16px;">✗</span>
                            <strong style="color:#991b1b;">Connection failed.</strong> Check your API URL and Key.
                        </div>
                    <?php else: ?>
                        <div style="padding:10px 16px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;margin-bottom:16px;">
                            ⚠ Enter your API credentials to connect.
                        </div>
                    <?php endif; ?>

                    <div class="sos-field">
                        <label for="api_url">API URL</label>
                        <input type="url" name="<?php echo SERVICEOS_OPTION_KEY; ?>[api_url]" id="api_url"
                               value="<?php echo esc_attr($settings['api_url']); ?>"
                               placeholder="https://app.yourcrm.com/api" />
                        <p class="description">Your ServiceOS API base URL</p>
                    </div>

                    <div class="sos-field">
                        <label for="api_key">API Key</label>
                        <input type="password" name="<?php echo SERVICEOS_OPTION_KEY; ?>[api_key]" id="api_key"
                               value="<?php echo esc_attr($settings['api_key']); ?>"
                               placeholder="sos_prod_xxxxxxxxxxxx" />
                        <p class="description">From ServiceOS Settings → API Keys</p>
                    </div>

                    <div class="sos-field">
                        <label for="tenant_id">Tenant ID <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
                        <input type="text" name="<?php echo SERVICEOS_OPTION_KEY; ?>[tenant_id]" id="tenant_id"
                               value="<?php echo esc_attr($settings['tenant_id']); ?>"
                               placeholder="cltxxxxxxxxxx" />
                        <p class="description">Auto-detected if your API key is tenant-scoped</p>
                    </div>

                    <div class="sos-field">
                        <label for="webhook_secret">Webhook Signing Secret <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
                        <input type="text" name="<?php echo SERVICEOS_OPTION_KEY; ?>[webhook_secret]" id="webhook_secret"
                               value="<?php echo esc_attr($settings['webhook_secret']); ?>"
                               placeholder="whsec_xxxxxxxxxxxx" />
                        <p class="description">For HMAC-SHA256 signature verification. Set this in ServiceOS credential settings too.</p>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[enabled]" value="1"
                                   <?php checked(!empty($settings['enabled'])); ?> />
                            Enable lead capture
                        </label>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[debug_mode]" value="1"
                                   <?php checked(!empty($settings['debug_mode'])); ?> />
                            Debug mode (log all requests)
                        </label>
                    </div>

                    <p class="submit" style="display:flex;gap:12px;align-items:center;padding:0;">
                        <?php submit_button('Save Settings', 'primary', 'submit', false); ?>
                        <?php if ($is_configured): ?>
                            <button type="button" id="serviceos-test-btn" class="button button-secondary">Test Connection</button>
                            <button type="button" id="serviceos-test-lead-btn" class="button button-secondary">Send Test Lead</button>
                        <?php endif; ?>
                    </p>
                </div>
            </form>

            <script>
            jQuery(document).ready(function($) {
                $('#serviceos-test-btn').on('click', function() {
                    var btn = $(this);
                    btn.prop('disabled', true).text('Testing...');
                    $.post(ajaxurl, {
                        action: 'serviceos_test_connection',
                        nonce: '<?php echo wp_create_nonce("serviceos_admin"); ?>'
                    }, function(response) {
                        if (response.success) {
                            btn.after('<span style="color:#22c55e;margin-left:8px;">✓ ' + response.data.message + '</span>');
                        } else {
                            btn.after('<span style="color:#ef4444;margin-left:8px;">✗ ' + response.data + '</span>');
                        }
                    }).always(function() {
                        btn.prop('disabled', false).text('Test Connection');
                        setTimeout(function() { location.reload(); }, 2000);
                    });
                });

                $('#serviceos-test-lead-btn').on('click', function() {
                    var btn = $(this);
                    btn.prop('disabled', true).text('Sending...');
                    $.post(ajaxurl, {
                        action: 'serviceos_test_lead',
                        nonce: '<?php echo wp_create_nonce("serviceos_admin"); ?>'
                    }, function(response) {
                        if (response.success) {
                            btn.after('<span style="color:#22c55e;margin-left:8px;">✓ Test lead created!</span>');
                        } else {
                            btn.after('<span style="color:#ef4444;margin-left:8px;">✗ ' + response.data + '</span>');
                        }
                    }).always(function() {
                        btn.prop('disabled', false).text('Send Test Lead');
                    });
                });
            });
            </script>

        <?php elseif ($active_tab === 'forms'): ?>
            <!-- ════════════════════ FORMS TAB ════════════════════ -->
            <form method="post" action="options.php">
                <?php settings_fields('serviceos_crm'); ?>

                <div class="sos-card">
                    <h3>📋 Form Plugin Integration</h3>
                    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">Enable the form plugins you want to capture leads from. Only installed/active plugins are available.</p>

                    <table style="max-width:600px;">
                        <thead>
                            <tr>
                                <th>Form Plugin</th>
                                <th>Status</th>
                                <th>Capture</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Contact Form 7</strong></td>
                                <td>
                                    <?php if ($cf7_active): ?>
                                        <span class="sos-badge sos-badge-green">✓ Active</span>
                                    <?php else: ?>
                                        <span class="sos-badge sos-badge-gray">Not installed</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[cf7_enabled]" value="1"
                                           <?php checked(!empty($settings['cf7_enabled'])); ?> <?php if (!$cf7_active) echo 'disabled'; ?> />
                                </td>
                            </tr>
                            <tr>
                                <td><strong>WPForms</strong></td>
                                <td>
                                    <?php if ($wpforms_active): ?>
                                        <span class="sos-badge sos-badge-green">✓ Active</span>
                                    <?php else: ?>
                                        <span class="sos-badge sos-badge-gray">Not installed</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[wpforms_enabled]" value="1"
                                           <?php checked(!empty($settings['wpforms_enabled'])); ?> <?php if (!$wpforms_active) echo 'disabled'; ?> />
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Gravity Forms</strong></td>
                                <td>
                                    <?php if ($gravity_active): ?>
                                        <span class="sos-badge sos-badge-green">✓ Active</span>
                                    <?php else: ?>
                                        <span class="sos-badge sos-badge-gray">Not installed</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[gravity_enabled]" value="1"
                                           <?php checked(!empty($settings['gravity_enabled'])); ?> <?php if (!$gravity_active) echo 'disabled'; ?> />
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Fluent Forms</strong></td>
                                <td>
                                    <?php if ($fluent_active): ?>
                                        <span class="sos-badge sos-badge-green">✓ Active</span>
                                    <?php else: ?>
                                        <span class="sos-badge sos-badge-gray">Not installed</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[fluent_enabled]" value="1"
                                           <?php checked(!empty($settings['fluent_enabled'])); ?> <?php if (!$fluent_active) echo 'disabled'; ?> />
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Elementor Forms</strong></td>
                                <td>
                                    <?php if ($elementor_active): ?>
                                        <span class="sos-badge sos-badge-green">✓ Active</span>
                                    <?php else: ?>
                                        <span class="sos-badge sos-badge-gray">Not installed</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[elementor_enabled]" value="1"
                                           <?php checked(!empty($settings['elementor_enabled'])); ?> <?php if (!$elementor_active) echo 'disabled'; ?> />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p style="margin-top:16px;">
                        <?php submit_button('Save Form Settings', 'primary', 'submit', false); ?>
                    </p>
                </div>
            </form>

        <?php elseif ($active_tab === 'whatsapp'): ?>
            <!-- ════════════════════ WHATSAPP TAB ════════════════════ -->
            <form method="post" action="options.php">
                <?php settings_fields('serviceos_crm'); ?>

                <div class="sos-card">
                    <h3>💬 WhatsApp Notifications</h3>
                    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">Get instant WhatsApp alerts when new leads arrive from your forms.</p>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[whatsapp_notify]" value="1"
                                   <?php checked(!empty($settings['whatsapp_notify'])); ?> />
                            Send WhatsApp notification to owner on new lead
                        </label>
                    </div>

                    <div class="sos-field">
                        <label>Owner WhatsApp Number</label>
                        <input type="text" name="<?php echo SERVICEOS_OPTION_KEY; ?>[whatsapp_number]"
                               value="<?php echo esc_attr($settings['whatsapp_number']); ?>"
                               placeholder="919876543210" />
                        <p class="description">Include country code (e.g., 91 for India). No spaces or + sign.</p>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[whatsapp_auto_reply]" value="1"
                                   <?php checked(!empty($settings['whatsapp_auto_reply'])); ?> />
                            Send WhatsApp auto-reply to the lead
                        </label>
                    </div>

                    <div class="sos-field">
                        <label>Auto-Reply Template</label>
                        <textarea name="<?php echo SERVICEOS_OPTION_KEY; ?>[whatsapp_template]" rows="3"
                                  placeholder="Thank you for reaching out, {name}! We'll contact you shortly."><?php echo esc_textarea($settings['whatsapp_template']); ?></textarea>
                        <p class="description">Use {name}, {phone}, {service} as placeholders. Leave blank for default message.</p>
                    </div>

                    <p class="submit" style="padding:0;">
                        <?php submit_button('Save WhatsApp Settings', 'primary', 'submit', false); ?>
                    </p>
                </div>
            </form>

        <?php elseif ($active_tab === 'field-mapping'): ?>
            <!-- ════════════════════ FIELD MAPPING TAB ════════════════════ -->
            <div class="sos-card">
                <h3>🗺️ Automatic Field Mapping</h3>
                <p style="color:#64748b;font-size:13px;margin-bottom:16px;">ServiceOS auto-maps your form fields. Use these field names for best results:</p>

                <table>
                    <thead>
                        <tr><th>CRM Field</th><th>Accepted Form Field Names</th><th>Required</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>Name</strong></td><td><code>name</code>, <code>your-name</code>, <code>full_name</code>, <code>fullname</code>, <code>customer_name</code>, <code>first_name</code></td><td>Yes*</td></tr>
                        <tr><td><strong>Phone</strong></td><td><code>phone</code>, <code>your-phone</code>, <code>mobile</code>, <code>tel</code>, <code>telephone</code>, <code>contact_number</code></td><td>Yes*</td></tr>
                        <tr><td><strong>Email</strong></td><td><code>email</code>, <code>your-email</code>, <code>email_address</code></td><td>No</td></tr>
                        <tr><td><strong>Company</strong></td><td><code>company</code>, <code>your-company</code>, <code>organization</code></td><td>No</td></tr>
                        <tr><td><strong>Service</strong></td><td><code>service</code>, <code>your-service</code>, <code>subject</code>, <code>inquiry_type</code></td><td>No</td></tr>
                        <tr><td><strong>Message</strong></td><td><code>message</code>, <code>your-message</code>, <code>notes</code>, <code>comments</code></td><td>No</td></tr>
                        <tr><td><strong>Address</strong></td><td><code>address</code>, <code>city</code>, <code>location</code>, <code>area</code></td><td>No</td></tr>
                    </tbody>
                </table>
                <p style="margin-top:12px;font-size:12px;color:#64748b;">* At least Name or Phone is required. Unmapped fields are captured as additional notes.</p>
            </div>

            <div class="sos-card">
                <h3>📝 Contact Form 7 Example</h3>
                <pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:6px;overflow-x:auto;font-size:12px;line-height:1.6;">&lt;label&gt; Your Name (required)
    [text* your-name] &lt;/label&gt;

&lt;label&gt; Your Email (required)
    [email* your-email] &lt;/label&gt;

&lt;label&gt; Phone Number (required)
    [tel* your-phone] &lt;/label&gt;

&lt;label&gt; Company
    [text your-company] &lt;/label&gt;

&lt;label&gt; Service Needed
    [select your-service "Plumbing" "Electrical" "Cleaning" "Other"] &lt;/label&gt;

&lt;label&gt; Your Message
    [textarea your-message] &lt;/label&gt;

[submit "Send"]</pre>
            </div>

        <?php elseif ($active_tab === 'logs'): ?>
            <!-- ════════════════════ LOGS TAB ════════════════════ -->
            <div class="sos-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="margin:0;">📊 Integration Logs</h3>
                    <button type="button" class="button button-secondary button-small"
                            onclick="if(confirm('Clear all logs?')){jQuery.post(ajaxurl,{action:'serviceos_clear_logs',nonce:'<?php echo wp_create_nonce("serviceos_admin"); ?>'},function(){location.reload()})}">Clear Logs</button>
                </div>
                <?php
                $logs = get_option(SERVICEOS_LOG_OPTION, array());
                if (empty($logs)):
                ?>
                    <p style="color:#94a3b8;text-align:center;padding:24px;">No logs yet. Submit a form to see activity here.</p>
                <?php else: ?>
                    <table>
                        <thead>
                            <tr><th style="width:140px;">Time</th><th style="width:80px;">Status</th><th>Details</th></tr>
                        </thead>
                        <tbody>
                            <?php foreach (array_reverse(array_slice($logs, -50)) as $log): ?>
                            <tr>
                                <td style="font-size:11px;"><?php echo esc_html($log['time']); ?></td>
                                <td>
                                    <span class="sos-badge <?php echo $log['status'] === 'success' ? 'sos-badge-green' : ($log['status'] === 'error' ? 'sos-badge-red' : 'sos-badge-gray'); ?>">
                                        <?php echo esc_html(strtoupper($log['status'])); ?>
                                    </span>
                                </td>
                                <td style="font-size:12px;"><?php echo esc_html($log['message']); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
    <?php
}
