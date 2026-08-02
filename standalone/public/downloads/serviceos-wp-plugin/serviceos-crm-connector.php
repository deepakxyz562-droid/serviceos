<?php
/**
 * Plugin Name: ServiceOS CRM Connector
 * Plugin URI: https://serviceos.cc/wordpress
 * Description: Injects a universal JavaScript form capture script on every page. Works with Contact Form 7, WPForms, Gravity Forms, Ninja Forms, Fluent Forms, Elementor Forms, Formidable, MetForm, Everest Forms, HTML forms, and custom forms — automatically.
 * Version: 2.1.0
 * Author: ServiceOS
 * Author URI: https://serviceos.cc
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

define('SERVICEOS_VERSION', '2.1.0');
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
        'intercept_ajax'      => false,
        'webhook_secret'      => '',
        // WhatsApp settings (still sent to API as optional metadata)
        'whatsapp_notify'     => false,
        'whatsapp_number'     => '',
        'whatsapp_auto_reply' => false,
        'whatsapp_template'   => '',
        // Lead settings (sent as optional metadata)
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
    $sanitized['api_url']             = esc_url_raw(trim(isset($input['api_url']) ? $input['api_url'] : ''));
    $sanitized['api_key']             = sanitize_text_field(trim(isset($input['api_key']) ? $input['api_key'] : ''));
    $sanitized['tenant_id']           = sanitize_text_field(trim(isset($input['tenant_id']) ? $input['tenant_id'] : ''));
    $sanitized['webhook_secret']      = sanitize_text_field(trim(isset($input['webhook_secret']) ? $input['webhook_secret'] : ''));
    $sanitized['enabled']             = !empty($input['enabled']);
    $sanitized['debug_mode']          = !empty($input['debug_mode']);
    $sanitized['intercept_ajax']      = !empty($input['intercept_ajax']);
    $sanitized['whatsapp_notify']     = !empty($input['whatsapp_notify']);
    $sanitized['whatsapp_number']     = sanitize_text_field(trim(isset($input['whatsapp_number']) ? $input['whatsapp_number'] : ''));
    $sanitized['whatsapp_auto_reply'] = !empty($input['whatsapp_auto_reply']);
    $sanitized['whatsapp_template']   = sanitize_textarea_field(trim(isset($input['whatsapp_template']) ? $input['whatsapp_template'] : ''));
    $sanitized['default_service']     = sanitize_text_field(trim(isset($input['default_service']) ? $input['default_service'] : ''));
    $sanitized['default_tags']        = sanitize_text_field(trim(isset($input['default_tags']) ? $input['default_tags'] : ''));
    $sanitized['assign_to_id']        = sanitize_text_field(trim(isset($input['assign_to_id']) ? $input['assign_to_id'] : ''));
    $sanitized['assign_to_name']      = sanitize_text_field(trim(isset($input['assign_to_name']) ? $input['assign_to_name'] : ''));
    return $sanitized;
}

function serviceos_get_settings() {
    $defaults = array(
        'api_url'             => '',
        'api_key'             => '',
        'tenant_id'           => '',
        'enabled'             => true,
        'debug_mode'          => false,
        'intercept_ajax'      => false,
        'webhook_secret'      => '',
        'whatsapp_notify'     => false,
        'whatsapp_number'     => '',
        'whatsapp_auto_reply' => false,
        'whatsapp_template'   => '',
        'default_service'     => '',
        'default_tags'        => '',
        'assign_to_id'        => '',
        'assign_to_name'      => '',
    );
    $stored = get_option(SERVICEOS_OPTION_KEY, array());
    if (!is_array($stored)) $stored = array();
    return array_merge($defaults, $stored);
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
//
// NOTE: This function is only used by the "Send Test Lead" admin button.
// Real form submissions are captured client-side by the universal embed.js
// script (enqueued via wp_enqueue_scripts below). The PHP per-form hooks
// (wpcf7_mail_sent, wpforms_process_complete, gform_after_submission,
// fluentform/submission_inserted, elementor_pro/forms/new_record) have been
// REMOVED — the universal JS captures submissions for ALL form plugins
// automatically without per-plugin PHP integration.

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

    // Normalize base URL — strip trailing /api/forms/leads if user pasted full endpoint.
    $api_base = rtrim($settings['api_url'], '/');
    if (substr($api_base, -16) === '/api/forms/leads') {
        $api_base = substr($api_base, 0, -16);
    }
    $api_url = $api_base . '/api/forms/leads';

    // Add tenant_id
    if (!empty($settings['tenant_id'])) {
        $data['tenantId'] = $settings['tenant_id'];
    }

    // Add form source
    $data['_form_source'] = $form_source;

    // Add WhatsApp control fields (optional; the endpoint decides what to do with them)
    if (!empty($settings['whatsapp_notify']) && !empty($settings['whatsapp_number'])) {
        $data['_notifyWhatsApp'] = true;
        $data['_whatsappNumber'] = $settings['whatsapp_number'];
    }
    if (!empty($settings['whatsapp_auto_reply']) && !empty($settings['whatsapp_template'])) {
        $data['_autoReplyWhatsApp'] = true;
        $data['_autoReplyTemplate'] = $settings['whatsapp_template'];
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
        $lead_name = isset($result['leadName']) ? $result['leadName'] : (isset($result['lead']['name']) ? $result['lead']['name'] : 'Unknown');
        $lead_id = isset($result['leadId']) ? $result['leadId'] : (isset($result['lead']['id']) ? $result['lead']['id'] : 'N/A');
        serviceos_log('success', "Lead created: {$lead_name} (ID: {$lead_id})");
        return $result;
    } else {
        $error = isset($result['message']) ? $result['message'] : (isset($result['error']) ? $result['error'] : "HTTP {$code}");
        serviceos_log('error', "Failed (HTTP {$code}): {$error}");
        return false;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSAL EMBED SCRIPT LOADER (replaces per-form-plugin PHP hooks)
// ════════════════════════════════════════════════════════════════════════════

add_action('wp_enqueue_scripts', 'serviceos_enqueue_embed_script');

function serviceos_enqueue_embed_script() {
    $settings = serviceos_get_settings();

    // Skip in wp-admin and on AJAX endpoints
    if (is_admin() || wp_doing_ajax()) return;

    // Skip if disabled
    if (empty($settings['enabled'])) return;

    // Skip if not configured
    if (empty($settings['api_url']) || empty($settings['api_key'])) return;

    // Normalize the API URL: strip any trailing /api/forms/leads so we can
    // use it as a base for /embed.js. The embed.js will append the path itself.
    $api_base = rtrim($settings['api_url'], '/');
    if (substr($api_base, -16) === '/api/forms/leads') {
        $api_base = substr($api_base, 0, -16);
    }

    $embed_url = $api_base . '/embed.js';

    // Register + enqueue the script
    wp_register_script('serviceos-embed', $embed_url, array(), SERVICEOS_VERSION, true);
    wp_enqueue_script('serviceos-embed');

    // Pass config to the script via wp_localize_script. embed.js reads
    // window.SERVICEOS_CONFIG before init.
    $config = array(
        'apiKey'        => $settings['api_key'],
        'apiUrl'        => $api_base,
        'interceptAjax' => !empty($settings['intercept_ajax']),
        'showToast'     => false,
    );
    wp_localize_script('serviceos-embed', 'SERVICEOS_CONFIG', $config);

    if (!empty($settings['debug_mode'])) {
        serviceos_log('debug', 'Enqueued serviceos-embed script from: ' . $embed_url);
    }
}

// ─── AJAX: Test Connection ────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_test_connection', 'serviceos_ajax_test_connection');

function serviceos_ajax_test_connection() {
    check_ajax_referer('serviceos_admin', 'nonce');
    $settings = serviceos_get_settings();

    // Test the universal /api/forms/leads endpoint with ?key= query param.
    $api_base = rtrim($settings['api_url'], '/');
    if (substr($api_base, -16) === '/api/forms/leads') {
        $api_base = substr($api_base, 0, -16);
    }
    $api_url = $api_base . '/api/forms/leads?key=' . rawurlencode($settings['api_key']);

    $response = wp_remote_get($api_url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
        ),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        wp_send_json_error($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($code === 200 && isset($body['status']) && $body['status'] === 'connected') {
        set_transient('serviceos_connection_test', 'ok', HOUR_IN_SECONDS);
        wp_send_json_success(array(
            'message' => 'Connected!',
            'stats'   => isset($body['endpoint']) ? $body['endpoint'] : array(),
        ));
    } else {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        $msg = isset($body['error']) ? $body['error'] : (isset($body['message']) ? $body['message'] : "HTTP {$code}");
        wp_send_json_error($msg);
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
        'message' => 'This is a test lead from the ServiceOS WordPress plugin (universal endpoint).',
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
    if (is_admin()) return;
    $settings = serviceos_get_settings();
    if (empty($settings['enabled'])) return;

    $is_connected = get_transient('serviceos_connection_test') === 'ok';
    $wp_admin_bar->add_node(array(
        'id'     => 'serviceos-status',
        'title'  => $is_connected
            ? '<span style="color:#22c55e;">●</span> ServiceOS Capturing'
            : '<span style="color:#ef4444;">●</span> ServiceOS Not Connected',
        'href'   => admin_url('admin.php?page=serviceos-crm'),
        'parent' => 'top-secondary',
    ));
}

// ─── Plugin Row Meta ──────────────────────────────────────────────────────────

add_filter('plugin_row_meta', 'serviceos_plugin_row_meta', 10, 2);

function serviceos_plugin_row_meta($links, $file) {
    if (plugin_basename(__FILE__) === $file) {
        $links[] = '<a href="https://serviceos.cc/docs/wordpress" target="_blank">Documentation</a>';
        $links[] = '<a href="https://serviceos.cc/support" target="_blank">Support</a>';
    }
    return $links;
}

// ─── Settings Page HTML ───────────────────────────────────────────────────────

function serviceos_settings_page() {
    $settings = serviceos_get_settings();
    $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'connect';

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
                <p style="margin:0;color:#64748b;font-size:13px;">Universal JavaScript form capture — works with every form plugin automatically</p>
            </div>
        </div>

        <nav class="nav-tab-wrapper">
            <a href="?page=serviceos-crm&tab=setup" class="nav-tab <?php echo $active_tab === 'setup' ? 'nav-tab-active' : ''; ?>">⚡ Setup</a>
            <a href="?page=serviceos-crm&tab=connect" class="nav-tab <?php echo $active_tab === 'connect' ? 'nav-tab-active' : ''; ?>">🔗 Connect</a>
            <a href="?page=serviceos-crm&tab=forms" class="nav-tab <?php echo $active_tab === 'forms' ? 'nav-tab-active' : ''; ?>">📋 Supported Forms</a>
            <a href="?page=serviceos-crm&tab=whatsapp" class="nav-tab <?php echo $active_tab === 'whatsapp' ? 'nav-tab-active' : ''; ?>">💬 WhatsApp</a>
            <a href="?page=serviceos-crm&tab=field-mapping" class="nav-tab <?php echo $active_tab === 'field-mapping' ? 'nav-tab-active' : ''; ?>">🗺️ Field Map</a>
            <a href="?page=serviceos-crm&tab=logs" class="nav-tab <?php echo $active_tab === 'logs' ? 'nav-tab-active' : ''; ?>">📊 Logs</a>
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
                    <div class="sos-flow-item" style="background:#fce7f3;color:#9d174d;">3. Universal JS Loaded</div>
                    <span class="sos-flow-arrow">→</span>
                    <div class="sos-flow-item" style="background:#fef3c7;color:#92400e;">4. Done!</div>
                </div>

                <ol style="line-height:2;">
                    <li><strong>In ServiceOS</strong>, go to <code>Settings → Integrations → Website Form Integration</code> → click <strong>Generate</strong></li>
                    <li><strong>Copy</strong> the API URL and API Key, paste them in the <a href="?page=serviceos-crm&tab=connect">Connect tab</a></li>
                    <li><strong>Save</strong> — the plugin will start loading <code>/embed.js</code> on every frontend page automatically</li>
                    <li><strong>Test</strong> by submitting any form on your site — the lead will appear in your CRM instantly! Works with Contact Form 7, WPForms, Gravity Forms, Elementor, Fluent Forms, and more.</li>
                </ol>

                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-top:20px;">
                    <h4 style="margin:0 0 8px 0;font-size:13px;color:#374151;">📋 Supported Form Plugins (all auto-captured):</h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px;font-size:12px;">
                        <div>✓ Contact Form 7</div>
                        <div>✓ WPForms</div>
                        <div>✓ Gravity Forms</div>
                        <div>✓ Ninja Forms</div>
                        <div>✓ Fluent Forms</div>
                        <div>✓ Elementor Forms</div>
                        <div>✓ Formidable Forms</div>
                        <div>✓ MetForm</div>
                        <div>✓ Everest Forms</div>
                        <div>✓ HTML Forms</div>
                        <div>✓ Custom React/Vue/PHP</div>
                    </div>
                </div>
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
                    <div style="font-size:24px;font-weight:700;color:<?php echo !empty($settings['enabled']) ? '#22c55e' : '#94a3b8'; ?>">
                        <?php echo !empty($settings['enabled']) ? 'ON' : 'OFF'; ?>
                    </div>
                    <div style="font-size:12px;color:#64748b;">Universal Capture</div>
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
                        <label for="api_url">ServiceOS URL</label>
                        <input type="url" name="<?php echo SERVICEOS_OPTION_KEY; ?>[api_url]" id="api_url"
                               value="<?php echo esc_attr($settings['api_url']); ?>"
                               placeholder="https://app.yourcrm.com" />
                        <p class="description">Your ServiceOS base URL. The plugin loads /embed.js from this domain.</p>
                    </div>

                    <div class="sos-field">
                        <label for="api_key">API Key</label>
                        <input type="password" name="<?php echo SERVICEOS_OPTION_KEY; ?>[api_key]" id="api_key"
                               value="<?php echo esc_attr($settings['api_key']); ?>"
                               placeholder="ff_prod_xxxxxxxxxxxx" />
                        <p class="description">From ServiceOS Settings → Integrations → Website Form Integration</p>
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
                        <p class="description">For HMAC-SHA256 signature verification on server-to-server test leads.</p>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[enabled]" value="1"
                                   <?php checked(!empty($settings['enabled'])); ?> />
                            Inject universal capture script on every frontend page
                        </label>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[intercept_ajax]" value="1"
                                   <?php checked(!empty($settings['intercept_ajax'])); ?> />
                            Also intercept AJAX form POSTs (fetch + XHR)
                        </label>
                        <p class="description">Enable for forms that submit via AJAX without a page reload (Contact Form 7 REST mode, Elementor, custom React forms). Disabled by default.</p>
                    </div>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[debug_mode]" value="1"
                                   <?php checked(!empty($settings['debug_mode'])); ?> />
                            Debug mode (log script load events)
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
            <!-- ════════════════════ SUPPORTED FORMS TAB ════════════════════ -->
            <div class="sos-card">
                <h3>📋 Supported Form Plugins</h3>
                <p style="color:#64748b;font-size:13px;margin-bottom:16px;">
                    The universal capture script works with <strong>every</strong> form plugin below. No per-plugin configuration is required — the script listens to all <code>&lt;form&gt;</code> submit events on every page.
                </p>

                <table style="max-width:700px;">
                    <thead>
                        <tr>
                            <th>Form Plugin</th>
                            <th>Supported</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $supported = array(
                            array('Contact Form 7', 'Listens for native submit; enable AJAX interception if CF7 is in REST/AJAX mode.'),
                            array('WPForms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Gravity Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Ninja Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Fluent Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Elementor Forms', 'Enable AJAX interception — Elementor submits via fetch/XHR.'),
                            array('Formidable Forms', 'Native submit captured automatically.'),
                            array('MetForm', 'Enable AJAX interception — MetForm submits via XHR.'),
                            array('Everest Forms', 'Native submit captured automatically.'),
                            array('HTML Forms', 'Captured automatically — plain <form> elements.'),
                            array('Custom React / Vue / PHP Forms', 'Captured automatically. Use AJAX interception for SPA-style form POSTs.'),
                            array('JotForm (iframe)', 'Use ServiceOS Webhook integration in JotForm settings — iframe forms cannot be captured via JS due to cross-origin restrictions.'),
                        );
                        foreach ($supported as $row):
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($row[0]); ?></strong></td>
                            <td><span class="sos-badge sos-badge-green">✓ Yes</span></td>
                            <td style="color:#64748b;font-size:12px;"><?php echo esc_html($row[1]); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <h3 style="margin-top:24px;">How it works</h3>
                <div style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:6px;font-size:12px;line-height:1.7;">
WordPress page loads
        ↓
Plugin enqueues /embed.js (via wp_enqueue_script)
        ↓
window.SERVICEOS_CONFIG = { apiKey, apiUrl, interceptAjax }
        ↓
embed.js auto-detects ALL &lt;form&gt; submit events
        ↓
Fields mapped → POST /api/forms/leads  (header: X-API-Key)
        ↓
Lead appears in ServiceOS CRM dashboard
                </div>
            </div>

        <?php elseif ($active_tab === 'whatsapp'): ?>
            <!-- ════════════════════ WHATSAPP TAB ════════════════════ -->
            <form method="post" action="options.php">
                <?php settings_fields('serviceos_crm'); ?>

                <div class="sos-card">
                    <h3>💬 WhatsApp Notifications</h3>
                    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">
                        These settings are sent to ServiceOS as optional metadata on the test-lead endpoint.
                        For production lead capture, configure WhatsApp notifications directly in ServiceOS
                        Settings → Integrations → Website Form Integration (per-endpoint owner + auto-reply).
                    </p>

                    <div class="sos-field">
                        <label>
                            <input type="checkbox" name="<?php echo SERVICEOS_OPTION_KEY; ?>[whatsapp_notify]" value="1"
                                   <?php checked(!empty($settings['whatsapp_notify'])); ?> />
                            Send WhatsApp notification to owner on new lead (test-lead only)
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
                            Send WhatsApp auto-reply to the lead (test-lead only)
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
                    <p style="color:#94a3b8;text-align:center;padding:24px;">No logs yet. (Lead delivery is handled by the embed script client-side; this log tracks plugin-side events like script injection and connection tests.)</p>
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
